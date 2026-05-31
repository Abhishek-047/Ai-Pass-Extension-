/**
 * VaultGuard Content Script — Production Autofill Engine
 *
 * Features:
 * - eTLD+1 domain matching
 * - Cross-origin iframe protection
 * - Honeypot / hidden field detection
 * - React, Vue, Angular, Next.js compatible injection
 * - SPA route change tracking
 * - Debounced MutationObserver for dynamic forms
 * - Autofill bubble with credential selection
 * - Race condition safe: no duplicate injection
 */

import type { AutofillCredential } from '@/types'

// ─── State ─────────────────────────────────────────────────────────────────────

let autofillBubble: HTMLElement | null = null
let lastDetectedEmail: HTMLInputElement | null = null
let lastDetectedPassword: HTMLInputElement | null = null
let currentDomain = getBaseDomain(window.location.hostname)
let isVaultLocked = true                // optimistic — updated async on init
let focusListenersAttached = false      // prevent duplicate listeners
let detectTimeout: ReturnType<typeof setTimeout> | null = null
let lastFormSignature = ''              // prevent re-processing same DOM state
let initialized = false

// ─── Domain Helpers ─────────────────────────────────────────────────────────────

function getBaseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/^www\./, '').split('.')
  if (parts.length <= 1) return hostname
  // Handle common ccSLD patterns like co.uk, com.au, org.uk
  const knownSLDs = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'mil', 'ac'])
  if (parts.length >= 3 && knownSLDs.has(parts[parts.length - 2])) {
    return parts.slice(-3).join('.')
  }
  return parts.slice(-2).join('.')
}

// ─── Security Guards ────────────────────────────────────────────────────────────

function isInsideCrossOriginIframe(): boolean {
  try {
    if (window === window.top) return false
    // Same-origin iframes are fine; cross-origin throws
    void window.top?.location.href
    return false
  } catch {
    return true // cross-origin iframe — block
  }
}

function isFieldVisible(el: HTMLInputElement): boolean {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)

  if (rect.width < 3 || rect.height < 3) return false
  if (style.display === 'none') return false
  if (style.visibility === 'hidden') return false
  if (parseFloat(style.opacity ?? '1') < 0.05) return false

  // Off-screen honeypot detection
  if (rect.left < -300 || rect.top < -300) return false
  if (rect.left > window.innerWidth + 300) return false
  if (rect.top > window.innerHeight + 300) return false

  // Attribute-based honeypot detection
  const attrs = [el.name, el.id, el.className].join(' ').toLowerCase()
  if (/honeypot|hp_|trap|bot_|fake_|hidden_field|ohnohoney|gotcha/.test(attrs)) return false

  return true
}

// ─── Field Detection ─────────────────────────────────────────────────────────────

function scorePasswordField(el: HTMLInputElement): number {
  if (!isFieldVisible(el)) return 0
  const type = el.type.toLowerCase()
  if (type === 'password') return 100
  const attrs = [el.name, el.id, el.placeholder, el.autocomplete, el.getAttribute('aria-label') ?? ''].join(' ').toLowerCase()
  if (attrs.includes('password') || attrs.includes('passcode') || attrs.includes('passwd')) return 80
  return 0
}

function scoreUsernameField(el: HTMLInputElement, allVisibleInputs: HTMLInputElement[]): number {
  if (!isFieldVisible(el)) return 0
  const type = el.type.toLowerCase()

  // Hard exclusions
  if (['password', 'checkbox', 'radio', 'submit', 'button', 'file', 'image', 'range', 'color', 'hidden'].includes(type)) return 0

  const attrs = [
    el.name, el.id, el.placeholder,
    el.autocomplete, el.getAttribute('aria-label') ?? '',
    el.getAttribute('aria-describedby') ?? '',
    el.getAttribute('data-testid') ?? '',
  ].join(' ').toLowerCase()

  // High confidence
  if (type === 'email' || el.autocomplete === 'email' || el.autocomplete === 'username') return 100
  if (/\b(email|e-mail|username|user.?name|login|user_id|userid|account)\b/.test(attrs)) return 90
  if (/\b(phone|mobile|tel)\b/.test(attrs) && type === 'tel') return 60

  // Label-based detection
  const labelEl = el.labels?.[0] ?? document.querySelector(`label[for="${el.id}"]`)
  if (labelEl) {
    const labelText = labelEl.textContent?.toLowerCase() ?? ''
    if (/email|username|user name|log.?in|sign.?in|account|identifier/.test(labelText)) return 85
  }

  // Sibling heuristic: text input immediately before a password field
  if (type === 'text' || type === 'tel') {
    const myIndex = allVisibleInputs.indexOf(el)
    if (myIndex !== -1) {
      for (let i = myIndex + 1; i < Math.min(myIndex + 4, allVisibleInputs.length); i++) {
        if (allVisibleInputs[i].type === 'password' && isFieldVisible(allVisibleInputs[i])) {
          return 70
        }
      }
    }
  }

  return 0
}

