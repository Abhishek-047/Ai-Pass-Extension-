/**
 * VaultGuard Crypto Layer
 *
 * Implements AES-GCM encryption with PBKDF2 key derivation.
 * ALL crypto operations happen locally using the Web Crypto API.
 * Raw passwords are NEVER sent to any external service.
 *
 * Security Model:
 * - Master password → PBKDF2 (100k iterations) → AES-GCM key
 * - Each encrypted value uses a unique random IV
 * - Salt is randomly generated per vault setup
 * - Keys are only kept in memory while vault is unlocked
 */
import type { DerivedKeyResult, EncryptedData } from '@/types';
export declare function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string;
export declare function base64ToUint8Array(base64: string): Uint8Array;
export declare function generateRandomBytes(length: number): Uint8Array;
export declare function generateSalt(): string;
export declare function generateIV(): Uint8Array;
/**
 * Derive an AES-GCM key from a master password using PBKDF2.
 * The salt should be stored alongside the encrypted vault.
 */
export declare function deriveKey(masterPassword: string, saltBase64: string): Promise<CryptoKey>;
/**
 * Generate a new salt and derive key from master password.
 * Used during initial vault setup.
 */
export declare function deriveNewKey(masterPassword: string): Promise<DerivedKeyResult>;
/**
 * Encrypt a plaintext string with the derived key.
 * Returns base64-encoded ciphertext and IV.
 */
export declare function encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedData>;
/**
 * Decrypt base64-encoded ciphertext using the derived key.
 * Throws if the key is wrong (authentication tag mismatch).
 */
export declare function decrypt(data: EncryptedData, key: CryptoKey): Promise<string>;
/**
 * Create an encrypted verifier to validate master password on unlock.
 * The verifier is stored in vault metadata.
 */
export declare function createVerifier(key: CryptoKey): Promise<EncryptedData>;
/**
 * Check if the master password is correct by decrypting the verifier.
 */
export declare function verifyMasterPassword(verifierData: EncryptedData, key: CryptoKey): Promise<boolean>;
/**
 * Attempt to zero-fill a string reference.
 * Note: JS strings are immutable; this is best-effort.
 */
export declare function secureWipe(data: unknown[]): void;
export declare function estimateEntropy(password: string): number;
