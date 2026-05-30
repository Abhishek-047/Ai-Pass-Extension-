/**
 * VaultGuard Content Script — Production-Grade Autofill Architecture
 * 
 * Responsibilities:
 * - Direct iframe protection and origin verification.
 * - Secure message passing with runtime origin validation.
 * - Visually stunning glassmorphic credentials bubble.
 * - Honeypot and fake/hidden form evasion.
 * - High-performance debounced MutationObserver.
 */

import type { AutofillCredential } from '@/types'

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

let autofillPopup: HTMLElement | null = null
let detectedFields: { email?: HTMLInputElement; password?: HTMLInputElement } = {}
let currentHostname = window.location.hostname
let currentDomain = getBaseDomain(currentHostname)
let isVaultLocked = true
let matchedCredentialsCount = 0

// ─────────────────────────────────────────────
// Security Helpers
// ─────────────────────────────────────────────

/**
 * Extracts eTLD+1 domain (e.g. app.twitter.com -> twitter.com)
 */
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

/**
 * Ensures script is not running in cross-origin or hidden iframe.
 */
function isFrameSecurityPassed(): boolean {
  try {
    // If top window is not accessible or we are inside an iframe, verify origin matches top origin
    if (window !== window.top) {
      if (window.top?.location.origin !== window.location.origin) {
        return false // Cross-origin iframe blocked
      }
    }
    return true
  } catch {
    return false // Mismatch throws security exception, block
  }
}

/**
 * Check if the input field is visible and not a honeypot field.
 */
function isFieldVisibleAndLegit(el: HTMLInputElement): boolean {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  
  // Basic visibility check
  const isVisible = (
    rect.width > 2 &&
    rect.height > 2 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    parseFloat(style.opacity || '1') > 0.1
  )
  if (!isVisible) return false

  // Honeypot check: fields positioned off-screen or having hidden styling
  const isOffscreen = (
    rect.left < -100 || 
    rect.top < -100 || 
    rect.left > window.innerWidth + 100 || 
    rect.top > window.innerHeight + 100
  )
  if (isOffscreen) return false

  // Check common honeypot styling
  const name = (el.name + el.id + el.className).toLowerCase()
  const isHoneypotName = name.includes('honeypot') || name.includes('fake_') || name.includes('trap')
  if (isHoneypotName) return false

  return true
}

// ─────────────────────────────────────────────
// Message Listener from Background
// ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender is our extension background worker
  if (sender.id && sender.id !== chrome.runtime.id) {
    console.warn('[VaultGuard] Blocked message from untrusted sender ID:', sender.id)
    return false
  }

  if (message.type === 'VAULT_LOCK') {
    isVaultLocked = true
    removeAutofillPopup()
  } else if (message.type === 'VAULT_UNLOCK') {
    isVaultLocked = false
    debouncedDetectLoginForm()
  } else if (message.type === 'AUTOFILL_CREDENTIALS') {
    performAutofill(message.payload as AutofillCredential)
  }
  
  sendResponse({ ok: true })
  return true
})

// ─────────────────────────────────────────────
// Form Detection
// ─────────────────────────────────────────────

function isPasswordField(el: HTMLInputElement): boolean {
  if (!isFieldVisibleAndLegit(el)) return false
  const type = el.type.toLowerCase()
  const attr = (el.name + el.id + el.placeholder + el.autocomplete + el.className).toLowerCase()
  return type === 'password' || attr.includes('password') || attr.includes('passcode')
}

