import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  generateIV,
  generateRandomBytes,
  arrayBufferToBase64,
  base64ToUint8Array,
  deriveKey,
  deriveNewKey,
  deriveSessionKey,
  importSessionKey,
  encrypt,
  decrypt,
  createVerifier,
  verifyMasterPassword,
  secureZero,
  secureWipe,
  estimateEntropy,
  Pbkdf2Provider,
  createKDFProvider,
} from './vault-crypto'

// ── Base64 Utilities ────────────────────────────────────────────────────────────
describe('Base64 Utilities', () => {
  it('should round-trip arrayBuffer → base64 → Uint8Array', () => {
    const original = new Uint8Array([1, 2, 3, 255, 128, 0, 64])
    const b64 = arrayBufferToBase64(original)
    const decoded = base64ToUint8Array(b64)
    expect(Array.from(decoded)).toEqual(Array.from(original))
  })

  it('should handle ArrayBuffer (not Uint8Array) input', () => {
    const buf = new Uint8Array([10, 20, 30]).buffer
    const b64 = arrayBufferToBase64(buf)
    const decoded = base64ToUint8Array(b64)
    expect(decoded[0]).toBe(10)
    expect(decoded[1]).toBe(20)
    expect(decoded[2]).toBe(30)
  })

  it('should produce different base64 for different inputs', () => {
    const a = arrayBufferToBase64(new Uint8Array([0, 0, 0]))
    const b = arrayBufferToBase64(new Uint8Array([1, 2, 3]))
    expect(a).not.toBe(b)
  })
})

// ── Random Bytes & Salt ─────────────────────────────────────────────────────────
describe('Random Bytes & Salt', () => {
  it('should generate random bytes of correct length', () => {
    const bytes = generateRandomBytes(32)
    expect(bytes.byteLength).toBe(32)
  })

  it('should generate unique salts', () => {
    const s1 = generateSalt()
    const s2 = generateSalt()
    expect(s1).not.toBe(s2)
    expect(s1.length).toBeGreaterThan(20)
  })

  it('should generate unique IVs', () => {
    const iv1 = generateIV()
    const iv2 = generateIV()
    expect(iv1).not.toEqual(iv2)
    expect(iv1.byteLength).toBe(12)
    expect(iv2.byteLength).toBe(12)
  })

  it('should generate non-zero random bytes', () => {
    // With 32 bytes of randomness it's statistically impossible all are zero
    const bytes = generateRandomBytes(32)
    const allZero = Array.from(bytes).every(b => b === 0)
    expect(allZero).toBe(false)
  })
})

// ── KDF Provider ────────────────────────────────────────────────────────────────
describe('KDF Provider', () => {
  it('should create a PBKDF2 provider', () => {
    const provider = createKDFProvider('pbkdf2')
    expect(provider.algorithm).toBe('pbkdf2')
    expect(provider).toBeInstanceOf(Pbkdf2Provider)
  })

  it('should throw for unsupported KDF algorithm', () => {
    expect(() => createKDFProvider('unknown-algo' as any)).toThrow()
  })

  it('should derive deterministic key bytes from PBKDF2', async () => {
    const provider = new Pbkdf2Provider()
    const salt = new Uint8Array(32).fill(42)
    const params = { algorithm: 'pbkdf2' as const, iterations: 10_000, hash: 'SHA-256' as const }

    const bytes1 = await provider.deriveKeyBytes('password', salt, params)
    const bytes2 = await provider.deriveKeyBytes('password', salt, params)
    expect(Array.from(bytes1)).toEqual(Array.from(bytes2))
  })

  it('should produce different bytes for different passwords', async () => {
    const provider = new Pbkdf2Provider()
    const salt = new Uint8Array(32).fill(7)
    const params = { algorithm: 'pbkdf2' as const, iterations: 10_000, hash: 'SHA-256' as const }

    const bytes1 = await provider.deriveKeyBytes('password1', salt, params)
    const bytes2 = await provider.deriveKeyBytes('password2', salt, params)
    expect(Array.from(bytes1)).not.toEqual(Array.from(bytes2))
  })

  it('should produce 32 byte output from PBKDF2', async () => {
    const provider = new Pbkdf2Provider()
    const salt = new Uint8Array(32)
    const params = { algorithm: 'pbkdf2' as const, iterations: 1000, hash: 'SHA-256' as const }
    const bytes = await provider.deriveKeyBytes('test', salt, params)
    expect(bytes.byteLength).toBe(32)
  })
})

