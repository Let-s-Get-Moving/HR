/**
 * Schedule-based workday calculator for leave management
 * Computes leave days based on employee's work schedule, excluding holidays/closures
 */

import { q } from "../db.js";
import { parseLocalDate } from "./dateUtils.js";

// Map day name strings to JS getDay() indices (0=Sunday, 1=Monday, etc.)
const DAY_NAME_TO_INDEX = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

/**
 * Convert array of day name strings to array of JS day indices
 * @param {string[]} dayNames - Array like ['Monday', 'Tuesday', ...]
 * @returns {number[]} Array of day indices (0-6)
 */
function dayNamesToIndices(dayNames) {
  if (!Array.isArray(dayNames)) return [];
  return dayNames
    .map(name => DAY_NAME_TO_INDEX[name])
    .filter(idx => idx !== undefined);
}

/**
 * Check if a date falls on a scheduled workday
 * @param {Date} date - Date to check
 * @param {number[]} workdayIndices - Array of day indices (0-6) that are workdays
 * @returns {boolean}
 */
function isScheduledWorkday(date, workdayIndices) {
  return workdayIndices.includes(date.getDay());
}

/**
 * Format date as YYYY-MM-DD string for DB comparison
 * @param {Date} date 
 * @returns {string}
 */
function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get applicable holidays/closures for an employee within a date range
 * Respects applies_to_type/applies_to_id assignment (All, Department, JobTitle, Employee)
 * @param {number} employeeId 
 * @param {number|null} departmentId 
 * @param {number|null} jobTitleId 
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Set<string>>} Set of date strings (YYYY-MM-DD) that are holidays
 */
async function getApplicableHolidays(employeeId, departmentId, jobTitleId, startDate, endDate) {
  const { rows } = await q(`
    SELECT date
    FROM leave_calendar
    WHERE is_holiday = true
      AND date >= $1 AND date <= $2
      AND (
        applies_to_type = 'All'
        OR (applies_to_type = 'Department' AND applies_to_id = $3)
        OR (applies_to_type = 'JobTitle' AND applies_to_id = $4)
        OR (applies_to_type = 'Employee' AND applies_to_id = $5)
      )
  `, [startDate, endDate, departmentId, jobTitleId, employeeId]);
  
  const holidaySet = new Set();
  for (const row of rows) {
    // Normalize date to YYYY-MM-DD string
    const dateStr = row.date instanceof Date 
      ? formatDateYMD(row.date)
      : String(row.date).split('T')[0];
    holidaySet.add(dateStr);
  }
  return holidaySet;
}

/**
 * Get employee's work schedule days_of_week
 * @param {number} employeeId 
 * @returns {Promise<{daysOfWeek: string[], departmentId: number|null, jobTitleId: number|null} | null>}
 */
