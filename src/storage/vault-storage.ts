/**
 * VaultGuard Storage Layer
 * 
 * Uses chrome.storage.local for encrypted vault data.
 * All data stored is encrypted — never plaintext.
 */

import type { VaultItem, VaultMeta } from '@/types'

const STORAGE_KEYS = {
  VAULT_META: 'vaultguard_meta',
  VAULT_ITEMS: 'vaultguard_items',
  SETTINGS: 'vaultguard_settings',
} as const

export interface StoredSettings {
  autoLockMinutes: number
  clipboardClearSeconds: number
  autofillEnabled: boolean
  showPasswordStrength: boolean
  theme: 'dark'
}

const DEFAULT_SETTINGS: StoredSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 15,
  autofillEnabled: true,
  showPasswordStrength: true,
  theme: 'dark',
}

// ─────────────────────────────────────────────
// Chrome Storage Wrapper
// ─────────────────────────────────────────────

function chromeGet<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result: { [key: string]: any }) => {
      resolve((result[key] as T) ?? null)
    })
  })
}

function chromeSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

function chromeRemove(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => resolve())
  })
}

// ─────────────────────────────────────────────
// Vault Meta (salt, verifier, etc.)
// ─────────────────────────────────────────────

export async function loadVaultMeta(): Promise<VaultMeta | null> {
  return chromeGet<VaultMeta>(STORAGE_KEYS.VAULT_META)
}

export async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  await chromeSet(STORAGE_KEYS.VAULT_META, meta)
}

export async function clearVaultMeta(): Promise<void> {
  await chromeRemove(STORAGE_KEYS.VAULT_META)
}

// ─────────────────────────────────────────────
// Vault Items (encrypted credentials)
// ─────────────────────────────────────────────

export async function loadVaultItems(): Promise<VaultItem[]> {
  const items = await chromeGet<VaultItem[]>(STORAGE_KEYS.VAULT_ITEMS)
  return items ?? []
}

export async function saveVaultItems(items: VaultItem[]): Promise<void> {
  await chromeSet(STORAGE_KEYS.VAULT_ITEMS, items)
}

export async function clearVaultItems(): Promise<void> {
  await chromeRemove(STORAGE_KEYS.VAULT_ITEMS)
}

// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────

export async function loadSettings(): Promise<StoredSettings> {
  const settings = await chromeGet<StoredSettings>(STORAGE_KEYS.SETTINGS)
  return { ...DEFAULT_SETTINGS, ...(settings ?? {}) }
}

export async function saveSettings(settings: Partial<StoredSettings>): Promise<void> {
  const current = await loadSettings()
  await chromeSet(STORAGE_KEYS.SETTINGS, { ...current, ...settings })
}

// ─────────────────────────────────────────────
// Full vault wipe (nuclear option)
// ─────────────────────────────────────────────

export async function wipeVault(): Promise<void> {
  await Promise.all([
    clearVaultMeta(),
    clearVaultItems(),
  ])
}
