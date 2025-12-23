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

