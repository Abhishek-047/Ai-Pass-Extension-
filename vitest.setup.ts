import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { vi, beforeEach } from 'vitest'
import { webcrypto } from 'crypto'

// ─── Chrome mock storage maps ────────────────────────────────────────────────
const mockLocalStorage = new Map<string, unknown>()
const mockSessionStorage = new Map<string, unknown>()

// Reset storage between tests to avoid cross-test pollution
beforeEach(() => {
  mockLocalStorage.clear()
  mockSessionStorage.clear()
})

// ─── chrome.storage.local mock ───────────────────────────────────────────────
const chromeLocalStorage = {
  get: vi.fn((keys: string[], cb: (r: Record<string, unknown>) => void) => {
    const result: Record<string, unknown> = {}
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k: string) => {
      result[k] = mockLocalStorage.get(k)
    })
    cb(result)
  }),
  set: vi.fn((items: Record<string, unknown>, cb: () => void) => {
    Object.keys(items).forEach(k => mockLocalStorage.set(k, items[k]))
    cb()
  }),
  remove: vi.fn((keys: string[], cb: () => void) => {
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k: string) => mockLocalStorage.delete(k))
    cb()
  }),
}

// ─── chrome.storage.session mock ─────────────────────────────────────────────
const chromeSessionStorage = {
  get: vi.fn((keys: string | string[]) => {
    const result: Record<string, unknown> = {}
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k: string) => {
      result[k] = mockSessionStorage.get(k)
    })
    return Promise.resolve(result)
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.keys(items).forEach(k => mockSessionStorage.set(k, items[k]))
    return Promise.resolve()
  }),
  remove: vi.fn((keys: string | string[]) => {
    ;(Array.isArray(keys) ? keys : [keys]).forEach((k: string) => mockSessionStorage.delete(k))
    return Promise.resolve()
  }),
  setAccessLevel: vi.fn(() => Promise.resolve()),
}

// ─── Full chrome global mock ──────────────────────────────────────────────────
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(() => Promise.resolve({ ok: true })),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onConnect: {
      addListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    lastError: undefined,
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
  storage: {
    local: chromeLocalStorage,
    session: chromeSessionStorage,
  },
  tabs: {
    query: vi.fn((_q: unknown, cb: (tabs: unknown[]) => void) => cb([])),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
} as any

// ─── WebCrypto polyfill ───────────────────────────────────────────────────────
if (typeof crypto === 'undefined') {
  global.crypto = webcrypto as any
} else if (!crypto.subtle) {
  Object.defineProperty(crypto, 'subtle', { value: webcrypto.subtle })
  Object.defineProperty(crypto, 'getRandomValues', {
    value: webcrypto.getRandomValues.bind(webcrypto),
  })
}
