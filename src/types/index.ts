// ============================================================
// VAULT TYPES — Core data models for VaultGuard
// ============================================================

export type ItemType = 'login' | 'card' | 'note' | 'identity'
export type Category =
  | 'social'
  | 'finance'
  | 'work'
  | 'email'
  | 'shopping'
  | 'entertainment'
  | 'crypto'
  | 'other'

export interface BaseVaultItem {
  id: string
  type: ItemType
  name: string
  category: Category
  favorite: boolean
  createdAt: number
  updatedAt: number
  tags: string[]
  notes?: string
}

export interface LoginItem extends BaseVaultItem {
  type: 'login'
  website: string
  username: string
  encryptedPassword: string
  iv: string
  passwordStrength?: PasswordStrength
  lastPasswordChange?: number
}

export interface CardItem extends BaseVaultItem {
  type: 'card'
  cardholderName: string
  encryptedNumber: string
  ivNumber: string
  expiryMonth: string
  expiryYear: string
  encryptedCvv: string
  ivCvv: string
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'
}

export interface NoteItem extends BaseVaultItem {
  type: 'note'
  encryptedContent: string
  ivContent: string
}

export interface IdentityItem extends BaseVaultItem {
  type: 'identity'
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  company?: string
}

export type VaultItem = LoginItem | CardItem | NoteItem | IdentityItem

// ============================================================
// VAULT STATE
// ============================================================

/** KDF algorithm tag — allows future Argon2id swap */
export type KDFAlgorithm = 'pbkdf2' | 'argon2id'

/** KDF parameters stored in vault meta */
export interface KDFParams {
  algorithm: KDFAlgorithm
  // PBKDF2 params
  iterations?: number
  hash?: string
  // Argon2id params (future)
  memoryCost?: number
  timeCost?: number
  parallelism?: number
}

export interface VaultMeta {
  salt: string          // base64 KDF salt
  verifier: string      // encrypted verifier (proves correct master password)
  verifierIv: string
  createdAt: number
  version: number
  kdf: KDFParams        // which algorithm was used to derive the vault key
}

export interface VaultState {
  isLocked: boolean
  isSetup: boolean
  items: VaultItem[]
  meta: VaultMeta | null
}

// ============================================================
// PASSWORD HEALTH
// ============================================================

export type PasswordStrength = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong'

export interface PasswordAnalysis {
  strength: PasswordStrength
  score: number // 0-100
  issues: string[]
  suggestions: string[]
  entropy: number
}

export interface VaultHealthReport {
  securityScore: number // 0-100
  totalItems: number
  strongPasswords: number
  weakPasswords: number
  reusedPasswords: number
  compromisedPatterns: number
  weakItems: LoginItem[]
  reusedItems: LoginItem[]
}

// ============================================================
// CRYPTO TYPES
// ============================================================

export interface EncryptedData {
  ciphertext: string // base64
  iv: string         // base64
}

export interface DerivedKeyResult {
  key: CryptoKey
  salt: string // base64
  kdf: KDFParams
}

// ============================================================
// EXTENSION MESSAGING
// ============================================================

export type MessageType =
  | 'VAULT_LOCK'
  | 'VAULT_UNLOCK'
  | 'GET_VAULT_STATE'
  | 'AUTOFILL_CREDENTIALS'
  | 'AUTOFILL_FILL'
  | 'SAVE_CREDENTIAL'
  | 'GET_CREDENTIALS_FOR_DOMAIN'
  | 'CLEAR_CLIPBOARD'
  | 'PING'

export interface ExtensionMessage<T = unknown> {
  type: MessageType
  payload?: T
  origin?: string
}

export interface AutofillCredential {
  id: string
  name: string
  username: string
  password?: string
  website: string
  favicon?: string
}

export interface CredentialsForDomain {
  domain: string
  credentials: AutofillCredential[]
}

// ============================================================
// AI TYPES
// ============================================================

export interface GeneratedPassword {
  password: string
  strength: PasswordStrength
  score: number
  readable: boolean
  explanation: string
}

export interface PasswordGeneratorConfig {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  memorable: boolean
  context?: 'banking' | 'social' | 'work' | 'email' | 'general'
}

export interface DomainRiskResult {
  domain: string
  isSuspicious: boolean
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  generatedPassword?: GeneratedPassword
}

// ============================================================
// UI TYPES
// ============================================================

export type Page =
  | 'unlock'
  | 'setup'
  | 'dashboard'
  | 'all-items'
  | 'ai-assistant'
  | 'security-report'
  | 'settings'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
}