function detectLoginFields(): { email: HTMLInputElement | null; password: HTMLInputElement | null } {
  const allInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
  const visibleInputs = allInputs.filter(isFieldVisible)

  // Find the best password field
  let bestPassword: HTMLInputElement | null = null
  let bestPasswordScore = 0
  for (const el of visibleInputs) {
    const s = scorePasswordField(el)
    if (s > bestPasswordScore) { bestPasswordScore = s; bestPassword = el }
  }
  if (!bestPassword) return { email: null, password: null }

  // Find the best username/email field
  let bestEmail: HTMLInputElement | null = null
  let bestEmailScore = 0
  for (const el of visibleInputs) {
    const s = scoreUsernameField(el, visibleInputs)
    if (s > bestEmailScore) { bestEmailScore = s; bestEmail = el }
  }

  return { email: bestEmail, password: bestPassword }
}

// Generate a lightweight signature of the current form state to avoid redundant processing
function formSignature(): string {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"], input[type="email"], input[type="text"]'))
  return inputs.map(i => `${i.type}:${i.id}:${i.name}`).join('|')
}

// ─── Message Listener ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Block messages from other extensions
  if (sender.id && sender.id !== chrome.runtime.id) return false

  if (message.type === 'VAULT_LOCK') {
    isVaultLocked = true
    removeAutofillBubble()
    sendResponse({ ok: true })
  } else if (message.type === 'VAULT_UNLOCK') {
    isVaultLocked = false
    debouncedDetect()
    sendResponse({ ok: true })
  } else if (message.type === 'AUTOFILL_CREDENTIALS') {
    performAutofill(message.payload as AutofillCredential)
    sendResponse({ ok: true })
  } else {
    sendResponse({ ok: false })
  }

  return false
})

// ─── Autofill Bubble UI ──────────────────────────────────────────────────────────

function removeAutofillBubble(): void {
  if (autofillBubble) {
    autofillBubble.style.opacity = '0'
    autofillBubble.style.transform = 'translateY(12px) scale(0.96)'
    const ref = autofillBubble
    autofillBubble = null
    setTimeout(() => ref.remove(), 250)
  }
}

