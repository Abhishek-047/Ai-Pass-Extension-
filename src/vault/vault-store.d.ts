/**
 * VaultGuard — Main Vault Store (Zustand)
 *
 * Manages vault state, encryption key in memory,
 * and all CRUD operations on vault items.
 *
 * The encryption key lives ONLY in this store (memory).
 * On lock(), it is discarded. No key → no access to vault data.
 */
import type { VaultItem, VaultMeta, LoginItem, VaultHealthReport, Page, ToastMessage } from '@/types';
import type { StoredSettings } from '@/storage';
interface VaultStore {
    isLocked: boolean;
    isSetup: boolean;
    isLoading: boolean;
    currentPage: Page;
    items: VaultItem[];
    meta: VaultMeta | null;
    settings: StoredSettings | null;
    toasts: ToastMessage[];
    searchQuery: string;
    activeCategory: string | null;
    healthReport: VaultHealthReport | null;
    initialize: () => Promise<void>;
    setupMasterPassword: (password: string) => Promise<boolean>;
    unlock: (password: string) => Promise<boolean>;
    lock: () => void;
    addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateItem: (id: string, updates: Partial<VaultItem>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    getDecryptedPassword: (item: LoginItem) => Promise<string>;
    navigate: (page: Page) => void;
    setSearchQuery: (q: string) => void;
    setActiveCategory: (cat: string | null) => void;
    updateSettings: (settings: Partial<StoredSettings>) => Promise<void>;
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
    computeHealthReport: () => void;
    wipeEverything: () => Promise<void>;
}
export declare const useVaultStore: import("zustand").UseBoundStore<import("zustand").StoreApi<VaultStore>>;
export {};
