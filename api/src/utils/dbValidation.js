// Database validation utilities

import { z } from 'zod';

// Employee validation schemas
export const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email format').max(100, 'Email too long'),
  phone: z.string().optional().refine(
    (phone) => !phone || /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, '')),
    'Invalid phone number format'
  ),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  termination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract']),
  department_id: z.number().int().positive('Invalid department ID'),
  location_id: z.number().int().positive('Invalid location ID'),
  role_title: z.string().max(100, 'Role title too long').optional(),
  probation_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  status: z.enum(['Active', 'On Leave', 'Terminated']).default('Active'),
});

// Time entry validation
export const timeEntrySchema = z.object({
  employee_id: z.number().int().positive('Invalid employee ID'),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  clock_in: z.string().datetime('Invalid datetime format').optional(),
  clock_out: z.string().datetime('Invalid datetime format').optional(),
  was_late: z.boolean().default(false),
  left_early: z.boolean().default(false),
  overtime_hours: z.number().min(0, 'Overtime hours cannot be negative').default(0),
});

// Leave validation
export const leaveSchema = z.object({
  employee_id: z.number().int().positive('Invalid employee ID'),
  leave_type: z.enum(['Vacation', 'Sick', 'Parental', 'Bereavement', 'Other']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  approved_by: z.string().max(100, 'Approved by too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
);

// Training validation
export const trainingSchema = z.object({
  code: z.string().min(1, 'Training code is required').max(20, 'Code too long'),
  name: z.string().min(1, 'Training name is required').max(100, 'Name too long'),
  mandatory: z.boolean().default(true),
  validity_months: z.number().int().positive('Validity months must be positive').optional(),
});

export const trainingRecordSchema = z.object({
  employee_id: z.number().int().positive('Invalid employee ID'),
  training_id: z.number().int().positive('Invalid training ID'),
  completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

// Document validation
export const documentSchema = z.object({
  employee_id: z.number().int().positive('Invalid employee ID'),
  doc_type: z.enum(['Contract', 'PolicyAck', 'Visa', 'WorkPermit', 'Other']),
  file_name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  signed: z.boolean().default(false),
});

// Job posting validation
export const jobPostingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  department_id: z.number().int().positive('Invalid department ID'),
  location_id: z.number().int().positive('Invalid location ID'),
  status: z.enum(['Open', 'On Hold', 'Closed']).default('Open'),
  budget_cad: z.number().min(0, 'Budget cannot be negative').optional(),
});

// Application validation
export const applicationSchema = z.object({
  job_id: z.number().int().positive('Invalid job ID'),
  candidate_name: z.string().min(1, 'Candidate name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').max(100, 'Email too long'),
  source: z.string().max(50, 'Source too long').optional(),
  status: z.enum(['Applied', 'Interview', 'Offer', 'Hired', 'Rejected']).default('Applied'),
  cost_cad: z.number().min(0, 'Cost cannot be negative').default(0),
});

// Payroll validation
export const payrollRunSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
}).refine(
  (data) => new Date(data.period_end) >= new Date(data.period_start),
  {
    message: 'Period end must be after period start',
    path: ['period_end'],
  }
);

export const payrollLineSchema = z.object({
  payroll_run_id: z.number().int().positive('Invalid payroll run ID'),
  employee_id: z.number().int().positive('Invalid employee ID'),
  base_pay_cad: z.number().min(0, 'Base pay cannot be negative').default(0),
  overtime_pay_cad: z.number().min(0, 'Overtime pay cannot be negative').default(0),
  bonus_cad: z.number().min(0, 'Bonus cannot be negative').default(0),
  deductions_cad: z.number().min(0, 'Deductions cannot be negative').default(0),
});

// Alert validation
export const alertSchema = z.object({
  type: z.string().min(1, 'Alert type is required').max(50, 'Type too long'),
  employee_id: z.number().int().positive('Invalid employee ID'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  resolved: z.boolean().default(false),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email format').max(100, 'Email too long'),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  role: z.enum(['HR', 'Manager', 'Viewer', 'Admin']),
  password_hash: z.string().min(1, 'Password hash is required'),
});

// Validation helper functions
export function validateData(schema, data) {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    throw error;
  }
}

// Sanitize input data
export function sanitizeInput(data) {
  if (typeof data === 'string') {
    return data
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

// Validate and sanitize data
export function validateAndSanitize(schema, data) {
  const sanitized = sanitizeInput(data);
  return validateData(schema, sanitized);
}

export default {
  employeeSchema,
  timeEntrySchema,
  leaveSchema,
  trainingSchema,
  trainingRecordSchema,
  documentSchema,
  jobPostingSchema,
  applicationSchema,
  payrollRunSchema,
  payrollLineSchema,
  alertSchema,
  userSchema,
  validateData,
  sanitizeInput,
  validateAndSanitize,
};
