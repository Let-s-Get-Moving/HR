import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API } from '../config/api.js';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("overview");
  const [payrollSubmissions, setPayrollSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [payrollCalculations, setPayrollCalculations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);

  const tabs = [
    { id: "overview", name: "Payroll Submissions", icon: "📊" },
    { id: "import", name: "Import Payroll Data", icon: "📥" },
    { id: "calculations", name: "Calculations", icon: "🧮" },
    { id: "export", name: "Export Reports", icon: "📤" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Handle search functionality for submissions
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredSubmissions(payrollSubmissions);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = payrollSubmissions.filter(submission => {
      const searchableFields = [
        submission.submission_date || '',
        submission.period_name || '',
        submission.status || '',
        submission.notes || '',
        submission.total_amount?.toString() || '',
        submission.employee_count?.toString() || ''
      ];
      
      return searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
      );
    });

    setFilteredSubmissions(filtered);
  };

  // Update filtered submissions when main submissions list changes
  useEffect(() => {
    handleSearch(searchQuery);
  }, [payrollSubmissions]);

  const loadData = async () => {
    try {
      // Load payroll submissions (each import creates a submission)
      const submissions = await API("/api/payroll/submissions").catch(() => []);
      setPayrollSubmissions(submissions);
      setFilteredSubmissions(submissions);
      
      // Load employees for calculations
      const emps = await API("/api/employees").catch(() => []);
      setEmployees(emps);
      
      // Load calculations for all submissions
      loadPayrollCalculations();
    } catch (error) {
      console.error("Error loading payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollCalculations = async () => {
    try {
      // Load all payroll calculations from all submissions
      const calculations = await API("/api/payroll/calculations").catch(() => []);
      
      console.log(`Loaded ${calculations.length} calculations from all submissions`);
      setPayrollCalculations(calculations);
    } catch (error) {
      console.error("Error loading payroll calculations:", error);
      setPayrollCalculations([]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      setErrorMessage("Please select a CSV file to import");
      setShowErrorMessage(true);
      return;
    }

    setImportStatus({ status: "processing", message: "Reading and importing CSV file..." });
    
    try {
      // Read the CSV file content
      const csvContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(importFile);
      });

      console.log('📥 Importing CSV file:', importFile.name);
      console.log('📝 CSV content preview:', csvContent.substring(0, 200) + '...');

      // Send CSV content to the import API
      const response = await API("/api/imports/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ csv: csvContent })
      });
      
      console.log('✅ Import response:', response);
      
      setImportStatus({
        status: "success",
        message: `Successfully imported ${response.imported_count || 0} time entries!`
      });
      
      setSuccessMessage(`Successfully imported ${response.imported_count || 0} time entries!`);
      setShowSuccessMessage(true);
      
      // Reload data to show new submission
      loadData();
      
    } catch (error) {
      console.error("Error importing CSV:", error);
      setImportStatus({
        status: "error",
        message: `Import failed: ${error.message}`
      });
      
      setErrorMessage(`Import failed: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleCalculatePayroll = async () => {
    try {
      setImportStatus({ status: "processing", message: "Calculating payroll..." });
      
      const response = await API("/api/payroll/calculate", {
        method: "POST"
      });
      
      setImportStatus({
        status: "success",
        message: `Payroll calculated successfully! Processed ${response.calculated_count || 0} employees.`
      });
      
      setSuccessMessage(`Payroll calculated successfully! Processed ${response.calculated_count || 0} employees.`);
      setShowSuccessMessage(true);
      
      // Reload calculations
      loadPayrollCalculations();
      
    } catch (error) {
      console.error("Error calculating payroll:", error);
      setImportStatus({
        status: "error",
        message: `Calculation failed: ${error.message}`
      });
      
      setErrorMessage(`Calculation failed: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await API(`/api/payroll/export/${type}`, {
        method: "GET"
      });
      
      // Create and download file
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccessMessage(`${type} report exported successfully!`);
      setShowSuccessMessage(true);
      
    } catch (error) {
      console.error("Error exporting payroll:", error);
      setErrorMessage(`Export failed: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="card p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search payroll submissions by date, employee, amount..."
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
            Found {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Payroll Submissions List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Payroll Submissions</h3>
          <button
            onClick={() => setActiveTab("import")}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Import New Payroll Data
          </button>
        </div>
        
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <div className="text-4xl mb-4">📊</div>
            <p>No payroll submissions found</p>
            <p className="text-sm mt-2">Import your first payroll data to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((submission, index) => (
              <div
                key={submission.id || index}
                className="bg-neutral-800 p-4 rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer"
                onClick={() => setSelectedSubmission(submission)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-white">
                        Payroll Submission #{submission.id || index + 1}
                      </h4>
                      <span className="px-2 py-1 bg-green-900 text-green-300 text-xs rounded-full">
                        {submission.status || 'Processed'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-neutral-400">
                      <div>
                        <span className="text-neutral-500">Date:</span>
                        <div className="text-white">
                          {submission.submission_date ? 
                            new Date(submission.submission_date).toLocaleDateString() : 
                            'N/A'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500">Period:</span>
                        <div className="text-white">
                          {submission.period_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500">Employees:</span>
                        <div className="text-white">
                          {submission.employee_count || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500">Total Amount:</span>
                        <div className="text-white font-medium">
                          ${submission.total_amount ? submission.total_amount.toLocaleString() : '0.00'}
                        </div>
                      </div>
                    </div>
                    {submission.notes && (
                      <div className="mt-2 text-sm text-neutral-400">
                        <span className="text-neutral-500">Notes:</span> {submission.notes}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderImport = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Import Payroll Data</h3>
        
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700/30 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300 mb-2">📋 CSV File Requirements</h4>
            <div className="text-xs text-blue-200/80 space-y-1">
              <p><strong>Required columns:</strong> employee_id, work_date</p>
              <p><strong>Optional columns:</strong> clock_in, clock_out, hours_worked, overtime_hours, was_late, left_early</p>
              <p><strong>Date format:</strong> work_date should be YYYY-MM-DD (e.g., 2025-08-15)</p>
              <p><strong>Time format:</strong> clock_in/clock_out should be HH:MM:SS (e.g., 09:00:00, 17:30:00)</p>
            </div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg">
            <p className="text-xs text-amber-200">
              💡 <strong>Smart Import:</strong> Dates will be automatically extracted from the CSV file. 
              If hours_worked is not provided, it will be calculated from clock_in and clock_out times.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="payroll-upload"
              />
              <label htmlFor="payroll-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-neutral-400">
                  {importFile ? importFile.name : "Click to upload payroll CSV"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">CSV format: Employee ID, Date, Hours, Overtime Hours</p>
              </label>
            </div>
          </div>

          {importStatus && (
            <div className={`p-4 rounded-lg ${
              importStatus.status === 'success' ? 'bg-green-900 text-green-300' :
              importStatus.status === 'error' ? 'bg-red-900 text-red-300' :
              'bg-blue-900 text-blue-300'
            }`}>
              {importStatus.message}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleImport}
              disabled={!importFile}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-600 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Import Payroll Data
            </button>
            <button
              onClick={handleCalculatePayroll}
              className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Calculate Payroll
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📋 CSV Format Guide & Sample</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2 text-neutral-300">Sample CSV Content:</h4>
            <div className="bg-neutral-900 p-3 rounded-lg text-xs font-mono text-green-400 overflow-x-auto">
              <pre>{`employee_id,work_date,clock_in,clock_out,hours_worked,overtime_hours,was_late,left_early
1,2025-08-15,09:00:00,17:30:00,8.5,0.5,false,false
2,2025-08-15,08:45:00,17:00:00,8.25,0.25,false,false
1,2025-08-16,09:15:00,17:30:00,8.25,0.25,true,false
3,2025-08-16,09:00:00,18:00:00,9.0,1.0,false,false`}</pre>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2 text-neutral-300">Column Descriptions:</h4>
            <div className="text-xs text-neutral-400 space-y-1">
              <div><strong className="text-neutral-300">employee_id</strong> - Employee ID number (required)</div>
              <div><strong className="text-neutral-300">work_date</strong> - Date in YYYY-MM-DD format (required)</div>
              <div><strong className="text-neutral-300">clock_in</strong> - Clock in time in HH:MM:SS format (optional)</div>
              <div><strong className="text-neutral-300">clock_out</strong> - Clock out time in HH:MM:SS format (optional)</div>
              <div><strong className="text-neutral-300">hours_worked</strong> - Total hours worked (calculated if not provided)</div>
              <div><strong className="text-neutral-300">overtime_hours</strong> - Overtime hours (optional, defaults to 0)</div>
              <div><strong className="text-neutral-300">was_late</strong> - true/false (optional, defaults to false)</div>
              <div><strong className="text-neutral-300">left_early</strong> - true/false (optional, defaults to false)</div>
            </div>
          </div>
          
          <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-lg">
            <p className="text-xs text-green-200">
              ✅ <strong>Flexible Import:</strong> The system will automatically calculate hours_worked from clock_in/clock_out if not provided. 
              Dates are extracted from each row, so no date range selection is needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalculations = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Payroll Calculations</h3>
        <p className="text-neutral-400 mb-4">
          View all payroll calculations from all submissions
        </p>
        
        {payrollCalculations.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <div className="text-4xl mb-4">🧮</div>
            <p>No payroll calculations found</p>
            <p className="text-sm mt-2">Import payroll data and run calculations to see results</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-3 px-4">Employee</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-right py-3 px-4">Hours</th>
                  <th className="text-right py-3 px-4">Overtime</th>
                  <th className="text-right py-3 px-4">Gross Pay</th>
                  <th className="text-right py-3 px-4">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {payrollCalculations.map((calc, index) => {
                  const employee = employees.find(emp => emp.id === calc.employee_id);
                  return (
                    <tr key={calc.id || index} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">
                          {employee?.name || `Employee ${calc.employee_id}`}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {employee?.role_title || 'Unknown Role'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">
                        {calc.work_date ? new Date(calc.work_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-300">
                        {calc.hours_worked || 0}h
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-300">
                        {calc.overtime_hours || 0}h
                      </td>
                      <td className="py-3 px-4 text-right text-white font-medium">
                        ${(calc.gross_pay || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-medium">
                        ${(calc.net_pay || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderExport = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Export Payroll Reports</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleExport("Summary")}
            className="bg-green-600 hover:bg-green-700 p-4 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Payroll Summary</div>
            <div className="text-sm text-neutral-300">Total payroll overview</div>
          </button>

          <button
            onClick={() => handleExport("Detailed")}
            className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">Detailed Report</div>
            <div className="text-sm text-neutral-300">Employee-by-employee breakdown</div>
          </button>

          <button
            onClick={() => handleExport("Bank_Transfer")}
            className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">🏦</div>
            <div className="font-medium">Bank Transfer</div>
            <div className="text-sm text-neutral-300">Direct deposit file</div>
          </button>

          <button
            onClick={() => handleExport("Tax_Report")}
            className="bg-orange-600 hover:bg-orange-700 p-4 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium">Tax Report</div>
            <div className="text-sm text-neutral-300">Tax filing information</div>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading payroll data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto rounded-2xl">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Payroll Management</h1>
            <p className="text-neutral-400">Manage payroll, timesheet imports, and calculations</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-neutral-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "import" && renderImport()}
          {activeTab === "calculations" && renderCalculations()}
          {activeTab === "export" && renderExport()}
        </div>

        {/* Success Message Modal */}
        {showSuccessMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-lg mx-4"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Success</h3>
                </div>
                <div className="mb-6">
                  <p className="text-neutral-300">{successMessage}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSuccessMessage(false)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Error Message Modal */}
        {showErrorMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card w-full max-w-lg mx-4"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Error</h3>
                </div>
                <div className="mb-6">
                  <p className="text-neutral-300">{errorMessage}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowErrorMessage(false)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}