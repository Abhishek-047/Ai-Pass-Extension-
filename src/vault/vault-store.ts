/**
 * VaultGuard — Main Vault Store (Zustand)
 * 
 * Manages vault state, encryption key in memory,
 * and all CRUD operations on vault items.
 * 
 * The encryption key lives ONLY in this store (memory).
 * On lock(), it is discarded. No key → no access to vault data.
 */

import { create } from 'zustand'
import type {
  VaultItem, VaultMeta, LoginItem, CardItem, NoteItem, IdentityItem,
  VaultHealthReport, PasswordAnalysis, Page, ToastMessage
} from '@/types'
import {
  deriveKey, deriveNewKey, createVerifier, verifyMasterPassword,
  encrypt, decrypt, estimateEntropy, importSessionKey, arrayBufferToBase64, base64ToUint8Array
} from '@/crypto'
import {
  loadVaultMeta, saveVaultMeta, loadVaultItems, saveVaultItems,
  loadSettings, saveSettings, wipeVault
} from '@/storage'
import type { StoredSettings } from '@/storage'
import { nanoid } from '@/utils/nanoid'

// ─────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────

interface VaultStore {
  // State
  isLocked: boolean
  isSetup: boolean
  isLoading: boolean
  currentPage: Page
  items: VaultItem[]
  meta: VaultMeta | null
  settings: StoredSettings | null
  toasts: ToastMessage[]
  searchQuery: string
  activeCategory: string | null

  // Lockout State
  failedUnlockAttempts: number
  lockoutUntil: number | null

  // Derived
  healthReport: VaultHealthReport | null

  // Init
  initialize: () => Promise<void>

  // Auth
  setupMasterPassword: (password: string) => Promise<boolean>
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  resetAutoLockTimer: () => void

  // CRUD
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateItem: (id: string, updates: Partial<VaultItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>

  // Password ops
  getDecryptedPassword: (item: LoginItem) => Promise<string>

  // Navigation
  navigate: (page: Page) => void

  // Search
  setSearchQuery: (q: string) => void
  setActiveCategory: (cat: string | null) => void

  // Settings
  updateSettings: (settings: Partial<StoredSettings>) => Promise<void>

  // Toast
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void

  // Health
  computeHealthReport: () => void

  // Wipe
  wipeEverything: () => Promise<void>
}

// ─────────────────────────────────────────────
// In-memory key (never persisted)
// ─────────────────────────────────────────────
let _sessionKey: CryptoKey | null = null

// Auto-lock timer
let _lockTimer: ReturnType<typeof setTimeout> | null = null

// Failed unlock tracker (file level)
let _failedAttempts = 0
let _lockoutTime: number | null = null

// ─────────────────────────────────────────────
// Password Analysis (local, no AI API needed)
// ─────────────────────────────────────────────

function analyzePassword(password: string): PasswordAnalysis {
  const entropy = estimateEntropy(password)
  const issues: string[] = []
  const suggestions: string[] = []

  if (password.length < 8) issues.push('Too short (minimum 8 characters)')
  if (password.length < 12) suggestions.push('Use at least 12 characters')
  if (!/[A-Z]/.test(password)) issues.push('No uppercase letters')
  if (!/[a-z]/.test(password)) issues.push('No lowercase letters')
  if (!/[0-9]/.test(password)) issues.push('No numbers')
  if (!/[^a-zA-Z0-9]/.test(password)) issues.push('No special characters')

  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'admin', 'letmein']
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    issues.push('Contains common weak pattern')
  }

  if (/(.)\1{2,}/.test(password)) issues.push('Has repeated characters')
  if (suggestions.length === 0 && issues.length === 0) {
    suggestions.push('Great password! Consider using a passphrase for memorability.')
  }

  let score = Math.min(100, Math.round(entropy * 1.5))
  score -= issues.length * 12
  score = Math.max(0, score)

  const strength =
    score >= 80 ? 'very-strong' :
    score >= 60 ? 'strong' :
    score >= 40 ? 'fair' :
    score >= 20 ? 'weak' : 'very-weak'

  return { strength, score, issues, suggestions, entropy }
}

