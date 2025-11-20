import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';
import { useUserRole, hasFullAccess } from '../hooks/useUserRole.js';

// CleanupButton component COMPLETELY REMOVED
// This component was causing accidental data deletion and has been permanently removed

export default function Settings() {
  const { t, i18n } = useTranslation();
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
  const [loading, setLoading] = useState(false);
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
  
  // Trusted Devices State
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Department Management State
  const { userRole } = useUserRole();
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(null);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentEmployeeCounts, setDepartmentEmployeeCounts] = useState({});

  // Leave Policies Management State
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState({
    name: '',
    description: '',
    default_annual_entitlement: 0,
    is_paid: true,
    requires_approval: true,
    color: '#3B82F6'
  });
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [addingLeaveType, setAddingLeaveType] = useState(false);
  const [deletingLeaveType, setDeletingLeaveType] = useState(null);
  const [leaveTypeError, setLeaveTypeError] = useState('');
  const [leaveTypeUsageCounts, setLeaveTypeUsageCounts] = useState({});

  // Holidays Management State
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    description: '',
    is_company_closure: true
  });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [holidayError, setHolidayError] = useState('');

  const tabs = [
    { id: "system", name: t('settings.system'), icon: "⚙️" },
    { id: "preferences", name: t('settings.preferences'), icon: "👤" },
    { id: "notifications", name: t('settings.notifications'), icon: "🔔" },
    { id: "security", name: t('settings.security'), icon: "🔒" },
    { id: "maintenance", name: t('settings.maintenance'), icon: "🛠️" }
  ];

  // Track if component is mounted (avoid double-loading on first render)
  const isInitialMount = React.useRef(true);

  // Mapping of setting keys to their options arrays (for select-type settings)
  // This ensures select dropdowns always have their options, even when loaded from database
  const SETTING_OPTIONS = {
    // User Preferences
    theme: ["dark", "light"],
    language: ["en", "es", "fr"],
    timezone: ["UTC", "EST", "PST", "CST", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
    
    // Security
    password_requirements: ["weak", "medium", "strong"],
    session_timeout: ["30", "60", "120", "240", "480"], // minutes
    
    // Maintenance
    backup_frequency: ["daily", "weekly", "monthly"],
    
    // System (if any select types exist)
    date_format: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    currency: ["USD", "EUR", "GBP", "CAD", "AUD"],
    
    // Notifications
    notification_frequency: ["immediate", "daily", "weekly"],
    alert_types: ["all", "critical", "important", "normal"]
  };

  useEffect(() => {
    console.log('🎬 [Settings] useEffect #1 triggered - calling loadSettings()');
    loadSettings();
    if (activeTab === 'system') {
      loadDepartments();
      loadLeaveTypes();
      loadHolidays();
    }
    isInitialMount.current = false; // Mark that initial load is complete
  }, []);

  // Load data when system tab is active
  useEffect(() => {
    if (activeTab === 'system') {
      loadDepartments();
      loadLeaveTypes();
      loadHolidays();
    }
  }, [activeTab]);

  // Reload settings when user navigates back to settings (but not on initial mount)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only reload if document was hidden and is now visible AND not initial mount
      if (!document.hidden && !isInitialMount.current) {
        console.log('👁️ [Settings] Tab became visible (useEffect #2), reloading settings...');
        loadSettings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load local settings after initial settings are loaded
  useEffect(() => {
    console.log('🎬 [Settings] useEffect #3 triggered - userPreferences.length:', userPreferences.length);
    if (userPreferences.length > 0) {
      console.log('✅ [Settings] Calling loadLocalSettings()');
      loadLocalSettings();
    }
  }, [userPreferences.length]);

  // Helper function to enrich settings with options from SETTING_OPTIONS mapping
  // This ensures select-type settings always have their options array, even when loaded from database
  // Also forces correct types for known select fields (like theme) that might come from DB as 'text'
  const enrichSettingsWithOptions = (settings) => {
    if (!Array.isArray(settings)) return settings;
    
    // Mapping of setting keys that MUST be select type, regardless of what DB says
    const FORCE_SELECT_TYPES = {
      theme: true,
      language: true,
      timezone: true,
      password_requirements: true,
      backup_frequency: true,
      date_format: true,
      currency: true,
      notification_frequency: true,
      alert_types: true
    };
    
    return settings.map(setting => {
      // Determine the correct type (force to select if needed)
      const correctType = (FORCE_SELECT_TYPES[setting.key] && setting.type !== 'select') 
        ? 'select' 
        : setting.type;
      
      // Log if we're forcing the type
      if (correctType !== setting.type) {
        console.warn(`⚠️ [Settings] Forcing type to 'select' for "${setting.key}" (was "${setting.type}")`);
      }
      
      // If it's a select type and we have options for it, add them
      if (correctType === 'select' && SETTING_OPTIONS[setting.key]) {
        return {
          ...setting,
          type: correctType,
          options: SETTING_OPTIONS[setting.key]
        };
      }
      
      // If it's a select type but no options mapping exists
      if (correctType === 'select' && !setting.options) {
        return {
          ...setting,
          type: correctType,
          options: SETTING_OPTIONS[setting.key] || []
        };
      }
      
      // For non-select types, just ensure type is correct
      if (correctType !== setting.type) {
        return {
          ...setting,
          type: correctType
        };
      }
      
      // Return unchanged if nothing needs updating
      return setting;
    });
  };

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
    // Save to localStorage for persistence
    localStorage.setItem('user_language', language);
    // Change language in i18n immediately (no reload needed)
    i18n.changeLanguage(language);
    console.log(`✅ Language changed to: ${language}`);
  };

  const applyTimezone = (timezone) => {
    // Store timezone for use in date formatting
    localStorage.setItem('user_timezone', timezone);
    console.log(`Timezone changed to: ${timezone}`);
    // In a real app, you might update all date displays
  };

  const loadSettings = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [Settings] loadSettings() called');
    console.log('📊 [Settings] Current loading state:', loading);
    console.log('📊 [Settings] Current userPreferences:', userPreferences.length);
    console.log('📊 [Settings] Current security:', security.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Prevent concurrent loads
    if (loading) {
      console.log('⏳ [Settings] Already loading, skipping duplicate request...');
      console.log('⚠️ [Settings] THIS IS THE PROBLEM - loading is stuck at true!');
      return;
    }
    
    console.log('✅ [Settings] Starting to load settings...');
    setLoading(true);
    console.log('✅ [Settings] Loading state set to TRUE');
    
    try {
      // Clean up any MFA status from localStorage (it should ONLY come from server)
      localStorage.removeItem('security_two_factor_auth');
      
      // Always try to load system settings (no auth required)
      const system = await API("/api/settings/system").catch(() => []);
      setSystemSettings(enrichSettingsWithOptions(system || []));

      // Detect current theme from DOM
      const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      
      // Default settings (used as fallback only)
      const defaultPreferences = [
        { key: "theme", label: "Theme", type: "select", value: currentTheme, options: ["dark", "light"] },
        { key: "language", label: "Language", type: "select", value: "en", options: ["en", "es", "fr"] },
        { key: "timezone", label: "Timezone", type: "select", value: "UTC", options: ["UTC", "EST", "PST", "CST"] }
      ];

      const defaultNotifications = [
        { key: "email_notifications", label: "Email Notifications", type: "boolean", value: "true" },
        { key: "push_notifications", label: "Push Notifications", type: "boolean", value: "false" }
      ];

      const defaultSecurity = [
        { key: "two_factor_auth", label: "Two-Factor Authentication", type: "boolean", value: "false" },
        { key: "session_timeout", label: "Session Timeout (minutes)", type: "number", value: "120" },
        { key: "password_requirements", label: "Password Requirements", type: "select", value: "strong", options: ["weak", "medium", "strong"] }
      ];

      const defaultMaintenance = [
        { key: "auto_backup", label: "Automatic Backup", type: "boolean", value: "true" },
        { key: "backup_frequency", label: "Backup Frequency", type: "select", value: "daily", options: ["daily", "weekly", "monthly"] }
      ];

      // Check if user is authenticated before trying authenticated endpoints
      const sessionId = localStorage.getItem('sessionId');
      
      let preferences, notifs, sec, maint;
      
      if (!sessionId) {
        console.log('⚠️ [Settings] No session found, using default settings only');
        preferences = defaultPreferences;
        notifs = defaultNotifications;
        sec = defaultSecurity;
        maint = defaultMaintenance;
      } else {
        // Try to load authenticated settings - if API returns 401, it will fall back to defaults
        console.log('📡 [Settings] Attempting to load authenticated settings from API...');
        [preferences, notifs, sec, maint] = await Promise.all([
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
      }
      
      console.log('✅ [Settings] Security settings loaded:', sec);
      console.log('🔐 [Settings] MFA toggle value:', sec?.find(s => s.key === 'two_factor_auth')?.value);
      
      // Enrich all settings with options before setting state
      // This ensures select dropdowns always have their options, even when loaded from database
      const enrichedPreferences = enrichSettingsWithOptions(preferences || defaultPreferences);
      const enrichedNotifications = enrichSettingsWithOptions(notifs || defaultNotifications);
      const enrichedSecurity = enrichSettingsWithOptions(sec || defaultSecurity);
      const enrichedMaintenance = enrichSettingsWithOptions(maint || defaultMaintenance);
      
      // Debug logging to verify options are present
      console.log('🔍 [Debug] Enriched preferences:', enrichedPreferences);
      enrichedPreferences.forEach(s => {
        if (s.type === 'select') {
          console.log(`  - ${s.key}: type=${s.type}, options=${s.options?.length || 0}`, s.options);
        }
      });
      
      console.log('🔍 [Debug] Enriched maintenance:', enrichedMaintenance);
      enrichedMaintenance.forEach(s => {
        if (s.type === 'select') {
          console.log(`  - ${s.key}: type=${s.type}, options=${s.options?.length || 0}`, s.options);
        }
      });
      
      // Set all settings regardless of whether they came from API or defaults
      console.log('✅ [Settings] Setting state with preferences:', enrichedPreferences?.length);
      console.log('✅ [Settings] Setting state with security:', enrichedSecurity?.length);
      setUserPreferences(enrichedPreferences);
      setNotifications(enrichedNotifications);
      setSecurity(enrichedSecurity);
      setMaintenance(enrichedMaintenance);
      console.log('✅ [Settings] All settings state updated successfully');
    } catch (error) {
      console.error("❌ [Settings] Error loading settings:", error);
      // Set default settings to prevent empty arrays
      setSystemSettings([]);
      // Detect current theme from DOM for error fallback
      const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      const errorFallbackPreferences = [
        { key: "theme", label: "Theme", type: "select", value: currentTheme, options: ["dark", "light"] },
        { key: "language", label: "Language", type: "select", value: "en", options: ["en", "es", "fr"] },
        { key: "timezone", label: "Timezone", type: "select", value: "UTC", options: ["UTC", "EST", "PST", "CST"] },
        { key: "dashboard_layout", label: "Dashboard Layout", type: "select", value: "grid", options: ["grid", "list"] }
      ];
      const errorFallbackNotifications = [
        { key: "email_notifications", label: "Email Notifications", type: "boolean", value: "true" },
        { key: "push_notifications", label: "Push Notifications", type: "boolean", value: "false" },
        { key: "sms_notifications", label: "SMS Notifications", type: "boolean", value: "false" }
      ];
      const errorFallbackSecurity = [
        { key: "two_factor_auth", label: "Two-Factor Authentication", type: "boolean", value: "false" },
        { key: "session_timeout", label: "Session Timeout (minutes)", type: "number", value: "120" },
        { key: "password_requirements", label: "Password Requirements", type: "select", value: "strong", options: ["weak", "medium", "strong"] }
      ];
      const errorFallbackMaintenance = [
        { key: "auto_backup", label: "Automatic Backup", type: "boolean", value: "true" },
        { key: "backup_frequency", label: "Backup Frequency", type: "select", value: "daily", options: ["daily", "weekly", "monthly"] },
        { key: "maintenance_mode", label: "Maintenance Mode", type: "boolean", value: "false" }
      ];
      // Enrich error fallback settings with options (though they should already have them)
      setUserPreferences(enrichSettingsWithOptions(errorFallbackPreferences));
      setNotifications(enrichSettingsWithOptions(errorFallbackNotifications));
      setSecurity(enrichSettingsWithOptions(errorFallbackSecurity));
      setMaintenance(enrichSettingsWithOptions(errorFallbackMaintenance));
    } finally {
      console.log('🏁 [Settings] Finally block reached - setting loading to FALSE');
      setLoading(false);
      console.log('🏁 [Settings] Loading state set to FALSE');
    }
  };

  // Load departments and employee counts
  const loadDepartments = async () => {
    try {
      const depts = await API("/api/employees/departments").catch(() => []);
      setDepartments(depts || []);

      // Load all employees and count by department
      try {
        const employees = await API("/api/employees").catch(() => []);
        const counts = {};
        (depts || []).forEach(dept => {
          counts[dept.id] = 0;
        });
        (employees || []).forEach(emp => {
          // Employees API returns e.* which includes department_id
          const deptId = emp.department_id;
          if (deptId && counts[deptId] !== undefined) {
            counts[deptId] = (counts[deptId] || 0) + 1;
          }
        });
        setDepartmentEmployeeCounts(counts);
      } catch (err) {
        console.error("Error loading employee counts:", err);
        // Set all counts to 0 if we can't fetch employees
        const counts = {};
        (depts || []).forEach(dept => {
          counts[dept.id] = 0;
        });
        setDepartmentEmployeeCounts(counts);
      }
    } catch (error) {
      console.error("Error loading departments:", error);
      setDepartments([]);
    }
  };

  // Add new department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) {
      setDepartmentError(t('settings.departments.nameRequired'));
      return;
    }

    setAddingDepartment(true);
    setDepartmentError('');

    try {
      const result = await API("/api/employees/departments", {
        method: "POST",
        body: JSON.stringify({ name: newDepartmentName.trim() })
      });

      setNewDepartmentName('');
      await loadDepartments();
    } catch (error) {
      console.error("Error adding department:", error);
      setDepartmentError(error.message || t('settings.departments.addError'));
    } finally {
      setAddingDepartment(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (id) => {
    if (!window.confirm(t('settings.departments.confirmDelete'))) {
      return;
    }

    setDeletingDepartment(id);

    try {
      await API(`/api/employees/departments/${id}`, {
        method: "DELETE"
      });

      await loadDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      const errorMsg = error.message || t('settings.departments.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingDepartment(null);
    }
  };

  // Load leave types and usage counts
  const loadLeaveTypes = async () => {
    try {
      const types = await API("/api/leave/types").catch(() => []);
      setLeaveTypes(types || []);

      // Load usage counts for each leave type
      try {
        const requests = await API("/api/leave/requests").catch(() => []);
        const counts = {};
        (types || []).forEach(type => {
          counts[type.id] = 0;
        });
        (requests || []).forEach(req => {
          const typeId = req.leave_type_id;
          if (typeId && counts[typeId] !== undefined) {
            counts[typeId] = (counts[typeId] || 0) + 1;
          }
        });
        setLeaveTypeUsageCounts(counts);
      } catch (err) {
        console.error("Error loading leave type usage counts:", err);
        const counts = {};
        (types || []).forEach(type => {
          counts[type.id] = 0;
        });
        setLeaveTypeUsageCounts(counts);
      }
    } catch (error) {
      console.error("Error loading leave types:", error);
      setLeaveTypes([]);
    }
  };

  // Add new leave type
  const handleAddLeaveType = async (e) => {
    e.preventDefault();
    if (!newLeaveType.name.trim()) {
      setLeaveTypeError(t('settings.leavePolicies.nameRequired'));
      return;
    }

    setAddingLeaveType(true);
    setLeaveTypeError('');

    try {
      await API("/api/leave/types", {
        method: "POST",
        body: JSON.stringify(newLeaveType)
      });

      setNewLeaveType({
        name: '',
        description: '',
        default_annual_entitlement: 0,
        is_paid: true,
        requires_approval: true,
        color: '#3B82F6'
      });
      await loadLeaveTypes();
    } catch (error) {
      console.error("Error adding leave type:", error);
      setLeaveTypeError(error.message || t('settings.leavePolicies.addError'));
    } finally {
      setAddingLeaveType(false);
    }
  };

  // Update leave type
  const handleUpdateLeaveType = async (id) => {
    const leaveType = leaveTypes.find(lt => lt.id === id);
    if (!leaveType) return;

    if (!leaveType.name || !leaveType.name.trim()) {
      setLeaveTypeError(t('settings.leavePolicies.nameRequired'));
      return;
    }

    setAddingLeaveType(true);
    setLeaveTypeError('');

    try {
      await API(`/api/leave/types/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: leaveType.name.trim(),
          description: leaveType.description || null,
          default_annual_entitlement: leaveType.default_annual_entitlement || 0,
          is_paid: leaveType.is_paid !== false,
          requires_approval: leaveType.requires_approval !== false,
          color: leaveType.color || '#3B82F6'
        })
      });

      setEditingLeaveType(null);
      await loadLeaveTypes();
    } catch (error) {
      console.error("Error updating leave type:", error);
      setLeaveTypeError(error.message || t('settings.leavePolicies.updateError'));
    } finally {
      setAddingLeaveType(false);
    }
  };

  // Delete leave type
  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm(t('settings.leavePolicies.confirmDelete'))) {
      return;
    }

    setDeletingLeaveType(id);

    try {
      await API(`/api/leave/types/${id}`, {
        method: "DELETE"
      });

      await loadLeaveTypes();
    } catch (error) {
      console.error("Error deleting leave type:", error);
      const errorMsg = error.message || t('settings.leavePolicies.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingLeaveType(null);
    }
  };

  // Load holidays
  const loadHolidays = async () => {
    try {
      const hols = await API("/api/leave/holidays").catch(() => []);
      setHolidays(hols || []);
    } catch (error) {
      console.error("Error loading holidays:", error);
      setHolidays([]);
    }
  };

  // Add new holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.description.trim()) {
      setHolidayError(t('settings.holidays.dateAndDescriptionRequired'));
      return;
    }

    setAddingHoliday(true);
    setHolidayError('');

    try {
      await API("/api/leave/holidays", {
        method: "POST",
        body: JSON.stringify(newHoliday)
      });

      setNewHoliday({
        date: '',
        description: '',
        is_company_closure: true
      });
      await loadHolidays();
    } catch (error) {
      console.error("Error adding holiday:", error);
      setHolidayError(error.message || t('settings.holidays.addError'));
    } finally {
      setAddingHoliday(false);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async (id) => {
    if (!window.confirm(t('settings.holidays.confirmDelete'))) {
      return;
    }

    setDeletingHoliday(id);

    try {
      await API(`/api/leave/holidays/${id}`, {
        method: "DELETE"
      });

      await loadHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      const errorMsg = error.message || t('settings.holidays.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingHoliday(null);
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
        if (!confirm(t('settings.confirmations.disableMFAWarning'))) {
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
      alert(t('settings.mfaSetup.failed') + ': ' + error.message);
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
        
        alert(t('settings.mfaSetup.success'));
        
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
  
  // Load Trusted Devices
  const loadTrustedDevices = async () => {
    setLoadingDevices(true);
    try {
      const devices = await API('/api/trusted-devices');
      setTrustedDevices(devices);
      console.log('✅ Loaded trusted devices:', devices);
    } catch (error) {
      console.error('❌ Failed to load trusted devices:', error);
      setTrustedDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };
  
  // Revoke a specific device
  const revokeDevice = async (deviceId) => {
    if (!confirm(t('settings.confirmations.revokeDeviceWarning'))) {
      return;
    }
    
    try {
      await API(`/api/trusted-devices/${deviceId}`, { method: 'DELETE' });
      alert(t('settings.deviceRevokedSuccess'));
      loadTrustedDevices(); // Reload list
    } catch (error) {
      console.error('❌ Failed to revoke device:', error);
      alert(t('settings.failedToRevokeDevice') + ': ' + error.message);
    }
  };
  
  // Revoke all devices
  const revokeAllDevices = async () => {
    if (!confirm(t('settings.confirmations.revokeAllDevicesWarning'))) {
      return;
    }
    
    try {
      const response = await API('/api/trusted-devices/revoke-all', { method: 'POST' });
      alert(`✅ ${response.message || t('settings.allDevicesRevokedSuccess')}`);
      loadTrustedDevices(); // Reload list
    } catch (error) {
      console.error('❌ Failed to revoke all devices:', error);
      alert(t('settings.failedToRevokeDevices') + ': ' + error.message);
    }
  };
  
  // Load trusted devices when security tab is opened
  useEffect(() => {
    if (activeTab === 'security') {
      loadTrustedDevices();
    }
  }, [activeTab]);
  
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

  // Translation mapping for setting keys
  const getSettingLabel = (key) => {
    const translationKey = `settings.fields.${key}`;
    const translated = t(translationKey);
    // If translation doesn't exist, fall back to formatted key
    return translated !== translationKey ? translated : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Translation mapping for setting descriptions
  const getSettingDescription = (key) => {
    const translationKey = `settings.descriptions.${key}`;
    const translated = t(translationKey);
    // If translation doesn't exist, return empty string (don't show untranslated text)
    return translated !== translationKey ? translated : '';
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
              <label className="text-sm font-medium">{getSettingLabel(key)}</label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mt-1">{getSettingDescription(key)}</p>}
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-xs font-medium ${boolValue ? 'text-green-600' : 'text-red-600'}`}>
                {boolValue ? t('common.on') : t('common.off')}
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
        // Ensure we always have options for select fields
        // First try the setting's options, then check SETTING_OPTIONS mapping, then fallback to empty array
        let optionList = [];
        if (Array.isArray(options) && options.length > 0) {
          optionList = options;
        } else if (typeof options === 'string' && options.length > 0) {
          optionList = options.split(',');
        } else if (SETTING_OPTIONS[key] && Array.isArray(SETTING_OPTIONS[key])) {
          // Fallback to SETTING_OPTIONS mapping if options are missing
          optionList = SETTING_OPTIONS[key];
          console.warn(`⚠️ [Settings] Select field "${key}" missing options, using SETTING_OPTIONS mapping`);
        } else {
          console.error(`❌ [Settings] Select field "${key}" has no options available!`);
          optionList = [];
        }
        
        // If still no options, render a disabled select with a warning
        if (optionList.length === 0) {
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {description && <p className="text-xs text-secondary mb-2">{description}</p>}
              <select
                value={value || ''}
                disabled={true}
                className="w-full px-3 py-2 card border border-red-500 rounded-lg opacity-50 cursor-not-allowed"
              >
                <option value="">{t('settings.noOptionsAvailable')}</option>
              </select>
              <p className="text-xs text-red-500 mt-1">{t('settings.noOptionsWarning')}</p>
            </div>
          );
        }
        
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {getSettingLabel(key)}
            </label>
            {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
            <select
              value={value || ''}
              onChange={(e) => handleSettingUpdate(category, key, e.target.value)}
              disabled={saving[key]}
              className="w-full px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {optionList.map(option => {
                // Try to translate the option value
                const translationKey = `settings.${option}`;
                const translated = t(translationKey);
                const displayValue = translated !== translationKey ? translated : option.charAt(0).toUpperCase() + option.slice(1);
                return (
                <option key={option} value={option}>
                    {displayValue}
                </option>
                );
              })}
            </select>
          </div>
        );
        
      case "number":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {getSettingLabel(key)}
            </label>
            {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
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
              {getSettingLabel(key)}
            </label>
            {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
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
          <p className="text-secondary">{t('settings.noSettingsAvailable')}</p>
          <p className="text-tertiary text-sm mt-2">
            {t('settings.settingsWillAppearHere')}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        
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
                <div className="mt-2 text-xs text-indigo-400">{t('settings.saving')}</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderSystemSettings = () => {
    const canManage = hasFullAccess(userRole);
    
    // Show management sections if no system settings exist
    if (!Array.isArray(systemSettings) || systemSettings.length === 0) {
      return (
        <div className="space-y-8">
          {/* Departments Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">{t('settings.departments.title')}</h3>
              <p className="text-sm text-secondary mb-6">{t('settings.departments.description')}</p>
            </div>

            {/* Add Department Form (Manager/Admin only) */}
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{t('settings.departments.addNew')}</h4>
                <form onSubmit={handleAddDepartment} className="flex gap-3">
                  <input
                    type="text"
                    value={newDepartmentName}
                    onChange={(e) => {
                      setNewDepartmentName(e.target.value);
                      setDepartmentError('');
                    }}
                    placeholder={t('settings.departments.namePlaceholder')}
                    className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    disabled={addingDepartment || !newDepartmentName.trim()}
                    className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingDepartment ? t('settings.departments.adding') : t('settings.departments.add')}
                  </button>
                </form>
                {departmentError && (
                  <p className="mt-2 text-sm text-red-400">{departmentError}</p>
                )}
              </div>
            )}

            {/* Departments List */}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.departments.list')}</h4>
              {departments.length === 0 ? (
                <p className="text-secondary">{t('settings.departments.noDepartments')}</p>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept) => (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white">{dept.name}</div>
                        {departmentEmployeeCounts[dept.id] !== undefined && (
                          <div className="text-sm text-secondary mt-1">
                            {departmentEmployeeCounts[dept.id] === 0
                              ? t('settings.departments.noEmployees')
                              : t('settings.departments.employeeCount', { count: departmentEmployeeCounts[dept.id] })}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          disabled={deletingDepartment === dept.id || (departmentEmployeeCounts[dept.id] || 0) > 0}
                          className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          title={
                            (departmentEmployeeCounts[dept.id] || 0) > 0
                              ? t('settings.departments.cannotDelete')
                              : t('settings.departments.delete')
                          }
                        >
                          {deletingDepartment === dept.id ? t('settings.departments.deleting') : t('settings.departments.delete')}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leave Policies Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">{t('settings.leavePolicies.title')}</h3>
              <p className="text-sm text-secondary mb-6">{t('settings.leavePolicies.description')}</p>
            </div>

            {/* Add Leave Type Form (Manager/Admin only) */}
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {editingLeaveType ? t('settings.leavePolicies.edit') : t('settings.leavePolicies.addNew')}
                </h4>
                <form onSubmit={editingLeaveType ? (e) => { e.preventDefault(); handleUpdateLeaveType(editingLeaveType); } : handleAddLeaveType} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.name')} *</label>
                      <input
                        type="text"
                        value={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.name || '' : newLeaveType.name}
                        onChange={(e) => {
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, name: e.target.value } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, name: e.target.value});
                          }
                          setLeaveTypeError('');
                        }}
                        placeholder={t('settings.leavePolicies.namePlaceholder')}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        maxLength={100}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.annualEntitlement')} *</label>
                      <input
                        type="number"
                        min="0"
                        value={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.default_annual_entitlement || 0 : newLeaveType.default_annual_entitlement}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, default_annual_entitlement: val } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, default_annual_entitlement: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.description')}</label>
                    <textarea
                      value={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.description || '' : newLeaveType.description}
                      onChange={(e) => {
                        if (editingLeaveType) {
                          setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, description: e.target.value } : lt));
                        } else {
                          setNewLeaveType({...newLeaveType, description: e.target.value});
                        }
                      }}
                      placeholder={t('settings.leavePolicies.descriptionPlaceholder')}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      rows="2"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_paid"
                        checked={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.is_paid !== false : newLeaveType.is_paid}
                        onChange={(e) => {
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, is_paid: e.target.checked } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, is_paid: e.target.checked});
                          }
                        }}
                        className="mr-2"
                      />
                      <label htmlFor="is_paid" className="text-sm">{t('settings.leavePolicies.isPaid')}</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requires_approval"
                        checked={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.requires_approval !== false : newLeaveType.requires_approval}
                        onChange={(e) => {
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, requires_approval: e.target.checked } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, requires_approval: e.target.checked});
                          }
                        }}
                        className="mr-2"
                      />
                      <label htmlFor="requires_approval" className="text-sm">{t('settings.leavePolicies.requiresApproval')}</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.color')}</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.color || '#3B82F6' : newLeaveType.color}
                          onChange={(e) => {
                            if (editingLeaveType) {
                              setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, color: e.target.value } : lt));
                            } else {
                              setNewLeaveType({...newLeaveType, color: e.target.value});
                            }
                          }}
                          className="h-10 w-20 rounded border border-neutral-700"
                        />
                        <input
                          type="text"
                          value={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.color || '#3B82F6' : newLeaveType.color}
                          onChange={(e) => {
                            if (editingLeaveType) {
                              setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, color: e.target.value } : lt));
                            } else {
                              setNewLeaveType({...newLeaveType, color: e.target.value});
                            }
                          }}
                          placeholder="#3B82F6"
                          className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addingLeaveType}
                      className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingLeaveType ? t('settings.leavePolicies.saving') : (editingLeaveType ? t('settings.leavePolicies.update') : t('settings.leavePolicies.add'))}
                    </button>
                    {editingLeaveType && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLeaveType(null);
                          setLeaveTypeError('');
                        }}
                        className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white"
                      >
                        {t('settings.leavePolicies.cancel')}
                      </button>
                    )}
                  </div>
                </form>
                {leaveTypeError && (
                  <p className="mt-2 text-sm text-red-400">{leaveTypeError}</p>
                )}
              </div>
            )}

            {/* Leave Types List */}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.leavePolicies.list')}</h4>
              {leaveTypes.length === 0 ? (
                <p className="text-secondary">{t('settings.leavePolicies.noLeaveTypes')}</p>
              ) : (
                <div className="space-y-3">
                  {leaveTypes.map((lt) => (
                    <motion.div
                      key={lt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: lt.color || '#3B82F6' }}
                          />
                          <div>
                            <div className="font-medium text-white">{lt.name}</div>
                            {lt.description && (
                              <div className="text-sm text-secondary mt-1">{lt.description}</div>
                            )}
                            <div className="text-xs text-secondary mt-1">
                              {lt.default_annual_entitlement} {t('settings.leavePolicies.daysPerYear')} • 
                              {lt.is_paid ? ` ${t('settings.leavePolicies.paid')}` : ` ${t('settings.leavePolicies.unpaid')}`} • 
                              {lt.requires_approval ? ` ${t('settings.leavePolicies.approvalRequired')}` : ` ${t('settings.leavePolicies.noApproval')}`}
                            </div>
                            {leaveTypeUsageCounts[lt.id] !== undefined && leaveTypeUsageCounts[lt.id] > 0 && (
                              <div className="text-xs text-yellow-400 mt-1">
                                {t('settings.leavePolicies.inUse', { count: leaveTypeUsageCounts[lt.id] })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingLeaveType(lt.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            {t('settings.leavePolicies.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteLeaveType(lt.id)}
                            disabled={deletingLeaveType === lt.id || (leaveTypeUsageCounts[lt.id] || 0) > 0}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            title={
                              (leaveTypeUsageCounts[lt.id] || 0) > 0
                                ? t('settings.leavePolicies.cannotDelete')
                                : t('settings.leavePolicies.delete')
                            }
                          >
                            {deletingLeaveType === lt.id ? t('settings.leavePolicies.deleting') : t('settings.leavePolicies.delete')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Holidays Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">{t('settings.holidays.title')}</h3>
              <p className="text-sm text-secondary mb-6">{t('settings.holidays.description')}</p>
            </div>

            {/* Add Holiday Form (Manager/Admin only) */}
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{t('settings.holidays.addNew')}</h4>
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.holidays.date')} *</label>
                      <input
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) => {
                          setNewHoliday({...newHoliday, date: e.target.value});
                          setHolidayError('');
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.holidays.description')} *</label>
                      <input
                        type="text"
                        value={newHoliday.description}
                        onChange={(e) => {
                          setNewHoliday({...newHoliday, description: e.target.value});
                          setHolidayError('');
                        }}
                        placeholder={t('settings.holidays.descriptionPlaceholder')}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        maxLength={200}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_company_closure"
                      checked={newHoliday.is_company_closure}
                      onChange={(e) => setNewHoliday({...newHoliday, is_company_closure: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="is_company_closure" className="text-sm">{t('settings.holidays.companyClosure')}</label>
                  </div>
                  <button
                    type="submit"
                    disabled={addingHoliday || !newHoliday.date || !newHoliday.description.trim()}
                    className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingHoliday ? t('settings.holidays.adding') : t('settings.holidays.add')}
                  </button>
                </form>
                {holidayError && (
                  <p className="mt-2 text-sm text-red-400">{holidayError}</p>
                )}
              </div>
            )}

            {/* Holidays List */}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.holidays.list')}</h4>
              {holidays.length === 0 ? (
                <p className="text-secondary">{t('settings.holidays.noHolidays')}</p>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday) => {
                    const holidayDate = new Date(holiday.date);
                    const isUpcoming = holidayDate >= new Date();
                    return (
                      <motion.div
                        key={holiday.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between p-4 bg-neutral-800 rounded-lg border ${isUpcoming ? 'border-yellow-600' : 'border-neutral-700'}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{holiday.description}</div>
                          <div className="text-sm text-secondary mt-1">
                            {holidayDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {holiday.is_company_closure && ` • ${t('settings.holidays.companyClosure')}`}
                            {isUpcoming && ` • ${t('settings.holidays.upcoming')}`}
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            disabled={deletingHoliday === holiday.id}
                            className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          >
                            {deletingHoliday === holiday.id ? t('settings.holidays.deleting') : t('settings.holidays.delete')}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Show regular system settings if they exist
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
                    <div className="mt-2 text-xs text-indigo-400">{t('settings.saving')}</div>
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
        <div className="text-lg">{t('settings.loadingSettings')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-secondary mt-1">{t('settings.description')}</p>
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
            {renderSettingsSection(userPreferences, "preferences", t('settings.userPreferences'))}
          </div>
        )}
        
        {activeTab === "notifications" && (
          <div className="card">
            {renderSettingsSection(notifications, "notifications", t('settings.notificationSettings'))}
          </div>
        )}
        
        {activeTab === "security" && (
          <>
            <div className="card">
              {renderSettingsSection(security, "security", t('settings.securitySettings'))}
            </div>
            
            {/* Change Password Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">{t('settings.passwordChange.title')}</h2>
                <p className="text-sm text-secondary mt-1">{t('settings.passwordChange.updatePassword')}</p>
              </div>
              <div className="card-content">
                <button
                  onClick={openPasswordModal}
                  className="btn-primary px-6 py-2 rounded-lg hover:opacity-90 transition-all"
                >
                  {t('settings.changePassword')}
                </button>
                <p className="text-xs text-tertiary mt-2">
                  {t('settings.passwordChange.expiryNote')}
                </p>
              </div>
            </div>
            
            {/* Trusted Devices Section */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{t('settings.trustedDevicesInfo.title')}</h2>
                    <p className="text-sm text-secondary mt-1">{t('settings.trustedDevicesInfo.description')}</p>
                  </div>
                  {trustedDevices.length > 0 && (
                    <button
                      onClick={revokeAllDevices}
                      className="btn-danger px-4 py-2 rounded-lg hover:opacity-90 transition-all text-sm"
                    >
                      {t('settings.revokeAll')}
                    </button>
                  )}
                </div>
              </div>
              <div className="card-content">
                {loadingDevices ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <p className="text-sm text-secondary mt-2">{t('settings.trustedDevicesInfo.loading')}</p>
                  </div>
                ) : trustedDevices.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🔓</div>
            <p className="text-secondary">{t('settings.noTrustedDevices')}</p>
            <p className="text-xs text-tertiary mt-2">
              {t('settings.trustDeviceNote')}
            </p>
          </div>
                ) : (
                  <div className="space-y-3">
                    {trustedDevices.map((device) => (
                      <div 
                        key={device.id} 
                        className="flex items-start justify-between p-4 bg-neutral-900 bg-opacity-40 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">
                              {device.os === 'macOS' ? '🍎' :
                               device.os === 'Windows' ? '🪟' :
                               device.os === 'Linux' ? '🐧' :
                               device.os === 'Android' ? '🤖' :
                               device.os === 'iOS' ? '📱' : '💻'}
                            </span>
                            <h3 className="font-semibold">{device.label}</h3>
                          </div>
                          <div className="text-xs text-tertiary space-y-1">
                            <p>
                              <span className="inline-block w-20">{t('settings.trustedDevicesInfo.browser')}</span>
                              <span className="text-secondary">{device.browser || t('settings.trustedDevicesInfo.unknown')}</span>
                            </p>
                            <p>
                              <span className="inline-block w-20">{t('settings.trustedDevicesInfo.lastUsed')}</span>
                              <span className="text-secondary">
                                {device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : t('settings.trustedDevicesInfo.never')}
                              </span>
                            </p>
                            <p>
                              <span className="inline-block w-20">{t('settings.trustedDevicesInfo.expiresIn')}</span>
                              <span className={device.expiresIn?.includes('1 day') || device.expiresIn?.includes('Less') ? 'text-yellow-500' : 'text-secondary'}>
                                {device.expiresIn}
                              </span>
                            </p>
                            <p>
                              <span className="inline-block w-20">{t('settings.trustedDevicesInfo.ip')}</span>
                              <span className="text-secondary font-mono text-xs">
                                {device.ipLastUsed || device.ipCreated || t('settings.trustedDevicesInfo.unknown')}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => revokeDevice(device.id)}
                          className="ml-4 px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded transition-all"
                          title={t('settings.revoke')}
                        >
                          {t('settings.revoke')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {activeTab === "maintenance" && (
          <>
            <div className="card">
              {renderSettingsSection(maintenance, "maintenance", t('settings.maintenanceAndBackup'))}
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
            <h2 className="text-2xl font-bold mb-4">{t('settings.mfaSetup.title')}</h2>
            
            <div className="space-y-4">
              {/* Step 1: Scan QR Code */}
              <div>
                <h3 className="font-semibold mb-2">{t('settings.mfaSetup.step1')}</h3>
                <p className="text-sm text-secondary mb-3">
                  {t('settings.mfaSetup.step1Description')}
                </p>
                <div className="bg-white p-4 rounded-lg flex justify-center">
                  <img src={mfaData.qrCode} alt={t('settings.mfaSetup.qrCodeAlt')} className="w-48 h-48" />
                </div>
              </div>
              
              {/* Manual Entry */}
              <div>
                <p className="text-sm text-secondary mb-1">{t('settings.mfaSetup.orManualEntry')}</p>
                <div className="bg-neutral-900 p-3 rounded font-mono text-sm break-all">
                  {mfaData.secret}
                </div>
              </div>
              
              {/* Step 2: Enter Code */}
              <div>
                <h3 className="font-semibold mb-2">{t('settings.mfaSetup.step2')}</h3>
                <p className="text-sm text-secondary mb-3">
                  {t('settings.mfaSetup.step2Description')}
                </p>
                <input
                  type="text"
                  maxLength="6"
                  value={mfaVerificationCode}
                  onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('settings.mfaSetup.verificationCode')}
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
                  <h3 className="font-semibold text-yellow-500 mb-2">{t('settings.mfaSetup.saveBackupCodes')}</h3>
                  <p className="text-sm text-secondary mb-2">
                    {t('settings.mfaSetup.backupCodesDescription')}
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
                  {t('settings.cancel')}
                </button>
                <button
                  onClick={verifyMFACode}
                  disabled={mfaVerifying || mfaVerificationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaVerifying ? t('settings.mfaSetup.verifying') : t('settings.mfaSetup.enableMFA')}
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
            <h2 className="text-2xl font-bold mb-4">{t('settings.passwordChange.title')}</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.passwordChange.currentPassword')}</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder={t('settings.passwordChange.enterCurrentPassword')}
                  required
                />
              </div>
              
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.passwordChange.newPassword')}</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder={t('settings.passwordChange.enterNewPassword')}
                  required
                  minLength="8"
                />
                <p className="text-xs text-tertiary mt-1">
                  {t('settings.passwordChange.minLengthNote')}
                </p>
              </div>
              
              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.passwordChange.confirmPassword')}</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  placeholder={t('settings.passwordChange.reenterNewPassword')}
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
                  <p className="text-green-500 text-sm">{t('settings.passwordChange.passwordChangedSuccess')}</p>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={passwordSuccess}
                >
                  {t('settings.changePassword')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
