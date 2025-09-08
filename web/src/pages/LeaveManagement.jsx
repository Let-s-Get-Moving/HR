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
      // Note: These API calls will work once the backend is fixed
      const [requestsData, balancesData, calendarData, analyticsData] = await Promise.all([
        API("/api/leave/requests").catch(() => []),
        API("/api/leave/balances").catch(() => []),
        API("/api/leave/calendar").catch(() => []),
        API("/api/leave/analytics").catch(() => ({}))
      ]);
      
      setRequests(requestsData);
      setBalances(balancesData);
      setCalendar(calendarData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading leave data:", error);
    } finally {
      setLoading(false);
    }
  };

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
                    type="number"
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
                {requests.length === 0 ? (
                  <p className="text-muted text-center py-8">No leave requests found</p>
                ) : (
                  requests.map((request) => (
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
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Leave Calendar</h3>
            <div className="space-y-4">
              {calendar.length === 0 ? (
                <p className="text-muted text-center py-8">No approved leaves found</p>
              ) : (
                calendar.map((leave) => (
                  <div key={leave.id} className="card p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{leave.first_name} {leave.last_name}</h4>
                        <p className="text-sm text-secondary">{leave.leave_type_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
