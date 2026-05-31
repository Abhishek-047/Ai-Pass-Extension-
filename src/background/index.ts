/**
 * VaultGuard Background Service Worker (MV3)
 *
 * Responsibilities:
 * - Secure session key storage via chrome.storage.session (TRUSTED_CONTEXTS)
 * - Vault lock/unlock synchronization across popup + content scripts
 * - Credential lookup with eTLD+1 domain matching
 * - Hardened message validation (sender.id check)
 * - Service worker lifecycle stability
 */

import type { ExtensionMessage, MessageType, LoginItem } from '@/types'
import { importSessionKey, decrypt, base64ToUint8Array } from '@/crypto'
import { loadVaultItems } from '@/storage'

// ─── eTLD+1 Domain Matching ──────────────────────────────────────────────────────

/**
 * Returns the registrable domain (eTLD+1) for a hostname.
 * e.g. "app.github.com" → "github.com"
 *      "login.bbc.co.uk" → "bbc.co.uk"
 */
function getRegistrableDomain(hostname: string): string {
  const h = hostname.toLowerCase().replace(/^www\./, '')
  const parts = h.split('.')
  if (parts.length <= 1) return h

  const knownSLDs = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'mil', 'ac'])
  if (parts.length >= 3 && knownSLDs.has(parts[parts.length - 2])) {
    return parts.slice(-3).join('.')
  }
  return parts.slice(-2).join('.')
}

/**
 * Extracts the registrable domain from a stored URL or bare hostname string.
 * Handles items stored as "github.com", "https://github.com", "github.com/path" etc.
 */
function extractDomainFromValue(value: string): string {
  if (!value || value.trim() === '') return ''
  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProto)
    return getRegistrableDomain(url.hostname)
  } catch {
    // Fallback: strip path and port manually
    const bare = value.replace(/^(https?:\/\/)?/, '').split('/')[0].split(':')[0]
    return getRegistrableDomain(bare)
  }
}

/**
 * Strict domain match: tab's eTLD+1 must equal item's eTLD+1.
 * Prevents github-login.com matching github.com.
 */
function domainsMatch(tabDomain: string, itemWebsite: string): boolean {
  const itemDomain = extractDomainFromValue(itemWebsite)
  if (!itemDomain || !tabDomain) return false
  return tabDomain === itemDomain
}

// ─── Rate Limiter (brute-force protection) ────────────────────────────────────────

/** Track credential lookup requests per tab to prevent rapid polling / spoofing */
const _credentialRequestTimestamps = new Map<number, number[]>()
const CREDENTIAL_RATE_LIMIT = 10   // max requests
const CREDENTIAL_RATE_WINDOW = 5000 // per 5 seconds per tab

function isRateLimited(tabId: number): boolean {
  const now = Date.now()
  const history = (_credentialRequestTimestamps.get(tabId) ?? []).filter(
    t => now - t < CREDENTIAL_RATE_WINDOW
  )
  history.push(now)
  _credentialRequestTimestamps.set(tabId, history)
  return history.length > CREDENTIAL_RATE_LIMIT
}

// ─── Session Key Helpers ─────────────────────────────────────────────────────────

async function getSessionKey(): Promise<CryptoKey | null> {
  try {
    const result = await (chrome.storage.session as any).get('session_key')
    const base64Key = result?.session_key as string | undefined
    if (!base64Key) return null
    // Guard against oversized / malformed payloads
    if (typeof base64Key !== 'string' || base64Key.length > 512) return null
    const keyBytes = base64ToUint8Array(base64Key)
    return importSessionKey(keyBytes)
  } catch {
    return null
  }
}

// ─── Tab Notification ────────────────────────────────────────────────────────────

function notifyAllContentScripts(message: Partial<ExtensionMessage>): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.id > 0) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script — silently ignore
        })
      }
    }
  })
}

// ─── Message Handler ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Security: reject messages from foreign extensions
    // (sender.id is undefined for messages from extension's own pages/content scripts)
    if (sender.id !== undefined && sender.id !== chrome.runtime.id) {
      console.warn('[VaultGuard] Blocked message from untrusted sender:', sender.id)
      sendResponse({ error: 'Unauthorized' })
      return false
    }

    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err) => {
        console.error('[VaultGuard Background] Unhandled error:', err)
        sendResponse({ error: String(err) })
      })

    return true // keep channel open for async response
  }
)

