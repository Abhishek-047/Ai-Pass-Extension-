/**
 * VaultGuard — Main Vault Store (Zustand)
 *
 * Manages vault state, encryption key in memory,
 * and all CRUD operations on vault items.
 *
 * The encryption key lives ONLY in this store (memory).
 * On lock(), it is discarded. No key → no access to vault data.
 */
import { create } from 'zustand';
import { deriveKey, deriveNewKey, createVerifier, verifyMasterPassword, encrypt, decrypt, estimateEntropy } from '@/crypto';
import { loadVaultMeta, saveVaultMeta, loadVaultItems, saveVaultItems, loadSettings, saveSettings, wipeVault } from '@/storage';
import { nanoid } from '@/utils/nanoid';
// ─────────────────────────────────────────────
// In-memory key (never persisted)
// ─────────────────────────────────────────────
let _encryptionKey = null;
// Auto-lock timer
let _lockTimer = null;
// ─────────────────────────────────────────────
// Password Analysis (local, no AI API needed)
// ─────────────────────────────────────────────
function analyzePassword(password) {
    const entropy = estimateEntropy(password);
    const issues = [];
    const suggestions = [];
    if (password.length < 8)
        issues.push('Too short (minimum 8 characters)');
    if (password.length < 12)
        suggestions.push('Use at least 12 characters');
    if (!/[A-Z]/.test(password))
        issues.push('No uppercase letters');
    if (!/[a-z]/.test(password))
        issues.push('No lowercase letters');
    if (!/[0-9]/.test(password))
        issues.push('No numbers');
    if (!/[^a-zA-Z0-9]/.test(password))
        issues.push('No special characters');
    const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', 'admin', 'letmein'];
    if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
        issues.push('Contains common weak pattern');
    }
    if (/(.)\1{2,}/.test(password))
        issues.push('Has repeated characters');
    if (suggestions.length === 0 && issues.length === 0) {
        suggestions.push('Great password! Consider using a passphrase for memorability.');
    }
    let score = Math.min(100, Math.round(entropy * 1.5));
    score -= issues.length * 12;
    score = Math.max(0, score);
    const strength = score >= 80 ? 'very-strong' :
        score >= 60 ? 'strong' :
            score >= 40 ? 'fair' :
                score >= 20 ? 'weak' : 'very-weak';
    return { strength, score, issues, suggestions, entropy };
}
// ─────────────────────────────────────────────
// Health Report
// ─────────────────────────────────────────────
async function buildHealthReport(items, getDecrypted) {
    const loginItems = items.filter((i) => i.type === 'login');
    const passwordMap = new Map();
    const weakItems = [];
    for (const item of loginItems) {
        try {
            const pwd = await getDecrypted(item);
            const analysis = analyzePassword(pwd);
            if (analysis.score < 40)
                weakItems.push(item);
            // Group by password value to find reuse
            const existing = passwordMap.get(pwd) ?? [];
            existing.push(item);
            passwordMap.set(pwd, existing);
        }
        catch {
            // Can't decrypt — vault locked
        }
    }
    const reusedItems = [];
    for (const [, group] of passwordMap) {
        if (group.length > 1)
            reusedItems.push(...group);
    }
    const strongCount = loginItems.length - weakItems.length - reusedItems.filter(item => !weakItems.includes(item)).length;
    const score = loginItems.length === 0 ? 100 :
        Math.max(0, Math.round(100 - (weakItems.length / loginItems.length) * 40
            - (reusedItems.length / loginItems.length) * 35));
    return {
        securityScore: score,
        totalItems: items.length,
        strongPasswords: Math.max(0, strongCount),
        weakPasswords: weakItems.length,
        reusedPasswords: reusedItems.length,
        compromisedPatterns: 0,
        weakItems,
        reusedItems: [...new Set(reusedItems)],
    };
}
// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useVaultStore = create((set, get) => ({
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
    // ── Initialize ──
    initialize: async () => {
        const meta = await loadVaultMeta();
        const settings = await loadSettings();
        set({
            isSetup: !!meta,
            meta,
            settings,
            isLoading: false,
            currentPage: meta ? 'unlock' : 'setup',
        });
    },
    // ── Setup ──
    setupMasterPassword: async (password) => {
        try {
            const { key, salt } = await deriveNewKey(password);
            const verifierData = await createVerifier(key);
            const meta = {
                salt,
                verifier: verifierData.ciphertext,
                verifierIv: verifierData.iv,
                createdAt: Date.now(),
                version: 1,
            };
            await saveVaultMeta(meta);
            _encryptionKey = key;
            set({ isSetup: true, isLocked: false, meta, currentPage: 'dashboard', items: [] });
            get().addToast({ type: 'success', title: 'Vault created!', description: 'Your secure vault is ready.' });
            return true;
        }
        catch (err) {
            console.error('Setup failed:', err);
            return false;
        }
    },
    // ── Unlock ──
    unlock: async (password) => {
        const { meta } = get();
        if (!meta)
            return false;
        try {
            const key = await deriveKey(password, meta.salt);
            const verified = await verifyMasterPassword({ ciphertext: meta.verifier, iv: meta.verifierIv }, key);
            if (!verified) {
                get().addToast({ type: 'error', title: 'Wrong master password' });
                return false;
            }
            _encryptionKey = key;
            const items = await loadVaultItems();
            // Start auto-lock timer
            const settings = get().settings;
            if (settings && settings.autoLockMinutes > 0) {
                if (_lockTimer)
                    clearTimeout(_lockTimer);
                _lockTimer = setTimeout(() => {
                    get().lock();
                }, settings.autoLockMinutes * 60 * 1000);
            }
            set({ isLocked: false, items, currentPage: 'dashboard' });
            get().computeHealthReport();
            return true;
        }
        catch (err) {
            console.error('Unlock failed:', err);
            return false;
        }
    },
    // ── Lock ──
    lock: () => {
        _encryptionKey = null;
        if (_lockTimer) {
            clearTimeout(_lockTimer);
            _lockTimer = null;
        }
        set({ isLocked: true, items: [], currentPage: 'unlock', healthReport: null });
    },
    // ── Add Item ──
    addItem: async (itemData) => {
        if (!_encryptionKey)
            return;
        let newItem;
        if (itemData.type === 'login') {
            const loginData = itemData;
            const rawPassword = itemData.rawPassword ?? '';
            const encrypted = await encrypt(rawPassword, _encryptionKey);
            newItem = {
                ...loginData,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                encryptedPassword: encrypted.ciphertext,
                iv: encrypted.iv,
            };
        }
        else if (itemData.type === 'card') {
            const cardData = itemData;
            const encNum = await encrypt(cardData.rawNumber ?? '', _encryptionKey);
            const encCvv = await encrypt(cardData.rawCvv ?? '', _encryptionKey);
            newItem = {
                ...cardData,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                encryptedNumber: encNum.ciphertext,
                ivNumber: encNum.iv,
                encryptedCvv: encCvv.ciphertext,
                ivCvv: encCvv.iv,
            };
        }
        else if (itemData.type === 'note') {
            const noteData = itemData;
            const encContent = await encrypt(noteData.rawContent ?? '', _encryptionKey);
            newItem = {
                ...noteData,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                encryptedContent: encContent.ciphertext,
                ivContent: encContent.iv,
            };
        }
        else {
            newItem = {
                ...itemData,
                id: nanoid(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
        }
        const updated = [...get().items, newItem];
        await saveVaultItems(updated);
        set({ items: updated });
        get().computeHealthReport();
        get().addToast({ type: 'success', title: 'Item saved', description: `${newItem.name} added to vault.` });
    },
    // ── Update Item ──
    updateItem: async (id, updates) => {
        const items = get().items.map(item => item.id === id ? { ...item, ...updates, updatedAt: Date.now() } : item);
        await saveVaultItems(items);
        set({ items });
        get().computeHealthReport();
    },
    // ── Delete Item ──
    deleteItem: async (id) => {
        const items = get().items.filter(item => item.id !== id);
        await saveVaultItems(items);
        set({ items });
        get().computeHealthReport();
        get().addToast({ type: 'success', title: 'Item deleted' });
    },
    // ── Toggle Favorite ──
    toggleFavorite: async (id) => {
        const items = get().items.map(item => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item);
        await saveVaultItems(items);
        set({ items });
    },
    // ── Get Decrypted Password ──
    getDecryptedPassword: async (item) => {
        if (!_encryptionKey)
            throw new Error('Vault is locked');
        return decrypt({ ciphertext: item.encryptedPassword, iv: item.iv }, _encryptionKey);
    },
    // ── Navigation ──
    navigate: (page) => set({ currentPage: page }),
    // ── Search ──
    setSearchQuery: (q) => set({ searchQuery: q }),
    setActiveCategory: (cat) => set({ activeCategory: cat }),
    // ── Settings ──
    updateSettings: async (newSettings) => {
        await saveSettings(newSettings);
        const updated = { ...get().settings, ...newSettings };
        set({ settings: updated });
    },
    // ── Toast ──
    addToast: (toast) => {
        const id = nanoid();
        set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => get().removeToast(id), 4000);
    },
    removeToast: (id) => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
    // ── Health ──
    computeHealthReport: () => {
        const { items } = get();
        if (!_encryptionKey)
            return;
        buildHealthReport(items, (item) => get().getDecryptedPassword(item))
            .then(report => set({ healthReport: report }))
            .catch(() => { });
    },
    // ── Wipe ──
    wipeEverything: async () => {
        _encryptionKey = null;
        await wipeVault();
        set({ isLocked: true, isSetup: false, items: [], meta: null, currentPage: 'setup' });
    },
}));
