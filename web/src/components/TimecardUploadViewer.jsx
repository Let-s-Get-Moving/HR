import React from "react";
import { motion } from "framer-motion";

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
    return <div className="text-center py-8 text-secondary">{t('timeTracking.loadingUploads')}</div>;
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
        <h3 className="text-lg font-medium text-primary mb-2">{t('timeTracking.noUploadsYet')}</h3>
        <p className="text-secondary">{t('timeTracking.uploadFirstTimecard')}</p>
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
                <h3 className="font-semibold text-primary mb-2 line-clamp-2">{upload.filename}</h3>
                <p className="text-sm text-secondary">
                  {new Date(upload.pay_period_start).toLocaleDateString()} - {new Date(upload.pay_period_end).toLocaleDateString()}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {upload.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs text-secondary">Employees</p>
                <p className="text-xl font-bold text-primary">{upload.employee_count}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Total Hours</p>
                <p className="text-xl font-bold text-primary">{parseFloat(upload.total_hours || 0).toFixed(1)}</p>
              </div>
            </div>
            
            <div className="mt-4 text-xs text-secondary">
              Uploaded {new Date(upload.upload_date).toLocaleDateString()} at {new Date(upload.upload_date).toLocaleTimeString()}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Upload Detail View (shows all employees for an upload)
export function UploadDetailView({ upload, employees, onSelectEmployee, onBack, loading }) {
  if (loading) {
    return <div className="text-center py-8 text-secondary">Loading...</div>;
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
        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to All Uploads
      </button>

      {/* Upload Info Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-primary mb-2">{upload?.filename}</h2>
            <p className="text-secondary">
              Period: {new Date(upload?.pay_period_start).toLocaleDateString()} - {new Date(upload?.pay_period_end).toLocaleDateString()}
            </p>
            <p className="text-sm text-secondary mt-1">
              Uploaded {new Date(upload?.upload_date).toLocaleDateString()} at {new Date(upload?.upload_date).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{upload?.employee_count}</div>
            <div className="text-sm text-secondary">Employees</div>
            <div className="mt-2 text-xl font-semibold text-indigo-600 dark:text-indigo-400">
              {formatHoursAsTime(parseFloat(upload?.total_hours || 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-primary">Select Employee to View Timecard</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {employees.map((emp) => (
            <motion.button
              key={emp.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectEmployee(emp.id)}
              className="card p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="font-medium text-primary">{emp.full_name}</div>
              <div className="text-sm text-secondary mt-1">{formatHoursAsTime(parseFloat(emp.total_hours || 0))}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Employee Timecard View (shows entries in Excel format)
export function EmployeeTimecardView({ employee, entries, upload, onBack, loading }) {
  if (loading) {
    return <div className="text-center py-8 text-secondary">Loading timecard...</div>;
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
        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Upload
      </button>

      {/* Employee Info Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">{employee?.full_name}</h2>
            <p className="text-secondary">
              Period: {new Date(upload?.pay_period_start).toLocaleDateString()} - {new Date(upload?.pay_period_end).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{formatHoursAsTime(parseFloat(employee?.total_hours || 0))}</div>
            <div className="text-sm text-secondary">Total Hours</div>
          </div>
        </div>
      </div>

      {/* Timecard Table (Excel Format) */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-primary">Timecard Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Day</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">IN</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">OUT</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Work Time</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Total Hours</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {Object.keys(entriesByDate).sort().map(date => {
                const dayEntries = entriesByDate[date];
                const dayTotal = dailyTotals[date];
                
                return dayEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${entry.notes?.includes('Missing') ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {entry.is_first_row ? entry.day_of_week : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {entry.is_first_row ? new Date(entry.work_date).toLocaleDateString() : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {entry.clock_in || ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {entry.clock_out || (entry.notes?.includes('Missing') ? <span className="text-red-500">—</span> : '')}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-primary">
                      {entry.hours_worked ? formatHoursAsTime(parseFloat(entry.hours_worked)) : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-indigo-600 dark:text-indigo-400">
                      {entry.is_first_row ? formatHoursAsTime(dayTotal) : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      {entry.notes ? (
                        <span className={entry.notes.includes('Missing') ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
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
export function UploadDashboardView({ stats, onBack, loading }) {
  if (loading) {
    return <div className="text-center py-8 text-secondary">Loading statistics...</div>;
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
        className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Uploads
      </button>

      <h2 className="text-2xl font-bold text-primary">Timecard Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Total Hours</h3>
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary">{formatHoursAsTime(parseFloat(stats?.summary?.total_hours || 0))}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Total Employees</h3>
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary">{stats?.summary?.total_employees || 0}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Avg Hours/Employee</h3>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary">{formatHoursAsTime(parseFloat(stats?.summary?.avg_hours_per_employee || 0))}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Missing Punches</h3>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats?.missingPunches || 0}</p>
        </div>
      </div>

      {/* Top Employees */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary">Top 5 Employees by Hours</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-primary">Employee</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-primary">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(stats?.topEmployees || []).map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm">
                    <span className={`font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-primary'}`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-primary">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-indigo-600 dark:text-indigo-400">
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
        <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <h3 className="font-semibold text-primary mb-2">Latest Upload</h3>
          <p className="text-secondary">{stats.latestUpload.filename}</p>
          <p className="text-sm text-secondary mt-1">
            {new Date(stats.latestUpload.upload_date).toLocaleDateString()} at {new Date(stats.latestUpload.upload_date).toLocaleTimeString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}

