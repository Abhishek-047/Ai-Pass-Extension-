/**
 * VaultGuard Content Script
 *
 * Responsibilities:
 * - Detect login/signup forms on any page
 * - Inject autofill popup when credentials available
 * - Perform secure autofill on user confirmation
 * - Never access the vault directly — only relays requests
 */
// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let autofillPopup = null;
let detectedFields = {};
let currentDomain = window.location.hostname.replace('www.', '');
let isVaultLocked = true;
// ─────────────────────────────────────────────
// Message Listener from Background
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'VAULT_LOCK') {
        isVaultLocked = true;
        removeAutofillPopup();
    }
    if (message.type === 'VAULT_UNLOCK') {
        isVaultLocked = false;
    }
    if (message.type === 'AUTOFILL_CREDENTIALS') {
        performAutofill(message.payload);
    }
    sendResponse({ ok: true });
    return true;
});
// ─────────────────────────────────────────────
// Form Detection
// ─────────────────────────────────────────────
function isPasswordField(el) {
    return el.type === 'password';
}
function isEmailUsernameField(el) {
    const type = el.type.toLowerCase();
    const name = (el.name + el.id + el.placeholder + el.autocomplete).toLowerCase();
    return (type === 'email' ||
        type === 'text' &&
            (name.includes('email') || name.includes('user') || name.includes('login') || name.includes('username')));
}
function detectLoginForm() {
    const inputs = Array.from(document.querySelectorAll('input'));
    const passwordFields = inputs.filter(isPasswordField);
    const emailFields = inputs.filter(isEmailUsernameField);
    if (passwordFields.length === 0)
        return;
    detectedFields = {
        email: emailFields[0],
        password: passwordFields[0],
    };
    // Add focus listeners
    const showPopup = () => {
        if (!isVaultLocked) {
            showAutofillPopup();
        }
    };
    detectedFields.email?.addEventListener('focus', showPopup, { once: false });
    detectedFields.password?.addEventListener('focus', showPopup, { once: false });
}
// ─────────────────────────────────────────────
// Autofill Popup UI
// ─────────────────────────────────────────────
function showAutofillPopup() {
    if (autofillPopup)
        return; // Already showing
    // Request credentials from extension
    chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS_FOR_DOMAIN', payload: currentDomain }, (response) => {
        if (chrome.runtime.lastError)
            return;
        if (response?.isLocked)
            return;
        // Create a minimal popup — the real UI is in the extension popup
        createAutofillBubble();
    });
}
function createAutofillBubble() {
    if (autofillPopup)
        return;
    const bubble = document.createElement('div');
    bubble.id = 'vaultguard-autofill-bubble';
    bubble.setAttribute('data-vaultguard', 'true');
    bubble.innerHTML = `
    <style>
      #vaultguard-autofill-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid rgba(139, 92, 246, 0.4);
        border-radius: 16px;
        padding: 12px 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139,92,246,0.1);
        backdrop-filter: blur(20px);
        cursor: pointer;
        transition: all 0.2s ease;
        animation: vg-slide-in 0.3s ease;
        max-width: 280px;
      }
      #vaultguard-autofill-bubble:hover {
        border-color: rgba(139, 92, 246, 0.7);
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(139, 92, 246, 0.4);
      }
      #vaultguard-autofill-bubble .vg-icon {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }
      #vaultguard-autofill-bubble .vg-text {
        flex: 1;
      }
      #vaultguard-autofill-bubble .vg-title {
        color: #e2e8f0;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
      }
      #vaultguard-autofill-bubble .vg-sub {
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.3;
      }
      #vaultguard-autofill-bubble .vg-close {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        font-size: 16px;
        flex-shrink: 0;
        border-radius: 4px;
      }
      #vaultguard-autofill-bubble .vg-close:hover {
        background: rgba(255,255,255,0.1);
        color: #94a3b8;
      }
      @keyframes vg-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
    <div class="vg-icon">🔑</div>
    <div class="vg-text">
      <div class="vg-title">VaultGuard</div>
      <div class="vg-sub">Click extension icon to autofill</div>
    </div>
    <div class="vg-close" id="vg-close-btn">✕</div>
  `;
    document.body.appendChild(bubble);
    autofillPopup = bubble;
    // Close button
    document.getElementById('vg-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeAutofillPopup();
    });
    // Open extension popup on click
    bubble.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'PING' });
    });
    // Auto-remove after 6 seconds
    setTimeout(removeAutofillPopup, 6000);
}
function removeAutofillPopup() {
    if (autofillPopup) {
        autofillPopup.style.opacity = '0';
        autofillPopup.style.transform = 'translateY(10px)';
        setTimeout(() => {
            autofillPopup?.remove();
            autofillPopup = null;
        }, 200);
    }
}
// ─────────────────────────────────────────────
// Autofill Execution
// ─────────────────────────────────────────────
function performAutofill(credential) {
    if (detectedFields.email && credential.username) {
        setInputValue(detectedFields.email, credential.username);
    }
    // Password is NOT autofilled via message — user must open popup
    // This is a security design: passwords are only revealed in the extension popup
    removeAutofillPopup();
}
function setInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    else {
        input.value = value;
    }
}
// ─────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────
function init() {
    // Check vault lock state
    chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }, (response) => {
        if (chrome.runtime.lastError)
            return;
        isVaultLocked = response?.isLocked ?? true;
    });
    // Detect forms immediately
    detectLoginForm();
    // Re-detect on DOM mutations (SPAs)
    const observer = new MutationObserver(() => {
        detectLoginForm();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
    // Re-detect on URL change (SPAs)
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            currentDomain = window.location.hostname.replace('www.', '');
            detectedFields = {};
            removeAutofillPopup();
            setTimeout(detectLoginForm, 500);
        }
    }, 1000);
}
// Only run in top frame
if (window === window.top) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    else {
        init();
    }
}
export {};
