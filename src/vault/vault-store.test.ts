import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useVaultStore } from './vault-store'
import { wipeVault } from '@/storage'

// Capture initial state to reset between tests
const initialState = useVaultStore.getState()

describe('Vault Store — Core Lifecycle', () => {
  beforeEach(async () => {
    useVaultStore.setState(initialState, true)
    await wipeVault()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Initial State ──────────────────────────────────────────────────────────
  it('should initialize locked and un-setup', () => {
    const store = useVaultStore.getState()
    expect(store.isLocked).toBe(true)
    expect(store.isSetup).toBe(false)
    expect(store.items).toHaveLength(0)
    expect(store.meta).toBeNull()
  })

  it('should have correct default page as unlock', () => {
    const store = useVaultStore.getState()
    expect(store.currentPage).toBe('unlock')
  })

  it('should have empty search and no active category by default', () => {
    const store = useVaultStore.getState()
    expect(store.searchQuery).toBe('')
    expect(store.activeCategory).toBeNull()
  })

  // ── Setup ──────────────────────────────────────────────────────────────────
  it('should setup master password and unlock vault', async () => {
    const store = useVaultStore.getState()
    const success = await store.setupMasterPassword('MyStr0ng!Pass')
    expect(success).toBe(true)

    const updated = useVaultStore.getState()
    expect(updated.isSetup).toBe(true)
    expect(updated.isLocked).toBe(false)
    expect(updated.currentPage).toBe('dashboard')
    expect(updated.meta).toBeDefined()
    expect(updated.meta?.salt).toBeDefined()
    expect(updated.meta?.version).toBe(1)
  })

  it('should store a verifier in meta after setup', async () => {
    const store = useVaultStore.getState()
    await store.setupMasterPassword('Test#Password99')
    const { meta } = useVaultStore.getState()
    expect(meta?.verifier).toBeDefined()
    expect(meta?.verifierIv).toBeDefined()
  })

  // ── Lock / Unlock ──────────────────────────────────────────────────────────
  it('should lock vault and wipe in-memory state', async () => {
    const store = useVaultStore.getState()
    await store.setupMasterPassword('password123')
    useVaultStore.getState().lock()

    const locked = useVaultStore.getState()
    expect(locked.isLocked).toBe(true)
    expect(locked.items).toHaveLength(0)
    expect(locked.currentPage).toBe('unlock')
    expect(locked.healthReport).toBeNull()
  })

  it('should reject wrong master password on unlock', async () => {
    const store = useVaultStore.getState()
    await store.setupMasterPassword('correct-password')
    useVaultStore.getState().lock()

    const fail = await useVaultStore.getState().unlock('wrong-password')
    expect(fail).toBe(false)
    expect(useVaultStore.getState().isLocked).toBe(true)
  })

  it('should unlock with correct master password', async () => {
    const store = useVaultStore.getState()
    await store.setupMasterPassword('correct-password')
    useVaultStore.getState().lock()

    const success = await useVaultStore.getState().unlock('correct-password')
    expect(success).toBe(true)
    expect(useVaultStore.getState().isLocked).toBe(false)
    expect(useVaultStore.getState().currentPage).toBe('dashboard')
  })

  it('should enforce lockout after 5 consecutive failed attempts', async () => {
    const store = useVaultStore.getState()
    await store.setupMasterPassword('correct-password')
    useVaultStore.getState().lock()

    // Drain 5 attempts
    for (let i = 0; i < 5; i++) {
      await useVaultStore.getState().unlock('wrong')
    }

    // 6th attempt should be blocked immediately
    const blocked = await useVaultStore.getState().unlock('wrong')
    expect(blocked).toBe(false)
    expect(useVaultStore.getState().failedUnlockAttempts).toBeGreaterThanOrEqual(5)
  })

  it('should fail gracefully when no meta exists', async () => {
    // No vault set up
    const result = await useVaultStore.getState().unlock('any-password')
    expect(result).toBe(false)
  })
})

describe('Vault Store — CRUD Operations', () => {
  beforeEach(async () => {
    useVaultStore.setState(initialState, true)
    await wipeVault()
    vi.clearAllMocks()
    // Setup + unlock fresh vault for each CRUD test
    await useVaultStore.getState().setupMasterPassword('VaultTestPass123!')
  })

  // ── Add Items ──────────────────────────────────────────────────────────────
  it('should add a login item and encrypt the password', async () => {
    const store = useVaultStore.getState()
    await store.addItem({
      type: 'login',
      name: 'GitHub',
      username: 'dev@github.com',
      rawPassword: 'super-secret-123!',
      website: 'https://github.com',
      notes: '',
    } as any)

    const { items } = useVaultStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('GitHub')
    expect(items[0].type).toBe('login')

    const login = items[0] as any
    // Password must be encrypted — not stored in plaintext
    expect(login.encryptedPassword).toBeDefined()
    expect(login.encryptedPassword).not.toBe('super-secret-123!')
    expect(login.iv).toBeDefined()
  })

  it('should decrypt a stored login password correctly', async () => {
    const store = useVaultStore.getState()
    await store.addItem({
      type: 'login',
      name: 'Google',
      username: 'test@gmail.com',
      rawPassword: 'my-google-password-Xyz99!',
      website: 'google.com',
      notes: '',
    } as any)

    const { items } = useVaultStore.getState()
    const loginItem = items[0] as any
    const decrypted = await useVaultStore.getState().getDecryptedPassword(loginItem)
    expect(decrypted).toBe('my-google-password-Xyz99!')
  })

  it('should add a secure note item', async () => {
    const store = useVaultStore.getState()
    await store.addItem({
      type: 'note',
      name: 'Secret Note',
      rawContent: 'This is top secret content',
      notes: '',
    } as any)

    const { items } = useVaultStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('note')
    expect((items[0] as any).encryptedContent).toBeDefined()
    expect((items[0] as any).encryptedContent).not.toBe('This is top secret content')
  })

  it('should add a card item with encrypted number and CVV', async () => {
    const store = useVaultStore.getState()
    await store.addItem({
      type: 'card',
      name: 'Visa Debit',
      cardholderName: 'John Doe',
      rawNumber: '4111111111111111',
      rawCvv: '123',
      expiry: '12/26',
      notes: '',
    } as any)

    const { items } = useVaultStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('card')
    const card = items[0] as any
    expect(card.encryptedNumber).toBeDefined()
    expect(card.encryptedNumber).not.toBe('4111111111111111')
    expect(card.encryptedCvv).toBeDefined()
    expect(card.encryptedCvv).not.toBe('123')
  })

  it('should assign unique IDs to each item', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'Site A', username: 'a@a.com', rawPassword: 'pw1', website: 'a.com', notes: '' } as any)
    await store.addItem({ type: 'login', name: 'Site B', username: 'b@b.com', rawPassword: 'pw2', website: 'b.com', notes: '' } as any)

    const { items } = useVaultStore.getState()
    expect(items).toHaveLength(2)
    expect(items[0].id).not.toBe(items[1].id)
  })

  // ── Update Items ───────────────────────────────────────────────────────────
  it('should update an item name', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'OldName', username: 'u@u.com', rawPassword: 'pw', website: 'u.com', notes: '' } as any)

    const { items } = useVaultStore.getState()
    const id = items[0].id
    await useVaultStore.getState().updateItem(id, { name: 'NewName' })

    const updated = useVaultStore.getState().items[0]
    expect(updated.name).toBe('NewName')
    expect(updated.updatedAt).toBeGreaterThan(0)
  })

  // ── Delete Items ───────────────────────────────────────────────────────────
  it('should delete an item by id', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'ToDelete', username: 'u@u.com', rawPassword: 'pw', website: 'u.com', notes: '' } as any)

    const { items } = useVaultStore.getState()
    const id = items[0].id
    await useVaultStore.getState().deleteItem(id)

    expect(useVaultStore.getState().items).toHaveLength(0)
  })

  it('should not affect other items when deleting one', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'Keep', username: 'k@k.com', rawPassword: 'pw', website: 'k.com', notes: '' } as any)
    await store.addItem({ type: 'login', name: 'Delete', username: 'd@d.com', rawPassword: 'pw', website: 'd.com', notes: '' } as any)

    const items = useVaultStore.getState().items
    const deleteId = items.find(i => i.name === 'Delete')!.id
    await useVaultStore.getState().deleteItem(deleteId)

    const remaining = useVaultStore.getState().items
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe('Keep')
  })

  // ── Favorites ──────────────────────────────────────────────────────────────
  it('should toggle favorite status', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'FavSite', username: 'f@f.com', rawPassword: 'pw', website: 'f.com', notes: '' } as any)

    const id = useVaultStore.getState().items[0].id
    expect(useVaultStore.getState().items[0].favorite).toBeFalsy()

    await useVaultStore.getState().toggleFavorite(id)
    expect(useVaultStore.getState().items[0].favorite).toBe(true)

    await useVaultStore.getState().toggleFavorite(id)
    expect(useVaultStore.getState().items[0].favorite).toBe(false)
  })

  // ── Locked state guards ────────────────────────────────────────────────────
  it('should throw when getDecryptedPassword is called while locked', async () => {
    const store = useVaultStore.getState()
    await store.addItem({ type: 'login', name: 'Site', username: 'u@u.com', rawPassword: 'pw', website: 'u.com', notes: '' } as any)
    const item = useVaultStore.getState().items[0] as any

    // Lock the vault
    useVaultStore.getState().lock()

    await expect(useVaultStore.getState().getDecryptedPassword(item)).rejects.toThrow('Vault is locked')
  })

  it('should not add item when vault is locked (silent guard)', async () => {
    useVaultStore.getState().lock()
    // addItem silently returns when vault is locked
    await useVaultStore.getState().addItem({ type: 'login', name: 'X', username: 'x@x.com', rawPassword: 'pw', website: 'x.com', notes: '' } as any)
    // Items list stays empty because vault is locked
    expect(useVaultStore.getState().items).toHaveLength(0)
  })
})

