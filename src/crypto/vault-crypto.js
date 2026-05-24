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
// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const ALGORITHM = 'AES-GCM';
const SALT_LENGTH = 32; // bytes
const IV_LENGTH = 12; // bytes — recommended for AES-GCM
// ─────────────────────────────────────────────
// Utilities: base64 ↔ Uint8Array
// ─────────────────────────────────────────────
export function arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
export function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
// ─────────────────────────────────────────────
// Random bytes
// ─────────────────────────────────────────────
export function generateRandomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}
export function generateSalt() {
    return arrayBufferToBase64(generateRandomBytes(SALT_LENGTH));
}
export function generateIV() {
    return generateRandomBytes(IV_LENGTH);
}
// ─────────────────────────────────────────────
// PBKDF2 Key Derivation
// ─────────────────────────────────────────────
/**
 * Derive an AES-GCM key from a master password using PBKDF2.
 * The salt should be stored alongside the encrypted vault.
 */
export async function deriveKey(masterPassword, saltBase64) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(masterPassword);
    const saltBytes = base64ToUint8Array(saltBase64);
    // Import raw password as key material
    const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, { name: 'PBKDF2' }, false, ['deriveKey']);
    // Derive the actual AES-GCM key
    return crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
    }, keyMaterial, { name: ALGORITHM, length: KEY_LENGTH }, false, // not extractable — key never leaves WebCrypto
    ['encrypt', 'decrypt']);
}
/**
 * Generate a new salt and derive key from master password.
 * Used during initial vault setup.
 */
export async function deriveNewKey(masterPassword) {
    const salt = generateSalt();
    const key = await deriveKey(masterPassword, salt);
    return { key, salt };
}
// ─────────────────────────────────────────────
// AES-GCM Encryption / Decryption
// ─────────────────────────────────────────────
/**
 * Encrypt a plaintext string with the derived key.
 * Returns base64-encoded ciphertext and IV.
 */
export async function encrypt(plaintext, key) {
    const iv = generateIV();
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const ciphertextBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintextBytes);
    return {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv),
    };
}
/**
 * Decrypt base64-encoded ciphertext using the derived key.
 * Throws if the key is wrong (authentication tag mismatch).
 */
export async function decrypt(data, key) {
    const iv = base64ToUint8Array(data.iv);
    const ciphertextBytes = base64ToUint8Array(data.ciphertext);
    const plaintextBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertextBytes);
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
}
// ─────────────────────────────────────────────
// Vault Verifier — Prove correct master password
// ─────────────────────────────────────────────
const VERIFIER_PLAINTEXT = 'VAULTGUARD_VERIFIED';
/**
 * Create an encrypted verifier to validate master password on unlock.
 * The verifier is stored in vault metadata.
 */
export async function createVerifier(key) {
    return encrypt(VERIFIER_PLAINTEXT, key);
}
/**
 * Check if the master password is correct by decrypting the verifier.
 */
export async function verifyMasterPassword(verifierData, key) {
    try {
        const plaintext = await decrypt(verifierData, key);
        return plaintext === VERIFIER_PLAINTEXT;
    }
    catch {
        return false;
    }
}
// ─────────────────────────────────────────────
// Secure Memory Utilities
// ─────────────────────────────────────────────
/**
 * Attempt to zero-fill a string reference.
 * Note: JS strings are immutable; this is best-effort.
 */
export function secureWipe(data) {
    for (let i = 0; i < data.length; i++) {
        data[i] = null;
    }
}
// ─────────────────────────────────────────────
// Password strength estimation (deterministic)
// ─────────────────────────────────────────────
export function estimateEntropy(password) {
    let charsetSize = 0;
    if (/[a-z]/.test(password))
        charsetSize += 26;
    if (/[A-Z]/.test(password))
        charsetSize += 26;
    if (/[0-9]/.test(password))
        charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password))
        charsetSize += 32;
    return charsetSize > 0 ? Math.log2(charsetSize) * password.length : 0;
}
