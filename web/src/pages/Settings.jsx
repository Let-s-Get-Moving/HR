import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { API } from '../config/api.js';

// CleanupButton component COMPLETELY REMOVED
// This component was causing accidental data deletion and has been permanently removed

export default function Settings() {
  const [activeTab, setActiveTab] = useState("system");

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reload settings when switching to user-specific tabs
    if (['preferences', 'notifications', 'security', 'maintenance'].includes(tabId)) {
      loadSettings();
    }
  };
  const [systemSettings, setSystemSettings] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [security, setSecurity] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  
  // MFA Setup Modal State
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaData, setMfaData] = useState(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState(null);
  
  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const tabs = [
    { id: "system", name: "System Settings", icon: "⚙️" },
    { id: "preferences", name: "User Preferences", icon: "👤" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "maintenance", name: "Maintenance", icon: "🛠️" }
  ];

  // Track if component is mounted (avoid double-loading on first render)
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    loadSettings();
    isInitialMount.current = false; // Mark that initial load is complete
  }, []);

  // Reload settings when user navigates back to settings (but not on initial mount)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only reload if document was hidden and is now visible AND not initial mount
      if (!document.hidden && !isInitialMount.current) {
        console.log('👁️ [Settings] Tab became visible, reloading settings...');
        loadSettings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load local settings after initial settings are loaded
  useEffect(() => {
    if (userPreferences.length > 0) {
      loadLocalSettings();
    }
  }, [userPreferences.length]);

  const loadLocalSettings = () => {
    // ⚠️ CRITICAL CHANGE: NO MORE LOCALSTORAGE CACHING FOR SERVER SETTINGS!
    // All settings (system, security, notifications, maintenance) now come from database
    // Only cache theme preference for instant UI rendering before server response
    
    // Apply theme immediately from localStorage (for instant UI rendering)
    const cachedTheme = localStorage.getItem('preferences_theme');
    const currentTheme = cachedTheme || (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    
    // Update the theme setting in state to reflect the actual current theme
    setUserPreferences(prev => prev.map(setting => 
      setting.key === 'theme' ? { ...setting, value: currentTheme } : setting
    ));
    
    console.log('✅ [Settings] Theme loaded from localStorage:', currentTheme);
    console.log('✅ [Settings] All other settings will load from database');
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
    // Prevent concurrent loads
    if (loading) {
      console.log('⏳ [Settings] Already loading, skipping duplicate request...');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 [Settings] Loading settings...');
      
      // Clean up any MFA status from localStorage (it should ONLY come from server)
      localStorage.removeItem('security_two_factor_auth');
      
      // Always try to load system settings (no auth required)
      const system = await API("/api/settings/system").catch(() => []);
      setSystemSettings(system || []);

      // Detect current theme from DOM
      const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      
      // Default settings (used as fallback only)
      const defaultPreferences = [
        { key: "theme", label: "Theme", type: "select", value: currentTheme, options: ["dark", "light"] },
        { key: "language", label: "Language", type: "select", value: "en", options: ["en", "es", "fr"] },
        { key: "timezone", label: "Timezone", type: "select", value: "UTC", options: ["UTC", "EST", "PST", "CST"] },
        { key: "dashboard_layout", label: "Dashboard Layout", type: "select", value: "grid", options: ["grid", "list"] }
      ];

      const defaultNotifications = [
        { key: "email_notifications", label: "Email Notifications", type: "boolean", value: "true" },
        { key: "push_notifications", label: "Push Notifications", type: "boolean", value: "false" },
        { key: "sms_notifications", label: "SMS Notifications", type: "boolean", value: "false" }
      ];

      const defaultSecurity = [
        { key: "two_factor_auth", label: "Two-Factor Authentication", type: "boolean", value: "false" },
        { key: "session_timeout", label: "Session Timeout (minutes)", type: "number", value: "120" },
        { key: "password_requirements", label: "Password Requirements", type: "select", value: "strong", options: ["weak", "medium", "strong"] }
      ];

      const defaultMaintenance = [
        { key: "auto_backup", label: "Automatic Backup", type: "boolean", value: "true" },
        { key: "backup_frequency", label: "Backup Frequency", type: "select", value: "daily", options: ["daily", "weekly", "monthly"] },
        { key: "maintenance_mode", label: "Maintenance Mode", type: "boolean", value: "false" }
      ];

      // ALWAYS try to load authenticated settings - if API returns 401, it will fall back to defaults
      console.log('📡 [Settings] Attempting to load authenticated settings from API...');
      const [preferences, notifs, sec, maint] = await Promise.all([
        API("/api/settings/preferences").catch((err) => {
          console.log('⚠️ [Settings] Preferences API failed, using defaults:', err.message);
          return defaultPreferences;
        }),
        API("/api/settings/notifications").catch((err) => {
          console.log('⚠️ [Settings] Notifications API failed, using defaults:', err.message);
          return defaultNotifications;
        }),
        API("/api/settings/security").catch((err) => {
          console.log('⚠️ [Settings] Security API failed, using defaults:', err.message);
          return defaultSecurity;
        }),
        API("/api/settings/maintenance").catch((err) => {
          console.log('⚠️ [Settings] Maintenance API failed, using defaults:', err.message);
          return defaultMaintenance;
        })
      ]);
      
      console.log('✅ [Settings] Security settings loaded from API:', sec);
      console.log('🔐 [Settings] MFA toggle value:', sec?.find(s => s.key === 'two_factor_auth')?.value);
      
      setUserPreferences(preferences || defaultPreferences);
      setNotifications(notifs || defaultNotifications);
      setSecurity(sec || defaultSecurity);
      setMaintenance(maint || defaultMaintenance);
    } catch (error) {
      console.error("Error loading settings:", error);
      // Set default settings to prevent empty arrays
      setSystemSettings([]);
      // Detect current theme from DOM for error fallback
      const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      setUserPreferences([
        { key: "theme", label: "Theme", type: "select", value: currentTheme, options: ["dark", "light"] },
        { key: "language", label: "Language", type: "select", value: "en", options: ["en", "es", "fr"] },
        { key: "timezone", label: "Timezone", type: "select", value: "UTC", options: ["UTC", "EST", "PST", "CST"] },
        { key: "dashboard_layout", label: "Dashboard Layout", type: "select", value: "grid", options: ["grid", "list"] }
      ]);
      setNotifications([
        { key: "email_notifications", label: "Email Notifications", type: "boolean", value: "true" },
        { key: "push_notifications", label: "Push Notifications", type: "boolean", value: "false" },
        { key: "sms_notifications", label: "SMS Notifications", type: "boolean", value: "false" }
      ]);
      setSecurity([
        { key: "two_factor_auth", label: "Two-Factor Authentication", type: "boolean", value: "false" },
        { key: "session_timeout", label: "Session Timeout (minutes)", type: "number", value: "120" },
        { key: "password_requirements", label: "Password Requirements", type: "select", value: "strong", options: ["weak", "medium", "strong"] }
      ]);
      setMaintenance([
        { key: "auto_backup", label: "Automatic Backup", type: "boolean", value: "true" },
        { key: "backup_frequency", label: "Backup Frequency", type: "select", value: "daily", options: ["daily", "weekly", "monthly"] },
        { key: "maintenance_mode", label: "Maintenance Mode", type: "boolean", value: "false" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingUpdate = async (category, key, value) => {
    // 🔐 SPECIAL HANDLING FOR MFA TOGGLE
    // Don't update state immediately - show modal first, update only after verification
    if (key === 'two_factor_auth') {
      if (value === 'true' || value === true) {
        // User wants to ENABLE MFA - show setup modal immediately
        console.log('🔐 User clicked to enable MFA - showing setup modal');
        setSaving(prev => ({ ...prev, [key]: true }));
        await initiateMFASetup();
        setSaving(prev => ({ ...prev, [key]: false }));
        // Don't change toggle state - it will update after successful verification
        return;
      } else {
        // User wants to DISABLE MFA - ask for confirmation
        if (!confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) {
          return; // User cancelled
        }
      }
    }
    
    setSaving(prev => ({ ...prev, [key]: true }));
    
    // Update local state immediately for better UX (except MFA - handled above)
    const updateState = (settings, setSettings) => {
      setSettings(prev => prev.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      ));
    };
    
    // ⚠️ ONLY cache theme in localStorage (for instant UI rendering)
    // ALL other settings are stored in database!
    if (key === 'theme' && category === 'preferences') {
      localStorage.setItem('preferences_theme', value);
      console.log('✅ [Settings] Theme cached to localStorage:', value);
    }
    
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
        const response = await API(`/api/settings/${category}/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value })
        });
        console.log(`✅ Setting ${key} updated successfully on server`);
      }
    } catch (error) {
      console.warn("Failed to sync setting with server:", error);
      // Don't show error to user - setting is already saved locally
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };
  
  // Initiate MFA Setup - Get QR Code
  const initiateMFASetup = async () => {
    try {
      const response = await API('/api/settings/security/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('MFA setup response:', response);
      setMfaData(response);
      setShowMFAModal(true);
      setMfaError(null);
    } catch (error) {
      console.error('MFA setup failed:', error);
      alert('Failed to initiate MFA setup: ' + error.message);
    }
  };
  
  // Verify MFA Code
  const verifyMFACode = async () => {
    if (!mfaVerificationCode || mfaVerificationCode.length !== 6) {
      setMfaError('Please enter a 6-digit code');
      return;
    }
    
    setMfaVerifying(true);
    setMfaError(null);
    
    try {
      const response = await API('/api/settings/security/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaVerificationCode })
      });
      
      if (response.success) {
        // MFA enabled successfully!
        setShowMFAModal(false);
        setMfaVerificationCode('');
        setMfaData(null);
        
        // Update the security settings locally (will be verified from server on next load)
        setSecurity(prev => prev.map(setting => 
          setting.key === 'two_factor_auth' ? { ...setting, value: 'true' } : setting
        ));
        
        // DON'T save MFA status to localStorage - it must always come from server!
        // localStorage.setItem('security_two_factor_auth', 'true'); // REMOVED!
        
        alert('✅ Two-Factor Authentication enabled successfully! Your account is now protected.');
        
        // Don't call loadSettings() here - it causes a race condition
        // The local state is already updated correctly
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
      setMfaError(error.message || 'Invalid code. Please try again.');
    } finally {
      setMfaVerifying(false);
    }
  };
  
  // Close MFA Modal
  const closeMFAModal = () => {
    setShowMFAModal(false);
    setMfaVerificationCode('');
    setMfaError(null);
    // Revert toggle
    setSecurity(prev => prev.map(setting => 
      setting.key === 'two_factor_auth' ? { ...setting, value: 'false' } : setting
    ));
  };
  
  // Open Change Password Modal
  const openPasswordModal = () => {
    setShowPasswordModal(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess(false);
  };
  
  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    try {
      const response = await API('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(error.message || 'Failed to change password');
    }
  };
  
  // Close Password Modal
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const renderSettingField = (setting, category) => {
    // Safety check to ensure setting is valid
    if (!setting || typeof setting !== 'object') {
      return null;
    }
    
    const { key, value, type, options, description } = setting;
    
    // Safety check for required properties
    if (!key || !type) {
      return null;
    }
    
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
            <div className="flex-1">
              <label className="text-sm font-medium">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              {description && <p className="text-xs text-secondary mt-1">{description}</p>}
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-xs font-medium ${boolValue ? 'text-green-600' : 'text-red-600'}`}>
                {boolValue ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={() => handleSettingUpdate(category, key, !boolValue)}
                disabled={saving[key]}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                  boolValue 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-red-500 hover:bg-red-600'
                } ${saving[key] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                    boolValue ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        );
        
      case "select":
        const optionList = Array.isArray(options) ? options : (typeof options === 'string' ? options.split(',') : []);
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {description && <p className="text-xs text-secondary mb-2">{description}</p>}
            <select
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus"
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
            {description && <p className="text-xs text-secondary mb-2">{description}</p>}
            <input
              type="text"
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus"
            />
          </div>
        );
        
      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </label>
            {description && <p className="text-xs text-secondary mb-2">{description}</p>}
            <input
              type={type === "email" ? "email" : "text"}
              value={value}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus"
            />
          </div>
        );
    }
  };

  const renderSettingsSection = (settings, category, title) => {
    if (!Array.isArray(settings) || settings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-secondary">No {title.toLowerCase()} available</p>
          <p className="text-tertiary text-sm mt-2">
            {category === "preferences" ? "User preferences will appear here when available" : "Settings will appear here when available"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={() => window.open(`/api/settings/export`, '_blank')}
            className="bg-primary hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Export Settings
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settings.map((setting, index) => (
            <motion.div
              key={setting?.key || `setting-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              {renderSettingField(setting, category)}
              {setting?.key && saving[setting.key] && (
                <div className="mt-2 text-xs text-indigo-400">Saving...</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderSystemSettings = () => {
    if (!Array.isArray(systemSettings) || systemSettings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-secondary">No system settings available</p>
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
        <p className="text-secondary mt-1">Manage system configuration and user preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 card p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-secondary hover:text-white hover:bg-tertiary"
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
          <>
            <div className="card">
              {renderSettingsSection(security, "security", "Security Settings")}
            </div>
            
            {/* Change Password Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">🔐 Change Password</h2>
                <p className="text-sm text-secondary mt-1">Update your password to keep your account secure</p>
              </div>
              <div className="card-content">
                <button
                  onClick={openPasswordModal}
                  className="btn-primary px-6 py-2 rounded-lg hover:opacity-90 transition-all"
                >
                  Change Password
                </button>
                <p className="text-xs text-tertiary mt-2">
                  Your password expires every 90 days. Choose a strong password you haven't used before.
                </p>
              </div>
            </div>
          </>
        )}
        
        {activeTab === "maintenance" && (
          <>
            <div className="card">
              {renderSettingsSection(maintenance, "maintenance", "Maintenance & Backup")}
            </div>
          </>
        )}
      </div>
      
      {/* MFA Setup Modal */}
      {showMFAModal && mfaData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-4">🔐 Enable Two-Factor Authentication</h2>
            
            <div className="space-y-4">
              {/* Step 1: Scan QR Code */}
              <div>
                <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-secondary mb-3">
                  Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code:
                </p>
                <div className="bg-white p-4 rounded-lg flex justify-center">
                  <img src={mfaData.qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              </div>
              
              {/* Manual Entry */}
              <div>
                <p className="text-sm text-secondary mb-1">Or enter this secret key manually:</p>
                <div className="bg-neutral-900 p-3 rounded font-mono text-sm break-all">
                  {mfaData.secret}
                </div>
              </div>
              
              {/* Step 2: Enter Code */}
              <div>
                <h3 className="font-semibold mb-2">Step 2: Enter Verification Code</h3>
                <p className="text-sm text-secondary mb-3">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <input
                  type="text"
                  maxLength="6"
                  value={mfaVerificationCode}
                  onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
                {mfaError && (
                  <p className="text-red-500 text-sm mt-2">{mfaError}</p>
                )}
              </div>
              
              {/* Backup Codes */}
              {mfaData.backupCodes && mfaData.backupCodes.length > 0 && (
                <div className="border border-yellow-600 bg-yellow-900 bg-opacity-20 p-3 rounded">
                  <h3 className="font-semibold text-yellow-500 mb-2">⚠️ Save These Backup Codes</h3>
                  <p className="text-sm text-secondary mb-2">
                    Store these codes in a safe place. You can use them to access your account if you lose your authenticator:
                  </p>
                  <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-3 rounded font-mono text-sm">
                    {mfaData.backupCodes.map((code, index) => (
                      <div key={index} className="text-center">{code}</div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={closeMFAModal}
                  disabled={mfaVerifying}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyMFACode}
                  disabled={mfaVerifying || mfaVerificationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaVerifying ? 'Verifying...' : 'Enable MFA'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-4">🔐 Change Password</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Enter your current password"
                  required
                />
              </div>
              
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Enter your new password (min 8 characters)"
                  required
                  minLength="8"
                />
                <p className="text-xs text-tertiary mt-1">
                  Must be at least 8 characters. Cannot reuse your last 5 passwords.
                </p>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder="Re-enter your new password"
                  required
                />
              </div>
              
              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-900 bg-opacity-20 border border-red-600 p-3 rounded">
                  <p className="text-red-500 text-sm">{passwordError}</p>
                </div>
              )}
              
              {/* Success Message */}
              {passwordSuccess && (
                <div className="bg-green-900 bg-opacity-20 border border-green-600 p-3 rounded">
                  <p className="text-green-500 text-sm">✅ Password changed successfully!</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors"
                  disabled={passwordSuccess}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={passwordSuccess}
                >
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
