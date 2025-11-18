import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

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
      const [alertsData, dashboardData] = await Promise.all([
        API("/api/compliance/alerts"),
        API("/api/compliance/dashboard")
      ]);
      
      setAlerts(alertsData);
      setDashboard(dashboardData);
    } catch (error) {
      console.error("Error loading compliance data:", error);
      // Set empty arrays on error to prevent UI issues
      setAlerts([]);
      setDashboard({});
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
      default: return 'bg-secondary/10 text-secondary';
    }
  };

  const tabs = [
    { id: "alerts", name: "Active Alerts", icon: "⚠️" },
    { id: "dashboard", name: "Compliance Dashboard", icon: "📊" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <h1 className="text-3xl font-bold mb-2">Compliance Management</h1>
            <p className="text-secondary">Monitor and manage compliance alerts and requirements</p>
          </div>
          <button
            onClick={handleGenerateAlerts}
            className="btn-primary"
          >
            Generate Alerts
          </button>
        </div>
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

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card">
            <div className="p-6 border-b border-primary">
              <h3 className="text-lg font-semibold">Active Compliance Alerts</h3>
              <p className="text-sm text-secondary mt-1">
                {alerts.length} active alerts requiring attention
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-medium  mb-2">All Clear!</h3>
                  <p className="text-secondary">No active compliance alerts at this time.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium ">{alert.type}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertColor(alert.type)}`}>
                              {alert.type}
                            </span>
                          </div>
                          <p className="text-sm text-secondary mb-2">
                            <strong>{alert.first_name} {alert.last_name}</strong> - {alert.department}
                          </p>
                          <p className="text-sm text-secondary mb-3">
                            Due: {formatShortDate(alert.due_date)}
                          </p>
                          {alert.notes && (
                            <p className="text-sm text-secondary mb-3">{alert.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResolveAlert(alert.id, "Resolved by HR")}
                          className="px-3 py-1 btn-primary btn-sm"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id, "Escalated to manager")}
                          className="px-3 py-1 btn-secondary btn-sm"
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
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">⚠️</div>
                    <div>
                      <h3 className="text-lg font-semibold">Total Alerts</h3>
                      <p className="text-3xl font-bold ">{dashboard.total_alerts || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">🚨</div>
                    <div>
                      <h3 className="text-lg font-semibold">Expiring Soon</h3>
                      <p className="text-3xl font-bold text-error">{dashboard.expiring_soon || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">📄</div>
                    <div>
                      <h3 className="text-lg font-semibold">Contract Compliance</h3>
                      <p className="text-3xl font-bold text-success">
                        {dashboard.compliance_rate?.contract_compliance || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card p-6">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">📚</div>
                    <div>
                      <h3 className="text-lg font-semibold">Training Compliance</h3>
                      <p className="text-3xl font-bold text-info">
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
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Alerts by Type</h3>
              <div className="space-y-3">
                {dashboard.alerts_by_type.map((alertType) => (
                  <div key={alertType.type} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span>{getAlertIcon(alertType.type)}</span>
                      <span className="font-medium">{alertType.type}</span>
                    </div>
                    <span className="text-lg font-bold ">{alertType.count}</span>
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
