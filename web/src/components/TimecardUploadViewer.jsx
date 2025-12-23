import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

// Convert decimal hours to HH:MM format
const formatHoursAsTime = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Uploads List View
export function UploadsListView({ uploads, onViewUpload, loading, t }) {
  if (loading) {
    return <div className="text-center py-8 text-tahoe-text-secondary">{t('timeTracking.loadingUploads')}</div>;
  }

  if (uploads.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-8 text-center"
      >
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-medium text-tahoe-text-primary mb-2">{t('timeTracking.noUploadsYet')}</h3>
        <p className="text-tahoe-text-secondary">{t('timeTracking.uploadFirstTimecard')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Uploads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uploads.map((upload) => (
          <motion.div
            key={upload.id}
            whileHover={{ y: -4 }}
            className="card p-6 cursor-pointer"
            onClick={() => onViewUpload(upload.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-tahoe-text-primary mb-2 line-clamp-2">{upload.filename}</h3>
                <p className="text-sm text-tahoe-text-secondary">
                  {new Date(upload.pay_period_start).toLocaleDateString()} - {new Date(upload.pay_period_end).toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {upload.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
              <div>
                <p className="text-xs text-tahoe-text-secondary">{t('timeTracking.employees')}</p>
                <p className="text-xl font-bold text-tahoe-text-primary">{upload.employee_count}</p>
              </div>
              <div>
                <p className="text-xs text-tahoe-text-secondary">{t('timeTracking.totalHours')}</p>
                <p className="text-xl font-bold text-tahoe-text-primary">{parseFloat(upload.total_hours || 0).toFixed(1)}</p>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-tahoe-text-secondary">
              Uploaded {new Date(upload.upload_date).toLocaleDateString()} at {new Date(upload.upload_date).toLocaleTimeString()}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Upload Detail View (shows all employees for an upload)
export function UploadDetailView({ upload, employees, onSelectEmployee, onBack, loading, t }) {
  if (loading) {
    return <div className="text-center py-8 text-tahoe-text-secondary">{t('common.loading')}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-tahoe-text-secondary hover:text-tahoe-text-primary transition-all duration-tahoe"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
{t('timeTracking.backToAllUploads')}
      </button>

      {/* Upload Info Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-tahoe-text-primary mb-2">{upload?.filename}</h2>
            <p className="text-tahoe-text-secondary">
              Period: {new Date(upload?.pay_period_start).toLocaleDateString()} - {new Date(upload?.pay_period_end).toLocaleDateString()}
            </p>
            <p className="text-sm text-tahoe-text-secondary mt-1">
              Uploaded {new Date(upload?.upload_date).toLocaleDateString()} at {new Date(upload?.upload_date).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-tahoe-text-primary">{upload?.employee_count}</div>
            <div className="text-sm text-tahoe-text-secondary">{t('timeTracking.employees')}</div>
            <div className="mt-2 text-xl font-semibold text-tahoe-accent">
              {formatHoursAsTime(parseFloat(upload?.total_hours || 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <h3 className="text-lg font-semibold text-tahoe-text-primary">{t('timeTracking.selectEmployeeToViewTimecard')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {employees.map((emp) => (
            <motion.button
              key={emp.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectEmployee(emp.id)}
              className="card p-4 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe"
            >
              <div className="font-medium text-tahoe-text-primary">{emp.full_name}</div>
              <div className="text-sm text-tahoe-text-secondary mt-1">{formatHoursAsTime(parseFloat(emp.total_hours || 0))}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Employee Timecard View (shows entries in Excel format)
export function EmployeeTimecardView({ employee, entries, upload, onBack, loading, t }) {
  if (loading) {
    return <div className="text-center py-8 text-tahoe-text-secondary">{t('timeTracking.loadingTimecard')}</div>;
  }

  // Group entries by date and calculate daily totals
  const entriesByDate = {};
  const dailyTotals = {};
  
  (entries || []).forEach(entry => {
    if (!entriesByDate[entry.work_date]) {
      entriesByDate[entry.work_date] = [];
      dailyTotals[entry.work_date] = 0;
    }
    entriesByDate[entry.work_date].push(entry);
    // Sum up hours_worked for the day
    dailyTotals[entry.work_date] += parseFloat(entry.hours_worked || 0);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-tahoe-text-secondary hover:text-tahoe-text-primary transition-all duration-tahoe"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {t('timeTracking.backToUpload')}
      </button>

      {/* Employee Info Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-tahoe-text-primary">{employee?.full_name}</h2>
            <p className="text-tahoe-text-secondary">
              Period: {new Date(upload?.pay_period_start).toLocaleDateString()} - {new Date(upload?.pay_period_end).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-tahoe-text-primary">{formatHoursAsTime(parseFloat(employee?.total_hours || 0))}</div>
            <div className="text-sm text-tahoe-text-secondary">{t('timeTracking.totalHours')}</div>
          </div>
        </div>
      </div>

      {/* Timecard Table (Excel Format) */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <h3 className="text-lg font-semibold text-tahoe-text-primary">{t('timeTracking.timecardEntries')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.day')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.date')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.in')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.out')}</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-tahoe-text-primary">{t('timeTracking.workTime')}</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-tahoe-text-primary">{t('timeTracking.totalHours')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.note')}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
              {Object.keys(entriesByDate).sort().map(date => {
                const dayEntries = entriesByDate[date];
                const dayTotal = dailyTotals[date];
                
                return dayEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`hover:bg-tahoe-bg-hover transition-all duration-tahoe ${entry.notes?.includes('Missing') ? '' : ''}`} style={entry.notes?.includes('Missing') ? { backgroundColor: 'rgba(255, 69, 58, 0.1)' } : {}}>
                    <td className="px-6 py-4 text-sm font-medium text-tahoe-text-primary">
                      {entry.is_first_row ? entry.day_of_week : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-tahoe-text-primary">
                      {entry.is_first_row ? new Date(entry.work_date).toLocaleDateString() : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-tahoe-text-primary">
                      {entry.clock_in || ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-tahoe-text-primary">
                      {entry.clock_out || (entry.notes?.includes('Missing') ? <span className="text-red-500">—</span> : '')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-tahoe-text-primary">
                      {entry.hours_worked ? formatHoursAsTime(parseFloat(entry.hours_worked)) : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-tahoe-accent">
                      {entry.is_first_row ? formatHoursAsTime(dayTotal) : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-tahoe-text-secondary">
                      {entry.notes ? (
                        <span className={entry.notes.includes('Missing') ? 'text-tahoe-error-text font-medium' : ''}>
                          {entry.notes}
                        </span>
                      ) : ''}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// Upload Dashboard View (overall stats)
export function UploadDashboardView({ stats, onBack, loading, t }) {
  if (loading) {
    return <div className="text-center py-8 text-tahoe-text-secondary">{t('timeTracking.loadingStatistics')}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-tahoe-text-secondary hover:text-tahoe-text-primary transition-all duration-tahoe"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
{t('timeTracking.backToUploads')}
      </button>

      <h2 className="text-2xl font-bold text-tahoe-text-primary">{t('timeTracking.timecardDashboard')}</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-tahoe-text-secondary">Total Hours</h3>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-tahoe-text-primary">{formatHoursAsTime(parseFloat(stats?.summary?.total_hours || 0))}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-tahoe-text-secondary">Total Employees</h3>
            <svg className="w-8 h-8 text-tahoe-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-tahoe-text-primary">{stats?.summary?.total_employees || 0}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-tahoe-text-secondary">Avg Hours/Employee</h3>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-tahoe-text-primary">{formatHoursAsTime(parseFloat(stats?.summary?.avg_hours_per_employee || 0))}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-tahoe-text-secondary">Missing Punches</h3>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-tahoe-error-text">{stats?.missingPunches || 0}</p>
        </div>
      </div>

      {/* Top Employees */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <h2 className="text-lg font-semibold text-tahoe-text-primary">{t('timeTracking.top5EmployeesByHours')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.rank')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-tahoe-text-primary">{t('timeTracking.employee')}</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-tahoe-text-primary">{t('timeTracking.totalHours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
              {(stats?.topEmployees || []).map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-tahoe-bg-hover transition-all duration-tahoe">
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-tahoe-text-primary'}`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-tahoe-text-primary">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-tahoe-accent">
                    {formatHoursAsTime(parseFloat(emp.total_hours))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Upload Info */}
      {stats?.latestUpload && (
        <div className="card p-6" style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
          <h3 className="font-semibold text-tahoe-text-primary mb-2">{t('timeTracking.latestUpload')}</h3>
          <p className="text-tahoe-text-secondary">{stats.latestUpload.filename}</p>
          <p className="text-sm text-tahoe-text-secondary mt-1">
            {new Date(stats.latestUpload.upload_date).toLocaleDateString()} at {new Date(stats.latestUpload.upload_date).toLocaleTimeString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}