function showAutofillBubble(credentials: AutofillCredential[]): void {
  if (autofillBubble) return          // already visible
  if (credentials.length === 0) return

  const primary = credentials[0]
  const faviconUrl = primary.favicon || `https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64`

  const bubble = document.createElement('div')
  bubble.id = 'vaultguard-autofill-root'
  bubble.setAttribute('data-vaultguard', 'true')
  bubble.setAttribute('role', 'dialog')
  bubble.setAttribute('aria-label', 'VaultGuard Autofill')

  // Multi-credential items HTML
  const badgeHtml = credentials.length > 1
    ? `<span class="vg-badge">${credentials.length} logins</span>`
    : ''

  bubble.innerHTML = `
    <style>
      #vaultguard-autofill-root {
        all: initial;
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #f1f5f9;
      }
      #vaultguard-autofill-root * {
        box-sizing: border-box;
      }
      .vg-bubble {
        display: flex;
        flex-direction: column;
        background: rgba(10, 10, 20, 0.88);
        border: 1px solid rgba(139, 92, 246, 0.45);
        border-radius: 16px;
        padding: 12px 14px;
        width: 300px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08);
        backdrop-filter: blur(28px) saturate(180%);
        animation: vg-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        transition: opacity 0.2s, transform 0.2s;
        user-select: none;
      }
      .vg-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .vg-favicon {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: rgba(124,58,237,0.18);
        border: 1px solid rgba(139,92,246,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
      }
      .vg-favicon img { width: 18px; height: 18px; object-fit: contain; }
      .vg-title-row { flex: 1; min-width: 0; }
      .vg-name {
        font-weight: 800;
        font-size: 13px;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vg-badge {
        background: rgba(139,92,246,0.2);
        border: 1px solid rgba(139,92,246,0.35);
        border-radius: 5px;
        color: #c084fc;
        font-size: 9px;
        font-weight: 800;
        padding: 1px 5px;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        flex-shrink: 0;
      }
      .vg-sub {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .vg-close {
        width: 22px;
        height: 22px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: #64748b;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s;
        padding: 0;
      }
      .vg-close:hover { background: rgba(255,255,255,0.08); color: #f1f5f9; }
      .vg-credentials { display: flex; flex-direction: column; gap: 5px; }
      .vg-cred-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(139,92,246,0.12);
        background: rgba(124,58,237,0.05);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .vg-cred-item:hover {
        border-color: rgba(139,92,246,0.4);
        background: rgba(124,58,237,0.12);
        transform: translateY(-1px);
      }
      .vg-cred-user { font-weight: 700; font-size: 12px; color: #e2e8f0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vg-cred-name { font-size: 10px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .vg-fill-icon { font-size: 11px; color: #7c3aed; flex-shrink: 0; }
      .vg-powered {
        margin-top: 10px;
        text-align: center;
        font-size: 9.5px;
        color: #334155;
        letter-spacing: 0.3px;
        font-weight: 600;
      }
      @keyframes vg-in {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    </style>
    <div class="vg-bubble" id="vg-bubble-inner">
      <div class="vg-header">
        <div class="vg-favicon">
          <img src="${faviconUrl}" alt="" onerror="this.style.display='none'" />
        </div>
        <div class="vg-title-row">
          <div class="vg-name">VaultGuard ${badgeHtml}</div>
          <div class="vg-sub">Select an account to fill</div>
        </div>
        <button class="vg-close" id="vg-close-btn" title="Dismiss">✕</button>
      </div>
      <div class="vg-credentials" id="vg-creds-list">
        ${credentials.map((c, i) => `
          <div class="vg-cred-item" data-idx="${i}" tabindex="0" role="button" aria-label="Autofill as ${c.username}">
            <div style="flex:1;min-width:0">
              <div class="vg-cred-user">${escapeHtml(c.username)}</div>
              <div class="vg-cred-name">${escapeHtml(c.name)}</div>
            </div>
            <span class="vg-fill-icon">⌨</span>
          </div>
        `).join('')}
      </div>
      <div class="vg-powered">🛡 VaultGuard • AES-256-GCM • Zero Knowledge</div>
    </div>
  `

  document.documentElement.appendChild(bubble)
  autofillBubble = bubble

  // Close button
  bubble.querySelector('#vg-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    removeAutofillBubble()
  })

  // Credential items click
  bubble.querySelectorAll('.vg-cred-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt((el as HTMLElement).dataset.idx ?? '0', 10)
      const cred = credentials[idx]
      if (cred) performAutofill(cred)
    })
    el.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault()
        const idx = parseInt((el as HTMLElement).dataset.idx ?? '0', 10)
        const cred = credentials[idx]
        if (cred) performAutofill(cred)
      }
    })
  })

  // Auto-dismiss after 10s
  setTimeout(removeAutofillBubble, 10000)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Autofill Execution ──────────────────────────────────────────────────────────

/**
 * Framework-safe value injection.
 * Supports React 16+, Vue 3, Angular, Next.js, plain HTML.
 */
