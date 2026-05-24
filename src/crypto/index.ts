export { 
  deriveKey, 
  deriveNewKey, 
  encrypt, 
  decrypt, 
  createVerifier, 
  verifyMasterPassword,
  generateSalt,
  generateIV,
  estimateEntropy,
  arrayBufferToBase64,
  base64ToUint8Array,
  secureWipe,
  secureZero
} from './vault-crypto'
