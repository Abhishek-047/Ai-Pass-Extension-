/**
 * VaultGuard Background Service Worker
 * 
 * Handles:
 * - Extension lifecycle events
 * - Message routing between popup and content scripts
 * - Auto-lock state management
 */

import type { ExtensionMessage, MessageType } from '@/types'

let isVaultLocked = true

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
      sendResponse({ error: 'Background error' })
    })
    return true // Keep message channel open for async response
  }
)

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type as MessageType) {
    case 'PING':
      return { status: 'ok', isVaultLocked }

    case 'VAULT_UNLOCK':
      isVaultLocked = false
      // Notify all content scripts
      notifyAllTabs({ type: 'VAULT_UNLOCK' })
      return { success: true }

    case 'VAULT_LOCK':
      isVaultLocked = true
      notifyAllTabs({ type: 'VAULT_LOCK' })
      return { success: true }

    case 'GET_VAULT_STATE':
      return { isLocked: isVaultLocked }

    case 'GET_CREDENTIALS_FOR_DOMAIN':
      // Content script will request credentials for current domain
      // We pass it to the popup if open
      return { domain: message.payload, isLocked: isVaultLocked }

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
