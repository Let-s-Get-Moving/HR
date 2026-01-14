/**
 * Payroll Period Utilities
 * Generates proper biweekly payroll periods aligned with Friday pay dates
 * 
 * Canonical Rule:
 * - Work periods: Monday to Sunday (14 days)
 * - Pay date: Friday, 5 days after period ends
 * - Example: Dec 29, 2025 - Jan 11, 2026 → Jan 16, 2026 payday
 */

/**
 * Calculate the pay period for a given pay date
 * @param {Date} payDate - The Friday pay date
 * @returns {Object} Period with start, end, and pay_date
 */
function getPeriodForPayDate(payDate) {
  // Period ends 5 days before pay date (Sunday)
  const periodEnd = new Date(payDate);
  periodEnd.setDate(payDate.getDate() - 5);
  
  // Period starts 13 days before period end (Monday)
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 13);
  
  return {
    start_date: periodStart.toISOString().split('T')[0],
    end_date: periodEnd.toISOString().split('T')[0],
    pay_date: payDate.toISOString().split('T')[0]
  };
}

/**
 * Generate biweekly payroll periods for a given year
 * Aligns with Friday pay dates (e.g., Sep 26, Oct 10, Jan 16)
 * @param {number} year - The year to generate periods for (defaults to current year)
 * @param {string} referencePayDate - Reference pay date in format "YYYY-MM-DD" (e.g., "2025-09-26")
 * @returns {Array} Array of period objects with proper biweekly dates
 */
export function generateBiweeklyPeriods(year = new Date().getFullYear(), referencePayDate = "2025-09-26") {
  const periods = [];
  
  // Parse the reference pay date (a known Friday payday)
  const refDate = new Date(referencePayDate);
  
  // Find the first pay date of the target year
  // Go back from reference date to find first payday of year
  let firstPayday = new Date(refDate);
  
  // Calculate days from ref date to Jan 1 of target year
  const targetYearStart = new Date(year, 0, 1);
  const daysFromRef = Math.floor((targetYearStart - refDate) / (1000 * 60 * 60 * 24));
  
  // Move to the nearest Friday payday after/at year start
  const periodsOffset = Math.ceil(daysFromRef / 14);
  firstPayday.setDate(refDate.getDate() + periodsOffset * 14);
  
  // Ensure we start on or after Jan 1 of target year
  while (firstPayday < targetYearStart) {
    firstPayday.setDate(firstPayday.getDate() + 14);
  }
  
  // Generate 26 biweekly periods (26 periods per year)
  for (let i = 0; i < 26; i++) {
    const payDate = new Date(firstPayday);
    payDate.setDate(firstPayday.getDate() + (i * 14));
    
    const period = getPeriodForPayDate(payDate);
    
    // Determine period status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    let status = 'Open';
    if (endDate < today) {
      status = 'Closed';
    } else if (startDate <= today && endDate >= today) {
      status = 'Processing';
    }
    
    periods.push({
      id: i + 1,
      period_name: `${year}-${String(i + 1).padStart(2, '0')}`,
      start_date: period.start_date,
      end_date: period.end_date,
      pay_date: period.pay_date,
      status: status,
      year: year,
      period_number: i + 1
    });
  }
  
  return periods;
}

/**
 * Get the current active payroll period based on today's date
 * @param {string} referencePayDate - Reference pay date in format "YYYY-MM-DD" (e.g., "2025-09-26")
 * @returns {Object} The current active period
 */
export function getCurrentPeriod(referencePayDate = "2025-09-26") {
  const refDate = new Date(referencePayDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate days since reference payday
  const daysSinceRef = Math.floor((today - refDate) / (1000 * 60 * 60 * 24));
  
  // Find which 14-day cycle we're in
  const periodsSinceRef = Math.floor(daysSinceRef / 14);
  
  // Calculate the current period's pay date
  const currentPayDate = new Date(refDate);
  currentPayDate.setDate(refDate.getDate() + periodsSinceRef * 14);
  
  // If today is after this pay date, move to next period
  if (today > currentPayDate) {
    currentPayDate.setDate(currentPayDate.getDate() + 14);
  }
  
  return getPeriodForPayDate(currentPayDate);
}

/**
 * Get the next pay period (after the current one)
 * @param {string} referencePayDate - Reference pay date in format "YYYY-MM-DD" (e.g., "2025-09-26")
 * @returns {Object} The next pay period
 */
export function getNextPeriod(referencePayDate = "2025-09-26") {
  const refDate = new Date(referencePayDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate days since reference payday
  const daysSinceRef = Math.floor((today - refDate) / (1000 * 60 * 60 * 24));
  
  // Find which 14-day cycle we're in, then add 1 for next
  const periodsSinceRef = Math.floor(daysSinceRef / 14) + 1;
  
  // Calculate the next period's pay date
  const nextPayDate = new Date(refDate);
  nextPayDate.setDate(refDate.getDate() + periodsSinceRef * 14);
  
  return getPeriodForPayDate(nextPayDate);
}

/**
 * Format period display name with proper date ranges
 * @param {Object} period - The period object with start_date and end_date
 * @returns {string} Formatted period name (e.g., "Dec 29 - Jan 11, 2026")
 */
export function formatPeriodName(period) {
  const startDate = new Date(period.start_date);
  const endDate = new Date(period.end_date);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  const endYear = endDate.getFullYear();
  
  // If same month, show "Sep 1-14, 2025"
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return `${startMonth} ${startDay}-${endDay}, ${endYear}`;
  }
  
  // If different months or years, show "Dec 29 - Jan 11, 2026"
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Get periods for one year in the past, current year, and one year in the future
 * @param {string} referencePayDate - Reference pay date in format "YYYY-MM-DD" (e.g., "2025-09-26")
 * @returns {Array} Array of periods spanning 3 years
 */
export function getCurrentYearPeriods(referencePayDate = "2025-09-26") {
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
