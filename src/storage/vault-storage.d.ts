/**
 * VaultGuard Storage Layer
 *
 * Uses chrome.storage.local for encrypted vault data.
 * All data stored is encrypted — never plaintext.
 */
import type { VaultItem, VaultMeta } from '@/types';
export interface StoredSettings {
    autoLockMinutes: number;
    clipboardClearSeconds: number;
    autofillEnabled: boolean;
    showPasswordStrength: boolean;
    theme: 'dark';
}
export declare function loadVaultMeta(): Promise<VaultMeta | null>;
export declare function saveVaultMeta(meta: VaultMeta): Promise<void>;
export declare function clearVaultMeta(): Promise<void>;
export declare function loadVaultItems(): Promise<VaultItem[]>;
export declare function saveVaultItems(items: VaultItem[]): Promise<void>;
export declare function clearVaultItems(): Promise<void>;
export declare function loadSettings(): Promise<StoredSettings>;
export declare function saveSettings(settings: Partial<StoredSettings>): Promise<void>;
export declare function wipeVault(): Promise<void>;