function isEmailUsernameField(el: HTMLInputElement, allInputs: HTMLInputElement[]): boolean {
  if (!isFieldVisibleAndLegit(el)) return false
  
  const type = el.type.toLowerCase()
  if (type === 'password' || type === 'checkbox' || type === 'radio' || type === 'submit' || type === 'button' || type === 'file') {
    return false
  }

  const attr = (el.name + el.id + el.placeholder + el.autocomplete + el.getAttribute('aria-label') + el.className).toLowerCase()
  
  // Strong signals
  if (type === 'email' || attr.includes('email') || attr.includes('username') || attr.includes('login') || attr.includes('user_id') || attr.includes('userid')) {
    return true
  }

  // Weak signals
  const isTextLike = type === 'text' || type === 'tel'
  const hasWeakKeyword = attr.includes('user') || attr.includes('phone') || attr.includes('id') || attr.includes('acc')
  
  if (isTextLike && hasWeakKeyword) {
    return true
  }

  // Sibling heuristic: If it is a text field and the very next input field is a password field in the DOM
  if (isTextLike) {
    const index = allInputs.indexOf(el)
    if (index !== -1 && index < allInputs.length - 1) {
      const nextEl = allInputs[index + 1]
      if (nextEl && nextEl.type === 'password' && isFieldVisibleAndLegit(nextEl)) {
        return true
      }
    }
  }

  return false
}

function detectLoginForm(): void {
  if (!isFrameSecurityPassed()) return

  const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
  const passwordFields = inputs.filter(isPasswordField)
  const emailFields = inputs.filter((el) => isEmailUsernameField(el, inputs))

  if (passwordFields.length === 0) return

  detectedFields = {
    email: emailFields[0],
    password: passwordFields[0],
  }

  const showPopup = () => {
    if (!isVaultLocked) {
      showAutofillPopup()
    }
  }

  // Setup focus triggers
  detectedFields.email?.addEventListener('focus', showPopup, { once: false })
  detectedFields.password?.addEventListener('focus', showPopup, { once: false })
}

let detectTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedDetectLoginForm(): void {
  if (detectTimeout) clearTimeout(detectTimeout)
  detectTimeout = setTimeout(() => {
    detectLoginForm()
  }, 200)
}

// ─────────────────────────────────────────────
// Autofill Popup UI
// ─────────────────────────────────────────────

function showAutofillPopup(): void {
  if (autofillPopup) return // Already active

  // Origin protection
  if (window.location.origin !== window.origin) return

  // Query background for credentials matching domain
  chrome.runtime.sendMessage(
    { type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: currentDomain },
    (response) => {
      if (chrome.runtime.lastError) return
      if (response?.isLocked) {
        isVaultLocked = true
        return
      }

      const credentials = response?.credentials || []
      matchedCredentialsCount = credentials.length

      if (matchedCredentialsCount > 0) {
        createAutofillBubble(credentials[0])
      }
    }
  )
}

