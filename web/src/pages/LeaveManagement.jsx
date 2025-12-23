import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { useUserRole } from '../hooks/useUserRole.js';
import LeaveRequestForm from '../components/LeaveRequestForm.jsx';
import MyLeaveRequests from '../components/MyLeaveRequests.jsx';
import LeaveRequestApproval from '../components/LeaveRequestApproval.jsx';
import LeaveConfigModal from '../components/LeaveConfigModal.jsx';

import { API } from '../config/api.js';
import { formatShortDate, parseLocalDate } from '../utils/timezone.js';

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
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
      const [requestsData, balancesData, calendarData, analyticsData, employeesData, leaveTypesData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API("/api/leave/calendar"),
        API("/api/leave/analytics"),
        API("/api/employees"),
        API("/api/leave/types")
      ]);
      
      console.log('📊 Leave data loaded:', {
        requests: requestsData.length,
        balances: balancesData.length,
        calendar: calendarData.length,
        analytics: analyticsData,
        employees: employeesData.length,
        leaveTypes: leaveTypesData.length
      });
      
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
      setEmployees(employeesData);
      setLeaveTypes(leaveTypesData || []);
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
      const [requestsData, balancesData, calendarData, analyticsData, employeesData, leaveTypesData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API("/api/leave/calendar"),
        API("/api/leave/analytics"),
        API("/api/employees"),
        API("/api/leave/types")
      ]);
      
      console.log('✅ Leave data refreshed:', {
        requests: requestsData.length,
        balances: balancesData.length,
        calendar: calendarData.length,
        analytics: analyticsData,
        employees: employeesData.length,
        leaveTypes: leaveTypesData.length
      });
      
      // Update state immediately - React will re-render automatically
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
      setEmployees(employeesData);
      setLeaveTypes(leaveTypesData || []);
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
                        {(selectedEmployeeBalance.entitled_days + selectedEmployeeBalance.carried_over_days - selectedEmployeeBalance.used_days).toFixed(1)} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                      {t('leave.startDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                      required
                      className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium text-tahoe-text-primary mb-2 block">
                      {t('leave.endDate')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                      required
                      className="rounded-tahoe-input px-3 py-2 w-full transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                    />
                  </div>
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

      {/* Leave Balances Tab - Hidden for user role */}
      {userRole !== 'user' && activeTab === "balances" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6 text-white shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-400 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm font-medium">{t('leave.balances.totalAvailable')}</p>
                      <p className="text-4xl font-bold tracking-tight">{balances.reduce((sum, b) => sum + (b.available_days || 0), 0)}</p>
                    </div>
                  </div>
                  <p className="text-blue-100 text-sm font-medium">days remaining</p>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-6 text-white shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-emerald-400 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-100 text-sm font-medium">{t('leave.balances.thisYearUsed')}</p>
                      <p className="text-4xl font-bold tracking-tight">{balances.reduce((sum, b) => sum + (b.used_days || 0), 0)}</p>
                    </div>
                  </div>
                  <p className="text-emerald-100 text-sm font-medium">days taken</p>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 p-6 text-white shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-violet-400 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-violet-100 text-sm font-medium">{t('leave.balances.accrualRate')}</p>
                      <p className="text-4xl font-bold tracking-tight">2.5</p>
                    </div>
                  </div>
                  <p className="text-violet-100 text-sm font-medium">days per month</p>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-amber-400 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-100 text-sm font-medium">{t('leave.balances.expiringSoon')}</p>
                      <p className="text-4xl font-bold tracking-tight">5</p>
                    </div>
                  </div>
                  <p className="text-amber-100 text-sm font-medium">days in 30 days</p>
              </div>
            </div>

            {/* HR Management Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">{t('leave.hrManagement.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab("requests")}
                  className="p-4 border rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-left"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <h4 className="font-medium text-white">{t('leave.hrManagement.reviewRequests')}</h4>
                  <p className="text-sm text-tahoe-text-muted">{t('leave.hrManagement.reviewRequestsDesc')}</p>
                </button>
                <button 
                  onClick={() => setActiveTab("analytics")}
                  className="p-4 border rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-left"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-white">{t('leave.hrManagement.viewAnalytics')}</h4>
                  <p className="text-sm text-tahoe-text-muted">{t('leave.hrManagement.viewAnalyticsDesc')}</p>
                </button>
                <button 
                  onClick={() => setShowManagePolicies(true)}
                  className="p-4 border rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-left hover:border-tahoe-accent hover:shadow-lg hover:shadow-tahoe-accent/20"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <h4 className="font-medium text-white">{t('leave.hrManagement.managePolicies')}</h4>
                  <p className="text-sm text-tahoe-text-muted">{t('leave.hrManagement.managePoliciesDesc')}</p>
                </button>
              </div>
            </div>

            {/* Leave Types Breakdown */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{t('leave.balances.breakdown')}</h3>
                <div className="flex items-center space-x-2 text-sm text-tahoe-text-muted">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>{t('leave.balances.available')}</span>
                  <div className="w-3 h-3 bg-tahoe-text-muted rounded-full ml-4"></div>
                  <span>{t('leave.balances.used')}</span>
                </div>
              </div>
              
              {balances.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-xl font-semibold mb-2 text-white">{t('leave.balances.noDataTitle')}</h4>
                  <p className="text-tahoe-text-muted mb-6">{t('leave.balances.noDataDescription')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 border rounded-tahoe-input">
                      <div className="text-2xl mb-2">🏖️</div>
                      <h5 className="font-medium text-white">{t('leave.types.vacation')}</h5>
                      <p className="text-sm text-tahoe-text-muted">20 days/year</p>
                    </div>
                    <div className="p-4 border rounded-tahoe-input">
                      <div className="text-2xl mb-2">🤒</div>
                      <h5 className="font-medium text-white">{t('leave.types.sickLeave')}</h5>
                      <p className="text-sm text-tahoe-text-muted">10 days/year</p>
                    </div>
                    <div className="p-4 border rounded-tahoe-input">
                      <div className="text-2xl mb-2">🎯</div>
                      <h5 className="font-medium text-white">{t('leave.types.personalLeave')}</h5>
                      <p className="text-sm text-tahoe-text-muted">5 days/year</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {balances.map((balance) => {
                    const totalDays = (balance.available_days || 0) + (balance.used_days || 0);
                    const usedPercentage = totalDays > 0 ? ((balance.used_days || 0) / totalDays) * 100 : 0;
                    const availablePercentage = 100 - usedPercentage;
                    
                    return (
                      <div key={balance.id} className="p-4 border border-tahoe-border-primary rounded-tahoe-input hover:shadow-md transition-shadow bg-tahoe-card-bg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {balance.leave_type_name === 'Vacation' ? '🏖️' :
                               balance.leave_type_name === 'Sick Leave' ? '🤒' :
                               balance.leave_type_name === 'Personal Leave' ? '🎯' : '📋'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-white">{balance.leave_type_name}</h4>
                              <p className="text-sm text-tahoe-text-muted">
                                {balance.accrual_rate || 2.5} days/month • Expires {balance.expiry_date || 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-400">{balance.available_days || 0}</div>
                            <div className="text-sm text-tahoe-text-muted">available</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-tahoe-text-primary">{t('leave.balances.used', { days: balance.used_days || 0 })}</span>
                            <span className="text-tahoe-text-primary">{t('leave.balances.available', { days: balance.available_days || 0 })}</span>
                          </div>
                          
                          <div className="w-full bg-tahoe-bg-quaternary rounded-full h-3 overflow-hidden">
                            <div className="flex h-full">
                              <div 
                                className="bg-tahoe-text-muted transition-all duration-500"
                                style={{ width: `${usedPercentage}%` }}
                              ></div>
                              <div 
                                className="bg-blue-500 transition-all duration-500"
                                style={{ width: `${availablePercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-tahoe-text-muted">
                            <span>{usedPercentage.toFixed(1)}% used</span>
                            <span>{availablePercentage.toFixed(1)}% available</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
                        onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
                        className={`
                          relative p-2 min-h-[60px] cursor-pointer transition-colors border border-transparent
                          ${day.isCurrentMonth ? 'hover:bg-tahoe-bg-hover' : 'text-tahoe-text-muted'}
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
                              ))}
                            </div>
                    )}
                        </>
                      );
                    })()}
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
    </div>
  );
}