describe('Vault Store — Navigation, Search & Toast', () => {
  beforeEach(async () => {
    useVaultStore.setState(initialState, true)
    await wipeVault()
    vi.clearAllMocks()
  })

  it('should navigate to a different page', () => {
    useVaultStore.getState().navigate('settings')
    expect(useVaultStore.getState().currentPage).toBe('settings')
  })

  it('should set and clear search query', () => {
    useVaultStore.getState().setSearchQuery('github')
    expect(useVaultStore.getState().searchQuery).toBe('github')
    useVaultStore.getState().setSearchQuery('')
    expect(useVaultStore.getState().searchQuery).toBe('')
  })

  it('should set active category', () => {
    useVaultStore.getState().setActiveCategory('login')
    expect(useVaultStore.getState().activeCategory).toBe('login')
    useVaultStore.getState().setActiveCategory(null)
    expect(useVaultStore.getState().activeCategory).toBeNull()
  })

  it('should add a toast notification with unique id', () => {
    useVaultStore.getState().addToast({ type: 'success', title: 'Done!', description: 'Action completed' })
    const { toasts } = useVaultStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].id).toBeDefined()
    expect(toasts[0].title).toBe('Done!')
    expect(toasts[0].type).toBe('success')
  })

  it('should remove a toast by id', () => {
    useVaultStore.getState().addToast({ type: 'info', title: 'Hi' })
    const id = useVaultStore.getState().toasts[0].id
    useVaultStore.getState().removeToast(id)
    expect(useVaultStore.getState().toasts).toHaveLength(0)
  })
})

describe('Vault Store — Wipe Everything', () => {
  it('should wipe vault and reset to setup state', async () => {
    useVaultStore.setState(initialState, true)
    await wipeVault()
    vi.clearAllMocks()

    await useVaultStore.getState().setupMasterPassword('pass')
    await useVaultStore.getState().wipeEverything()

    const state = useVaultStore.getState()
    expect(state.isLocked).toBe(true)
    expect(state.isSetup).toBe(false)
    expect(state.items).toHaveLength(0)
    expect(state.meta).toBeNull()
    expect(state.currentPage).toBe('setup')
  })
})
