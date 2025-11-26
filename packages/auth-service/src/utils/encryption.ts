import crypto from 'crypto';

/**
 * Data encryption utilities for sensitive data at rest
 * Implements requirement 9.1, 9.2 - Data encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Ensure key is 32 bytes for AES-256
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted data in format: iv:tag:encrypted
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * @param encryptedData - Encrypted data in format: iv:tag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data for storage (one-way)
 * @param data - Data to hash
 * @returns Hashed data with salt
 */
export function hashData(data: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(data, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify hashed data
 * @param data - Plain data to verify
 * @param hashedData - Hashed data to compare against
 * @returns True if data matches
 */
export function verifyHashedData(data: string, hashedData: string): boolean {
  try {
    const parts = hashedData.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const salt = parts[0];
    const originalHash = parts[1];
    
    const hash = crypto.pbkdf2Sync(data, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
    
    return hash === originalHash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 * @param length - Length of token in bytes (default 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt JSON object
 * @param obj - Object to encrypt
 * @returns Encrypted string
 */
export function encryptObject(obj: any): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt JSON object
 * @param encryptedData - Encrypted string
 * @returns Decrypted object
 */
export function decryptObject(encryptedData: string): any {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
}

/**
 * Mask sensitive data for logging
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at start and end
 * @returns Masked string
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const masked = '*'.repeat(data.length - visibleChars * 2);
  
  return `${start}${masked}${end}`;
}
