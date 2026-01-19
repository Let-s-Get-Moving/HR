import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../hooks/useUserRole.js';

import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';
import CommissionLegend from '../components/CommissionLegend.jsx';

export default function BonusesCommissions() {
  const { t } = useTranslation();
  const { userRole, salesRole } = useUserRole();
  
  // Helper to format currency for display
  const formatCurrencyDisplay = (value) => {
    if (value === null || value === undefined || value === '') return '$0';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };
  
  // Helper to format percentage for display
  const formatPercentageDisplay = (value) => {
    if (value === null || value === undefined || value === '') return '0%';
    const num = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
    if (isNaN(num)) return '0%';
    return `${num.toFixed(1)}%`;
  };
  // Default to sales-commissions for users with sales_role, otherwise analytics
  const [activeTab, setActiveTab] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
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
  
  // Sales Commissions state
  const [salesCommissionPeriods, setSalesCommissionPeriods] = useState([]);
  const [selectedSalesPeriod, setSelectedSalesPeriod] = useState({ start: '', end: '' });
  const [salesAgentCommissions, setSalesAgentCommissions] = useState([]);
  const [salesManagerCommissions, setSalesManagerCommissions] = useState([]);
  const [salesCommissionSummary, setSalesCommissionSummary] = useState(null);
  const [salesCalcLoading, setSalesCalcLoading] = useState(false);
  const [salesCalcResult, setSalesCalcResult] = useState(null);
  const [salesDryRun, setSalesDryRun] = useState(false);
  
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
  const [periodStart, setPeriodStart] = useState(''); // Required: period start date (YYYY-MM-DD)
  const [periodEnd, setPeriodEnd] = useState(''); // Required: period end date (YYYY-MM-DD)
  const [monthlyCommissions, setMonthlyCommissions] = useState([]);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [analyticsMonthly, setAnalyticsMonthly] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMonthly, setFilteredMonthly] = useState([]);
  
  // Inline editing states
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingField, setSavingField] = useState(null);

  const tabs = [
    // Hide import tab for user role
    ...(userRole !== 'user' ? [{ id: "import", name: t('bonuses.excelImport'), icon: "📥" }] : []),
    { id: "analytics", name: t('bonuses.analytics'), icon: "📊" },
    // Sales Commissions tab - for managers/admins OR users with sales_role
    ...((userRole !== 'user' || salesRole) ? [{ 
      id: "sales-commissions", 
      name: userRole === 'user' ? "My Commissions" : "Sales Commissions", 
      icon: "💰" 
    }] : [])
  ];

  // Set default tab based on role
  useEffect(() => {
    if (activeTab === null && userRole !== null) {
      // For users with sales_role, default to sales-commissions tab
      if (userRole === 'user' && salesRole) {
        setActiveTab('sales-commissions');
      } else {
        setActiveTab('analytics');
      }
    }
  }, [userRole, salesRole, activeTab]);

  useEffect(() => {
    loadAvailablePeriods();
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const depts = await API("/api/employees/departments").catch(() => []);
      setDepartments(depts || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      setDepartments([]);
    }
  };

  useEffect(() => {
    if (selectedPeriod) {
      loadAnalyticsData();
    }
  }, [selectedPeriod]);

  // Filter analytics data when search query changes
  useEffect(() => {
    handleSearch(searchQuery);
  }, [analyticsMonthly, searchQuery]);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setFilteredMonthly(analyticsMonthly);
      return;
    }

    const searchTerm = query.toLowerCase();
    
    // Filter monthly commissions by employee name
    const filteredM = analyticsMonthly.filter(item => {
      const name = (item.employee_name || item.name_raw || '').toLowerCase();
      return name.includes(searchTerm);
    });
    
    setFilteredMonthly(filteredM);
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendar && !event.target.closest('.calendar-dropdown')) {
        setShowCalendar(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  const loadAvailablePeriods = async () => {
    try {
      setLoading(true);
      const periods = await API('/api/commissions/periods');
      setAvailablePeriods(periods);
      
      // Set closest period to today as selected
      if (periods.length > 0 && !selectedPeriod) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        
        // Find period closest to today
        let closestPeriod = periods[0];
        let minDiff = Math.abs(new Date(todayStr) - new Date(periods[0].period_start || periods[0].period_month));
        
        for (const period of periods) {
          const periodDate = period.period_start || period.period_month;
          const diff = Math.abs(new Date(todayStr) - new Date(periodDate));
          if (diff < minDiff) {
            minDiff = diff;
            closestPeriod = period;
          }
        }
        
        // Use period_month for filtering (this is what the API expects)
        setSelectedPeriod(closestPeriod.period_month);
      } else {
        // No periods available - stop loading
        console.log('📊 [Commissions] No periods available');
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading periods:", error);
      setAvailablePeriods([]);
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedPeriod) return;
    
    try {
      setLoading(true);
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log(`💰 [Frontend Commissions] LOADING ANALYTICS for period: ${selectedPeriod}`);
      console.log(`💰 [Frontend Commissions] Time: ${new Date().toISOString()}`);
      
      // Load unified commission data for selected period
      const [summary, monthly] = await Promise.all([
        API(`/api/commissions/summary?period_month=${selectedPeriod}`).catch((err) => {
          console.error('❌ [Frontend Commissions] Summary failed:', err);
          return null;
        }),
        API(`/api/commissions/monthly?period_month=${selectedPeriod}`).catch((err) => {
          console.error('❌ [Frontend Commissions] Monthly failed:', err);
          return [];
        })
      ]);
      
      console.log('✅ [Frontend Commissions] API responses received:');
      console.log('   - Summary:', summary ? 'OK' : 'null');
      console.log('   - Monthly:', `${monthly?.length || 0} records`);
      
      console.log('✅ [Frontend Commissions] Setting state...');
      setAnalyticsData(summary);
      setAnalyticsMonthly(monthly);
      setFilteredMonthly(monthly);
      console.log('✅ [Frontend Commissions] State updated');
      console.log('═══════════════════════════════════════════════════════════\n');
      
    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════');
      console.error("❌ [Frontend Commissions] ERROR loading analytics:", error);
      console.error("❌ [Frontend Commissions] Error details:", error.message);
      console.error('═══════════════════════════════════════════════════════════\n');
      setAnalyticsData(null);
      setAnalyticsMonthly([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data after import
  const refreshImportedData = async () => {
    try {
      // Get the most recent data (this will be updated after successful import)
      const monthly = await API('/api/commissions/monthly?period_month=2025-07-01').catch(() => []);
      
      setMonthlyCommissions(monthly);
      
      // Refresh periods list and analytics
      await loadAvailablePeriods();
      await loadAnalyticsData();
    } catch (error) {
      console.error("Error refreshing commission data:", error);
    }
  };

  // ============================================================================
  // Sales Commission Functions
  // ============================================================================
  
  // Load available sales commission periods
  const loadSalesCommissionPeriods = async () => {
    try {
      const periods = await API('/api/sales-commissions/periods').catch(() => []);
      setSalesCommissionPeriods(periods || []);
      
      // Auto-select most recent period if available
      if (periods && periods.length > 0 && !selectedSalesPeriod.start) {
        setSelectedSalesPeriod({
          start: periods[0].period_start,
          end: periods[0].period_end
        });
      }
    } catch (error) {
      console.error("Error loading sales commission periods:", error);
      setSalesCommissionPeriods([]);
    }
  };
  
  // Load sales commission data for selected period
  const loadSalesCommissionData = async () => {
    if (!selectedSalesPeriod.start || !selectedSalesPeriod.end) return;
    
    try {
      setLoading(true);
      
      const [agents, managers, summary] = await Promise.all([
        API(`/api/sales-commissions/agents?period_start=${selectedSalesPeriod.start}&period_end=${selectedSalesPeriod.end}`).catch(() => []),
        API(`/api/sales-commissions/managers?period_start=${selectedSalesPeriod.start}&period_end=${selectedSalesPeriod.end}`).catch(() => []),
        API(`/api/sales-commissions/summary?period_start=${selectedSalesPeriod.start}&period_end=${selectedSalesPeriod.end}`).catch(() => null)
      ]);
      
      setSalesAgentCommissions(agents || []);
      setSalesManagerCommissions(managers || []);
      setSalesCommissionSummary(summary);
    } catch (error) {
      console.error("Error loading sales commission data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger sales commission calculation
  const handleCalculateSalesCommissions = async () => {
    if (!selectedSalesPeriod.start || !selectedSalesPeriod.end) {
      setErrorMessage("Please select a period to calculate");
      setShowErrorMessage(true);
      return;
    }
    
    setSalesCalcLoading(true);
    setSalesCalcResult(null);
    
    try {
      const result = await API('/api/sales-commissions/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_start: selectedSalesPeriod.start,
          period_end: selectedSalesPeriod.end,
          dry_run: salesDryRun
        })
      });
      
      setSalesCalcResult(result);
      setSuccessMessage(salesDryRun 
        ? "Dry run completed - no data saved" 
        : "Sales commissions calculated successfully!");
      setShowSuccessMessage(true);
      
      // Refresh data if not dry run
      if (!salesDryRun) {
        await loadSalesCommissionData();
        await loadSalesCommissionPeriods();
      }
    } catch (error) {
      console.error("Error calculating sales commissions:", error);
      setErrorMessage(error.message || "Failed to calculate sales commissions");
      setShowErrorMessage(true);
    } finally {
      setSalesCalcLoading(false);
    }
  };
  
  // Load sales commission periods on mount (for admins/managers or users with sales_role)
  useEffect(() => {
    if (userRole !== 'user' || salesRole) {
      loadSalesCommissionPeriods();
    }
  }, [userRole, salesRole]);
  
  // Load data when period changes
  useEffect(() => {
    if (selectedSalesPeriod.start && selectedSalesPeriod.end) {
      loadSalesCommissionData();
    }
  }, [selectedSalesPeriod]);

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

    // Require timerange
    if (!periodStart || !periodEnd) {
      setErrorMessage("Please select both period start and end dates");
      setShowErrorMessage(true);
      return;
    }

    setImportStatus({ status: "processing", message: "Processing sales performance file..." });
    
    try {
      const formData = new FormData();
      formData.append('excel_file', importFile);
      formData.append('period_start', periodStart);
      formData.append('period_end', periodEnd);
      
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
        message: `Import completed! ${result.summary.inserted} inserted, ${result.summary.updated} updated, ${result.summary.skipped} skipped. Period: ${result.summary.period_start} to ${result.summary.period_end}`
      });
      
      setSuccessMessage("Sales performance data imported successfully!");
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
          className="px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-all duration-tahoe"
          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
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
                  <div className="text-2xl font-bold text-tahoe-success-text">${bonus.amount.toLocaleString()}</div>
                  <div className="text-xs text-tertiary">{bonus.percentage}% of base</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-medium text-tertiary">Criteria:</span>
                <p className="text-sm text-tahoe-text-primary mt-1">{bonus.criteria}</p>
              </div>
              <div>
                <span className="font-medium text-tertiary">Payment Date:</span>
                <div className="text-sm text-tahoe-text-primary">
                  {bonus.payment_date || 'Pending'}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-sm text-tertiary">
                <span>Approved by: {bonus.approved_by || 'Pending'}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditBonus(bonus)}
                    className="text-tahoe-accent hover:text-tahoe-accent-hover transition-all duration-tahoe"
                  >
                    Edit
                  </button>
                  {bonus.status === 'Pending' && (
                    <button 
                      onClick={() => handleApproveBonus(bonus)}
                      className="text-tahoe-success-text hover:text-tahoe-success-text/80 transition-colors"
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
          className="px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-all duration-tahoe"
          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
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
                  <div className="text-2xl font-bold text-tahoe-info-text">${commission.commission_amount.toLocaleString()}</div>
                  <div className="text-xs text-tertiary">{commission.commission_rate}% rate</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="font-medium text-tertiary">Base Amount:</span>
                <div className="text-sm text-tahoe-text-primary">${commission.base_amount.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Commission Rate:</span>
                <div className="text-sm text-tahoe-text-primary">{commission.commission_rate}%</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Sales Target:</span>
                <div className="text-sm text-tahoe-text-primary">${commission.sales_target.toLocaleString()}</div>
              </div>
              <div>
                <span className="font-medium text-tertiary">Achievement:</span>
                <div className="text-sm text-tahoe-text-primary">{commission.target_achievement}%</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Target Achievement</span>
                <span className="text-sm text-tertiary">{commission.target_achievement}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    commission.target_achievement >= 100 ? 'bg-green-400' : 
                    commission.target_achievement >= 80 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(commission.target_achievement, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-sm text-tertiary">
                <span>Payment Date: {commission.payment_date}</span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewBonusDetails(commission)}
                    className="text-tahoe-accent hover:text-tahoe-accent-hover transition-all duration-tahoe"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={handleExportBonuses}
                    className="text-tahoe-success-text hover:text-tahoe-success-text/80 transition-colors"
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
        <h3 className="text-lg font-semibold">{t('bonuses.excelCommissionImport')}</h3>
      </div>

      <div className="p-6 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-tahoe-input">
            <p className="text-xs text-amber-200">
              {t('bonuses.supportedFormat')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-tahoe-text-primary">{t('bonuses.uploadExcelFile')}</label>
            <div className="border-2 border-dashed rounded-tahoe-input p-6 text-center" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-tahoe-text-muted">
                  {importFile ? importFile.name : 'Click to upload sales-person-performance.xlsx'}
                </p>
                <p className="text-xs text-tahoe-text-muted mt-1">
                  Supports .xlsx format with Name, Leads, Booked, Lost columns
                </p>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-tahoe-text-primary">Period Start *</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded-tahoe-input px-4 py-2 text-sm transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-tahoe-text-primary">Period End *</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-tahoe-input px-4 py-2 text-sm transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                required
              />
            </div>
          </div>
          <p className="text-xs text-tahoe-text-muted mt-1">
            Select the date range covered by the sales performance data
          </p>

          {importStatus && (
            <div className={`p-4 rounded-tahoe-input ${
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
              disabled={!importFile || !periodStart || !periodEnd}
              className="flex-1 px-6 py-3 rounded-tahoe-pill font-medium transition-all duration-tahoe disabled:cursor-not-allowed"
              style={{ backgroundColor: (!importFile || !periodStart || !periodEnd) ? 'rgba(255, 255, 255, 0.12)' : '#0A84FF', color: '#ffffff' }}
            >
              Import Sales Performance
            </button>
            <button
              onClick={() => {
                setImportFile(null);
                setImportStatus(null);
                setPeriodStart('');
                setPeriodEnd('');
              }}
              className="px-6 py-3 rounded-tahoe-pill font-medium transition-all duration-tahoe"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              {t('bonuses.clear')}
            </button>
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
          className="px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-all duration-tahoe"
          style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
        >
          + Add Structure
        </button>
      </div>

      <div className="grid gap-6">
        {/* Bonus Structures */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-tahoe-success-text">Bonus Structures</h4>
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
                      <div className="text-sm font-medium text-tahoe-success-text">Max: ${structure.max_bonus.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Calculation Method:</span>
                  <p className="text-sm text-tahoe-text-primary mt-1">{structure.calculation_method}</p>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Bonus Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="p-2 rounded-tahoe-input text-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                        <div className="text-tertiary">{tier.min_performance}-{tier.max_performance}%</div>
                        <div className="text-tahoe-success-text font-medium">{tier.bonus_percentage}% bonus</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Eligibility Criteria:</span>
                  <p className="text-sm text-tahoe-text-primary mt-1">{structure.eligibility_criteria}</p>
                </div>

                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => handleEditBonusStructure(structure)}
                    className="text-tahoe-accent hover:text-tahoe-accent-hover transition-all duration-tahoe"
                  >
                    Edit Structure
                  </button>
                  <button 
                    onClick={() => handleApplyBonusStructureToEmployees(structure)}
                    className="text-tahoe-success-text hover:text-tahoe-success-text/80 transition-colors"
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
          <h4 className="text-lg font-semibold mb-4 text-tahoe-info-text">Commission Structures</h4>
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
                      <div className="text-sm font-medium text-tahoe-info-text">Max: ${structure.max_commission.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="font-medium text-tertiary">Base Rate:</span>
                    <div className="text-sm text-tahoe-text-primary">{structure.base_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Acceleration Rate:</span>
                    <div className="text-sm text-tahoe-text-primary">{structure.acceleration_rate}%</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Threshold:</span>
                    <div className="text-sm text-tahoe-text-primary">${structure.threshold.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="font-medium text-tertiary">Calculation:</span>
                    <div className="text-sm text-tahoe-text-primary">{structure.calculation_method}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-tertiary">Commission Tiers:</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                    {structure.tiers.map((tier, index) => (
                      <div key={index} className="p-2 rounded-tahoe-input text-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                        <div className="text-tertiary">${tier.min_sales.toLocaleString()}-${tier.max_sales.toLocaleString()}</div>
                        <div className="text-tahoe-info-text font-medium">{tier.rate}% rate</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button 
                    onClick={() => handleEditBonusStructure(structure)}
                    className="text-tahoe-accent hover:text-tahoe-accent-hover transition-all duration-tahoe"
                  >
                    Edit Structure
                  </button>
                  <button 
                    onClick={() => handleApplyBonusStructureToEmployees(structure)}
                    className="text-tahoe-success-text hover:text-tahoe-success-text/80 transition-colors"
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

  // Inline editing functions
  const handleCellEdit = (recordId, fieldName, rawValue) => {
    if (userRole === 'user') return; // Users cannot edit
    
    setEditingRecordId(recordId);
    setEditingField(fieldName);
    // Use raw value (already extracted by getRawValue)
    setEditingValue(rawValue === null || rawValue === undefined ? '' : rawValue.toString());
  };

  const handleCellSave = async (recordId, fieldName) => {
    if (userRole === 'user') return;
    
    setSavingField(`${recordId}-${fieldName}`);
    try {
      // Convert editingValue to appropriate type
      let value = editingValue;
      
      // For numeric fields (currency, percentage), convert to number
      if (fieldName.includes('_pct') || fieldName.includes('_rate') || 
          fieldName.includes('revenue') || fieldName.includes('bonus') || 
          fieldName.includes('commission') || fieldName.includes('deduction') ||
          fieldName.includes('pay_period') || fieldName.includes('total') ||
          fieldName.includes('amount') || fieldName.includes('due')) {
        if (value === '' || value === null || value === undefined) {
          value = null;
        } else {
          const numValue = parseFloat(value);
          value = isNaN(numValue) ? null : numValue;
        }
      }
      
      const updateData = { [fieldName]: value };
      
      await API(`/api/commissions/monthly/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      // Refresh data
      await loadAnalyticsData();
      
      setEditingRecordId(null);
      setEditingField(null);
      setEditingValue('');
      setSuccessMessage('Field updated successfully');
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error updating field:', error);
      setErrorMessage(`Failed to update field: ${error.message}`);
      setShowErrorMessage(true);
    } finally {
      setSavingField(null);
    }
  };

  const handleCellCancel = () => {
    setEditingRecordId(null);
    setEditingField(null);
    setEditingValue('');
  };

  const renderEditableCell = (record, fieldName, displayValue, fieldType = 'currency', className = '') => {
    const isEditing = editingRecordId === record.id && editingField === fieldName;
    const isSaving = savingField === `${record.id}-${fieldName}`;
    const canEdit = userRole === 'manager' || userRole === 'admin';
    
    // Get raw value from record for editing (not formatted)
    const getRawValue = () => {
      // Try to get raw value first (from API)
      const rawValue = record[`${fieldName}_raw`];
      if (rawValue !== null && rawValue !== undefined) {
        return rawValue.toString();
      }
      
      // Fallback to formatted value and extract number
      const formatted = record[fieldName];
      if (formatted === null || formatted === undefined) return '';
      if (typeof formatted === 'string') {
        // If it's a formatted string, extract number
        const cleaned = formatted.replace(/[$,%]/g, '').trim();
        return cleaned === '' || cleaned === '-' ? '' : cleaned;
      }
      return formatted.toString();
    };
    
    if (isEditing && canEdit) {
      return (
        <td className={`py-2 px-3 ${className}`}>
          <div className="flex items-center gap-1">
            <input
              type={fieldType === 'percentage' ? 'number' : fieldType === 'text' ? 'text' : 'number'}
              step={fieldType === 'percentage' ? '0.1' : '0.01'}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave(record.id, fieldName);
                } else if (e.key === 'Escape') {
                  handleCellCancel();
                }
              }}
              className="w-24 px-2 py-1 rounded-tahoe-input text-sm transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
              autoFocus
            />
            <button
              onClick={() => handleCellSave(record.id, fieldName)}
              disabled={isSaving}
              className="btn-success btn-sm disabled:opacity-50"
              title="Save (Enter)"
            >
              ✓
            </button>
            <button
              onClick={handleCellCancel}
              className="btn-danger btn-sm"
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </div>
        </td>
      );
    }
    
    return (
      <td
        className={`py-2 px-3 ${className} ${canEdit ? 'cursor-pointer hover:bg-tahoe-bg-hover transition-all duration-tahoe' : ''}`}
        onDoubleClick={() => {
          if (canEdit) {
            const rawVal = getRawValue();
            handleCellEdit(record.id, fieldName, rawVal);
          }
        }}
        title={canEdit ? 'Double-click to edit' : ''}
      >
        {isSaving ? (
          <span className="text-tahoe-text-muted">Saving...</span>
        ) : (
          displayValue
        )}
      </td>
    );
  };

  const renderAnalytics = () => {
    if (loading) {
      return <div className="text-center py-8">{t('bonuses.loadingAnalytics')}</div>;
    }
    
    if (availablePeriods.length === 0) {
      return (
        <div className="space-y-6">
          <CommissionLegend />
        </div>
      );
    }
    
    return (
    <div className="space-y-6">
        {/* Period Selector */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('bonuses.commissionAnalytics')}</h3>
            <button
              onClick={loadAnalyticsData}
              className="btn-primary btn-sm"
            >
              🔄 {t('common.refresh')}
            </button>
          </div>
          
          {/* Period Selector - Matches Payroll Style */}
          <div className="card p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Commission Period Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-tahoe-text-primary">Commission Period</label>
                <select
                  value={selectedPeriod || ""}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setShowCalendar(false);
                  }}
                  className="w-full px-4 py-2 rounded-tahoe-input border focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-tahoe-text-primary"
                >
                  <option value="">Select commission period...</option>
                  {availablePeriods.map((period) => {
                    // Use period_month as the key and value (this is what the API expects)
                    const periodKey = period.period_month;
                    
                    // Display format for 4-week periods
                    let displayText;
                    if (period.period_start && period.period_end) {
                      displayText = `${period.period_start_label} - ${period.period_end_label}`;
                    } else {
                      // Fallback to old format
                      const [year, month] = period.period_month.split('-');
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      displayText = `${monthNames[parseInt(month) - 1]} ${year}`;
                    }
                    
                    return (
                      <option key={periodKey} value={periodKey}>
                        {displayText}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Summary Stats */}
              {selectedPeriod && (() => {
                const selectedPeriodData = availablePeriods.find(p => p.period_month === selectedPeriod);
                if (!selectedPeriodData) return null;
                
                return (
                  <div className="flex items-end">
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div>
                        <div className="text-xs text-secondary uppercase">Paydays</div>
                        <div className="text-sm font-medium text-primary">
                          {selectedPeriodData.payday_1 && selectedPeriodData.payday_2 ? (
                            <>{selectedPeriodData.payday_1_label} & {selectedPeriodData.payday_2_label}</>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-secondary uppercase">Employees</div>
                        <div className="text-lg font-semibold text-primary">
                          {selectedPeriodData.employee_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10 pr-10"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-tahoe-text-muted hover:text-tahoe-text-primary transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-secondary">
              Found {filteredMonthly.length} result{filteredMonthly.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {analyticsData && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-tahoe-success-text">
                ${(analyticsData.total_commission_earned || 0).toLocaleString()}
              </div>
              <div className="text-xs text-tertiary">Commission Earned</div>
              <div className="text-xs text-tahoe-text-muted mt-1">(before deductions)</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-tahoe-warning-text">
                ${(analyticsData.total_due || 0).toLocaleString()}
              </div>
              <div className="text-xs text-tertiary">Total Due</div>
              <div className="text-xs text-tahoe-text-muted mt-1">(after deductions)</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-tahoe-info-text">
                ${(analyticsData.total_amount_paid || 0).toLocaleString()}
              </div>
              <div className="text-xs text-tertiary">Amount Paid</div>
              <div className="text-xs text-tahoe-text-muted mt-1">(paid to employees)</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-tahoe-primary-bg">
                ${(analyticsData.total_remaining || 0).toLocaleString()}
              </div>
              <div className="text-xs text-tertiary">Remaining</div>
              <div className="text-xs text-tahoe-text-muted mt-1">(still owed)</div>
        </div>
        <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-tahoe-primary-bg">
                {analyticsData.total_employees || 0}
        </div>
              <div className="text-xs text-tertiary">Employees</div>
              <div className="text-xs text-tahoe-text-muted mt-1">(with commissions)</div>
      </div>
          </div>
        )}

        {/* Commission Structure Legend - Always visible */}
        <CommissionLegend />

        {/* Unified Commissions & Bonuses Table - All Fields Combined */}
        <div className="card p-6">
          <h4 className="text-lg font-semibold mb-4 text-tahoe-primary-bg">
            📋 Commissions & Bonuses ({filteredMonthly.length})
          </h4>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-tahoe-card-bg z-20">
                <tr className="border-b border-tahoe-border-primary">
                  <th className="text-left py-2 px-3 sticky left-0 bg-tahoe-card-bg z-30">Name</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Hourly Rate</th>
                  
                  {/* Revenue Fields */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Revenue SM (All locations)</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Revenue Add Ons+</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Revenue Deduction</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Total Revenue</th>
                  
                  {/* Commission Fields */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Booking %</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Commission %</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Commission Earned</th>
                  
                  {/* Bonus Fields */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Spiff Bonus</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Revenue Bonus</th>
                  
                  {/* US Revenue & Commission Fields */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Total US Revenue</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Commission % (US)</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Commission Earned US</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">1.25X</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Bonuses for US Jobs 1.25X</th>
                  
                  {/* Booking Bonus/Deduction */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">$5/$10 Bonus</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">$5/$10 Deduction</th>
                  
                  {/* Pay Periods */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Pay Period 1</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Cash Paid (PP1)</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Pay Period 2</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Cash Paid (PP2)</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Pay Period 3</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Cash Paid (PP3)</th>
                  
                  {/* Deductions */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">- Hourly Paid Out</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">- Deduction by Sales Manager</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Missing Punch Deduction</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Customer Support Deduction</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Post Commission Deduction</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Dispatch Deduction</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Other Deduction</th>
                  
                  {/* Totals */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg text-tahoe-success-text font-semibold">Total Due</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg text-tahoe-info-text font-semibold">Amount Paid</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg text-tahoe-primary-bg font-semibold">Remaining Amount</th>
                  
                  {/* Notes */}
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Corporate Open Jobs</th>
                  <th className="text-left py-2 px-3 bg-tahoe-card-bg">Parking Pass Fee</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.length > 0 ? filteredMonthly.map((record, idx) => (
                  <tr key={record.id || idx} className="border-b border-tahoe-border-primary hover:bg-tahoe-card-bg/50">
                    <td className="py-2 px-3 font-medium sticky left-0 bg-tahoe-card-bg z-10">{record.employee_name || record.name_raw}</td>
                    {renderEditableCell(record, 'hourly_rate', formatCurrencyDisplay(record.hourly_rate), 'currency')}
                    {renderEditableCell(record, 'rev_sm_all_locations', formatCurrencyDisplay(record.rev_sm_all_locations), 'currency')}
                    {renderEditableCell(record, 'rev_add_ons', formatCurrencyDisplay(record.rev_add_ons), 'currency')}
                    {renderEditableCell(record, 'rev_deduction', formatCurrencyDisplay(record.rev_deduction), 'currency')}
                    {renderEditableCell(record, 'total_revenue_all', formatCurrencyDisplay(record.total_revenue_all), 'currency')}
                    {renderEditableCell(record, 'booking_pct', formatPercentageDisplay(record.booking_pct), 'percentage')}
                    {renderEditableCell(record, 'commission_pct', formatPercentageDisplay(record.commission_pct), 'percentage')}
                    {renderEditableCell(record, 'commission_earned', formatCurrencyDisplay(record.commission_earned), 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'spiff_bonus', formatCurrencyDisplay(record.spiff_bonus), 'currency')}
                    {renderEditableCell(record, 'revenue_bonus', formatCurrencyDisplay(record.revenue_bonus), 'currency')}
                    {renderEditableCell(record, 'bonus_us_jobs_125x', formatCurrencyDisplay(record.bonus_us_jobs_125x), 'currency')}
                    {renderEditableCell(record, 'total_us_revenue', formatCurrencyDisplay(record.total_us_revenue), 'currency')}
                    {renderEditableCell(record, 'commission_pct_us', formatPercentageDisplay(record.commission_pct_us), 'percentage')}
                    {renderEditableCell(record, 'commission_earned_us', formatCurrencyDisplay(record.commission_earned_us), 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'commission_125x', formatCurrencyDisplay(record.commission_125x), 'currency', 'text-yellow-400')}
                    {renderEditableCell(record, 'booking_bonus_plus', formatCurrencyDisplay(record.booking_bonus_plus), 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'booking_bonus_minus', formatCurrencyDisplay(record.booking_bonus_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'pay_period_1', formatCurrencyDisplay(record.pay_period_1), 'currency')}
                    {renderEditableCell(record, 'pay_period_1_cash_paid', record.pay_period_1_cash_paid ? formatCurrencyDisplay(record.pay_period_1_cash_paid) : '-', 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'pay_period_2', formatCurrencyDisplay(record.pay_period_2), 'currency')}
                    {renderEditableCell(record, 'pay_period_2_cash_paid', record.pay_period_2_cash_paid ? formatCurrencyDisplay(record.pay_period_2_cash_paid) : '-', 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'pay_period_3', formatCurrencyDisplay(record.pay_period_3), 'currency')}
                    {renderEditableCell(record, 'pay_period_3_cash_paid', record.pay_period_3_cash_paid ? formatCurrencyDisplay(record.pay_period_3_cash_paid) : '-', 'currency', 'text-tahoe-success-text')}
                    {renderEditableCell(record, 'hourly_paid_out_minus', formatCurrencyDisplay(record.hourly_paid_out_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_sales_manager_minus', formatCurrencyDisplay(record.deduction_sales_manager_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_missing_punch_minus', formatCurrencyDisplay(record.deduction_missing_punch_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_customer_support_minus', formatCurrencyDisplay(record.deduction_customer_support_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_post_commission_collected_minus', formatCurrencyDisplay(record.deduction_post_commission_collected_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_dispatch_minus', formatCurrencyDisplay(record.deduction_dispatch_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'deduction_other_minus', formatCurrencyDisplay(record.deduction_other_minus), 'currency', 'text-red-400')}
                    {renderEditableCell(record, 'total_due', formatCurrencyDisplay(record.total_due), 'currency', 'text-tahoe-success-text font-semibold')}
                    {renderEditableCell(record, 'amount_paid', formatCurrencyDisplay(record.amount_paid), 'currency', 'text-tahoe-info-text font-semibold')}
                    {renderEditableCell(record, 'remaining_amount', formatCurrencyDisplay(record.remaining_amount), 'currency', 'text-purple-400 font-semibold')}
                    {renderEditableCell(record, 'corporate_open_jobs_note', record.corporate_open_jobs_note || '-', 'text', 'text-neutral-400 text-xs')}
                    {renderEditableCell(record, 'parking_pass_fee_note', record.parking_pass_fee_note || '-', 'text', 'text-neutral-400 text-xs')}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="38" className="py-4 px-4 text-center text-tahoe-text-muted">
                      No commission data for this period
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

  // ============================================================================
  // Sales Commissions Tab Content
  // ============================================================================
  const renderSalesCommissions = () => (
    <div className="space-y-6">
      {/* Title for users */}
      {userRole === 'user' && salesRole && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>💰</span> My Commission Details
          </h3>
          <p className="text-tahoe-text-muted mt-2">
            {salesRole === 'agent' 
              ? 'Your sales agent commission based on your booking percentage and revenue performance.'
              : 'Your sales manager commission based on team performance.'}
          </p>
        </div>
      )}
      
      {/* Period Selector for Sales Users */}
      {userRole === 'user' && salesRole && salesCommissionPeriods.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📅</span> Select Period
          </h3>
          <div className="flex flex-wrap gap-2">
            {salesCommissionPeriods.map((period, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSalesPeriod({ start: period.period_start, end: period.period_end })}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  selectedSalesPeriod.start === period.period_start && selectedSalesPeriod.end === period.period_end
                    ? 'bg-tahoe-accent text-white'
                    : 'bg-tahoe-bg-secondary hover:bg-tahoe-bg-secondary/80 text-tahoe-text-secondary'
                }`}
              >
                {period.label || `${period.period_start} - ${period.period_end}`}
              </button>
            ))}
          </div>
          {selectedSalesPeriod.start && (
            <p className="text-sm text-tahoe-text-muted mt-3">
              Showing commissions for: {selectedSalesPeriod.start} to {selectedSalesPeriod.end}
            </p>
          )}
        </div>
      )}
      
      {/* Empty state when no periods exist for sales users */}
      {userRole === 'user' && salesRole && salesCommissionPeriods.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-tahoe-text-muted">No commission periods available yet.</p>
        </div>
      )}
      
      {/* Period Selection and Calculate Section - Admin/Manager only */}
      {userRole !== 'user' && (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚙️</span> Calculate Sales Commissions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Period Start</label>
            <input
              type="date"
              value={selectedSalesPeriod.start}
              onChange={(e) => setSelectedSalesPeriod({ ...selectedSalesPeriod, start: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-tahoe-bg-secondary border border-tahoe-border-primary focus:ring-2 focus:ring-tahoe-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Period End</label>
            <input
              type="date"
              value={selectedSalesPeriod.end}
              onChange={(e) => setSelectedSalesPeriod({ ...selectedSalesPeriod, end: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-tahoe-bg-secondary border border-tahoe-border-primary focus:ring-2 focus:ring-tahoe-accent"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 mb-2 text-sm">
              <input
                type="checkbox"
                checked={salesDryRun}
                onChange={(e) => setSalesDryRun(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Dry Run (preview only)
            </label>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCalculateSalesCommissions}
              disabled={!selectedSalesPeriod.start || !selectedSalesPeriod.end || salesCalcLoading}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salesCalcLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculating...
                </>
              ) : (
                <>
                  <span>🧮</span>
                  {salesDryRun ? 'Preview Calculation' : 'Calculate Commissions'}
                </>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Existing periods quick select */}
        {salesCommissionPeriods.length > 0 && (
          <div className="mt-4 pt-4 border-t border-tahoe-border-primary">
            <label className="block text-sm font-medium mb-2">Or select existing period:</label>
            <div className="flex flex-wrap gap-2">
              {salesCommissionPeriods.map((period, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSalesPeriod({ start: period.period_start, end: period.period_end })}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    selectedSalesPeriod.start === period.period_start && selectedSalesPeriod.end === period.period_end
                      ? 'bg-tahoe-accent text-white'
                      : 'bg-tahoe-bg-secondary hover:bg-tahoe-bg-secondary/80 text-tahoe-text-secondary'
                  }`}
                >
                  {period.label || `${period.period_start} - ${period.period_end}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
      
      {/* Calculation Result - Admin/Manager only */}
      {userRole !== 'user' && salesCalcResult && (
        <div className="card p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>✅</span> Calculation Result {salesCalcResult.summary?.dry_run && '(Preview)'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-tahoe-bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {salesCalcResult.summary?.matched_agents || 0}
                {salesCalcResult.summary?.unmatched_count > 0 && (
                  <span className="text-sm text-yellow-400 ml-1">+{salesCalcResult.summary.unmatched_count}</span>
                )}
              </div>
              <div className="text-xs text-tahoe-text-muted">
                Matched{salesCalcResult.summary?.unmatched_count > 0 && ' + Unmatched'} Agents
              </div>
            </div>
            <div className="p-3 bg-tahoe-bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-cyan-400">
                {formatCurrencyDisplay(salesCalcResult.summary?.total_staging_revenue)}
              </div>
              <div className="text-xs text-tahoe-text-muted">Total Pool (for managers)</div>
            </div>
            <div className="p-3 bg-tahoe-bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {formatCurrencyDisplay(salesCalcResult.summary?.total_agent_commission)}
              </div>
              <div className="text-xs text-tahoe-text-muted">Agent Commission</div>
            </div>
            <div className="p-3 bg-tahoe-bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {formatCurrencyDisplay(salesCalcResult.summary?.total_manager_commission)}
              </div>
              <div className="text-xs text-tahoe-text-muted">Manager Commission</div>
            </div>
            <div className="p-3 bg-tahoe-bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrencyDisplay(salesCalcResult.summary?.total_vacation_awards)}
              </div>
              <div className="text-xs text-tahoe-text-muted">Vacation Awards</div>
            </div>
          </div>
          
          {/* Unmatched names warning */}
          {salesCalcResult.summary?.unmatched_names?.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
              <div className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                <span>⚠️</span> Unmatched Names ({salesCalcResult.summary.unmatched_names.length})
              </div>
              <div className="text-sm text-yellow-300/80">
                The following names could not be matched to employees (no personal commission), 
                but their revenue <strong className="text-yellow-200">IS included</strong> in manager commission calculations:
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {salesCalcResult.summary.unmatched_names.map((name, idx) => (
                  <span key={idx} className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded">
                    {name}
                  </span>
                ))}
              </div>
              <div className="text-xs text-yellow-400/60 mt-2">
                To assign personal commissions to these agents, ensure their employee nicknames match exactly with imported data names.
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Summary Card - Admin/Manager only */}
      {userRole !== 'user' && salesCommissionSummary && salesCommissionSummary.agent_count > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Period Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-tahoe-bg-secondary rounded-lg text-center">
              <div className="text-3xl font-bold text-tahoe-accent">{salesCommissionSummary.agent_count}</div>
              <div className="text-sm text-tahoe-text-muted mt-1">Agents</div>
            </div>
            <div className="p-4 bg-tahoe-bg-secondary rounded-lg text-center">
              <div className="text-3xl font-bold text-green-400">{salesCommissionSummary.total_agent_commission_formatted}</div>
              <div className="text-sm text-tahoe-text-muted mt-1">Agent Commission</div>
            </div>
            <div className="p-4 bg-tahoe-bg-secondary rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-400">{salesCommissionSummary.total_manager_commission_formatted}</div>
              <div className="text-sm text-tahoe-text-muted mt-1">Manager Commission</div>
            </div>
            <div className="p-4 bg-tahoe-bg-secondary rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-400">{formatCurrencyDisplay(salesCommissionSummary.total_vacation_awards)}</div>
              <div className="text-sm text-tahoe-text-muted mt-1">Vacation Awards</div>
            </div>
            <div className="p-4 bg-tahoe-bg-secondary rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-400">{salesCommissionSummary.total_commission_formatted}</div>
              <div className="text-sm text-tahoe-text-muted mt-1">Total Commission</div>
            </div>
          </div>
          
          {/* Unmatched names in summary */}
          {salesCommissionSummary.unmatched_names && salesCommissionSummary.unmatched_names.length > 0 && (
            <div className="mt-4 p-3 bg-orange-900/20 border border-orange-600/30 rounded-lg">
              <div className="text-sm text-orange-400 font-medium">
                {salesCommissionSummary.unmatched_names.length} name(s) couldn't be matched
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Agent Commissions Table - Show for admins/managers or users with sales_role='agent' */}
      {(userRole !== 'user' || salesRole === 'agent') && (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>👤</span> {userRole === 'user' ? 'My Agent Commission' : 'Agent Commissions'}
        </h3>
        
        {salesAgentCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-tahoe-text-muted border-b border-tahoe-border-primary">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium text-right">Booking %</th>
                  <th className="pb-3 font-medium text-right">Revenue</th>
                  <th className="pb-3 font-medium text-right">Rate</th>
                  <th className="pb-3 font-medium text-right">Commission</th>
                  <th className="pb-3 font-medium text-right">Vacation</th>
                </tr>
              </thead>
              <tbody>
                {salesAgentCommissions.map((agent, idx) => (
                  <tr key={idx} className="border-b border-tahoe-border-primary/50 hover:bg-tahoe-bg-secondary/30">
                    <td className="py-3">
                      <div className="font-medium">{agent.employee_name}</div>
                      <div className="text-xs text-tahoe-text-muted">{agent.nickname}</div>
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        parseFloat(agent.booking_pct) >= 40 ? 'bg-green-900/50 text-green-300' :
                        parseFloat(agent.booking_pct) >= 30 ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/50 text-red-300'
                      }`}>
                        {formatPercentageDisplay(agent.booking_pct)}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono">{agent.revenue_formatted}</td>
                    <td className="py-3 text-right font-mono text-tahoe-accent">{agent.commission_pct}%</td>
                    <td className="py-3 text-right font-mono text-green-400 font-semibold">{agent.commission_amount_formatted}</td>
                    <td className="py-3 text-right">
                      {agent.vacation_award_value > 0 ? (
                        <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded text-sm">
                          🎉 {agent.vacation_award_formatted}
                        </span>
                      ) : (
                        <span className="text-tahoe-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-tahoe-bg-secondary/50">
                  <td className="py-3" colSpan="4">Total</td>
                  <td className="py-3 text-right text-green-400">
                    {formatCurrencyDisplay(salesAgentCommissions.reduce((sum, a) => sum + parseFloat(a.commission_amount || 0), 0))}
                  </td>
                  <td className="py-3 text-right text-yellow-400">
                    {formatCurrencyDisplay(salesAgentCommissions.reduce((sum, a) => sum + parseFloat(a.vacation_award_value || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-tahoe-text-muted">
            <span className="text-4xl mb-2 block">📭</span>
            {userRole === 'user' 
              ? 'No commission data available for the current period.'
              : 'No agent commissions for selected period.'}
            {userRole !== 'user' && !selectedSalesPeriod.start && <span className="block text-sm mt-1">Select a period or calculate commissions.</span>}
          </div>
        )}
      </div>
      )}
      
      {/* Manager Commissions Table - Show for admins/managers or users with sales_role='manager' */}
      {(userRole !== 'user' || salesRole === 'manager') && (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>👔</span> {userRole === 'user' ? 'My Manager Commission' : 'Manager Commissions'}
        </h3>
        
        {salesManagerCommissions.length > 0 ? (
          <div className="space-y-4">
            {salesManagerCommissions.map((manager, idx) => (
              <div key={idx} className="p-4 bg-tahoe-bg-secondary rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-semibold text-lg">{manager.employee_name}</div>
                    <div className="text-sm text-tahoe-text-muted">
                      {manager.calculation_method === 'fixed_override' ? (
                        <span className="text-purple-400">Fixed Rate: {manager.commission_pct_override}%</span>
                      ) : (
                        <span>Bucket-Sum Calculation</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">{manager.commission_amount_formatted}</div>
                    <div className="text-xs text-tahoe-text-muted">from {manager.pooled_revenue_formatted} pooled</div>
                  </div>
                </div>
                
                {/* Bucket breakdown for bucket-sum method */}
                {manager.calculation_method === 'bucket_sum' && manager.breakdown && manager.breakdown.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-tahoe-border-primary">
                    <div className="text-sm font-medium mb-2 text-tahoe-text-muted">Bucket Breakdown:</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {manager.breakdown.map((bucket, bidx) => (
                        <div key={bidx} className="p-2 bg-tahoe-bg-primary rounded text-center">
                          <div className="text-xs text-tahoe-text-muted">{bucket.bucket_label}</div>
                          <div className="text-xs text-tahoe-accent">{bucket.bucket_rate_pct}% rate</div>
                          <div className="text-sm font-medium">{bucket.agent_count} agents</div>
                          <div className="text-xs text-green-400">{bucket.bucket_commission_formatted}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-tahoe-text-muted">
            <span className="text-4xl mb-2 block">📭</span>
            {userRole === 'user' 
              ? 'No commission data available for the current period.'
              : 'No manager commissions for selected period.'}
          </div>
        )}
      </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bonuses and commissions data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Upload Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('bonuses.title')}</h1>
          <p className="text-tertiary mt-1">{t('bonuses.description')}</p>
        </div>
        {/* Hide upload button for user role */}
        {userRole !== 'user' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("import")}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {t('bonuses.uploadCommissionData')}
          </motion.button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-tahoe-card-bg p-1 rounded-tahoe-input">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-tahoe-accent text-white"
                : "text-tahoe-text-secondary hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {userRole !== 'user' && activeTab === "import" && renderImport()}
        {activeTab === "analytics" && renderAnalytics()}
        {(userRole !== 'user' || salesRole) && activeTab === "sales-commissions" && renderSalesCommissions()}
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
                    <select className="form-select">
                      <option>Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bonus Type</label>
                    <select className="form-select">
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
                      className="form-input"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="form-select">
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
                    className="form-input"
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
                    className="btn-primary"
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
                    <select className="form-select">
                      <option>Select Employee</option>
                      {employees.filter(emp => emp.commission_rate > 0).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commission Type</label>
                    <select className="form-select">
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
                      className="form-input"
                      placeholder="150000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <select className="form-select">
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
                      className="form-input"
                      placeholder="120000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Achievement</label>
                    <input
                      type="text"
                      className="form-input"
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
                    className="btn-primary"
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
                      className="form-input"
                      placeholder="e.g., Sales Performance Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <select className="form-select">
                      <option value="All">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Structure Type</label>
                    <select className="form-select">
                      <option value="Bonus">Bonus</option>
                      <option value="Commission">Commission</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Amount</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calculation Method</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="Describe how the compensation is calculated..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Eligibility Criteria</label>
                  <textarea
                    rows={2}
                    className="form-input"
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
                    className="btn-primary"
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
                      className="form-input"
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
                      className="form-input"
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
                      className="form-input"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Period</label>
                    <input
                      type="text"
                      value={editingBonus.period}
                      onChange={(e) => setEditingBonus({...editingBonus, period: e.target.value})}
                      className="form-input"
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
                    className="form-input"
                    placeholder="Describe the criteria for this bonus..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={editingBonus.status}
                    onChange={(e) => setEditingBonus({...editingBonus, status: e.target.value})}
                    className="form-input"
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
                    className="btn-primary"
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
                      className="form-input"
                      placeholder="e.g., Sales Performance Bonus"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Amount</label>
                    <input
                      type="number"
                      value={editingStructure.base_amount}
                      onChange={(e) => setEditingStructure({...editingStructure, base_amount: e.target.value})}
                      className="form-input"
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
                    className="form-input"
                    placeholder="Describe the criteria for this structure..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Calculation Method</label>
                  <textarea
                    rows={3}
                    value={editingStructure.calculation_method}
                    onChange={(e) => setEditingStructure({...editingStructure, calculation_method: e.target.value})}
                    className="form-input"
                    placeholder="Describe how this structure is calculated..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Effective Date</label>
                  <input
                    type="date"
                    value={editingStructure.effective_date}
                    onChange={(e) => setEditingStructure({...editingStructure, effective_date: e.target.value})}
                    className="form-input"
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
                    className="btn-primary"
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
              <div className="mb-4 p-4 bg-tahoe-card-bg rounded-tahoe-input">
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
                    className="form-input"
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
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Approval Notes</label>
                  <textarea
                    rows={3}
                    value={approveData.approval_notes}
                    onChange={(e) => setApproveData({...approveData, approval_notes: e.target.value})}
                    className="form-input"
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
                    className="btn-primary bg-green-600 hover:bg-green-700"
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
              <div className="mb-4 p-4 bg-tahoe-card-bg rounded-tahoe-input">
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
                    className="form-input"
                    placeholder="Enter rejector name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rejection Reason *</label>
                  <select
                    value={rejectData.rejection_reason}
                    onChange={(e) => setRejectData({...rejectData, rejection_reason: e.target.value})}
                    className="form-input"
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
                    className="form-input"
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
                    className="btn-danger"
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
                  <div className="p-4 bg-tahoe-card-bg rounded-tahoe-input">
                    <h4 className="font-medium mb-2 text-tahoe-accent">Employee Information</h4>
                    <p><strong>Name:</strong> {actionBonus.employee_name}</p>
                    <p><strong>Department:</strong> {actionBonus.department || 'N/A'}</p>
                    <p><strong>Role:</strong> {actionBonus.role_title || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-tahoe-card-bg rounded-tahoe-input">
                    <h4 className="font-medium mb-2 text-tahoe-accent">Bonus Information</h4>
                    <p><strong>Amount:</strong> ${actionBonus.amount}</p>
                    <p><strong>Type:</strong> {actionBonus.bonus_type}</p>
                    <p><strong>Period:</strong> {actionBonus.period}</p>
                  </div>
                </div>
                <div className="p-4 bg-tahoe-card-bg rounded-tahoe-input">
                  <h4 className="font-medium mb-2 text-tahoe-accent">Status & Approval</h4>
                  <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
                    actionBonus.status === 'Approved' ? 'bg-green-900 text-green-300' :
                    actionBonus.status === 'Rejected' ? 'bg-red-900 text-red-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>{actionBonus.status}</span></p>
                  <p><strong>Approved by:</strong> {actionBonus.approved_by || 'Pending'}</p>
                  <p><strong>Created:</strong> {formatShortDate(actionBonus.created_at)}</p>
                </div>
                <div className="p-4 bg-tahoe-card-bg rounded-tahoe-input">
                  <h4 className="font-medium mb-2 text-tahoe-accent">Criteria & Notes</h4>
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
                  className="btn-primary"
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
                      className="form-input"
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
                      className="form-input"
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
                      className="form-input"
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
                    className="btn-primary bg-green-600 hover:bg-green-700"
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
              <div className="mb-4 p-4 bg-tahoe-card-bg rounded-tahoe-input">
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
                    className="form-input"
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
                      className="form-input"
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
                    className="form-input"
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
                    className="btn-primary"
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
                <p className="text-tahoe-text-primary">{successMessage}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="btn-primary bg-green-600 hover:bg-green-700"
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
                <p className="text-tahoe-text-primary">{errorMessage}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowErrorMessage(false)}
                  className="btn-danger"
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
