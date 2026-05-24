/**
 * VaultGuard Storage Layer
 *
 * Uses chrome.storage.local for encrypted vault data.
 * All data stored is encrypted — never plaintext.
 */
const STORAGE_KEYS = {
    VAULT_META: 'vaultguard_meta',
    VAULT_ITEMS: 'vaultguard_items',
    SETTINGS: 'vaultguard_settings',
};
const DEFAULT_SETTINGS = {
    autoLockMinutes: 5,
    clipboardClearSeconds: 15,
    autofillEnabled: true,
    showPasswordStrength: true,
    theme: 'dark',
};
// ─────────────────────────────────────────────
// Chrome Storage Wrapper
// ─────────────────────────────────────────────
function chromeGet(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key] ?? null);
        });
    });
}
function chromeSet(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            else {
                resolve();
            }
        });
    });
}
function chromeRemove(key) {
    return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => resolve());
    });
}
// ─────────────────────────────────────────────
// Vault Meta (salt, verifier, etc.)
// ─────────────────────────────────────────────
export async function loadVaultMeta() {
    return chromeGet(STORAGE_KEYS.VAULT_META);
}
export async function saveVaultMeta(meta) {
    await chromeSet(STORAGE_KEYS.VAULT_META, meta);
}
export async function clearVaultMeta() {
    await chromeRemove(STORAGE_KEYS.VAULT_META);
}
// ─────────────────────────────────────────────
// Vault Items (encrypted credentials)
// ─────────────────────────────────────────────
export async function loadVaultItems() {
    const items = await chromeGet(STORAGE_KEYS.VAULT_ITEMS);
    return items ?? [];
}
export async function saveVaultItems(items) {
    await chromeSet(STORAGE_KEYS.VAULT_ITEMS, items);
}
export async function clearVaultItems() {
    await chromeRemove(STORAGE_KEYS.VAULT_ITEMS);
}
// ─────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────
export async function loadSettings() {
    const settings = await chromeGet(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
}
export async function saveSettings(settings) {
    const current = await loadSettings();
    await chromeSet(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
}
// ─────────────────────────────────────────────
// Full vault wipe (nuclear option)
// ─────────────────────────────────────────────
export async function wipeVault() {
    await Promise.all([
        clearVaultMeta(),
        clearVaultItems(),
    ]);
}
