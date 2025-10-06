/**
 * COMPREHENSIVE DATA VALIDATION MIDDLEWARE
 * 
 * This middleware provides:
 * 1. Schema validation using Zod
 * 2. Type coercion (string "123" → number 123)
 * 3. Business logic validation
 * 4. File content validation
 * 5. Database constraint checking
 * 6. User-friendly error messages
 */

import { z } from 'zod';
import { q } from '../db.js';
import { validateData, sanitizeInput } from '../utils/dbValidation.js';

// Enhanced validation middleware factory
export function createValidationMiddleware(schema, options = {}) {
  return async (req, res, next) => {
    try {
      console.log(`🔍 [VALIDATION] Validating ${req.method} ${req.path}`);
      
      // 1. SANITIZE INPUT FIRST
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeInput(req.body);
      }
      
      // 2. TYPE COERCION
      const coercedData = coerceTypes(req.body, schema);
      
      // 3. SCHEMA VALIDATION
      const validation = validateData(schema, coercedData);
      
      if (!validation.success) {
        console.log('❌ [VALIDATION] Schema validation failed:', validation.errors);
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
          field: validation.errors[0]?.field
        });
      }
      
      // 4. BUSINESS LOGIC VALIDATION
      if (options.businessRules) {
        const businessValidation = await validateBusinessRules(validation.data, options.businessRules, req);
        if (!businessValidation.success) {
          console.log('❌ [VALIDATION] Business rules failed:', businessValidation.errors);
          return res.status(400).json({
            error: 'Business rule violation',
            details: businessValidation.errors
          });
        }
      }
      
      // 5. DATABASE CONSTRAINT VALIDATION
      if (options.dbConstraints) {
        const dbValidation = await validateDatabaseConstraints(validation.data, options.dbConstraints, req);
        if (!dbValidation.success) {
          console.log('❌ [VALIDATION] Database constraints failed:', dbValidation.errors);
          return res.status(400).json({
            error: 'Database constraint violation',
            details: dbValidation.errors
          });
        }
      }
      
      // 6. STORE VALIDATED DATA
      req.validatedData = validation.data;
      console.log('✅ [VALIDATION] All validations passed');
      next();
      
    } catch (error) {
      console.error('❌ [VALIDATION] Unexpected error:', error);
      res.status(500).json({ 
        error: 'Validation error', 
        details: error.message 
      });
    }
  };
}

// Type coercion helper
function coerceTypes(data, schema) {
  const coerced = { ...data };
  
  // Get schema shape for type coercion
  const shape = schema._def?.shape || {};
  
  for (const [key, value] of Object.entries(data)) {
    const fieldSchema = shape[key];
    if (!fieldSchema) continue;
    
    // Coerce based on Zod type
    if (fieldSchema._def?.typeName === 'ZodNumber') {
      if (typeof value === 'string' && !isNaN(value) && value !== '') {
        coerced[key] = Number(value);
      }
    } else if (fieldSchema._def?.typeName === 'ZodBoolean') {
      if (typeof value === 'string') {
        coerced[key] = value.toLowerCase() === 'true';
      }
    } else if (fieldSchema._def?.typeName === 'ZodDate') {
      if (typeof value === 'string' && value !== '') {
        coerced[key] = new Date(value);
      }
    }
  }
  
  return coerced;
}

// Business rules validation
async function validateBusinessRules(data, rules, req) {
  const errors = [];
  
  for (const rule of rules) {
    try {
      const result = await rule(data, req);
      if (!result.valid) {
        errors.push({
          field: result.field,
          message: result.message,
          code: result.code
        });
      }
    } catch (error) {
      errors.push({
        field: 'unknown',
        message: `Business rule error: ${error.message}`,
        code: 'BUSINESS_RULE_ERROR'
      });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

// Database constraints validation
async function validateDatabaseConstraints(data, constraints, req) {
  const errors = [];
  
  for (const constraint of constraints) {
    try {
      const result = await constraint(data, req);
      if (!result.valid) {
        errors.push({
          field: result.field,
          message: result.message,
          code: result.code
        });
      }
    } catch (error) {
      errors.push({
        field: 'unknown',
        message: `Database constraint error: ${error.message}`,
        code: 'DB_CONSTRAINT_ERROR'
      });
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

// File validation middleware
export function createFileValidationMiddleware(options = {}) {
  return (req, res, next) => {
    try {
      if (!req.file) {
        if (options.required) {
          return res.status(400).json({ error: 'File is required' });
        }
        return next();
      }
      
      const file = req.file;
      console.log(`📁 [FILE_VALIDATION] Validating file: ${file.originalname}`);
      
      // 1. File size validation
      if (options.maxSize && file.size > options.maxSize) {
        return res.status(400).json({
          error: 'File too large',
          details: `Maximum size: ${Math.round(options.maxSize / 1024 / 1024)}MB`
        });
      }
      
      // 2. File type validation
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          details: `Allowed types: ${options.allowedTypes.join(', ')}`
        });
      }
      
      // 3. File extension validation
      if (options.allowedExtensions) {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'Invalid file extension',
            details: `Allowed extensions: ${options.allowedExtensions.join(', ')}`
          });
        }
      }
      
      // 4. File content validation (for specific types)
      if (options.contentValidation) {
        const contentValidation = validateFileContent(file, options.contentValidation);
        if (!contentValidation.valid) {
          return res.status(400).json({
            error: 'Invalid file content',
            details: contentValidation.message
          });
        }
      }
      
      console.log('✅ [FILE_VALIDATION] File validation passed');
      next();
      
    } catch (error) {
      console.error('❌ [FILE_VALIDATION] Error:', error);
      res.status(500).json({ error: 'File validation error' });
    }
  };
}

