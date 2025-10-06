/**
 * FRONTEND VALIDATION UTILITIES
 * 
 * Provides real-time validation for forms before submission
 * - Field-level validation
 * - Form-level validation
 * - File upload validation
 * - User-friendly error messages
 */

// Field validation functions
export const fieldValidators = {
  // Text validation
  required: (value, fieldName = 'Field') => {
    if (!value || value.toString().trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  minLength: (value, min, fieldName = 'Field') => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },
  
  maxLength: (value, max, fieldName = 'Field') => {
    if (value && value.length > max) {
      return `${fieldName} must be ${max} characters or less`;
    }
    return null;
  },
  
  // Email validation
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  // Phone validation
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number (e.g., +1-555-123-4567)';
    }
    return null;
  },
  
  // Number validation
  number: (value, fieldName = 'Field') => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return `${fieldName} must be a number`;
    }
    return null;
  },
  
  min: (value, min, fieldName = 'Field') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num < min) {
      return `${fieldName} must be at least ${min}`;
    }
    return null;
  },
  
  max: (value, max, fieldName = 'Field') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num > max) {
      return `${fieldName} must be ${max} or less`;
    }
    return null;
  },
  
  positive: (value, fieldName = 'Field') => {
    if (!value) return null;
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return `${fieldName} must be positive`;
    }
    return null;
  },
  
  // Date validation
  date: (value, fieldName = 'Date') => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} must be a valid date`;
    }
    return null;
  },
  
  futureDate: (value, fieldName = 'Date') => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} must be a valid date`;
    }
    if (date <= new Date()) {
      return `${fieldName} must be in the future`;
    }
    return null;
  },
  
  pastDate: (value, fieldName = 'Date') => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} must be a valid date`;
    }
    if (date >= new Date()) {
      return `${fieldName} must be in the past`;
    }
    return null;
  },
  
  // Time validation
  time: (value, fieldName = 'Time') => {
    if (!value) return null;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      return `${fieldName} must be in HH:MM format (24-hour)`;
    }
    return null;
  },
  
  // Name validation
  name: (value, fieldName = 'Name') => {
    if (!value) return null;
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(value)) {
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }
    return null;
  },
  
  // URL validation
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },
  
  // Custom regex validation
  pattern: (value, regex, message) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  }
};

// Form validation class
export class FormValidator {
  constructor(formData, rules) {
    this.formData = formData;
    this.rules = rules;
    this.errors = {};
  }
  
  // Validate single field
  validateField(fieldName) {
    const value = this.formData[fieldName];
    const fieldRules = this.rules[fieldName] || [];
    
    for (const rule of fieldRules) {
      const error = rule(value, fieldName);
      if (error) {
        this.errors[fieldName] = error;
        return error;
      }
    }
    
    // Clear error if validation passes
    delete this.errors[fieldName];
    return null;
  }
  
  // Validate all fields
  validateAll() {
    this.errors = {};
    let isValid = true;
    
    for (const fieldName of Object.keys(this.rules)) {
      const error = this.validateField(fieldName);
      if (error) {
        isValid = false;
      }
    }
    
    return {
      isValid,
      errors: { ...this.errors }
    };
  }
  
  // Get error for specific field
  getError(fieldName) {
    return this.errors[fieldName] || null;
  }
  
  // Check if field has error
  hasError(fieldName) {
    return fieldName in this.errors;
  }
  
  // Clear all errors
  clearErrors() {
    this.errors = {};
  }
  
  // Clear error for specific field
  clearError(fieldName) {
    delete this.errors[fieldName];
  }
}

// File validation utilities
export const fileValidators = {
  // File size validation
  maxSize: (file, maxSizeMB) => {
    if (!file) return null;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be ${maxSizeMB}MB or less`;
    }
    return null;
  },
  
  // File type validation
  allowedTypes: (file, allowedTypes) => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) {
      return `File type must be one of: ${allowedTypes.join(', ')}`;
    }
    return null;
  },
  
  // File extension validation
  allowedExtensions: (file, allowedExtensions) => {
    if (!file) return null;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return `File extension must be one of: ${allowedExtensions.join(', ')}`;
    }
    return null;
  },
  
  // Image file validation
  image: (file) => {
    if (!file) return null;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    const typeError = fileValidators.allowedTypes(file, allowedTypes);
    if (typeError) return typeError;
    
    const extError = fileValidators.allowedExtensions(file, allowedExtensions);
    if (extError) return extError;
    
    return null;
  },
  
  // Excel file validation
  excel: (file) => {
    if (!file) return null;
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExtensions = ['xlsx', 'xls'];
    
    const typeError = fileValidators.allowedTypes(file, allowedTypes);
    if (typeError) return typeError;
    
    const extError = fileValidators.allowedExtensions(file, allowedExtensions);
    if (extError) return extError;
    
    return null;
  },
  
  // CSV file validation
  csv: (file) => {
    if (!file) return null;
    const allowedTypes = ['text/csv', 'application/csv'];
    const allowedExtensions = ['csv'];
    
    const typeError = fileValidators.allowedTypes(file, allowedTypes);
    if (typeError) return typeError;
    
    const extError = fileValidators.allowedExtensions(file, allowedExtensions);
    if (extError) return extError;
    
    return null;
  }
};

