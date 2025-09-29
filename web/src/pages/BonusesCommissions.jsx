import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function BonusesCommissions() {
  const [activeTab, setActiveTab] = useState("import");
  const [employees, setEmployees] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [bonusStructures, setBonusStructures] = useState([]);
  const [commissionStructures, setCommissionStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [showAddStructure, setShowAddStructure] = useState(false);
  
  // Edit modal states
  const [showEditBonus, setShowEditBonus] = useState(false);
  const [showEditCommission, setShowEditCommission] = useState(false);
  const [showEditStructure, setShowEditStructure] = useState(false);
  const [editingBonus, setEditingBonus] = useState(null);
  const [editingCommission, setEditingCommission] = useState(null);
  const [editingStructure, setEditingStructure] = useState(null);
  
  // Action modal states
  const [showApproveBonus, setShowApproveBonus] = useState(false);
  const [showRejectBonus, setShowRejectBonus] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [showExportBonuses, setShowExportBonuses] = useState(false);
  const [showApplyStructure, setShowApplyStructure] = useState(false);
  const [actionBonus, setActionBonus] = useState(null);
  const [actionStructure, setActionStructure] = useState(null);
  
  // Action form data
  const [approveData, setApproveData] = useState({
    approved_by: "",
    approval_notes: "",
    payment_date: ""
  });
  const [rejectData, setRejectData] = useState({
    rejected_by: "",
    rejection_reason: "",
    rejection_notes: ""
  });
  const [exportData, setExportData] = useState({
    format: "CSV",
    date_range: "All",
    status_filter: "All",
    include_details: true
  });
  const [applyData, setApplyData] = useState({
    apply_to: "All Employees",
    department_id: "",
    employee_ids: [],
    effective_date: ""
  });
  
  // Success and error message states
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Form data states
  const [newBonus, setNewBonus] = useState({
    employee_id: "",
    bonus_type: "Performance",
    amount: "",
    period: "",
    criteria: "",
    status: "Pending"
  });
  
  const [newCommission, setNewCommission] = useState({
    employee_id: "",
    commission_rate: "",
    threshold_amount: "",
    deal_amount: "",
    commission_amount: "",
    period: ""
  });
  
  const [newStructure, setNewStructure] = useState({
    name: "",
    type: "Bonus",
    base_amount: "",
    criteria: "",
    effective_date: "",
    is_active: true
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Import-related state variables
  const [importFile, setImportFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [monthlyCommissions, setMonthlyCommissions] = useState([]);
  const [agentCommissions, setAgentCommissions] = useState([]);
  const [hourlyPayouts, setHourlyPayouts] = useState([]);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2025-07-01');
  const [analyticsMonthly, setAnalyticsMonthly] = useState([]);
  const [analyticsAgents, setAnalyticsAgents] = useState([]);
  const [analyticsHourly, setAnalyticsHourly] = useState([]);

  const tabs = [
    { id: "import", name: "Excel Import", icon: "📥" },
    { id: "analytics", name: "Analytics", icon: "📊" }
  ];

  useEffect(() => {
    loadAvailablePeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadAnalyticsData();
    }
  }, [selectedPeriod]);

  const loadAvailablePeriods = async () => {
    try {
      const periods = await API('/api/commissions/periods');
      setAvailablePeriods(periods);
      
      // Set first available period as selected
      if (periods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(periods[0].period_month);
      }
    } catch (error) {
      console.error("Error loading periods:", error);
      setAvailablePeriods([]);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      
      // Load all analytics data for selected period
      const [summary, monthly, agents, hourly] = await Promise.all([
        API(`/api/commissions/summary?period_month=${selectedPeriod}`).catch(() => null),
        API(`/api/commissions/monthly?period_month=${selectedPeriod}`).catch(() => []),
        API(`/api/commissions/agents-us?period_month=${selectedPeriod}`).catch(() => []),
        API(`/api/commissions/hourly-payouts?period_month=${selectedPeriod}`).catch(() => [])
      ]);
      
      setAnalyticsData(summary);
      setAnalyticsMonthly(monthly);
      setAnalyticsAgents(agents);
      setAnalyticsHourly(hourly);
      
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setAnalyticsData(null);
      setAnalyticsMonthly([]);
      setAnalyticsAgents([]);
      setAnalyticsHourly([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data after import
  const refreshImportedData = async () => {
    try {
      // Get the most recent data (this will be updated after successful import)
      const [monthly, agents, hourly] = await Promise.all([
        API('/api/commissions/monthly?period_month=2025-07-01').catch(() => []),
        API('/api/commissions/agents-us?period_month=2025-07-01').catch(() => []),
        API('/api/commissions/hourly-payouts?period_month=2025-07-01').catch(() => [])
      ]);
      
      setMonthlyCommissions(monthly);
      setAgentCommissions(agents);
      setHourlyPayouts(hourly);
      
      // Refresh periods list and analytics
      await loadAvailablePeriods();
      await loadAnalyticsData();
    } catch (error) {
      console.error("Error refreshing commission data:", error);
    }
  };

  // Excel Import Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      setErrorMessage("Please select an Excel file to import");
      setShowErrorMessage(true);
      return;
    }

    setImportStatus({ status: "processing", message: "Processing Excel file..." });
    
    try {
      const formData = new FormData();
      formData.append('excel_file', importFile);
      
      const API_BASE_URL = 'https://hr-api-wbzs.onrender.com';
      const sessionId = localStorage.getItem('sessionId');
      
      const response = await fetch(`${API_BASE_URL}/api/commissions/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          ...(sessionId && { 'x-session-id': sessionId }),
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.details || result.error);
      }
      
      setImportStatus({
        status: "success",
        message: `Import completed! Main: ${result.summary.main.inserted} inserted, ${result.summary.main.updated} updated. Agents US: ${result.summary.agents_us.inserted} inserted, ${result.summary.agents_us.updated} updated. Hourly: ${result.summary.hourly.inserted} inserted, ${result.summary.hourly.updated} updated.`
      });
      
      // Show debug logs in console for troubleshooting
      if (result.summary && result.summary.debug_logs) {
        console.log('🔍 IMPORT DEBUG LOGS:');
        result.summary.debug_logs.forEach(log => console.log(log));
      }
      
      if (result.summary && result.summary.warnings) {
        console.log('⚠️ IMPORT WARNINGS:');
        result.summary.warnings.forEach(warning => console.log(warning));
      }
      
      setSuccessMessage("Commission data imported successfully!");
      setShowSuccessMessage(true);
      
      // Reload data
      await refreshImportedData();
      
    } catch (error) {
      console.error("Error importing Excel:", error);
      setImportStatus({
        status: "error",
        message: `Import failed: ${error.message}`
      });
      setErrorMessage(`Import failed: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  // Handler functions for bonus actions
  const handleEditBonus = (bonus) => {
    setEditingBonus(bonus);
    setShowEditBonus(true);
  };

  const handleUpdateBonus = async (e) => {
    e.preventDefault();
    try {
      const response = await API(`/api/bonuses/${editingBonus.id}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: editingBonus.amount,
          criteria: editingBonus.criteria,
          period: editingBonus.period,
          status: editingBonus.status
        })
      });
      
      // If we get here, the API call was successful
      setSuccessMessage(`Bonus updated successfully!`);
      setShowSuccessMessage(true);
      setShowEditBonus(false);
      setEditingBonus(null);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error updating bonus:", error);
      setErrorMessage(`Failed to update bonus: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleApproveBonus = (bonus) => {
    setActionBonus(bonus);
    setApproveData({
      approved_by: "",
      approval_notes: "",
      payment_date: ""
    });
    setShowApproveBonus(true);
  };

  const handleSubmitApprove = async (e) => {
    e.preventDefault();
    try {
      const response = await API(`/api/bonuses/${actionBonus.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "Approved",
          approved_by: approveData.approved_by,
          approval_notes: approveData.approval_notes,
          payment_date: approveData.payment_date
        })
      });
      setSuccessMessage(`Bonus approved successfully!`);
      setShowSuccessMessage(true);
      setShowApproveBonus(false);
      setActionBonus(null);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error approving bonus:", error);
      setErrorMessage(`Failed to approve bonus: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleRejectBonus = (bonus) => {
    setActionBonus(bonus);
    setRejectData({
      rejected_by: "",
      rejection_reason: "",
      rejection_notes: ""
    });
    setShowRejectBonus(true);
  };

  const handleSubmitReject = async (e) => {
    e.preventDefault();
    try {
      const response = await API(`/api/bonuses/${actionBonus.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "Rejected",
          rejected_by: rejectData.rejected_by,
          rejection_reason: rejectData.rejection_reason,
          rejection_notes: rejectData.rejection_notes
        })
      });
      setSuccessMessage(`Bonus rejected.`);
      setShowSuccessMessage(true);
      setShowRejectBonus(false);
      setActionBonus(null);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error rejecting bonus:", error);
      setErrorMessage(`Failed to reject bonus: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleViewBonusDetails = (bonus) => {
    setActionBonus(bonus);
    setShowViewDetails(true);
  };

  const handleExportBonuses = () => {
    setExportData({
      format: "CSV",
      date_range: "All",
      status_filter: "All",
      include_details: true
    });
    setShowExportBonuses(true);
  };

  const handleSubmitExport = async (e) => {
    e.preventDefault();
    try {
      const response = await API("/api/bonuses/export", {
        method: "POST",
        body: JSON.stringify(exportData)
      });
      
      // Create and download CSV based on export options
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Employee,Amount,Type,Period,Status,Criteria\n" +
        bonuses.map(b => `${b.employee_name},${b.amount},${b.bonus_type},${b.period},${b.status},${b.criteria}`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `bonuses_export_${exportData.format.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage("Bonuses exported successfully!");
      setShowSuccessMessage(true);
      setShowExportBonuses(false);
    } catch (error) {
      console.error("Error exporting bonuses:", error);
      setErrorMessage(`Failed to export bonuses: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleEditBonusStructure = (structure) => {
    setEditingStructure(structure);
    setShowEditStructure(true);
  };

  const handleUpdateStructure = async (e) => {
    e.preventDefault();
    try {
      const response = await API(`/api/bonuses/structures/${editingStructure.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingStructure.name,
          base_amount: editingStructure.base_amount,
          criteria: editingStructure.criteria,
          calculation_method: editingStructure.calculation_method,
          effective_date: editingStructure.effective_date
        })
      });
      setSuccessMessage(`Structure updated successfully!`);
      setShowSuccessMessage(true);
      setShowEditStructure(false);
      setEditingStructure(null);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error updating structure:", error);
      setErrorMessage(`Failed to update structure: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleApplyBonusStructureToEmployees = (structure) => {
    setActionStructure(structure);
    setApplyData({
      apply_to: "All Employees",
      department_id: "",
      employee_ids: [],
      effective_date: ""
    });
    setShowApplyStructure(true);
  };

  const handleSubmitApply = async (e) => {
    e.preventDefault();
    try {
      const response = await API("/api/bonuses/structures/apply", {
        method: "POST",
        body: JSON.stringify({
          structure_id: actionStructure.id,
          apply_to: applyData.apply_to,
          department_id: applyData.department_id,
          employee_ids: applyData.employee_ids,
          effective_date: applyData.effective_date
        })
      });
      setSuccessMessage(`Bonus structure "${actionStructure.name}" applied successfully!`);
      setShowSuccessMessage(true);
      setShowApplyStructure(false);
      setActionStructure(null);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error applying structure:", error);
      setErrorMessage(`Failed to apply structure: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  // Handler functions for adding bonuses, commissions, and structures
  const handleAddBonus = async (e) => {
    e.preventDefault();
    try {
      await API("/api/bonuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBonus)
      });
      
      setNewBonus({
        employee_id: "",
        bonus_type: "Performance",
        amount: "",
        period: "",
        criteria: "",
        status: "Pending"
      });
      setShowAddBonus(false);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error adding bonus:", error);
      setErrorMessage(`Failed to add bonus: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleAddCommission = async (e) => {
    e.preventDefault();
    try {
      await API("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCommission)
      });
      
      setNewCommission({
        employee_id: "",
        commission_rate: "",
        threshold_amount: "",
        deal_amount: "",
        commission_amount: "",
        period: ""
      });
      setShowAddCommission(false);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error adding commission:", error);
      setErrorMessage(`Failed to add commission: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const handleAddStructure = async (e) => {
    e.preventDefault();
    try {
      const endpoint = newStructure.type === "Bonus" ? "/api/bonus-structures" : "/api/commission-structures";
      await API(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStructure)
      });
      
      setNewStructure({
        name: "",
        type: "Bonus",
        base_amount: "",
        criteria: "",
        effective_date: "",
        is_active: true
      });
      setShowAddStructure(false);
      loadBonusesCommissionsData();
    } catch (error) {
      console.error("Error adding structure:", error);
      setErrorMessage(`Failed to add structure: ${error.message}`);
      setShowErrorMessage(true);
    }
  };

  const renderBonuses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Employee Bonuses</h3>
        <button
          onClick={() => setShowAddBonus(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Bonus
        </button>
      </div>

      <div className="grid gap-4">
        {bonuses.map((bonus) => (
          <motion.div
            key={bonus.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{bonus.employee_name}</h4>
                <p className="text-sm text-tertiary">{bonus.bonus_type} - {bonus.period}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bonus.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                  bonus.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {bonus.status}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">${bonus.amount.toLocaleString()}</div>
                  <div className="text-xs text-tertiary">{bonus.percentage}% of base</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium text-tertiary">Criteria:</span>
                <p className="text-sm text-neutral-300 mt-1">{bonus.criteria}</p>
              </div>
              <div>
                <span className="font-medium text-tertiary">Payment Date:</span>
                <div className="text-sm text-neutral-300">
                  {bonus.payment_date || 'Pending'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="flex justify-between items-center text-sm text-tertiary">
                <span>Approved by: {bonus.approved_by || 'Pending'}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditBonus(bonus)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Edit
                  </button>
                  {bonus.status === 'Pending' && (
                    <button 
                      onClick={() => handleApproveBonus(bonus)}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  <button 
                    onClick={() => handleRejectBonus(bonus)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderCommissions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sales Commissions</h3>
        <button
          onClick={() => setShowAddCommission(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Commission
        </button>
      </div>

      <div className="grid gap-4">
        {commissions.map((commission) => (
          <motion.div
            key={commission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold">{commission.employee_name}</h4>
                <p className="text-sm text-tertiary">{commission.commission_type} - {commission.period}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  commission.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {commission.status}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">${commission.commission_amount.toLocaleString()}</div>
                  <div className="text-xs text-tertiary">{commission.commission_rate}% rate</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="font-medium text-tertiary">Base Amount:</span>
                <div className="text-sm text-neutral-300">${commission.base_amount.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Commission Rate:</span>
                <div className="text-sm text-neutral-300">{commission.commission_rate}%</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Sales Target:</span>
                <div className="text-sm text-neutral-300">${commission.sales_target.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Achievement:</span>
                <div className="text-sm text-neutral-300">{commission.target_achievement}%</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Target Achievement</span>
                <span className="text-sm text-tertiary">{commission.target_achievement}%</span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    commission.target_achievement >= 100 ? 'bg-green-400' : 
                    commission.target_achievement >= 80 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(commission.target_achievement, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="flex justify-between items-center text-sm text-tertiary">
                <span>Payment Date: {commission.payment_date}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewBonusDetails(commission)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={handleExportBonuses}
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderImport = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Excel Commission Import</h3>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg">
            <p className="text-xs text-amber-200">
              💡 <strong>Supported Format:</strong> Excel files (.xlsx, .xls) with commission data. 
              The system will automatically detect Main Commission, Agent US, and Hourly Payout tables.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Upload Excel File</label>
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-neutral-400">
                  {importFile ? importFile.name : "Click to upload Excel file"}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Supports .xlsx and .xls formats with multiple data tables
                </p>
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
              Import Commission Data
            </button>
            <button
              onClick={() => {
                setImportFile(null);
                setImportStatus(null);
              }}
              className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Display imported data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Commissions */}
        <div className="bg-neutral-900 rounded-lg p-6">
          <h4 className="font-semibold mb-4 text-indigo-400">Monthly Commissions ({monthlyCommissions.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {monthlyCommissions.length > 0 ? monthlyCommissions.map((commission, idx) => (
              <div key={idx} className="bg-neutral-800 p-3 rounded text-sm">
                <div className="font-medium">{commission.employee_name}</div>
                <div className="text-neutral-400">Commission: {commission.commission_earned}</div>
                <div className="text-neutral-400">Total Due: {commission.total_due}</div>
              </div>
            )) : (
              <p className="text-neutral-500 text-sm">No monthly commission data</p>
            )}
          </div>
        </div>

        {/* Agent US Commissions */}
        <div className="bg-neutral-900 rounded-lg p-6">
          <h4 className="font-semibold mb-4 text-indigo-400">Agent US Commissions ({agentCommissions.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {agentCommissions.length > 0 ? agentCommissions.map((commission, idx) => (
              <div key={idx} className="bg-neutral-800 p-3 rounded text-sm">
                <div className="font-medium">{commission.employee_name}</div>
                <div className="text-neutral-400">Revenue: {commission.total_us_revenue}</div>
                <div className="text-neutral-400">Commission: {commission.commission_earned}</div>
              </div>
            )) : (
              <p className="text-neutral-500 text-sm">No agent US commission data</p>
            )}
          </div>
        </div>

        {/* Hourly Payouts */}
        <div className="bg-neutral-900 rounded-lg p-6">
          <h4 className="font-semibold mb-4 text-indigo-400">Hourly Payouts ({hourlyPayouts.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {hourlyPayouts.length > 0 ? hourlyPayouts.map((payout, idx) => (
              <div key={idx} className="bg-neutral-800 p-3 rounded text-sm">
                <div className="font-medium">{payout.employee_name}</div>
                <div className="text-neutral-400">Period: {payout.period_label}</div>
                <div className="text-neutral-400">Amount: {payout.amount}</div>
              </div>
            )) : (
              <p className="text-neutral-500 text-sm">No hourly payout data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStructures = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Compensation Structures</h3>
        <button
          onClick={() => setShowAddStructure(true)}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Structure
        </button>
      </div>

      <div className="grid gap-6">
        {/* Bonus Structures */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-green-400">Bonus Structures</h4>
          <div className="grid gap-4">
            {bonusStructures.map((structure) => (
              <motion.div
                key={structure.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="text-lg font-semibold">{structure.name}</h5>
                    <p className="text-sm text-tertiary">{structure.department} - {structure.type}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      structure.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {structure.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-400">Max: ${structure.max_bonus.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Calculation Method:</span>
                  <p className="text-sm text-neutral-300 mt-1">{structure.calculation_method}</p>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Bonus Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="bg-neutral-800 p-2 rounded text-sm">
                        <div className="text-tertiary">{tier.min_performance}-{tier.max_performance}%</div>
                        <div className="text-green-400 font-medium">{tier.bonus_percentage}% bonus</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Eligibility Criteria:</span>
                  <p className="text-sm text-neutral-300 mt-1">{structure.eligibility_criteria}</p>
                </div>

                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => handleEditBonusStructure(structure)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Edit Structure
                  </button>
                  <button 
                    onClick={() => handleApplyBonusStructureToEmployees(structure)}
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Apply to Employees
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Commission Structures */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-blue-400">Commission Structures</h4>
          <div className="grid gap-4">
            {commissionStructures.map((structure) => (
              <motion.div
                key={structure.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="text-lg font-semibold">{structure.name}</h5>
                    <p className="text-sm text-tertiary">{structure.department}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      structure.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-secondary/10 text-secondary'
                    }`}>
                      {structure.status}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-400">Max: ${structure.max_commission.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="font-medium text-tertiary">Base Rate:</span>
                    <div className="text-sm text-neutral-300">{structure.base_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Acceleration Rate:</span>
                    <div className="text-sm text-neutral-300">{structure.acceleration_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Threshold:</span>
                    <div className="text-sm text-neutral-300">${structure.threshold.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Calculation:</span>
                    <div className="text-sm text-neutral-300">{structure.calculation_method}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Commission Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="bg-neutral-800 p-2 rounded text-sm">
                        <div className="text-tertiary">${tier.min_sales.toLocaleString()}-${tier.max_sales.toLocaleString()}</div>
                        <div className="text-blue-400 font-medium">{tier.rate}% rate</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => handleEditBonusStructure(structure)}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Edit Structure
                  </button>
                  <button 
                    onClick={() => handleApplyBonusStructureToEmployees(structure)}
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    Apply to Employees
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (loading) {
      return <div className="text-center py-8">Loading analytics...</div>;
    }
    
    if (availablePeriods.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-neutral-400">No commission data available</div>
          <div className="text-sm text-neutral-500 mt-2">Import Excel data to see analytics</div>
        </div>
      );
    }
    
    return (
    <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Commission Analytics</h3>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-neutral-800 border border-neutral-600 px-3 py-2 rounded-lg text-sm"
            >
              {availablePeriods.map((period) => (
                <option key={period.period_month} value={period.period_month}>
                  {period.period_label}
                </option>
              ))}
            </select>
            <button
              onClick={loadAnalyticsData}
              className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {analyticsData && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                ${(analyticsData.total_commission_earned || 0).toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Total Commissions</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                ${(analyticsData.total_amount_paid || 0).toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Amount Paid</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                ${(analyticsData.total_remaining || 0).toLocaleString()}
              </div>
              <div className="text-sm text-tertiary">Remaining Due</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-indigo-400">
                {analyticsData.total_employees || 0}
        </div>
              <div className="text-sm text-tertiary">Employees</div>
      </div>
          </div>
        )}

        {/* Monthly Commissions Table - Dynamic Columns */}
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4 text-indigo-400">
            📋 Monthly Commissions ({analyticsMonthly.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-2 px-3 sticky left-0 bg-neutral-900 z-10">Name</th>
                  <th className="text-left py-2 px-3">Hourly Rate</th>
                  <th className="text-left py-2 px-3">Revenue SM</th>
                  <th className="text-left py-2 px-3">Add Ons</th>
                  <th className="text-left py-2 px-3">Deduction</th>
                  <th className="text-left py-2 px-3">Total Revenue</th>
                  <th className="text-left py-2 px-3">Booking %</th>
                  <th className="text-left py-2 px-3">Commission %</th>
                  <th className="text-left py-2 px-3">Commission Earned</th>
                  <th className="text-left py-2 px-3">Spiff Bonus</th>
                  <th className="text-left py-2 px-3">Revenue Bonus</th>
                  <th className="text-left py-2 px-3">US Jobs 1.25X</th>
                  <th className="text-left py-2 px-3">Booking Bonus +</th>
                  <th className="text-left py-2 px-3">Booking Bonus -</th>
                  <th className="text-left py-2 px-3">Hourly Paid Out</th>
                  <th className="text-left py-2 px-3">Sales Mgr Ded</th>
                  <th className="text-left py-2 px-3">Missing Punch</th>
                  <th className="text-left py-2 px-3">Cust Support</th>
                  <th className="text-left py-2 px-3">Post Comm</th>
                  <th className="text-left py-2 px-3">Dispatch Ded</th>
                  <th className="text-left py-2 px-3">Other Ded</th>
                  <th className="text-left py-2 px-3 text-green-400">Total Due</th>
                  <th className="text-left py-2 px-3 text-blue-400">Amount Paid</th>
                  <th className="text-left py-2 px-3 text-purple-400">Remaining</th>
                  <th className="text-left py-2 px-3">Corporate Jobs Note</th>
                  <th className="text-left py-2 px-3">Parking Pass Note</th>
                </tr>
              </thead>
              <tbody>
                {analyticsMonthly.length > 0 ? analyticsMonthly.map((record, idx) => (
                  <tr key={idx} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-neutral-900 z-10">{record.name_raw}</td>
                    <td className="py-2 px-3">${record.hourly_rate || 0}</td>
                    <td className="py-2 px-3">${(record.rev_sm_all_locations || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.rev_add_ons || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.rev_deduction || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.total_revenue_all || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">{(record.booking_pct || 0)}%</td>
                    <td className="py-2 px-3">{(record.commission_pct || 0)}%</td>
                    <td className="py-2 px-3 text-green-400">${(record.commission_earned || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.spiff_bonus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.revenue_bonus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.bonus_us_jobs_125x || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.booking_bonus_plus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.booking_bonus_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.hourly_paid_out_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_sales_manager_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_missing_punch_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_customer_support_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_post_commission_collected_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_dispatch_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">${(record.deduction_other_minus || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-green-400 font-semibold">${(record.total_due || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-blue-400 font-semibold">${(record.amount_paid || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-purple-400 font-semibold">${(record.remaining_amount || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-neutral-400 text-xs">{record.corporate_open_jobs_note || '-'}</td>
                    <td className="py-2 px-3 text-neutral-400 text-xs">{record.parking_pass_fee_note || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="26" className="py-4 px-4 text-center text-neutral-500">
                      No monthly commission data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent US Commissions Table - All Columns */}
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4 text-indigo-400">
            🇺🇸 Agent US Commissions ({analyticsAgents.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-2 px-3 sticky left-0 bg-neutral-900 z-10">Name</th>
                  <th className="text-left py-2 px-3">Total US Revenue</th>
                  <th className="text-left py-2 px-3">Commission %</th>
                  <th className="text-left py-2 px-3">Commission Earned</th>
                  <th className="text-left py-2 px-3">1.25X Bonus</th>
                  <th className="text-left py-2 px-3">Other Bonus</th>
                </tr>
              </thead>
              <tbody>
                {analyticsAgents.length > 0 ? analyticsAgents.map((record, idx) => (
                  <tr key={idx} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-neutral-900 z-10">{record.name_raw}</td>
                    <td className="py-2 px-3">${(record.total_us_revenue || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">{(record.commission_pct || 0)}%</td>
                    <td className="py-2 px-3 text-green-400 font-semibold">${(record.commission_earned || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-yellow-400">${(record.commission_125x || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-blue-400">${(record.bonus || 0).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-4 px-4 text-center text-neutral-500">
                      No agent US commission data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>

        {/* Hourly Payouts Table - All Date Columns */}
      <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4 text-indigo-400">
            ⏰ Hourly Payouts ({analyticsHourly.length})
          </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                  <th className="text-left py-2 px-3 sticky left-0 bg-neutral-900 z-10">Name</th>
                  <th className="text-left py-2 px-3">Period Label</th>
                  <th className="text-left py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3 text-green-400">Total for Month</th>
              </tr>
            </thead>
            <tbody>
                {analyticsHourly.length > 0 ? analyticsHourly.map((record, idx) => (
                  <tr key={idx} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-neutral-900 z-10">{record.name_raw}</td>
                    <td className="py-2 px-3">{record.period_label}</td>
                    <td className="py-2 px-3 text-blue-400">${(record.amount || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-green-400 font-semibold">${(record.total_for_month || 0).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-4 px-4 text-center text-neutral-500">
                      No hourly payout data for this period
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bonuses and commissions data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Bonuses & Commissions</h1>
        <p className="text-tertiary mt-1">Manage performance-based compensation and sales commissions</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "import" && renderImport()}
        {activeTab === "analytics" && renderAnalytics()}
      </div>

      {/* Add Bonus Modal */}
      {showAddBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Employee Bonus</h3>
              <form className="space-y-4" onSubmit={handleAddBonus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option>Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bonus Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Performance Bonus">Performance Bonus</option>
                      <option value="Project Completion">Project Completion</option>
                      <option value="Customer Satisfaction">Customer Satisfaction</option>
                      <option value="Sales Target">Sales Target</option>
                      <option value="Innovation">Innovation</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Q1 2025">Q1 2025</option>
                      <option value="Q2 2025">Q2 2025</option>
                      <option value="Q3 2025">Q3 2025</option>
                      <option value="Q4 2025">Q4 2025</option>
                      <option value="Annual 2025">Annual 2025</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Criteria</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe the criteria for this bonus..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBonus(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Bonus
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Commission Modal */}
      {showAddCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Sales Commission</h3>
              <form className="space-y-4" onSubmit={handleAddCommission}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option>Select Employee</option>
                      {employees.filter(emp => emp.commission_rate > 0).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commission Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Sales Commission">Sales Commission</option>
                      <option value="Referral Commission">Referral Commission</option>
                      <option value="Upsell Commission">Upsell Commission</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Amount</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Q1 2025">Q1 2025</option>
                      <option value="Q2 2025">Q2 2025</option>
                      <option value="Q3 2025">Q3 2025</option>
                      <option value="Q4 2025">Q4 2025</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sales Target</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="120000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Achievement</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="125"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCommission(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Commission
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Structure Modal */}
      {showAddStructure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Add Compensation Structure</h3>
              <form className="space-y-4" onSubmit={handleAddStructure}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Sales Performance Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Sales">Sales</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Operations">Operations</option>
                      <option value="All">All Departments</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Type</label>
                    <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500">
                      <option value="Bonus">Bonus</option>
                      <option value="Commission">Commission</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Amount</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calculation Method</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe how the compensation is calculated..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Eligibility Criteria</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe eligibility requirements..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddStructure(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add Structure
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Bonus Modal */}
      {showEditBonus && editingBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Edit Employee Bonus</h3>
              <form className="space-y-4" onSubmit={handleUpdateBonus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Employee</label>
                    <select
                      value={editingBonus.employee_id}
                      onChange={(e) => setEditingBonus({...editingBonus, employee_id: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bonus Type</label>
                    <select
                      value={editingBonus.bonus_type}
                      onChange={(e) => setEditingBonus({...editingBonus, bonus_type: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Performance">Performance</option>
                      <option value="Project">Project</option>
                      <option value="Annual">Annual</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      value={editingBonus.amount}
                      onChange={(e) => setEditingBonus({...editingBonus, amount: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <input
                      type="text"
                      value={editingBonus.period}
                      onChange={(e) => setEditingBonus({...editingBonus, period: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="Q4 2024"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Criteria</label>
                  <textarea
                    rows={3}
                    value={editingBonus.criteria}
                    onChange={(e) => setEditingBonus({...editingBonus, criteria: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe the criteria for this bonus..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={editingBonus.status}
                    onChange={(e) => setEditingBonus({...editingBonus, status: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBonus(false);
                      setEditingBonus(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Bonus
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Structure Modal */}
      {showEditStructure && editingStructure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Edit Compensation Structure</h3>
              <form className="space-y-4" onSubmit={handleUpdateStructure}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Name</label>
                    <input
                      type="text"
                      value={editingStructure.name}
                      onChange={(e) => setEditingStructure({...editingStructure, name: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="e.g., Sales Performance Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Amount</label>
                    <input
                      type="number"
                      value={editingStructure.base_amount}
                      onChange={(e) => setEditingStructure({...editingStructure, base_amount: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Criteria</label>
                  <textarea
                    rows={3}
                    value={editingStructure.criteria}
                    onChange={(e) => setEditingStructure({...editingStructure, criteria: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe the criteria for this structure..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calculation Method</label>
                  <textarea
                    rows={3}
                    value={editingStructure.calculation_method}
                    onChange={(e) => setEditingStructure({...editingStructure, calculation_method: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Describe how this structure is calculated..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Effective Date</label>
                  <input
                    type="date"
                    value={editingStructure.effective_date}
                    onChange={(e) => setEditingStructure({...editingStructure, effective_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditStructure(false);
                      setEditingStructure(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update Structure
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approve Bonus Modal */}
      {showApproveBonus && actionBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Approve Bonus</h3>
              <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
                <h4 className="font-medium mb-2">Bonus Details</h4>
                <p><strong>Employee:</strong> {actionBonus.employee_name}</p>
                <p><strong>Amount:</strong> ${actionBonus.amount}</p>
                <p><strong>Type:</strong> {actionBonus.bonus_type}</p>
                <p><strong>Period:</strong> {actionBonus.period}</p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmitApprove}>
                <div>
                  <label className="block text-sm font-medium mb-2">Approved By *</label>
                  <input
                    type="text"
                    value={approveData.approved_by}
                    onChange={(e) => setApproveData({...approveData, approved_by: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter approver name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Date *</label>
                  <input
                    type="date"
                    value={approveData.payment_date}
                    onChange={(e) => setApproveData({...approveData, payment_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Approval Notes</label>
                  <textarea
                    rows={3}
                    value={approveData.approval_notes}
                    onChange={(e) => setApproveData({...approveData, approval_notes: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Add any notes about this approval..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApproveBonus(false);
                      setActionBonus(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Approve Bonus
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Bonus Modal */}
      {showRejectBonus && actionBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Reject Bonus</h3>
              <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
                <h4 className="font-medium mb-2">Bonus Details</h4>
                <p><strong>Employee:</strong> {actionBonus.employee_name}</p>
                <p><strong>Amount:</strong> ${actionBonus.amount}</p>
                <p><strong>Type:</strong> {actionBonus.bonus_type}</p>
                <p><strong>Period:</strong> {actionBonus.period}</p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmitReject}>
                <div>
                  <label className="block text-sm font-medium mb-2">Rejected By *</label>
                  <input
                    type="text"
                    value={rejectData.rejected_by}
                    onChange={(e) => setRejectData({...rejectData, rejected_by: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Enter rejector name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason *</label>
                  <select
                    value={rejectData.rejection_reason}
                    onChange={(e) => setRejectData({...rejectData, rejection_reason: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">Select reason</option>
                    <option value="Criteria not met">Criteria not met</option>
                    <option value="Insufficient performance">Insufficient performance</option>
                    <option value="Budget constraints">Budget constraints</option>
                    <option value="Policy violation">Policy violation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Notes *</label>
                  <textarea
                    rows={3}
                    value={rejectData.rejection_notes}
                    onChange={(e) => setRejectData({...rejectData, rejection_notes: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder="Explain why this bonus is being rejected..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectBonus(false);
                      setActionBonus(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Reject Bonus
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewDetails && actionBonus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Bonus Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <h4 className="font-medium mb-2 text-indigo-400">Employee Information</h4>
                    <p><strong>Name:</strong> {actionBonus.employee_name}</p>
                    <p><strong>Department:</strong> {actionBonus.department || 'N/A'}</p>
                    <p><strong>Role:</strong> {actionBonus.role_title || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <h4 className="font-medium mb-2 text-indigo-400">Bonus Information</h4>
                    <p><strong>Amount:</strong> ${actionBonus.amount}</p>
                    <p><strong>Type:</strong> {actionBonus.bonus_type}</p>
                    <p><strong>Period:</strong> {actionBonus.period}</p>
                  </div>
                </div>
                <div className="p-4 bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-2 text-indigo-400">Status & Approval</h4>
                  <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
                    actionBonus.status === 'Approved' ? 'bg-green-900 text-green-300' :
                    actionBonus.status === 'Rejected' ? 'bg-red-900 text-red-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>{actionBonus.status}</span></p>
                  <p><strong>Approved by:</strong> {actionBonus.approved_by || 'Pending'}</p>
                  <p><strong>Created:</strong> {new Date(actionBonus.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-neutral-800 rounded-lg">
                  <h4 className="font-medium mb-2 text-indigo-400">Criteria & Notes</h4>
                  <p><strong>Criteria:</strong> {actionBonus.criteria || 'No criteria specified'}</p>
                  {actionBonus.approval_notes && (
                    <p><strong>Approval Notes:</strong> {actionBonus.approval_notes}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowViewDetails(false);
                    setActionBonus(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Export Bonuses Modal */}
      {showExportBonuses && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Export Bonuses</h3>
              <form className="space-y-4" onSubmit={handleSubmitExport}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Export Format *</label>
                    <select
                      value={exportData.format}
                      onChange={(e) => setExportData({...exportData, format: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CSV">CSV</option>
                      <option value="Excel">Excel</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date Range *</label>
                    <select
                      value={exportData.date_range}
                      onChange={(e) => setExportData({...exportData, date_range: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All">All Time</option>
                      <option value="This Year">This Year</option>
                      <option value="Last 6 Months">Last 6 Months</option>
                      <option value="Last 3 Months">Last 3 Months</option>
                      <option value="Custom">Custom Range</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Status Filter</label>
                    <select
                      value={exportData.status_filter}
                      onChange={(e) => setExportData({...exportData, status_filter: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending Only</option>
                      <option value="Approved">Approved Only</option>
                      <option value="Rejected">Rejected Only</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportData.include_details}
                        onChange={(e) => setExportData({...exportData, include_details: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">Include detailed information</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowExportBonuses(false)}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Export Bonuses
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Apply Structure Modal */}
      {showApplyStructure && actionStructure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Apply Bonus Structure</h3>
              <div className="mb-4 p-4 bg-neutral-800 rounded-lg">
                <h4 className="font-medium mb-2">Structure Details</h4>
                <p><strong>Name:</strong> {actionStructure.name}</p>
                <p><strong>Base Amount:</strong> ${actionStructure.base_amount}</p>
                <p><strong>Criteria:</strong> {actionStructure.criteria}</p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmitApply}>
                <div>
                  <label className="block text-sm font-medium mb-2">Apply To *</label>
                  <select
                    value={applyData.apply_to}
                    onChange={(e) => setApplyData({...applyData, apply_to: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="All Employees">All Employees</option>
                    <option value="Department">Specific Department</option>
                    <option value="Individual">Individual Employees</option>
                  </select>
                </div>
                {applyData.apply_to === "Department" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Department *</label>
                    <select
                      value={applyData.department_id}
                      onChange={(e) => setApplyData({...applyData, department_id: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {employees.map(emp => emp.department).filter((dept, index, self) => self.indexOf(dept) === index).map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Effective Date *</label>
                  <input
                    type="date"
                    value={applyData.effective_date}
                    onChange={(e) => setApplyData({...applyData, effective_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyStructure(false);
                      setActionStructure(null);
                    }}
                    className="px-4 py-2 text-tertiary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Apply Structure
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

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
  );
}
