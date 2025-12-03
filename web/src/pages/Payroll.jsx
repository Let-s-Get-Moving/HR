import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';
import { useUserRole } from '../hooks/useUserRole.js';

export default function Payroll() {
  const { t } = useTranslation();
  const { userRole } = useUserRole();
  const [view, setView] = useState("period-view");
  const [payPeriods, setPayPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPayrollData, setFilteredPayrollData] = useState([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load payroll data when period changes
  useEffect(() => {
    if (selectedPeriod) {
      loadPayrollData();
    }
  }, [selectedPeriod]);

  // Filter payroll data when search query or payrollData changes
  useEffect(() => {
    handleSearch(searchQuery);
  }, [payrollData, searchQuery]);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setFilteredPayrollData(payrollData);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = payrollData.filter(employee => {
      const searchableFields = [
        employee.first_name,
        employee.last_name,
        `${employee.first_name} ${employee.last_name}`,
        employee.department
      ];
      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
      );
    });

    setFilteredPayrollData(filtered);
  };

  const loadInitialData = async () => {
    try {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('💰 [Frontend-Payroll] LOADING INITIAL DATA');
      console.log('💰 [Frontend-Payroll] Timestamp:', new Date().toISOString());
      setLoading(true);

      // Load available pay periods from payroll-simple
      console.log('💰 [Frontend-Payroll] Fetching pay periods...');
      const periodsStartTime = Date.now();
      const periods = await API("/api/payroll-simple/periods");
      const periodsTime = Date.now() - periodsStartTime;
      console.log(`💰 [Frontend-Payroll] ✅ Periods loaded in ${periodsTime}ms:`, periods.length, 'periods');
      if (periods.length > 0) {
        console.log('💰 [Frontend-Payroll] Period list:');
        periods.slice(0, 3).forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.pay_period_start} to ${p.pay_period_end} (${p.employee_count} employees)`);
        });
        if (periods.length > 3) {
          console.log(`   ... and ${periods.length - 3} more periods`);
        }
      }
      setPayPeriods(periods);

      if (periods.length > 0) {
        console.log('💰 [Frontend-Payroll] Setting default period:', periods[0]);
        setSelectedPeriod(periods[0]);
      } else {
        console.log('⚠️ [Frontend-Payroll] No periods available');
      }
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error('❌ [Frontend-Payroll] ERROR loading initial data');
      console.error('❌ [Frontend-Payroll] Error:', error.message);
      console.error('❌ [Frontend-Payroll] Stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════\n');
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollData = async () => {
    if (!selectedPeriod) return;

    try {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('💰 [Frontend-Payroll] LOADING PAYROLL DATA');
      console.log('💰 [Frontend-Payroll] Timestamp:', new Date().toISOString());
      console.log('💰 [Frontend-Payroll] Selected period:', selectedPeriod);
      setLoading(true);

      // Load live payroll calculations from payroll-simple
      const startTime = Date.now();
      const data = await API(
        `/api/payroll-simple/calculate-live?pay_period_start=${selectedPeriod.pay_period_start}&pay_period_end=${selectedPeriod.pay_period_end}`
      );
      const loadTime = Date.now() - startTime;
      
      console.log(`💰 [Frontend-Payroll] ✅ Data loaded in ${loadTime}ms`);
      console.log(`💰 [Frontend-Payroll] Received ${data.length} employees from API`);
      
      // Filter out employees with 0 hours (no timecard data)
      const employeesWithData = data.filter(emp => parseFloat(emp.total_hours || 0) > 0);
      console.log(`💰 [Frontend-Payroll] Employees with hours: ${employeesWithData.length} of ${data.length}`);
      
      if (employeesWithData.length > 0) {
        const totalPay = employeesWithData.reduce((sum, emp) => sum + (emp.net_pay || 0), 0);
        const totalHours = employeesWithData.reduce((sum, emp) => sum + (emp.total_hours || 0), 0);
        console.log(`💰 [Frontend-Payroll] Summary: $${totalPay.toFixed(2)} total, ${totalHours.toFixed(2)} hours`);
        console.log('💰 [Frontend-Payroll] Top employees:');
        employeesWithData.slice(0, 5).forEach((emp, idx) => {
          console.log(`   ${idx + 1}. ${emp.first_name} ${emp.last_name}: ${emp.total_hours}h = $${emp.net_pay.toFixed(2)}`);
        });
      }
      
      setPayrollData(employeesWithData);
      setFilteredPayrollData(employeesWithData);
      console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error('❌ [Frontend-Payroll] ERROR loading payroll data');
      console.error('❌ [Frontend-Payroll] Error:', error.message);
      console.error('❌ [Frontend-Payroll] Stack:', error.stack);
      console.error('═══════════════════════════════════════════════════════════\n');
      setPayrollData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('👤 [Frontend-Payroll] EMPLOYEE DETAIL CLICKED');
    console.log('👤 [Frontend-Payroll] Employee:', `${employee.first_name} ${employee.last_name}`);
    console.log('👤 [Frontend-Payroll] Employee ID:', employee.employee_id);
    console.log('👤 [Frontend-Payroll] Total hours:', employee.total_hours);
    console.log('👤 [Frontend-Payroll] Net pay:', `$${employee.net_pay.toFixed(2)}`);
    console.log('👤 [Frontend-Payroll] Opening detail modal...');
    console.log('═══════════════════════════════════════════════════════════\n');
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours || 0);
    const m = Math.round(((hours || 0) - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Safe date formatting helper
  const safeFormatShortDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00Z');
      if (isNaN(date.getTime())) return '';
      return formatShortDate(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return '';
    }
  };

  if (loading && payrollData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">{t('payroll.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t('payroll.title')}</h1>
          <p className="text-secondary mt-1">{t('payroll.description')}</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pay Period Filter */}
          <div>
            <label className="block text-sm font-medium mb-2 text-primary">{t('payroll.payDate')}</label>
            <select
              value={selectedPeriod ? selectedPeriod.pay_date : ""}
              onChange={(e) => {
                const period = payPeriods.find(p => p.pay_date === e.target.value);
                setSelectedPeriod(period);
              }}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
            >
              <option value="">{t('payroll.selectPayDate')}</option>
              {payPeriods.map((period) => {
                // Parse date as UTC to avoid timezone shifts
                let formattedDate = '';
                if (period.pay_date) {
                  try {
                    const payDate = new Date(period.pay_date + 'T00:00:00Z');
                    if (!isNaN(payDate.getTime())) {
                      formattedDate = formatShortDate(payDate).toUpperCase();
                    }
                  } catch (error) {
                    console.error('Error formatting pay date:', error, period.pay_date);
                  }
                }
                
                return (
                  <option key={period.pay_date || `period-${period.key}`} value={period.pay_date || ''}>
                    {formattedDate || 'Invalid Date'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Summary Stats */}
          {selectedPeriod && (
            <div className="flex items-end">
              <div className="grid grid-cols-2 gap-4 w-full">
                <div>
                  <div className="text-xs text-secondary uppercase">{t('payroll.workPeriod')}</div>
                  <div className="text-sm font-medium text-primary">
                    {safeFormatShortDate(selectedPeriod.pay_period_start)} - {safeFormatShortDate(selectedPeriod.pay_period_end)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary uppercase">{t('payroll.employees')}</div>
                  <div className="text-lg font-semibold text-primary">
                    {filteredPayrollData.length} of {payrollData.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
          </div>

      {/* Search Bar - Hidden for user role */}
      {userRole !== 'user' && (
        <div className="card p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('payroll.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-primary"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-400 hover:text-primary transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-secondary">
              Found {filteredPayrollData.length} employee{filteredPayrollData.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Period View - Employee Grid */}
      <AnimatePresence mode="wait">
        <PeriodView 
          payrollData={filteredPayrollData}
          loading={loading}
          onEmployeeClick={handleEmployeeClick}
          formatCurrency={formatCurrency}
          formatHours={formatHours}
          searchQuery={searchQuery}
          t={t}
        />
      </AnimatePresence>

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          selectedPeriod={selectedPeriod}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEmployee(null);
          }}
          formatCurrency={formatCurrency}
          formatHours={formatHours}
        />
      )}
    </div>
  );
}

// Period View Component - Shows all employees in grid
function PeriodView({ payrollData, loading, onEmployeeClick, formatCurrency, formatHours, searchQuery, t }) {
  if (loading) {
    return <div className="text-center py-12 text-secondary">{t('payroll.loading')}</div>;
  }

  if (payrollData.length === 0 && searchQuery) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-medium text-primary mb-2">{t('payroll.noEmployeesFound')}</h3>
        <p className="text-secondary">{t('payroll.adjustSearchTerms')}</p>
      </div>
    );
  }

  if (payrollData.length === 0) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-primary mb-2">{t('payroll.noData')}</h3>
        <p className="text-secondary">{t('payroll.noApprovedTimecards')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {payrollData.map((employee) => (
          <motion.div
            key={employee.employee_id}
            whileHover={{ scale: 1.02 }}
            className="card overflow-hidden cursor-pointer"
            onClick={() => onEmployeeClick(employee)}
          >
            {/* Employee Header */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-primary text-lg">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  {employee.email && (
                    <p className="text-sm text-secondary">{employee.email}</p>
                  )}
                  {employee.department && (
                    <p className="text-xs text-secondary uppercase tracking-wide">{employee.department}</p>
                  )}
        </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(employee.net_pay)}
          </div>
                  <div className="text-xs text-secondary">{t('payroll.netPay')}</div>
                    </div>
                        </div>
                      </div>

            {/* Payroll Summary */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Hours */}
                      <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.totalHours')}</div>
                  <div className="text-lg font-semibold text-primary">{formatHours(employee.total_hours)}</div>
                        </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.regularHours')}</div>
                  <div className="text-lg font-semibold text-primary">{formatHours(employee.regular_hours)}</div>
                      </div>
                      <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.overtimeHours')}</div>
                  <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {formatHours(employee.overtime_hours)}
                        </div>
                      </div>
                      <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.hourlyRate')}</div>
                  <div className="text-lg font-semibold text-primary">{formatCurrency(employee.hourly_rate)}/hr</div>
                        </div>
                      </div>

              {/* Pay Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">{t('payroll.regularPay')}</span>
                    <span className="font-medium text-primary">{formatCurrency(employee.regular_pay)}</span>
                    </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">{t('payroll.overtimePay')}</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {formatCurrency(employee.overtime_pay)}
                    </span>
                      </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">{t('payroll.grossPay')}</span>
                    <span className="font-medium text-primary">{formatCurrency(employee.gross_pay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">{t('payroll.vacationAccrued')}</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatHours(employee.vacation_hours_accrued)}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Click for details hint */}
              <div className="mt-4 text-center text-xs text-indigo-600 dark:text-indigo-400">
                Click for detailed breakdown →
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Employee Detail Modal Component
function EmployeeDetailModal({ employee, selectedPeriod, onClose, formatCurrency, formatHours }) {
  const { t } = useTranslation();
  
  // Helper function to safely format dates
  const safeFormatDate = (dateValue) => {
    // Handle null, undefined, empty string, etc.
    if (!dateValue) return 'N/A';
    
    try {
      let date;
      
      // If it's already a Date object, use it directly
      if (dateValue instanceof Date) {
        date = dateValue;
      } 
      // If it's a string, handle different formats
      else if (typeof dateValue === 'string') {
        // If it's already in ISO format with time, use as-is
        if (dateValue.includes('T')) {
          date = new Date(dateValue);
        }
        // If it's in YYYY-MM-DD format, append time for UTC
        else {
          date = new Date(dateValue + 'T00:00:00Z');
        }
      }
      // If it's a number (timestamp), use it directly
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      // For any other type, try to convert
      else {
        date = new Date(dateValue);
      }
      
      // Validate the date is actually valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return formatShortDate(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateValue);
      return 'N/A';
    }
  };
  
  // Get dates with fallback to selectedPeriod
  const payPeriodStart = employee.pay_period_start || selectedPeriod?.pay_period_start;
  const payPeriodEnd = employee.pay_period_end || selectedPeriod?.pay_period_end;
  const payDate = employee.pay_date || selectedPeriod?.pay_date;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-secondary">{employee.email}</p>
              {employee.department && (
                <p className="text-sm text-secondary mt-1">{t('payroll.department')}: {employee.department}</p>
              )}
              <p className="text-sm text-secondary">
                Pay Period: {safeFormatDate(payPeriodStart)} - {safeFormatDate(payPeriodEnd)}
              </p>
              {payDate && (
                <p className="text-sm text-secondary">
                  Pay Date: {safeFormatDate(payDate)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-6">
            {/* Hours Breakdown */}
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('payroll.hoursBreakdown')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.totalHours')}</div>
                  <div className="text-2xl font-bold text-primary">{formatHours(employee.total_hours)}</div>
            </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.regularHours')}</div>
                  <div className="text-2xl font-bold text-primary">{formatHours(employee.regular_hours)}</div>
          </div>
          <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.overtimeHours')}</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatHours(employee.overtime_hours)}
            </div>
          </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.hourlyRate')}</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(employee.hourly_rate)}
          </div>
        </div>
      </div>
    </div>

            {/* Pay Breakdown */}
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-primary mb-4">{t('payroll.payBreakdown')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
          <div>
                    <div className="font-medium text-primary">{t('payroll.regularPayLabel')}</div>
                    <div className="text-xs text-secondary">
                      {formatHours(employee.regular_hours)} hours × {formatCurrency(employee.hourly_rate)}
      </div>
    </div>
                  <div className="text-xl font-bold text-primary">{formatCurrency(employee.regular_pay)}</div>
        </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="font-medium text-primary">{t('payroll.overtimePayLabel')}</div>
                    <div className="text-xs text-secondary">
                      {formatHours(employee.overtime_hours)} hours × {formatCurrency(employee.hourly_rate * 1.5)} (1.5×)
      </div>
    </div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(employee.overtime_pay)}
          </div>
        </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="font-medium text-primary">{t('payroll.grossPayLabel')}</div>
                    <div className="text-xs text-secondary">{t('payroll.totalBeforeDeductions')}</div>
                  </div>
                  <div className="text-xl font-bold text-primary">{formatCurrency(employee.gross_pay)}</div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="font-medium text-primary">{t('payroll.deductions')}</div>
                    <div className="text-xs text-secondary">{t('payroll.taxesBenefitsEtc')}</div>
                  </div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(employee.deductions)}
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 bg-green-100 dark:bg-green-900/30 rounded-lg px-4">
                  <div>
                    <div className="font-bold text-green-900 dark:text-green-300 text-lg">{t('payroll.netPayLabel')}</div>
                    <div className="text-xs text-green-700 dark:text-green-400">{t('payroll.takeHomeAmount')}</div>
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(employee.net_pay)}
                  </div>
                </div>
              </div>
          </div>

            {/* Vacation Accrual */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-primary mb-3">{t('payroll.vacationAccrual')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.vacationHoursAccrued')}</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatHours(employee.vacation_hours_accrued)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">{t('payroll.vacationPayValue')}</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(employee.vacation_pay_accrued)}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-secondary">
                Vacation is accrued at 4% of total hours and gross pay
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-primary mb-2">💡 Calculation Notes</h3>
              <ul className="text-xs text-secondary space-y-1">
                <li>• Regular hours: All hours up to 8 per day</li>
                <li>• Overtime: Hours over 8 per day at 1.5× rate</li>
                <li>• Vacation accrual: 4% of total hours and gross pay</li>
                <li>• All timecard entries are automatically included in payroll</li>
              </ul>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
                  <button
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
              Close
                  </button>
                </div>
              </div>
            </motion.div>
    </div>
  );
}