// Common validation rules for forms
export const commonRules = {
  // Employee form rules
  employee: {
    first_name: [
      (value) => fieldValidators.required(value, 'First name'),
      (value) => fieldValidators.name(value, 'First name'),
      (value) => fieldValidators.maxLength(value, 50, 'First name')
    ],
    last_name: [
      (value) => fieldValidators.required(value, 'Last name'),
      (value) => fieldValidators.name(value, 'Last name'),
      (value) => fieldValidators.maxLength(value, 50, 'Last name')
    ],
    email: [
      (value) => fieldValidators.required(value, 'Email'),
      (value) => fieldValidators.email(value),
      (value) => fieldValidators.maxLength(value, 100, 'Email')
    ],
    phone: [
      (value) => fieldValidators.phone(value)
    ],
    hire_date: [
      (value) => fieldValidators.required(value, 'Hire date'),
      (value) => fieldValidators.date(value, 'Hire date'),
      (value) => fieldValidators.pastDate(value, 'Hire date')
    ],
    hourly_rate: [
      (value) => fieldValidators.number(value, 'Hourly rate'),
      (value) => fieldValidators.min(value, 0, 'Hourly rate'),
      (value) => fieldValidators.max(value, 1000, 'Hourly rate')
    ]
  },
  
  // Time entry form rules
  timeEntry: {
    employee_id: [
      (value) => fieldValidators.required(value, 'Employee'),
      (value) => fieldValidators.number(value, 'Employee ID'),
      (value) => fieldValidators.positive(value, 'Employee ID')
    ],
    work_date: [
      (value) => fieldValidators.required(value, 'Work date'),
      (value) => fieldValidators.date(value, 'Work date'),
      (value) => fieldValidators.pastDate(value, 'Work date')
    ],
    start_time: [
      (value) => fieldValidators.required(value, 'Start time'),
      (value) => fieldValidators.time(value, 'Start time')
    ],
    end_time: [
      (value) => fieldValidators.required(value, 'End time'),
      (value) => fieldValidators.time(value, 'End time')
    ]
  },
  
  // Leave request form rules
  leaveRequest: {
    leave_type: [
      (value) => fieldValidators.required(value, 'Leave type')
    ],
    start_date: [
      (value) => fieldValidators.required(value, 'Start date'),
      (value) => fieldValidators.date(value, 'Start date'),
      (value) => fieldValidators.futureDate(value, 'Start date')
    ],
    end_date: [
      (value) => fieldValidators.required(value, 'End date'),
      (value) => fieldValidators.date(value, 'End date'),
      (value) => fieldValidators.futureDate(value, 'End date')
    ],
    reason: [
      (value) => fieldValidators.required(value, 'Reason'),
      (value) => fieldValidators.minLength(value, 10, 'Reason'),
      (value) => fieldValidators.maxLength(value, 500, 'Reason')
    ]
  }
};

// React hook for form validation
export const useFormValidation = (initialData, rules) => {
  const [formData, setFormData] = React.useState(initialData);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  
  const validator = new FormValidator(formData, rules);
  
  const validateField = (fieldName) => {
    const error = validator.validateField(fieldName);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    return error;
  };
  
  const validateAll = () => {
    const result = validator.validateAll();
    setErrors(result.errors);
    return result;
  };
  
  const setFieldValue = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };
  
  const setFieldTouched = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };
  
  const getFieldError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : null;
  };
  
  const isFieldValid = (fieldName) => {
    return !errors[fieldName];
  };
  
  const isFormValid = () => {
    return Object.keys(errors).length === 0;
  };
  
  return {
    formData,
    setFormData,
    errors,
    touched,
    validateField,
    validateAll,
    setFieldValue,
    setFieldTouched,
    getFieldError,
    isFieldValid,
    isFormValid
  };
};

export default {
  fieldValidators,
  FormValidator,
  fileValidators,
  commonRules,
  useFormValidation
};
