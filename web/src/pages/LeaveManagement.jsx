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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
        <p className="text-gray-600">Manage employee leave requests and balances</p>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Request Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">New Leave Request</h3>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="number"
                    value={newRequest.employee_id}
                    onChange={(e) => setNewRequest({...newRequest, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <select
                    value={newRequest.leave_type_id}
                    onChange={(e) => setNewRequest({...newRequest, leave_type_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  >
                    <option value="">Select leave type</option>
                    <option value="1">Vacation</option>
                    <option value="2">Sick Leave</option>
                    <option value="3">Personal Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    rows="3"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Submit Request
                </button>
              </form>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No leave requests found</p>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{request.first_name} {request.last_name}</h4>
                          <p className="text-sm text-gray-600">{request.leave_type_name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-600 mb-3">{request.reason}</p>
                      )}
                      {request.status === 'Pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'Approved')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Leave Balances</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.length === 0 ? (
                <p className="text-gray-500 text-center py-8 col-span-full">No leave balances found</p>
              ) : (
                balances.map((balance) => (
                  <div key={balance.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">{balance.leave_type_name}</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Available: <span className="font-medium">{balance.available_days}</span> days
                      </p>
                      <p className="text-sm text-gray-600">
                        Used: <span className="font-medium">{balance.used_days}</span> days
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-900 h-2 rounded-full"
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
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Leave Calendar</h3>
            <div className="space-y-4">
              {calendar.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No approved leaves found</p>
              ) : (
                calendar.map((leave) => (
                  <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{leave.first_name} {leave.last_name}</h4>
                        <p className="text-sm text-gray-600">{leave.leave_type_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
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
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Requests</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.requests?.total_requests || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Pending</h3>
                  <p className="text-3xl font-bold text-yellow-600">{analytics.requests?.pending || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Approved</h3>
                  <p className="text-3xl font-bold text-green-600">{analytics.requests?.approved || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Upcoming</h3>
                  <p className="text-3xl font-bold text-blue-600">{analytics.upcoming?.upcoming_leaves || 0}</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
