import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API } from '../config/api.js';
import { formatShortDate, toYMD } from '../utils/timezone.js';

export default function PayrollV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const [payrolls, setPayrolls] = useState([]);
  const [payPeriods, setPayPeriods] = useState([]);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(null);
  const [vacationBalances, setVacationBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [nextPayPeriod, setNextPayPeriod] = useState(null);
  
  // Date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Vacation payout dialog
  const [vacationPayoutDialog, setVacationPayoutDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [vacationHoursToPay, setVacationHoursToPay] = useState("");

  const tabs = [
    { id: "overview", name: "Payroll Overview", icon: "��" },
    { id: "vacation", name: "Vacation Balances", icon: "🏖️" },
    { id: "history", name: "Payment History", icon: "📋" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load payrolls - USE SIMPLE ENDPOINT THAT WORKS NOW!
      const payrollsData = await API("/api/payroll-simple/calculate-live").catch(() => []);
      setPayrolls(payrollsData);
      
      // Load pay periods from timecards
      const periodsData = await API("/api/payroll-simple/periods").catch(() => []);
      setPayPeriods(periodsData);
      
      // Load vacation balances (keep v2 if it works, otherwise skip)
      const vacationData = await API("/api/payroll-v2/vacation/balances").catch(() => []);
      setVacationBalances(vacationData);
      
      // Get next pay period
      const next = await API("/api/payroll-simple/next-period").catch(() => null);
      setNextPayPeriod(next);
      
      // Pre-fill date filters with current pay period
      if (next) {
        setStartDate(next.period_start);
        setEndDate(next.period_end);
      }
      
    } catch (error) {
      console.error("Error loading payroll data:", error);
      setErrorMessage("Failed to load payroll data");
      setShowErrorMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVacationPayout = async () => {
    if (!selectedEmployee || !vacationHoursToPay) {
      setErrorMessage("Please enter vacation hours to pay out");
      setShowErrorMessage(true);
      return;
    }

    try {
      const response = await API("/api/payroll-v2/vacation/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmployee.employee_id,
          vacation_hours_paid: parseFloat(vacationHoursToPay),
          payout_date: toYMD(new Date()),
        }),
      });

      setSuccessMessage(
        `Vacation payout successful! Paid out ${vacationHoursToPay} hours ($${response.vacation_pay_amount.toFixed(2)})`
      );
      setShowSuccessMessage(true);
      setVacationPayoutDialog(false);
      setSelectedEmployee(null);
      setVacationHoursToPay("");
      await loadData();
    } catch (error) {
      console.error("Error processing vacation payout:", error);
      setErrorMessage(`Failed to process vacation payout: ${error.message || error.error}`);
      setShowErrorMessage(true);
    }
  };

  const applyDateFilter = async () => {
    try {
      setLoading(true);
      let url = "/api/payroll-simple/calculate-live?";
      if (startDate) url += `pay_period_start=${startDate}&`;
      if (endDate) url += `pay_period_end=${endDate}`;
      
      const filteredData = await API(url).catch(() => []);
      setPayrolls(filteredData);
    } catch (error) {
      console.error("Error filtering payrolls:", error);
      setErrorMessage("Failed to filter payrolls");
      setShowErrorMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilter = async () => {
    setStartDate("");
    setEndDate("");
    await loadData();
  };

  // Format hours as HH:MM
  const formatHours = (hours) => {
    const h = Math.floor(hours || 0);
    const m = Math.round(((hours || 0) - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tahoe-bg-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tahoe-accent mx-auto"></div>
            <p className="mt-4 text-tahoe-text-muted">Loading payroll data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tahoe-bg-primary text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-tahoe-text-primary">Payroll Management</h1>
          <p className="text-tahoe-text-secondary">
            Automatically calculated from approved timecards (hourly rate × hours)
          </p>
          <p className="text-sm text-tahoe-text-muted mt-1">
            ⚡ Payroll is automatically created when ALL timecards for an employee/period are approved
          </p>
        </div>

        {/* Success/Error Messages */}
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg flex justify-between items-center"
          >
            <span>{successMessage}</span>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="text-green-300 hover:text-green-100"
            >
              ✕
            </button>
          </motion.div>
        )}

        {showErrorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex justify-between items-center"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setShowErrorMessage(false)}
              className="text-red-300 hover:text-red-100"
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-all duration-tahoe border-b-2 ${
                activeTab === tab.id
                  ? "text-tahoe-text-primary"
                  : "border-transparent text-tahoe-text-muted hover:text-tahoe-text-primary"
              }`}
              style={activeTab === tab.id ? { borderColor: '#0A84FF' } : {}}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-tahoe-input p-6 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <div className="text-sm text-tahoe-text-muted mb-1">Next Pay Date</div>
                <div className="text-2xl font-bold text-tahoe-accent">
                  {nextPayPeriod ? formatShortDate(nextPayPeriod.pay_date) : "N/A"}
                </div>
              </div>

              <div className="rounded-tahoe-input p-6 border">
                <div className="text-sm text-tahoe-text-muted mb-1">Total Employees</div>
                <div className="text-2xl font-bold">
                  {vacationBalances.length}
                </div>
              </div>

              <div className="rounded-tahoe-input p-6 border">
                <div className="text-sm text-tahoe-text-muted mb-1">Total Vacation Balance</div>
                <div className="text-2xl font-bold text-green-400">
                  $
                  {vacationBalances
                    .reduce((sum, emp) => sum + parseFloat(emp.vacation_pay_balance || 0), 0)
                    .toFixed(2)}
                </div>
              </div>

              <div className="rounded-tahoe-input p-6 border">
                <div className="text-sm text-tahoe-text-muted mb-1">Pay Periods</div>
                <div className="text-2xl font-bold">{payPeriods.length}</div>
              </div>
            </div>

            {/* Pay Periods List */}
            <div className="rounded-tahoe-input border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Pay Periods</h2>
              </div>

              <div className="divide-y">
                {payPeriods.length === 0 ? (
                  <div className="p-8 text-center text-tahoe-text-muted">
                    <div className="text-4xl mb-4">💰</div>
                    <p>No payroll records found</p>
                    <p className="text-sm mt-2">Payroll will appear automatically when timecards are approved</p>
                  </div>
                ) : (
                  payPeriods.map((period, index) => (
                    <div key={index} className="p-6 hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
                         onClick={() => setSelectedPayPeriod(period)}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {formatShortDate(period.pay_period_start)} -{" "}
                            {formatShortDate(period.pay_period_end)}
                          </h3>
                          <p className="text-sm text-tahoe-text-muted">
                            Pay Date: {formatShortDate(period.pay_date)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-tahoe-text-muted">Employees</div>
                          <div className="text-lg font-semibold">{period.employee_count || 0}</div>
                        </div>
                        <div>
                          <div className="text-sm text-tahoe-text-muted">Gross Pay</div>
                          <div className="text-lg font-semibold">${parseFloat(period.total_gross_pay || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-tahoe-text-muted">Net Pay</div>
                          <div className="text-lg font-semibold">${parseFloat(period.total_net_pay || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-tahoe-text-muted">Vacation Accrued</div>
                          <div className="text-lg font-semibold text-green-400">
                            ${parseFloat(period.total_vacation_accrued || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vacation Balances Tab */}
        {activeTab === "vacation" && (
          <div className="space-y-6">
            <div className="rounded-tahoe-input border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Employee Vacation Balances</h2>
                <p className="text-sm text-tahoe-text-muted mt-1">
                  Employees accrue 4% vacation pay on all hours worked
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-tahoe-bg-secondary">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-tahoe-text-muted">Employee</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Hourly Rate</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Hours Balance</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Pay Balance</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Total Earned</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Total Paid</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-tahoe-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vacationBalances.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-tahoe-text-muted">
                          <div className="text-4xl mb-4">🏖️</div>
                          <p>No vacation balance records yet</p>
                          <p className="text-sm mt-2">Balances will appear after payroll is calculated</p>
                        </td>
                      </tr>
                    ) : (
                      vacationBalances.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-tahoe-bg-hover">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium">
                                {emp.first_name} {emp.last_name}
                              </div>
                              <div className="text-sm text-tahoe-text-muted">{emp.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">${parseFloat(emp.hourly_rate || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            {formatHours(parseFloat(emp.vacation_hours_balance || 0))}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-green-400">
                            ${parseFloat(emp.vacation_pay_balance || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-tahoe-text-muted">
                            ${parseFloat(emp.vacation_pay_earned || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-tahoe-text-muted">
                            ${parseFloat(emp.vacation_pay_paid || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setVacationPayoutDialog(true);
                              }}
                              disabled={parseFloat(emp.vacation_hours_balance || 0) <= 0}
                              className={`btn-primary btn-sm ${
                                parseFloat(emp.vacation_hours_balance || 0) <= 0
                                  ? "bg-tahoe-bg-quaternary text-tahoe-text-muted cursor-not-allowed opacity-50"
                                  : ""
                              }`}
                            >
                              Pay Out
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="rounded-tahoe-input border p-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-tahoe-input border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-tahoe-input border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                  />
                </div>
                <button
                  onClick={applyDateFilter}
                  className="btn-primary"
                >
                  Apply Filter
                </button>
                <button
                  onClick={clearDateFilter}
                  className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded-tahoe-input border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Payment History</h2>
                <p className="text-sm text-tahoe-text-muted mt-1">
                  All payroll records (automatically calculated from approved timecards)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-tahoe-bg-secondary">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-tahoe-text-muted">Employee</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-tahoe-text-muted">Pay Period</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-tahoe-text-muted">Pay Date</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Hours</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Gross Pay</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Vacation Accrued</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-tahoe-text-muted">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payrolls.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-tahoe-text-muted">
                          <div className="text-4xl mb-4">📋</div>
                          <p>No payroll history yet</p>
                          <p className="text-sm mt-2">Payroll will appear when timecards are approved</p>
                        </td>
                      </tr>
                    ) : (
                      payrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-tahoe-bg-hover">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium">
                                {payroll.first_name} {payroll.last_name}
                              </div>
                              <div className="text-sm text-tahoe-text-muted">{payroll.department || "N/A"}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {formatShortDate(payroll.pay_period_start)} -{" "}
                            {formatShortDate(payroll.pay_period_end)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {formatShortDate(payroll.pay_date)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {formatHours(parseFloat(payroll.regular_hours || 0))}
                            {parseFloat(payroll.overtime_hours || 0) > 0 && (
                              <span className="text-yellow-400">
                                {" "}
                                +{formatHours(parseFloat(payroll.overtime_hours))} OT
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            ${parseFloat(payroll.gross_pay || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-green-400 text-sm">
                            ${parseFloat(payroll.vacation_pay_accrued || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">
                            ${parseFloat(payroll.net_pay || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Vacation Payout Dialog */}
        {vacationPayoutDialog && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-tahoe-card-bg rounded-lg p-6 max-w-md w-full mx-4 border border-tahoe-border-primary"
            >
              <h3 className="text-xl font-semibold mb-4">Vacation Payout</h3>

              <div className="mb-6">
                <div className="mb-4">
                  <div className="text-sm text-tahoe-text-muted">Employee</div>
                  <div className="font-medium">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </div>
                </div>

                <div className="bg-tahoe-bg-secondary rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-tahoe-text-muted">Available Hours</div>
                      <div className="text-lg font-semibold">
                        {formatHours(parseFloat(selectedEmployee.vacation_hours_balance || 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-tahoe-text-muted">Available Pay</div>
                      <div className="text-lg font-semibold text-green-400">
                        ${parseFloat(selectedEmployee.vacation_pay_balance || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hours to Pay Out
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={parseFloat(selectedEmployee.vacation_hours_balance || 0)}
                    value={vacationHoursToPay}
                    onChange={(e) => setVacationHoursToPay(e.target.value)}
                    className="w-full rounded-tahoe-input border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    placeholder="0.00"
                  />
                  <div className="text-xs text-tahoe-text-muted mt-1">
                    Max: {formatHours(parseFloat(selectedEmployee.vacation_hours_balance || 0))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setVacationPayoutDialog(false);
                    setSelectedEmployee(null);
                    setVacationHoursToPay("");
                  }}
                  className="flex-1 px-4 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVacationPayout}
                  disabled={!vacationHoursToPay || parseFloat(vacationHoursToPay) <= 0}
                  className={`flex-1 btn-primary ${
                    !vacationHoursToPay || parseFloat(vacationHoursToPay) <= 0
                      ? "bg-tahoe-bg-secondary text-tahoe-text-muted cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >
                  Process Payout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
