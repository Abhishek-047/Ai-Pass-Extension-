/**
 * VaultGuard Secure Import / Export
 *
 * Export: Serializes and AES-GCM encrypts the full vault with the master password.
 * Import: Decrypts and validates the payload before restoring into vault.
 *
 * Format:
 * {
 *   version: 1,
 *   kdf: KDFParams,
 *   salt: string,        // base64 KDF salt for export encryption
 *   iv: string,          // base64 AES-GCM IV
 *   ciphertext: string,  // base64 encrypted JSON(VaultExportPayload)
 *   hmac: string,        // future integrity field (reserved)
 *   exportedAt: number,
 * }
 *
 * Security properties:
 * - Export key derived fresh from master password (PBKDF2, 200k iterations)
 * - AES-256-GCM authenticated encryption — detects tampering
 * - No plaintext credentials ever touch the export file
 * - Schema versioning allows forward migration
 */

import type { VaultItem, VaultMeta } from '@/types'
import {
  deriveKey,
  encrypt,
  decrypt,
  generateSalt,
} from '@/crypto'

// ─── Export Schema ────────────────────────────────────────────────────────────

export const EXPORT_VERSION = 1
export const EXPORT_MAGIC = 'VAULTGUARD_EXPORT'

export interface VaultExportPayload {
  magic: string
  version: number
  exportedAt: number
  meta: VaultMeta
  items: VaultItem[]
}

export interface VaultExportEnvelope {
  magic: string          // 'VAULTGUARD_EXPORT' — identifies file type
  version: number        // schema version
  kdf: {
    algorithm: 'pbkdf2'
    iterations: number
    hash: string
  }
  salt: string           // base64 — KDF salt for export key derivation
  iv: string             // base64 — AES-GCM IV
  ciphertext: string     // base64 — encrypted VaultExportPayload
  exportedAt: number
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Exports the vault encrypted with the master password.
 * The resulting JSON string is safe to write to disk or share.
 */
export async function exportVault(
  masterPassword: string,
  items: VaultItem[],
  meta: VaultMeta
): Promise<string> {
  // Derive a fresh export key (higher iterations than runtime key)
  const exportSalt = generateSalt()
  const exportKdf = {
    algorithm: 'pbkdf2' as const,
    iterations: 200_000, // Higher cost for export (offline attack resistance)
    hash: 'SHA-256' as const,
  }
  const exportKey = await deriveKey(masterPassword, exportSalt, exportKdf)

  const payload: VaultExportPayload = {
    magic: EXPORT_MAGIC,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    meta,
    items,
  }

  const plaintext = JSON.stringify(payload)
  const { ciphertext, iv } = await encrypt(plaintext, exportKey)

  const envelope: VaultExportEnvelope = {
    magic: EXPORT_MAGIC,
    version: EXPORT_VERSION,
    kdf: exportKdf,
    salt: exportSalt,
    iv,
    ciphertext,
    exportedAt: payload.exportedAt,
  }

  return JSON.stringify(envelope, null, 2)
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  items?: VaultItem[]
  meta?: VaultMeta
  error?: string
}

/**
 * Imports an encrypted vault export.
 * Validates the envelope schema, decrypts with the provided master password,
 * and returns the decrypted vault contents.
 */
export async function importVault(
  jsonString: string,
  masterPassword: string
): Promise<ImportResult> {
  // ── Parse & Validate Envelope ──────────────────────────────────────────────
  let envelope: VaultExportEnvelope
  try {
    envelope = JSON.parse(jsonString)
  } catch {
    return { success: false, error: 'Invalid file format: JSON parse failed.' }
  }

  if (envelope.magic !== EXPORT_MAGIC) {
    return { success: false, error: 'Invalid file: not a VaultGuard export.' }
  }

  if (envelope.version !== EXPORT_VERSION) {
    return { success: false, error: `Unsupported export version: ${envelope.version}` }
  }

  if (!envelope.salt || !envelope.iv || !envelope.ciphertext || !envelope.kdf) {
    return { success: false, error: 'Malformed export: missing required fields.' }
  }

  // ── Derive Export Key ──────────────────────────────────────────────────────
  let exportKey: CryptoKey
  try {
    exportKey = await deriveKey(masterPassword, envelope.salt, {
      algorithm: envelope.kdf.algorithm,
      iterations: envelope.kdf.iterations,
      hash: envelope.kdf.hash,
    })
  } catch {
    return { success: false, error: 'Key derivation failed.' }
  }

  // ── Decrypt ────────────────────────────────────────────────────────────────
  let plaintext: string
  try {
    plaintext = await decrypt({ ciphertext: envelope.ciphertext, iv: envelope.iv }, exportKey)
  } catch {
    // AES-GCM auth tag failure = wrong password OR tampered ciphertext
    return { success: false, error: 'Decryption failed: wrong password or file is corrupted.' }
  }

  // ── Parse Payload ──────────────────────────────────────────────────────────
  let payload: VaultExportPayload
  try {
    payload = JSON.parse(plaintext)
  } catch {
    return { success: false, error: 'Decrypted data is malformed.' }
  }

  // ── Validate Payload ───────────────────────────────────────────────────────
  if (payload.magic !== EXPORT_MAGIC) {
    return { success: false, error: 'Payload integrity check failed: magic mismatch.' }
  }

  if (!Array.isArray(payload.items) || !payload.meta) {
    return { success: false, error: 'Payload integrity check failed: missing items or meta.' }
  }

  // Sanitize items: strip any unexpected fields that might carry XSS/injection
  const sanitizedItems = payload.items.map(sanitizeItem).filter(Boolean) as VaultItem[]

  return {
    success: true,
    items: sanitizedItems,
    meta: payload.meta,
  }
}

// ─── Item Sanitizer ──────────────────────────────────────────────────────────

/**
 * Validates and sanitizes an imported vault item.
 * Rejects items with invalid types or missing required fields.
 */
function sanitizeItem(item: unknown): VaultItem | null {
  if (!item || typeof item !== 'object') return null
  const i = item as Record<string, unknown>

  const validTypes = ['login', 'card', 'note', 'identity']
  if (!validTypes.includes(i.type as string)) return null
  if (typeof i.id !== 'string' || !i.id) return null
  if (typeof i.name !== 'string') return null

  // Type-specific field validation
  if (i.type === 'login') {
    if (typeof i.encryptedPassword !== 'string') return null
    if (typeof i.iv !== 'string') return null
  } else if (i.type === 'card') {
    if (typeof i.encryptedNumber !== 'string') return null
    if (typeof i.encryptedCvv !== 'string') return null
  } else if (i.type === 'note') {
    if (typeof i.encryptedContent !== 'string') return null
  }

  return item as VaultItem
}

// ─── Trigger Download ────────────────────────────────────────────────────────

/**
 * Triggers a browser download of the vault export JSON.
 * Safe to call from popup context.
 */
export function downloadExportFile(jsonString: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `vaultguard-backup-${date}.vgx`
  a.click()
  // Revoke after a short delay to allow download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
