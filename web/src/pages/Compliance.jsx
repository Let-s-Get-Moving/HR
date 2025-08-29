import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API = (path, options = {}) => fetch(`http://localhost:8080${path}`, {
  ...options,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    ...options.headers
  }
}).then(r => r.json());

export default function Compliance() {
  const [alerts, setAlerts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState("alerts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Note: These API calls will work once the backend is fixed
      const [alertsData, dashboardData] = await Promise.all([
        API("/api/compliance/alerts").catch(() => []),
        API("/api/compliance/dashboard").catch(() => ({}))
      ]);
      
      setAlerts(alertsData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      await API("/api/compliance/generate-alerts", { method: "POST" });
      loadData();
    } catch (error) {
      console.error("Error generating alerts:", error);
    }
  };

  const handleResolveAlert = async (alertId, notes) => {
    try {
      await API(`/api/compliance/alerts/${alertId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ notes })
      });
      loadData();
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'SIN Expiry': return '🆔';
      case 'Work Permit Expiry': return '📋';
      case 'Training Expiry': return '📚';
      case 'Probation End': return '⏰';
      case 'Contract Renewal': return '📄';
      default: return '⚠️';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'SIN Expiry': return 'bg-red-100 text-red-800';
      case 'Work Permit Expiry': return 'bg-orange-100 text-orange-800';
      case 'Training Expiry': return 'bg-yellow-100 text-yellow-800';
      case 'Probation End': return 'bg-blue-100 text-blue-800';
      case 'Contract Renewal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: "alerts", name: "Active Alerts", icon: "⚠️" },
    { id: "dashboard", name: "Compliance Dashboard", icon: "📊" }
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Management</h1>
            <p className="text-gray-600">Monitor and manage compliance alerts and requirements</p>
          </div>
          <button
            onClick={handleGenerateAlerts}
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            Generate Alerts
          </button>
        </div>
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

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Active Compliance Alerts</h3>
              <p className="text-sm text-gray-600 mt-1">
                {alerts.length} active alerts requiring attention
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                  <p className="text-gray-600">No active compliance alerts at this time.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900">{alert.type}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertColor(alert.type)}`}>
                              {alert.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>{alert.first_name} {alert.last_name}</strong> - {alert.department}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            Due: {new Date(alert.due_date).toLocaleDateString()}
                          </p>
                          {alert.notes && (
                            <p className="text-sm text-gray-600 mb-3">{alert.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResolveAlert(alert.id, "Resolved by HR")}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id, "Escalated to manager")}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Escalate
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboard && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">⚠️</div>
                    <div>
                      <h3 className="text-lg font-semibold">Total Alerts</h3>
                      <p className="text-3xl font-bold text-gray-900">{dashboard.total_alerts || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">🚨</div>
                    <div>
                      <h3 className="text-lg font-semibold">Expiring Soon</h3>
                      <p className="text-3xl font-bold text-red-600">{dashboard.expiring_soon || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">📄</div>
                    <div>
                      <h3 className="text-lg font-semibold">Contract Compliance</h3>
                      <p className="text-3xl font-bold text-green-600">
                        {dashboard.compliance_rate?.contract_compliance || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">📚</div>
                    <div>
                      <h3 className="text-lg font-semibold">Training Compliance</h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {dashboard.compliance_rate?.training_compliance || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Alerts by Type */}
          {dashboard?.alerts_by_type && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Alerts by Type</h3>
              <div className="space-y-3">
                {dashboard.alerts_by_type.map((alertType) => (
                  <div key={alertType.type} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span>{getAlertIcon(alertType.type)}</span>
                      <span className="font-medium">{alertType.type}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{alertType.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
