/**
 * Storage Layer Tests
 * 
 * Tests chrome.storage.local wrapper functions.
 * Uses the mock chrome API from vitest.setup.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadVaultMeta,
  saveVaultMeta,
  clearVaultMeta,
  loadVaultItems,
  saveVaultItems,
  clearVaultItems,
  loadSettings,
  saveSettings,
  wipeVault,
} from './vault-storage'
import type { VaultMeta } from '@/types'

const mockMeta: VaultMeta = {
  salt: 'dGVzdHNhbHQ=',
  verifier: 'dGVzdA==',
  verifierIv: 'dGVzdEl2',
  createdAt: 1000000,
  version: 1,
  kdf: { algorithm: 'pbkdf2', iterations: 100_000, hash: 'SHA-256' },
}

describe('Storage — Vault Meta', () => {
  beforeEach(async () => {
    await wipeVault()
    vi.clearAllMocks()
  })

  it('should return null when no meta is stored', async () => {
    const meta = await loadVaultMeta()
    expect(meta).toBeNull()
  })

  it('should save and load vault meta', async () => {
    await saveVaultMeta(mockMeta)
    const loaded = await loadVaultMeta()
    expect(loaded).toEqual(mockMeta)
  })

  it('should clear vault meta', async () => {
    await saveVaultMeta(mockMeta)
    await clearVaultMeta()
    const result = await loadVaultMeta()
    expect(result).toBeNull()
  })
})

describe('Storage — Vault Items', () => {
  beforeEach(async () => {
    await wipeVault()
    vi.clearAllMocks()
  })

  it('should return empty array when no items stored', async () => {
    const items = await loadVaultItems()
    expect(items).toEqual([])
  })

  it('should save and load vault items', async () => {
    const items: any[] = [
      {
        id: 'abc123',
        type: 'login' as const,
        name: 'GitHub',
        username: 'dev@github.com',
        encryptedPassword: 'encrypted==',
        iv: 'iv==',
        website: 'github.com',
        category: 'work',
        notes: '',
        favorite: false,
        createdAt: 1000,
        updatedAt: 1000,
        tags: [],
      }
    ]
    await saveVaultItems(items)
    const loaded = await loadVaultItems()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('abc123')
    expect(loaded[0].name).toBe('GitHub')
  })

  it('should save multiple items', async () => {
    const items: any[] = [
      { id: 'id1', type: 'login', name: 'A', username: 'a', encryptedPassword: 'e1', iv: 'iv1', website: 'a.com', category: 'other', notes: '', favorite: false, createdAt: 1, updatedAt: 1, tags: [] },
      { id: 'id2', type: 'login', name: 'B', username: 'b', encryptedPassword: 'e2', iv: 'iv2', website: 'b.com', category: 'other', notes: '', favorite: false, createdAt: 2, updatedAt: 2, tags: [] },
    ]
    await saveVaultItems(items)
    const loaded = await loadVaultItems()
    expect(loaded).toHaveLength(2)
  })

  it('should overwrite items on subsequent save', async () => {
    const first: any[] = [{ id: 'id1', type: 'login', name: 'First', username: 'f', encryptedPassword: 'e', iv: 'iv', website: 'f.com', category: 'other', notes: '', favorite: false, createdAt: 1, updatedAt: 1, tags: [] }]
    const second: any[] = [{ id: 'id2', type: 'login', name: 'Second', username: 's', encryptedPassword: 'e', iv: 'iv', website: 's.com', category: 'other', notes: '', favorite: false, createdAt: 2, updatedAt: 2, tags: [] }]

    await saveVaultItems(first)
    await saveVaultItems(second)
    const loaded = await loadVaultItems()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('Second')
  })

  it('should clear vault items', async () => {
    const items: any[] = [{ id: 'id1', type: 'login', name: 'A', username: 'a', encryptedPassword: 'e', iv: 'iv', website: 'a.com', category: 'other', notes: '', favorite: false, createdAt: 1, updatedAt: 1, tags: [] }]
    await saveVaultItems(items)
    await clearVaultItems()
    const loaded = await loadVaultItems()
    expect(loaded).toEqual([])
  })
})

describe('Storage — Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return default settings when none saved', async () => {
    const settings = await loadSettings()
    expect(settings.autoLockMinutes).toBe(5)
    expect(settings.clipboardClearSeconds).toBe(15)
    expect(settings.autofillEnabled).toBe(true)
    expect(settings.showPasswordStrength).toBe(true)
    expect(settings.theme).toBe('dark')
  })

  it('should save and load settings', async () => {
    await saveSettings({ autoLockMinutes: 15 })
    const loaded = await loadSettings()
    expect(loaded.autoLockMinutes).toBe(15)
  })

  it('should merge partial settings with defaults', async () => {
    await saveSettings({ autofillEnabled: false })
    const loaded = await loadSettings()
    expect(loaded.autofillEnabled).toBe(false)
    // Other defaults should remain
    expect(loaded.theme).toBe('dark')
    expect(loaded.showPasswordStrength).toBe(true)
  })
})

describe('Storage — wipeVault', () => {
  it('should remove both meta and items', async () => {
    await saveVaultMeta(mockMeta)
    const wipeItems: any[] = [{ id: 'id1', type: 'login', name: 'A', username: 'a', encryptedPassword: 'e', iv: 'iv', website: 'a.com', category: 'other', notes: '', favorite: false, createdAt: 1, updatedAt: 1, tags: [] }]
    await saveVaultItems(wipeItems)

    await wipeVault()

    expect(await loadVaultMeta()).toBeNull()
    expect(await loadVaultItems()).toEqual([])
  })
})
