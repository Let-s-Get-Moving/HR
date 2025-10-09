import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API } from '../config/api.js';

export default function PayrollV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState(null);
  const [vacationBalances, setVacationBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [nextPayPeriod, setNextPayPeriod] = useState(null);
  const [currentPayPeriod, setCurrentPayPeriod] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Vacation payout dialog
  const [vacationPayoutDialog, setVacationPayoutDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [vacationHoursToPay, setVacationHoursToPay] = useState("");

  const tabs = [
    { id: "overview", name: "Payroll Overview", icon: "💰" },
    { id: "generate", name: "Generate Payroll", icon: "⚡" },
    { id: "vacation", name: "Vacation Balances", icon: "🏖️" },
    { id: "history", name: "Payment History", icon: "📋" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load payrolls
      const payrollsData = await API("/api/payroll-v2/").catch(() => []);
      setPayrolls(payrollsData);
      
      // Load vacation balances
      const vacationData = await API("/api/payroll-v2/vacation/balances").catch(() => []);
      setVacationBalances(vacationData);
      
      // Load pay period info
      const next = await API("/api/payroll-v2/next-pay-period").catch(() => null);
      setNextPayPeriod(next);
      
      const current = await API("/api/payroll-v2/current-pay-period").catch(() => null);
      setCurrentPayPeriod(current);
      
    } catch (error) {
      console.error("Error loading payroll data:", error);
      setErrorMessage("Failed to load payroll data");
      setShowErrorMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!nextPayPeriod) {
      setErrorMessage("Could not determine next pay period");
      setShowErrorMessage(true);
      return;
    }

    setGenerating(true);
    try {
      const response = await API("/api/payroll-v2/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pay_period_start: nextPayPeriod.period_start,
          pay_period_end: nextPayPeriod.period_end,
          pay_date: nextPayPeriod.pay_date,
        }),
      });

      setSuccessMessage(
        `Payroll generated successfully! Processed ${response.success.length} employees. Total: $${response.summary.total_gross_pay.toFixed(2)}`
      );
      setShowSuccessMessage(true);
      setGenerateDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      setErrorMessage(`Failed to generate payroll: ${error.message}`);
      setShowErrorMessage(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprovePayroll = async (payrollId) => {
    try {
      await API(`/api/payroll-v2/${payrollId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      setSuccessMessage("Payroll approved successfully!");
      setShowSuccessMessage(true);
      await loadData();
    } catch (error) {
      console.error("Error approving payroll:", error);
      setErrorMessage(`Failed to approve payroll: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleMarkPaid = async (payrollId) => {
    try {
      await API(`/api/payroll-v2/${payrollId}/mark-paid`, {
        method: "POST",
      });

      setSuccessMessage("Payroll marked as paid!");
      setShowSuccessMessage(true);
      await loadData();
    } catch (error) {
      console.error("Error marking payroll as paid:", error);
      setErrorMessage(`Failed to mark payroll as paid: ${error.message}`);
      setShowErrorMessage(true);
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
          payout_date: new Date().toISOString().split('T')[0],
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

  // Group payrolls by pay period
  const groupedPayrolls = payrolls.reduce((acc, payroll) => {
    const key = `${payroll.pay_period_start}_${payroll.pay_period_end}`;
    if (!acc[key]) {
      acc[key] = {
        period_start: payroll.pay_period_start,
        period_end: payroll.pay_period_end,
        pay_date: payroll.pay_date,
        status: payroll.status,
        payrolls: [],
        total_gross: 0,
        total_net: 0,
        total_vacation: 0,
      };
    }
    acc[key].payrolls.push(payroll);
    acc[key].total_gross += parseFloat(payroll.gross_pay || 0);
    acc[key].total_net += parseFloat(payroll.net_pay || 0);
    acc[key].total_vacation += parseFloat(payroll.vacation_pay_accrued || 0);
    return acc;
  }, {});

  const payPeriods = Object.values(groupedPayrolls).sort((a, b) => 
    new Date(b.pay_date) - new Date(a.pay_date)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-neutral-400">Loading payroll data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Payroll Management</h1>
          <p className="text-neutral-400">
            Automated payroll calculation based on timecard hours
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
        <div className="flex space-x-2 mb-6 border-b border-neutral-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
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
              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="text-sm text-neutral-400 mb-1">Next Pay Date</div>
                <div className="text-2xl font-bold text-indigo-400">
                  {nextPayPeriod ? new Date(nextPayPeriod.pay_date).toLocaleDateString() : "N/A"}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="text-sm text-neutral-400 mb-1">Total Employees</div>
                <div className="text-2xl font-bold">
                  {vacationBalances.length}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="text-sm text-neutral-400 mb-1">Total Vacation Balance</div>
                <div className="text-2xl font-bold text-green-400">
                  $
                  {vacationBalances
                    .reduce((sum, emp) => sum + parseFloat(emp.vacation_pay_balance || 0), 0)
                    .toFixed(2)}
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
                <div className="text-sm text-neutral-400 mb-1">Pay Periods</div>
                <div className="text-2xl font-bold">{payPeriods.length}</div>
              </div>
            </div>

            {/* Pay Periods List */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-semibold">Pay Periods</h2>
              </div>

              <div className="divide-y divide-neutral-800">
                {payPeriods.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400">
                    <div className="text-4xl mb-4">💰</div>
                    <p>No payroll records found</p>
                    <p className="text-sm mt-2">Generate your first payroll to get started</p>
                  </div>
                ) : (
                  payPeriods.map((period, index) => (
                    <div key={index} className="p-6 hover:bg-neutral-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {new Date(period.period_start).toLocaleDateString()} -{" "}
                            {new Date(period.period_end).toLocaleDateString()}
                          </h3>
                          <p className="text-sm text-neutral-400">
                            Pay Date: {new Date(period.pay_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            period.status === "Paid"
                              ? "bg-green-900/50 text-green-300"
                              : period.status === "Approved"
                              ? "bg-blue-900/50 text-blue-300"
                              : "bg-yellow-900/50 text-yellow-300"
                          }`}
                        >
                          {period.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-neutral-400">Employees</div>
                          <div className="text-lg font-semibold">{period.payrolls.length}</div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-400">Gross Pay</div>
                          <div className="text-lg font-semibold">${period.total_gross.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-400">Net Pay</div>
                          <div className="text-lg font-semibold">${period.total_net.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-neutral-400">Vacation Accrued</div>
                          <div className="text-lg font-semibold text-green-400">
                            ${period.total_vacation.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedPayPeriod(period)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        View Details →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generate Payroll Tab */}
        {activeTab === "generate" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-8">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">⚡</div>
                  <h2 className="text-2xl font-bold mb-2">Generate Payroll</h2>
                  <p className="text-neutral-400">
                    Automatically calculate payroll based on approved timecards
                  </p>
                </div>

                {nextPayPeriod && (
                  <div className="bg-neutral-800 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold mb-4">Next Pay Period</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-neutral-400">Period Start</div>
                        <div className="font-medium">
                          {new Date(nextPayPeriod.period_start).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-neutral-400">Period End</div>
                        <div className="font-medium">
                          {new Date(nextPayPeriod.period_end).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-neutral-400">Pay Date</div>
                        <div className="font-medium text-indigo-400">
                          {new Date(nextPayPeriod.pay_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold mb-2 text-indigo-300">How it works:</h4>
                  <ul className="text-sm space-y-2 text-neutral-300">
                    <li>✓ Fetches all approved timecards for the pay period</li>
                    <li>✓ Calculates regular pay (hours × hourly rate)</li>
                    <li>✓ Calculates overtime pay (overtime hours × hourly rate × 1.5)</li>
                    <li>✓ Accrues vacation pay (4% of hours and gross pay)</li>
                    <li>✓ Creates payroll records in Draft status for review</li>
                  </ul>
                </div>

                <button
                  onClick={handleGeneratePayroll}
                  disabled={generating}
                  className={`w-full py-4 rounded-lg font-medium transition-colors ${
                    generating
                      ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {generating ? "Generating Payroll..." : "Generate Payroll Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vacation Balances Tab */}
        {activeTab === "vacation" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-semibold">Employee Vacation Balances</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Employees accrue 4% vacation pay on all hours worked
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-400">Employee</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Hourly Rate</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Hours Balance</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Pay Balance</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Total Earned</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Total Paid</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {vacationBalances.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-neutral-400">
                          <div className="text-4xl mb-4">🏖️</div>
                          <p>No vacation balance records yet</p>
                          <p className="text-sm mt-2">Balances will appear after generating payroll</p>
                        </td>
                      </tr>
                    ) : (
                      vacationBalances.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium">
                                {emp.first_name} {emp.last_name}
                              </div>
                              <div className="text-sm text-neutral-400">{emp.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">${parseFloat(emp.hourly_rate || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            {parseFloat(emp.vacation_hours_balance || 0).toFixed(2)} hrs
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-green-400">
                            ${parseFloat(emp.vacation_pay_balance || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-400">
                            ${parseFloat(emp.vacation_pay_earned || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-400">
                            ${parseFloat(emp.vacation_pay_paid || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setVacationPayoutDialog(true);
                              }}
                              disabled={parseFloat(emp.vacation_hours_balance || 0) <= 0}
                              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                parseFloat(emp.vacation_hours_balance || 0) > 0
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
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
            <div className="bg-neutral-900 rounded-lg border border-neutral-800">
              <div className="p-6 border-b border-neutral-800">
                <h2 className="text-xl font-semibold">Payment History</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-400">Employee</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-400">Pay Period</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-neutral-400">Pay Date</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Hours</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Gross Pay</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Vacation Accrued</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-neutral-400">Net Pay</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-400">Status</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-neutral-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {payrolls.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-12 text-center text-neutral-400">
                          <div className="text-4xl mb-4">📋</div>
                          <p>No payroll history yet</p>
                          <p className="text-sm mt-2">Generate payroll to get started</p>
                        </td>
                      </tr>
                    ) : (
                      payrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-neutral-800/30">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium">
                                {payroll.first_name} {payroll.last_name}
                              </div>
                              <div className="text-sm text-neutral-400">{payroll.department || "N/A"}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {new Date(payroll.pay_period_start).toLocaleDateString()} -{" "}
                            {new Date(payroll.pay_period_end).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {new Date(payroll.pay_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {parseFloat(payroll.regular_hours || 0).toFixed(2)}
                            {parseFloat(payroll.overtime_hours || 0) > 0 && (
                              <span className="text-yellow-400">
                                {" "}
                                +{parseFloat(payroll.overtime_hours).toFixed(2)} OT
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
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payroll.status === "Paid"
                                  ? "bg-green-900/50 text-green-300"
                                  : payroll.status === "Approved"
                                  ? "bg-blue-900/50 text-blue-300"
                                  : "bg-yellow-900/50 text-yellow-300"
                              }`}
                            >
                              {payroll.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {payroll.status === "Draft" && (
                              <button
                                onClick={() => handleApprovePayroll(payroll.id)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium"
                              >
                                Approve
                              </button>
                            )}
                            {payroll.status === "Approved" && (
                              <button
                                onClick={() => handleMarkPaid(payroll.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium"
                              >
                                Mark Paid
                              </button>
                            )}
                            {payroll.status === "Paid" && (
                              <span className="text-xs text-neutral-500">—</span>
                            )}
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
              className="bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4 border border-neutral-800"
            >
              <h3 className="text-xl font-semibold mb-4">Vacation Payout</h3>

              <div className="mb-6">
                <div className="mb-4">
                  <div className="text-sm text-neutral-400">Employee</div>
                  <div className="font-medium">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </div>
                </div>

                <div className="bg-neutral-800 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-400">Available Hours</div>
                      <div className="text-lg font-semibold">
                        {parseFloat(selectedEmployee.vacation_hours_balance || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400">Available Pay</div>
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
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                  <div className="text-xs text-neutral-400 mt-1">
                    Max: {parseFloat(selectedEmployee.vacation_hours_balance || 0).toFixed(2)} hours
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
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVacationPayout}
                  disabled={!vacationHoursToPay || parseFloat(vacationHoursToPay) <= 0}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    vacationHoursToPay && parseFloat(vacationHoursToPay) > 0
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  Process Payout
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pay Period Detail Modal */}
        {selectedPayPeriod && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-neutral-800"
            >
              <div className="p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">
                      Pay Period: {new Date(selectedPayPeriod.period_start).toLocaleDateString()} -{" "}
                      {new Date(selectedPayPeriod.period_end).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Pay Date: {new Date(selectedPayPeriod.pay_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPayPeriod(null)}
                    className="text-neutral-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="text-sm text-neutral-400">Employees</div>
                    <div className="text-2xl font-bold">{selectedPayPeriod.payrolls.length}</div>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="text-sm text-neutral-400">Total Gross</div>
                    <div className="text-2xl font-bold">${selectedPayPeriod.total_gross.toFixed(2)}</div>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="text-sm text-neutral-400">Total Net</div>
                    <div className="text-2xl font-bold">${selectedPayPeriod.total_net.toFixed(2)}</div>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="text-sm text-neutral-400">Vacation Accrued</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${selectedPayPeriod.total_vacation.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Employee</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Hours</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Rate</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Gross</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Vacation</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Net</th>
                        <th className="text-center px-4 py-3 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {selectedPayPeriod.payrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-neutral-800/30">
                          <td className="px-4 py-3">
                            {payroll.first_name} {payroll.last_name}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {parseFloat(payroll.regular_hours).toFixed(2)}
                            {parseFloat(payroll.overtime_hours) > 0 && (
                              <span className="text-yellow-400 ml-1">
                                +{parseFloat(payroll.overtime_hours).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            ${parseFloat(payroll.hourly_rate).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${parseFloat(payroll.gross_pay).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 text-sm">
                            ${parseFloat(payroll.vacation_pay_accrued).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ${parseFloat(payroll.net_pay).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                payroll.status === "Paid"
                                  ? "bg-green-900/50 text-green-300"
                                  : payroll.status === "Approved"
                                  ? "bg-blue-900/50 text-blue-300"
                                  : "bg-yellow-900/50 text-yellow-300"
                              }`}
                            >
                              {payroll.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

