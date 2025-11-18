import { format, toZonedTime } from 'date-fns-tz';

/**
 * Get user's selected timezone from localStorage
 */
export function getUserTimezone() {
  return localStorage.getItem('user_timezone') || 'UTC';
}

/**
 * Format date with user's timezone
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (e.g., 'yyyy-MM-dd HH:mm:ss')
 * @returns {string} Formatted date string
 */
export function formatInTimezone(date, formatStr = 'yyyy-MM-dd HH:mm:ss') {
  const timezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const zonedDate = toZonedTime(dateObj, timezone);
    return format(zonedDate, formatStr, { timeZone: timezone });
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return format(dateObj, formatStr); // Fallback to local time
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

