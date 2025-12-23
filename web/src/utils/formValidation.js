/**
 * Frontend Form Validation Utilities
 * Provides real-time validation for all forms
 */

// Email validation
export const validateEmail = (email) => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Phone validation
export const validatePhone = (phone) => {
  if (!phone) return null;
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// Date validation
export const validateDate = (date, options = {}) => {
  if (!date) return null;
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Please enter a valid date';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (options.notFuture && dateObj > today) {
    return 'Date cannot be in the future';
  }
  
  if (options.notPast && dateObj < today) {
    return 'Date cannot be in the past';
  }
  
  if (options.minAge) {
    const age = (today - dateObj) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < options.minAge) {
      return `Must be at least ${options.minAge} years old`;
    }
  }
  
  return null;
};

// Required field validation
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

// Number validation
export const validateNumber = (value, options = {}) => {
  if (value === '' || value === null || value === undefined) return null;
  
  const num = Number(value);
  if (isNaN(num)) {
    return 'Please enter a valid number';
  }
  
  if (options.min !== undefined && num < options.min) {
    return `Value must be at least ${options.min}`;
  }
  
  if (options.max !== undefined && num > options.max) {
    return `Value must be at most ${options.max}`;
  }
  
  if (options.integer && !Number.isInteger(num)) {
    return 'Value must be a whole number';
  }
  
  return null;
};

// Text length validation
export const validateLength = (value, options = {}) => {
  if (!value) return null;
  
  const length = value.length;
  
  if (options.min && length < options.min) {
    return `Must be at least ${options.min} characters`;
  }
  
  if (options.max && length > options.max) {
    return `Must be at most ${options.max} characters`;
  }
  
  return null;
};

// Date range validation
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return 'End date must be after start date';
  }
  
  return null;
};

// Hours validation (0-24)
export const validateHours = (hours) => {
  const error = validateNumber(hours, { min: 0, max: 24 });
  if (error) return error;
  
  return null;
};

// Amount validation (positive currency)
export const validateAmount = (amount, options = {}) => {
  const error = validateNumber(amount, { min: 0, max: options.max || 1000000 });
  if (error) return error;
  
  const num = Number(amount);
  if (num < 0) {
    return 'Amount must be positive';
  }
  
  // Check decimal places
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) {
    return 'Amount can have at most 2 decimal places';
  }
  
  return null;
};

// Compose multiple validators
export const compose = (...validators) => {
  return (value, ...args) => {
    for (const validator of validators) {
      const error = validator(value, ...args);
      if (error) return error;
    }
    return null;
  };
};

// Form-level validation
export const validateForm = (formData, rules) => {
  const errors = {};
  
  for (const [field, validators] of Object.entries(rules)) {
    const value = formData[field];
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Employee form validation rules
export const employeeValidationRules = {
  first_name: [
    (v) => validateRequired(v, 'First name'),
    (v) => validateLength(v, { min: 1, max: 50 })
  ],
  last_name: [
    (v) => validateRequired(v, 'Last name'),
    (v) => validateLength(v, { min: 1, max: 50 })
  ],
  work_email: [
    (v) => validateRequired(v, 'Work email'),
    validateEmail
  ],
  email: [validateEmail], // Optional personal email
  phone: [validatePhone], // Optional
  birth_date: [
    (v) => validateDate(v, { notFuture: true, minAge: 16 })
  ],
  hire_date: [
    (v) => validateRequired(v, 'Hire date'),
    (v) => validateDate(v, { notFuture: true })
  ],
  hourly_rate: [
    (v) => validateNumber(v, { min: 0, max: 1000 })
  ]
};

// Leave request validation rules
export const leaveRequestValidationRules = {
  leave_type: [
    (v) => validateRequired(v, 'Leave type')
  ],
  start_date: [
    (v) => validateRequired(v, 'Start date'),
    (v) => validateDate(v, { notPast: true })
  ],
  end_date: [
    (v) => validateRequired(v, 'End date'),
    (v) => validateDate(v, { notPast: true })
  ],
  reason: [
    (v) => validateLength(v, { max: 500 })
  ]
};

// Timecard validation rules
export const timecardValidationRules = {
  employee_id: [
    (v) => validateRequired(v, 'Employee')
  ],
  date: [
    (v) => validateRequired(v, 'Date'),
    (v) => validateDate(v, { notFuture: true })
  ],
  hours: [
    (v) => validateRequired(v, 'Hours'),
    validateHours
  ]
};

// Commission validation rules
export const commissionValidationRules = {
  employee_id: [
    (v) => validateRequired(v, 'Employee')
  ],
  amount: [
    (v) => validateRequired(v, 'Amount'),
    validateAmount
  ],
  period: [
    (v) => validateRequired(v, 'Period')
  ]
};

export default {
  validateEmail,
  validatePhone,
  validateDate,
  validateRequired,
  validateNumber,
  validateLength,
  validateDateRange,
  validateHours,
  validateAmount,
  compose,
  validateForm,
  employeeValidationRules,
  leaveRequestValidationRules,
  timecardValidationRules,
  commissionValidationRules
};

