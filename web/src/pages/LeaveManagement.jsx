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
  const [newRequest, setNewRequest] = useState({
    employee_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, balancesData, calendarData, analyticsData] = await Promise.all([
        API("/api/leave/requests"),
        API("/api/leave/balances"),
        API("/api/leave/calendar"),
        API("/api/leave/analytics")
      ]);
      
      setRequests(requestsData);
      setFilteredRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading leave data:", error);
      // Set empty arrays on error to prevent UI issues
      setRequests([]);
      setBalances([]);
      setCalendar([]);
      setAnalytics({});
    } finally {
      setLoading(false);
    }
  };

  // Update filtered requests when main requests list changes
  useEffect(() => {
    setFilteredRequests(requests);
  }, [requests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await API("/api/leave/requests", {
        method: "POST",
        body: JSON.stringify(newRequest)
      });
      setNewRequest({
        employee_id: "",
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: ""
      });
      loadData();
    } catch (error) {
      console.error("Error submitting request:", error);
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
    { id: "requests", name: "Leave Requests", icon: "📋" },
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
            {/* New Request Form */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">New Leave Request</h3>
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                <div className="form-group">
                  <label>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={newRequest.employee_id}
                    onChange={(e) => setNewRequest({...newRequest, employee_id: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    Leave Type
                  </label>
                  <select
                    value={newRequest.leave_type_id}
                    onChange={(e) => setNewRequest({...newRequest, leave_type_id: e.target.value})}
                    required
                  >
                    <option value="">Select leave type</option>
                    <option value="1">Vacation</option>
                    <option value="2">Sick Leave</option>
                    <option value="3">Personal Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="form-group">
                    <label>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    Reason
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    rows="3"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary btn-lg"
                >
                  Submit Request
                </button>
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
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Leave Balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {balances.length === 0 ? (
                <p className="text-muted text-center py-8 col-span-full">No leave balances found</p>
              ) : (
                balances.map((balance) => (
                  <div key={balance.id} className="card p-4">
                    <h4 className="font-medium mb-2">{balance.leave_type_name}</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-secondary">
                        Available: <span className="font-medium">{balance.available_days}</span> days
                      </p>
                      <p className="text-sm text-secondary">
                        Used: <span className="font-medium">{balance.used_days}</span> days
                      </p>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(balance.used_days / (balance.available_days + balance.used_days)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))
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
    </div>
  );
}