function createAutofillBubble(credential: AutofillCredential): void {
  if (autofillPopup) return

  const bubble = document.createElement('div')
  bubble.id = 'vaultguard-autofill-bubble'
  bubble.setAttribute('data-vaultguard', 'true')

  const faviconUrl = credential.favicon || `https://www.google.com/s2/favicons?domain=${currentDomain}&sz=64`

  bubble.innerHTML = `
    <style>
      #vaultguard-autofill-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(10, 10, 16, 0.85);
        border: 1px solid rgba(139, 92, 246, 0.4);
        border-radius: 14px;
        padding: 12px 16px;
        z-index: 2147483647;
        font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 12px 40px rgba(124, 58, 237, 0.2), 
          0 0 100px rgba(124, 58, 237, 0.05);
        backdrop-filter: blur(24px) saturate(180%);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        animation: vg-slide-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        max-width: 320px;
        user-select: none;
      }
      #vaultguard-autofill-bubble:hover {
        border-color: rgba(139, 92, 246, 0.8);
        transform: translateY(-3px) scale(1.02);
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 16px 48px rgba(124, 58, 237, 0.3);
      }
      #vaultguard-autofill-bubble .vg-icon {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(79, 70, 229, 0.25));
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      #vaultguard-autofill-bubble .vg-icon img {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        object-fit: cover;
      }
      #vaultguard-autofill-bubble .vg-text {
        flex: 1;
        min-width: 0;
      }
      #vaultguard-autofill-bubble .vg-title {
        color: #f1f5f9;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.2px;
      }
      #vaultguard-autofill-bubble .vg-sub {
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.3;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #vaultguard-autofill-bubble .vg-badge {
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.4);
        border-radius: 6px;
        color: #c084fc;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        margin-left: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #vaultguard-autofill-bubble .vg-close {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-size: 14px;
        flex-shrink: 0;
        border-radius: 6px;
        transition: all 0.2s;
      }
      #vaultguard-autofill-bubble .vg-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #f1f5f9;
      }
      @keyframes vg-slide-in {
        from { transform: translateY(30px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
    </style>
    <div class="vg-icon">
      <img src="${faviconUrl}" alt="logo" onError="this.src='https://www.google.com/s2/favicons?domain=example.com'"/>
    </div>
    <div class="vg-text">
      <div style="display: flex; align-items: center;">
        <div class="vg-title">VaultGuard</div>
        <span class="vg-badge">${matchedCredentialsCount} login${matchedCredentialsCount > 1 ? 's' : ''}</span>
      </div>
      <div class="vg-sub">Click to autofill: ${credential.username}</div>
    </div>
    <div class="vg-close" id="vg-close-btn">✕</div>
  `

  document.body.appendChild(bubble)
  autofillPopup = bubble

  // Close trigger
  document.getElementById('vg-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    removeAutofillPopup()
  })

  // Open extension overlay & perform autofill relay on bubble tap
  bubble.addEventListener('click', () => {
    performAutofill(credential)
  })

  // Auto disappear after 8 seconds
  setTimeout(removeAutofillPopup, 8000)
}

function removeAutofillPopup(): void {
  if (autofillPopup) {
    autofillPopup.style.opacity = '0'
    autofillPopup.style.transform = 'translateY(15px) scale(0.95)'
    const popupRef = autofillPopup
    autofillPopup = null
    setTimeout(() => {
      popupRef.remove()
    }, 250)
  }
}

// ─────────────────────────────────────────────
// Autofill Execution
// ─────────────────────────────────────────────

function performAutofill(credential: AutofillCredential): void {
  if (detectedFields.email && credential.username) {
    setInputValue(detectedFields.email, credential.username)
  }
  if (detectedFields.password && credential.password) {
    setInputValue(detectedFields.password, credential.password)
  }
  
  // Security note: We notify background we are filling.
  chrome.runtime.sendMessage({
    type: 'AUTOFILL_FILL',
    payload: {
      id: credential.id,
      name: credential.name,
      username: credential.username,
      website: credential.website
    }
  }).catch(() => {})
  
  removeAutofillPopup()
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value)
  } else {
    input.value = value
  }

  // React 16+ input value tracker bypass
  const tracker = (input as any)._valueTracker
  if (tracker) {
    tracker.setValue('')
  }

  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  input.dispatchEvent(new Event('blur', { bubbles: true }))
}

// ─────────────────────────────────────────────
// Initialization logic
// ─────────────────────────────────────────────

function init(): void {
  if (!isFrameSecurityPassed()) return

  // Query background for current lock status
  chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }, (response) => {
    if (chrome.runtime.lastError) return
    isVaultLocked = response?.isLocked ?? true
  })

  // Scan document instantly
  detectLoginForm()

  // Track dynamic changes (React / SPAs / Next.js routing)
  const observer = new MutationObserver(() => {
    debouncedDetectLoginForm()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Route scanner for SPAs
  let lastUrl = location.href
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      currentHostname = window.location.hostname
      currentDomain = getBaseDomain(currentHostname)
      detectedFields = {}
      removeAutofillPopup()
      setTimeout(detectLoginForm, 400)
    }
  }, 1000)
}

// Security Check & Entry point execution
if (isFrameSecurityPassed()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

export {}