// File content validation
function validateFileContent(file, validation) {
  try {
    // Excel file validation
    if (file.mimetype.includes('sheet')) {
      // Check if it's actually a valid Excel file
      const buffer = file.buffer;
      if (buffer.length < 4) {
        return { valid: false, message: 'File appears to be corrupted' };
      }
      
      // Check Excel file signature
      const signature = buffer.slice(0, 4);
      const excelSignatures = [
        [0x50, 0x4B, 0x03, 0x04], // ZIP-based (xlsx)
        [0xD0, 0xCF, 0x11, 0xE0], // OLE2 (xls)
      ];
      
      const isValidExcel = excelSignatures.some(sig => 
        sig.every((byte, i) => signature[i] === byte)
      );
      
      if (!isValidExcel) {
        return { valid: false, message: 'File is not a valid Excel file' };
      }
    }
    
    // CSV file validation
    if (file.mimetype === 'text/csv') {
      const content = file.buffer.toString('utf8');
      if (content.length === 0) {
        return { valid: false, message: 'CSV file is empty' };
      }
      
      // Check for basic CSV structure
      const lines = content.split('\n');
      if (lines.length < 2) {
        return { valid: false, message: 'CSV file must have at least a header and one data row' };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    return { valid: false, message: `File validation error: ${error.message}` };
  }
}

// Common business rules
export const businessRules = {
  // Employee rules
  hireDateBeforeTermination: (data) => ({
    valid: !data.termination_date || !data.hire_date || new Date(data.hire_date) < new Date(data.termination_date),
    field: 'hire_date',
    message: 'Hire date must be before termination date',
    code: 'HIRE_BEFORE_TERMINATION'
  }),
  
  // Time entry rules
  endTimeAfterStart: (data) => ({
    valid: !data.start_time || !data.end_time || new Date(`2000-01-01 ${data.start_time}`) < new Date(`2000-01-01 ${data.end_time}`),
    field: 'end_time',
    message: 'End time must be after start time',
    code: 'END_AFTER_START'
  }),
  
  // Leave request rules
  endDateAfterStart: (data) => ({
    valid: !data.start_date || !data.end_date || new Date(data.start_date) <= new Date(data.end_date),
    field: 'end_date',
    message: 'End date must be after or equal to start date',
    code: 'END_AFTER_START_DATE'
  }),
  
  // Future date validation
  notInFuture: (field) => (data) => ({
    valid: !data[field] || new Date(data[field]) <= new Date(),
    field,
    message: `${field} cannot be in the future`,
    code: 'FUTURE_DATE_NOT_ALLOWED'
  })
};

// Common database constraints
export const dbConstraints = {
  // Check if employee exists
  employeeExists: (data) => async (data, req) => {
    if (!data.employee_id) return { valid: true };
    
    const { rows } = await q('SELECT id FROM employees WHERE id = $1', [data.employee_id]);
    return {
      valid: rows.length > 0,
      field: 'employee_id',
      message: 'Employee not found',
      code: 'EMPLOYEE_NOT_FOUND'
    };
  },
  
  // Check if department exists
  departmentExists: (data) => async (data, req) => {
    if (!data.department_id) return { valid: true };
    
    const { rows } = await q('SELECT id FROM departments WHERE id = $1', [data.department_id]);
    return {
      valid: rows.length > 0,
      field: 'department_id',
      message: 'Department not found',
      code: 'DEPARTMENT_NOT_FOUND'
    };
  },
  
  // Check for duplicate email
  uniqueEmail: (data) => async (data, req) => {
    if (!data.email) return { valid: true };
    
    const { rows } = await q(
      'SELECT id FROM employees WHERE email = $1 AND id != COALESCE($2, 0)',
      [data.email, req.params?.id]
    );
    return {
      valid: rows.length === 0,
      field: 'email',
      message: 'Email already exists',
      code: 'EMAIL_EXISTS'
    };
  }
};

export default {
  createValidationMiddleware,
  createFileValidationMiddleware,
  businessRules,
  dbConstraints
};
