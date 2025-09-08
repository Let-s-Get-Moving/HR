// User types
export interface User {
  id: number;
  username: string;
  email?: string;
  role?: string;
  department?: string;
  lastLogin?: string;
}

// Session types
export interface Session {
  id: string;
  userId: number;
  username: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

// Employee types
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id: number;
  position: string;
  hire_date: string;
  salary?: number;
  status: 'active' | 'inactive' | 'terminated';
  created_at: string;
  updated_at: string;
}

// Department types
export interface Department {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  created_at: string;
}

// Payroll types
export interface PayrollPeriod {
  id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: 'Open' | 'Closed' | 'Processing';
}

export interface PayrollCalculation {
  id: number;
  employee_id: number;
  period_id: number;
  base_hours: number;
  overtime_hours: number;
  regular_rate: number;
  overtime_rate: number;
  regular_pay: number;
  overtime_pay: number;
  commission_amount: number;
  bonus_amount: number;
  total_gross: number;
  deductions: number;
  net_pay: number;
  calculated_at: string;
  status: 'Calculated' | 'Approved' | 'Paid';
}

// Settings types
export interface Setting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  value: string | number | boolean;
  options?: string[];
  description?: string;
  category: 'system' | 'preferences' | 'notifications' | 'security' | 'maintenance';
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Loading states
export interface LoadingState {
  [key: string]: boolean;
}

// Pagination types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Theme types
export type Theme = 'light' | 'dark';

// Component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  loading?: boolean;
}

// API Error types
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
