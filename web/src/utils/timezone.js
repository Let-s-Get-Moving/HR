import { format, toZonedTime } from 'date-fns-tz';

/**
 * Default timezone for all date-only business operations (Toronto, Canada)
 */
export const DEFAULT_TIMEZONE = 'America/Toronto';

/**
 * Get user's selected timezone from localStorage
 * Defaults to America/Toronto for date-only business operations
 */
export function getUserTimezone() {
  return localStorage.getItem('user_timezone') || DEFAULT_TIMEZONE;
}

// ============================================================================
// Date-only helpers (YYYY-MM-DD) - safe for Toronto business dates
// ============================================================================

/**
 * Normalize any date input to YYYY-MM-DD string (date-only, no time/timezone)
 * Strips T...Z from ISO strings, extracts date part from Date objects
 * @param {string|Date|null|undefined} input - Date input
 * @returns {string} YYYY-MM-DD string or empty string if invalid
 */
export function normalizeYMD(input) {
  if (!input) return '';
  
  // If it's a Date object, use toYMD
  if (input instanceof Date) {
    return toYMD(input);
  }
  
  // If string, extract YYYY-MM-DD portion
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
  
  return '';
}

/**
 * Format a YYYY-MM-DD string for display without going through new Date(ymd) parsing
 * This avoids the timezone-shift bug where "2025-12-29" becomes "Dec 28, 2025"
 * @param {string} ymd - Date string in YYYY-MM-DD format
 * @param {string} formatStr - date-fns format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export function formatYMD(ymd, formatStr = 'MMM dd, yyyy') {
  if (!ymd || typeof ymd !== 'string') return '';
  
  // Parse YYYY-MM-DD manually to avoid UTC interpretation
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  
  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
  const day = parseInt(dayStr, 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
  
  // Create date at local midnight (not UTC)
  const date = new Date(year, month, day, 12, 0, 0, 0); // noon to avoid DST edge cases
  
  try {
    return format(date, formatStr);
  } catch (e) {
    console.error('Error in formatYMD:', e, ymd);
    return '';
  }
}

/**
 * Convert a Date object to YYYY-MM-DD string in Toronto timezone
 * Use this instead of toISOString().split('T')[0] which uses UTC
 * @param {Date|null|undefined} dateObj - Date object
 * @returns {string} YYYY-MM-DD string in Toronto timezone, or empty string
 */
export function toYMD(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }
  
  const timezone = getUserTimezone();
  
  try {
    const zonedDate = toZonedTime(dateObj, timezone);
    return format(zonedDate, 'yyyy-MM-dd', { timeZone: timezone });
  } catch (e) {
    // Fallback: use local timezone (which is usually correct for Toronto users)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get today's date as YYYY-MM-DD in Toronto timezone
 * @returns {string} Today's date as YYYY-MM-DD
 */
export function getTodayYMD() {
  return toYMD(new Date());
}

/**
 * Parse date as local date (not UTC)
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
    // Handle YYYY-MM-DD format (most common from DB)
    const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch.map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Handle MM/DD/YYYY format
    const mdyMatch = dateInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdyMatch) {
      const [, month, day, year] = mdyMatch.map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Handle "Mon Dec 28 2025" or similar format (from Date.toString())
    const dateStrMatch = dateInput.match(/^\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{4})/);
    if (dateStrMatch) {
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const monthName = dateStrMatch[1];
      const day = parseInt(dateStrMatch[2], 10);
      const year = parseInt(dateStrMatch[3], 10);
      if (months[monthName] !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, months[monthName], day);
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
 * Format date with user's timezone
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (e.g., 'yyyy-MM-dd HH:mm:ss')
 * @returns {string} Formatted date string
 */
export function formatInTimezone(date, formatStr = 'yyyy-MM-dd HH:mm:ss') {
  // Handle null, undefined, or empty input
  if (!date) {
    return '';
  }
  
  const timezone = getUserTimezone();
  let dateObj;
  
  // Convert string to Date object if needed
  if (typeof date === 'string') {
    // Check if it's a date-only string (YYYY-MM-DD) - use parseLocalDate to avoid timezone shifts
    const ymdMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
    if (ymdMatch && !date.includes('T') && !date.includes(' ')) {
      // Date-only string - use parseLocalDate to prevent UTC parsing
      dateObj = parseLocalDate(date);
      if (!dateObj) {
        // Fallback to regular parsing if parseLocalDate fails
        dateObj = new Date(date);
      }
    } else {
      // ISO datetime string or other format - parse normally
      dateObj = new Date(date);
    }
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    // For other types, try to convert
    dateObj = new Date(date);
  }
  
  // Validate the date is actually valid
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date provided to formatInTimezone:', date);
    return '';
  }
  
  try {
    const zonedDate = toZonedTime(dateObj, timezone);
    return format(zonedDate, formatStr, { timeZone: timezone });
  } catch (error) {
    console.error('Error formatting date with timezone:', error, date);
    // Fallback: try formatting without timezone conversion
    try {
      // Validate again before fallback formatting
      if (!isNaN(dateObj.getTime())) {
        return format(dateObj, formatStr);
      }
    } catch (fallbackError) {
      console.error('Fallback formatting also failed:', fallbackError);
    }
    return '';
  }
}

/**
 * Format date as short format with timezone
 */
export function formatShortDate(date) {
  return formatInTimezone(date, 'MMM dd, yyyy');
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
  return formatInTimezone(date, 'MMM dd, yyyy HH:mm');
}

/**
 * Format time only
 */
export function formatTime(date) {
  return formatInTimezone(date, 'HH:mm');
}

/**
 * Format a date-only field for display (hire_date, birth_date, probation_end, etc.)
 * This is the CANONICAL way to display date-only fields - it NEVER applies timezone conversion.
 * 
 * Use this instead of formatShortDate() for any field that stores a calendar date
 * (not a timestamp/datetime). This prevents the off-by-one-day bug where
 * "2026-01-21T00:00:00.000Z" would display as "Jan 20, 2026" in some timezones.
 * 
 * @param {string|Date|null|undefined} value - Date value (YYYY-MM-DD, ISO string, or Date object)
 * @param {string} formatStr - date-fns format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string showing the exact calendar date stored
 * 
 * @example
 * formatDateOnly('2026-01-21')                    // "Jan 21, 2026"
 * formatDateOnly('2026-01-21T00:00:00.000Z')      // "Jan 21, 2026" (not Jan 20!)
 * formatDateOnly(new Date(2026, 0, 21))           // "Jan 21, 2026"
 */
export function formatDateOnly(value, formatStr = 'MMM dd, yyyy') {
  const ymd = normalizeYMD(value);
  if (!ymd) return '';
  return formatYMD(ymd, formatStr);
}
