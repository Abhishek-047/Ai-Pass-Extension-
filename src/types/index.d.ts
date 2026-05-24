export type ItemType = 'login' | 'card' | 'note' | 'identity';
export type Category = 'social' | 'finance' | 'work' | 'email' | 'shopping' | 'entertainment' | 'crypto' | 'other';
export interface BaseVaultItem {
    id: string;
    type: ItemType;
    name: string;
    category: Category;
    favorite: boolean;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    notes?: string;
}
export interface LoginItem extends BaseVaultItem {
    type: 'login';
    website: string;
    username: string;
    encryptedPassword: string;
    iv: string;
    passwordStrength?: PasswordStrength;
    lastPasswordChange?: number;
}
export interface CardItem extends BaseVaultItem {
    type: 'card';
    cardholderName: string;
    encryptedNumber: string;
    ivNumber: string;
    expiryMonth: string;
    expiryYear: string;
    encryptedCvv: string;
    ivCvv: string;
    brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
}
export interface NoteItem extends BaseVaultItem {
    type: 'note';
    encryptedContent: string;
    ivContent: string;
}
export interface IdentityItem extends BaseVaultItem {
    type: 'identity';
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    company?: string;
}
export type VaultItem = LoginItem | CardItem | NoteItem | IdentityItem;
export interface VaultMeta {
    salt: string;
    verifier: string;
    verifierIv: string;
    createdAt: number;
    version: number;
}
export interface VaultState {
    isLocked: boolean;
    isSetup: boolean;
    items: VaultItem[];
    meta: VaultMeta | null;
}
export type PasswordStrength = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
export interface PasswordAnalysis {
    strength: PasswordStrength;
    score: number;
    issues: string[];
    suggestions: string[];
    entropy: number;
}
export interface VaultHealthReport {
    securityScore: number;
    totalItems: number;
    strongPasswords: number;
    weakPasswords: number;
    reusedPasswords: number;
    compromisedPatterns: number;
    weakItems: LoginItem[];
    reusedItems: LoginItem[];
}
export interface EncryptedData {
    ciphertext: string;
    iv: string;
}
export interface DerivedKeyResult {
    key: CryptoKey;
    salt: string;
}
export type MessageType = 'VAULT_LOCK' | 'VAULT_UNLOCK' | 'GET_VAULT_STATE' | 'AUTOFILL_CREDENTIALS' | 'SAVE_CREDENTIAL' | 'GET_CREDENTIALS_FOR_DOMAIN' | 'CLEAR_CLIPBOARD' | 'PING';
export interface ExtensionMessage<T = unknown> {
    type: MessageType;
    payload?: T;
}
export interface AutofillCredential {
    id: string;
    name: string;
    username: string;
    website: string;
    favicon?: string;
}
export interface CredentialsForDomain {
    domain: string;
    credentials: AutofillCredential[];
}
export interface GeneratedPassword {
    password: string;
    strength: PasswordStrength;
    score: number;
    readable: boolean;
    explanation: string;
}
export interface PasswordGeneratorConfig {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    memorable: boolean;
    context?: 'banking' | 'social' | 'work' | 'email' | 'general';
}
export interface DomainRiskResult {
    domain: string;
    isSuspicious: boolean;
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
}
export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    generatedPassword?: GeneratedPassword;
}
export type Page = 'unlock' | 'setup' | 'dashboard' | 'all-items' | 'ai-assistant' | 'security-report' | 'settings';
export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
}
