// Test utilities and helpers
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Mock API client
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
  clearCache: jest.fn(),
};

// Mock API responses
export const mockApiResponses = {
  success: (data: any) => Promise.resolve({ data }),
  error: (message: string, status = 500) => Promise.reject(new Error(message)),
  networkError: () => Promise.reject(new Error('Network error')),
};

// Mock user data
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'HR',
  department: 'Human Resources',
  lastLogin: '2024-01-01T00:00:00Z',
};

// Mock employee data
export const mockEmployee = {
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  department_id: 1,
  position: 'Software Engineer',
  hire_date: '2023-01-01',
  salary: 75000,
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// Mock employees list
export const mockEmployees = [
  mockEmployee,
  {
    ...mockEmployee,
    id: 2,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
  },
];

// Mock department data
export const mockDepartments = [
  { id: 1, name: 'Sales', description: 'Sales team' },
  { id: 2, name: 'Operations', description: 'Operations team' },
  { id: 3, name: 'Finance', description: 'Financial management team' },
  { id: 4, name: 'IT', description: 'Information Technology team' },
  { id: 5, name: 'Marketing', description: 'Marketing team' },
  { id: 6, name: 'HR', description: 'Human Resources team' },
];

// Mock payroll data
export const mockPayrollPeriods = [
  {
    id: 1,
    period_name: '2024-01-01 to 2024-01-15',
    start_date: '2024-01-01',
    end_date: '2024-01-15',
    pay_date: '2024-01-20',
    status: 'Closed',
  },
  {
    id: 2,
    period_name: '2024-01-16 to 2024-01-31',
    start_date: '2024-01-16',
    end_date: '2024-01-31',
    pay_date: '2024-02-05',
    status: 'Open',
  },
];

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  withRouter?: boolean;
  withErrorBoundary?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialRoute = '/',
    withRouter = false,
    withErrorBoundary = true,
    ...renderOptions
  } = options;

  // Set initial route
  if (withRouter && initialRoute !== '/') {
    window.history.pushState({}, '', initialRoute);
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let content = children;

    if (withErrorBoundary) {
      content = <ErrorBoundary>{content}</ErrorBoundary>;
    }

    return <>{content}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock form data
export const mockFormData = {
  employee: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    department_id: 1,
    position: 'Software Engineer',
    hire_date: '2023-01-01',
    salary: 75000,
  },
  leave: {
    employee_id: 1,
    leave_type: 'Vacation',
    start_date: '2024-02-01',
    end_date: '2024-02-05',
    notes: 'Family vacation',
  },
  payroll: {
    period_start: '2024-01-01',
    period_end: '2024-01-15',
  },
};

// Mock validation errors
export const mockValidationErrors = [
  {
    field: 'email',
    message: 'Invalid email format',
  },
  {
    field: 'phone',
    message: 'Phone number is required',
  },
];

// Mock API error responses
export const mockApiErrors = {
  validation: {
    status: 400,
    message: 'Validation failed',
    errors: mockValidationErrors,
  },
  unauthorized: {
    status: 401,
    message: 'Unauthorized',
  },
  forbidden: {
    status: 403,
    message: 'Forbidden',
  },
  notFound: {
    status: 404,
    message: 'Not found',
  },
  serverError: {
    status: 500,
    message: 'Internal server error',
  },
  rateLimit: {
    status: 429,
    message: 'Rate limit exceeded',
  },
};

// Test data generators
export const generateMockEmployee = (overrides = {}) => ({
  ...mockEmployee,
  id: Math.floor(Math.random() * 1000),
  first_name: `Employee${Math.floor(Math.random() * 1000)}`,
  last_name: 'Test',
  email: `employee${Math.floor(Math.random() * 1000)}@example.com`,
  ...overrides,
});

export const generateMockEmployees = (count: number) => {
  return Array.from({ length: count }, (_, index) =>
    generateMockEmployee({ id: index + 1 })
  );
};

// Mock functions
export const mockFunctions = {
  onSuccess: jest.fn(),
  onError: jest.fn(),
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  onClose: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onSave: jest.fn(),
  onUpdate: jest.fn(),
  onRefresh: jest.fn(),
  onSearch: jest.fn(),
  onFilter: jest.fn(),
  onSort: jest.fn(),
  onPageChange: jest.fn(),
  onSelectionChange: jest.fn(),
};

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Mock timers
export const mockTimers = {
  advance: (ms: number) => {
    jest.advanceTimersByTime(ms);
  },
  runAll: () => {
    jest.runAllTimers();
  },
  runOnlyPendingTimers: () => {
    jest.runOnlyPendingTimers();
  },
};

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

// Mock sessionStorage
export const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

// Mock window.location
export const mockLocation = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.history
export const mockHistory = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn(),
  length: 1,
  state: null,
};

// Setup mocks
export const setupMocks = () => {
  // Mock fetch
  global.fetch = jest.fn();

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  });

  // Mock location
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
  });

  // Mock history
  Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true,
  });
};

// Cleanup mocks
export const cleanupMocks = () => {
  jest.clearAllMocks();
  mockLocalStorage.clear();
  mockSessionStorage.clear();
};

export default {
  mockApiClient,
  mockApiResponses,
  mockUser,
  mockEmployee,
  mockEmployees,
  mockDepartments,
  mockPayrollPeriods,
  mockFormData,
  mockValidationErrors,
  mockApiErrors,
  generateMockEmployee,
  generateMockEmployees,
  mockFunctions,
  waitFor,
  mockTimers,
  mockLocalStorage,
  mockSessionStorage,
  mockLocation,
  mockHistory,
  setupMocks,
  cleanupMocks,
  renderWithProviders,
};
