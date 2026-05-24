/**
 * VaultGuard Crypto Layer
 * 
 * Implements AES-GCM encryption with KDF abstraction and session-key architecture.
 * ALL crypto operations happen locally using the Web Crypto API.
 * Raw passwords and vault keys are NEVER sent to any external service.
 * 
 * Security Upgrades:
 * 1. Argon2id abstraction layer with PBKDF2 provider.
 * 2. Session Key Architecture (Master Password -> Derived Vault Key -> Temporary In-Memory Session Key).
 * 3. Secure zeroing of temporary buffers to clean up memory before GC.
 */

import type { DerivedKeyResult, EncryptedData, KDFAlgorithm, KDFParams } from '@/types'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 256
const ALGORITHM = 'AES-GCM'
const SALT_LENGTH = 32  // bytes
const IV_LENGTH = 12    // bytes — recommended for AES-GCM

// ─────────────────────────────────────────────
// Utilities: base64 ↔ Uint8Array
// ─────────────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─────────────────────────────────────────────
// Random bytes
// ─────────────────────────────────────────────

export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

export function generateSalt(): string {
  return arrayBufferToBase64(generateRandomBytes(SALT_LENGTH))
}

export function generateIV(): Uint8Array {
  return generateRandomBytes(IV_LENGTH)
}

// ─────────────────────────────────────────────
// KDF Abstraction Layer
// ─────────────────────────────────────────────

export interface KDFProvider {
  algorithm: KDFAlgorithm
  deriveKeyBytes(password: string, saltBytes: Uint8Array, params: KDFParams): Promise<Uint8Array>
}

export class Pbkdf2Provider implements KDFProvider {
  algorithm: KDFAlgorithm = 'pbkdf2'

  async deriveKeyBytes(password: string, saltBytes: Uint8Array, params: KDFParams): Promise<Uint8Array> {
    const encoder = new TextEncoder()
    const passwordBytes = encoder.encode(password)

    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      )

      const iterations = params.iterations || PBKDF2_ITERATIONS
      const hash = params.hash || 'SHA-256'

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes as unknown as ArrayBuffer,
          iterations,
          hash,
        },
        keyMaterial,
        256 // 32 bytes (256 bits)
      )

      return new Uint8Array(derivedBits)
    } finally {
      // Best effort cleaning of password bytes inside this block
      secureZero(passwordBytes)
    }
  }
}

export function createKDFProvider(algorithm: KDFAlgorithm): KDFProvider {
  if (algorithm === 'pbkdf2') {
    return new Pbkdf2Provider()
  }
  // Future Argon2id WASM integration point
  throw new Error(`KDF algorithm ${algorithm} is not supported yet (abstraction layer is ready).`)
}

// ─────────────────────────────────────────────
// Session Key Derivation (HKDF)
// ─────────────────────────────────────────────

/**
 * Derives a temporary in-memory AES-GCM session key from derived vault key bytes.
 */
export async function deriveSessionKey(vaultKeyBytes: Uint8Array): Promise<CryptoKey> {
  // Ensure we pass a plain ArrayBuffer (not SharedArrayBuffer) to SubtleCrypto
  const keyBuffer = vaultKeyBytes.buffer.slice(
    vaultKeyBytes.byteOffset,
    vaultKeyBytes.byteOffset + vaultKeyBytes.byteLength
  ) as ArrayBuffer
  const hkdfMaterial = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )

  const encoder = new TextEncoder()
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // Deterministic 32-byte zero-salt for session
      info: encoder.encode('vaultguard-session-key'),
    },
    hkdfMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // non-extractable session key
    ['encrypt', 'decrypt']
  )
}

/**
 * Main key derivation entry point.
 * Derives the vault key, feeds it into HKDF to produce the session key, 
 * and immediately zero-wipes the intermediate vault key bytes.
 */
export async function deriveKey(
  masterPassword: string,
  saltBase64: string,
  kdfParams: KDFParams = { algorithm: 'pbkdf2', iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }
): Promise<CryptoKey> {
  const saltBytes = base64ToUint8Array(saltBase64)
  const provider = createKDFProvider(kdfParams.algorithm)

  const vaultKeyBytes = await provider.deriveKeyBytes(masterPassword, saltBytes, kdfParams)
  try {
    const sessionKey = await deriveSessionKey(vaultKeyBytes)
    return sessionKey
  } finally {
    secureZero(vaultKeyBytes)
    secureZero(saltBytes)
  }
}

/**
 * Generate a new salt and derive session key from master password.
 * Used during initial vault setup.
 */
export async function deriveNewKey(
  masterPassword: string,
  algorithm: KDFAlgorithm = 'pbkdf2'
): Promise<DerivedKeyResult> {
  const salt = generateSalt()
  const kdf: KDFParams = {
    algorithm,
    iterations: PBKDF2_ITERATIONS,
    hash: 'SHA-256',
  }
  const key = await deriveKey(masterPassword, salt, kdf)
  return { key, salt, kdf }
}

// ─────────────────────────────────────────────
// AES-GCM Encryption / Decryption
// ─────────────────────────────────────────────

/**
 * Encrypt a plaintext string with the session key.
 * Returns base64-encoded ciphertext and IV.
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const iv = generateIV()
  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  try {
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv as unknown as ArrayBuffer },
      key,
      plaintextBytes as unknown as ArrayBuffer
    )

    return {
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      iv: arrayBufferToBase64(iv),
    }
  } finally {
    secureZero(plaintextBytes)
  }
}

/**
 * Decrypt base64-encoded ciphertext using the session key.
 * Throws if the key is wrong (authentication tag mismatch).
 */
export async function decrypt(
  data: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const iv = base64ToUint8Array(data.iv)
  const ciphertextBytes = base64ToUint8Array(data.ciphertext)

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv as unknown as ArrayBuffer },
      key,
      ciphertextBytes as unknown as ArrayBuffer
    )

    const decoder = new TextDecoder()
    return decoder.decode(plaintextBuffer)
  } finally {
    secureZero(iv)
    secureZero(ciphertextBytes)
  }
}

// ─────────────────────────────────────────────
// Vault Verifier — Prove correct master password
// ─────────────────────────────────────────────

const VERIFIER_PLAINTEXT = 'VAULTGUARD_VERIFIED'

/**
 * Create an encrypted verifier to validate master password on unlock.
 * The verifier is stored in vault metadata.
 */
export async function createVerifier(
  key: CryptoKey
): Promise<EncryptedData> {
  return encrypt(VERIFIER_PLAINTEXT, key)
}

/**
 * Check if the master password is correct by decrypting the verifier.
 */
export async function verifyMasterPassword(
  verifierData: EncryptedData,
  key: CryptoKey
): Promise<boolean> {
  try {
    const plaintext = await decrypt(verifierData, key)
    return plaintext === VERIFIER_PLAINTEXT
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// Secure Memory Utilities
// ─────────────────────────────────────────────

/**
 * Overwrites an ArrayBuffer or Uint8Array with zeros to clean up memory.
 */
export function secureZero(buf: ArrayBuffer | Uint8Array): void {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  bytes.fill(0)
}

/**
 * Attempt to zero-fill a string reference.
 * Note: JS strings are immutable; this is best-effort.
 */
export function secureWipe(data: unknown[]): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = null
  }
}

// ─────────────────────────────────────────────
// Password strength estimation (deterministic)
// ─────────────────────────────────────────────

export function estimateEntropy(password: string): number {
  let charsetSize = 0
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/[0-9]/.test(password)) charsetSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32
  return charsetSize > 0 ? Math.log2(charsetSize) * password.length : 0
}
