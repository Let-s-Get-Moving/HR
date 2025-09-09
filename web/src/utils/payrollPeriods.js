/**
 * Payroll Period Utilities
 * Generates proper biweekly payroll periods aligned with specific pay dates
 */

/**
 * Generate biweekly payroll periods for a given year
 * Aligns with specific pay dates (e.g., Sep 12, Sep 26) and accounts for real calendar days
 * @param {number} year - The year to generate periods for (defaults to current year)
 * @param {string} referencePayDate - Reference pay date in format "MM-DD" (e.g., "09-12")
 * @returns {Array} Array of period objects with proper biweekly dates
 */
export function generateBiweeklyPeriods(year = new Date().getFullYear(), referencePayDate = "09-12") {
  const periods = [];
  
  // Parse the reference pay date (e.g., "09-12" for Sep 12)
  const [refMonth, refDay] = referencePayDate.split('-').map(Number);
  
  // Find the reference pay date in the given year
  const referenceDate = new Date(year, refMonth - 1, refDay);
  
  // Calculate the start of the biweekly cycle
  // The reference pay date (Sep 12) is the START of the first period
  const periodStart = new Date(referenceDate);
  periodStart.setDate(referenceDate.getDate() + 1); // Add 1 day to get Sep 12
  
  // Generate 26 biweekly periods (26 periods per year)
  for (let i = 0; i < 26; i++) {
    const startDate = new Date(periodStart);
    startDate.setDate(periodStart.getDate() + (i * 14));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14); // 14 days total (0-14 inclusive)
    
    // Pay date is the same as the start date of the period
    const payDate = new Date(startDate);
    
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
      period_name: `${year}`,
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
 * @param {string} referencePayDate - Reference pay date in format "MM-DD" (e.g., "09-12")
 * @returns {Object|null} The current active period or null if none
 */
export function getCurrentPeriod(year = new Date().getFullYear(), referencePayDate = "09-12") {
  const periods = generateBiweeklyPeriods(year, referencePayDate);
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
  
  // If same month, show "Sep 12-26, 2025"
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  
  // If different months, show "Dec 30 - Jan 12, 2025"
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get periods for one year in the past, current year, and one year in the future
 * @param {string} referencePayDate - Reference pay date in format "MM-DD" (e.g., "09-12")
 * @returns {Array} Array of periods spanning 3 years
 */
export function getCurrentYearPeriods(referencePayDate = "09-12") {
  const currentYear = new Date().getFullYear();
  const allPeriods = [];
  
  // Generate periods for past year, current year, and future year
  for (let yearOffset = -1; yearOffset <= 1; yearOffset++) {
    const year = currentYear + yearOffset;
    const yearPeriods = generateBiweeklyPeriods(year, referencePayDate);
    
    // Add year offset to IDs to make them unique across years
    const adjustedPeriods = yearPeriods.map(period => ({
      ...period,
      id: period.id + (yearOffset + 1) * 26, // Past year: 1-26, Current: 27-52, Future: 53-78
      year: year
    }));
    
    allPeriods.push(...adjustedPeriods);
  }
  
  return allPeriods;
}