// ─────────────────────────────────────────────
// Health Report
// ─────────────────────────────────────────────

async function buildHealthReport(
  items: VaultItem[],
  getDecrypted: (item: LoginItem) => Promise<string>
): Promise<VaultHealthReport> {
  const loginItems = items.filter((i): i is LoginItem => i.type === 'login')
  const passwordMap = new Map<string, LoginItem[]>()
  const weakItems: LoginItem[] = []

  for (const item of loginItems) {
    try {
      const pwd = await getDecrypted(item)
      const analysis = analyzePassword(pwd)
      if (analysis.score < 40) weakItems.push(item)

      // Group by password value to find reuse
      const existing = passwordMap.get(pwd) ?? []
      existing.push(item)
      passwordMap.set(pwd, existing)
    } catch {
      // Can't decrypt — vault locked
    }
  }

  const reusedItems: LoginItem[] = []
  for (const [, group] of passwordMap) {
    if (group.length > 1) reusedItems.push(...group)
  }

  const strongCount = loginItems.length - weakItems.length - reusedItems.filter(
    item => !weakItems.includes(item)
  ).length

  const score = loginItems.length === 0 ? 100 :
    Math.max(0, Math.round(
      100 - (weakItems.length / loginItems.length) * 40
          - (reusedItems.length / loginItems.length) * 35
    ))

  return {
    securityScore: score,
    totalItems: items.length,
    strongPasswords: Math.max(0, strongCount),
    weakPasswords: weakItems.length,
    reusedPasswords: reusedItems.length,
    compromisedPatterns: 0,
    weakItems,
    reusedItems: [...new Set(reusedItems)],
  }
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useVaultStore = create<VaultStore>((set, get) => ({
  isLocked: true,
  isSetup: false,
  isLoading: true,
  currentPage: 'unlock',
  items: [],
  meta: null,
  settings: null,
  toasts: [],
  searchQuery: '',
  activeCategory: null,
  healthReport: null,
  failedUnlockAttempts: 0,
  lockoutUntil: null,

  // ── Initialize ──
  initialize: async () => {
    const meta = await loadVaultMeta()
    const settings = await loadSettings()

    let isLocked = true
    let currentPage: Page = meta ? 'unlock' : 'setup'
    let items: VaultItem[] = []

    // Attempt to restore a persisted session key (survives popup close)
    if (meta && chrome.storage.session) {
      try {
        const sessionResult = await (chrome.storage.session as any).get('session_key')
        const base64Key = sessionResult?.session_key as string | undefined
        if (base64Key) {
          const keyBytes = base64ToUint8Array(base64Key)
          const restoredKey = await importSessionKey(keyBytes)
          _sessionKey = restoredKey
          items = await loadVaultItems()
          isLocked = false
          currentPage = 'dashboard'
        }
      } catch (err) {
        // Session key invalid or storage unavailable — require fresh unlock
        console.warn('[VaultStore] Session restore failed, vault locked:', err)
        _sessionKey = null
        isLocked = true
        currentPage = 'unlock'
      }
    }

    set({
      isSetup: !!meta,
      meta,
      settings,
      isLoading: false,
      currentPage,
      isLocked,
      items,
    })

    if (!isLocked) {
      get().computeHealthReport()
      get().resetAutoLockTimer()
    }
  },

  // ── Setup ──
  setupMasterPassword: async (password: string) => {
    try {
      const { key, salt, kdf } = await deriveNewKey(password, 'pbkdf2')
      const verifierData = await createVerifier(key)

      const meta: VaultMeta = {
        salt,
        verifier: verifierData.ciphertext,
        verifierIv: verifierData.iv,
        createdAt: Date.now(),
        version: 1,
        kdf,
      }

      await saveVaultMeta(meta)
      _sessionKey = key

      // Persist session key so subsequent popup opens stay unlocked
      try {
        const rawKeyBytes = await crypto.subtle.exportKey('raw', key)
        const base64Key = arrayBufferToBase64(new Uint8Array(rawKeyBytes))
        if (chrome.storage.session) {
          await (chrome.storage.session as any).set({ session_key: base64Key })
        }
        await chrome.runtime.sendMessage({ type: 'VAULT_UNLOCK', payload: base64Key }).catch(() => {})
      } catch (persistErr) {
        console.warn('[VaultStore] Failed to persist session key after setup:', persistErr)
      }

      set({ isSetup: true, isLocked: false, meta, currentPage: 'dashboard', items: [] })
      get().addToast({ type: 'success', title: 'Vault created!', description: 'Your secure vault is ready.' })
      return true
    } catch (err) {
      console.error('[VaultStore] Setup failed:', err)
      return false
    }
  },

  // ── Unlock ──
  unlock: async (password: string) => {
    const { meta } = get()
    if (!meta) return false

    // Check failed attempts lockout
    const now = Date.now()
    if (_failedAttempts >= 5 && _lockoutTime && now < _lockoutTime) {
      const remainingSeconds = Math.ceil((_lockoutTime - now) / 1000)
      get().addToast({
        type: 'error',
        title: 'Too many failed attempts',
        description: `Please wait ${remainingSeconds}s before trying again.`,
      })
      return false
    }

    try {
      const key = await deriveKey(password, meta.salt, meta.kdf)

      // Verify master password by decrypting the stored verifier blob
      const verified = await verifyMasterPassword(
        { ciphertext: meta.verifier, iv: meta.verifierIv },
        key
      )

      if (!verified) {
        _failedAttempts++
        if (_failedAttempts >= 5) {
          _lockoutTime = Date.now() + 30000 // 30s lockout
          set({ failedUnlockAttempts: _failedAttempts, lockoutUntil: _lockoutTime })
          get().addToast({
            type: 'error',
            title: 'Too many failed attempts',
            description: 'Vault locked for 30 seconds.',
          })
        } else {
          set({ failedUnlockAttempts: _failedAttempts })
          get().addToast({
            type: 'error',
            title: 'Wrong master password',
            description: `Attempt ${_failedAttempts} of 5.`,
          })
        }
        return false
      }

      // ✅ Password correct — reset failure counters
      _failedAttempts = 0
      _lockoutTime = null
      _sessionKey = key

      // Load items and update UI state IMMEDIATELY — don't block on session persistence
      const items = await loadVaultItems()
      set({ isLocked: false, items, currentPage: 'dashboard', failedUnlockAttempts: 0, lockoutUntil: null })
      get().resetAutoLockTimer()
      get().computeHealthReport()

      // Persist session key to survive popup close — fire and forget, non-blocking
      void (async () => {
        try {
          const rawKeyBytes = await crypto.subtle.exportKey('raw', key)
          const base64Key = arrayBufferToBase64(new Uint8Array(rawKeyBytes))
          if (chrome.storage.session) {
            await (chrome.storage.session as any).set({ session_key: base64Key })
          }
          // Notify background worker for autofill support
          chrome.runtime.sendMessage({ type: 'VAULT_UNLOCK', payload: base64Key }).catch(() => {})
        } catch (e) {
          console.warn('[VaultStore] Session key persistence failed (non-fatal):', e)
        }
      })()

      return true
    } catch (err) {
      console.error('[VaultStore] Unlock error:', err)
      return false
    }
  },

  // ── Lock ──
  lock: () => {
    _sessionKey = null

    // Clear session key from persistent session storage
    if (chrome.storage.session) {
      (chrome.storage.session as any).remove(['session_key']).catch(() => {})
    }

    // Notify background worker (which will notify all content scripts)
    chrome.runtime.sendMessage({ type: 'VAULT_LOCK' }).catch(() => {})

    if (_lockTimer) {
      clearTimeout(_lockTimer)
      _lockTimer = null
    }

    // Wipe decrypted state from memory
    set({
      isLocked: true,
      items: [],
      currentPage: 'unlock',
      healthReport: null,
      searchQuery: '',
      activeCategory: null,
    })
  },

  // ── Reset Auto Lock Timer ──
  resetAutoLockTimer: () => {
    const settings = get().settings
    if (settings && settings.autoLockMinutes > 0 && !get().isLocked) {
      if (_lockTimer) clearTimeout(_lockTimer)
      _lockTimer = setTimeout(() => {
        get().lock()
      }, settings.autoLockMinutes * 60 * 1000)
    }
  },

  // ── Add Item ──
  addItem: async (itemData) => {
    if (!_sessionKey) return

    let newItem: VaultItem

    if (itemData.type === 'login') {
      const loginData = itemData as Omit<LoginItem, 'id' | 'createdAt' | 'updatedAt'>
      const rawPassword = (itemData as { rawPassword?: string }).rawPassword as string ?? ''
      const encrypted = await encrypt(rawPassword, _sessionKey)
      newItem = {
        ...loginData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedPassword: encrypted.ciphertext,
        iv: encrypted.iv,
      } as LoginItem
    } else if (itemData.type === 'card') {
      const cardData = itemData as Omit<CardItem, 'id' | 'createdAt' | 'updatedAt'> & { rawNumber?: string; rawCvv?: string }
      const encNum = await encrypt(cardData.rawNumber ?? '', _sessionKey)
      const encCvv = await encrypt(cardData.rawCvv ?? '', _sessionKey)
      newItem = {
        ...cardData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedNumber: encNum.ciphertext,
        ivNumber: encNum.iv,
        encryptedCvv: encCvv.ciphertext,
        ivCvv: encCvv.iv,
      } as CardItem
    } else if (itemData.type === 'note') {
      const noteData = itemData as Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> & { rawContent?: string }
      const encContent = await encrypt(noteData.rawContent ?? '', _sessionKey)
      newItem = {
        ...noteData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedContent: encContent.ciphertext,
        ivContent: encContent.iv,
      } as NoteItem
    } else {
      newItem = {
        ...itemData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as IdentityItem
    }

    const updated = [...get().items, newItem]
    await saveVaultItems(updated)
    set({ items: updated })
    get().computeHealthReport()
    get().addToast({ type: 'success', title: 'Item saved', description: `${newItem.name} added to vault.` })
  },

  // ── Update Item ──
  updateItem: async (id, updates) => {
    const items = get().items.map(item =>
      item.id === id ? ({ ...item, ...updates, updatedAt: Date.now() } as VaultItem) : item
    )
    await saveVaultItems(items)
    set({ items })
    get().computeHealthReport()
  },

  // ── Delete Item ──
  deleteItem: async (id) => {
    const items = get().items.filter(item => item.id !== id)
    await saveVaultItems(items)
    set({ items })
    get().computeHealthReport()
    get().addToast({ type: 'success', title: 'Item deleted' })
  },

  // ── Toggle Favorite ──
  toggleFavorite: async (id) => {
    const items = get().items.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item
    )
    await saveVaultItems(items)
    set({ items })
  },

  // ── Get Decrypted Password ──
  getDecryptedPassword: async (item: LoginItem) => {
    if (!_sessionKey) throw new Error('Vault is locked')
    return decrypt({ ciphertext: item.encryptedPassword, iv: item.iv }, _sessionKey)
  },

  // ── Navigation ──
  navigate: (page) => set({ currentPage: page }),

  // ── Search ──
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),

  // ── Settings ──
  updateSettings: async (newSettings) => {
    await saveSettings(newSettings)
    const updated = { ...get().settings!, ...newSettings }
    set({ settings: updated })
  },

  // ── Toast ──
  addToast: (toast) => {
    const id = nanoid()
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  },

  // ── Health ──
  computeHealthReport: () => {
    const { items } = get()
    if (!_sessionKey) return
    buildHealthReport(items, (item) => get().getDecryptedPassword(item))
      .then(report => set({ healthReport: report }))
      .catch(() => {})
  },

  // ── Wipe ──
  wipeEverything: async () => {
    _sessionKey = null
    await wipeVault()
    set({ isLocked: true, isSetup: false, items: [], meta: null, currentPage: 'setup' })
  },
}))
