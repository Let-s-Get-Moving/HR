/**
 * Payroll Period Utilities
 * Generates proper biweekly payroll periods for the current year
 */

/**
 * Generate biweekly payroll periods for a given year
 * @param {number} year - The year to generate periods for (defaults to current year)
 * @returns {Array} Array of period objects with proper biweekly dates
 */
export function generateBiweeklyPeriods(year = new Date().getFullYear()) {
  const periods = [];
  
  // Start from the first Monday of the year
  const jan1 = new Date(year, 0, 1);
  const firstMonday = new Date(jan1);
  
  // Find the first Monday of the year
  const dayOfWeek = jan1.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Sunday = 0, Monday = 1
  firstMonday.setDate(jan1.getDate() + daysToMonday);
  
  // Generate 26 biweekly periods (26 periods per year)
  for (let i = 0; i < 26; i++) {
    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (i * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 13); // 14 days total (0-13 inclusive)
    
    // Pay date is typically 5 days after period end
    const payDate = new Date(endDate);
    payDate.setDate(endDate.getDate() + 5);
    
    // Determine period status
    const today = new Date();
    let status = 'Open';
    
    if (endDate < today) {
      status = 'Closed';
    } else if (startDate <= today && endDate >= today) {
      status = 'Processing';
    }
    
    periods.push({
      id: i + 1,
      period_name: `${year}-${String(i + 1).padStart(2, '0')}`,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      pay_date: payDate.toISOString().split('T')[0],
      status: status,
      year: year,
      period_number: i + 1
    });
  }
  
  return periods;
}

/**
 * Get the current active payroll period
 * @param {number} year - The year to check (defaults to current year)
 * @returns {Object|null} The current active period or null if none
 */
export function getCurrentPeriod(year = new Date().getFullYear()) {
  const periods = generateBiweeklyPeriods(year);
  const today = new Date();
  
  return periods.find(period => {
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    return startDate <= today && endDate >= today;
  }) || periods[0]; // Return first period if no current period found
}

/**
 * Format period display name with proper date ranges
 * @param {Object} period - The period object
 * @returns {string} Formatted period name
 */
export function formatPeriodName(period) {
  const startDate = new Date(period.start_date);
  const endDate = new Date(period.end_date);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  const year = startDate.getFullYear();
  
  // If same month, show "Jan 1-14, 2025"
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  
  // If different months, show "Dec 30 - Jan 12, 2025"
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get periods for the current year only
 * @returns {Array} Array of current year periods
 */
export function getCurrentYearPeriods() {
  return generateBiweeklyPeriods(new Date().getFullYear());
}
