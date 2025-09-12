import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';
import { getCurrentYearPeriods, getCurrentPeriod, formatPeriodName } from '../utils/payrollPeriods.js';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("overview");
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollCalculations, setPayrollCalculations] = useState([]);
  const [commissionStructures, setCommissionStructures] = useState([]);
  const [bonusStructures, setBonusStructures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const tabs = [
    { id: "overview", name: "Payroll Overview", icon: "📊" },
    { id: "import", name: "Import Timesheets", icon: "📥" },
    { id: "calculations", name: "Calculations", icon: "🧮" },
    { id: "commissions", name: "Commissions", icon: "💰" },
    { id: "bonuses", name: "Bonuses", icon: "🎁" },
    { id: "export", name: "Export Reports", icon: "📤" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load ONLY database periods - no frontend generation at all
      const apiPeriods = await API("/api/payroll/periods").catch(() => []);
      
      // Filter for 2025-2026 periods ONLY and sort by date
      const periods2025_2026 = apiPeriods
        .filter(p => {
          const startYear = new Date(p.start_date).getFullYear();
          return startYear >= 2025 && startYear <= 2026;
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      
      console.log('Loaded periods:', periods2025_2026.length, 'periods for 2025-2026');
      setPayrollPeriods(periods2025_2026);
      
      // Select the first 2025 period as default and set date range
      const defaultPeriod = periods2025_2026.find(p => new Date(p.start_date).getFullYear() === 2025) || periods2025_2026[0];
      setSelectedPeriod(defaultPeriod);
      
      // Set default date range (August 2025 since it has the most data)
      const augustPeriod = periods2025_2026.find(p => p.period_name.includes('August')) || defaultPeriod;
      if (augustPeriod) {
        setStartDate(augustPeriod.start_date.substring(0, 10));
        setEndDate(augustPeriod.end_date.substring(0, 10));
      }
      
      // Load other data from API
      const [structures, deps, emps] = await Promise.all([
        API("/api/payroll/commission-structures").catch(() => []),
        API("/api/employees/departments").catch(() => []),
        API("/api/employees").catch(() => [])
      ]);
      
      setCommissionStructures(structures);
      setDepartments(deps);
      setEmployees(emps);
      
      // Load calculations for the selected period
      if (defaultPeriod) {
        loadPayrollCalculations(defaultPeriod.id);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollCalculations = async (periodId) => {
    try {
      // Try to load calculations for any period ID
      // If the period doesn't exist in database, API will return empty array
      const calculations = await API(`/api/payroll/calculations?periodId=${periodId}`);
      setPayrollCalculations(calculations);
    } catch (error) {
      console.error("Error loading payroll calculations:", error);
      // Set empty calculations on error to prevent UI issues
      setPayrollCalculations([]);
    }
  };

  const loadPayrollByDateRange = async (start, end) => {
    try {
      // Find or create a temporary period for this date range
      const tempPeriodName = `${start} to ${end}`;
      
      // First, try to find an existing period that matches these dates
      const matchingPeriod = payrollPeriods.find(p => 
        p.start_date.substring(0, 10) === start && p.end_date.substring(0, 10) === end
      );
      
      if (matchingPeriod) {
        // Use existing period
        const calculations = await API(`/api/payroll/calculations?periodId=${matchingPeriod.id}`);
        setPayrollCalculations(calculations);
        setSelectedPeriod(matchingPeriod);
      } else {
        // Create a temporary period for this date range
        try {
          const newPeriod = await API("/api/payroll/periods", {
            method: "POST",
            body: JSON.stringify({
              period_name: tempPeriodName,
              start_date: start,
              end_date: end,
              pay_date: end // Use end date as pay date
            })
          });
          
          setSelectedPeriod(newPeriod);
          setPayrollCalculations([]); // No calculations yet for new period
          
        } catch (createError) {
          console.error("Could not create period for date range:", createError);
          setPayrollCalculations([]);
        }
      }
    } catch (error) {
      console.error("Error loading payroll by date range:", error);
      setPayrollCalculations([]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Please select a CSV file to import");
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
        message: `Import completed! ${response.inserted} records imported, ${response.skipped || 0} skipped out of ${response.total} total.`
      });
      
      setImportFile(null);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      // Refresh payroll data if we have a date range selected
      if (startDate && endDate) {
        await handleDateRangeChange();
      }
      
    } catch (error) {
      console.error("Error importing timesheet:", error);
      setImportStatus({
        status: "error",
        message: `Error importing timesheet: ${error.message}`
      });
    }
  };

  const handleCalculatePayroll = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      console.log('Starting payroll calculation for date range:', startDate, 'to', endDate);
      
      // First ensure we have a period for this date range
      await loadPayrollByDateRange(startDate, endDate);
      
      // Get the current selected period (should be set by loadPayrollByDateRange)
      const currentPeriod = selectedPeriod;
      
      if (!currentPeriod) {
        // Try to find existing period that matches the date range
        const matchingPeriod = payrollPeriods.find(p => 
          p.start_date.substring(0, 10) === startDate && p.end_date.substring(0, 10) === endDate
        );
        
        if (matchingPeriod) {
          console.log('Using existing period:', matchingPeriod.period_name, 'ID:', matchingPeriod.id);
          
          try {
            // Calculate payroll using existing period
            const response = await API(`/api/payroll/calculate/${matchingPeriod.id}`, { method: "POST" });
            console.log('Payroll calculation API response:', response);
            
            // Load the results
            await loadPayrollCalculations(matchingPeriod.id);
            
            console.log('Payroll calculation completed successfully');
            alert('Payroll calculated successfully! Check the calculations below.');
            
          } catch (calcError) {
            console.error('Payroll calculation API error:', calcError);
            throw new Error(`Payroll calculation failed: ${calcError.message}`);
          }
          
        } else {
          throw new Error('No period found for the selected date range. Please select dates that match an existing payroll period.');
        }
      } else {
        console.log('Calculating payroll for period:', currentPeriod.period_name);
        
        // Calculate payroll using the current period
        await API(`/api/payroll/calculate/${currentPeriod.id}`, { method: "POST" });
        await loadPayrollCalculations(currentPeriod.id);
        
        console.log('Payroll calculation completed successfully');
        alert('Payroll calculated successfully!');
      }
      
    } catch (error) {
      console.error("Error calculating payroll:", error);
      alert(`Unable to calculate payroll for ${startDate} to ${endDate}. Error: ${error.message}`);
    }
  };

  const handleDateRangeChange = async () => {
    if (startDate && endDate) {
      await loadPayrollByDateRange(startDate, endDate);
    }
  };

  // Auto-load data when dates change
  useEffect(() => {
    if (startDate && endDate && payrollPeriods.length > 0) {
      handleDateRangeChange();
    }
  }, [startDate, endDate, payrollPeriods]);

  const handleExport = async (type) => {
    if (!selectedPeriod) return;

    try {
      const response = await API(`/api/payroll/export/${selectedPeriod.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export_type: type })
      });

      // Create download link
      const link = document.createElement('a');
      link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(response.data)}`;
      link.download = `${type}_${selectedPeriod.period_name}.csv`;
      link.click();
    } catch (error) {
      console.error("Error exporting payroll:", error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">📅 Payroll Date Range</h3>
          <p className="text-xs text-secondary mb-4">Select custom date range for payroll calculation</p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setStartDate('2025-08-01');
                  setEndDate('2025-08-31');
                }}
                className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs transition-colors"
              >
                Aug 2025
              </button>
              <button
                onClick={() => {
                  setStartDate('2025-09-01');
                  setEndDate('2025-09-30');
                }}
                className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs transition-colors"
              >
                Sep 2025
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setStartDate(firstDay.toISOString().substring(0, 10));
                  setEndDate(lastDay.toISOString().substring(0, 10));
                }}
                className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs transition-colors"
              >
                This Month
              </button>
            </div>
            
            {startDate && endDate && (
              <div className="bg-neutral-800 p-2 rounded text-xs text-neutral-400">
                📊 Range: {startDate} to {endDate}
                <br />
                🗓️ Days: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleCalculatePayroll}
              className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Calculate Payroll
            </button>
            <button
              onClick={() => handleExport("Summary")}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Export Summary
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Period Status</h3>
          <div className="text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedPeriod?.status === 'Open' ? 'bg-yellow-900 text-yellow-300' :
                selectedPeriod?.status === 'Processing' ? 'bg-blue-900 text-blue-300' :
                selectedPeriod?.status === 'Closed' ? 'bg-green-900 text-green-300' :
                'bg-gray-900 text-gray-300'
              }`}>
                {selectedPeriod?.status || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span>Pay Date:</span>
              <span>{selectedPeriod?.pay_date ? new Date(selectedPeriod.pay_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Payroll Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/10">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Employee</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Department</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Regular Hours</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Overtime</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Regular Pay</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Overtime Pay</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Commission</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Bonus</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Gross Pay</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Deductions</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {payrollCalculations.map((calc) => {
                  const employee = employees.find(e => e.id === calc.employee_id);
                  return (
                    <tr key={calc.id} className="hover:bg-secondary/5">
                      <td className="px-4 py-2 text-sm">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'}
                      </td>
                      <td className="px-4 py-2 text-sm">{employee?.department || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">{calc.base_hours}</td>
                      <td className="px-4 py-2 text-sm">{calc.overtime_hours}</td>
                      <td className="px-4 py-2 text-sm">${calc.regular_pay?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">${calc.overtime_pay?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">${calc.commission_amount?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">${calc.bonus_amount?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm font-medium">${calc.total_pay?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">${calc.deductions?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm font-bold">${calc.net_pay?.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderImport = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Import Timesheet Data</h3>
        
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
                id="timesheet-upload"
              />
              <label htmlFor="timesheet-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-neutral-400">
                  {importFile ? importFile.name : "Click to upload timesheet CSV"}
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

          <button
            onClick={handleImport}
            disabled={!importFile}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Import Timesheet Data
          </button>
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
        <h3 className="text-lg font-semibold mb-4">Automatic Payroll Calculations</h3>
        <p className="text-neutral-400 mb-4">
          The system automatically calculates regular pay, overtime, commissions, and bonuses based on:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-sm">
            <h4 className="font-medium mb-3">Regular Pay Calculation</h4>
            <div className="text-sm text-secondary space-y-1">
              <div>• Base Hours × Hourly Rate</div>
              <div>• Overtime Hours × (Hourly Rate × 1.5)</div>
              <div>• Automatic ESA compliance</div>
            </div>
          </div>

          <div className="card-sm">
            <h4 className="font-medium mb-3">Commission Calculation</h4>
            <div className="text-sm text-secondary space-y-1">
              <div>• Department-specific structures</div>
              <div>• Performance-based calculations</div>
              <div>• Tiered commission rates</div>
            </div>
          </div>

          <div className="card-sm">
            <h4 className="font-medium mb-3">Bonus Calculation</h4>
            <div className="text-sm text-secondary space-y-1">
              <div>• Performance bonuses</div>
              <div>• Attendance bonuses</div>
              <div>• Quality excellence bonuses</div>
            </div>
          </div>

          <div className="card-sm">
            <h4 className="font-medium mb-3">Deductions</h4>
            <div className="text-sm text-secondary space-y-1">
              <div>• Tax deductions</div>
              <div>• Benefits contributions</div>
              <div>• Other deductions</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCalculatePayroll}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Recalculate Payroll
        </button>
      </div>
    </div>
  );

  const renderCommissions = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Commission Structures by Department</h3>
        
        <div className="space-y-4">
          {departments.map(dept => {
            const structures = commissionStructures.filter(s => s.department_id === dept.id);
            return (
              <div key={dept.id} className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">{dept.name}</h4>
                {structures.length > 0 ? (
                  <div className="space-y-2">
                    {structures.map(structure => (
                      <div key={structure.id} className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-300">{structure.structure_name}</span>
                          <span className="text-neutral-400">{structure.commission_type}</span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          Base: {structure.base_percentage}% | Target: ${structure.target_amount} | Multiplier: {structure.bonus_multiplier}x
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">No commission structure defined</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderBonuses = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Bonus Structures by Department</h3>
        
        <div className="space-y-4">
          {departments.map(dept => {
            const structures = bonusStructures.filter(s => s.department_id === dept.id);
            return (
              <div key={dept.id} className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">{dept.name}</h4>
                {structures.length > 0 ? (
                  <div className="space-y-2">
                    {structures.map(structure => (
                      <div key={structure.id} className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-300">{structure.bonus_name}</span>
                          <span className="text-neutral-400">{structure.bonus_type}</span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          Method: {structure.calculation_method} | Base: ${structure.base_amount} | Rate: {structure.percentage_rate}%
                        </div>
                        <div className="text-xs text-neutral-500">
                          Criteria: {structure.eligibility_criteria}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">No bonus structure defined</p>
                )}
              </div>
            );
          })}
        </div>
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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Payroll Management</h1>
        <p className="text-neutral-400 mt-1">Manage payroll, commissions, bonuses, and timesheet imports</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
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
        {activeTab === "commissions" && renderCommissions()}
        {activeTab === "bonuses" && renderBonuses()}
        {activeTab === "export" && renderExport()}
      </div>
    </div>
  );
}
