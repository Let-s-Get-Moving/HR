import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function LeaveManagement() {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("requests");
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
      const [requestsData, balancesData, calendarData, analyticsData, employeesData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API("/api/leave/calendar"),
        API("/api/leave/analytics"),
        API("/api/employees")
      ]);
      
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
      setEmployees(employeesData);
      
      // Set leave types from first request or default
      setLeaveTypes([
        { id: 1, name: 'Vacation' },
        { id: 2, name: 'Sick Leave' },
        { id: 3, name: 'Personal Leave' },
        { id: 4, name: 'Bereavement' },
        { id: 5, name: 'Parental Leave' },
        { id: 6, name: 'Jury Duty' },
        { id: 7, name: 'Military Leave' }
      ]);
    } catch (error) {
      console.error("Error loading leave data:", error);
      // Set empty arrays on error to prevent UI issues
      setRequests([]);
      setBalances([]);
      setCalendar([]);
      setAnalytics({});
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Update filtered requests when main requests list changes
  useEffect(() => {
    setFilteredRequests(requests);
  }, [requests]);

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
      alert("Error creating leave entry: " + (error.message || "Unknown error"));
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
    
    return calendar.filter(leave => {
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      const checkDate = new Date(date);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      'Vacation': 'bg-blue-500 text-white',
      'Sick': 'bg-red-500 text-white',
      'Sick Leave': 'bg-red-500 text-white',
      'Personal': 'bg-green-500 text-white',
      'Personal Leave': 'bg-green-500 text-white',
      'Parental': 'bg-purple-500 text-white',
      'Bereavement': 'bg-gray-500 text-white',
      'Other': 'bg-gray-500 text-white'
    };
    
    return colors[leaveType] || 'bg-gray-500 text-white';
  };

  const tabs = [
    { id: "requests", name: "Record Leave", icon: "📝" },
    { id: "balances", name: "Leave Balances", icon: "💰" },
    { id: "calendar", name: "Leave Calendar", icon: "📅" },
    { id: "analytics", name: "Analytics", icon: "📊" }
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
        <h1 className="text-3xl font-bold mb-2">Leave Management</h1>
        <p className="text-secondary">Manage employee leave requests and balances</p>
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


      {/* Leave Requests Tab */}
      {activeTab === "requests" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Record Leave Entry Form */}
            <div className="card p-6 bg-neutral-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">📝</span>
                Record Leave Entry
              </h3>
              <p className="text-sm text-neutral-400 mb-6">HR records employee leave communicated via email, phone, or in-person</p>
              
              <form onSubmit={(e) => handleSubmitRequest(e, false)} className="space-y-4">
                {/* Employee Selection with Search */}
                <div className="form-group">
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Employee <span className="text-red-500">*</span>
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
                    placeholder="Type to search employee..."
                    required
                    className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <datalist id="employee-list">
                    {employees.map(emp => (
                      <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                        {emp.department || 'No Dept'}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Leave Type */}
                <div className="form-group">
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.leave_type_id}
                    onChange={(e) => setNewRequest({...newRequest, leave_type_id: e.target.value})}
                    required
                    className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select leave type...</option>
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Show leave balance if available */}
                {selectedEmployeeBalance && (
                  <div className="bg-neutral-700 border border-neutral-600 rounded p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Available Days:</span>
                      <span className="text-green-400 font-semibold">
                        {(selectedEmployeeBalance.entitled_days + selectedEmployeeBalance.carried_over_days - selectedEmployeeBalance.used_days).toFixed(1)} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                      required
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                      required
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Show calculated days */}
                {newRequest.start_date && newRequest.end_date && (
                  <div className="bg-indigo-900/30 border border-indigo-500/30 rounded p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-300">Total Days:</span>
                      <span className="text-indigo-400 font-semibold text-lg">
                        {calculateTotalDays(newRequest.start_date, newRequest.end_date)} days
                      </span>
                    </div>
                  </div>
                )}

                {/* Request Method and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">
                      Request Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRequest.request_method}
                      onChange={(e) => setNewRequest({...newRequest, request_method: e.target.value})}
                      required
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">How was it requested?</option>
                      <option value="Email">📧 Email</option>
                      <option value="Phone">📞 Phone</option>
                      <option value="In-Person">🤝 In-Person</option>
                      <option value="Slack">💬 Slack</option>
                      <option value="Written">📝 Written</option>
                      <option value="Other">❓ Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRequest.status}
                      onChange={(e) => setNewRequest({...newRequest, status: e.target.value})}
                      required
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Pending">⏳ Pending Review</option>
                      <option value="Approved">✅ Approved</option>
                      <option value="Rejected">❌ Rejected</option>
                      <option value="Cancelled">🚫 Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Reason
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    rows="2"
                    placeholder="Optional: Why is the employee taking leave?"
                    className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    HR Notes (Internal)
                  </label>
                  <textarea
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({...newRequest, notes: e.target.value})}
                    rows="2"
                    placeholder="Optional: Internal notes for HR records..."
                    className="bg-neutral-700 border border-neutral-600 rounded px-3 py-2 w-full text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    type="submit"
                    className="bg-neutral-600 hover:bg-neutral-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">💾</span>
                    Save as {newRequest.status}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitRequest(e, true)}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">✅</span>
                    Save & Approve
                  </button>
                </div>
              </form>
            </div>

            {/* Requests List */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
              <div className="space-y-4">
                {filteredRequests.filter(request => request.status === 'Pending').length === 0 ? (
                  <p className="text-muted text-center py-8">No pending leave requests found</p>
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
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
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
              <h3 className="text-lg font-semibold mb-4">All Requests History</h3>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <p className="text-muted text-center py-8">No leave requests found</p>
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
                        <div className="flex justify-between items-center mb-4 text-sm text-neutral-400">
                          <span>
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
                          </span>
                          <span>Page {historyCurrentPage} of {totalPages}</span>
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
                                {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
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
                          <div className="flex justify-center items-center space-x-2 mt-6 pt-4 border-t border-neutral-700">
                            <button
                              onClick={() => setHistoryCurrentPage(Math.max(1, historyCurrentPage - 1))}
                              disabled={historyCurrentPage === 1}
                              className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg transition-colors text-sm"
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
                                  return <span key={pageNum} className="px-2 text-neutral-500">...</span>;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setHistoryCurrentPage(pageNum)}
                                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                      isCurrentPage 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
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
                              className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg transition-colors text-sm"
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
                      <p className="text-blue-100 text-sm font-medium">Total Available</p>
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
                      <p className="text-emerald-100 text-sm font-medium">This Year Used</p>
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
                      <p className="text-violet-100 text-sm font-medium">Accrual Rate</p>
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
                      <p className="text-amber-100 text-sm font-medium">Expiring Soon</p>
                      <p className="text-4xl font-bold tracking-tight">5</p>
                    </div>
                  </div>
                  <p className="text-amber-100 text-sm font-medium">days in 30 days</p>
              </div>
            </div>

            {/* Leave Types Breakdown */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Leave Type Breakdown</h3>
                <div className="flex items-center space-x-2 text-sm text-neutral-400">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Available</span>
                  <div className="w-3 h-3 bg-neutral-400 rounded-full ml-4"></div>
                  <span>Used</span>
                </div>
              </div>
              
              {balances.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-xl font-semibold mb-2 text-white">No Leave Data Available</h4>
                  <p className="text-neutral-400 mb-6">Leave balances will appear here once employees start using the system.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
                      <div className="text-2xl mb-2">🏖️</div>
                      <h5 className="font-medium text-white">Vacation</h5>
                      <p className="text-sm text-neutral-400">20 days/year</p>
                    </div>
                    <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
                      <div className="text-2xl mb-2">🤒</div>
                      <h5 className="font-medium text-white">Sick Leave</h5>
                      <p className="text-sm text-neutral-400">10 days/year</p>
                    </div>
                    <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
                      <div className="text-2xl mb-2">🎯</div>
                      <h5 className="font-medium text-white">Personal</h5>
                      <p className="text-sm text-neutral-400">5 days/year</p>
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
                      <div key={balance.id} className="p-4 border border-neutral-700 rounded-lg hover:shadow-md transition-shadow bg-neutral-800">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {balance.leave_type_name === 'Vacation' ? '🏖️' :
                               balance.leave_type_name === 'Sick Leave' ? '🤒' :
                               balance.leave_type_name === 'Personal Leave' ? '🎯' : '📋'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg text-white">{balance.leave_type_name}</h4>
                              <p className="text-sm text-neutral-400">
                                {balance.accrual_rate || 2.5} days/month • Expires {balance.expiry_date || 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-400">{balance.available_days || 0}</div>
                            <div className="text-sm text-neutral-400">available</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-300">Used: {balance.used_days || 0} days</span>
                            <span className="text-neutral-300">Available: {balance.available_days || 0} days</span>
                          </div>
                          
                          <div className="w-full bg-neutral-600 rounded-full h-3 overflow-hidden">
                            <div className="flex h-full">
                              <div 
                                className="bg-neutral-400 transition-all duration-500"
                                style={{ width: `${usedPercentage}%` }}
                              ></div>
                              <div 
                                className="bg-blue-500 transition-all duration-500"
                                style={{ width: `${availablePercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-xs text-neutral-400">
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

            {/* HR Management Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">HR Management Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setActiveTab("requests")}
                  className="p-4 border border-neutral-700 rounded-lg hover:bg-neutral-800 transition-colors text-left bg-neutral-800"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <h4 className="font-medium text-white">Review Requests</h4>
                  <p className="text-sm text-neutral-400">Approve or reject leave requests</p>
                </button>
                <button 
                  onClick={() => setActiveTab("analytics")}
                  className="p-4 border border-neutral-700 rounded-lg hover:bg-neutral-800 transition-colors text-left bg-neutral-800"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-medium text-white">View Analytics</h4>
                  <p className="text-sm text-neutral-400">Check leave trends and reports</p>
                </button>
                <button 
                  onClick={() => setShowManagePolicies(true)}
                  className="p-4 border border-neutral-700 rounded-lg hover:bg-neutral-800 transition-colors text-left bg-neutral-800 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <h4 className="font-medium text-white">Manage Policies</h4>
                  <p className="text-sm text-neutral-400">Configure leave policies and rules</p>
                </button>
              </div>
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
                  <h3 className="text-lg font-semibold">Leave Calendar</h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      ←
                    </button>
                    <span className="font-medium text-lg">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-neutral-400">
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
                          ${day.isCurrentMonth ? 'hover:bg-neutral-700' : 'text-neutral-600'}
                          ${isSelected ? 'bg-indigo-600 text-white' : ''}
                          ${day.isToday ? 'ring-2 ring-indigo-400' : ''}
                        `}
                      >
                        <div className="text-sm font-medium">{day.date.getDate()}</div>
                        
                        {/* Leave indicators */}
                        <div className="mt-1 space-y-1">
                          {dayLeaves.slice(0, 3).map((leave, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-1 py-0.5 rounded truncate ${getLeaveTypeColor(leave.leave_type_name)}`}
                              title={`${leave.first_name} ${leave.last_name} - ${leave.leave_type_name}`}
                            >
                              {leave.first_name}
                            </div>
                          ))}
                          {dayLeaves.length > 3 && (
                            <div className="text-xs text-neutral-400">
                              +{dayLeaves.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Vacation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Sick Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Personal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Parental</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    <span>Other</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Day Details */}
            <div className="lg:col-span-1">
              <div className="card p-6">
                <h4 className="text-lg font-semibold mb-4">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Select a date'}
                </h4>
                
                {selectedDate ? (
                  <div className="space-y-4">
                    {getLeaveForDate(selectedDate).length === 0 ? (
                      <p className="text-neutral-400 text-sm">No one is on leave this day</p>
                    ) : (
                      getLeaveForDate(selectedDate).map((leave, index) => (
                        <div key={index} className="border-l-4 border-indigo-400 pl-4 py-2">
                          <div className="font-medium">
                            {leave.first_name} {leave.last_name}
                          </div>
                          <div className="text-sm text-neutral-400">
                            {leave.leave_type_name}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          </div>
                          {leave.reason && (
                            <div className="text-xs text-neutral-500 mt-1">
                              {leave.reason}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-400 text-sm">Click on a calendar day to see who's on leave</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics && (
              <>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Requests</h3>
                  <p className="text-3xl font-bold">{analytics.requests?.total_requests || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Pending</h3>
                  <p className="text-3xl font-bold text-warning">{analytics.requests?.pending || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Approved</h3>
                  <p className="text-3xl font-bold text-success">{analytics.requests?.approved || 0}</p>
                </div>
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
                  <p className="text-3xl font-bold text-info">{analytics.upcoming?.upcoming_leaves || 0}</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Manage Policies Modal */}
      {showManagePolicies && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Leave Policy Management</h3>
                <button
                  onClick={() => setShowManagePolicies(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Policy Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-blue-400 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-white">Vacation Policy</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-blue-100">Annual Allocation:</span>
                        <span className="text-white font-medium">20 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-100">Accrual Rate:</span>
                        <span className="text-white font-medium">1.67 days/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-100">Carry Over:</span>
                        <span className="text-white font-medium">5 days max</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-emerald-400 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-white">Sick Leave Policy</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-emerald-100">Annual Allocation:</span>
                        <span className="text-white font-medium">10 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-100">Accrual Rate:</span>
                        <span className="text-white font-medium">0.83 days/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-100">Carry Over:</span>
                        <span className="text-white font-medium">Unlimited</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-violet-400 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-white">Personal Leave</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-violet-100">Annual Allocation:</span>
                        <span className="text-white font-medium">5 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-violet-100">Accrual Rate:</span>
                        <span className="text-white font-medium">0.42 days/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-violet-100">Carry Over:</span>
                        <span className="text-white font-medium">No carry over</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Policy Settings */}
                <div className="card p-6">
                  <h4 className="text-lg font-semibold mb-4 text-white">Policy Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Accrual Frequency</label>
                      <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option>Monthly</option>
                        <option>Bi-weekly</option>
                        <option>Quarterly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Fiscal Year Start</label>
                      <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option>January 1st</option>
                        <option>April 1st</option>
                        <option>July 1st</option>
                        <option>October 1st</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Minimum Notice Period</label>
                      <select className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option>24 hours</option>
                        <option>48 hours</option>
                        <option>1 week</option>
                        <option>2 weeks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">Maximum Consecutive Days</label>
                      <input type="number" className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" placeholder="30" />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowManagePolicies(false)}
                    className="px-6 py-2 border border-neutral-600 rounded-lg font-medium transition-colors hover:bg-neutral-700 text-white"
                  >
                    Cancel
                  </button>
                  <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors text-white">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
