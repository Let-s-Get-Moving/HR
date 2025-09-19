import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function TimeTracking() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Date filtering and pagination
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const recordsPerPage = 100;

  useEffect(() => {
    loadTimeEntries();
    loadEmployees();
  }, []);

  const loadTimeEntries = async () => {
    try {
      const data = await API("/api/employees/time-entries");
      setTimeEntries(data);
      setFilteredEntries(data);
    } catch (error) {
      console.error("Error loading time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterEntries();
  };

  // Filter entries by date range and search query
  const filterEntries = () => {
    let filtered = [...timeEntries];

    // Apply date filtering
    if (startDate || endDate) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.work_date);
        const start = startDate ? new Date(startDate) : new Date('1900-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-12-31');
        
        return entryDate >= start && entryDate <= end;
      });
    }

    // Apply search filtering
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => {
        const employee = employees.find(emp => emp.id === entry.employee_id);
        const searchableFields = [
          employee?.name || '',
          employee?.first_name || '',
          employee?.last_name || '',
          employee?.email || '',
          employee?.role_title || '',
          employee?.department || '',
          entry.work_date,
          entry.hours_worked?.toString() || '',
          entry.overtime_hours?.toString() || '',
          entry.notes || ''
        ];
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }

    setFilteredEntries(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Apply filters when dates or search query change
  useEffect(() => {
    filterEntries();
  }, [startDate, endDate, timeEntries, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEntries.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
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

      {/* Date Range Filter */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold">Filter by Date Range</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="text-sm text-neutral-400">
            Showing {currentEntries.length} of {filteredEntries.length} entries
            {filteredEntries.length !== timeEntries.length && ` (filtered from ${timeEntries.length} total)`}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-6 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search time entries by employee name, email, role, department, date, hours..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                onClick={() => handleSearch("")}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-neutral-400">
            Found {filteredEntries.length} time entr{filteredEntries.length !== 1 ? 'ies' : 'y'} matching "{searchQuery}"
          </div>
        )}
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
              {currentEntries.map((entry) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-neutral-400">
            Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
