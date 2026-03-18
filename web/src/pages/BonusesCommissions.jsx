import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../hooks/useUserRole.js';

import { API, APIUpload } from '../config/api.js';
import { formatShortDate, formatYMD, normalizeYMD } from '../utils/timezone.js';
import CommissionLegend from '../components/CommissionLegend.jsx';
import DateRangePicker from '../components/DateRangePicker.jsx';
import DatePicker from '../components/DatePicker.jsx';

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
  
  // Helper to format deduction values as negative currency (shows '-' for empty/0)
  const formatDeductionDisplay = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
    if (isNaN(num) || num <= 0) return '-';
    // Always display as negative, using -Math.abs to avoid double negatives
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(-Math.abs(num));
  };
  
  // Helper to handle agent table column sort click
  const handleAgentSort = (column) => {
    if (agentSortColumn === column) {
      setAgentSortDirection(agentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAgentSortColumn(column);
      setAgentSortDirection('asc');
    }
  };
  
  // Helper to compute agent total for sorting
  const computeAgentTotal = (agent) => {
    return parseFloat(agent.commission_amount || 0) +
           parseFloat(agent.revenue_add_ons || 0) +
           parseFloat(agent.booking_bonus_plus || 0) -
           parseFloat(agent.revenue_deductions || 0) -
           parseFloat(agent.booking_bonus_minus || 0);
  };
  
  // Default to sales-commissions for users with sales_role, otherwise analytics
  const [activeTab, setActiveTab] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [bonusStructures, setBonusStructures] = useState([]);
  const [commissionStructures, setCommissionStructures] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
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
  
  // ──────────────────────────────────────────────────────────────────────────
  // OLD SYSTEM STATE - DEPRECATED (kept for reference, not used in new system)
  // ──────────────────────────────────────────────────────────────────────────
  // Sales Commissions state (OLD)
  // const [salesCommissionPeriods, setSalesCommissionPeriods] = useState([]);
  // const [selectedSalesPeriod, setSelectedSalesPeriod] = useState({ start: '', end: '' });
  // const [salesAgentCommissions, setSalesAgentCommissions] = useState([]);
  // const [salesManagerCommissions, setSalesManagerCommissions] = useState([]);
  // const [salesCommissionSummary, setSalesCommissionSummary] = useState(null);
  // const [salesCalcLoading, setSalesCalcLoading] = useState(false);
  // const [salesCalcResult, setSalesCalcResult] = useState(null);
  // const [salesDryRun, setSalesDryRun] = useState(false);
  
  // Agent table sorting state (OLD)
  // const [agentSortColumn, setAgentSortColumn] = useState('employee_name');
  // const [agentSortDirection, setAgentSortDirection] = useState('asc');
  
  // Import-related state variables (OLD)
  // const [importFile, setImportFile] = useState(null);
  // const [importStatus, setImportStatus] = useState(null);
  // const [periodStart, setPeriodStart] = useState('');
  // const [periodEnd, setPeriodEnd] = useState('');
  // const [monthlyCommissions, setMonthlyCommissions] = useState([]);
  // ──────────────────────────────────────────────────────────────────────────
  
  
  // Lead Status and Booked Opportunities import state
  const [leadStatusFile, setLeadStatusFile] = useState(null);
  const [leadStatusImportStatus, setLeadStatusImportStatus] = useState(null);
  const [bookedOpportunitiesFile, setBookedOpportunitiesFile] = useState(null);
  const [bookedOpportunitiesImportStatus, setBookedOpportunitiesImportStatus] = useState(null);
  const [adjustmentImportStatus, setAdjustmentImportStatus] = useState(null);
  
  // Commission Drafts state (NEW SYSTEM)
  const [commissionDrafts, setCommissionDrafts] = useState([]);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftLineItems, setDraftLineItems] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftUploadStatus, setDraftUploadStatus] = useState(null);
  const [performanceFile, setPerformanceFile] = useState(null);
  const [commissionSummaryFile, setCommissionSummaryFile] = useState(null);
  const [leadStatusDraftFile, setLeadStatusDraftFile] = useState(null);
  const [draftPeriodStart, setDraftPeriodStart] = useState('');
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('');
  const [savingLineItems, setSavingLineItems] = useState(new Set());
  const [editValues, setEditValues] = useState({});
  
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
    // Commission Drafts tab - NEW draft-based workflow (only tab)
    ...((userRole !== 'user' || salesRole) ? [{ 
      id: "commission-drafts", 
      name: userRole === 'user' ? "My Commissions" : "Commissions", 
      icon: "💰" 
    }] : [])
  ];

  // Set default tab based on role
  useEffect(() => {
    if (activeTab === null && userRole !== null) {
      // Default to commission-drafts for all users with access
      if (userRole === 'user' && salesRole) {
        setActiveTab('commission-drafts');
      } else if (userRole !== 'user') {
        setActiveTab('commission-drafts');
      } else {
        setActiveTab('commission-drafts');
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
      setInitialLoading(true);
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
        setInitialLoading(false);
      }
    } catch (error) {
      console.error("Error loading periods:", error);
      setAvailablePeriods([]);
      setInitialLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedPeriod) return;
    
    try {
      setInitialLoading(true);
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
      setInitialLoading(false);
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
  // Commission Drafts — Functions (NEW SYSTEM)
  // ============================================================================

  // ── Debounce utility ────────────────────────────────────────────────────────
  const debounceTimers = React.useRef({});
  const debounceCall = (key, fn, wait = 600) => {
    clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(fn, wait);
  };

  // ── Load list of all drafts ─────────────────────────────────────────────────
  const loadCommissionDrafts = async () => {
    try {
      const drafts = await API('/api/commission-drafts');
      setCommissionDrafts(drafts || []);
      // Auto-select most recent if none is selected
      if (drafts?.length > 0 && !selectedDraft) {
        await loadDraft(drafts[0].id);
      }
    } catch (err) {
      console.error('Failed to load commission drafts:', err);
    }
  };

  // ── Load a single draft + its line items ───────────────────────────────────
  const loadDraft = async (draftId) => {
    try {
      setDraftLoading(true);
      const draft = await API(`/api/commission-drafts/${draftId}`);
      applyDraftToState(draft);
    } catch (err) {
      console.error('Failed to load draft:', err);
    } finally {
      setDraftLoading(false);
    }
  };

  // ── Apply a draft response to local state ──────────────────────────────────
  const applyDraftToState = (draft) => {
    setSelectedDraft(draft);
    setDraftLineItems(draft.lineItems || []);
    // Seed editable values from server data (only manual fields)
    setEditValues(prev => {
      const next = { ...prev };
      draft.lineItems?.forEach(item => {
        if (!next[item.id]) next[item.id] = {};
        MANUAL_FIELDS.forEach(f => {
          next[item.id][f] = item[f] ?? 0;
        });
      });
      return next;
    });
  };

  // Manual fields whitelist (used in edit + save)
  const MANUAL_FIELDS = [
    'spiff_bonus', 'revenue_bonus',
    'booking_bonus_5_10_plus', 'booking_bonus_5_10_minus',
    'hourly_paid_out', 'deduction_sales_manager', 'deduction_missing_punch',
    'deduction_customer_support', 'deduction_post_commission',
    'deduction_dispatch', 'deduction_other',
  ];

  // ── Polling: while calculation_status === 'calculating', poll every 3 s ───
  const pollingRef = React.useRef(null);

  const startPolling = (draftId) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const draft = await API(`/api/commission-drafts/${draftId}`);
        applyDraftToState(draft);
        if (draft.calculation_status !== 'calculating') {
          stopPolling();
          // Refresh the draft list so the status badge updates
          const drafts = await API('/api/commission-drafts');
          setCommissionDrafts(drafts || []);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Start / stop polling whenever the selected draft changes calculation_status
  useEffect(() => {
    if (selectedDraft?.calculation_status === 'calculating') {
      startPolling(selectedDraft.id);
    } else {
      stopPolling();
    }
    return stopPolling; // cleanup on unmount
  }, [selectedDraft?.id, selectedDraft?.calculation_status]);

  // ── Load drafts when tab is first opened ──────────────────────────────────
  useEffect(() => {
    if (activeTab === 'commission-drafts' && (userRole !== 'user' || salesRole)) {
      loadCommissionDrafts();
    }
    // Stop polling when leaving the tab
    if (activeTab !== 'commission-drafts') stopPolling();
  }, [activeTab, userRole, salesRole]);

  // ── Upload 3 files → ingest → create skeleton draft ───────────────────────
  const handleDraftIngest = async () => {
    if (!performanceFile || !commissionSummaryFile || !leadStatusDraftFile || !draftPeriodStart || !draftPeriodEnd) {
      setDraftUploadStatus({ status: 'error', message: 'All 3 files and period dates are required' });
      return;
    }
    try {
      setDraftLoading(true);
      setDraftUploadStatus({ status: 'loading', message: 'Importing files…' });

      const formData = new FormData();
      formData.append('performanceFile',       performanceFile);
      formData.append('commissionSummaryFile', commissionSummaryFile);
      formData.append('leadStatusFile',        leadStatusDraftFile);
      formData.append('periodStart',           draftPeriodStart);
      formData.append('periodEnd',             draftPeriodEnd);

      console.log('[Commission Upload] Sending dates:', {
        periodStart: draftPeriodStart,
        periodEnd: draftPeriodEnd
      });

      const response = await APIUpload('/api/commission-drafts/ingest', formData);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const errorMsg = body.details ? `${body.error}: ${body.details}` : (body.error || `HTTP ${response.status}`);
        throw new Error(errorMsg);
      }
      const result = await response.json();

      setDraftUploadStatus({
        status: 'success',
        message: `Files imported. Draft #${result.draft.draftId} created — gathering SmartMoving data for ${result.draft.quotesTotal} job${result.draft.quotesTotal !== 1 ? 's' : ''}…`,
      });

      // Clear inputs
      setPerformanceFile(null);
      setCommissionSummaryFile(null);
      setLeadStatusDraftFile(null);

      // Load the new draft (it will start polling automatically via the useEffect above)
      await loadDraft(result.draft.draftId);
      const drafts = await API('/api/commission-drafts');
      setCommissionDrafts(drafts || []);

    } catch (err) {
      setDraftUploadStatus({ status: 'error', message: err.message || 'Failed to create draft' });
    } finally {
      setDraftLoading(false);
    }
  };

  // ── Manual field change + debounced save ───────────────────────────────────
  const handleLineItemChange = (lineItemId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [lineItemId]: { ...prev[lineItemId], [field]: value },
    }));
    debounceCall(`li-${lineItemId}-${field}`, () => saveLineItem(lineItemId, field, value));
  };

  const saveLineItem = async (lineItemId, field, value) => {
    if (!selectedDraft) return;
    try {
      setSavingLineItems(prev => new Set(prev).add(lineItemId));
      const updated = await API(
        `/api/commission-drafts/${selectedDraft.id}/line-items/${lineItemId}`,
        { method: 'PATCH', body: JSON.stringify({ [field]: parseFloat(value) || 0 }) }
      );
      // Refresh the row (trigger has recalculated total_due server-side)
      setDraftLineItems(prev => prev.map(item => item.id === lineItemId ? updated : item));
      setEditValues(prev => ({
        ...prev,
        [lineItemId]: { ...prev[lineItemId], ...MANUAL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: updated[f] ?? 0 }), {}) },
      }));
    } catch (err) {
      console.error('Failed to save line item:', err);
    } finally {
      setSavingLineItems(prev => { const n = new Set(prev); n.delete(lineItemId); return n; });
    }
  };

  // ── Finalize draft ─────────────────────────────────────────────────────────
  const handleFinalizeDraft = async () => {
    if (!selectedDraft) return;
    if (!window.confirm('Finalize this commission? This will lock all fields.')) return;
    try {
      setDraftLoading(true);
      await API(`/api/commission-drafts/${selectedDraft.id}/finalize`, { method: 'POST' });
      await loadDraft(selectedDraft.id);
      const drafts = await API('/api/commission-drafts');
      setCommissionDrafts(drafts || []);
    } catch (err) {
      console.error('Failed to finalize draft:', err);
      alert('Failed to finalize: ' + err.message);
    } finally {
      setDraftLoading(false);
    }
  };

  // ── Helper: render a SmartMoving-dependent cell ────────────────────────────
  // Shows animated "Gathering data…" pill when value is null (enrichment pending)
  const SmPendingCell = ({ value, format = 'currency', colorClass = 'text-gray-400' }) => {
    if (value === null || value === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-400 italic whitespace-nowrap">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Gathering data…
        </span>
      );
    }
    if (format === 'pct')      return <span className={colorClass}>{parseFloat(value).toFixed(2)}%</span>;
    if (format === 'currency') return <span className={colorClass}>${parseFloat(value).toFixed(2)}</span>;
    return <span className={colorClass}>{value}</span>;
  };

  // ── Progress banner (shown while calculation_status === 'calculating') ─────
  const DraftProgressBanner = ({ draft }) => {
    if (!draft || draft.calculation_status !== 'calculating') return null;
    const total     = parseInt(draft.quotes_total, 10) || 0;
    const processed = parseInt(draft.quotes_processed, 10) || 0;
    const pct       = total > 0 ? Math.round((processed / total) * 100) : 0;
    return (
      <div className="card p-4 border border-blue-500/30 bg-blue-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-blue-200">
            Gathering SmartMoving data — processing job {processed} of {total}…
          </span>
        </div>
        <div className="w-full h-1.5 bg-blue-900/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-blue-300/70 mt-1">
          Revenue Add-Ons, Deductions, and dependent columns will populate once all jobs are fetched.
        </p>
      </div>
    );
  };

  // ── Error banner ───────────────────────────────────────────────────────────
  const DraftErrorBanner = ({ draft }) => {
    if (!draft || draft.calculation_status !== 'error') return null;
    return (
      <div className="card p-4 border border-red-500/30 bg-red-900/20">
        <p className="text-sm font-medium text-red-300">
          Data gathering failed: {draft.calculation_error || 'Unknown error'}
        </p>
        <p className="text-xs text-red-300/70 mt-1">
          Revenue-dependent fields cannot be calculated. Contact an administrator.
        </p>
      </div>
    );
  };

  // ============================================================================
  // Commission Drafts Tab Content (NEW SYSTEM)
  // ============================================================================
  const renderCommissionDrafts = () => {
    const isCalculating = selectedDraft?.calculation_status === 'calculating';
    const isReady       = selectedDraft?.calculation_status === 'ready';
    const isEditable    = isReady && selectedDraft?.status === 'draft' && userRole !== 'user';

    return (
    <div className="space-y-6">

      {/* ── Upload Panel ── */}
      {userRole !== 'user' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Commission Draft</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* File 1 */}
            <div>
              <label className="block text-sm font-medium mb-2">Sales Person Performance</label>
              <input type="file" accept=".xlsx,.xls" onChange={e => setPerformanceFile(e.target.files[0])} className="hidden" id="perf-file" />
              <label htmlFor="perf-file" className="cursor-pointer block p-3 border border-tahoe-border-primary rounded-tahoe-input hover:bg-tahoe-hover transition-all">
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs text-tahoe-text-muted">{performanceFile ? performanceFile.name : 'Select file'}</div>
                </div>
              </label>
            </div>

            {/* File 2 */}
            <div>
              <label className="block text-sm font-medium mb-2">Commission Summary</label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setCommissionSummaryFile(e.target.files[0])} className="hidden" id="summary-file" />
              <label htmlFor="summary-file" className="cursor-pointer block p-3 border border-tahoe-border-primary rounded-tahoe-input hover:bg-tahoe-hover transition-all">
                <div className="text-center">
                  <div className="text-2xl mb-1">💼</div>
                  <div className="text-xs text-tahoe-text-muted">{commissionSummaryFile ? commissionSummaryFile.name : 'Select file'}</div>
                </div>
              </label>
            </div>

            {/* File 3 */}
            <div>
              <label className="block text-sm font-medium mb-2">Lead Status by Service Date</label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setLeadStatusDraftFile(e.target.files[0])} className="hidden" id="lead-draft-file" />
              <label htmlFor="lead-draft-file" className="cursor-pointer block p-3 border border-tahoe-border-primary rounded-tahoe-input hover:bg-tahoe-hover transition-all">
                <div className="text-center">
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-xs text-tahoe-text-muted">{leadStatusDraftFile ? leadStatusDraftFile.name : 'Select file'}</div>
                </div>
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Period</label>
            <DateRangePicker
              startYmd={draftPeriodStart} endYmd={draftPeriodEnd}
              onApply={({ startYmd, endYmd }) => { setDraftPeriodStart(startYmd); setDraftPeriodEnd(endYmd); }}
              onClear={() => { setDraftPeriodStart(''); setDraftPeriodEnd(''); }}
              placeholder="Select commission period"
            />
          </div>

          {draftUploadStatus && (
            <div className={`p-3 rounded-tahoe-input mb-4 text-sm ${
              draftUploadStatus.status === 'success' ? 'bg-green-900/30 text-green-200' :
              draftUploadStatus.status === 'error'   ? 'bg-red-900/30 text-red-200' :
              'bg-blue-900/30 text-blue-200'
            }`}>
              {draftUploadStatus.message}
            </div>
          )}

          <button
            onClick={handleDraftIngest}
            disabled={!performanceFile || !commissionSummaryFile || !leadStatusDraftFile || !draftPeriodStart || !draftPeriodEnd || draftLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {draftLoading ? 'Processing…' : 'Process & Create Draft'}
          </button>
        </div>
      )}

      {/* ── Draft Selector + Finish button ── */}
      {commissionDrafts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Commission Drafts</h3>
            {selectedDraft?.status === 'draft' && userRole !== 'user' && (
              <button
                onClick={handleFinalizeDraft}
                disabled={!isReady}
                title={!isReady ? 'Wait until data gathering is complete' : ''}
                className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Finish Commission
              </button>
            )}
          </div>

          <select
            value={selectedDraft?.id || ''}
            onChange={e => loadDraft(parseInt(e.target.value, 10))}
            className="form-input w-full"
          >
            <option value="">Select a draft…</option>
            {commissionDrafts.map(d => (
              <option key={d.id} value={d.id}>
                {d.period_start} → {d.period_end}
                {' · '}
                {d.status === 'finalized' ? 'Finalized' : d.calculation_status === 'calculating' ? 'Gathering data…' : d.calculation_status === 'error' ? 'Error' : 'Draft'}
                {' · '}
                {d.line_item_count} line item{d.line_item_count !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Progress / error banners ── */}
      <DraftProgressBanner draft={selectedDraft} />
      <DraftErrorBanner    draft={selectedDraft} />

      {/* ── Line Items ── */}
      {selectedDraft && draftLineItems.length > 0 && (
        <>
          {/* Agent table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-1">Agent Commissions</h3>
            {isCalculating && (
              <p className="text-xs text-blue-400 mb-3">
                Columns marked with a blue indicator are pending SmartMoving data. Manual entry will be enabled once all jobs are processed.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-tahoe-text-muted border-b border-tahoe-border-primary">
                    <th className="pb-2 pr-3 font-medium">Agent</th>
                    <th className="pb-2 px-2 text-right font-medium">Hourly Rate</th>
                    <th className="pb-2 px-2 text-right font-medium">Invoiced</th>
                    <th className="pb-2 px-2 text-right font-medium text-cyan-400">Rev Add-Ons</th>
                    <th className="pb-2 px-2 text-right font-medium text-orange-400">Rev Ded.</th>
                    <th className="pb-2 px-2 text-right font-medium">Total Rev</th>
                    <th className="pb-2 px-2 text-right font-medium">Booking %</th>
                    <th className="pb-2 px-2 text-right font-medium">Rate %</th>
                    <th className="pb-2 px-2 text-right font-medium">Commission</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>Spiff Bonus</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>Rev Bonus</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>$5/$10 Bonus</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>$5/$10 Ded.</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Hourly Paid Out</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Sales Mgr</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Punch</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Cust Support</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Post-Comm</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Dispatch</th>
                    <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Deduction</th>
                    <th className="pb-2 px-2 text-right font-medium text-purple-300">Total Due</th>
                  </tr>
                </thead>
                <tbody>
                  {draftLineItems.filter(item => item.role !== 'manager').map(item => {
                    const saving = savingLineItems.has(item.id);
                    const manualFieldDefs = [
                      { field: 'spiff_bonus' },
                      { field: 'revenue_bonus' },
                      { field: 'booking_bonus_5_10_plus' },
                      { field: 'booking_bonus_5_10_minus' },
                      { field: 'hourly_paid_out' },
                      { field: 'deduction_sales_manager' },
                      { field: 'deduction_missing_punch' },
                      { field: 'deduction_customer_support' },
                      { field: 'deduction_post_commission' },
                      { field: 'deduction_dispatch' },
                      { field: 'deduction_other' },
                    ];

                    return (
                      <tr key={item.id} className="border-b border-tahoe-border-primary hover:bg-tahoe-hover transition-colors">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {item.employee_name_raw}
                          {saving && <span className="ml-1 text-xs text-blue-400">Saving…</span>}
                        </td>

                        {/* Immediately-available columns */}
                        <td className="py-2 px-2 text-right text-gray-400">${parseFloat(item.hourly_rate).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-gray-400">${parseFloat(item.invoiced).toFixed(2)}</td>

                        {/* SmartMoving-dependent columns */}
                        <td className="py-2 px-2 text-right"><SmPendingCell value={item.revenue_add_ons}    colorClass="text-cyan-400" /></td>
                        <td className="py-2 px-2 text-right"><SmPendingCell value={item.revenue_deductions} colorClass="text-orange-400" /></td>
                        <td className="py-2 px-2 text-right"><SmPendingCell value={item.total_revenue}      colorClass="text-gray-400" /></td>

                        {/* Also immediately available */}
                        <td className="py-2 px-2 text-right text-gray-400">{parseFloat(item.booking_pct).toFixed(1)}%</td>

                        {/* SM-dependent: commission rate + earned */}
                        <td className="py-2 px-2 text-right"><SmPendingCell value={item.commission_pct}    format="pct" colorClass="text-gray-400" /></td>
                        <td className="py-2 px-2 text-right"><SmPendingCell value={item.commission_earned} colorClass="text-gray-400" /></td>

                        {/* Manual fields — only editable when isEditable */}
                        {manualFieldDefs.map(({ field }) => (
                          <td key={field} className="py-2 px-1" style={{background:'rgba(255,255,255,0.02)'}}>
                            {isEditable ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editValues[item.id]?.[field] ?? 0}
                                onChange={e => handleLineItemChange(item.id, field, e.target.value)}
                                className="w-20 px-1 py-0.5 text-right bg-tahoe-card-bg border border-tahoe-border-primary rounded text-xs focus:border-blue-400 focus:outline-none"
                              />
                            ) : (
                              <span className="block text-right text-gray-400 text-xs">
                                ${parseFloat(item[field] ?? 0).toFixed(2)}
                              </span>
                            )}
                          </td>
                        ))}

                        {/* Total Due — SM-dependent */}
                        <td className="py-2 px-2 text-right font-bold">
                          <SmPendingCell value={item.total_due} colorClass="text-purple-300" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manager table */}
          {draftLineItems.some(item => item.role === 'manager') && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Manager Commissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-tahoe-text-muted border-b border-tahoe-border-primary">
                      <th className="pb-2 pr-3 font-medium">Manager</th>
                      <th className="pb-2 px-2 text-right font-medium">Pooled Revenue</th>
                      <th className="pb-2 px-2 text-right font-medium">Commission</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>Spiff Bonus</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(59,130,246,0.08)'}}>Rev Bonus</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Hourly Paid Out</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Sales Mgr</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Punch</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Cust Support</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Post-Comm</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Ded: Dispatch</th>
                      <th className="pb-2 px-2 text-right font-medium" style={{background:'rgba(220,38,38,0.08)'}}>Deduction</th>
                      <th className="pb-2 px-2 text-right font-medium text-purple-300">Total Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLineItems.filter(item => item.role === 'manager').map(item => {
                      const saving = savingLineItems.has(item.id);
                      const mgrManualFields = [
                        'spiff_bonus', 'revenue_bonus',
                        'hourly_paid_out', 'deduction_sales_manager', 'deduction_missing_punch',
                        'deduction_customer_support', 'deduction_post_commission',
                        'deduction_dispatch', 'deduction_other',
                      ];

                      return (
                        <tr key={item.id} className="border-b border-tahoe-border-primary hover:bg-tahoe-hover transition-colors">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {item.employee_name_raw}
                            {saving && <span className="ml-1 text-xs text-blue-400">Saving…</span>}
                          </td>
                          <td className="py-2 px-2 text-right"><SmPendingCell value={item.invoiced}          colorClass="text-gray-400" /></td>
                          <td className="py-2 px-2 text-right"><SmPendingCell value={item.commission_earned} colorClass="text-gray-400" /></td>

                          {mgrManualFields.map(field => (
                            <td key={field} className="py-2 px-1" style={{background:'rgba(255,255,255,0.02)'}}>
                              {isEditable ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValues[item.id]?.[field] ?? 0}
                                  onChange={e => handleLineItemChange(item.id, field, e.target.value)}
                                  className="w-20 px-1 py-0.5 text-right bg-tahoe-card-bg border border-tahoe-border-primary rounded text-xs focus:border-blue-400 focus:outline-none"
                                />
                              ) : (
                                <span className="block text-right text-gray-400 text-xs">
                                  ${parseFloat(item[field] ?? 0).toFixed(2)}
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="py-2 px-2 text-right font-bold">
                            <SmPendingCell value={item.total_due} colorClass="text-purple-300" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!selectedDraft && commissionDrafts.length === 0 && !draftLoading && (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">No Commission Drafts Yet</h3>
          <p className="text-tahoe-text-muted">Upload the 3 required files above to create your first commission draft.</p>
        </div>
      )}
    </div>
    );
  };


  // ============================================================================
  // Main Component Render
  // ============================================================================

  if (initialLoading) {
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
        {(userRole !== 'user' || salesRole) && activeTab === "commission-drafts" && renderCommissionDrafts()}
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
                  <DatePicker
                    valueYmd={editingStructure.effective_date}
                    onChangeYmd={(ymd) => setEditingStructure({...editingStructure, effective_date: ymd})}
                    placeholder="Effective Date"
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
                  <DatePicker
                    valueYmd={approveData.payment_date}
                    onChangeYmd={(ymd) => setApproveData({...approveData, payment_date: ymd})}
                    placeholder="Payment Date"
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
                  <DatePicker
                    valueYmd={applyData.effective_date}
                    onChangeYmd={(ymd) => setApplyData({...applyData, effective_date: ymd})}
                    placeholder="Effective Date"
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
