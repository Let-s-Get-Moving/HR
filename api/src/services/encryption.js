/**
 * Field-Level Encryption Service
 * AES-256-GCM encryption for sensitive PII data
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment or generate a default (should use env in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'hr-system-encryption-key-change-in-production-2024';

export class EncryptionService {
  /**
   * Derive encryption key from master key
   */
  static deriveKey(salt) {
    return crypto.pbkdf2Sync(
      ENCRYPTION_KEY,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Encrypted data as base64 string
   */
  static encrypt(plaintext) {
    if (!plaintext) return null;
    
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Derive key from master key and salt
      const key = this.deriveKey(salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data as base64 string
   * @returns {string} - Decrypted plaintext
   */
  static decrypt(encryptedData) {
    if (!encryptedData) return null;
    
    try {
      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.slice(0, SALT_LENGTH);
      const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      
      // Derive key
      const key = this.deriveKey(salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt SSN (Social Security Number)
   */
  static encryptSSN(ssn) {
    if (!ssn) return null;
    // Remove any formatting and encrypt
    const cleanSSN = ssn.replace(/[^0-9]/g, '');
    return this.encrypt(cleanSSN);
  }

  /**
   * Decrypt SSN and format
   */
  static decryptSSN(encryptedSSN) {
    if (!encryptedSSN) return null;
    const ssn = this.decrypt(encryptedSSN);
    if (!ssn) return null;
    // Format as XXX-XX-XXXX
    return `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}`;
  }

  /**
   * Encrypt bank account number
   */
  static encryptBankAccount(accountNumber) {
    if (!accountNumber) return null;
    // Remove any formatting and encrypt
    const cleanAccount = accountNumber.replace(/[^0-9]/g, '');
    return this.encrypt(cleanAccount);
  }

  /**
   * Decrypt bank account number
   */
  static decryptBankAccount(encryptedAccount) {
    if (!encryptedAccount) return null;
    return this.decrypt(encryptedAccount);
  }

  /**
   * Mask SSN for display (show last 4 digits)
   */
  static maskSSN(ssn) {
    if (!ssn) return null;
    const clean = ssn.replace(/[^0-9]/g, '');
    if (clean.length !== 9) return 'XXX-XX-XXXX';
    return `XXX-XX-${clean.slice(5)}`;
  }

  /**
   * Mask bank account (show last 4 digits)
   */
  static maskBankAccount(accountNumber) {
    if (!accountNumber) return null;
    const clean = accountNumber.replace(/[^0-9]/g, '');
    if (clean.length < 4) return '****';
    return '*'.repeat(clean.length - 4) + clean.slice(-4);
  }

  /**
   * Encrypt multiple fields in an object
   */
  static encryptFields(data, fields) {
    const encrypted = { ...data };
    
    for (const field of fields) {
      if (encrypted[field]) {
        if (field === 'ssn') {
          encrypted[field] = this.encryptSSN(encrypted[field]);
        } else if (field.includes('bank') || field.includes('account')) {
          encrypted[field] = this.encryptBankAccount(encrypted[field]);
        } else {
          encrypted[field] = this.encrypt(encrypted[field]);
        }
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt multiple fields in an object
   */
  static decryptFields(data, fields) {
    const decrypted = { ...data };
    
    for (const field of fields) {
      if (decrypted[field]) {
        if (field === 'ssn') {
          decrypted[field] = this.decryptSSN(decrypted[field]);
        } else if (field.includes('bank') || field.includes('account')) {
          decrypted[field] = this.decryptBankAccount(decrypted[field]);
        } else {
          decrypted[field] = this.decrypt(decrypted[field]);
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Hash sensitive data for searching (one-way)
   */
  static hashForSearch(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default EncryptionService;