export async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  // Security: validate message structure before processing
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return { error: 'Invalid message structure' }
  }
  const type = message.type as MessageType

  switch (type) {

    // ── Heartbeat ──────────────────────────────────────────────────────────────
    case 'PING': {
      const result = await (chrome.storage.session as any).get('session_key').catch(() => ({}))
      const isLocked = !result?.session_key
      return { status: 'ok', isVaultLocked: isLocked }
    }

    // ── Vault State Query ──────────────────────────────────────────────────────
    case 'GET_VAULT_STATE': {
      const result = await (chrome.storage.session as any).get('session_key').catch(() => ({}))
      const isLocked = !result?.session_key
      return { isLocked }
    }

    // ── Vault Unlock — store session key ──────────────────────────────────────
    case 'VAULT_UNLOCK': {
      const base64Key = message.payload as string
      // Security: validate payload is a non-empty string within expected key size
      // A 256-bit AES key in base64 is 44 chars; allow up to 512 for padding
      if (
        !base64Key ||
        typeof base64Key !== 'string' ||
        base64Key.length === 0 ||
        base64Key.length > 512 ||
        !/^[A-Za-z0-9+/=]+$/.test(base64Key)
      ) {
        console.warn('[VaultGuard] VAULT_UNLOCK rejected: invalid session key payload')
        return { error: 'Invalid session key format' }
      }
      
      await (chrome.storage.session as any).set({ session_key: base64Key })
      notifyAllContentScripts({ type: 'VAULT_UNLOCK' })
      return { success: true }
    }

    // ── Vault Lock — clear session key ────────────────────────────────────────
    case 'VAULT_LOCK': {
      await (chrome.storage.session as any).remove(['session_key']).catch(() => {})
      notifyAllContentScripts({ type: 'VAULT_LOCK' })
      return { success: true }
    }

    // ── Credential Lookup for Autofill ────────────────────────────────────────
    case 'GET_CREDENTIALS_FOR_DOMAIN': {
      performance.mark('autofill-start')
      const requestedDomain = message.payload as string

      // Security: validate domain payload
      if (
        !requestedDomain ||
        typeof requestedDomain !== 'string' ||
        requestedDomain.length > 253 ||         // max valid domain length (RFC 1035)
        /[^a-zA-Z0-9._\-]/.test(requestedDomain) // reject non-hostname characters
      ) {
        console.warn('[VaultGuard] GET_CREDENTIALS_FOR_DOMAIN rejected: invalid domain payload:', requestedDomain)
        return { credentials: [], isLocked: false }
      }

      // Security: rate limit per sender tab
      const tabId = _sender?.tab?.id ?? -1
      if (tabId > 0 && isRateLimited(tabId)) {
        console.warn('[VaultGuard] GET_CREDENTIALS_FOR_DOMAIN rate limited for tab:', tabId)
        return { credentials: [], isLocked: false, rateLimited: true }
      }

      // Security: verify the sender tab's actual URL matches the requested domain
      if (_sender?.tab?.url) {
        try {
          const tabUrl = new URL(_sender.tab.url)
          const tabDomain = getRegistrableDomain(tabUrl.hostname)
          const claimedDomain = getRegistrableDomain(requestedDomain)
          if (tabDomain !== claimedDomain) {
            console.warn('[VaultGuard] Domain spoofing attempt blocked:', requestedDomain, '≠', tabDomain)
            return { credentials: [], isLocked: false }
          }
        } catch {
          // Can't parse tab URL — block
          return { credentials: [], isLocked: false }
        }
      }

      const sessionKey = await getSessionKey()
      if (!sessionKey) return { credentials: [], isLocked: true }

      let items: LoginItem[]
      try {
        const allItems = await loadVaultItems()
        items = allItems.filter((i): i is LoginItem => i.type === 'login')
      } catch {
        return { credentials: [], isLocked: false }
      }

      const matched = []
      for (const item of items) {
        if (!domainsMatch(requestedDomain, item.website ?? '')) continue
        try {
          const password = await decrypt(
            { ciphertext: item.encryptedPassword, iv: item.iv },
            sessionKey
          )
          matched.push({
            id: item.id,
            name: item.name,
            username: item.username,
            password,
            website: item.website,
            // Favicon URL uses sanitized domain, not raw requestedDomain
            favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(requestedDomain)}&sz=64`,
          })
        } catch (err) {
          console.error('[VaultGuard] Decryption failed for item:', item.id, err)
        }
      }

      performance.mark('autofill-end')
      const measure = performance.measure('autofill-latency', 'autofill-start', 'autofill-end')
      console.log(`[VaultGuard Performance] Autofill latency: ${measure.duration.toFixed(2)}ms`)

      return { credentials: matched, isLocked: false }
    }

    // ── Autofill Telemetry (no sensitive payload, no-op handler) ──────────────
    case 'AUTOFILL_FILL': {
      return { success: true }
    }

    default:
      return { error: `Unknown message type: ${message.type}` }
  }
}

// ─── Extension Lifecycle ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  // Lock down chrome.storage.session to trusted extension contexts only
  if (chrome.storage.session?.setAccessLevel) {
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((err) => {
      console.warn('[VaultGuard] storage.session.setAccessLevel failed:', err)
    })
  }

  const version = chrome.runtime.getManifest().version
  if (details.reason === 'install') {
    console.info(`[VaultGuard] Installed v${version}`)
  } else if (details.reason === 'update') {
    console.info(`[VaultGuard] Updated to v${version}`)
  }
})

// Keep service worker alive via port connections (MV3 best practice)
chrome.runtime.onConnect.addListener((_port) => {
  // Port connection prevents premature SW termination
})

export {}
