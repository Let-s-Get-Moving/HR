import React, { useState, useEffect, useRef } from "react";
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
    is_company_closure: true,
    applies_to_type: 'All',
    applies_to_id: null
  });
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [holidayError, setHolidayError] = useState('');

  // Modal State
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [showLeavePoliciesModal, setShowLeavePoliciesModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);
  const [showBenefitsPackagesModal, setShowBenefitsPackagesModal] = useState(false);
  const [showWorkSchedulesModal, setShowWorkSchedulesModal] = useState(false);
  const [showOvertimePoliciesModal, setShowOvertimePoliciesModal] = useState(false);
  const [showAttendancePoliciesModal, setShowAttendancePoliciesModal] = useState(false);
  const [showRemoteWorkPoliciesModal, setShowRemoteWorkPoliciesModal] = useState(false);

  // Job Titles State
  const [jobTitles, setJobTitles] = useState([]);
  const [newJobTitle, setNewJobTitle] = useState({
    name: '',
    description: '',
    department_id: null,
    level_grade: '',
    reports_to_id: null,
    min_salary: '',
    max_salary: ''
  });
  const [editingJobTitle, setEditingJobTitle] = useState(null);
  const [addingJobTitle, setAddingJobTitle] = useState(false);
  const [deletingJobTitle, setDeletingJobTitle] = useState(null);
  const [jobTitleError, setJobTitleError] = useState('');

  // Benefits Packages State
  const [benefitsPackages, setBenefitsPackages] = useState([]);
  const [newBenefitsPackage, setNewBenefitsPackage] = useState({
    name: '',
    description: '',
    benefit_types: [],
    coverage_level: 'Standard',
    employee_cost: 0,
    employer_cost: 0
  });
  const [editingBenefitsPackage, setEditingBenefitsPackage] = useState(null);
  const [addingBenefitsPackage, setAddingBenefitsPackage] = useState(false);
  const [deletingBenefitsPackage, setDeletingBenefitsPackage] = useState(null);
  const [benefitsPackageError, setBenefitsPackageError] = useState('');

  // Work Schedules State
  const [workSchedules, setWorkSchedules] = useState([]);
  const [newWorkSchedule, setNewWorkSchedule] = useState({
    name: '',
    description: '',
    start_time: '09:00',
    end_time: '17:00',
    days_of_week: [],
    break_duration_minutes: 60,
    flexible_hours: false,
    max_hours_per_week: 40
  });
  const [editingWorkSchedule, setEditingWorkSchedule] = useState(null);
  const [addingWorkSchedule, setAddingWorkSchedule] = useState(false);
  const [deletingWorkSchedule, setDeletingWorkSchedule] = useState(null);
  const [workScheduleError, setWorkScheduleError] = useState('');

  // Overtime Policies State
  const [overtimePolicies, setOvertimePolicies] = useState([]);
  const [newOvertimePolicy, setNewOvertimePolicy] = useState({
    name: '',
    description: '',
    weekly_threshold_hours: 40,
    daily_threshold_hours: 8,
    multiplier: 1.5,
    requires_approval: true,
    applies_to_type: 'All',
    applies_to_id: null
  });
  const [editingOvertimePolicy, setEditingOvertimePolicy] = useState(null);
  const [addingOvertimePolicy, setAddingOvertimePolicy] = useState(false);
  const [deletingOvertimePolicy, setDeletingOvertimePolicy] = useState(null);
  const [overtimePolicyError, setOvertimePolicyError] = useState('');

  // Attendance Policies State
  const [attendancePolicies, setAttendancePolicies] = useState([]);
  const [newAttendancePolicy, setNewAttendancePolicy] = useState({
    name: '',
    description: '',
    late_grace_period_minutes: 15,
    absence_limit_per_month: 3,
    tardiness_penalty_points: 1,
    absence_penalty_points: 3,
    point_threshold_termination: 10,
    applies_to_type: 'All',
    applies_to_id: null
  });
  const [editingAttendancePolicy, setEditingAttendancePolicy] = useState(null);
  const [addingAttendancePolicy, setAddingAttendancePolicy] = useState(false);
  const [deletingAttendancePolicy, setDeletingAttendancePolicy] = useState(null);
  const [attendancePolicyError, setAttendancePolicyError] = useState('');

  // Remote Work Policies State
  const [remoteWorkPolicies, setRemoteWorkPolicies] = useState([]);
  const [newRemoteWorkPolicy, setNewRemoteWorkPolicy] = useState({
    name: '',
    description: '',
    eligibility_type: 'All',
    eligibility_id: null,
    days_per_week_allowed: 5,
    requires_approval: true,
    equipment_provided: '',
    equipment_policy: ''
  });
  const [editingRemoteWorkPolicy, setEditingRemoteWorkPolicy] = useState(null);
  const [addingRemoteWorkPolicy, setAddingRemoteWorkPolicy] = useState(false);
  const [deletingRemoteWorkPolicy, setDeletingRemoteWorkPolicy] = useState(null);
  const [remoteWorkPolicyError, setRemoteWorkPolicyError] = useState('');

  const tabs = [
    { id: "system", name: t('settings.system'), icon: "⚙️" },
    { id: "preferences", name: t('settings.preferences'), icon: "👤" },
    { id: "notifications", name: t('settings.notifications'), icon: "🔔" },
    { id: "security", name: t('settings.security'), icon: "🔒" },
    { id: "maintenance", name: t('settings.maintenance'), icon: "🛠️" }
  ];

  // Track if component is mounted (avoid double-loading on first render)
  const isInitialMount = React.useRef(true);
  
  // Track which modals have loaded data in current session to prevent duplicates
  const loadedModalsRef = useRef(new Set());

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
    isInitialMount.current = false; // Mark that initial load is complete
  }, []);

  // Load data when modals are opened - track loaded modals to prevent duplicates
  useEffect(() => {
    if (showDepartmentsModal && !loadedModalsRef.current.has('departments')) {
      loadedModalsRef.current.add('departments');
      loadDepartments();
    }
    if (!showDepartmentsModal) {
      loadedModalsRef.current.delete('departments');
    }
  }, [showDepartmentsModal]);

  useEffect(() => {
    if (showLeavePoliciesModal && !loadedModalsRef.current.has('leavePolicies')) {
      loadedModalsRef.current.add('leavePolicies');
      loadLeaveTypes();
    }
    if (!showLeavePoliciesModal) {
      loadedModalsRef.current.delete('leavePolicies');
    }
  }, [showLeavePoliciesModal]);

  useEffect(() => {
    if (showHolidaysModal && !loadedModalsRef.current.has('holidays')) {
      loadedModalsRef.current.add('holidays');
      loadHolidays();
      loadDepartments();
      loadJobTitles();
      loadEmployees();
    }
    if (!showHolidaysModal) {
      loadedModalsRef.current.delete('holidays');
    }
  }, [showHolidaysModal]);
  
  const loadEmployees = async () => {
    try {
      const emps = await API("/api/employees").catch(() => []);
      setEmployees(emps || []);
    } catch (error) {
      console.error("Error loading employees:", error);
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (showJobTitlesModal && !loadedModalsRef.current.has('jobTitles')) {
      loadedModalsRef.current.add('jobTitles');
      loadJobTitles();
      loadDepartments();
    }
    if (!showJobTitlesModal) {
      loadedModalsRef.current.delete('jobTitles');
    }
  }, [showJobTitlesModal]);

  useEffect(() => {
    if (showBenefitsPackagesModal && !loadedModalsRef.current.has('benefitsPackages')) {
      loadedModalsRef.current.add('benefitsPackages');
      loadBenefitsPackages();
    }
    if (!showBenefitsPackagesModal) {
      loadedModalsRef.current.delete('benefitsPackages');
    }
  }, [showBenefitsPackagesModal]);

  useEffect(() => {
    if (showWorkSchedulesModal && !loadedModalsRef.current.has('workSchedules')) {
      loadedModalsRef.current.add('workSchedules');
      loadWorkSchedules();
    }
    if (!showWorkSchedulesModal) {
      loadedModalsRef.current.delete('workSchedules');
    }
  }, [showWorkSchedulesModal]);

  useEffect(() => {
    if (showOvertimePoliciesModal && !loadedModalsRef.current.has('overtimePolicies')) {
      loadedModalsRef.current.add('overtimePolicies');
      loadOvertimePolicies();
      loadDepartments();
      loadJobTitles();
    }
    if (!showOvertimePoliciesModal) {
      loadedModalsRef.current.delete('overtimePolicies');
    }
  }, [showOvertimePoliciesModal]);

  useEffect(() => {
    if (showAttendancePoliciesModal && !loadedModalsRef.current.has('attendancePolicies')) {
      loadedModalsRef.current.add('attendancePolicies');
      loadAttendancePolicies();
      loadDepartments();
      loadJobTitles();
    }
    if (!showAttendancePoliciesModal) {
      loadedModalsRef.current.delete('attendancePolicies');
    }
  }, [showAttendancePoliciesModal]);

  useEffect(() => {
    if (showRemoteWorkPoliciesModal && !loadedModalsRef.current.has('remoteWorkPolicies')) {
      loadedModalsRef.current.add('remoteWorkPolicies');
      loadRemoteWorkPolicies();
      loadDepartments();
      loadJobTitles();
    }
    if (!showRemoteWorkPoliciesModal) {
      loadedModalsRef.current.delete('remoteWorkPolicies');
    }
  }, [showRemoteWorkPoliciesModal]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showDepartmentsModal) {
          setShowDepartmentsModal(false);
          setDepartmentError('');
        }
        if (showLeavePoliciesModal) {
          setShowLeavePoliciesModal(false);
          setEditingLeaveType(null);
          setLeaveTypeError('');
        }
        if (showHolidaysModal) {
          setShowHolidaysModal(false);
          setHolidayError('');
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showDepartmentsModal, showLeavePoliciesModal, showHolidaysModal]);

  // Ensure only one modal is open at a time - prevent blinking with stable check
  const previousOpenModalRef = useRef(null);
  useEffect(() => {
    const modalStates = {
      departments: showDepartmentsModal,
      leavePolicies: showLeavePoliciesModal,
      holidays: showHolidaysModal,
      jobTitles: showJobTitlesModal,
      benefitsPackages: showBenefitsPackagesModal,
      workSchedules: showWorkSchedulesModal,
      overtimePolicies: showOvertimePoliciesModal,
      attendancePolicies: showAttendancePoliciesModal,
      remoteWorkPolicies: showRemoteWorkPoliciesModal
    };
    
    const openModals = Object.entries(modalStates)
      .filter(([_, isOpen]) => isOpen)
      .map(([name]) => name);
    
    // Only act if there's actually a change (more than one modal open)
    if (openModals.length > 1) {
      const firstModal = openModals[0];
      // Only close others if this is a new situation (different from previous)
      if (previousOpenModalRef.current !== firstModal) {
        previousOpenModalRef.current = firstModal;
        // Close all except the first one - React batches these automatically
        if (firstModal !== 'departments') setShowDepartmentsModal(false);
        if (firstModal !== 'leavePolicies') setShowLeavePoliciesModal(false);
        if (firstModal !== 'holidays') setShowHolidaysModal(false);
        if (firstModal !== 'jobTitles') setShowJobTitlesModal(false);
        if (firstModal !== 'benefitsPackages') setShowBenefitsPackagesModal(false);
        if (firstModal !== 'workSchedules') setShowWorkSchedulesModal(false);
        if (firstModal !== 'overtimePolicies') setShowOvertimePoliciesModal(false);
        if (firstModal !== 'attendancePolicies') setShowAttendancePoliciesModal(false);
        if (firstModal !== 'remoteWorkPolicies') setShowRemoteWorkPoliciesModal(false);
      }
    } else if (openModals.length === 1) {
      previousOpenModalRef.current = openModals[0];
    } else {
      previousOpenModalRef.current = null;
    }
  }, [
    showDepartmentsModal,
    showLeavePoliciesModal,
    showHolidaysModal,
    showJobTitlesModal,
    showBenefitsPackagesModal,
    showWorkSchedulesModal,
    showOvertimePoliciesModal,
    showAttendancePoliciesModal,
    showRemoteWorkPoliciesModal
  ]);

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
        is_company_closure: true,
        applies_to_type: 'All',
        applies_to_id: null
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

  // ============================================================================
  // Job Titles Functions
  // ============================================================================

  const loadJobTitles = async () => {
    try {
      const titles = await API("/api/settings/job-titles").catch(() => []);
      setJobTitles(titles || []);
    } catch (error) {
      console.error("Error loading job titles:", error);
      setJobTitles([]);
    }
  };

  const handleAddJobTitle = async (e) => {
    e.preventDefault();
    if (!newJobTitle.name.trim()) {
      setJobTitleError(t('settings.jobTitles.nameRequired'));
      return;
    }

    setAddingJobTitle(true);
    setJobTitleError('');

    try {
      await API("/api/settings/job-titles", {
        method: "POST",
        body: JSON.stringify(newJobTitle)
      });

      setNewJobTitle({
        name: '',
        description: '',
        department_id: null,
        level_grade: '',
        reports_to_id: null,
        min_salary: '',
        max_salary: ''
      });
      await loadJobTitles();
    } catch (error) {
      console.error("Error adding job title:", error);
      setJobTitleError(error.message || t('settings.jobTitles.addError'));
    } finally {
      setAddingJobTitle(false);
    }
  };

  const handleUpdateJobTitle = async (id) => {
    const jobTitle = jobTitles.find(jt => jt.id === id);
    if (!jobTitle) return;

    setAddingJobTitle(true);
    setJobTitleError('');

    try {
      await API(`/api/settings/job-titles/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: jobTitle.name.trim(),
          description: jobTitle.description || null,
          department_id: jobTitle.department_id || null,
          level_grade: jobTitle.level_grade || null,
          reports_to_id: jobTitle.reports_to_id || null,
          min_salary: jobTitle.min_salary || null,
          max_salary: jobTitle.max_salary || null
        })
      });

      setEditingJobTitle(null);
      await loadJobTitles();
    } catch (error) {
      console.error("Error updating job title:", error);
      setJobTitleError(error.message || t('settings.jobTitles.updateError'));
    } finally {
      setAddingJobTitle(false);
    }
  };

  const handleDeleteJobTitle = async (id) => {
    if (!window.confirm(t('settings.jobTitles.confirmDelete'))) {
      return;
    }

    setDeletingJobTitle(id);

    try {
      await API(`/api/settings/job-titles/${id}`, {
        method: "DELETE"
      });

      await loadJobTitles();
    } catch (error) {
      console.error("Error deleting job title:", error);
      const errorMsg = error.message || t('settings.jobTitles.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingJobTitle(null);
    }
  };

  // ============================================================================
  // Benefits Packages Functions
  // ============================================================================

  const loadBenefitsPackages = async () => {
    try {
      const packages = await API("/api/settings/benefits-packages").catch(() => []);
      setBenefitsPackages(packages || []);
    } catch (error) {
      console.error("Error loading benefits packages:", error);
      setBenefitsPackages([]);
    }
  };

  const handleAddBenefitsPackage = async (e) => {
    e.preventDefault();
    if (!newBenefitsPackage.name.trim()) {
      setBenefitsPackageError(t('settings.benefitsPackages.nameRequired'));
      return;
    }

    setAddingBenefitsPackage(true);
    setBenefitsPackageError('');

    try {
      await API("/api/settings/benefits-packages", {
        method: "POST",
        body: JSON.stringify(newBenefitsPackage)
      });

      setNewBenefitsPackage({
        name: '',
        description: '',
        benefit_types: [],
        coverage_level: 'Standard',
        employee_cost: 0,
        employer_cost: 0
      });
      await loadBenefitsPackages();
    } catch (error) {
      console.error("Error adding benefits package:", error);
      setBenefitsPackageError(error.message || t('settings.benefitsPackages.addError'));
    } finally {
      setAddingBenefitsPackage(false);
    }
  };

  const handleUpdateBenefitsPackage = async (id) => {
    const pkg = benefitsPackages.find(bp => bp.id === id);
    if (!pkg) return;

    setAddingBenefitsPackage(true);
    setBenefitsPackageError('');

    try {
      await API(`/api/settings/benefits-packages/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: pkg.name.trim(),
          description: pkg.description || null,
          benefit_types: pkg.benefit_types || [],
          coverage_level: pkg.coverage_level || 'Standard',
          employee_cost: pkg.employee_cost || 0,
          employer_cost: pkg.employer_cost || 0
        })
      });

      setEditingBenefitsPackage(null);
      await loadBenefitsPackages();
    } catch (error) {
      console.error("Error updating benefits package:", error);
      setBenefitsPackageError(error.message || t('settings.benefitsPackages.updateError'));
    } finally {
      setAddingBenefitsPackage(false);
    }
  };

  const handleDeleteBenefitsPackage = async (id) => {
    if (!window.confirm(t('settings.benefitsPackages.confirmDelete'))) {
      return;
    }

    setDeletingBenefitsPackage(id);

    try {
      await API(`/api/settings/benefits-packages/${id}`, {
        method: "DELETE"
      });

      await loadBenefitsPackages();
    } catch (error) {
      console.error("Error deleting benefits package:", error);
      const errorMsg = error.message || t('settings.benefitsPackages.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingBenefitsPackage(null);
    }
  };

  // ============================================================================
  // Work Schedules Functions
  // ============================================================================

  const loadWorkSchedules = async () => {
    try {
      const schedules = await API("/api/settings/work-schedules").catch(() => []);
      setWorkSchedules(schedules || []);
    } catch (error) {
      console.error("Error loading work schedules:", error);
      setWorkSchedules([]);
    }
  };

  const handleAddWorkSchedule = async (e) => {
    e.preventDefault();
    if (!newWorkSchedule.name.trim()) {
      setWorkScheduleError(t('settings.workSchedules.nameRequired'));
      return;
    }

    setAddingWorkSchedule(true);
    setWorkScheduleError('');

    try {
      await API("/api/settings/work-schedules", {
        method: "POST",
        body: JSON.stringify(newWorkSchedule)
      });

      setNewWorkSchedule({
        name: '',
        description: '',
        start_time: '09:00',
        end_time: '17:00',
        days_of_week: [],
        break_duration_minutes: 60,
        flexible_hours: false,
        max_hours_per_week: 40
      });
      await loadWorkSchedules();
    } catch (error) {
      console.error("Error adding work schedule:", error);
      setWorkScheduleError(error.message || t('settings.workSchedules.addError'));
    } finally {
      setAddingWorkSchedule(false);
    }
  };

  const handleUpdateWorkSchedule = async (id) => {
    const schedule = workSchedules.find(ws => ws.id === id);
    if (!schedule) return;

    setAddingWorkSchedule(true);
    setWorkScheduleError('');

    try {
      await API(`/api/settings/work-schedules/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: schedule.name.trim(),
          description: schedule.description || null,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          days_of_week: schedule.days_of_week || [],
          break_duration_minutes: schedule.break_duration_minutes || 0,
          flexible_hours: schedule.flexible_hours || false,
          max_hours_per_week: schedule.max_hours_per_week || 40
        })
      });

      setEditingWorkSchedule(null);
      await loadWorkSchedules();
    } catch (error) {
      console.error("Error updating work schedule:", error);
      setWorkScheduleError(error.message || t('settings.workSchedules.updateError'));
    } finally {
      setAddingWorkSchedule(false);
    }
  };

  const handleDeleteWorkSchedule = async (id) => {
    if (!window.confirm(t('settings.workSchedules.confirmDelete'))) {
      return;
    }

    setDeletingWorkSchedule(id);

    try {
      await API(`/api/settings/work-schedules/${id}`, {
        method: "DELETE"
      });

      await loadWorkSchedules();
    } catch (error) {
      console.error("Error deleting work schedule:", error);
      const errorMsg = error.message || t('settings.workSchedules.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingWorkSchedule(null);
    }
  };

  // ============================================================================
  // Overtime Policies Functions
  // ============================================================================

  const loadOvertimePolicies = async () => {
    try {
      const policies = await API("/api/settings/overtime-policies").catch(() => []);
      setOvertimePolicies(policies || []);
    } catch (error) {
      console.error("Error loading overtime policies:", error);
      setOvertimePolicies([]);
    }
  };

  const handleAddOvertimePolicy = async (e) => {
    e.preventDefault();
    if (!newOvertimePolicy.name.trim()) {
      setOvertimePolicyError(t('settings.overtimePolicies.nameRequired'));
      return;
    }

    setAddingOvertimePolicy(true);
    setOvertimePolicyError('');

    try {
      await API("/api/settings/overtime-policies", {
        method: "POST",
        body: JSON.stringify(newOvertimePolicy)
      });

      setNewOvertimePolicy({
        name: '',
        description: '',
        weekly_threshold_hours: 40,
        daily_threshold_hours: 8,
        multiplier: 1.5,
        requires_approval: true,
        applies_to_type: 'All',
        applies_to_id: null
      });
      await loadOvertimePolicies();
    } catch (error) {
      console.error("Error adding overtime policy:", error);
      setOvertimePolicyError(error.message || t('settings.overtimePolicies.addError'));
    } finally {
      setAddingOvertimePolicy(false);
    }
  };

  const handleUpdateOvertimePolicy = async (id) => {
    const policy = overtimePolicies.find(op => op.id === id);
    if (!policy) return;

    setAddingOvertimePolicy(true);
    setOvertimePolicyError('');

    try {
      await API(`/api/settings/overtime-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: policy.name.trim(),
          description: policy.description || null,
          weekly_threshold_hours: policy.weekly_threshold_hours || 40,
          daily_threshold_hours: policy.daily_threshold_hours || 8,
          multiplier: policy.multiplier || 1.5,
          requires_approval: policy.requires_approval !== false,
          applies_to_type: policy.applies_to_type || 'All',
          applies_to_id: policy.applies_to_id || null
        })
      });

      setEditingOvertimePolicy(null);
      await loadOvertimePolicies();
    } catch (error) {
      console.error("Error updating overtime policy:", error);
      setOvertimePolicyError(error.message || t('settings.overtimePolicies.updateError'));
    } finally {
      setAddingOvertimePolicy(false);
    }
  };

  const handleDeleteOvertimePolicy = async (id) => {
    if (!window.confirm(t('settings.overtimePolicies.confirmDelete'))) {
      return;
    }

    setDeletingOvertimePolicy(id);

    try {
      await API(`/api/settings/overtime-policies/${id}`, {
        method: "DELETE"
      });

      await loadOvertimePolicies();
    } catch (error) {
      console.error("Error deleting overtime policy:", error);
      const errorMsg = error.message || t('settings.overtimePolicies.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingOvertimePolicy(null);
    }
  };

  // ============================================================================
  // Attendance Policies Functions
  // ============================================================================

  const loadAttendancePolicies = async () => {
    try {
      const policies = await API("/api/settings/attendance-policies").catch(() => []);
      setAttendancePolicies(policies || []);
    } catch (error) {
      console.error("Error loading attendance policies:", error);
      setAttendancePolicies([]);
    }
  };

  const handleAddAttendancePolicy = async (e) => {
    e.preventDefault();
    if (!newAttendancePolicy.name.trim()) {
      setAttendancePolicyError(t('settings.attendancePolicies.nameRequired'));
      return;
    }

    setAddingAttendancePolicy(true);
    setAttendancePolicyError('');

    try {
      await API("/api/settings/attendance-policies", {
        method: "POST",
        body: JSON.stringify(newAttendancePolicy)
      });

      setNewAttendancePolicy({
        name: '',
        description: '',
        late_grace_period_minutes: 15,
        absence_limit_per_month: 3,
        tardiness_penalty_points: 1,
        absence_penalty_points: 3,
        point_threshold_termination: 10,
        applies_to_type: 'All',
        applies_to_id: null
      });
      await loadAttendancePolicies();
    } catch (error) {
      console.error("Error adding attendance policy:", error);
      setAttendancePolicyError(error.message || t('settings.attendancePolicies.addError'));
    } finally {
      setAddingAttendancePolicy(false);
    }
  };

  const handleUpdateAttendancePolicy = async (id) => {
    const policy = attendancePolicies.find(ap => ap.id === id);
    if (!policy) return;

    setAddingAttendancePolicy(true);
    setAttendancePolicyError('');

    try {
      await API(`/api/settings/attendance-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: policy.name.trim(),
          description: policy.description || null,
          late_grace_period_minutes: policy.late_grace_period_minutes || 15,
          absence_limit_per_month: policy.absence_limit_per_month || 3,
          tardiness_penalty_points: policy.tardiness_penalty_points || 1,
          absence_penalty_points: policy.absence_penalty_points || 3,
          point_threshold_termination: policy.point_threshold_termination || 10,
          applies_to_type: policy.applies_to_type || 'All',
          applies_to_id: policy.applies_to_id || null
        })
      });

      setEditingAttendancePolicy(null);
      await loadAttendancePolicies();
    } catch (error) {
      console.error("Error updating attendance policy:", error);
      setAttendancePolicyError(error.message || t('settings.attendancePolicies.updateError'));
    } finally {
      setAddingAttendancePolicy(false);
    }
  };

  const handleDeleteAttendancePolicy = async (id) => {
    if (!window.confirm(t('settings.attendancePolicies.confirmDelete'))) {
      return;
    }

    setDeletingAttendancePolicy(id);

    try {
      await API(`/api/settings/attendance-policies/${id}`, {
        method: "DELETE"
      });

      await loadAttendancePolicies();
    } catch (error) {
      console.error("Error deleting attendance policy:", error);
      const errorMsg = error.message || t('settings.attendancePolicies.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingAttendancePolicy(null);
    }
  };

  // ============================================================================
  // Remote Work Policies Functions
  // ============================================================================

  const loadRemoteWorkPolicies = async () => {
    try {
      const policies = await API("/api/settings/remote-work-policies").catch(() => []);
      setRemoteWorkPolicies(policies || []);
    } catch (error) {
      console.error("Error loading remote work policies:", error);
      setRemoteWorkPolicies([]);
    }
  };

  const handleAddRemoteWorkPolicy = async (e) => {
    e.preventDefault();
    if (!newRemoteWorkPolicy.name.trim()) {
      setRemoteWorkPolicyError(t('settings.remoteWorkPolicies.nameRequired'));
      return;
    }

    setAddingRemoteWorkPolicy(true);
    setRemoteWorkPolicyError('');

    try {
      await API("/api/settings/remote-work-policies", {
        method: "POST",
        body: JSON.stringify(newRemoteWorkPolicy)
      });

      setNewRemoteWorkPolicy({
        name: '',
        description: '',
        eligibility_type: 'All',
        eligibility_id: null,
        days_per_week_allowed: 5,
        requires_approval: true,
        equipment_provided: '',
        equipment_policy: ''
      });
      await loadRemoteWorkPolicies();
    } catch (error) {
      console.error("Error adding remote work policy:", error);
      setRemoteWorkPolicyError(error.message || t('settings.remoteWorkPolicies.addError'));
    } finally {
      setAddingRemoteWorkPolicy(false);
    }
  };

  const handleUpdateRemoteWorkPolicy = async (id) => {
    const policy = remoteWorkPolicies.find(rwp => rwp.id === id);
    if (!policy) return;

    setAddingRemoteWorkPolicy(true);
    setRemoteWorkPolicyError('');

    try {
      await API(`/api/settings/remote-work-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: policy.name.trim(),
          description: policy.description || null,
          eligibility_type: policy.eligibility_type || 'All',
          eligibility_id: policy.eligibility_id || null,
          days_per_week_allowed: policy.days_per_week_allowed || 5,
          requires_approval: policy.requires_approval !== false,
          equipment_provided: policy.equipment_provided || null,
          equipment_policy: policy.equipment_policy || null
        })
      });

      setEditingRemoteWorkPolicy(null);
      await loadRemoteWorkPolicies();
    } catch (error) {
      console.error("Error updating remote work policy:", error);
      setRemoteWorkPolicyError(error.message || t('settings.remoteWorkPolicies.updateError'));
    } finally {
      setAddingRemoteWorkPolicy(false);
    }
  };

  const handleDeleteRemoteWorkPolicy = async (id) => {
    if (!window.confirm(t('settings.remoteWorkPolicies.confirmDelete'))) {
      return;
    }

    setDeletingRemoteWorkPolicy(id);

    try {
      await API(`/api/settings/remote-work-policies/${id}`, {
        method: "DELETE"
      });

      await loadRemoteWorkPolicies();
    } catch (error) {
      console.error("Error deleting remote work policy:", error);
      const errorMsg = error.message || t('settings.remoteWorkPolicies.deleteError');
      alert(errorMsg);
    } finally {
      setDeletingRemoteWorkPolicy(null);
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
    
    // Show management buttons if no system settings exist
    if (!Array.isArray(systemSettings) || systemSettings.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">{t('settings.system')}</h3>
            <p className="text-sm text-secondary mb-6">{t('settings.systemDescription')}</p>
          </div>

          {/* Management Buttons */}
          {canManage && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
              {/* Departments Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowDepartmentsModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">🏢</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.departments.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.departments.description')}</p>
              </motion.button>

              {/* Leave Policies Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => setShowLeavePoliciesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">📋</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.leavePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.leavePolicies.description')}</p>
              </motion.button>

              {/* Holidays Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => setShowHolidaysModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">🎉</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.holidays.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.holidays.description')}</p>
              </motion.button>

              {/* Job Titles Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => setShowJobTitlesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">💼</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.jobTitles.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.jobTitles.description')}</p>
              </motion.button>

              {/* Benefits Packages Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => setShowBenefitsPackagesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">🎁</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.benefitsPackages.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.benefitsPackages.description')}</p>
              </motion.button>

              {/* Work Schedules Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setShowWorkSchedulesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">⏰</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.workSchedules.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.workSchedules.description')}</p>
              </motion.button>

              {/* Overtime Policies Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => setShowOvertimePoliciesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">⏱️</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.overtimePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.overtimePolicies.description')}</p>
              </motion.button>

              {/* Attendance Policies Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={() => setShowAttendancePoliciesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">📊</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.attendancePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.attendancePolicies.description')}</p>
              </motion.button>

              {/* Remote Work Policies Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => setShowRemoteWorkPoliciesModal(true)}
                className="card p-6 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="text-3xl mb-3">🏠</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.remoteWorkPolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.remoteWorkPolicies.description')}</p>
              </motion.button>
            </div>
          )}

          {!canManage && (
            <div className="card p-6 text-center">
          <p className="text-secondary">{t('settings.noSystemSettings')}</p>
            </div>
          )}
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

  // Modal Components
  const DepartmentsModal = () => {
    if (!showDepartmentsModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowDepartmentsModal(false);
      setDepartmentError('');
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.departments.title')}</h2>
            <button
              onClick={handleClose}
              className="text-secondary hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.departments.description')}</p>

            {/* Add Department Form */}
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
        </motion.div>
      </div>
    );
  };

  const LeavePoliciesModal = () => {
    if (!showLeavePoliciesModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowLeavePoliciesModal(false);
      setEditingLeaveType(null);
      setLeaveTypeError('');
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.leavePolicies.title')}</h2>
            <button
              onClick={handleClose}
              className="text-secondary hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.leavePolicies.description')}</p>

            {/* Add Leave Type Form */}
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
                        id="modal_is_paid"
                        checked={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.is_paid !== false : newLeaveType.is_paid}
                        onChange={(e) => {
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, is_paid: e.target.checked } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, is_paid: e.target.checked});
                          }
                        }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        className="mr-2"
                      />
                      <label htmlFor="modal_is_paid" className="text-sm">{t('settings.leavePolicies.isPaid')}</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="modal_requires_approval"
                        checked={editingLeaveType ? leaveTypes.find(lt => lt.id === editingLeaveType)?.requires_approval !== false : newLeaveType.requires_approval}
                        onChange={(e) => {
                          if (editingLeaveType) {
                            setLeaveTypes(leaveTypes.map(lt => lt.id === editingLeaveType ? { ...lt, requires_approval: e.target.checked } : lt));
                          } else {
                            setNewLeaveType({...newLeaveType, requires_approval: e.target.checked});
                          }
                        }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        className="mr-2"
                      />
                      <label htmlFor="modal_requires_approval" className="text-sm">{t('settings.leavePolicies.requiresApproval')}</label>
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
        </motion.div>
      </div>
    );
  };

  const HolidaysModal = () => {
    if (!showHolidaysModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowHolidaysModal(false);
      setHolidayError('');
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.holidays.title')}</h2>
            <button
              onClick={handleClose}
              className="text-secondary hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.holidays.description')}</p>

            {/* Add Holiday Form */}
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
                      id="modal_is_company_closure"
                      checked={newHoliday.is_company_closure}
                      onChange={(e) => setNewHoliday({...newHoliday, is_company_closure: e.target.checked})}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      className="mr-2"
                    />
                    <label htmlFor="modal_is_company_closure" className="text-sm">{t('settings.holidays.companyClosure')}</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.holidays.appliesTo')}</label>
                      <select
                        value={newHoliday.applies_to_type || 'All'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setNewHoliday({
                            ...newHoliday,
                            applies_to_type: newType,
                            applies_to_id: newType === 'All' ? null : null
                          });
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      >
                        <option value="All">{t('settings.holidays.appliesToAll')}</option>
                        <option value="Department">{t('settings.holidays.appliesToDepartment')}</option>
                        <option value="JobTitle">{t('settings.holidays.appliesToJobTitle')}</option>
                        <option value="Employee">{t('settings.holidays.appliesToEmployee')}</option>
                      </select>
                    </div>
                    {newHoliday.applies_to_type && newHoliday.applies_to_type !== 'All' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {newHoliday.applies_to_type === 'Department' ? t('settings.holidays.selectDepartment') :
                           newHoliday.applies_to_type === 'JobTitle' ? t('settings.holidays.selectJobTitle') :
                           t('settings.holidays.selectEmployee')}
                        </label>
                        <select
                          value={newHoliday.applies_to_id || ''}
                          onChange={(e) => setNewHoliday({...newHoliday, applies_to_id: e.target.value ? parseInt(e.target.value, 10) : null})}
                          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        >
                          <option value="">{t('settings.holidays.select')}</option>
                          {newHoliday.applies_to_type === 'Department' && departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                          {newHoliday.applies_to_type === 'JobTitle' && jobTitles.map(jt => (
                            <option key={jt.id} value={jt.id}>{jt.name}{jt.department_name ? ` (${jt.department_name})` : ''}</option>
                          ))}
                          {newHoliday.applies_to_type === 'Employee' && employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={addingHoliday || !newHoliday.date || !newHoliday.description.trim() || (newHoliday.applies_to_type !== 'All' && !newHoliday.applies_to_id)}
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
                            {holiday.applies_to_type && holiday.applies_to_type !== 'All' && (
                              <span className="text-xs text-indigo-400 ml-2">
                                • {holiday.applies_to_type === 'Department' ? t('settings.holidays.appliesToDepartment') :
                                    holiday.applies_to_type === 'JobTitle' ? t('settings.holidays.appliesToJobTitle') :
                                    t('settings.holidays.appliesToEmployee')}
                              </span>
                            )}
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
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Job Titles Modal
  // ============================================================================

  const JobTitlesModal = () => {
    if (!showJobTitlesModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowJobTitlesModal(false);
      setEditingJobTitle(null);
      setJobTitleError('');
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.jobTitles.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.jobTitles.description')}</p>

            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {editingJobTitle ? t('settings.jobTitles.edit') : t('settings.jobTitles.addNew')}
                </h4>
                <form onSubmit={editingJobTitle ? (e) => { e.preventDefault(); handleUpdateJobTitle(editingJobTitle); } : handleAddJobTitle} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.name')} *</label>
                      <input
                        type="text"
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.name || '' : newJobTitle.name}
                        onChange={(e) => {
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, name: e.target.value } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, name: e.target.value});
                          }
                          setJobTitleError('');
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.department')}</label>
                      <select
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.department_id || '' : newJobTitle.department_id || ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, department_id: val } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, department_id: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      >
                        <option value="">{t('settings.jobTitles.selectDepartment')}</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.description')}</label>
                    <textarea
                      value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.description || '' : newJobTitle.description}
                      onChange={(e) => {
                        if (editingJobTitle) {
                          setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, description: e.target.value } : jt));
                        } else {
                          setNewJobTitle({...newJobTitle, description: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      rows="2"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.levelGrade')}</label>
                      <input
                        type="text"
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.level_grade || '' : newJobTitle.level_grade}
                        onChange={(e) => {
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, level_grade: e.target.value } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, level_grade: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.reportsTo')}</label>
                      <select
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.reports_to_id || '' : newJobTitle.reports_to_id || ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, reports_to_id: val } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, reports_to_id: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      >
                        <option value="">{t('settings.jobTitles.selectJobTitle')}</option>
                        {jobTitles.filter(jt => !editingJobTitle || jt.id !== editingJobTitle).map(jt => (
                          <option key={jt.id} value={jt.id}>{jt.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.minSalary')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.min_salary || '' : newJobTitle.min_salary}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null;
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, min_salary: val } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, min_salary: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.maxSalary')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingJobTitle ? jobTitles.find(jt => jt.id === editingJobTitle)?.max_salary || '' : newJobTitle.max_salary}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : null;
                          if (editingJobTitle) {
                            setJobTitles(jobTitles.map(jt => jt.id === editingJobTitle ? { ...jt, max_salary: val } : jt));
                          } else {
                            setNewJobTitle({...newJobTitle, max_salary: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addingJobTitle}
                      className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingJobTitle ? t('settings.jobTitles.saving') : (editingJobTitle ? t('settings.jobTitles.update') : t('settings.jobTitles.add'))}
                    </button>
                    {editingJobTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJobTitle(null);
                          setJobTitleError('');
                        }}
                        className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white"
                      >
                        {t('settings.jobTitles.cancel')}
                      </button>
                    )}
                  </div>
                </form>
                {jobTitleError && (
                  <p className="mt-2 text-sm text-red-400">{jobTitleError}</p>
                )}
              </div>
            )}

            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.jobTitles.list')}</h4>
              {jobTitles.length === 0 ? (
                <p className="text-secondary">{t('settings.jobTitles.noJobTitles')}</p>
              ) : (
                <div className="space-y-3">
                  {jobTitles.map((jt) => (
                    <motion.div
                      key={jt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white">{jt.name}</div>
                        {jt.department_name && (
                          <div className="text-sm text-secondary mt-1">{t('settings.jobTitles.department')}: {jt.department_name}</div>
                        )}
                        {jt.level_grade && (
                          <div className="text-sm text-secondary mt-1">{t('settings.jobTitles.levelGrade')}: {jt.level_grade}</div>
                        )}
                        {(jt.min_salary || jt.max_salary) && (
                          <div className="text-sm text-secondary mt-1">
                            {jt.min_salary && jt.max_salary ? `$${jt.min_salary} - $${jt.max_salary}` : jt.min_salary ? `$${jt.min_salary}+` : `Up to $${jt.max_salary}`}
                          </div>
                        )}
                        {jt.employee_count > 0 && (
                          <div className="text-xs text-yellow-400 mt-1">
                            {t('settings.jobTitles.inUse', { count: jt.employee_count })}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingJobTitle(jt.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            {t('settings.jobTitles.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteJobTitle(jt.id)}
                            disabled={deletingJobTitle === jt.id || (jt.employee_count || 0) > 0}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            title={jt.employee_count > 0 ? t('settings.jobTitles.cannotDelete') : t('settings.jobTitles.delete')}
                          >
                            {deletingJobTitle === jt.id ? t('settings.jobTitles.deleting') : t('settings.jobTitles.delete')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Benefits Packages Modal
  // ============================================================================

  const BenefitsPackagesModal = () => {
    if (!showBenefitsPackagesModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowBenefitsPackagesModal(false);
      setEditingBenefitsPackage(null);
      setBenefitsPackageError('');
    };

    const benefitTypesOptions = ['Health', 'Dental', 'Vision', 'Retirement', 'Life Insurance', 'Disability', 'Wellness', 'Other'];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.benefitsPackages.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.benefitsPackages.description')}</p>

            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {editingBenefitsPackage ? t('settings.benefitsPackages.edit') : t('settings.benefitsPackages.addNew')}
                </h4>
                <form onSubmit={editingBenefitsPackage ? (e) => { e.preventDefault(); handleUpdateBenefitsPackage(editingBenefitsPackage); } : handleAddBenefitsPackage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.name')} *</label>
                    <input
                      type="text"
                      value={editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage)?.name || '' : newBenefitsPackage.name}
                      onChange={(e) => {
                        if (editingBenefitsPackage) {
                          setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, name: e.target.value } : bp));
                        } else {
                          setNewBenefitsPackage({...newBenefitsPackage, name: e.target.value});
                        }
                        setBenefitsPackageError('');
                      }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.description')}</label>
                    <textarea
                      value={editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage)?.description || '' : newBenefitsPackage.description}
                      onChange={(e) => {
                        if (editingBenefitsPackage) {
                          setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, description: e.target.value } : bp));
                        } else {
                          setNewBenefitsPackage({...newBenefitsPackage, description: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      rows="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.benefitTypes')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {benefitTypesOptions.map(type => {
                        const pkg = editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage) : newBenefitsPackage;
                        const selected = (pkg?.benefit_types || []).includes(type);
                        return (
                          <label key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const currentTypes = pkg?.benefit_types || [];
                                const newTypes = e.target.checked
                                  ? [...currentTypes, type]
                                  : currentTypes.filter(t => t !== type);
                                if (editingBenefitsPackage) {
                                  setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, benefit_types: newTypes } : bp));
                                } else {
                                  setNewBenefitsPackage({...newBenefitsPackage, benefit_types: newTypes});
                                }
                              }}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                              className="mr-2"
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.coverageLevel')}</label>
                      <select
                        value={editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage)?.coverage_level || 'Standard' : newBenefitsPackage.coverage_level}
                        onChange={(e) => {
                          if (editingBenefitsPackage) {
                            setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, coverage_level: e.target.value } : bp));
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, coverage_level: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      >
                        <option value="Basic">{t('settings.benefitsPackages.basic')}</option>
                        <option value="Standard">{t('settings.benefitsPackages.standard')}</option>
                        <option value="Premium">{t('settings.benefitsPackages.premium')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.employeeCost')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage)?.employee_cost || 0 : newBenefitsPackage.employee_cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (editingBenefitsPackage) {
                            setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, employee_cost: val } : bp));
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, employee_cost: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.employerCost')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBenefitsPackage ? benefitsPackages.find(bp => bp.id === editingBenefitsPackage)?.employer_cost || 0 : newBenefitsPackage.employer_cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (editingBenefitsPackage) {
                            setBenefitsPackages(benefitsPackages.map(bp => bp.id === editingBenefitsPackage ? { ...bp, employer_cost: val } : bp));
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, employer_cost: val});
                          }
                        }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addingBenefitsPackage}
                      className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingBenefitsPackage ? t('settings.benefitsPackages.saving') : (editingBenefitsPackage ? t('settings.benefitsPackages.update') : t('settings.benefitsPackages.add'))}
                    </button>
                    {editingBenefitsPackage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBenefitsPackage(null);
                          setBenefitsPackageError('');
                        }}
                        className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white"
                      >
                        {t('settings.benefitsPackages.cancel')}
                      </button>
                    )}
                  </div>
                </form>
                {benefitsPackageError && (
                  <p className="mt-2 text-sm text-red-400">{benefitsPackageError}</p>
                )}
              </div>
            )}

            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.benefitsPackages.list')}</h4>
              {benefitsPackages.length === 0 ? (
                <p className="text-secondary">{t('settings.benefitsPackages.noPackages')}</p>
              ) : (
                <div className="space-y-3">
                  {benefitsPackages.map((bp) => (
                    <motion.div
                      key={bp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white">{bp.name}</div>
                        {bp.description && (
                          <div className="text-sm text-secondary mt-1">{bp.description}</div>
                        )}
                        <div className="text-xs text-secondary mt-1">
                          {t('settings.benefitsPackages.coverageLevel')}: {bp.coverage_level} • 
                          {bp.benefit_types && bp.benefit_types.length > 0 && ` ${bp.benefit_types.join(', ')}`}
                        </div>
                        {(bp.employee_cost > 0 || bp.employer_cost > 0) && (
                          <div className="text-xs text-secondary mt-1">
                            Employee: ${bp.employee_cost} • Employer: ${bp.employer_cost}
                          </div>
                        )}
                        {bp.employee_count > 0 && (
                          <div className="text-xs text-yellow-400 mt-1">
                            {t('settings.benefitsPackages.inUse', { count: bp.employee_count })}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBenefitsPackage(bp.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                            {t('settings.benefitsPackages.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteBenefitsPackage(bp.id)}
                            disabled={deletingBenefitsPackage === bp.id || (bp.employee_count || 0) > 0}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            title={bp.employee_count > 0 ? t('settings.benefitsPackages.cannotDelete') : t('settings.benefitsPackages.delete')}
                          >
                            {deletingBenefitsPackage === bp.id ? t('settings.benefitsPackages.deleting') : t('settings.benefitsPackages.delete')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Work Schedules Modal (Simplified - full implementation would be similar pattern)
  // ============================================================================

  const WorkSchedulesModal = () => {
    if (!showWorkSchedulesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowWorkSchedulesModal(false); setEditingWorkSchedule(null); setWorkScheduleError(''); };
    const daysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.workSchedules.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.workSchedules.description')}</p>
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{editingWorkSchedule ? t('settings.workSchedules.edit') : t('settings.workSchedules.addNew')}</h4>
                <form onSubmit={editingWorkSchedule ? (e) => { e.preventDefault(); handleUpdateWorkSchedule(editingWorkSchedule); } : handleAddWorkSchedule} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.name')} *</label>
                      <input type="text" value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.name || '' : newWorkSchedule.name}
                        onChange={(e) => { if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, name: e.target.value } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, name: e.target.value}); } setWorkScheduleError(''); }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.description')}</label>
                      <textarea value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.description || '' : newWorkSchedule.description}
                        onChange={(e) => { if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, description: e.target.value } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, description: e.target.value}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" rows="2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.startTime')} *</label>
                      <input type="time" value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.start_time || '09:00' : newWorkSchedule.start_time}
                        onChange={(e) => { if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, start_time: e.target.value } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, start_time: e.target.value}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.endTime')} *</label>
                      <input type="time" value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.end_time || '17:00' : newWorkSchedule.end_time}
                        onChange={(e) => { if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, end_time: e.target.value } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, end_time: e.target.value}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.daysOfWeek')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {daysOptions.map(day => {
                        const schedule = editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule) : newWorkSchedule;
                        const selected = (schedule?.days_of_week || []).includes(day);
                        return (
                          <label key={day} className="flex items-center">
                            <input type="checkbox" checked={selected} onChange={(e) => {
                              const currentDays = schedule?.days_of_week || [];
                              const newDays = e.target.checked ? [...currentDays, day] : currentDays.filter(d => d !== day);
                              if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, days_of_week: newDays } : ws)); }
                              else { setNewWorkSchedule({...newWorkSchedule, days_of_week: newDays}); }
                            }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                            <span className="text-sm">{day}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.breakDuration')}</label>
                      <input type="number" value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.break_duration_minutes || 60 : newWorkSchedule.break_duration_minutes}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 0; if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, break_duration_minutes: val } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, break_duration_minutes: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div className="flex items-center mt-6"><input type="checkbox" checked={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.flexible_hours || false : newWorkSchedule.flexible_hours}
                      onChange={(e) => { if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, flexible_hours: e.target.checked } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, flexible_hours: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                      <label className="text-sm">{t('settings.workSchedules.flexibleHours')}</label>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.maxHoursPerWeek')}</label>
                      <input type="number" value={editingWorkSchedule ? workSchedules.find(ws => ws.id === editingWorkSchedule)?.max_hours_per_week || 40 : newWorkSchedule.max_hours_per_week}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 40; if (editingWorkSchedule) { setWorkSchedules(workSchedules.map(ws => ws.id === editingWorkSchedule ? { ...ws, max_hours_per_week: val } : ws)); } else { setNewWorkSchedule({...newWorkSchedule, max_hours_per_week: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingWorkSchedule} className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingWorkSchedule ? t('settings.workSchedules.saving') : (editingWorkSchedule ? t('settings.workSchedules.update') : t('settings.workSchedules.add'))}
                    </button>
                    {editingWorkSchedule && <button type="button" onClick={() => { setEditingWorkSchedule(null); setWorkScheduleError(''); }} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white">{t('settings.workSchedules.cancel')}</button>}
                  </div>
                </form>
                {workScheduleError && <p className="mt-2 text-sm text-red-400">{workScheduleError}</p>}
              </div>
            )}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.workSchedules.list')}</h4>
              {workSchedules.length === 0 ? <p className="text-secondary">{t('settings.workSchedules.noSchedules')}</p> : (
                <div className="space-y-3">
                  {workSchedules.map((ws) => (
                    <motion.div key={ws.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                      <div className="flex-1">
                        <div className="font-medium text-white">{ws.name}</div>
                        {ws.description && <div className="text-sm text-secondary mt-1">{ws.description}</div>}
                        <div className="text-xs text-secondary mt-1">{ws.start_time} - {ws.end_time} • {ws.days_of_week?.join(', ') || 'No days'} • {ws.flexible_hours ? t('settings.workSchedules.flexible') : t('settings.workSchedules.fixed')}</div>
                        {ws.employee_count > 0 && <div className="text-xs text-yellow-400 mt-1">{t('settings.workSchedules.inUse', { count: ws.employee_count })}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => setEditingWorkSchedule(ws.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{t('settings.workSchedules.edit')}</button>
                        <button onClick={() => handleDeleteWorkSchedule(ws.id)} disabled={deletingWorkSchedule === ws.id || (ws.employee_count || 0) > 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors" title={ws.employee_count > 0 ? t('settings.workSchedules.cannotDelete') : t('settings.workSchedules.delete')}>
                          {deletingWorkSchedule === ws.id ? t('settings.workSchedules.deleting') : t('settings.workSchedules.delete')}
                        </button>
                      </div>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Overtime Policies Modal (Simplified)
  // ============================================================================

  const OvertimePoliciesModal = () => {
    if (!showOvertimePoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowOvertimePoliciesModal(false); setEditingOvertimePolicy(null); setOvertimePolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.overtimePolicies.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.overtimePolicies.description')}</p>
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{editingOvertimePolicy ? t('settings.overtimePolicies.edit') : t('settings.overtimePolicies.addNew')}</h4>
                <form onSubmit={editingOvertimePolicy ? (e) => { e.preventDefault(); handleUpdateOvertimePolicy(editingOvertimePolicy); } : handleAddOvertimePolicy} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.name')} *</label>
                    <input type="text" value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.name || '' : newOvertimePolicy.name}
                      onChange={(e) => { if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, name: e.target.value } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, name: e.target.value}); } setOvertimePolicyError(''); }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.description')}</label>
                    <textarea value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.description || '' : newOvertimePolicy.description}
                      onChange={(e) => { if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, description: e.target.value } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.weeklyThreshold')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.weekly_threshold_hours || 40 : newOvertimePolicy.weekly_threshold_hours}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 40; if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, weekly_threshold_hours: val } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, weekly_threshold_hours: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.dailyThreshold')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.daily_threshold_hours || 8 : newOvertimePolicy.daily_threshold_hours}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 8; if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, daily_threshold_hours: val } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, daily_threshold_hours: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.multiplier')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.multiplier || 1.5 : newOvertimePolicy.multiplier}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 1.5; if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, multiplier: val } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, multiplier: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center"><input type="checkbox" checked={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.requires_approval !== false : newOvertimePolicy.requires_approval}
                      onChange={(e) => { if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, requires_approval: e.target.checked } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, requires_approval: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                      <label className="text-sm">{t('settings.overtimePolicies.requiresApproval')}</label>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.appliesTo')}</label>
                      <select value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.applies_to_type || 'All' : newOvertimePolicy.applies_to_type}
                        onChange={(e) => { if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, applies_to_type: e.target.value, applies_to_id: null } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, applies_to_type: e.target.value, applies_to_id: null}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option value="All">{t('settings.overtimePolicies.all')}</option>
                        <option value="Department">{t('settings.overtimePolicies.department')}</option>
                        <option value="JobTitle">{t('settings.overtimePolicies.jobTitle')}</option>
                      </select>
                    </div>
                    {(editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.applies_to_type : newOvertimePolicy.applies_to_type) !== 'All' && (
                      <div><label className="block text-sm font-medium mb-2">
                        {(editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.applies_to_type : newOvertimePolicy.applies_to_type) === 'Department' ? t('settings.overtimePolicies.selectDepartment') : t('settings.overtimePolicies.selectJobTitle')}
                      </label>
                        <select value={editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.applies_to_id || '' : newOvertimePolicy.applies_to_id || ''}
                          onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingOvertimePolicy) { setOvertimePolicies(overtimePolicies.map(op => op.id === editingOvertimePolicy ? { ...op, applies_to_id: val } : op)); } else { setNewOvertimePolicy({...newOvertimePolicy, applies_to_id: val}); } }}
                          className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                          <option value="">{t('settings.overtimePolicies.select')}</option>
                          {(editingOvertimePolicy ? overtimePolicies.find(op => op.id === editingOvertimePolicy)?.applies_to_type : newOvertimePolicy.applies_to_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingOvertimePolicy} className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingOvertimePolicy ? t('settings.overtimePolicies.saving') : (editingOvertimePolicy ? t('settings.overtimePolicies.update') : t('settings.overtimePolicies.add'))}
                    </button>
                    {editingOvertimePolicy && <button type="button" onClick={() => { setEditingOvertimePolicy(null); setOvertimePolicyError(''); }} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white">{t('settings.overtimePolicies.cancel')}</button>}
                  </div>
                </form>
                {overtimePolicyError && <p className="mt-2 text-sm text-red-400">{overtimePolicyError}</p>}
              </div>
            )}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.overtimePolicies.list')}</h4>
              {overtimePolicies.length === 0 ? <p className="text-secondary">{t('settings.overtimePolicies.noPolicies')}</p> : (
                <div className="space-y-3">
                  {overtimePolicies.map((op) => (
                    <motion.div key={op.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                      <div className="flex-1">
                        <div className="font-medium text-white">{op.name}</div>
                        {op.description && <div className="text-sm text-secondary mt-1">{op.description}</div>}
                        <div className="text-xs text-secondary mt-1">{t('settings.overtimePolicies.weeklyThreshold')}: {op.weekly_threshold_hours}h • {t('settings.overtimePolicies.dailyThreshold')}: {op.daily_threshold_hours}h • {t('settings.overtimePolicies.multiplier')}: {op.multiplier}x</div>
                        {op.applies_to_name && <div className="text-xs text-secondary mt-1">{t('settings.overtimePolicies.appliesTo')}: {op.applies_to_name}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => setEditingOvertimePolicy(op.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{t('settings.overtimePolicies.edit')}</button>
                        <button onClick={() => handleDeleteOvertimePolicy(op.id)} disabled={deletingOvertimePolicy === op.id} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                          {deletingOvertimePolicy === op.id ? t('settings.overtimePolicies.deleting') : t('settings.overtimePolicies.delete')}
                        </button>
                      </div>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Attendance Policies Modal (Simplified)
  // ============================================================================

  const AttendancePoliciesModal = () => {
    if (!showAttendancePoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowAttendancePoliciesModal(false); setEditingAttendancePolicy(null); setAttendancePolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.attendancePolicies.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.attendancePolicies.description')}</p>
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{editingAttendancePolicy ? t('settings.attendancePolicies.edit') : t('settings.attendancePolicies.addNew')}</h4>
                <form onSubmit={editingAttendancePolicy ? (e) => { e.preventDefault(); handleUpdateAttendancePolicy(editingAttendancePolicy); } : handleAddAttendancePolicy} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.name')} *</label>
                    <input type="text" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.name || '' : newAttendancePolicy.name}
                      onChange={(e) => { if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, name: e.target.value } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, name: e.target.value}); } setAttendancePolicyError(''); }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.description')}</label>
                    <textarea value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.description || '' : newAttendancePolicy.description}
                      onChange={(e) => { if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, description: e.target.value } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.lateGracePeriod')}</label>
                      <input type="number" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.late_grace_period_minutes || 15 : newAttendancePolicy.late_grace_period_minutes}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 15; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, late_grace_period_minutes: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, late_grace_period_minutes: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.absenceLimitPerMonth')}</label>
                      <input type="number" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.absence_limit_per_month || 3 : newAttendancePolicy.absence_limit_per_month}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 3; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, absence_limit_per_month: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, absence_limit_per_month: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.tardinessPenalty')}</label>
                      <input type="number" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.tardiness_penalty_points || 1 : newAttendancePolicy.tardiness_penalty_points}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 1; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, tardiness_penalty_points: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, tardiness_penalty_points: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.absencePenalty')}</label>
                      <input type="number" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.absence_penalty_points || 3 : newAttendancePolicy.absence_penalty_points}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 3; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, absence_penalty_points: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, absence_penalty_points: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.pointThresholdTermination')}</label>
                      <input type="number" value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.point_threshold_termination || 10 : newAttendancePolicy.point_threshold_termination}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 10; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, point_threshold_termination: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, point_threshold_termination: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.appliesTo')}</label>
                      <select value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.applies_to_type || 'All' : newAttendancePolicy.applies_to_type}
                        onChange={(e) => { if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, applies_to_type: e.target.value, applies_to_id: null } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, applies_to_type: e.target.value, applies_to_id: null}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option value="All">{t('settings.attendancePolicies.all')}</option>
                        <option value="Department">{t('settings.attendancePolicies.department')}</option>
                        <option value="JobTitle">{t('settings.attendancePolicies.jobTitle')}</option>
                      </select>
                    </div>
                  </div>
                  {(editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.applies_to_type : newAttendancePolicy.applies_to_type) !== 'All' && (
                    <div><label className="block text-sm font-medium mb-2">
                      {(editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.applies_to_type : newAttendancePolicy.applies_to_type) === 'Department' ? t('settings.attendancePolicies.selectDepartment') : t('settings.attendancePolicies.selectJobTitle')}
                    </label>
                      <select value={editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.applies_to_id || '' : newAttendancePolicy.applies_to_id || ''}
                        onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingAttendancePolicy) { setAttendancePolicies(attendancePolicies.map(ap => ap.id === editingAttendancePolicy ? { ...ap, applies_to_id: val } : ap)); } else { setNewAttendancePolicy({...newAttendancePolicy, applies_to_id: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option value="">{t('settings.attendancePolicies.select')}</option>
                        {(editingAttendancePolicy ? attendancePolicies.find(ap => ap.id === editingAttendancePolicy)?.applies_to_type : newAttendancePolicy.applies_to_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingAttendancePolicy} className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingAttendancePolicy ? t('settings.attendancePolicies.saving') : (editingAttendancePolicy ? t('settings.attendancePolicies.update') : t('settings.attendancePolicies.add'))}
                    </button>
                    {editingAttendancePolicy && <button type="button" onClick={() => { setEditingAttendancePolicy(null); setAttendancePolicyError(''); }} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white">{t('settings.attendancePolicies.cancel')}</button>}
                  </div>
                </form>
                {attendancePolicyError && <p className="mt-2 text-sm text-red-400">{attendancePolicyError}</p>}
              </div>
            )}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.attendancePolicies.list')}</h4>
              {attendancePolicies.length === 0 ? <p className="text-secondary">{t('settings.attendancePolicies.noPolicies')}</p> : (
                <div className="space-y-3">
                  {attendancePolicies.map((ap) => (
                    <motion.div key={ap.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                      <div className="flex-1">
                        <div className="font-medium text-white">{ap.name}</div>
                        {ap.description && <div className="text-sm text-secondary mt-1">{ap.description}</div>}
                        <div className="text-xs text-secondary mt-1">
                          {t('settings.attendancePolicies.lateGracePeriod')}: {ap.late_grace_period_minutes}min • {t('settings.attendancePolicies.absenceLimitPerMonth')}: {ap.absence_limit_per_month} • {t('settings.attendancePolicies.pointThresholdTermination')}: {ap.point_threshold_termination}
                        </div>
                        {ap.applies_to_name && <div className="text-xs text-secondary mt-1">{t('settings.attendancePolicies.appliesTo')}: {ap.applies_to_name}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => setEditingAttendancePolicy(ap.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{t('settings.attendancePolicies.edit')}</button>
                        <button onClick={() => handleDeleteAttendancePolicy(ap.id)} disabled={deletingAttendancePolicy === ap.id} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                          {deletingAttendancePolicy === ap.id ? t('settings.attendancePolicies.deleting') : t('settings.attendancePolicies.delete')}
                        </button>
                      </div>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  // ============================================================================
  // Remote Work Policies Modal (Simplified)
  // ============================================================================

  const RemoteWorkPoliciesModal = () => {
    if (!showRemoteWorkPoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowRemoteWorkPoliciesModal(false); setEditingRemoteWorkPolicy(null); setRemoteWorkPolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-neutral-700">
            <h2 className="text-2xl font-semibold">{t('settings.remoteWorkPolicies.title')}</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">{t('settings.remoteWorkPolicies.description')}</p>
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{editingRemoteWorkPolicy ? t('settings.remoteWorkPolicies.edit') : t('settings.remoteWorkPolicies.addNew')}</h4>
                <form onSubmit={editingRemoteWorkPolicy ? (e) => { e.preventDefault(); handleUpdateRemoteWorkPolicy(editingRemoteWorkPolicy); } : handleAddRemoteWorkPolicy} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.name')} *</label>
                    <input type="text" value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.name || '' : newRemoteWorkPolicy.name}
                      onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, name: e.target.value } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, name: e.target.value}); } setRemoteWorkPolicyError(''); }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.description')}</label>
                    <textarea value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.description || '' : newRemoteWorkPolicy.description}
                      onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, description: e.target.value } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.eligibilityCriteria')}</label>
                      <select value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.eligibility_type || 'All' : newRemoteWorkPolicy.eligibility_type}
                        onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, eligibility_type: e.target.value, eligibility_id: null } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, eligibility_type: e.target.value, eligibility_id: null}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option value="All">{t('settings.remoteWorkPolicies.all')}</option>
                        <option value="Department">{t('settings.remoteWorkPolicies.department')}</option>
                        <option value="JobTitle">{t('settings.remoteWorkPolicies.jobTitle')}</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.daysPerWeekAllowed')}</label>
                      <input type="number" min="0" max="5" value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.days_per_week_allowed || 5 : newRemoteWorkPolicy.days_per_week_allowed}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 5; if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, days_per_week_allowed: val } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, days_per_week_allowed: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                    </div>
                  </div>
                  {(editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.eligibility_type : newRemoteWorkPolicy.eligibility_type) !== 'All' && (
                    <div><label className="block text-sm font-medium mb-2">
                      {(editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.eligibility_type : newRemoteWorkPolicy.eligibility_type) === 'Department' ? t('settings.remoteWorkPolicies.selectDepartment') : t('settings.remoteWorkPolicies.selectJobTitle')}
                    </label>
                      <select value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.eligibility_id || '' : newRemoteWorkPolicy.eligibility_id || ''}
                        onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, eligibility_id: val } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, eligibility_id: val}); } }}
                        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white">
                        <option value="">{t('settings.remoteWorkPolicies.select')}</option>
                        {(editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.eligibility_type : newRemoteWorkPolicy.eligibility_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center"><input type="checkbox" checked={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.requires_approval !== false : newRemoteWorkPolicy.requires_approval}
                    onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, requires_approval: e.target.checked } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, requires_approval: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                    <label className="text-sm">{t('settings.remoteWorkPolicies.requiresApproval')}</label>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.equipmentProvided')}</label>
                    <input type="text" value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.equipment_provided || '' : newRemoteWorkPolicy.equipment_provided}
                      onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, equipment_provided: e.target.value } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, equipment_provided: e.target.value}); } }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.equipmentPolicy')}</label>
                    <textarea value={editingRemoteWorkPolicy ? remoteWorkPolicies.find(rwp => rwp.id === editingRemoteWorkPolicy)?.equipment_policy || '' : newRemoteWorkPolicy.equipment_policy}
                      onChange={(e) => { if (editingRemoteWorkPolicy) { setRemoteWorkPolicies(remoteWorkPolicies.map(rwp => rwp.id === editingRemoteWorkPolicy ? { ...rwp, equipment_policy: e.target.value } : rwp)); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, equipment_policy: e.target.value}); } }}
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white" rows="3" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingRemoteWorkPolicy} className="btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingRemoteWorkPolicy ? t('settings.remoteWorkPolicies.saving') : (editingRemoteWorkPolicy ? t('settings.remoteWorkPolicies.update') : t('settings.remoteWorkPolicies.add'))}
                    </button>
                    {editingRemoteWorkPolicy && <button type="button" onClick={() => { setEditingRemoteWorkPolicy(null); setRemoteWorkPolicyError(''); }} className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white">{t('settings.remoteWorkPolicies.cancel')}</button>}
                  </div>
                </form>
                {remoteWorkPolicyError && <p className="mt-2 text-sm text-red-400">{remoteWorkPolicyError}</p>}
              </div>
            )}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.remoteWorkPolicies.list')}</h4>
              {remoteWorkPolicies.length === 0 ? <p className="text-secondary">{t('settings.remoteWorkPolicies.noPolicies')}</p> : (
                <div className="space-y-3">
                  {remoteWorkPolicies.map((rwp) => (
                    <motion.div key={rwp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                      <div className="flex-1">
                        <div className="font-medium text-white">{rwp.name}</div>
                        {rwp.description && <div className="text-sm text-secondary mt-1">{rwp.description}</div>}
                        <div className="text-xs text-secondary mt-1">
                          {t('settings.remoteWorkPolicies.daysPerWeekAllowed')}: {rwp.days_per_week_allowed} • {rwp.requires_approval ? t('settings.remoteWorkPolicies.approvalRequired') : t('settings.remoteWorkPolicies.noApproval')}
                        </div>
                        {rwp.eligibility_name && <div className="text-xs text-secondary mt-1">{t('settings.remoteWorkPolicies.eligibilityCriteria')}: {rwp.eligibility_name}</div>}
                        {rwp.equipment_provided && <div className="text-xs text-secondary mt-1">{t('settings.remoteWorkPolicies.equipmentProvided')}: {rwp.equipment_provided}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => setEditingRemoteWorkPolicy(rwp.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">{t('settings.remoteWorkPolicies.edit')}</button>
                        <button onClick={() => handleDeleteRemoteWorkPolicy(rwp.id)} disabled={deletingRemoteWorkPolicy === rwp.id} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                          {deletingRemoteWorkPolicy === rwp.id ? t('settings.remoteWorkPolicies.deleting') : t('settings.remoteWorkPolicies.delete')}
                        </button>
                      </div>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
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

      {/* Management Modals */}
      <DepartmentsModal />
      <LeavePoliciesModal />
      <HolidaysModal />
      <JobTitlesModal />
      <BenefitsPackagesModal />
      <WorkSchedulesModal />
      <OvertimePoliciesModal />
      <AttendancePoliciesModal />
      <RemoteWorkPoliciesModal />
    </div>
  );
}
