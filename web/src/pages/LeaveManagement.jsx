import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../hooks/useUserRole.js';
import LeaveRequestForm from '../components/LeaveRequestForm.jsx';
import MyLeaveRequests from '../components/MyLeaveRequests.jsx';
import LeaveRequestApproval from '../components/LeaveRequestApproval.jsx';
import LeaveConfigModal from '../components/LeaveConfigModal.jsx';
import ManualLeaveCreateModal from '../components/ManualLeaveCreateModal.jsx';
import DateRangePicker from '../components/DateRangePicker.jsx';

import { API } from '../config/api.js';
import { formatShortDate, parseLocalDate, toYMD } from '../utils/timezone.js';

export default function LeaveManagement() {
  const { t } = useTranslation();
  const { userRole } = useUserRole();
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar"); // Default to calendar for all roles
  const [loading, setLoading] = useState(true);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyRecordsPerPage] = useState(20);
  const [showManagePolicies, setShowManagePolicies] = useState(false);
  const [showManualLeaveCreate, setShowManualLeaveCreate] = useState(false);
  const [manualCreatePrefillDate, setManualCreatePrefillDate] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [deletingLeaveId, setDeletingLeaveId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Leave balances tab state
  const [balanceCoverage, setBalanceCoverage] = useState(null);
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [balanceFilter, setBalanceFilter] = useState({ department: '', search: '', showMissing: false });
  const [balanceSortBy, setBalanceSortBy] = useState('name');
  const [balanceSortDir, setBalanceSortDir] = useState('asc');
  const [newRequest, setNewRequest] = useState({
    employee_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    notes: "",
    status: "Pending",
    request_method: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range for calendar (1 year back, 1 year forward)
      // Use toYMD for Toronto-safe date formatting
      const now = new Date();
      const startDate = toYMD(new Date(now.getFullYear() - 1, 0, 1)); // Jan 1 last year
      const endDate = toYMD(new Date(now.getFullYear() + 1, 11, 31)); // Dec 31 next year
      
      const currentYear = now.getFullYear();
      const [requestsData, balancesData, calendarData, analyticsData, employeesData, leaveTypesData, coverageData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API(`/api/leave/calendar?start_date=${startDate}&end_date=${endDate}`),
        API("/api/leave/analytics"),
        API("/api/employees"),
        API("/api/leave/types"),
        API(`/api/leave/balances/coverage?year=${currentYear}`).catch(() => null)
      ]);
      
      console.log('📊 Leave data loaded:', {
        requests: requestsData.length,
        balances: balancesData.length,
        calendar: calendarData.length,
        analytics: analyticsData,
        employees: employeesData.length,
        leaveTypes: leaveTypesData.length,
        coverage: coverageData
      });
      
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
      setEmployees(employeesData);
      setLeaveTypes(leaveTypesData || []);
      setBalanceCoverage(coverageData);
    } catch (error) {
      console.error("Error loading leave data:", error);
      // Set empty arrays on error to prevent UI issues
      setRequests([]);
      setBalances([]);
      setCalendar([]);
      setAnalytics({});
      setEmployees([]);
      setLeaveTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Update filtered requests when main requests list changes
  useEffect(() => {
    setFilteredRequests(requests);
  }, [requests]);

  // Silent refresh function - updates data without blocking UI
  const refreshData = async () => {
    try {
      console.log('🔄 Silently refreshing leave data...');
      
      // Calculate date range for calendar (1 year back, 1 year forward)
      // Use toYMD for Toronto-safe date formatting
      const now = new Date();
      const startDate = toYMD(new Date(now.getFullYear() - 1, 0, 1)); // Jan 1 last year
      const endDate = toYMD(new Date(now.getFullYear() + 1, 11, 31)); // Dec 31 next year
      
      const currentYear = now.getFullYear();
      const [requestsData, balancesData, calendarData, analyticsData, employeesData, leaveTypesData, coverageData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API(`/api/leave/calendar?start_date=${startDate}&end_date=${endDate}`),
        API("/api/leave/analytics"),
        API("/api/employees"),
        API("/api/leave/types"),
        API(`/api/leave/balances/coverage?year=${currentYear}`).catch(() => null)
      ]);
      
      console.log('✅ Leave data refreshed:', {
        requests: requestsData.length,
        balances: balancesData.length,
        calendar: calendarData.length,
        analytics: analyticsData,
        employees: employeesData.length,
        leaveTypes: leaveTypesData.length,
        coverage: coverageData
      });
      
      // Update state immediately - React will re-render automatically
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
      setEmployees(employeesData);
      setLeaveTypes(leaveTypesData || []);
      setBalanceCoverage(coverageData);
    } catch (error) {
      console.error("Error refreshing leave data:", error);
      // Don't block UI on error - just log it
    }
  };

  // Callback to refresh all data after leave request approval/rejection
  const handleApprovalChange = async () => {
    console.log('🔄 Refreshing all leave data after approval change...');
    // Use silent refresh for instant updates without blocking UI
    await refreshData();
    // Increment refresh trigger to refresh other components
    setRefreshTrigger(prev => prev + 1);
  };

  // Calculate total days between two dates (excluding weekends)
  const calculateTotalDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    
    // Simple calculation: count all days including weekends
    // You can enhance this to exclude weekends if needed
    const diffTime = Math.abs(end - start);
    totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    
    return totalDays;
  };

  // Watch for date changes and calculate total_days
  useEffect(() => {
    if (newRequest.start_date && newRequest.end_date) {
      const totalDays = calculateTotalDays(newRequest.start_date, newRequest.end_date);
      setNewRequest(prev => ({ ...prev, total_days: totalDays }));
    }
  }, [newRequest.start_date, newRequest.end_date]);

  // Load employee balance when employee is selected
  useEffect(() => {
    if (newRequest.employee_id && newRequest.leave_type_id) {
      const balance = balances.find(
        b => b.employee_id === parseInt(newRequest.employee_id) && 
             b.leave_type_id === parseInt(newRequest.leave_type_id)
      );
      setSelectedEmployeeBalance(balance);
    } else {
      setSelectedEmployeeBalance(null);
    }
  }, [newRequest.employee_id, newRequest.leave_type_id, balances]);

  const handleSubmitRequest = async (e, approveImmediately = false) => {
    e.preventDefault();
    try {
      const totalDays = calculateTotalDays(newRequest.start_date, newRequest.end_date);
      
      const requestData = {
        ...newRequest,
        employee_id: parseInt(newRequest.employee_id),
        leave_type_id: parseInt(newRequest.leave_type_id),
        total_days: totalDays,
        status: approveImmediately ? "Approved" : newRequest.status
      };

      await API("/api/leave/requests", {
        method: "POST",
        body: JSON.stringify(requestData)
      });
      
      setNewRequest({
        employee_id: "",
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
        notes: "",
        status: "Pending",
        request_method: ""
      });
      setSelectedEmployeeBalance(null);
      loadData();
    } catch (error) {
      console.error("Error submitting request:", error);
      alert(t('leave.errorCreating') + ": " + (error.message || t('common.unknownError')));
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await API(`/api/leave/requests/${requestId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, approved_by: 1 })
      });
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Handle delete leave request (Manager/Admin only)
  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm(t('leave.confirmDelete') || 'Are you sure you want to delete this leave entry? This action cannot be undone.')) {
      return;
    }
    
    setDeletingLeaveId(leaveId);
    try {
      await API(`/api/leave/requests/${leaveId}`, {
        method: "DELETE"
      });
      
      // Refresh all data
      await refreshData();
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting leave:", error);
      alert(t('leave.deleteError') || 'Failed to delete leave entry: ' + (error.message || 'Unknown error'));
    } finally {
      setDeletingLeaveId(null);
    }
  };

  // Calendar helper functions
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    return days;
  };

  const getLeaveForDate = (date) => {
    if (!calendar || !date) return [];
    
    return calendar.filter(item => {
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
      
      // Handle holidays
      if (item.type === 'holiday') {
        const holidayDate = parseLocalDate(item.date);
        if (!holidayDate) return false;
        holidayDate.setHours(0, 0, 0, 0);
        const checkDateOnly = new Date(checkDate);
        checkDateOnly.setHours(0, 0, 0, 0);
        return checkDateOnly.getTime() === holidayDate.getTime();
      }
      
      // Handle leave requests
      if (item.type === 'leave_request' || !item.type) {
        const startDate = parseLocalDate(item.start_date);
        if (!startDate) return false;
        startDate.setHours(0, 0, 0, 0);
      
        const endDate = parseLocalDate(item.end_date);
        if (!endDate) return false;
        endDate.setHours(23, 59, 59, 999);
      
        return checkDate >= startDate && checkDate <= endDate;
      }
      
      return false;
    });
  };

  const getLeaveTypeColor = (leaveTypeName, leaveColor) => {
    // Use color from database if available
    if (leaveColor) {
      return `text-white`;
    }
    
    // Fallback to hardcoded colors
    const colors = {
      'Vacation': 'bg-blue-500 text-white',
      'Sick': 'bg-red-500 text-white',
      'Sick Leave': 'bg-red-500 text-white',
      'Personal': 'bg-green-500 text-white',
      'Personal Leave': 'bg-green-500 text-white',
      'Parental': 'bg-purple-500 text-white',
      'Bereavement': 'bg-tahoe-text-muted text-white',
      'Other': 'bg-tahoe-text-muted text-white'
    };
    
    return colors[leaveTypeName] || 'bg-tahoe-text-muted text-white';
  };

  const tabs = userRole === 'user' ? [
    { id: "request", name: t('leave.submitRequest'), icon: "📝" },
    { id: "my-requests", name: t('leave.myRequests'), icon: "📋" },
    { id: "balances", name: t('leave.myBalances'), icon: "💰" },
    { id: "calendar", name: t('leave.leaveCalendar'), icon: "📅" }
  ] : [
    { id: "approvals", name: t('leave.leaveRequests'), icon: "📋" },
    { id: "calendar", name: t('leave.leaveCalendar'), icon: "📅" },
    { id: "balances", name: t('leave.leaveBalances'), icon: "💰" },
    { id: "analytics", name: t('leave.analytics'), icon: "📊" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">{t('leave.title')}</h1>
        <p className="text-secondary">{t('leave.description')}</p>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-primary mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-tertiary hover:text-secondary hover:border-secondary"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>


      {/* Submit Request Tab - User Role Only */}
      {userRole === 'user' && activeTab === "request" && (
        <LeaveRequestForm onRequestSubmitted={() => setRefreshTrigger(prev => prev + 1)} />
      )}

      {/* My Requests Tab - User Role Only */}
      {userRole === 'user' && activeTab === "my-requests" && (
        <MyLeaveRequests refreshTrigger={refreshTrigger} />
      )}

      {/* Leave Request Approvals Tab - HR Role Only */}
      {userRole !== 'user' && activeTab === "approvals" && (
        <LeaveRequestApproval 
          onApprovalChange={handleApprovalChange}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Leave Requests Tab - HR Role Only */}
      {userRole !== 'user' && activeTab === "requests" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Record Leave Entry Form */}
            <div className="card p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-tahoe-text-primary">
                <span className="text-2xl mr-2">📝</span>
                {t('leave.recordLeaveEntry')}
              </h3>
              <p className="text-sm text-tahoe-text-muted mb-6">{t('leave.hrRecordsDescription')}</p>
              
              <form onSubmit={(e) => handleSubmitRequest(e, false)} className="space-y-4">
                {/* Employee Selection with Search */}
                <div className="form-group">
                  <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                    {t('leave.employee')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="employee-list"
                    value={employees.find(e => e.id === parseInt(newRequest.employee_id))?.name || ''}
                    onChange={(e) => {
                      const selectedEmp = employees.find(emp => 
                        `${emp.first_name} ${emp.last_name}` === e.target.value
                      );
                      setNewRequest({...newRequest, employee_id: selectedEmp ? selectedEmp.id.toString() : ''});
                    }}
                    placeholder={t('leave.typeToSearch')}
                    required
                    className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  <datalist id="employee-list">
                    {employees.map(emp => (
                      <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                        {emp.department || t('leave.noDept')}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Leave Type */}
                <div className="form-group">
                  <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                    {t('leave.leaveType')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.leave_type_id}
                    onChange={(e) => setNewRequest({...newRequest, leave_type_id: e.target.value})}
                    required
                    className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('leave.selectLeaveType')}</option>
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Show leave balance if available */}
                {selectedEmployeeBalance && (
                  <div className="rounded-tahoe-input p-3 text-sm border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                    <div className="flex justify-between">
                      <span className="text-tahoe-text-muted">{t('leave.availableDays')}</span>
                      <span className="text-green-400 font-semibold">
                        {((parseFloat(selectedEmployeeBalance.entitled_days) || 0) + (parseFloat(selectedEmployeeBalance.carried_over_days) || 0) - (parseFloat(selectedEmployeeBalance.used_days) || 0)).toFixed(1)} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="form-group">
                  <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                    {t('leave.startDate')} / {t('leave.endDate')} <span className="text-red-500">*</span>
                  </label>
                  <DateRangePicker
                    startYmd={newRequest.start_date}
                    endYmd={newRequest.end_date}
                    onApply={({ startYmd, endYmd }) => setNewRequest({...newRequest, start_date: startYmd, end_date: endYmd})}
                    onClear={() => setNewRequest({...newRequest, start_date: '', end_date: ''})}
                    placeholder={t('leave.selectDateRange') || 'Select leave dates'}
                  />
                </div>

                {/* Show calculated days */}
                {newRequest.start_date && newRequest.end_date && (
                  <div className="rounded-tahoe-input p-3 text-sm border" style={{ backgroundColor: 'rgba(10, 132, 255, 0.1)', borderColor: 'rgba(10, 132, 255, 0.3)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-tahoe-text-primary">{t('leave.totalDays')}</span>
                      <span className="text-tahoe-accent font-semibold text-lg">
                        {calculateTotalDays(newRequest.start_date, newRequest.end_date)} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Request Method and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                      {t('leave.requestMethod')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRequest.request_method}
                      onChange={(e) => setNewRequest({...newRequest, request_method: e.target.value})}
                      required
                      className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                    >
                      <option value="">{t('leave.howWasRequested')}</option>
                      <option value="Email">📧 {t('leave.email')}</option>
                      <option value="Phone">📞 {t('leave.phone')}</option>
                      <option value="In-Person">🤝 {t('leave.inPerson')}</option>
                      <option value="Slack">💬 {t('leave.slack')}</option>
                      <option value="Written">📝 {t('leave.written')}</option>
                      <option value="Other">❓ {t('common.other')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                      {t('leave.status')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRequest.status}
                      onChange={(e) => setNewRequest({...newRequest, status: e.target.value})}
                      required
                      className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                    >
                      <option value="Pending">{t('leave.pendingReview')}</option>
                      <option value="Approved">{t('leave.approvedStatus')}</option>
                      <option value="Rejected">{t('leave.rejectedStatus')}</option>
                      <option value="Cancelled">{t('leave.cancelled')}</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                    {t('leave.reason')}
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    rows="2"
                    placeholder={t('leave.reasonPlaceholder')}
                    className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                    {t('leave.hrNotes')}
                  </label>
                  <textarea
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                    rows="2"
                    placeholder={t('leave.hrNotesPlaceholder')}
                    className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    type="submit"
                    className="py-3 rounded-tahoe-pill font-medium transition-all duration-tahoe flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                  >
                    <span className="mr-2">💾</span>
                    Save as {newRequest.status}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitRequest(e, true)}
                    className="btn-primary flex items-center justify-center"
                  >
                    <span className="mr-2">✅</span>
                    Save & Approve
                  </button>
                </div>
              </form>
            </div>

            {/* Requests List */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">{t('leave.pendingRequests')}</h3>
              <div className="space-y-4">
                {filteredRequests.filter(request => request.status === 'Pending').length === 0 ? (
                  <p className="text-muted text-center py-8">{t('leave.noPendingRequests')}</p>
                ) : (
                  filteredRequests.filter(request => request.status === 'Pending').map((request) => (
                    <div key={request.id} className="card p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{request.first_name} {request.last_name}</h4>
                          <p className="text-sm text-secondary">{request.leave_type_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'Approved' ? 'badge-success' :
                          request.status === 'Rejected' ? 'badge-error' :
                          'badge-warning'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-secondary mb-2">
                        {formatShortDate(request.start_date)} - {formatShortDate(request.end_date)}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-secondary mb-3">{request.reason}</p>
                      )}
                      {request.status === 'Pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'Approved')}
                            className="btn-primary btn-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                            className="btn-secondary btn-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* All Requests History */}
          <div className="mt-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">{t('leave.allRequestsHistory')}</h3>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <p className="text-muted text-center py-8">{t('leave.noRequestsFound')}</p>
                ) : (
                  (() => {
                    // Pagination logic for history
                    const startIndex = (historyCurrentPage - 1) * historyRecordsPerPage;
                    const endIndex = startIndex + historyRecordsPerPage;
                    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
                    const totalPages = Math.ceil(filteredRequests.length / historyRecordsPerPage);

                    return (
                      <>
                        {/* Results info */}
                        <div className="flex justify-between items-center mb-4 text-sm text-tahoe-text-muted">
                          <span>
                            {t('leave.showing')} {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} {t('leave.of')} {filteredRequests.length} {t('leave.requests')}
                          </span>
                          <span>{t('leave.page')} {historyCurrentPage} {t('leave.of')} {totalPages}</span>
                        </div>

                        {/* Paginated requests */}
                        <div className="space-y-4">
                          {paginatedRequests.map((request) => (
                            <div key={`history-${request.id}`} className="card p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium">{request.first_name} {request.last_name}</h4>
                                  <p className="text-sm text-secondary">{request.leave_type_name}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'Approved' ? 'badge-success' :
                                  request.status === 'Rejected' ? 'badge-error' :
                                  'badge-warning'
                                }`}>
                                  {request.status}
                                </span>
                              </div>
                              <p className="text-sm text-secondary mb-2">
                                {formatShortDate(request.start_date)} - {formatShortDate(request.end_date)}
                              </p>
                              {request.reason && (
                                <p className="text-sm text-secondary mb-3">{request.reason}</p>
                              )}
                              {request.status === 'Pending' && (
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleStatusUpdate(request.id, 'Approved')}
                                    className="btn-primary btn-sm"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                                    className="btn-secondary btn-sm"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t">
                            <button
                              onClick={() => setHistoryCurrentPage(Math.max(1, historyCurrentPage - 1))}
                              disabled={historyCurrentPage === 1}
                              className="btn-secondary disabled:bg-tahoe-bg-quaternary disabled:text-tahoe-text-muted text-sm"
                            >
                              Previous
                            </button>
                            
                            {/* Page numbers */}
                            <div className="flex space-x-1">
                              {[...Array(totalPages)].map((_, index) => {
                                const pageNum = index + 1;
                                const isCurrentPage = pageNum === historyCurrentPage;
                                const showPage = pageNum === 1 || pageNum === totalPages || 
                                                (pageNum >= historyCurrentPage - 2 && pageNum <= historyCurrentPage + 2);
                                
                                if (!showPage && pageNum !== historyCurrentPage - 3 && pageNum !== historyCurrentPage + 3) {
                                  return null;
                                }
                                
                                if (pageNum === historyCurrentPage - 3 || pageNum === historyCurrentPage + 3) {
                                  return <span key={pageNum} className="px-2 text-tahoe-text-muted">...</span>;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setHistoryCurrentPage(pageNum)}
                                    className={`btn-secondary text-sm ${
                                      isCurrentPage 
                                        ? 'bg-tahoe-primary-bg text-tahoe-primary-text' 
                                        : 'bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover text-tahoe-text-primary'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => setHistoryCurrentPage(Math.min(totalPages, historyCurrentPage + 1))}
                              disabled={historyCurrentPage === totalPages}
                              className="btn-secondary disabled:bg-tahoe-bg-quaternary disabled:text-tahoe-text-muted text-sm"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leave Balances Tab */}
      {activeTab === "balances" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Company-wide view for HR/Manager/Admin */}
          {userRole !== 'user' ? (
            <div className="space-y-6">
              {/* Coverage + Action Row */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Coverage Widget */}
                <div className="lg:col-span-2 card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-tahoe-text-muted uppercase tracking-wide">Data Coverage</h3>
                    <select
                      value={balanceYear}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value, 10);
                        setBalanceYear(newYear);
                        API(`/api/leave/balances/coverage?year=${newYear}`).then(setBalanceCoverage).catch(() => {});
                      }}
                      className="text-sm border rounded-lg px-2 py-1 bg-tahoe-bg-tertiary text-tahoe-text-primary"
                    >
                      {[...Array(5)].map((_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                  {balanceCoverage ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-tahoe-text-secondary text-sm">Employees with balances</span>
                        <span className="font-semibold text-white">
                          {balanceCoverage.employees_with_balances} / {balanceCoverage.active_employees}
                        </span>
                      </div>
                      <div className="w-full bg-tahoe-bg-quaternary rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${balanceCoverage.active_employees > 0 ? (balanceCoverage.employees_with_balances / balanceCoverage.active_employees * 100) : 0}%` }}
                        />
                      </div>
                      {balanceCoverage.employees_without_schedule > 0 && (
                        <div className="flex items-center gap-2 text-amber-400 text-sm">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          {balanceCoverage.employees_without_schedule} employees missing work schedule
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-tahoe-text-muted text-sm">Loading coverage data...</div>
                  )}
                </div>

                {/* Low Vacation Widget */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-tahoe-text-muted uppercase tracking-wide mb-3">Low Vacation</h3>
                  {(() => {
                    const vacationBalances = balances.filter(b => b.leave_type_name === 'Vacation');
                    const lowVacation = vacationBalances.filter(b => (parseFloat(b.available_days) || 0) < 5);
                    return (
                      <div>
                        <div className="text-3xl font-bold text-amber-400">{lowVacation.length}</div>
                        <div className="text-sm text-tahoe-text-muted">employees with &lt;5 days</div>
                      </div>
                    );
                  })()}
                </div>

                {/* High Sick Usage Widget */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-tahoe-text-muted uppercase tracking-wide mb-3">High Sick Usage</h3>
                  {(() => {
                    const sickBalances = balances.filter(b => b.leave_type_name === 'Sick Leave');
                    const highSick = sickBalances.filter(b => (parseFloat(b.used_days) || 0) >= 5);
                    return (
                      <div>
                        <div className="text-3xl font-bold text-red-400">{highSick.length}</div>
                        <div className="text-sm text-tahoe-text-muted">employees with 5+ sick days</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* HR Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={async () => {
                    if (confirm('This will recalculate all leave balances using schedule-based workday counting. Continue?')) {
                      try {
                        await API('/api/leave/balances/recalculate', { method: 'POST', body: JSON.stringify({ year: balanceYear }) });
                        await refreshData();
                        alert('Balances recalculated successfully');
                      } catch (e) { alert('Error: ' + e.message); }
                    }
                  }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-tahoe-bg-hover transition-all text-tahoe-text-primary"
                >
                  Recalculate Balances
                </button>
                <button 
                  onClick={async () => {
                    if (confirm('This will initialize leave balances for employees who are missing them. Continue?')) {
                      try {
                        await API('/api/leave/balances/initialize', { method: 'POST', body: JSON.stringify({ year: balanceYear }) });
                        await refreshData();
                        alert('Balances initialized successfully');
                      } catch (e) { alert('Error: ' + e.message); }
                    }
                  }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-tahoe-bg-hover transition-all text-tahoe-text-primary"
                >
                  Initialize Missing Balances
                </button>
                <button 
                  onClick={() => setShowManagePolicies(true)}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-tahoe-bg-hover transition-all text-tahoe-text-primary"
                >
                  Manage Policies
                </button>
              </div>

              {/* Employee Balances Table */}
              <div className="card">
                <div className="p-4 border-b border-tahoe-border-primary">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Employee Leave Balances</h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={balanceFilter.search}
                        onChange={(e) => setBalanceFilter({...balanceFilter, search: e.target.value})}
                        className="px-3 py-1.5 text-sm border rounded-lg bg-tahoe-bg-tertiary text-tahoe-text-primary w-48"
                      />
                      <label className="flex items-center gap-2 text-sm text-tahoe-text-secondary">
                        <input
                          type="checkbox"
                          checked={balanceFilter.showMissing}
                          onChange={(e) => setBalanceFilter({...balanceFilter, showMissing: e.target.checked})}
                          className="rounded"
                        />
                        Missing data only
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-tahoe-border-primary text-left text-sm text-tahoe-text-muted">
                        <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => {
                          setBalanceSortBy('name');
                          setBalanceSortDir(balanceSortBy === 'name' && balanceSortDir === 'asc' ? 'desc' : 'asc');
                        }}>
                          Employee {balanceSortBy === 'name' && (balanceSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-white" onClick={() => {
                          setBalanceSortBy('vacation_available');
                          setBalanceSortDir(balanceSortBy === 'vacation_available' && balanceSortDir === 'asc' ? 'desc' : 'asc');
                        }}>
                          Vacation {balanceSortBy === 'vacation_available' && (balanceSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 font-medium text-center cursor-pointer hover:text-white" onClick={() => {
                          setBalanceSortBy('sick_used');
                          setBalanceSortDir(balanceSortBy === 'sick_used' && balanceSortDir === 'asc' ? 'desc' : 'asc');
                        }}>
                          Sick Used {balanceSortBy === 'sick_used' && (balanceSortDir === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 font-medium text-center">Personal</th>
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Build employee data with their balances
                        const employeeBalanceData = employees
                          .filter(emp => emp.status === 'Active')
                          .map(emp => {
                            const empBalances = balances.filter(b => b.employee_id === emp.id);
                            const vacation = empBalances.find(b => b.leave_type_name === 'Vacation');
                            const sick = empBalances.find(b => b.leave_type_name === 'Sick Leave');
                            const personal = empBalances.find(b => b.leave_type_name === 'Personal Leave');
                            const hasSchedule = emp.work_schedule_id != null;
                            const hasBalances = empBalances.length > 0;
                            
                            return {
                              ...emp,
                              vacation_available: vacation ? parseFloat(vacation.available_days) || 0 : null,
                              vacation_used: vacation ? parseFloat(vacation.used_days) || 0 : null,
                              sick_used: sick ? parseFloat(sick.used_days) || 0 : null,
                              personal_available: personal ? parseFloat(personal.available_days) || 0 : null,
                              hasSchedule,
                              hasBalances,
                              name: `${emp.first_name} ${emp.last_name}`
                            };
                          })
                          .filter(emp => {
                            // Apply search filter
                            if (balanceFilter.search) {
                              const search = balanceFilter.search.toLowerCase();
                              if (!emp.name.toLowerCase().includes(search)) return false;
                            }
                            // Apply missing filter
                            if (balanceFilter.showMissing) {
                              return !emp.hasSchedule || !emp.hasBalances;
                            }
                            return true;
                          })
                          .sort((a, b) => {
                            let aVal, bVal;
                            switch (balanceSortBy) {
                              case 'vacation_available':
                                aVal = a.vacation_available ?? -1;
                                bVal = b.vacation_available ?? -1;
                                break;
                              case 'sick_used':
                                aVal = a.sick_used ?? -1;
                                bVal = b.sick_used ?? -1;
                                break;
                              default:
                                aVal = a.name.toLowerCase();
                                bVal = b.name.toLowerCase();
                            }
                            if (aVal < bVal) return balanceSortDir === 'asc' ? -1 : 1;
                            if (aVal > bVal) return balanceSortDir === 'asc' ? 1 : -1;
                            return 0;
                          });

                        if (employeeBalanceData.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="px-4 py-8 text-center text-tahoe-text-muted">
                                No employees match the current filters.
                              </td>
                            </tr>
                          );
                        }

                        return employeeBalanceData.map(emp => (
                          <tr key={emp.id} className="border-b border-tahoe-border-primary hover:bg-tahoe-bg-hover transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{emp.name}</div>
                              <div className="text-xs text-tahoe-text-muted">{emp.email}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {emp.vacation_available !== null ? (
                                <div>
                                  <span className={`font-semibold ${emp.vacation_available < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {emp.vacation_available.toFixed(1)}
                                  </span>
                                  <span className="text-tahoe-text-muted text-xs ml-1">avail</span>
                                  {emp.vacation_used !== null && emp.vacation_used > 0 && (
                                    <div className="text-xs text-tahoe-text-muted">{emp.vacation_used.toFixed(1)} used</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-tahoe-text-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {emp.sick_used !== null ? (
                                <span className={`font-semibold ${emp.sick_used >= 5 ? 'text-red-400' : 'text-tahoe-text-primary'}`}>
                                  {emp.sick_used.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-tahoe-text-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {emp.personal_available !== null ? (
                                <span className="text-tahoe-text-primary">{emp.personal_available.toFixed(1)}</span>
                              ) : (
                                <span className="text-tahoe-text-muted">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {!emp.hasSchedule ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                                  No Schedule
                                </span>
                              ) : !emp.hasBalances ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                  No Balances
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Personal view for regular users */
            <div className="space-y-6">
              {/* Personal Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const vacation = balances.find(b => b.leave_type_name === 'Vacation');
                  const sick = balances.find(b => b.leave_type_name === 'Sick Leave');
                  const personal = balances.find(b => b.leave_type_name === 'Personal Leave');
                  
                  return (
                    <>
                      <div className="card p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl">🏖️</div>
                          <h3 className="font-semibold text-white">Vacation</h3>
                        </div>
                        <div className="text-3xl font-bold text-blue-400 mb-1">
                          {vacation ? (parseFloat(vacation.available_days) || 0).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-sm text-tahoe-text-muted">days available</div>
                        {vacation && (parseFloat(vacation.used_days) || 0) > 0 && (
                          <div className="text-xs text-tahoe-text-muted mt-2">
                            {(parseFloat(vacation.used_days) || 0).toFixed(1)} days used this year
                          </div>
                        )}
                      </div>
                      <div className="card p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl">🤒</div>
                          <h3 className="font-semibold text-white">Sick Leave</h3>
                        </div>
                        <div className="text-3xl font-bold text-emerald-400 mb-1">
                          {sick ? (parseFloat(sick.available_days) || 0).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-sm text-tahoe-text-muted">days available</div>
                        {sick && (parseFloat(sick.used_days) || 0) > 0 && (
                          <div className="text-xs text-tahoe-text-muted mt-2">
                            {(parseFloat(sick.used_days) || 0).toFixed(1)} days used this year
                          </div>
                        )}
                      </div>
                      <div className="card p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl">🎯</div>
                          <h3 className="font-semibold text-white">Personal</h3>
                        </div>
                        <div className="text-3xl font-bold text-violet-400 mb-1">
                          {personal ? (parseFloat(personal.available_days) || 0).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-sm text-tahoe-text-muted">days available</div>
                        {personal && (parseFloat(personal.used_days) || 0) > 0 && (
                          <div className="text-xs text-tahoe-text-muted mt-2">
                            {(parseFloat(personal.used_days) || 0).toFixed(1)} days used this year
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* All Balance Types Detail */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">All Leave Balances</h3>
                {balances.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-tahoe-text-muted">No leave balances found for your account.</p>
                    <p className="text-sm text-tahoe-text-muted mt-1">Contact HR if you believe this is an error.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {balances.map((balance) => {
                      const totalDays = (parseFloat(balance.entitled_days) || 0) + (parseFloat(balance.carried_over_days) || 0);
                      const usedDays = parseFloat(balance.used_days) || 0;
                      const availableDays = parseFloat(balance.available_days) || 0;
                      const usedPercentage = totalDays > 0 ? (usedDays / totalDays) * 100 : 0;
                      
                      return (
                        <div key={balance.id} className="p-4 border border-tahoe-border-primary rounded-lg bg-tahoe-bg-tertiary">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {balance.leave_type_name === 'Vacation' ? '🏖️' :
                                 balance.leave_type_name === 'Sick Leave' ? '🤒' :
                                 balance.leave_type_name === 'Personal Leave' ? '🎯' :
                                 balance.leave_type_name === 'Bereavement' ? '💐' :
                                 balance.leave_type_name === 'Parental Leave' ? '👶' : '📋'}
                              </span>
                              <span className="font-medium text-white">{balance.leave_type_name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-400">{availableDays.toFixed(1)}</div>
                              <div className="text-xs text-tahoe-text-muted">available</div>
                            </div>
                          </div>
                          <div className="w-full bg-tahoe-bg-quaternary rounded-full h-2">
                            <div className="flex h-full rounded-full overflow-hidden">
                              <div className="bg-tahoe-text-muted" style={{ width: `${usedPercentage}%` }}></div>
                              <div className="bg-blue-500" style={{ width: `${100 - usedPercentage}%` }}></div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-tahoe-text-muted mt-1">
                            <span>{usedDays.toFixed(1)} used</span>
                            <span>{totalDays.toFixed(1)} total entitlement</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Leave Calendar Tab */}
      {activeTab === "calendar" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
              <div className="card p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">{t('leave.calendar.title')}</h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-2 hover:bg-tahoe-bg-hover rounded-tahoe-input transition-colors"
                    >
                      ←
                    </button>
                    <span className="font-medium text-lg">
                      {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-2 hover:bg-tahoe-bg-hover rounded-tahoe-input transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {[
                    t('leave.calendar.sun'),
                    t('leave.calendar.mon'),
                    t('leave.calendar.tue'),
                    t('leave.calendar.wed'),
                    t('leave.calendar.thu'),
                    t('leave.calendar.fri'),
                    t('leave.calendar.sat')
                  ].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-tahoe-text-muted">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar Days */}
                  {generateCalendarDays().map((day, index) => {
                    const dayLeaves = getLeaveForDate(day.date);
                    const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          // If clicking a day from a different month, switch to that month
                          if (!day.isCurrentMonth) {
                            setCurrentMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                          }
                          setSelectedDate(day.date);
                        }}
                        className={`
                          relative p-2 min-h-[60px] cursor-pointer transition-colors border border-transparent
                          ${day.isCurrentMonth ? '' : 'text-tahoe-text-muted'} hover:bg-tahoe-bg-hover
                          ${isSelected ? 'bg-tahoe-primary-bg text-tahoe-primary-text' : ''}
                          ${day.isToday ? 'ring-2 ring-indigo-400' : ''}
                        `}
                      >
                        <div className="text-sm font-medium">{day.date.getDate()}</div>
                        
                        {/* Holidays and Leave indicators */}
                        <div className="mt-1 space-y-1">
                          {(() => {
                            const holidays = dayLeaves.filter(item => item.type === 'holiday');
                            const leaveRequests = dayLeaves.filter(item => item.type === 'leave_request' || !item.type);
                            
                            return (
                              <>
                                {/* Show holidays first */}
                                {holidays.map((holiday, idx) => (
                            <div
                                    key={`holiday-${idx}`}
                                    className="text-xs px-1 py-0.5 rounded truncate bg-yellow-600 text-white"
                                    title={holiday.description}
                                  >
                                    🎉 {holiday.description}
                                  </div>
                                ))}
                                
                                {/* Show leave requests */}
                                {leaveRequests.slice(0, holidays.length > 0 ? 2 : 3).map((leave, idx) => {
                                  const hasColor = leave.color && leave.color.startsWith('#');
                                  const style = hasColor ? { backgroundColor: leave.color, color: '#ffffff' } : {};
                                  const className = hasColor ? 'text-xs px-1 py-0.5 rounded truncate text-white' : `text-xs px-1 py-0.5 rounded truncate ${getLeaveTypeColor(leave.leave_type_name, leave.color)}`;
                                  return (
                                    <div
                                      key={`leave-${idx}`}
                                      className={className}
                                      style={style}
                              title={`${leave.first_name} ${leave.last_name} - ${leave.leave_type_name}`}
                            >
                              {leave.first_name}
                            </div>
                                  );
                                })}
                                
                                {leaveRequests.length > (holidays.length > 0 ? 2 : 3) && (
                            <div className="text-xs text-tahoe-text-muted">
                                    +{leaveRequests.length - (holidays.length > 0 ? 2 : 3)} more
                            </div>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>{t('leave.calendar.legend.vacation')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>{t('leave.calendar.legend.sickLeave')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>{t('leave.calendar.legend.personal')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>{t('leave.calendar.legend.parental')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-tahoe-text-muted rounded-full"></div>
                    <span>{t('leave.calendar.legend.other')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            <div className="lg:col-span-1">
              <div className="card p-6">
                <h4 className="text-lg font-semibold mb-4">
                  {selectedDate ? selectedDate.toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : t('leave.selectDate')}
                </h4>
                
                {selectedDate ? (
                  <div className="space-y-4">
                    {(() => {
                      const dayItems = getLeaveForDate(selectedDate);
                      const holidays = dayItems.filter(item => item.type === 'holiday');
                      const leaveRequests = dayItems.filter(item => item.type === 'leave_request' || !item.type);
                      
                      if (dayItems.length === 0) {
                        return <p className="text-tahoe-text-muted text-sm">{t('leave.calendar.noOneOnLeave')}</p>;
                      }
                      
                      return (
                        <>
                          {/* Show holidays */}
                          {holidays.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-yellow-400 mb-2">{t('leave.calendar.holidays')}</h5>
                              {holidays.map((holiday, index) => (
                                <div key={`holiday-${index}`} className="border-l-4 border-yellow-500 pl-4 py-2 mb-2">
                                  <div className="font-medium text-yellow-400">
                                    🎉 {holiday.description}
                                  </div>
                                  {holiday.is_company_closure && (
                                    <div className="text-xs text-tahoe-text-muted mt-1">
                                      {t('leave.calendar.companyClosure')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Show leave requests */}
                          {leaveRequests.length > 0 && (
                            <div>
                              {holidays.length > 0 && <h5 className="text-sm font-semibold text-tahoe-text-primary mb-2">{t('leave.calendar.leaveRequests')}</h5>}
                              {leaveRequests.map((leave, index) => (
                                <div key={`leave-${index}`} className="border-l-4 border-indigo-400 pl-4 py-2 mb-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {leave.first_name} {leave.last_name}
                                      </div>
                                      <div className="text-sm text-tahoe-text-muted">
                                        {leave.leave_type_name}
                                      </div>
                                      <div className="text-xs text-tahoe-text-muted mt-1">
                                        {formatShortDate(leave.start_date)} - {formatShortDate(leave.end_date)}
                                      </div>
                                      {leave.reason && (
                                        <div className="text-xs text-tahoe-text-muted mt-1">
                                          {leave.reason}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Edit/Delete buttons for manager/admin */}
                                    {(userRole === 'manager' || userRole === 'admin') && leave.id && (
                                      <div className="flex items-center gap-1 ml-2">
                                        <button
                                          onClick={() => {
                                            setEditingLeave(leave);
                                            setManualCreatePrefillDate(null);
                                            setShowManualLeaveCreate(true);
                                          }}
                                          className="p-1.5 text-tahoe-text-muted hover:text-tahoe-accent hover:bg-tahoe-bg-hover rounded transition-all duration-tahoe"
                                          title={t('common.edit') || 'Edit'}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLeave(leave.id)}
                                          disabled={deletingLeaveId === leave.id}
                                          className="p-1.5 text-tahoe-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-tahoe disabled:opacity-50"
                                          title={t('common.delete') || 'Delete'}
                                        >
                                          {deletingLeaveId === leave.id ? (
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                          ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                    )}
                        </>
                      );
                    })()}
                    
                    {/* Manager/Admin action to manually create leave */}
                    {(userRole === 'manager' || userRole === 'admin') && (
                      <div className="pt-4 border-t border-tahoe-border-primary">
                        <button
                          onClick={() => {
                            setEditingLeave(null);
                            setManualCreatePrefillDate(selectedDate);
                            setShowManualLeaveCreate(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-tahoe-pill font-medium transition-all duration-tahoe flex items-center justify-center bg-tahoe-accent hover:bg-tahoe-accent-hover text-white"
                        >
                          <span className="mr-2">📝</span>
                          {t('leave.recordLeaveEntry')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-tahoe-text-muted text-sm">{t('leave.calendar.clickDayPrompt')}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analytics Tab - Hidden for user role */}
      {userRole !== 'user' && activeTab === "analytics" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics && (
              <>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">{t('leave.analyticsTab.totalRequests')}</h3>
                  <p className="text-3xl font-bold">{analytics.requests?.total_requests || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">{t('leave.pending')}</h3>
                  <p className="text-3xl font-bold text-warning">{analytics.requests?.pending || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">{t('leave.approved')}</h3>
                  <p className="text-3xl font-bold text-success">{analytics.requests?.approved || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">{t('leave.analyticsTab.upcoming')}</h3>
                  <p className="text-3xl font-bold text-info">{analytics.upcoming?.upcoming_leaves || 0}</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Manage Policies Modal */}
      <LeaveConfigModal 
        isOpen={showManagePolicies}
        onClose={() => setShowManagePolicies(false)}
        initialTab="policies"
      />

      {/* Manual Leave Create/Edit Modal (Manager/Admin only) */}
      <ManualLeaveCreateModal
        isOpen={showManualLeaveCreate}
        onClose={() => {
          setShowManualLeaveCreate(false);
          setManualCreatePrefillDate(null);
          setEditingLeave(null);
        }}
        defaultDate={manualCreatePrefillDate}
        employees={employees}
        leaveTypes={leaveTypes}
        editingLeave={editingLeave}
        onCreated={() => {
          refreshData();
          setRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
}
