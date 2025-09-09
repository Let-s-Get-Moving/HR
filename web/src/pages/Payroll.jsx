import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

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
      const [periods, structures, deps, emps] = await Promise.all([
        API("/api/payroll/periods"),
        API("/api/payroll/commission-structures"),
        API("/api/employees/departments"),
        API("/api/employees")
      ]);
      
      setPayrollPeriods(periods);
      setCommissionStructures(structures);
      setDepartments(deps);
      setEmployees(emps);
      
      if (periods.length > 0) {
        setSelectedPeriod(periods[0]);
        loadPayrollCalculations(periods[0].id);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollCalculations = async (periodId) => {
    try {
      const calculations = await API(`/api/payroll/calculations/${periodId}`);
      setPayrollCalculations(calculations);
    } catch (error) {
      console.error("Error loading payroll calculations:", error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile || !selectedPeriod) return;

    setImportStatus({ status: "processing", message: "Importing timesheet data..." });
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('period_id', selectedPeriod.id);

      const response = await API("/api/payroll/import-timesheet", {
        method: "POST",
        body: formData
      });

      setImportStatus({ 
        status: "success", 
        message: `Successfully imported ${response.successful_imports} records` 
      });
      
      // Reload calculations after import
      loadPayrollCalculations(selectedPeriod.id);
    } catch (error) {
      setImportStatus({ 
        status: "error", 
        message: "Error importing timesheet data" 
      });
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) return;

    try {
      await API(`/api/payroll/calculate/${selectedPeriod.id}`, { method: "POST" });
      loadPayrollCalculations(selectedPeriod.id);
    } catch (error) {
      console.error("Error calculating payroll:", error);
    }
  };

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
          <h3 className="text-lg font-semibold mb-4">Payroll Period (Bi-weekly)</h3>
          <p className="text-xs text-secondary mb-2">Each period covers 2 weeks (14 days) • 26 periods per year</p>
          <select
            value={selectedPeriod?.id || ""}
            onChange={(e) => {
              const period = payrollPeriods.find(p => p.id === parseInt(e.target.value));
              setSelectedPeriod(period);
              if (period) loadPayrollCalculations(period.id);
            }}
            className="w-full px-3 py-2 input-md"
          >
            {payrollPeriods.map(period => {
              const startDate = new Date(period.start_date);
              const endDate = new Date(period.end_date);
              const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              const periodName = period.period_name || `Period ${period.id}`;
              return (
                <option key={period.id} value={period.id}>
                  {periodName} ({startMonth} - {endMonth})
                </option>
              );
            })}
          </select>
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
                'bg-green-900 text-green-300'
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
                      <td className="px-4 py-2 text-sm font-medium">${calc.total_gross?.toFixed(2)}</td>
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
          <div>
            <label className="block text-sm font-medium mb-2">Select Payroll Period (Bi-weekly)</label>
            <p className="text-xs text-secondary mb-2">Each period covers 2 weeks (14 days) • 26 periods per year</p>
            <select
              value={selectedPeriod?.id || ""}
              onChange={(e) => {
                const period = payrollPeriods.find(p => p.id === parseInt(e.target.value));
                setSelectedPeriod(period);
              }}
              className="w-full px-3 py-2 input-md"
            >
              <option value="">Select a period</option>
              {payrollPeriods.map(period => {
                const startDate = new Date(period.start_date);
                const endDate = new Date(period.end_date);
                const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const periodName = period.period_name || `Period ${period.id}`;
                return (
                  <option key={period.id} value={period.id}>
                    {periodName} ({startMonth} - {endMonth})
                  </option>
                );
              })}
            </select>
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
            disabled={!importFile || !selectedPeriod}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-600 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Import Timesheet Data
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">CSV Format Guide</h3>
        <div className="card-sm">
          <p className="text-sm text-secondary mb-2">Your CSV file should have the following columns:</p>
          <div className="text-xs text-tertiary space-y-1">
            <div><strong>employee_id</strong> - Employee ID number</div>
            <div><strong>work_date</strong> - Date (YYYY-MM-DD format)</div>
            <div><strong>hours_worked</strong> - Regular hours worked</div>
            <div><strong>overtime_hours</strong> - Overtime hours worked</div>
            <div><strong>was_late</strong> - 1 for late, 0 for on time</div>
            <div><strong>left_early</strong> - 1 for early departure, 0 for normal</div>
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
