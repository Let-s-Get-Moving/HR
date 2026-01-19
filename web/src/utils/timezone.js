import { format, toZonedTime } from 'date-fns-tz';

/**
 * Get user's selected timezone from localStorage
 */
export function getUserTimezone() {
  return localStorage.getItem('user_timezone') || 'UTC';
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
