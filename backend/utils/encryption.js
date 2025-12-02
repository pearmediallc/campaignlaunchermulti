/**
 * Encryption Utilities
 *
 * Provides token encryption/decryption using AES-256-GCM.
 * Used for securely storing Facebook access tokens and backup app tokens.
 */

const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

// Use BACKUP_APPS_ENCRYPTION_KEY for backup apps, fallback to ENCRYPTION_KEY
const getEncryptionKey = () => {
  const key = process.env.BACKUP_APPS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    console.warn('⚠️ No encryption key found in environment. Using default key (INSECURE!)');
    return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  }

  return Buffer.from(key, 'hex');
};

/**
 * Encrypt a token using AES-256-GCM
 * @param {string} token - The token to encrypt
 * @returns {string} JSON string containing encrypted data, IV, and auth tag
 */
function encryptToken(token) {
  if (!token) {
    throw new Error('Token is required for encryption');
  }

  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

/**
 * Decrypt an encrypted token
 * @param {string} encryptedData - JSON string containing encrypted data
 * @returns {string|null} Decrypted token or null if decryption fails
 */
function decryptToken(encryptedData) {
  if (!encryptedData) {
    console.error('No encrypted data provided for decryption');
    return null;
  }

  // If it's already a plain token (not encrypted), return it
  if (typeof encryptedData === 'string' && !encryptedData.startsWith('{')) {
    // This is a plain token, not encrypted JSON
    return encryptedData;
  }

  try {
    const encryptionKey = getEncryptionKey();
    const data = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      algorithm,
      encryptionKey,
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error.message);
    return null;
  }
}

/**
 * Check if a token is encrypted
 * @param {string} token - The token to check
 * @returns {boolean} True if token appears to be encrypted
 */
function isEncrypted(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(token);
    return parsed.encrypted && parsed.authTag && parsed.iv;
  } catch {
    return false;
  }
}

/**
 * Validate encryption key is properly configured
 * @returns {boolean} True if encryption key is valid
 */
function validateEncryptionKey() {
  const key = process.env.BACKUP_APPS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    console.error('❌ No encryption key configured in environment');
    return false;
  }

  if (key.length !== 64) {
    console.error('❌ Encryption key must be 64 characters (32 bytes in hex)');
    return false;
  }

  try {
    Buffer.from(key, 'hex');
    return true;
  } catch (error) {
    console.error('❌ Encryption key is not valid hex format');
    return false;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  isEncrypted,
  validateEncryptionKey
};
