/**
 * VaultGuard Background Service Worker
 * 
 * Handles:
 * - Extension lifecycle events
 * - Message routing between popup and content scripts
 * - Auto-lock state management using chrome.storage.session
 * - Safe decryption and credential matching for Autofill
 */

import type { ExtensionMessage, MessageType, LoginItem } from '@/types'
import { importSessionKey, decrypt, base64ToUint8Array } from '@/crypto'
import { loadVaultItems } from '@/storage'

// ─────────────────────────────────────────────
// Domain Matching Helpers
// ─────────────────────────────────────────────

function getBaseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.')
  if (parts.length <= 2) return hostname
  
  const last2 = parts[parts.length - 2]
  const commonSecondLevelTlds = ['co', 'com', 'org', 'net', 'gov', 'edu', 'mil']
  
  if (commonSecondLevelTlds.includes(last2) && parts.length > 2) {
    return parts.slice(parts.length - 3).join('.')
  }
  return parts.slice(parts.length - 2).join('.')
}

function getDomainFromUrl(url: string): string {
  try {
    const cleanUrl = url.trim()
    if (!cleanUrl) return ''
    const withProtocol = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') 
      ? cleanUrl 
      : 'https://' + cleanUrl
    const u = new URL(withProtocol)
    return getBaseDomain(u.hostname)
  } catch {
    const hostname = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0]
    return getBaseDomain(hostname)
  }
}

// ─────────────────────────────────────────────
// Message Handler
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Validate sender origin to prevent external injection/spoofing
    if (sender.id && sender.id !== chrome.runtime.id) {
      console.warn('[VaultGuard Background] Blocked untrusted message from origin:', sender.id)
      return false
    }

    handleMessage(message).then(sendResponse).catch((err) => {
      console.error('[VaultGuard Background] Error:', err)
      sendResponse({ error: 'Background error', isLocked: true })
    })
    return true // Keep message channel open for async response
  }
)

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type as MessageType) {
    case 'PING': {
      const sessionResult = await (chrome.storage.session as any)?.get('session_key')
      const isLocked = !(sessionResult?.session_key as string | undefined)
      return { status: 'ok', isVaultLocked: isLocked }
    }

    case 'VAULT_UNLOCK': {
      const base64SessionKey = message.payload as string
      if (base64SessionKey && chrome.storage.session) {
        await chrome.storage.session.set({ session_key: base64SessionKey })
      }
      notifyAllTabs({ type: 'VAULT_UNLOCK' })
      return { success: true }
    }

    case 'VAULT_LOCK': {
      if (chrome.storage.session) {
        await chrome.storage.session.remove(['session_key'])
      }
      notifyAllTabs({ type: 'VAULT_LOCK' })
      return { success: true }
    }

    case 'GET_VAULT_STATE': {
      const sessionResult = await (chrome.storage.session as any)?.get('session_key')
      const isLocked = !(sessionResult?.session_key as string | undefined)
      return { isLocked }
    }

    case 'GET_CREDENTIALS_FOR_DOMAIN': {
      try {
        const domain = message.payload as string
        if (!domain) return { credentials: [], isLocked: true }

        const sessionResult = await (chrome.storage.session as any)?.get('session_key')
        const base64Key = sessionResult?.session_key as string | undefined
        if (!base64Key) {
          return { credentials: [], isLocked: true }
        }

        // Import the session key
        const keyBytes = base64ToUint8Array(base64Key)
        const cryptoKey = await importSessionKey(keyBytes)

        // Load all items
        const items = await loadVaultItems()
        const loginItems = items.filter((item): item is LoginItem => item.type === 'login')

        const matchedCredentials = []
        const baseTabDomain = getBaseDomain(domain)

        for (const item of loginItems) {
          const itemDomain = getDomainFromUrl(item.website)
          if (itemDomain && itemDomain === baseTabDomain) {
            try {
              // Decrypt the password
              const decryptedPassword = await decrypt(
                { ciphertext: item.encryptedPassword, iv: item.iv },
                cryptoKey
              )
              matchedCredentials.push({
                id: item.id,
                name: item.name,
                username: item.username,
                password: decryptedPassword,
                website: item.website,
                favicon: `https://www.google.com/s2/favicons?domain=${itemDomain}&sz=64`
              })
            } catch (decryptionError) {
              console.error('[VaultGuard Background] Failed to decrypt password for item:', item.name, decryptionError)
            }
          }
        }

        return { credentials: matchedCredentials, isLocked: false }
      } catch (err) {
        console.error('[VaultGuard Background] Error in GET_CREDENTIALS_FOR_DOMAIN:', err)
        return { credentials: [], isLocked: true }
      }
    }

    default:
      return { error: 'Unknown message type' }
  }
}

// ─────────────────────────────────────────────
// Notify all tabs
// ─────────────────────────────────────────────

function notifyAllTabs(message: Partial<ExtensionMessage>): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab might not have content script — ignore
        })
      }
    }
  })
}

// ─────────────────────────────────────────────
// Extension Install / Update
// ─────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  // Set storage.session access level to TRUSTED_CONTEXTS so only extension scripts can access it
  if (chrome.storage.session) {
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch((err) => {
      console.warn('[VaultGuard] Failed to set storage.session access level:', err)
    })
  }

  if (details.reason === 'install') {
    console.log('[VaultGuard] Extension installed successfully')
  } else if (details.reason === 'update') {
    console.log('[VaultGuard] Extension updated to', chrome.runtime.getManifest().version)
  }
})

// Keep service worker alive
chrome.runtime.onConnect.addListener((_port) => {
  // Connection made — service worker stays alive
})

export {}