// ── Key Derivation ──────────────────────────────────────────────────────────────
describe('Key Derivation', () => {
  it('should derive a CryptoKey via deriveNewKey', async () => {
    const { key, salt, kdf } = await deriveNewKey('test-password')
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
    expect(salt).toBeDefined()
    expect(kdf.algorithm).toBe('pbkdf2')
  })

  it('should produce consistent keys for same password+salt', async () => {
    const { key: k1, salt } = await deriveNewKey('test-password')
    const k2 = await deriveKey('test-password', salt)

    // Verify by cross-encrypting
    const ct = await encrypt('hello', k1)
    const pt = await decrypt(ct, k2)
    expect(pt).toBe('hello')
  })

  it('should produce different session keys for different passwords', async () => {
    const { key: k1 } = await deriveNewKey('password-a')
    const { key: k2 } = await deriveNewKey('password-b')

    const ct = await encrypt('data', k1)
    await expect(decrypt(ct, k2)).rejects.toThrow()
  })

  it('should derive a session key from raw bytes via HKDF', async () => {
    const rawBytes = new Uint8Array(32).fill(99)
    const key = await deriveSessionKey(rawBytes)
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('should import a session key from raw bytes', async () => {
    const { key: original } = await deriveNewKey('my-pass')
    const rawBytes = new Uint8Array(await crypto.subtle.exportKey('raw', original))
    const imported = await importSessionKey(rawBytes)
    expect(imported.type).toBe('secret')
    expect(imported.algorithm.name).toBe('AES-GCM')
    expect(imported).toBeDefined()
  })
})

// ── Encryption / Decryption ────────────────────────────────────────────────────
describe('AES-GCM Encrypt / Decrypt', () => {
  it('should encrypt and decrypt plaintext', async () => {
    const { key } = await deriveNewKey('test-key')
    const ct = await encrypt('Hello, VaultGuard!', key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe('Hello, VaultGuard!')
  })

  it('should produce different ciphertext for same plaintext (unique IVs)', async () => {
    const { key } = await deriveNewKey('test-key')
    const ct1 = await encrypt('same data', key)
    const ct2 = await encrypt('same data', key)
    expect(ct1.ciphertext).not.toBe(ct2.ciphertext)
    expect(ct1.iv).not.toBe(ct2.iv)
  })

  it('should fail to decrypt with wrong key', async () => {
    const { key: k1 } = await deriveNewKey('password-1')
    const { key: k2 } = await deriveNewKey('password-2')
    const ct = await encrypt('secret', k1)
    await expect(decrypt(ct, k2)).rejects.toThrow()
  })

  it('should fail to decrypt with tampered ciphertext', async () => {
    const { key } = await deriveNewKey('tamper-test')
    const ct = await encrypt('original', key)
    // Flip a byte in base64
    const tampered = ct.ciphertext.slice(0, -2) + 'AA'
    await expect(decrypt({ ciphertext: tampered, iv: ct.iv }, key)).rejects.toThrow()
  })

  it('should encrypt empty string', async () => {
    const { key } = await deriveNewKey('empty-test')
    const ct = await encrypt('', key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe('')
  })

  it('should encrypt a very long string', async () => {
    const { key } = await deriveNewKey('long-test')
    const longStr = 'A'.repeat(10000)
    const ct = await encrypt(longStr, key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe(longStr)
  })

  it('should encrypt unicode strings', async () => {
    const { key } = await deriveNewKey('unicode-test')
    const unicode = '🔐 Sécurité αβγ 日本語'
    const ct = await encrypt(unicode, key)
    const pt = await decrypt(ct, key)
    expect(pt).toBe(unicode)
  })
})

// ── Verifier ───────────────────────────────────────────────────────────────────
describe('Vault Verifier', () => {
  it('should create and verify with correct key', async () => {
    const { key } = await deriveNewKey('my-secret-password')
    const verifier = await createVerifier(key)
    expect(await verifyMasterPassword(verifier, key)).toBe(true)
  })

  it('should reject verification with wrong key', async () => {
    const { key: correctKey, salt } = await deriveNewKey('my-secret')
    const verifier = await createVerifier(correctKey)
    const wrongKey = await deriveKey('wrong-password', salt)
    expect(await verifyMasterPassword(verifier, wrongKey)).toBe(false)
  })

  it('should return false for tampered verifier data', async () => {
    const { key } = await deriveNewKey('secure')
    const verifier = await createVerifier(key)
    const tampered = { ...verifier, ciphertext: verifier.ciphertext.slice(0, -2) + 'ZZ' }
    expect(await verifyMasterPassword(tampered, key)).toBe(false)
  })
})

// ── Secure Memory ──────────────────────────────────────────────────────────────
describe('Secure Memory Utilities', () => {
  it('should zero a Uint8Array', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 255])
    secureZero(buf)
    expect(Array.from(buf)).toEqual([0, 0, 0, 0, 0])
  })

  it('should zero an ArrayBuffer', () => {
    const ab = new Uint8Array([10, 20, 30]).buffer
    secureZero(ab)
    expect(Array.from(new Uint8Array(ab))).toEqual([0, 0, 0])
  })

  it('should wipe an object array by nullifying entries', () => {
    const data: unknown[] = ['sensitive', 'data', 123]
    secureWipe(data)
    expect(data[0]).toBeNull()
    expect(data[1]).toBeNull()
    expect(data[2]).toBeNull()
  })
})

// ── Password Entropy ───────────────────────────────────────────────────────────
describe('Password Entropy', () => {
  it('should return 0 for empty password', () => {
    expect(estimateEntropy('')).toBe(0)
  })

  it('should score weak passwords lower than strong ones', () => {
    const weak = estimateEntropy('abc')
    const strong = estimateEntropy('X!k9@mN2#qZ7$wP0')
    expect(strong).toBeGreaterThan(weak)
  })

  it('should increase entropy with uppercase letters', () => {
    const lower = estimateEntropy('aaaaaaaaaa')
    const mixed = estimateEntropy('aaAAAAaaAA')
    expect(mixed).toBeGreaterThan(lower)
  })

  it('should increase entropy with numbers', () => {
    const alpha = estimateEntropy('abcdefghij')
    const alphaNum = estimateEntropy('abcde12345')
    expect(alphaNum).toBeGreaterThan(alpha)
  })

  it('should increase entropy with special characters', () => {
    const alpha = estimateEntropy('abcdefghij')
    const special = estimateEntropy('abc!@#$%^&')
    expect(special).toBeGreaterThan(alpha)
  })

  it('should handle a single character', () => {
    const e = estimateEntropy('a')
    expect(e).toBeGreaterThan(0)
  })
})
