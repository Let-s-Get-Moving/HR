// Utility functions for consistent number formatting

/**
 * Format a number to a specified number of decimal places
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} - Formatted number
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return Math.round(parseFloat(value) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Format a percentage to 1 decimal place
 * @param {number|string} value - The percentage value
 * @returns {number} - Formatted percentage
 */
export const formatPercentage = (value) => {
  return formatNumber(value, 1);
};

/**
 * Format currency to 2 decimal places
 * @param {number|string} value - The currency value
 * @returns {number} - Formatted currency
 */
export const formatCurrency = (value) => {
  return formatNumber(value, 2);
};

/**
 * Format hours to 1 decimal place
 * @param {number|string} value - The hours value
 * @returns {number} - Formatted hours
 */
export const formatHours = (value) => {
  return formatNumber(value, 1);
};

/**
 * Format rating to 1 decimal place
 * @param {number|string} value - The rating value
 * @returns {number} - Formatted rating
 */
export const formatRating = (value) => {
  return formatNumber(value, 1);
};

/**
 * Format an object's numeric properties
 * @param {object} obj - The object to format
 * @param {object} formatConfig - Configuration for formatting specific fields
 * @returns {object} - Object with formatted numbers
 */
export const formatObjectNumbers = (obj, formatConfig = {}) => {
  const formatted = { ...obj };
  
  for (const [key, value] of Object.entries(formatted)) {
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value))) {
      const decimals = formatConfig[key] || 2;
      formatted[key] = formatNumber(value, decimals);
    } else if (typeof value === 'object' && value !== null) {
      formatted[key] = formatObjectNumbers(value, formatConfig);
    }
  }
  
  return formatted;
};
