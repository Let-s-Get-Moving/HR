import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';
import { sessionManager } from '../utils/sessionManager.js';

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

  // Load local settings after initial settings are loaded
  useEffect(() => {
    if (userPreferences.length > 0) {
      loadLocalSettings();
    }
  }, [userPreferences.length]);

  const loadLocalSettings = () => {
    // Load settings from localStorage and update state
    const updateSettingFromStorage = (settings, setSettings, category) => {
      setSettings(prev => prev.map(setting => {
        const storedValue = localStorage.getItem(`${category}_${setting.key}`);
        return storedValue !== null ? { ...setting, value: storedValue } : setting;
      }));
    };

    updateSettingFromStorage(systemSettings, setSystemSettings, 'system');
    updateSettingFromStorage(userPreferences, setUserPreferences, 'preferences');
    updateSettingFromStorage(notifications, setNotifications, 'notifications');
    updateSettingFromStorage(security, setSecurity, 'security');
    updateSettingFromStorage(maintenance, setMaintenance, 'maintenance');

    // Apply theme immediately
    applyTheme();
  };

  const applyTheme = (themeValue = null) => {
    const theme = themeValue || localStorage.getItem('preferences_theme') || 'dark';
    const root = document.documentElement;

    // Remove all theme classes first
    root.classList.remove('dark', 'light');
    
    // Add the correct theme class
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.add('dark');
    }
    
    console.log('Applied theme:', theme);
  };

  const applyLanguage = (language) => {
    // Set the document language
    document.documentElement.lang = language;
    console.log(`Language changed to: ${language}`);
    // In a real app, you might trigger a re-render with new translations
  };

  const applyTimezone = (timezone) => {
    // Store timezone for use in date formatting
    localStorage.setItem('user_timezone', timezone);
    console.log(`Timezone changed to: ${timezone}`);
    // In a real app, you might update all date displays
  };

  const loadSettings = async () => {
    try {
      // Check if user is authenticated using session manager
      const sessionData = await sessionManager.checkSession(API);
      if (!sessionData || !sessionData.user) {
        console.log("User not authenticated, skipping settings load");
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
    setSaving(prev => ({ ...prev, [key]: true }));
    
    // Update local state immediately for better UX
    const updateState = (settings, setSettings) => {
      setSettings(prev => prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      ));
    };
    
    // Store in localStorage for persistence
    const settingKey = `${category}_${key}`;
    localStorage.setItem(settingKey, value);
    
    // Update local state
    switch (category) {
      case "system":
        updateState(systemSettings, setSystemSettings);
        break;
      case "preferences":
        updateState(userPreferences, setUserPreferences);
        // Apply specific preference changes immediately
        if (key === 'theme') {
          applyTheme(value);
        } else if (key === 'language') {
          applyLanguage(value);
        } else if (key === 'timezone') {
          applyTimezone(value);
        }
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
    
    // Try to sync with server (but don't fail if it doesn't work)
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        await API(`/api/settings/${category}/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value })
        });
        console.log(`Setting ${key} updated successfully on server`);
      }
    } catch (error) {
      console.warn("Failed to sync setting with server:", error);
      // Don't show error to user - setting is already saved locally
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderSettingField = (setting, category) => {
    const { key, value, type, options, description } = setting;
    
    // Helper function to safely parse boolean values
    const parseBoolean = (val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return false;
    };
    
    switch (type) {
      case "boolean":
        const boolValue = parseBoolean(value);
        return (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
            </div>
            <button
              onClick={() => handleSettingUpdate(category, key, !boolValue)}
              disabled={saving[key]}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                boolValue ? 'bg-indigo-600' : 'bg-neutral-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  boolValue ? 'translate-x-6' : 'translate-x-1'
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
