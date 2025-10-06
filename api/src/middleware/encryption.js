/**
 * Encryption Middleware
 * Automatically encrypts/decrypts sensitive fields
 */

import { EncryptionService } from '../services/encryption.js';
import { q } from '../db.js';

// Define which fields should be encrypted for each resource
const ENCRYPTED_FIELDS = {
  employees: ['ssn', 'bank_account', 'bank_routing']
};

/**
 * Middleware to encrypt sensitive fields before saving
 */
export const encryptSensitiveFields = (resource = 'employees') => {
  return (req, res, next) => {
    const fields = ENCRYPTED_FIELDS[resource] || [];
    
    if (req.body && fields.length > 0) {
      try {
        // Encrypt each sensitive field
        for (const field of fields) {
          if (req.body[field]) {
            if (field === 'ssn') {
              req.body.ssn_encrypted = EncryptionService.encryptSSN(req.body[field]);
              req.body.ssn_hash = EncryptionService.hashForSearch(req.body[field]);
              delete req.body[field]; // Remove plaintext
            } else if (field === 'bank_account') {
              req.body.bank_account_encrypted = EncryptionService.encryptBankAccount(req.body[field]);
              delete req.body[field];
            } else if (field === 'bank_routing') {
              req.body.bank_routing_encrypted = EncryptionService.encrypt(req.body[field]);
              delete req.body[field];
            }
          }
        }
        
        // Add encryption metadata
        req.body.pii_encrypted_at = new Date();
        req.body.pii_encryption_version = 'v1';
        
      } catch (error) {
        console.error('Encryption error:', error);
        return res.status(500).json({ error: 'Failed to encrypt sensitive data' });
      }
    }
    
    next();
  };
};

/**
 * Middleware to decrypt sensitive fields after retrieval
 */
export const decryptSensitiveFields = (resource = 'employees') => {
  return async (req, res, next) => {
    // Wrap res.json to decrypt before sending
    const originalJson = res.json.bind(res);
    
    res.json = async (data) => {
      try {
        // Decrypt single object or array
        if (Array.isArray(data)) {
          data = await Promise.all(data.map(item => decryptItem(item, resource, req.user?.id)));
        } else if (data && typeof data === 'object') {
          data = await decryptItem(data, resource, req.user?.id);
        }
        
        return originalJson(data);
      } catch (error) {
        console.error('Decryption error:', error);
        return originalJson(data); // Return without decryption on error
      }
    };
    
    next();
  };
};

/**
 * Decrypt individual item
 */
async function decryptItem(item, resource, userId) {
  if (!item || typeof item !== 'object') return item;
  
  const fields = ENCRYPTED_FIELDS[resource] || [];
  const decrypted = { ...item };
  
  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;
    
    if (decrypted[encryptedField]) {
      try {
        // Decrypt the field
        if (field === 'ssn') {
          decrypted[field] = EncryptionService.decryptSSN(decrypted[encryptedField]);
          
          // Log PII access
          if (userId && decrypted.id) {
            await logPIIAccess(userId, decrypted.id, 'ssn', 'view');
          }
        } else if (field === 'bank_account') {
          decrypted[field] = EncryptionService.decryptBankAccount(decrypted[encryptedField]);
          
          if (userId && decrypted.id) {
            await logPIIAccess(userId, decrypted.id, 'bank_account', 'view');
          }
        } else if (field === 'bank_routing') {
          decrypted[field] = EncryptionService.decrypt(decrypted[encryptedField]);
          
          if (userId && decrypted.id) {
            await logPIIAccess(userId, decrypted.id, 'bank_routing', 'view');
          }
        }
        
        // Remove encrypted field from response
        delete decrypted[encryptedField];
        delete decrypted.ssn_hash;
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error);
        // Keep encrypted field, don't expose plaintext on error
        decrypted[field] = '***ENCRYPTED***';
      }
    }
  }
  
  return decrypted;
}

/**
 * Log PII access for audit
 */
async function logPIIAccess(userId, employeeId, field, accessType = 'view') {
  try {
    await q(`
      INSERT INTO pii_access_log (user_id, employee_id, field_accessed, access_type)
      VALUES ($1, $2, $3, $4)
    `, [userId, employeeId, field, accessType]);
  } catch (error) {
    console.error('Failed to log PII access:', error);
  }
}

/**
 * Middleware to mask sensitive fields instead of decrypting
 */
export const maskSensitiveFields = (resource = 'employees') => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      try {
        if (Array.isArray(data)) {
          data = data.map(item => maskItem(item, resource));
        } else if (data && typeof data === 'object') {
          data = maskItem(data, resource);
        }
        
        return originalJson(data);
      } catch (error) {
        console.error('Masking error:', error);
        return originalJson(data);
      }
    };
    
    next();
  };
};

/**
 * Mask individual item
 */
function maskItem(item, resource) {
  if (!item || typeof item !== 'object') return item;
  
  const masked = { ...item };
  
  // Mask SSN
  if (masked.ssn) {
    masked.ssn = EncryptionService.maskSSN(masked.ssn);
  } else if (masked.ssn_encrypted) {
    masked.ssn = 'XXX-XX-XXXX';
    delete masked.ssn_encrypted;
  }
  
  // Mask bank account
  if (masked.bank_account) {
    masked.bank_account = EncryptionService.maskBankAccount(masked.bank_account);
  } else if (masked.bank_account_encrypted) {
    masked.bank_account = '****';
    delete masked.bank_account_encrypted;
  }
  
  // Remove hash fields
  delete masked.ssn_hash;
  
  return masked;
}

export default {
  encryptSensitiveFields,
  decryptSensitiveFields,
  maskSensitiveFields
};

