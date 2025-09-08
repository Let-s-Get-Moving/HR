import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

export default function Settings() {
  const [activeTab, setActiveTab] = useState("system");
  const [systemSettings, setSystemSettings] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [security, setSecurity] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const tabs = [
    { id: "system", name: "System Settings", icon: "⚙️" },
    { id: "preferences", name: "User Preferences", icon: "👤" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "maintenance", name: "Maintenance", icon: "🛠️" }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Check if user is authenticated first
      const sessionResponse = await API("/api/auth/session");
      if (!sessionResponse.user) {
        // Redirect to login or show login required message
        console.log("User not authenticated");
        setLoading(false);
        return;
      }

      const [system, preferences, notifs, sec, maint] = await Promise.all([
        API("/api/settings/system"),
        API("/api/settings/preferences"),
        API("/api/settings/notifications"),
        API("/api/settings/security"),
        API("/api/settings/maintenance")
      ]);
      
      setSystemSettings(system || []);
      setUserPreferences(preferences || []);
      setNotifications(notifs || []);
      setSecurity(sec || []);
      setMaintenance(maint || []);
    } catch (error) {
      console.error("Error loading settings:", error);
      // Set empty arrays to prevent forEach errors
      setSystemSettings([]);
      setUserPreferences([]);
      setNotifications([]);
      setSecurity([]);
      setMaintenance([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingUpdate = async (category, key, value) => {
    // Check if we have a session ID before making the request
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      alert("Please log in to update settings.");
      return;
    }
    
    setSaving(prev => ({ ...prev, [key]: true }));
    
    try {
      await API(`/api/settings/${category}/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });
      
      // Update local state
      const updateState = (settings, setSettings) => {
        setSettings(prev => prev.map(setting => 
          setting.key === key ? { ...setting, value } : setting
        ));
      };
      
      switch (category) {
        case "system":
          updateState(systemSettings, setSystemSettings);
          break;
        case "preferences":
          updateState(userPreferences, setUserPreferences);
          break;
        case "notifications":
          updateState(notifications, setNotifications);
          break;
        case "security":
          updateState(security, setSecurity);
          break;
        case "maintenance":
          updateState(maintenance, setMaintenance);
          break;
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      
      // If it's an authentication error, redirect to login
      if (error.message.includes('401') || error.message.includes('Authentication required')) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem('sessionId');
        window.location.reload();
      } else {
        alert("Failed to update setting. Please try again.");
      }
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderSettingField = (setting, category) => {
    const { key, value, type, options, description } = setting;
    
    switch (type) {
      case "boolean":
        return (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
            </div>
            <button
              onClick={() => handleSettingUpdate(category, key, !JSON.parse(value))}
              disabled={saving[key]}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                JSON.parse(value) ? 'bg-indigo-600' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  JSON.parse(value) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
        
      case "select":
        const optionList = options.split(',');
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {description && <p className="text-xs text-neutral-400 mb-2">{description}</p>}
            <select
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              {optionList.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
        
      case "number":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {description && <p className="text-xs text-neutral-400 mb-2">{description}</p>}
            <input
              type="number"
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        );
        
      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {description && <p className="text-xs text-neutral-400 mb-2">{description}</p>}
            <input
              type={type === "email" ? "email" : "text"}
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        );
    }
  };

  const renderSettingsSection = (settings, category, title) => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={() => window.open(`/api/settings/export`, '_blank')}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Export Settings
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((setting) => (
          <motion.div
            key={setting.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
          >
            {renderSettingField(setting, category)}
            {saving[setting.key] && (
              <div className="mt-2 text-xs text-indigo-400">Saving...</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSystemSettings = () => {
    if (!Array.isArray(systemSettings) || systemSettings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-neutral-400">No system settings available</p>
        </div>
      );
    }

    const categories = {};
    systemSettings.forEach(setting => {
      if (!categories[setting.category]) {
        categories[setting.category] = [];
      }
      categories[setting.category].push(setting);
    });

    return (
      <div className="space-y-8">
        {Object.entries(categories).map(([category, settings]) => (
          <div key={category}>
            <h4 className="text-md font-medium text-neutral-300 mb-4">{category}</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {settings.map((setting) => (
                <motion.div
                  key={setting.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-4"
                >
                  {renderSettingField(setting, "system")}
                  {saving[setting.key] && (
                    <div className="mt-2 text-xs text-indigo-400">Saving...</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-neutral-400 mt-1">Manage system configuration and user preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "system" && (
          <div className="card">
            {renderSystemSettings()}
          </div>
        )}
        
        {activeTab === "preferences" && (
          <div className="card">
            {renderSettingsSection(userPreferences, "preferences", "User Preferences")}
          </div>
        )}
        
        {activeTab === "notifications" && (
          <div className="card">
            {renderSettingsSection(notifications, "notifications", "Notification Settings")}
          </div>
        )}
        
        {activeTab === "security" && (
          <div className="card">
            {renderSettingsSection(security, "security", "Security Settings")}
          </div>
        )}
        
        {activeTab === "maintenance" && (
          <div className="card">
            {renderSettingsSection(maintenance, "maintenance", "Maintenance & Backup")}
          </div>
        )}
      </div>
    </div>
  );
}
