/**
 * Parse YYYY-MM-DD date string as local date (not UTC)
 * Prevents timezone shift when parsing date-only strings
 * Handles YYYY-MM-DD strings, Date objects, and ISO date strings
 * @param {string|Date} dateInput - Date string in YYYY-MM-DD format, Date object, or ISO string
 * @returns {Date|null} Date object in local timezone, or null if invalid
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  
  // If already a Date object, extract date components
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  
  // If string, parse it
  if (typeof dateInput === 'string') {
    // Handle YYYY-MM-DD format
    const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch.map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Fallback: try parsing as ISO string and extract date part
    const dateObj = new Date(dateInput);
    if (!isNaN(dateObj.getTime())) {
      return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    }
  }
  
  return null;
}

/**
 * Normalize any date input to YYYY-MM-DD string (date-only, no time/timezone)
 * Strips T...Z from ISO strings, extracts date part from Date objects
 * @param {string|Date|null|undefined} input - Date input
 * @returns {string|null} YYYY-MM-DD string or null if invalid/empty
 */
export function normalizeYMD(input) {
  if (!input) return null;
  
  // If it's a Date object, extract YYYY-MM-DD
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If string, extract YYYY-MM-DD portion
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * List of date-only fields in the employees table that should be normalized to YYYY-MM-DD.
 * These fields store calendar dates (not timestamps) and should never include time/timezone.
 */
export const DATE_ONLY_FIELDS = [
  'hire_date',
  'birth_date',
  'probation_end',
  'termination_date',
  'sin_expiry_date',
  'contract_signed_date'
];

/**
 * Normalize date-only fields in an employee object to YYYY-MM-DD format.
 * This ensures clients always receive consistent date-only values without timezone shifts.
 * @param {Object} employee - Employee object from database
 * @returns {Object} Employee object with normalized date-only fields
 */
export function normalizeEmployeeDates(employee) {
  if (!employee) return employee;
  
  const normalized = { ...employee };
  
  for (const field of DATE_ONLY_FIELDS) {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      normalized[field] = normalizeYMD(normalized[field]);
    }
  }
  
  return normalized;
}

