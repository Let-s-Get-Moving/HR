/**
 * ENHANCED VALIDATION SCHEMAS
 * 
 * These schemas provide comprehensive validation with:
 * - Type coercion
 * - Business logic validation
 * - Database constraint checking
 * - User-friendly error messages
 */

import { z } from 'zod';

// Enhanced employee schema with comprehensive validation
export const enhancedEmployeeSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .regex(/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .regex(/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be 100 characters or less')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine(
      (phone) => !phone || /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/.test(phone),
      'Please enter a valid phone number (e.g., +1-555-123-4567)'
    ),
  
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say'])
    .optional(),
  
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 16 && age <= 100;
      },
      'Employee must be between 16 and 100 years old'
    )
    .optional(),
  
  hire_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be in YYYY-MM-DD format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Hire date cannot be in the future'
    ),
  
  termination_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Termination date must be in YYYY-MM-DD format')
    .optional(),
  
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract'], {
    errorMap: () => ({ message: 'Employment type must be Full-time, Part-time, or Contract' })
  }),
  
  department_id: z.number()
    .int('Department ID must be a whole number')
    .positive('Department ID must be positive')
    .optional(),
  
  location_id: z.number()
    .int('Location ID must be a whole number')
    .positive('Location ID must be positive')
    .optional(),
  
  role_title: z.string()
    .max(100, 'Role title must be 100 characters or less')
    .optional(),
  
  probation_end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Probation end date must be in YYYY-MM-DD format')
    .optional(),
  
  hourly_rate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(1000, 'Hourly rate seems unreasonably high')
    .optional(),
  
  status: z.enum(['Active', 'On Leave', 'Terminated'])
    .default('Active')
});

// Enhanced time entry schema
export const enhancedTimeEntrySchema = z.object({
  employee_id: z.number()
    .int('Employee ID must be a whole number')
    .positive('Employee ID must be positive'),
  
  work_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Work date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const workDate = new Date(date);
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        return workDate >= thirtyDaysAgo && workDate <= today;
      },
      'Work date must be within the last 30 days'
    ),
  
  start_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format (24-hour)'),
  
  end_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format (24-hour)'),
  
  break_duration: z.number()
    .min(0, 'Break duration cannot be negative')
    .max(480, 'Break duration cannot exceed 8 hours')
    .default(0),
  
  overtime_hours: z.number()
    .min(0, 'Overtime hours cannot be negative')
    .max(16, 'Overtime hours seem unreasonably high')
    .default(0),
  
  notes: z.string()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
});

// Enhanced leave request schema
export const enhancedLeaveRequestSchema = z.object({
  employee_id: z.number()
    .int('Employee ID must be a whole number')
    .positive('Employee ID must be positive'),
  
  leave_type: z.enum(['Vacation', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Bereavement', 'Other'], {
    errorMap: () => ({ message: 'Leave type must be one of: Vacation, Sick, Personal, Maternity, Paternity, Bereavement, Other' })
  }),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .refine(
      (date) => new Date(date) >= new Date(),
      'Start date cannot be in the past'
    ),
  
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .refine(
      (date) => new Date(date) >= new Date(),
      'End date cannot be in the past'
    ),
  
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be 500 characters or less'),
  
  emergency_contact: z.string()
    .max(100, 'Emergency contact must be 100 characters or less')
    .optional(),
  
  status: z.enum(['Pending', 'Approved', 'Denied'])
    .default('Pending')
});

// Enhanced payroll schema
export const enhancedPayrollSchema = z.object({
  employee_id: z.number()
    .int('Employee ID must be a whole number')
    .positive('Employee ID must be positive'),
  
  period_start: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Period start must be in YYYY-MM-DD format'),
  
  period_end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Period end must be in YYYY-MM-DD format'),
  
  gross_pay: z.number()
    .min(0, 'Gross pay cannot be negative')
    .max(100000, 'Gross pay seems unreasonably high'),
  
  deductions: z.number()
    .min(0, 'Deductions cannot be negative')
    .max(50000, 'Deductions seem unreasonably high')
    .default(0),
  
  net_pay: z.number()
    .min(0, 'Net pay cannot be negative')
    .max(100000, 'Net pay seems unreasonably high'),
  
  hours_worked: z.number()
    .min(0, 'Hours worked cannot be negative')
    .max(80, 'Hours worked cannot exceed 80 per period')
    .default(0),
  
  overtime_hours: z.number()
    .min(0, 'Overtime hours cannot be negative')
    .max(40, 'Overtime hours cannot exceed 40 per period')
    .default(0)
});

// File upload schemas
export const fileUploadSchemas = {
  excelFile: z.object({
    originalname: z.string().min(1, 'File name is required'),
    mimetype: z.string().refine(
      (type) => type.includes('sheet') || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'File must be an Excel file (.xlsx or .xls)'
    ),
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(10 * 1024 * 1024, 'File size cannot exceed 10MB')
  }),
  
  csvFile: z.object({
    originalname: z.string().min(1, 'File name is required'),
    mimetype: z.string().refine(
      (type) => type === 'text/csv' || type === 'application/csv',
      'File must be a CSV file'
    ),
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(5 * 1024 * 1024, 'File size cannot exceed 5MB')
  }),
  
  imageFile: z.object({
    originalname: z.string().min(1, 'File name is required'),
    mimetype: z.string().refine(
      (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
      'File must be an image (JPEG, PNG, GIF, or WebP)'
    ),
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(2 * 1024 * 1024, 'Image size cannot exceed 2MB')
  })
};

// Settings validation schemas
export const settingsSchemas = {
  security: z.object({
    two_factor_auth: z.boolean(),
    session_timeout: z.number()
      .int('Session timeout must be a whole number')
      .min(5, 'Session timeout must be at least 5 minutes')
      .max(1440, 'Session timeout cannot exceed 24 hours'),
    password_requirements: z.enum(['weak', 'medium', 'strong'])
  }),
  
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    language: z.enum(['en', 'es', 'fr']),
    timezone: z.string().max(50, 'Timezone must be 50 characters or less'),
    dashboard_layout: z.enum(['grid', 'list'])
  }),
  
  notifications: z.object({
    email_notifications: z.boolean(),
    push_notifications: z.boolean(),
    sms_notifications: z.boolean()
  })
};

// Form data coercion helpers
export const coerceFormData = {
  // Convert form strings to appropriate types
  toNumber: (value) => {
    if (typeof value === 'string' && value !== '') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    return value;
  },
  
  toBoolean: (value) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  },
  
  toDate: (value) => {
    if (typeof value === 'string' && value !== '') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    }
    return value;
  }
};

export default {
  enhancedEmployeeSchema,
  enhancedTimeEntrySchema,
  enhancedLeaveRequestSchema,
  enhancedPayrollSchema,
  fileUploadSchemas,
  settingsSchemas,
  coerceFormData
};