function setInputValue(input: HTMLInputElement, value: string): void {
  // Focus first (required by some frameworks)
  input.focus()

  // Use native property descriptor to bypass React's synthetic event system
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  if (nativeSetter) {
    nativeSetter.call(input, value)
  } else {
    input.value = value
  }

  // React 16: reset the internal value tracker so React sees the change
  const tracker = (input as unknown as { _valueTracker?: { setValue(v: string): void } })._valueTracker
  if (tracker) tracker.setValue('')

  // Dispatch full suite of events required by React, Vue, Angular
  input.dispatchEvent(new Event('focus', { bubbles: true }))
  input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))
}

function performAutofill(credential: AutofillCredential): void {
  removeAutofillBubble()

  // Re-detect in case DOM changed since last detection
  const { email: emailField, password: passwordField } = detectLoginFields()
  const finalEmail = emailField || lastDetectedEmail
  const finalPassword = passwordField || lastDetectedPassword

  let filled = false

  if (finalEmail && credential.username) {
    setInputValue(finalEmail, credential.username)
    filled = true
  }
  if (finalPassword && credential.password) {
    setInputValue(finalPassword, credential.password)
    filled = true
  }

  if (filled) {
    // Notify background (no sensitive data)
    chrome.runtime.sendMessage({
      type: 'AUTOFILL_FILL',
      payload: { id: credential.id, name: credential.name, website: credential.website }
    }).catch(() => {/* background might be restarting */})
  }
}

// ─── Detection + Credential Fetch ────────────────────────────────────────────────

function triggerBubble(): void {
  if (isVaultLocked) return
  if (autofillBubble) return // already shown

  chrome.runtime.sendMessage(
    { type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: currentDomain },
    (response) => {
      if (chrome.runtime.lastError) return
      if (response?.isLocked) {
        isVaultLocked = true
        return
      }

      const creds: AutofillCredential[] = response?.credentials ?? []

      if (creds.length > 0) {
        showAutofillBubble(creds)
      }
    }
  )
}

function debouncedDetect(): void {
  if (detectTimeout) clearTimeout(detectTimeout)
  detectTimeout = setTimeout(runDetection, 300)
}

function runDetection(): void {
  if (isInsideCrossOriginIframe()) return

  const sig = formSignature()
  if (sig === lastFormSignature && sig !== '') return // DOM unchanged
  lastFormSignature = sig

  const { email, password } = detectLoginFields()

  if (!password) {
    // No password field — remove bubble and detach listeners
    if (autofillBubble) removeAutofillBubble()
    focusListenersAttached = false
    lastDetectedEmail = null
    lastDetectedPassword = null
    return
  }

  // Store detected fields
  lastDetectedEmail = email
  lastDetectedPassword = password

  // Attach focus-triggered bubble (once per field set)
  if (!focusListenersAttached) {
    focusListenersAttached = true

    const onFocus = () => triggerBubble()

    email?.addEventListener('focus', onFocus)
    password.addEventListener('focus', onFocus)
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────────

function init(): void {
  if (initialized) return
  if (isInsideCrossOriginIframe()) return
  initialized = true

  // Query background for current vault lock state
  chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      isVaultLocked = true
      return
    }
    isVaultLocked = response?.isLocked ?? true
    // Run first detection after we know lock state
    runDetection()
  })

  // MutationObserver for dynamic forms (SPA, React rendering, lazy-loaded forms)
  const observer = new MutationObserver(() => {
    focusListenersAttached = false // reset so re-attachment can happen
    debouncedDetect()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  })

  // SPA route-change tracker via polling (covers history.pushState, replaceState, hash changes)
  let lastHref = location.href
  const routePoller = setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href
      currentDomain = getBaseDomain(window.location.hostname)
      // Reset state for new page
      lastDetectedEmail = null
      lastDetectedPassword = null
      lastFormSignature = ''
      focusListenersAttached = false
      removeAutofillBubble()
      // Give SPA time to render the new page's DOM
      setTimeout(runDetection, 600)
    }
  }, 1000)

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    clearInterval(routePoller)
    observer.disconnect()
  })
}

// ─── Entry Point ─────────────────────────────────────────────────────────────────

if (!isInsideCrossOriginIframe()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
}

export {}