async function getEmployeeSchedule(employeeId) {
  const { rows } = await q(`
    SELECT 
      ws.days_of_week,
      e.department_id,
      e.job_title_id
    FROM employees e
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE e.id = $1
  `, [employeeId]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  let daysOfWeek = row.days_of_week;
  
  // Handle JSONB - could be string or array
  if (typeof daysOfWeek === 'string') {
    try {
      daysOfWeek = JSON.parse(daysOfWeek);
    } catch {
      daysOfWeek = [];
    }
  }
  
  return {
    daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
    departmentId: row.department_id,
    jobTitleId: row.job_title_id
  };
}

/**
 * Calculate scheduled workdays in a date range for an employee
 * Excludes holidays/closures that apply to the employee
 * 
 * @param {number} employeeId - Employee ID
 * @param {string|Date} startDate - Start date (inclusive)
 * @param {string|Date} endDate - End date (inclusive)
 * @param {Object} [options] - Optional overrides
 * @param {string[]} [options.daysOfWeek] - Override schedule days (for preview without DB lookup)
 * @param {number|null} [options.departmentId] - Override department ID
 * @param {number|null} [options.jobTitleId] - Override job title ID
 * @param {boolean} [options.excludeHolidays=true] - Whether to exclude holidays
 * @returns {Promise<{
 *   totalWorkdays: number,
 *   workdaysByYear: Record<number, number>,
 *   datesCounted: string[],
 *   datesExcludedAsHolidays: string[],
 *   scheduleDays: string[],
 *   hasSchedule: boolean
 * }>}
 */
export async function calculateScheduledWorkdays(employeeId, startDate, endDate, options = {}) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  if (!start || !end) {
    throw new Error('Invalid start or end date');
  }
  
  if (end < start) {
    throw new Error('End date must be >= start date');
  }
  
  // Get employee schedule if not overridden
  let daysOfWeek = options.daysOfWeek;
  let departmentId = options.departmentId;
  let jobTitleId = options.jobTitleId;
  let hasSchedule = true;
  
  if (!daysOfWeek) {
    const schedule = await getEmployeeSchedule(employeeId);
    if (!schedule) {
      throw new Error(`Employee ${employeeId} not found`);
    }
    daysOfWeek = schedule.daysOfWeek;
    departmentId = schedule.departmentId;
    jobTitleId = schedule.jobTitleId;
    hasSchedule = daysOfWeek.length > 0;
  }
  
  const workdayIndices = dayNamesToIndices(daysOfWeek);
  
  // If no schedule defined, return 0 workdays
  if (workdayIndices.length === 0) {
    return {
      totalWorkdays: 0,
      workdaysByYear: {},
      datesCounted: [],
      datesExcludedAsHolidays: [],
      scheduleDays: daysOfWeek,
      hasSchedule: false
    };
  }
  
  // Get holidays to exclude
  const startStr = formatDateYMD(start);
  const endStr = formatDateYMD(end);
  
  let holidays = new Set();
  if (options.excludeHolidays !== false) {
    holidays = await getApplicableHolidays(
      employeeId,
      departmentId,
      jobTitleId,
      startStr,
      endStr
    );
  }
  
  // Iterate through date range and count workdays
  const workdaysByYear = {};
  const datesCounted = [];
  const datesExcludedAsHolidays = [];
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatDateYMD(current);
    const year = current.getFullYear();
    
    if (isScheduledWorkday(current, workdayIndices)) {
      if (holidays.has(dateStr)) {
        // It's a workday but also a holiday - exclude
        datesExcludedAsHolidays.push(dateStr);
      } else {
        // Count this workday
        workdaysByYear[year] = (workdaysByYear[year] || 0) + 1;
        datesCounted.push(dateStr);
      }
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  const totalWorkdays = datesCounted.length;
  
  return {
    totalWorkdays,
    workdaysByYear,
    datesCounted,
    datesExcludedAsHolidays,
    scheduleDays: daysOfWeek,
    hasSchedule
  };
}

/**
 * Preview workdays for a leave request (before creating)
 * Same as calculateScheduledWorkdays but with explicit error messaging for UI
 * 
 * @param {number} employeeId 
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {Promise<{
 *   workdays: number,
 *   workdaysByYear: Record<number, number>,
 *   hasSchedule: boolean,
 *   scheduleDays: string[],
 *   holidaysExcluded: number,
 *   error: string|null
 * }>}
 */
export async function previewLeaveWorkdays(employeeId, startDate, endDate) {
  try {
    const result = await calculateScheduledWorkdays(employeeId, startDate, endDate);
    
    return {
      workdays: result.totalWorkdays,
      workdaysByYear: result.workdaysByYear,
      hasSchedule: result.hasSchedule,
      scheduleDays: result.scheduleDays,
      holidaysExcluded: result.datesExcludedAsHolidays.length,
      error: result.hasSchedule ? null : 'Employee has no work schedule assigned'
    };
  } catch (error) {
    return {
      workdays: 0,
      workdaysByYear: {},
      hasSchedule: false,
      scheduleDays: [],
      holidaysExcluded: 0,
      error: error.message
    };
  }
}

export default {
  calculateScheduledWorkdays,
  previewLeaveWorkdays
};
