import { ValidationResult, ValidationError } from '@/types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (supports various formats)
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export class Validator {
  private errors: ValidationError[] = [];

  // Required field validation
  required(value: any, fieldName: string, customMessage?: string): this {
    if (value === null || value === undefined || value === '') {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} is required`
      });
    }
    return this;
  }

  // Email validation
  email(value: string, fieldName: string = 'Email'): this {
    if (value && !EMAIL_REGEX.test(value)) {
      this.errors.push({
        field: fieldName,
        message: 'Please enter a valid email address'
      });
    }
    return this;
  }

  // Phone validation
  phone(value: string, fieldName: string = 'Phone'): this {
    if (value && !PHONE_REGEX.test(value.replace(/[\s\-\(\)]/g, ''))) {
      this.errors.push({
        field: fieldName,
        message: 'Please enter a valid phone number'
      });
    }
    return this;
  }

  // String length validation
  minLength(value: string, min: number, fieldName: string, customMessage?: string): this {
    if (value && value.length < min) {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} must be at least ${min} characters long`
      });
    }
    return this;
  }

  maxLength(value: string, max: number, fieldName: string, customMessage?: string): this {
    if (value && value.length > max) {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} must be no more than ${max} characters long`
      });
    }
    return this;
  }

  // Number validation
  min(value: number, min: number, fieldName: string, customMessage?: string): this {
    if (value !== null && value !== undefined && value < min) {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} must be at least ${min}`
      });
    }
    return this;
  }

  max(value: number, max: number, fieldName: string, customMessage?: string): this {
    if (value !== null && value !== undefined && value > max) {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} must be no more than ${max}`
      });
    }
    return this;
  }

  // Pattern validation
  pattern(value: string, regex: RegExp, fieldName: string, customMessage?: string): this {
    if (value && !regex.test(value)) {
      this.errors.push({
        field: fieldName,
        message: customMessage || `${fieldName} format is invalid`
      });
    }
    return this;
  }

  // Password strength validation
  password(value: string, fieldName: string = 'Password'): this {
    if (value) {
      if (value.length < PASSWORD_MIN_LENGTH) {
        this.errors.push({
          field: fieldName,
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
        });
      }
      
      if (!PASSWORD_REGEX.test(value)) {
        this.errors.push({
          field: fieldName,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }
    }
    return this;
  }

  // Date validation
  date(value: string, fieldName: string = 'Date'): this {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.errors.push({
          field: fieldName,
          message: 'Please enter a valid date'
        });
      }
    }
    return this;
  }

  // Custom validation
  custom(condition: boolean, fieldName: string, message: string): this {
    if (!condition) {
      this.errors.push({
        field: fieldName,
        message
      });
    }
    return this;
  }

  // Get validation result
  getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors]
    };
  }

  // Clear errors
  clear(): this {
    this.errors = [];
    return this;
  }
}

// Convenience functions for common validations
export const validateEmail = (email: string): ValidationResult => {
  return new Validator().email(email).getResult();
};

export const validatePassword = (password: string): ValidationResult => {
  return new Validator().password(password).getResult();
};

export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  return new Validator().required(value, fieldName).getResult();
};

// Form validation helper
export const validateForm = (data: Record<string, any>, rules: Record<string, (validator: Validator) => Validator>): ValidationResult => {
  const validator = new Validator();
  
  Object.entries(rules).forEach(([field, rule]) => {
    rule(validator);
  });
  
  return validator.getResult();
};

// Common validation rules
export const commonRules = {
  email: (value: string) => (validator: Validator) => validator.email(value),
  password: (value: string) => (validator: Validator) => validator.password(value),
  required: (value: any, fieldName: string) => (validator: Validator) => validator.required(value, fieldName),
  minLength: (value: string, min: number, fieldName: string) => (validator: Validator) => validator.minLength(value, min, fieldName),
  phone: (value: string) => (validator: Validator) => validator.phone(value),
  date: (value: string) => (validator: Validator) => validator.date(value)
};
