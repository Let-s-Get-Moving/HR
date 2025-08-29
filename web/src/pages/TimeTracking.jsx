import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API = (path, options = {}) => fetch(`http://localhost:8080${path}`, options).then(r => r.json());

export default function TimeTracking() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeEntries();
    loadEmployees();
  }, []);

  const loadTimeEntries = async () => {
    try {
      const data = await API("/api/employees/time-entries");
      setTimeEntries(data);
    } catch (error) {
      console.error("Error loading time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await API("/api/employees");
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const handleCSVImport = async () => {
    try {
      await API("/api/imports/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvData })
      });
      setShowImportModal(false);
      setCsvData("");
      loadTimeEntries();
    } catch (error) {
      console.error("Error importing CSV:", error);
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : `Employee ${employeeId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading time entries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Time & Attendance</h1>
          <p className="text-neutral-400 mt-1">Track employee work hours and attendance</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowImportModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors w-full sm:w-auto"
        >
          📁 Import CSV
        </motion.button>
      </div>

      {/* Time Entries Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Employee</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Date</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Clock In</th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Clock Out</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Hours</th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Overtime</th>
                <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-neutral-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-neutral-800/50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="font-medium">{getEmployeeName(entry.employee_id)}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm">{new Date(entry.work_date).toLocaleDateString()}</td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">
                    {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString() : '-'}
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm">
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-4 text-sm">{entry.hours_worked || '-'}</td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 text-sm">{entry.overtime_hours || '0'}</td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex space-x-1">
                      {entry.was_late && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
                          Late
                        </span>
                      )}
                      {entry.left_early && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                          Early
                        </span>
                      )}
                      {!entry.was_late && !entry.left_early && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                          On Time
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Import Time Entries</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CSV Data</label>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="employee_id,work_date,clock_in,clock_out,was_late,left_early,overtime_hours&#10;1,2025-01-15,2025-01-15 09:00,2025-01-15 17:15,true,false,0.50"
                    rows={10}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-sm"
                  />
                </div>

                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">CSV Format:</h3>
                  <p className="text-sm text-neutral-400">
                    <code>employee_id,work_date,clock_in,clock_out,was_late,left_early,overtime_hours</code>
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                    Example: <code>1,2025-01-15,2025-01-15 09:00,2025-01-15 17:15,true,false,0.50</code>
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCSVImport}
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Import Data
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
