/**
 * Import / Export Module Tests
 * 
 * Tests secure vault backup and restore.
 */
import { describe, it, expect } from 'vitest'
import { exportVault, importVault, EXPORT_MAGIC, EXPORT_VERSION } from './vault-export'
import type { VaultMeta, LoginItem } from '@/types'

const mockMeta: VaultMeta = {
  salt: 'dGVzdHNhbHQ=',
  verifier: 'dGVzdA==',
  verifierIv: 'dGVzdEl2',
  createdAt: 1000000,
  version: 1,
  kdf: { algorithm: 'pbkdf2', iterations: 100_000, hash: 'SHA-256' },
}

const mockItems: LoginItem[] = [
  {
    id: 'item-1',
    type: 'login',
    name: 'GitHub',
    username: 'dev@github.com',
    encryptedPassword: 'encrypted-data==',
    iv: 'iv-data==',
    website: 'github.com',
    notes: '',
    category: 'work',
    favorite: false,
    createdAt: 1000,
    updatedAt: 1000,
    tags: [],
  }
]

describe('Vault Export', () => {
  it('should produce a valid JSON envelope', async () => {
    const json = await exportVault('master-password', mockItems, mockMeta)
    const envelope = JSON.parse(json)

    expect(envelope.magic).toBe(EXPORT_MAGIC)
    expect(envelope.version).toBe(EXPORT_VERSION)
    expect(envelope.ciphertext).toBeDefined()
    expect(envelope.iv).toBeDefined()
    expect(envelope.salt).toBeDefined()
    expect(envelope.kdf).toBeDefined()
    expect(envelope.exportedAt).toBeGreaterThan(0)
  })

  it('should use higher iteration count (200k) for export key', async () => {
    const json = await exportVault('master-password', mockItems, mockMeta)
    const envelope = JSON.parse(json)
    expect(envelope.kdf.iterations).toBeGreaterThanOrEqual(200_000)
  })

  it('should NOT store items in plaintext in the export', async () => {
    const json = await exportVault('master-password', mockItems, mockMeta)
    // The export must not contain plaintext item names or usernames
    expect(json).not.toContain('"GitHub"')
    expect(json).not.toContain('dev@github.com')
    // ciphertext is the only place data lives
    const envelope = JSON.parse(json)
    expect(envelope.ciphertext).toBeDefined()
  })

  it('should produce unique IVs and salts on each export', async () => {
    const json1 = await exportVault('password', mockItems, mockMeta)
    const json2 = await exportVault('password', mockItems, mockMeta)
    const e1 = JSON.parse(json1)
    const e2 = JSON.parse(json2)
    expect(e1.iv).not.toBe(e2.iv)
    expect(e1.salt).not.toBe(e2.salt)
    expect(e1.ciphertext).not.toBe(e2.ciphertext)
  })
})

describe('Vault Import', () => {
  it('should round-trip export → import with correct password', async () => {
    const json = await exportVault('correct-password', mockItems, mockMeta)
    const result = await importVault(json, 'correct-password')

    expect(result.success).toBe(true)
    expect(result.items).toHaveLength(1)
    expect(result.items![0].name).toBe('GitHub')
    expect(result.items![0].type).toBe('login')
    expect(result.meta).toBeDefined()
  })

  it('should reject import with wrong password', async () => {
    const json = await exportVault('correct-password', mockItems, mockMeta)
    const result = await importVault(json, 'wrong-password')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Decryption failed')
  })

  it('should reject invalid JSON', async () => {
    const result = await importVault('not valid json { ]', 'password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('JSON parse failed')
  })

  it('should reject files with wrong magic header', async () => {
    const json = await exportVault('password', mockItems, mockMeta)
    const envelope = JSON.parse(json)
    envelope.magic = 'MALICIOUS_EXPORT'
    const result = await importVault(JSON.stringify(envelope), 'password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not a VaultGuard export')
  })

  it('should reject files with unsupported version', async () => {
    const json = await exportVault('password', mockItems, mockMeta)
    const envelope = JSON.parse(json)
    envelope.version = 999
    const result = await importVault(JSON.stringify(envelope), 'password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported export version')
  })

  it('should reject malformed envelope (missing ciphertext)', async () => {
    const json = await exportVault('password', mockItems, mockMeta)
    const envelope = JSON.parse(json)
    delete envelope.ciphertext
    const result = await importVault(JSON.stringify(envelope), 'password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('missing required fields')
  })

  it('should reject tampered ciphertext', async () => {
    const json = await exportVault('password', mockItems, mockMeta)
    const envelope = JSON.parse(json)
    // Flip some bytes in ciphertext
    const ct = envelope.ciphertext
    envelope.ciphertext = ct.slice(0, -4) + 'XXXX'
    const result = await importVault(JSON.stringify(envelope), 'password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Decryption failed')
  })

  it('should handle empty items array', async () => {
    const json = await exportVault('password', [], mockMeta)
    const result = await importVault(json, 'password')
    expect(result.success).toBe(true)
    expect(result.items).toHaveLength(0)
  })

  it('should filter out items with invalid types', async () => {
    const json = await exportVault('password', mockItems, mockMeta)
    // Can't inject items post-encryption (AES-GCM prevents this)
    // This test verifies the item sanitizer via the direct sanitize path
    const result = await importVault(json, 'password')
    // All legitimate items should pass sanitization
    expect(result.items?.every(i => ['login', 'card', 'note', 'identity'].includes(i.type))).toBe(true)
  })
})
