import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';
import { useUserRole, hasFullAccess } from '../hooks/useUserRole.js';
import LeaveConfigModal from '../components/LeaveConfigModal.jsx';

// CleanupButton component COMPLETELY REMOVED
// This component was causing accidental data deletion and has been permanently removed

// Track requests currently in-flight OUTSIDE component to persist across unmounts
const inFlightRequests = new Set();

export default function Settings() {
  const { t, i18n } = useTranslation();
  const activeTabRef = useRef("system");

  const [systemSettings, setSystemSettings] = useState([]);
  const [userPreferences, setUserPreferences] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [security, setSecurity] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [saving, setSaving] = useState({});
  const [settingsEdits, setSettingsEdits] = useState({}); // Track unsaved edits for ALL categories: { [category]: { [key]: value } }
  const systemSettingsRefs = useRef({}); // Store refs for system settings inputs: { [key]: ref }
  const departmentNameInputRef = useRef(null); // Ref for department name input in modal
  const locationInputRefs = useRef({ name: null, region: null }); // Refs for location inputs
  const leaveTypeInputRefs = useRef({ name: null, default_annual_entitlement: null, description: null, color: null }); // Refs for leave type inputs
  const holidayInputRefs = useRef({ date: null, description: null }); // Refs for holiday inputs
  const jobTitleInputRefs = useRef({ name: null, description: null, department_id: null, level_grade: null, reports_to_id: null, min_salary: null, max_salary: null }); // Refs for job title inputs
  const benefitsPackageInputRefs = useRef({ name: null, description: null }); // Refs for benefits package inputs
  const workScheduleInputRefs = useRef({ name: null, description: null, start_time: null, end_time: null, hours_per_week: null, break_duration: null }); // Refs for work schedule inputs
  const overtimePolicyInputRefs = useRef({ name: null, description: null, threshold_hours: null, multiplier: null }); // Refs for overtime policy inputs
  const attendancePolicyInputRefs = useRef({ name: null, description: null, grace_period: null, max_late_count: null, max_absent_count: null, warning_threshold: null, action_threshold: null }); // Refs for attendance policy inputs
  const remoteWorkPolicyInputRefs = useRef({ name: null, description: null, min_days_office: null, max_days_remote: null, approval_required: null }); // Refs for remote work policy inputs
  const userPasswordInputRef = useRef(null); // Ref for user password reset input
  const userPasswordValueRef = useRef(''); // Ref to preserve password value across re-renders
  const isLoadingRef = useRef(false);
  
  // Commission Structures State
  const [commissionStructures, setCommissionStructures] = useState({
    salesAgent: Array(7).fill(null).map(() => ({ leadPct: '', revenue: '', commission: '' })),
    vacationPackage: '',
    salesManager: Array(6).fill(null).map(() => ({ min: '', max: '', commission: '' }))
  });
  const [commissionStructuresLoaded, setCommissionStructuresLoaded] = useState(false);
  
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
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(null);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentEmployeeCounts, setDepartmentEmployeeCounts] = useState({});

  // Location Management State
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({
    name: '',
    region: '',
    is_active: true
  });
  const [editingLocation, setEditingLocation] = useState(null);
  const [addingLocation, setAddingLocation] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationEmployeeCounts, setLocationEmployeeCounts] = useState({});

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
  const [editingLeaveTypeData, setEditingLeaveTypeData] = useState(null);
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
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [showLeavePoliciesModal, setShowLeavePoliciesModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);
  const [showBenefitsPackagesModal, setShowBenefitsPackagesModal] = useState(false);
  const [showWorkSchedulesModal, setShowWorkSchedulesModal] = useState(false);
  const [showOvertimePoliciesModal, setShowOvertimePoliciesModal] = useState(false);
  const [showAttendancePoliciesModal, setShowAttendancePoliciesModal] = useState(false);
  const [showRemoteWorkPoliciesModal, setShowRemoteWorkPoliciesModal] = useState(false);
  const [showCommissionStructuresModal, setShowCommissionStructuresModal] = useState(false);
  const [showUserPasswordsModal, setShowUserPasswordsModal] = useState(false);

  // User Passwords Management State
  const [usersForPasswordReset, setUsersForPasswordReset] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userPasswordError, setUserPasswordError] = useState('');
  const [userPasswordSuccess, setUserPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  const [editingJobTitleData, setEditingJobTitleData] = useState(null);
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
  const [editingBenefitsPackageData, setEditingBenefitsPackageData] = useState(null);
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
  const [editingWorkScheduleData, setEditingWorkScheduleData] = useState(null);
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
  const [editingOvertimePolicyData, setEditingOvertimePolicyData] = useState(null);
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
  const [editingAttendancePolicyData, setEditingAttendancePolicyData] = useState(null);
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
  const [editingRemoteWorkPolicyData, setEditingRemoteWorkPolicyData] = useState(null);
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
  
  // Track if individual modals have loaded (one ref per modal)
  const departmentsLoadedRef = useRef(false);
  const locationsLoadedRef = useRef(false);
  const leavePoliciesLoadedRef = useRef(false);
  const benefitsPackagesLoadedRef = useRef(false);
  const workSchedulesLoadedRef = useRef(false);
  const jobTitlesLoadedRef = useRef(false);
  const holidaysLoadedRef = useRef(false);
  const overtimeLoadedRef = useRef(false);
  const attendanceLoadedRef = useRef(false);
  const remoteWorkLoadedRef = useRef(false);
  
  // Track if tabs have loaded their data (one ref per tab)
  const preferencesLoadedRef = useRef(false);
  const notificationsLoadedRef = useRef(false);
  const securityLoadedRef = useRef(false);
  const maintenanceLoadedRef = useRef(false);

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

  // Removed automatic loadSettings() call - it causes blinking
  // Settings will load on-demand or remain empty to prevent visual flicker

  // Load commission structures from settings
  const loadCommissionStructures = async () => {
    if (commissionStructuresLoaded) return;
    
    try {
      const settings = await API('/api/settings/system').catch(() => []);
      
      // Also load system settings if not already loaded
      // Filter out commission structure settings - they should ONLY appear in the modal
      if (systemSettings.length === 0) {
        const filteredSettings = settings.filter(setting => {
          const key = setting?.key || '';
          return !key.startsWith('sales_agent_threshold_') &&
                 !key.startsWith('sales_manager_threshold_') &&
                 key !== 'sales_agent_vacation_package_value';
        });
        setSystemSettings(filteredSettings);
      }
      
      const agentThresholds = [];
      let vacationPackage = '5000';
      
      // Load Sales Agent thresholds
      for (let i = 1; i <= 7; i++) {
        const key = `sales_agent_threshold_${i}`;
        const setting = settings.find(s => s.key === key);
        if (setting && setting.value) {
          const parts = setting.value.split(',');
          if (parts.length === 3) {
            agentThresholds.push({
              leadPct: parts[0],
              revenue: parts[1],
              commission: parts[2]
            });
          } else {
            agentThresholds.push({ leadPct: '', revenue: '', commission: '' });
          }
        } else {
          agentThresholds.push({ leadPct: '', revenue: '', commission: '' });
        }
      }
      
      // Load vacation package
      const vacationSetting = settings.find(s => s.key === 'sales_agent_vacation_package_value');
      if (vacationSetting && vacationSetting.value) {
        vacationPackage = vacationSetting.value;
      }
      
      // Load Sales Manager thresholds
      const managerThresholds = [];
      for (let i = 1; i <= 6; i++) {
        const key = `sales_manager_threshold_${i}`;
        const setting = settings.find(s => s.key === key);
        if (setting && setting.value) {
          const parts = setting.value.split(',');
          if (parts.length === 3) {
            managerThresholds.push({
              min: parts[0],
              max: parts[1],
              commission: parts[2]
            });
          } else {
            managerThresholds.push({ min: '', max: '', commission: '' });
          }
        } else {
          managerThresholds.push({ min: '', max: '', commission: '' });
        }
      }
      
      setCommissionStructures({
        salesAgent: agentThresholds,
        vacationPackage,
        salesManager: managerThresholds
      });
      setCommissionStructuresLoaded(true);
    } catch (error) {
      console.error('Error loading commission structures:', error);
    }
  };

  // Save commission structures to settings
  const saveCommissionStructures = async () => {
    const canManage = hasFullAccess(userRole);
    if (!canManage) return;
    
    setSaving(prev => ({ ...prev, commission_structures: true }));
    
    try {
      // Save Sales Agent thresholds
      for (let i = 0; i < 7; i++) {
        const threshold = commissionStructures.salesAgent[i];
        if (threshold.leadPct && threshold.revenue && threshold.commission) {
          const value = `${threshold.leadPct},${threshold.revenue},${threshold.commission}`;
          await API(`/api/settings/system/sales_agent_threshold_${i + 1}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
          }).catch(err => console.error(`Error saving threshold ${i + 1}:`, err));
        }
      }
      
      // Save vacation package
      if (commissionStructures.vacationPackage) {
        await API('/api/settings/system/sales_agent_vacation_package_value', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: commissionStructures.vacationPackage })
        }).catch(err => console.error('Error saving vacation package:', err));
      }
      
      // Save Sales Manager thresholds
      for (let i = 0; i < 6; i++) {
        const threshold = commissionStructures.salesManager[i];
        if (threshold.min && threshold.max && threshold.commission) {
          const value = `${threshold.min},${threshold.max},${threshold.commission}`;
          await API(`/api/settings/system/sales_manager_threshold_${i + 1}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
          }).catch(err => console.error(`Error saving manager threshold ${i + 1}:`, err));
        }
      }
      
      alert('Commission structures saved successfully');
    } catch (error) {
      console.error('Error saving commission structures:', error);
      alert('Error saving commission structures: ' + error.message);
    } finally {
      setSaving(prev => ({ ...prev, commission_structures: false }));
    }
  };

  // Load settings data for a specific tab category
  const loadSettingsForTab = async (category) => {
    // Map category to ref and setState function
    const tabConfig = {
      preferences: { ref: preferencesLoadedRef, setState: setUserPreferences },
      notifications: { ref: notificationsLoadedRef, setState: setNotifications },
      security: { ref: securityLoadedRef, setState: setSecurity },
      maintenance: { ref: maintenanceLoadedRef, setState: setMaintenance }
    };
    
    const config = tabConfig[category];
    if (!config || config.ref.current) {
      // Tab not in config or already loaded
      return;
    }
    
    // Check if request is already in flight
    const requestKey = `settings_${category}`;
    if (inFlightRequests.has(requestKey)) {
      return;
    }
    
    config.ref.current = true;
    inFlightRequests.add(requestKey);
    
    try {
      const settings = await API(`/api/settings/${category}`).catch(() => []);
      
      // Enrich settings with options from SETTING_OPTIONS mapping
      const enrichedSettings = (settings || []).map(setting => {
        const options = SETTING_OPTIONS[setting.key];
        if (options) {
          return { ...setting, options, type: 'select' };
        }
        return setting;
      });
      
      // Update state in single batch (no blinking)
      config.setState(enrichedSettings);
    } catch (error) {
      console.error(`Error loading ${category} settings:`, error);
      config.setState([]);
    } finally {
      inFlightRequests.delete(requestKey);
    }
  };

  const handleTabChange = (tabId) => {
    activeTabRef.current = tabId;
    // Update button styles manually (no re-render needed)
    const buttons = document.querySelectorAll('[data-tab-button]');
    buttons.forEach(btn => {
      if (btn.dataset.tabId === tabId) {
        btn.className = "flex items-center space-x-2 px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-colors bg-primary text-white";
      } else {
        btn.className = "flex items-center space-x-2 px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-colors text-secondary hover:text-white hover:bg-tertiary";
      }
    });
    // Update content visibility with CSS
    const contents = document.querySelectorAll('[data-tab-content]');
    contents.forEach(content => {
      if (content.dataset.tabId === tabId) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });
    
    // Load data for the tab if not already loaded
    loadSettingsForTab(tabId);
    
    // Load commission structures when system tab is active
    if (tabId === 'system') {
      loadCommissionStructures();
    }
  };

  // Load data when modals are opened - track in-flight requests to prevent duplicates
  useEffect(() => {
    if (showDepartmentsModal && !departmentsLoadedRef.current) {
      departmentsLoadedRef.current = true;
      
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments().finally(() => {
          inFlightRequests.delete('departments');
        });
      }
    }
  }, [showDepartmentsModal]);

  useEffect(() => {
    if (showLocationsModal && !locationsLoadedRef.current) {
      locationsLoadedRef.current = true;
      
      if (!inFlightRequests.has('locations')) {
        inFlightRequests.add('locations');
        loadLocations().finally(() => {
          inFlightRequests.delete('locations');
        });
      }
    }
  }, [showLocationsModal]);

  useEffect(() => {
    if (showLeavePoliciesModal && !leavePoliciesLoadedRef.current) {
      leavePoliciesLoadedRef.current = true;
      
      if (!inFlightRequests.has('leaveTypes')) {
        inFlightRequests.add('leaveTypes');
        loadLeaveTypes().finally(() => {
          inFlightRequests.delete('leaveTypes');
        });
      }
    }
  }, [showLeavePoliciesModal]);

  useEffect(() => {
    if (showHolidaysModal && !holidaysLoadedRef.current) {
      holidaysLoadedRef.current = true;
      
      if (!inFlightRequests.has('holidays')) {
        inFlightRequests.add('holidays');
        loadHolidays().finally(() => {
          inFlightRequests.delete('holidays');
        });
      }
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments(true).finally(() => {
          inFlightRequests.delete('departments');
        });
      }
      if (!inFlightRequests.has('jobTitles')) {
        inFlightRequests.add('jobTitles');
        loadJobTitles().finally(() => {
          inFlightRequests.delete('jobTitles');
        });
      }
      if (!inFlightRequests.has('employees')) {
        inFlightRequests.add('employees');
        loadEmployees().finally(() => {
          inFlightRequests.delete('employees');
        });
      }
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

  // Load users for password reset modal
  const loadUsersForPasswordReset = async () => {
    try {
      const response = await API("/api/users");
      const users = response.users || [];
      setUsersForPasswordReset(users);
      // Initially show all active users
      const activeUsers = users
        .filter(u => u.employee_status === 'Active')
        .sort((a, b) => {
          const nameA = (a.full_name || `${a.first_name} ${a.last_name}`).toLowerCase();
          const nameB = (b.full_name || `${b.first_name} ${b.last_name}`).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      setFilteredUsers(activeUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsersForPasswordReset([]);
      setFilteredUsers([]);
    }
  };

  // Handle user search in password reset modal
  const handleUserSearch = (query) => {
    setUserSearchQuery(query);
    setShowUserDropdown(true);
    setUserPasswordSuccess(false);
    setUserPasswordError('');
    
    if (!query.trim()) {
      // Show all active users when search is empty
      const activeUsers = usersForPasswordReset
        .filter(u => u.employee_status === 'Active')
        .sort((a, b) => {
          const nameA = (a.full_name || `${a.first_name} ${a.last_name}`).toLowerCase();
          const nameB = (b.full_name || `${b.first_name} ${b.last_name}`).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      setFilteredUsers(activeUsers);
      return;
    }
    
    const searchTerm = query.toLowerCase();
    const filtered = usersForPasswordReset
      .filter(u => u.employee_status === 'Active')
      .filter(user => {
        const fullName = (user.full_name || `${user.first_name} ${user.last_name}`).toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
      })
      .sort((a, b) => {
        const nameA = (a.full_name || `${a.first_name} ${a.last_name}`).toLowerCase();
        const nameB = (b.full_name || `${b.full_name} ${b.last_name}`).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    setFilteredUsers(filtered);
  };

  // Select a user from the dropdown
  const selectUser = (user) => {
    setSelectedUserId(user.id);
    setSelectedUserName(user.full_name || `${user.first_name} ${user.last_name}`);
    setUserSearchQuery(user.full_name || `${user.first_name} ${user.last_name}`);
    setShowUserDropdown(false);
    setUserPasswordSuccess(false);
    setUserPasswordError('');
  };

  // Handle password reset for a user
  const handleResetUserPassword = async (e) => {
    e.preventDefault();
    setUserPasswordError('');
    setUserPasswordSuccess(false);
    
    const passwordValue = userPasswordInputRef.current?.value?.trim() || '';
    
    if (!selectedUserId || !passwordValue) {
      setUserPasswordError('Please select a user and enter a new password');
      return;
    }
    
    if (passwordValue.length < 8) {
      setUserPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setSavingPassword(true);
    try {
      await API(`/api/users/${selectedUserId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword: passwordValue })
      });
      setUserPasswordSuccess(true);
      // Clear the password input
      if (userPasswordInputRef.current) {
        userPasswordInputRef.current.value = '';
      }
      // Keep selectedUserId so they can see which user was updated
    } catch (error) {
      setUserPasswordError(error.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Load users when password modal opens
  useEffect(() => {
    if (showUserPasswordsModal) {
      loadUsersForPasswordReset();
    }
  }, [showUserPasswordsModal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showUserDropdown) return;
    
    const handleClickOutside = (event) => {
      const dropdown = document.querySelector('[data-user-dropdown]');
      const input = document.querySelector('[data-user-search-input]');
      
      if (dropdown && input && 
          !dropdown.contains(event.target) && 
          !input.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  // Restore password input value after modal re-renders (for showPassword toggle)
  useEffect(() => {
    if (showUserPasswordsModal && userPasswordInputRef.current && userPasswordValueRef.current) {
      userPasswordInputRef.current.value = userPasswordValueRef.current;
    }
  }, [showUserPasswordsModal, showPassword]);

  useEffect(() => {
    if (showJobTitlesModal && !jobTitlesLoadedRef.current) {
      jobTitlesLoadedRef.current = true;
      
      if (!inFlightRequests.has('jobTitles')) {
        inFlightRequests.add('jobTitles');
        loadJobTitles().finally(() => {
          inFlightRequests.delete('jobTitles');
        });
      }
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments(true).finally(() => {
          inFlightRequests.delete('departments');
        });
      }
    }
  }, [showJobTitlesModal]);

  useEffect(() => {
    if (showBenefitsPackagesModal && !benefitsPackagesLoadedRef.current) {
      benefitsPackagesLoadedRef.current = true;
      
      if (!inFlightRequests.has('benefitsPackages')) {
        inFlightRequests.add('benefitsPackages');
        loadBenefitsPackages().finally(() => {
          inFlightRequests.delete('benefitsPackages');
        });
      }
    }
  }, [showBenefitsPackagesModal]);

  useEffect(() => {
    if (showWorkSchedulesModal && !workSchedulesLoadedRef.current) {
      workSchedulesLoadedRef.current = true;
      
      if (!inFlightRequests.has('workSchedules')) {
        inFlightRequests.add('workSchedules');
        loadWorkSchedules().finally(() => {
          inFlightRequests.delete('workSchedules');
        });
      }
    }
  }, [showWorkSchedulesModal]);

  useEffect(() => {
    if (showOvertimePoliciesModal && !overtimeLoadedRef.current) {
      overtimeLoadedRef.current = true;
      
      if (!inFlightRequests.has('overtimePolicies')) {
        inFlightRequests.add('overtimePolicies');
        loadOvertimePolicies().finally(() => {
          inFlightRequests.delete('overtimePolicies');
        });
      }
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments(true).finally(() => {
          inFlightRequests.delete('departments');
        });
      }
      if (!inFlightRequests.has('jobTitles')) {
        inFlightRequests.add('jobTitles');
        loadJobTitles().finally(() => {
          inFlightRequests.delete('jobTitles');
        });
      }
    }
  }, [showOvertimePoliciesModal]);

  useEffect(() => {
    if (showAttendancePoliciesModal && !attendanceLoadedRef.current) {
      attendanceLoadedRef.current = true;
      
      if (!inFlightRequests.has('attendancePolicies')) {
        inFlightRequests.add('attendancePolicies');
        loadAttendancePolicies().finally(() => {
          inFlightRequests.delete('attendancePolicies');
        });
      }
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments(true).finally(() => {
          inFlightRequests.delete('departments');
        });
      }
      if (!inFlightRequests.has('jobTitles')) {
        inFlightRequests.add('jobTitles');
        loadJobTitles().finally(() => {
          inFlightRequests.delete('jobTitles');
        });
      }
    }
  }, [showAttendancePoliciesModal]);

  useEffect(() => {
    if (showRemoteWorkPoliciesModal && !remoteWorkLoadedRef.current) {
      remoteWorkLoadedRef.current = true;
      
      if (!inFlightRequests.has('remoteWorkPolicies')) {
        inFlightRequests.add('remoteWorkPolicies');
        loadRemoteWorkPolicies().finally(() => {
          inFlightRequests.delete('remoteWorkPolicies');
        });
      }
      if (!inFlightRequests.has('departments')) {
        inFlightRequests.add('departments');
        loadDepartments(true).finally(() => {
          inFlightRequests.delete('departments');
        });
      }
      if (!inFlightRequests.has('jobTitles')) {
        inFlightRequests.add('jobTitles');
        loadJobTitles().finally(() => {
          inFlightRequests.delete('jobTitles');
        });
      }
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

  // Removed visibility change handler - it causes blinking
  // Settings load once on mount, no need to reload on tab visibility changes


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

  // REMOVED loadSettings() function entirely - it causes blinking
  // Settings remain empty arrays to prevent visual flicker

  // Load departments and employee counts
  const loadDepartments = async (skipEmployeeCounts = false) => {
    try {
      const depts = await API("/api/employees/departments").catch(() => []);
      setDepartments(depts || []);

      // Load all employees and count by department (only if not skipped)
      if (!skipEmployeeCounts) {
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
      }
    } catch (error) {
      console.error("Error loading departments:", error);
      setDepartments([]);
    }
  };

  // Add new department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    const departmentName = departmentNameInputRef.current?.value?.trim() || '';
    if (!departmentName) {
      setDepartmentError(t('settings.departments.nameRequired'));
      return;
    }

    setAddingDepartment(true);
    setDepartmentError('');

    try {
      const result = await API("/api/employees/departments", {
        method: "POST",
        body: JSON.stringify({ name: departmentName })
      });

      // Clear input by resetting ref value
      if (departmentNameInputRef.current) {
        departmentNameInputRef.current.value = '';
      }
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

  // Load locations and employee counts
  const loadLocations = async (skipEmployeeCounts = false) => {
    try {
      // Get all locations (including inactive) for management
      const locs = await API("/api/employees/locations?all=true").catch(() => []);
      setLocations(locs || []);

      // Load all employees and count by location (only if not skipped)
      if (!skipEmployeeCounts) {
        try {
          const employees = await API("/api/employees").catch(() => []);
          const counts = {};
          (locs || []).forEach(loc => {
            counts[loc.id] = 0;
          });
          (employees || []).forEach(emp => {
            const locId = emp.location_id;
            if (locId && counts[locId] !== undefined) {
              counts[locId] = (counts[locId] || 0) + 1;
            }
          });
          setLocationEmployeeCounts(counts);
        } catch (err) {
          console.error("Error loading location employee counts:", err);
          const counts = {};
          (locs || []).forEach(loc => {
            counts[loc.id] = 0;
          });
          setLocationEmployeeCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      setLocations([]);
    }
  };

  // Add new location
  const handleAddLocation = async (e) => {
    e.preventDefault();
    const name = locationInputRefs.current.name?.value?.trim() || '';
    const region = locationInputRefs.current.region?.value?.trim() || '';
    const is_active = true; // Default to active
    
    if (!name) {
      setLocationError(t('settings.locations.nameRequired'));
      return;
    }

    setAddingLocation(true);
    setLocationError('');

    try {
      await API("/api/employees/locations", {
        method: "POST",
        body: JSON.stringify({
          name: name,
          region: region || null,
          is_active: is_active
        })
      });

      // Clear inputs
      if (locationInputRefs.current.name) locationInputRefs.current.name.value = '';
      if (locationInputRefs.current.region) locationInputRefs.current.region.value = '';
      await loadLocations();
    } catch (error) {
      console.error("Error adding location:", error);
      setLocationError(error.message || t('settings.locations.addError'));
    } finally {
      setAddingLocation(false);
    }
  };

  // Update location
  const handleUpdateLocation = async (id, updates) => {
    setLocationError('');

    try {
      await API(`/api/employees/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });

      setEditingLocation(null);
      await loadLocations();
    } catch (error) {
      console.error("Error updating location:", error);
      setLocationError(error.message || t('settings.locations.updateError'));
    }
  };

  // Delete location
  const handleDeleteLocation = async (id) => {
    const count = locationEmployeeCounts[id] || 0;
    if (count > 0) {
      alert(t('settings.locations.cannotDelete', { count }));
      return;
    }

    if (!window.confirm(t('settings.locations.confirmDelete'))) {
      return;
    }

    setDeletingLocation(id);

    try {
      await API(`/api/employees/locations/${id}`, {
        method: "DELETE"
      });

      await loadLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      const errorMsg = error.message || t('settings.locations.deleteError');
      if (error.employee_count) {
        alert(t('settings.locations.cannotDelete', { count: error.employee_count }));
      } else {
        alert(errorMsg);
      }
    } finally {
      setDeletingLocation(null);
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
    const name = leaveTypeInputRefs.current.name?.value?.trim() || '';
    const description = leaveTypeInputRefs.current.description?.value?.trim() || '';
    const default_annual_entitlement = parseInt(leaveTypeInputRefs.current.default_annual_entitlement?.value || '0', 10) || 0;
    const color = leaveTypeInputRefs.current.color?.value || '#3B82F6';
    
    if (!name) {
      setLeaveTypeError(t('settings.leavePolicies.nameRequired'));
      return;
    }

    setAddingLeaveType(true);
    setLeaveTypeError('');

    try {
      await API("/api/leave/types", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          default_annual_entitlement,
          is_paid: true,
          requires_approval: true,
          color
        })
      });

      // Clear inputs
      if (leaveTypeInputRefs.current.name) leaveTypeInputRefs.current.name.value = '';
      if (leaveTypeInputRefs.current.description) leaveTypeInputRefs.current.description.value = '';
      if (leaveTypeInputRefs.current.default_annual_entitlement) leaveTypeInputRefs.current.default_annual_entitlement.value = '0';
      if (leaveTypeInputRefs.current.color) leaveTypeInputRefs.current.color.value = '#3B82F6';
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
    if (!editingLeaveTypeData) return;

    if (!editingLeaveTypeData.name || !editingLeaveTypeData.name.trim()) {
      setLeaveTypeError(t('settings.leavePolicies.nameRequired'));
      return;
    }

    setAddingLeaveType(true);
    setLeaveTypeError('');

    try {
      await API(`/api/leave/types/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingLeaveTypeData.name.trim(),
          description: editingLeaveTypeData.description || null,
          default_annual_entitlement: editingLeaveTypeData.default_annual_entitlement || 0,
          is_paid: editingLeaveTypeData.is_paid !== false,
          requires_approval: editingLeaveTypeData.requires_approval !== false,
          color: editingLeaveTypeData.color || '#3B82F6'
        })
      });

      setEditingLeaveType(null);
      setEditingLeaveTypeData(null);
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
    const date = holidayInputRefs.current.date?.value || '';
    const description = holidayInputRefs.current.description?.value?.trim() || '';
    
    if (!date || !description) {
      setHolidayError(t('settings.holidays.dateAndDescriptionRequired'));
      return;
    }

    // Get other form values (selects, checkboxes need to be read differently)
    const is_company_closure = true; // Default
    const applies_to_type = 'All'; // Default
    const applies_to_id = null; // Default

    setAddingHoliday(true);
    setHolidayError('');

    try {
      await API("/api/leave/holidays", {
        method: "POST",
        body: JSON.stringify({
          date,
          description,
          is_company_closure,
          applies_to_type,
          applies_to_id
        })
      });

      // Clear inputs
      if (holidayInputRefs.current.date) holidayInputRefs.current.date.value = '';
      if (holidayInputRefs.current.description) holidayInputRefs.current.description.value = '';
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
    const name = jobTitleInputRefs.current.name?.value?.trim() || '';
    const description = jobTitleInputRefs.current.description?.value?.trim() || '';
    const department_id = jobTitleInputRefs.current.department_id?.value ? parseInt(jobTitleInputRefs.current.department_id.value, 10) : null;
    const level_grade = jobTitleInputRefs.current.level_grade?.value?.trim() || '';
    const reports_to_id = jobTitleInputRefs.current.reports_to_id?.value ? parseInt(jobTitleInputRefs.current.reports_to_id.value, 10) : null;
    const min_salary = jobTitleInputRefs.current.min_salary?.value ? parseFloat(jobTitleInputRefs.current.min_salary.value) : null;
    const max_salary = jobTitleInputRefs.current.max_salary?.value ? parseFloat(jobTitleInputRefs.current.max_salary.value) : null;
    
    if (!name) {
      setJobTitleError(t('settings.jobTitles.nameRequired'));
      return;
    }

    setAddingJobTitle(true);
    setJobTitleError('');

    try {
      await API("/api/settings/job-titles", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          department_id,
          level_grade: level_grade || null,
          reports_to_id,
          min_salary,
          max_salary
        })
      });

      // Clear inputs
      if (jobTitleInputRefs.current.name) jobTitleInputRefs.current.name.value = '';
      if (jobTitleInputRefs.current.description) jobTitleInputRefs.current.description.value = '';
      if (jobTitleInputRefs.current.department_id) jobTitleInputRefs.current.department_id.value = '';
      if (jobTitleInputRefs.current.level_grade) jobTitleInputRefs.current.level_grade.value = '';
      if (jobTitleInputRefs.current.reports_to_id) jobTitleInputRefs.current.reports_to_id.value = '';
      if (jobTitleInputRefs.current.min_salary) jobTitleInputRefs.current.min_salary.value = '';
      if (jobTitleInputRefs.current.max_salary) jobTitleInputRefs.current.max_salary.value = '';
      await loadJobTitles();
    } catch (error) {
      console.error("Error adding job title:", error);
      setJobTitleError(error.message || t('settings.jobTitles.addError'));
    } finally {
      setAddingJobTitle(false);
    }
  };

  const handleUpdateJobTitle = async (id) => {
    if (!editingJobTitleData) return;

    setAddingJobTitle(true);
    setJobTitleError('');

    try {
      await API(`/api/settings/job-titles/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingJobTitleData.name.trim(),
          description: editingJobTitleData.description || null,
          department_id: editingJobTitleData.department_id || null,
          level_grade: editingJobTitleData.level_grade || null,
          reports_to_id: editingJobTitleData.reports_to_id || null,
          min_salary: editingJobTitleData.min_salary || null,
          max_salary: editingJobTitleData.max_salary || null
        })
      });

      setEditingJobTitle(null);
      setEditingJobTitleData(null);
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
    const name = benefitsPackageInputRefs.current.name?.value?.trim() || '';
    const description = benefitsPackageInputRefs.current.description?.value?.trim() || '';
    
    if (!name) {
      setBenefitsPackageError(t('settings.benefitsPackages.nameRequired'));
      return;
    }

    setAddingBenefitsPackage(true);
    setBenefitsPackageError('');

    try {
      await API("/api/settings/benefits-packages", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || null,
          benefit_types: [],
          coverage_level: 'Standard',
          employee_cost: 0,
          employer_cost: 0
        })
      });

      // Clear inputs
      if (benefitsPackageInputRefs.current.name) benefitsPackageInputRefs.current.name.value = '';
      if (benefitsPackageInputRefs.current.description) benefitsPackageInputRefs.current.description.value = '';
      await loadBenefitsPackages();
    } catch (error) {
      console.error("Error adding benefits package:", error);
      setBenefitsPackageError(error.message || t('settings.benefitsPackages.addError'));
    } finally {
      setAddingBenefitsPackage(false);
    }
  };

  const handleUpdateBenefitsPackage = async (id) => {
    if (!editingBenefitsPackageData) return;

    setAddingBenefitsPackage(true);
    setBenefitsPackageError('');

    try {
      await API(`/api/settings/benefits-packages/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingBenefitsPackageData.name.trim(),
          description: editingBenefitsPackageData.description || null,
          benefit_types: editingBenefitsPackageData.benefit_types || [],
          coverage_level: editingBenefitsPackageData.coverage_level || 'Standard',
          employee_cost: editingBenefitsPackageData.employee_cost || 0,
          employer_cost: editingBenefitsPackageData.employer_cost || 0
        })
      });

      setEditingBenefitsPackage(null);
      setEditingBenefitsPackageData(null);
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
    if (!editingWorkScheduleData) return;

    setAddingWorkSchedule(true);
    setWorkScheduleError('');

    try {
      await API(`/api/settings/work-schedules/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingWorkScheduleData.name.trim(),
          description: editingWorkScheduleData.description || null,
          start_time: editingWorkScheduleData.start_time,
          end_time: editingWorkScheduleData.end_time,
          days_of_week: editingWorkScheduleData.days_of_week || [],
          break_duration_minutes: editingWorkScheduleData.break_duration_minutes || 0,
          flexible_hours: editingWorkScheduleData.flexible_hours || false,
          max_hours_per_week: editingWorkScheduleData.max_hours_per_week || 40
        })
      });

      setEditingWorkSchedule(null);
      setEditingWorkScheduleData(null);
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
    if (!editingOvertimePolicyData) return;

    setAddingOvertimePolicy(true);
    setOvertimePolicyError('');

    try {
      await API(`/api/settings/overtime-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingOvertimePolicyData.name.trim(),
          description: editingOvertimePolicyData.description || null,
          weekly_threshold_hours: editingOvertimePolicyData.weekly_threshold_hours || 40,
          daily_threshold_hours: editingOvertimePolicyData.daily_threshold_hours || 8,
          multiplier: editingOvertimePolicyData.multiplier || 1.5,
          requires_approval: editingOvertimePolicyData.requires_approval !== false,
          applies_to_type: editingOvertimePolicyData.applies_to_type || 'All',
          applies_to_id: editingOvertimePolicyData.applies_to_id || null
        })
      });

      setEditingOvertimePolicy(null);
      setEditingOvertimePolicyData(null);
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
    if (!editingAttendancePolicyData) return;

    setAddingAttendancePolicy(true);
    setAttendancePolicyError('');

    try {
      await API(`/api/settings/attendance-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingAttendancePolicyData.name.trim(),
          description: editingAttendancePolicyData.description || null,
          late_grace_period_minutes: editingAttendancePolicyData.late_grace_period_minutes || 15,
          absence_limit_per_month: editingAttendancePolicyData.absence_limit_per_month || 3,
          tardiness_penalty_points: editingAttendancePolicyData.tardiness_penalty_points || 1,
          absence_penalty_points: editingAttendancePolicyData.absence_penalty_points || 3,
          point_threshold_termination: editingAttendancePolicyData.point_threshold_termination || 10,
          applies_to_type: editingAttendancePolicyData.applies_to_type || 'All',
          applies_to_id: editingAttendancePolicyData.applies_to_id || null
        })
      });

      setEditingAttendancePolicy(null);
      setEditingAttendancePolicyData(null);
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
    if (!editingRemoteWorkPolicyData) return;

    setAddingRemoteWorkPolicy(true);
    setRemoteWorkPolicyError('');

    try {
      await API(`/api/settings/remote-work-policies/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editingRemoteWorkPolicyData.name.trim(),
          description: editingRemoteWorkPolicyData.description || null,
          eligibility_type: editingRemoteWorkPolicyData.eligibility_type || 'All',
          eligibility_id: editingRemoteWorkPolicyData.eligibility_id || null,
          days_per_week_allowed: editingRemoteWorkPolicyData.days_per_week_allowed || 5,
          requires_approval: editingRemoteWorkPolicyData.requires_approval !== false,
          equipment_provided: editingRemoteWorkPolicyData.equipment_provided || null,
          equipment_policy: editingRemoteWorkPolicyData.equipment_policy || null
        })
      });

      setEditingRemoteWorkPolicy(null);
      setEditingRemoteWorkPolicyData(null);
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
  
  // Helper functions for edit state management
  const updateEditState = (category, key, value) => {
    setSettingsEdits(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value
      }
    }));
  };

  const getEditValue = (category, key, originalValue) => {
    return settingsEdits[category]?.[key] ?? originalValue;
  };

  const hasEdit = (category, key) => {
    return settingsEdits[category]?.[key] !== undefined;
  };

  // Handle saving a setting from local edits (works for ALL categories)
  const handleSaveSetting = async (category, key) => {
    if (settingsEdits[category]?.[key] === undefined) {
      return;
    }
    
    const value = settingsEdits[category][key];
    
    try {
      await handleSettingUpdate(category, key, value);
      // Remove from edits after successful save
      setSettingsEdits(prev => {
        const newEdits = { ...prev };
        if (newEdits[category]) {
          delete newEdits[category][key];
          if (Object.keys(newEdits[category]).length === 0) {
            delete newEdits[category];
          }
        }
        return newEdits;
      });
    } catch (error) {
      // Error already handled in handleSettingUpdate
      // Keep the edit in state so user can try again
    }
  };
  
  // Handle saving all system settings from refs (uncontrolled inputs)
  const handleSaveAllSystemSettings = async () => {
    const canManage = hasFullAccess(userRole);
    if (!canManage) return;
    
    const changes = [];
    
    // Read all values from refs and compare with original values
    Object.keys(systemSettingsRefs.current).forEach(key => {
      const ref = systemSettingsRefs.current[key];
      if (ref && ref.current) {
        const currentValue = ref.current.value;
        // Find original value from systemSettings
        const originalSetting = systemSettings.find(s => s.key === key);
        if (originalSetting && currentValue !== originalSetting.value) {
          changes.push({ key, value: currentValue });
        }
      }
    });
    
    if (changes.length === 0) return;
    
    // Set saving state for all changed keys
    setSaving(prev => {
      const newSaving = { ...prev };
      changes.forEach(({ key }) => { newSaving[key] = true; });
      return newSaving;
    });
    
    try {
      // Save all changes
      const savePromises = changes.map(({ key, value }) => 
        handleSettingUpdate('system', key, value)
      );
      
      await Promise.all(savePromises);
      
      // Reload system settings to sync
      await loadSettingsForTab('system');
    } catch (error) {
      console.error('Failed to save system settings:', error);
      alert(t('settings.saveError') || 'Failed to save settings: ' + error.message);
    } finally {
      setSaving(prev => {
        const newSaving = { ...prev };
        changes.forEach(({ key }) => { newSaving[key] = false; });
        return newSaving;
      });
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
  
  // Load trusted devices on mount (security tab is visible by default)
  useEffect(() => {
    loadTrustedDevices();
  }, []);
  
  // Load security settings on mount (commonly accessed tab)
  useEffect(() => {
    loadSettingsForTab('security');
  }, []);
  
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
        const originalBoolValue = parseBoolean(value);
        const editBoolValue = settingsEdits[category]?.[key] !== undefined 
          ? parseBoolean(settingsEdits[category][key])
          : originalBoolValue;
        const hasBoolEdit = hasEdit(category, key);
        
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium">{getSettingLabel(key)}</label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mt-1">{getSettingDescription(key)}</p>}
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-xs font-medium ${editBoolValue ? 'text-green-600' : 'text-red-600'}`}>
                {editBoolValue ? t('common.on') : t('common.off')}
              </span>
              <button
                onClick={() => updateEditState(category, key, !editBoolValue)}
                disabled={saving[key]}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                  editBoolValue 
                    ? 'bg-tahoe-success-bg hover:bg-tahoe-success-bg/80' 
                    : 'bg-tahoe-error-bg hover:bg-tahoe-error-bg/80'
                } ${saving[key] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-tahoe-bg-primary shadow-lg transition-transform duration-200 ${
                    editBoolValue ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {hasBoolEdit && (
                <button
                  onClick={() => handleSaveSetting(category, key)}
                  disabled={saving[key]}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving[key] ? t('settings.saving') || 'Saving...' : t('settings.save') || 'Save'}
                </button>
              )}
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
                className="form-select opacity-50 cursor-not-allowed border-red-500"
              >
                <option value="">{t('settings.noOptionsAvailable')}</option>
              </select>
              <p className="text-xs text-red-500 mt-1">{t('settings.noOptionsWarning')}</p>
            </div>
          );
        }
        
        const selectValue = getEditValue(category, key, value);
        const hasSelectEdit = hasEdit(category, key);
        
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              {getSettingLabel(key)}
            </label>
            {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
            <div className="flex gap-2">
              <select
                value={selectValue || ''}
                onChange={(e) => updateEditState(category, key, e.target.value)}
                disabled={saving[key]}
                className="flex-1 form-select disabled:opacity-50 disabled:cursor-not-allowed"
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
              {hasSelectEdit && (
                <button
                  onClick={() => handleSaveSetting(category, key)}
                  disabled={saving[key]}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving[key] ? t('settings.saving') || 'Saving...' : t('settings.save') || 'Save'}
                </button>
              )}
            </div>
          </div>
        );
        
      case "textarea":
        // For system settings: use uncontrolled input with ref (no state updates)
        // For other categories: use controlled input with state
        if (category === 'system') {
          // Create/get ref for this input
          if (!systemSettingsRefs.current[key]) {
            systemSettingsRefs.current[key] = React.createRef();
          }
          const textareaRef = systemSettingsRefs.current[key];
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <textarea
                ref={textareaRef}
                key={`system-${key}`}
                defaultValue={value || ''}
                disabled={saving[key]}
                rows={4}
                className="form-textarea resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
          );
        } else {
          // Other categories: use controlled input with Save button
          const textareaValue = getEditValue(category, key, value);
          const hasTextareaEdit = hasEdit(category, key);
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <div className="flex gap-2">
                <textarea
                  value={textareaValue || ''}
                  onChange={(e) => updateEditState(category, key, e.target.value)}
                  disabled={saving[key]}
                  rows={4}
                  className="flex-1 px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus resize-none"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                {hasTextareaEdit && (
                  <button
                    onClick={() => handleSaveSetting(category, key)}
                    disabled={saving[key]}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap self-start"
                  >
                    {saving[key] ? t('settings.saving') || 'Saving...' : t('settings.save') || 'Save'}
                  </button>
                )}
              </div>
            </div>
          );
        }
        
      case "number":
        // For system settings: use uncontrolled input with ref (no state updates)
        // For other categories: use controlled input with state
        if (category === 'system') {
          // Create/get ref for this input
          if (!systemSettingsRefs.current[key]) {
            systemSettingsRefs.current[key] = React.createRef();
          }
          const numberRef = systemSettingsRefs.current[key];
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <input
                ref={numberRef}
                key={`system-${key}`}
                type="text"
                defaultValue={value || ''}
                disabled={saving[key]}
                className="form-input"
              />
            </div>
          );
        } else {
          // Other categories: use controlled input with Save button
          const numberValue = getEditValue(category, key, value);
          const hasNumberEdit = hasEdit(category, key);
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={numberValue || ''}
                  onChange={(e) => updateEditState(category, key, e.target.value)}
                  disabled={saving[key]}
                  className="flex-1 px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus"
                />
                {hasNumberEdit && (
                  <button
                    onClick={() => handleSaveSetting(category, key)}
                    disabled={saving[key]}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {saving[key] ? t('settings.saving') || 'Saving...' : t('settings.save') || 'Save'}
                  </button>
                )}
              </div>
            </div>
          );
        }
        
      default:
        // For system settings: use uncontrolled input with ref (no state updates)
        // For other categories: use controlled input with state
        if (category === 'system') {
          // Create/get ref for this input
          if (!systemSettingsRefs.current[key]) {
            systemSettingsRefs.current[key] = React.createRef();
          }
          const textRef = systemSettingsRefs.current[key];
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <input
                ref={textRef}
                key={`system-${key}`}
                type={type === "email" ? "email" : "text"}
                defaultValue={value || ''}
                disabled={saving[key]}
                className="form-input"
              />
            </div>
          );
        } else {
          // Other categories: use controlled input with Save button
          const textValue = getEditValue(category, key, value);
          const hasTextEdit = hasEdit(category, key);
          
          return (
            <div>
              <label className="block text-sm font-medium mb-2">
                {getSettingLabel(key)}
              </label>
              {getSettingDescription(key) && <p className="text-xs text-secondary mb-2">{getSettingDescription(key)}</p>}
              <div className="flex gap-2">
                <input
                  type={type === "email" ? "email" : "text"}
                  value={textValue || ''}
                  onChange={(e) => updateEditState(category, key, e.target.value)}
                  disabled={saving[key]}
                  className="flex-1 px-3 py-2 card border border-primary rounded-lg focus:outline-none focus:border-focus"
                />
                {hasTextEdit && (
                  <button
                    onClick={() => handleSaveSetting(category, key)}
                    disabled={saving[key]}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {saving[key] ? t('settings.saving') || 'Saving...' : t('settings.save') || 'Save'}
                  </button>
                )}
              </div>
            </div>
          );
        }
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
            <div
              key={setting?.key || `setting-${index}`}
              className="card p-4"
            >
              {renderSettingField(setting, category)}
              {setting?.key && saving[setting.key] && (
                <div className="mt-2 text-xs text-tahoe-accent">{t('settings.saving')}</div>
              )}
            </div>
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
              <button
                onClick={() => setShowDepartmentsModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">🏢</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.departments.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.departments.description')}</p>
              </button>

              {/* Locations Button */}
              <button
                onClick={() => setShowLocationsModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">📍</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.locations.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.locations.description')}</p>
              </button>

              {/* Leave Policies Button */}
              <button
                onClick={() => setShowLeavePoliciesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">📋</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.leavePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.leavePolicies.description')}</p>
              </button>

              {/* Holidays Button */}
              <button
                onClick={() => setShowHolidaysModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">🎉</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.holidays.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.holidays.description')}</p>
              </button>

              {/* Job Titles Button */}
              <button
                onClick={() => setShowJobTitlesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">💼</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.jobTitles.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.jobTitles.description')}</p>
              </button>

              {/* Benefits Packages Button */}
              <button
                onClick={() => setShowBenefitsPackagesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">🎁</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.benefitsPackages.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.benefitsPackages.description')}</p>
              </button>

              {/* Work Schedules Button */}
              <button
                onClick={() => setShowWorkSchedulesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">⏰</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.workSchedules.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.workSchedules.description')}</p>
              </button>

              {/* Overtime Policies Button */}
              <button
                onClick={() => setShowOvertimePoliciesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">⏱️</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.overtimePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.overtimePolicies.description')}</p>
              </button>

              {/* Attendance Policies Button */}
              <button
                onClick={() => setShowAttendancePoliciesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">📊</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.attendancePolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.attendancePolicies.description')}</p>
              </button>

              {/* Remote Work Policies Button */}
              <button
                onClick={() => setShowRemoteWorkPoliciesModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">🏠</div>
                <h4 className="text-lg font-semibold mb-2">{t('settings.remoteWorkPolicies.title')}</h4>
                <p className="text-sm text-secondary">{t('settings.remoteWorkPolicies.description')}</p>
              </button>

              {/* Commission Structures Button */}
              <button
                onClick={() => setShowCommissionStructuresModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">💰</div>
                <h4 className="text-lg font-semibold mb-2">Commission Structures</h4>
                <p className="text-sm text-secondary">Configure commission percentages and thresholds for Sales Agents and Sales Managers</p>
              </button>

              {/* User Passwords Button */}
              <button
                onClick={() => setShowUserPasswordsModal(true)}
                className="card p-6 text-left hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
              >
                <div className="text-3xl mb-3">🔑</div>
                <h4 className="text-lg font-semibold mb-2">User Passwords</h4>
                <p className="text-sm text-secondary">Reset passwords for users who forgot their credentials.</p>
              </button>
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
    // Filter out commission structure settings - they should ONLY appear in the modal
    const filteredSettings = systemSettings.filter(setting => {
      const key = setting?.key || '';
      return !key.startsWith('sales_agent_threshold_') &&
             !key.startsWith('sales_manager_threshold_') &&
             key !== 'sales_agent_vacation_package_value';
    });
    
    const categories = {};
    filteredSettings.forEach(setting => {
      if (!categories[setting.category]) {
        categories[setting.category] = [];
      }
      categories[setting.category].push(setting);
    });

    return (
      <div className="space-y-8">
        {/* Save All Button for System Settings */}
        {canManage && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveAllSystemSettings}
              disabled={Object.values(saving).some(v => v === true)}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Object.values(saving).some(v => v === true) 
                ? (t('settings.saving') || 'Saving...') 
                : (t('settings.saveAll') || 'Save All')}
            </button>
          </div>
        )}
        
        {/* Regular System Settings */}
        {Object.entries(categories).map(([category, settings]) => (
          <div key={category}>
            <h4 className="text-md font-medium text-tahoe-text-primary mb-4">{category}</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="card p-4"
                >
                  {renderSettingField(setting, "system")}
                  {saving[setting.key] && (
                    <div className="mt-2 text-xs text-tahoe-accent">{t('settings.saving')}</div>
                  )}
                </div>
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
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
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
                    ref={departmentNameInputRef}
                    type="text"
                    defaultValue=""
                    placeholder={t('settings.departments.namePlaceholder')}
                    className="flex-1 px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    disabled={addingDepartment}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-4 rounded-tahoe-input border"
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
                          className="ml-4 btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            (departmentEmployeeCounts[dept.id] || 0) > 0
                              ? t('settings.departments.cannotDelete')
                              : t('settings.departments.delete')
                          }
                        >
                          {deletingDepartment === dept.id ? t('settings.departments.deleting') : t('settings.departments.delete')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LocationsModal = () => {
    if (!showLocationsModal) return null;
    const canManage = hasFullAccess(userRole);

    const handleClose = () => {
      setShowLocationsModal(false);
      setEditingLocation(null);
      setLocationError('');
      // Clear inputs
      if (locationInputRefs.current.name) locationInputRefs.current.name.value = '';
      if (locationInputRefs.current.region) locationInputRefs.current.region.value = '';
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">{t('settings.locations.title')}</h2>
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
            <p className="text-sm text-secondary mb-6">{t('settings.locations.description')}</p>

            {/* Add Location Form */}
            {canManage && (
              <div className="card p-6 mb-6">
                <h4 className="text-lg font-medium mb-4">{t('settings.locations.addNew')}</h4>
                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      ref={(el) => locationInputRefs.current.name = el}
                      type="text"
                      defaultValue=""
                      placeholder={t('settings.locations.namePlaceholder')}
                      className="flex-1 px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      maxLength={100}
                    />
                    <input
                      ref={(el) => locationInputRefs.current.region = el}
                      type="text"
                      defaultValue=""
                      placeholder={t('settings.locations.regionPlaceholder')}
                      className="flex-1 px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      maxLength={50}
                    />
                    <label className="flex items-center gap-2 px-4 py-2 rounded-tahoe-input border cursor-pointer transition-all duration-tahoe" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="w-4 h-4 text-tahoe-accent rounded focus:ring-tahoe-accent"
                      />
                      <span className="text-sm text-white">{t('settings.locations.active')}</span>
                    </label>
                    <button
                      type="submit"
                      disabled={addingLocation}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {addingLocation ? t('settings.locations.adding') : t('settings.locations.add')}
                    </button>
                  </div>
                  {locationError && (
                    <p className="text-sm text-red-400">{locationError}</p>
                  )}
                </form>
              </div>
            )}

            {/* Locations List */}
            <div className="card p-6">
              <h4 className="text-lg font-medium mb-4">{t('settings.locations.list')}</h4>
              {locations.length === 0 ? (
                <p className="text-secondary">{t('settings.locations.noLocations')}</p>
              ) : (
                <div className="space-y-3">
                  {locations.map((loc) => {
                    const isEditing = editingLocation?.id === loc.id;
                    return (
                      <div
                        key={loc.id}
                        className="p-4 rounded-tahoe-input border"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <input
                                type="text"
                                value={editingLocation.name}
                                onChange={(e) => setEditingLocation({...editingLocation, name: e.target.value})}
                                className="flex-1 px-3 py-2 rounded-tahoe-input border transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white"
                                placeholder={t('settings.locations.namePlaceholder')}
                              />
                              <input
                                type="text"
                                value={editingLocation.region || ''}
                                onChange={(e) => setEditingLocation({...editingLocation, region: e.target.value})}
                                className="flex-1 px-3 py-2 rounded-tahoe-input border transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white"
                                placeholder={t('settings.locations.regionPlaceholder')}
                              />
                              <label className="flex items-center gap-2 px-3 py-2 rounded-tahoe-input border transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingLocation.is_active}
                                  onChange={(e) => setEditingLocation({...editingLocation, is_active: e.target.checked})}
                                  className="w-4 h-4 text-tahoe-accent rounded"
                                />
                                <span className="text-sm text-white">{t('settings.locations.active')}</span>
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateLocation(loc.id, {
                                  name: editingLocation.name.trim(),
                                  region: editingLocation.region.trim() || null,
                                  is_active: editingLocation.is_active
                                })}
                                className="btn-primary"
                              >
                                {t('settings.locations.save')}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingLocation(null);
                                  setLocationError('');
                                }}
                                className="btn-secondary"
                              >
                                {t('settings.locations.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-white">{loc.name}</span>
                                {loc.region && (
                                  <span className="text-sm text-secondary">({loc.region})</span>
                                )}
                                {loc.is_active ? (
                                  <span className="px-2 py-1 text-xs bg-tahoe-success-bg/20 text-tahoe-success-text rounded">
                                    {t('settings.locations.active')}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs bg-tahoe-error-bg/20 text-tahoe-error-text rounded">
                                    {t('settings.locations.inactive')}
                                  </span>
                                )}
                              </div>
                              {locationEmployeeCounts[loc.id] !== undefined && (
                                <div className="text-sm text-secondary mt-1">
                                  {locationEmployeeCounts[loc.id] === 0
                                    ? t('settings.locations.noEmployees')
                                    : t('settings.locations.employeeCount', { count: locationEmployeeCounts[loc.id] })}
                                </div>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => setEditingLocation({...loc})}
                                  className="btn-primary"
                                >
                                  {t('settings.locations.edit')}
                                </button>
                                <button
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  disabled={deletingLocation === loc.id || (locationEmployeeCounts[loc.id] || 0) > 0}
                                  className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    (locationEmployeeCounts[loc.id] || 0) > 0
                                      ? t('settings.locations.cannotDelete', { count: locationEmployeeCounts[loc.id] })
                                      : t('settings.locations.delete')
                                  }
                                >
                                  {deletingLocation === loc.id ? t('settings.locations.deleting') : t('settings.locations.delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
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
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
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
                        ref={(el) => holidayInputRefs.current.date = el}
                        type="date"
                        defaultValue=""
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.holidays.descriptionLabel')} *</label>
                      <input
                        ref={(el) => holidayInputRefs.current.description = el}
                        type="text"
                        defaultValue=""
                        placeholder={t('settings.holidays.descriptionPlaceholder')}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
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
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
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
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
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
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div
                        key={holiday.id}
                        className={`flex items-center justify-between p-4 rounded-tahoe-input border ${isUpcoming ? 'border-yellow-600' : 'border-tahoe-border-primary'}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{holiday.description}</div>
                          <div className="text-sm text-secondary mt-1">
                            {holidayDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {holiday.is_company_closure && ` • ${t('settings.holidays.companyClosure')}`}
                            {isUpcoming && ` • ${t('settings.holidays.upcoming')}`}
                            {holiday.applies_to_type && holiday.applies_to_type !== 'All' && (
                              <span className="text-xs text-tahoe-accent ml-2">
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
                            className="ml-4 btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingHoliday === holiday.id ? t('settings.holidays.deleting') : t('settings.holidays.delete')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
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
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b">
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
                <form onSubmit={editingJobTitle && editingJobTitleData ? (e) => { e.preventDefault(); handleUpdateJobTitle(editingJobTitle); } : handleAddJobTitle} className="space-y-4" key={editingJobTitle || 'add-new'}>
                  {editingJobTitle && editingJobTitleData ? (
                    // Editing mode - keep controlled inputs
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.name')} *</label>
                          <input
                            type="text"
                            value={editingJobTitleData?.name ?? ''}
                            onChange={(e) => {
                              setEditingJobTitleData({...editingJobTitleData, name: e.target.value});
                              setJobTitleError('');
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.department')}</label>
                          <select
                            value={editingJobTitleData?.department_id ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setEditingJobTitleData({...editingJobTitleData, department_id: val});
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          >
                            <option value="">{t('settings.jobTitles.selectDepartment')}</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.descriptionLabel')}</label>
                        <textarea
                          value={editingJobTitleData?.description ?? ''}
                          onChange={(e) => {
                            setEditingJobTitleData({...editingJobTitleData, description: e.target.value});
                          }}
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          rows="2"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.levelGrade')}</label>
                          <input
                            type="text"
                            value={editingJobTitleData?.level_grade ?? ''}
                            onChange={(e) => {
                              setEditingJobTitleData({...editingJobTitleData, level_grade: e.target.value});
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.reportsTo')}</label>
                          <select
                            value={editingJobTitleData?.reports_to_id ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setEditingJobTitleData({...editingJobTitleData, reports_to_id: val});
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          >
                            <option value="">{t('settings.jobTitles.selectJobTitle')}</option>
                            {editingJobTitleData?.id ? jobTitles.filter(jt => jt.id !== editingJobTitleData.id).map(jt => (
                              <option key={jt.id} value={jt.id}>{jt.name}</option>
                            )) : null}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.minSalary')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingJobTitleData?.min_salary ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setEditingJobTitleData({...editingJobTitleData, min_salary: val});
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.maxSalary')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingJobTitleData?.max_salary ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setEditingJobTitleData({...editingJobTitleData, max_salary: val});
                            }}
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    // Add new mode - uncontrolled inputs
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.name')} *</label>
                          <input
                            ref={(el) => jobTitleInputRefs.current.name = el}
                            type="text"
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.department')}</label>
                          <select
                            ref={(el) => jobTitleInputRefs.current.department_id = el}
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          >
                            <option value="">{t('settings.jobTitles.selectDepartment')}</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.descriptionLabel')}</label>
                        <textarea
                          ref={(el) => jobTitleInputRefs.current.description = el}
                          defaultValue=""
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          rows="2"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.levelGrade')}</label>
                          <input
                            ref={(el) => jobTitleInputRefs.current.level_grade = el}
                            type="text"
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.reportsTo')}</label>
                          <select
                            ref={(el) => jobTitleInputRefs.current.reports_to_id = el}
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          >
                            <option value="">{t('settings.jobTitles.selectJobTitle')}</option>
                            {jobTitles.map(jt => (
                              <option key={jt.id} value={jt.id}>{jt.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.minSalary')}</label>
                          <input
                            ref={(el) => jobTitleInputRefs.current.min_salary = el}
                            type="number"
                            step="0.01"
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">{t('settings.jobTitles.maxSalary')}</label>
                          <input
                            ref={(el) => jobTitleInputRefs.current.max_salary = el}
                            type="number"
                            step="0.01"
                            defaultValue=""
                            className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addingJobTitle}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingJobTitle ? t('settings.jobTitles.saving') : (editingJobTitle ? t('settings.jobTitles.update') : t('settings.jobTitles.add'))}
                    </button>
                    {editingJobTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJobTitle(null);
                          setEditingJobTitleData(null);
                          setJobTitleError('');
                          // Clear uncontrolled inputs when switching back to add mode
                          if (jobTitleInputRefs.current.name) jobTitleInputRefs.current.name.value = '';
                          if (jobTitleInputRefs.current.description) jobTitleInputRefs.current.description.value = '';
                          if (jobTitleInputRefs.current.department_id) jobTitleInputRefs.current.department_id.value = '';
                          if (jobTitleInputRefs.current.level_grade) jobTitleInputRefs.current.level_grade.value = '';
                          if (jobTitleInputRefs.current.reports_to_id) jobTitleInputRefs.current.reports_to_id.value = '';
                          if (jobTitleInputRefs.current.min_salary) jobTitleInputRefs.current.min_salary.value = '';
                          if (jobTitleInputRefs.current.max_salary) jobTitleInputRefs.current.max_salary.value = '';
                        }}
                        className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white"
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
                    <div
                      key={jt.id}
                      className="flex items-center justify-between p-4 rounded-tahoe-input border"
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
                            onClick={() => {
                              const jobTitle = jobTitles.find(j => j.id === jt.id);
                              if (jobTitle) {
                                setEditingJobTitleData({...jobTitle});
                                setEditingJobTitle(jt.id);
                              } else {
                                console.error('Job title not found for editing:', jt.id);
                                setEditingJobTitle(null);
                                setEditingJobTitleData(null);
                                setJobTitleError(t('settings.jobTitles.notFound') || 'Job title not found');
                              }
                            }}
                            className="btn-primary"
                          >
                            {t('settings.jobTitles.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteJobTitle(jt.id)}
                            disabled={deletingJobTitle === jt.id || (jt.employee_count || 0) > 0}
                            className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                            title={jt.employee_count > 0 ? t('settings.jobTitles.cannotDelete') : t('settings.jobTitles.delete')}
                          >
                            {deletingJobTitle === jt.id ? t('settings.jobTitles.deleting') : t('settings.jobTitles.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b">
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
                  {editingBenefitsPackage ? (
                    // Editing mode - keep controlled inputs
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.name')} *</label>
                        <input
                          type="text"
                          value={editingBenefitsPackageData?.name ?? ''}
                          onChange={(e) => {
                            setEditingBenefitsPackageData({...editingBenefitsPackageData, name: e.target.value});
                            setBenefitsPackageError('');
                          }}
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.descriptionLabel')}</label>
                        <textarea
                          value={editingBenefitsPackageData?.description ?? ''}
                          onChange={(e) => {
                            setEditingBenefitsPackageData({...editingBenefitsPackageData, description: e.target.value});
                          }}
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          rows="2"
                        />
                      </div>
                    </>
                  ) : (
                    // Add new mode - uncontrolled inputs
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.name')} *</label>
                        <input
                          ref={(el) => benefitsPackageInputRefs.current.name = el}
                          type="text"
                          defaultValue=""
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.descriptionLabel')}</label>
                        <textarea
                          ref={(el) => benefitsPackageInputRefs.current.description = el}
                          defaultValue=""
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                          rows="2"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.benefitTypes')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {benefitTypesOptions.map(type => {
                        const pkg = editingBenefitsPackageData ?? newBenefitsPackage;
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
                                if (editingBenefitsPackageData) {
                                  setEditingBenefitsPackageData({...editingBenefitsPackageData, benefit_types: newTypes});
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
                        value={editingBenefitsPackageData?.coverage_level ?? newBenefitsPackage.coverage_level}
                        onChange={(e) => {
                          if (editingBenefitsPackageData) {
                            setEditingBenefitsPackageData({...editingBenefitsPackageData, coverage_level: e.target.value});
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, coverage_level: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
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
                        value={editingBenefitsPackageData?.employee_cost ?? newBenefitsPackage.employee_cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (editingBenefitsPackageData) {
                            setEditingBenefitsPackageData({...editingBenefitsPackageData, employee_cost: val});
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, employee_cost: val});
                          }
                        }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('settings.benefitsPackages.employerCost')}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBenefitsPackageData?.employer_cost ?? newBenefitsPackage.employer_cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (editingBenefitsPackageData) {
                            setEditingBenefitsPackageData({...editingBenefitsPackageData, employer_cost: val});
                          } else {
                            setNewBenefitsPackage({...newBenefitsPackage, employer_cost: val});
                          }
                        }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={addingBenefitsPackage}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingBenefitsPackage ? t('settings.benefitsPackages.saving') : (editingBenefitsPackage ? t('settings.benefitsPackages.update') : t('settings.benefitsPackages.add'))}
                    </button>
                    {editingBenefitsPackage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBenefitsPackage(null);
                          setEditingBenefitsPackageData(null);
                          setBenefitsPackageError('');
                        }}
                        className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white"
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
                    <div
                      key={bp.id}
                      className="flex items-center justify-between p-4 rounded-tahoe-input border"
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
                            onClick={() => {
                              const pkg = benefitsPackages.find(b => b.id === bp.id);
                              setEditingBenefitsPackageData(pkg ? {...pkg} : null);
                              setEditingBenefitsPackage(bp.id);
                            }}
                            className="btn-primary"
                          >
                            {t('settings.benefitsPackages.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteBenefitsPackage(bp.id)}
                            disabled={deletingBenefitsPackage === bp.id || (bp.employee_count || 0) > 0}
                            className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                            title={bp.employee_count > 0 ? t('settings.benefitsPackages.cannotDelete') : t('settings.benefitsPackages.delete')}
                          >
                            {deletingBenefitsPackage === bp.id ? t('settings.benefitsPackages.deleting') : t('settings.benefitsPackages.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Work Schedules Modal (Simplified - full implementation would be similar pattern)
  // ============================================================================

  const WorkSchedulesModal = () => {
    if (!showWorkSchedulesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowWorkSchedulesModal(false); setEditingWorkSchedule(null); setEditingWorkScheduleData(null); setWorkScheduleError(''); };
    const daysOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
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
                      <input type="text" value={editingWorkScheduleData?.name ?? newWorkSchedule.name}
                        onChange={(e) => { if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, name: e.target.value}); } else { setNewWorkSchedule({...newWorkSchedule, name: e.target.value}); } setWorkScheduleError(''); }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.descriptionLabel')}</label>
                      <textarea value={editingWorkScheduleData?.description ?? newWorkSchedule.description}
                        onChange={(e) => { if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, description: e.target.value}); } else { setNewWorkSchedule({...newWorkSchedule, description: e.target.value}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" rows="2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.startTime')} *</label>
                      <input type="time" value={editingWorkScheduleData?.start_time ?? newWorkSchedule.start_time}
                        onChange={(e) => { if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, start_time: e.target.value}); } else { setNewWorkSchedule({...newWorkSchedule, start_time: e.target.value}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.endTime')} *</label>
                      <input type="time" value={editingWorkScheduleData?.end_time ?? newWorkSchedule.end_time}
                        onChange={(e) => { if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, end_time: e.target.value}); } else { setNewWorkSchedule({...newWorkSchedule, end_time: e.target.value}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.daysOfWeek')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {daysOptions.map(day => {
                        const schedule = editingWorkScheduleData ?? newWorkSchedule;
                        const selected = (schedule?.days_of_week || []).includes(day);
                        return (
                          <label key={day} className="flex items-center">
                            <input type="checkbox" checked={selected} onChange={(e) => {
                              const currentDays = schedule?.days_of_week || [];
                              const newDays = e.target.checked ? [...currentDays, day] : currentDays.filter(d => d !== day);
                              if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, days_of_week: newDays}); }
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
                      <input type="number" value={editingWorkScheduleData?.break_duration_minutes ?? newWorkSchedule.break_duration_minutes}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 0; if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, break_duration_minutes: val}); } else { setNewWorkSchedule({...newWorkSchedule, break_duration_minutes: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div className="flex items-center mt-6"><input type="checkbox" checked={editingWorkScheduleData?.flexible_hours ?? newWorkSchedule.flexible_hours}
                      onChange={(e) => { if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, flexible_hours: e.target.checked}); } else { setNewWorkSchedule({...newWorkSchedule, flexible_hours: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                      <label className="text-sm">{t('settings.workSchedules.flexibleHours')}</label>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.workSchedules.maxHoursPerWeek')}</label>
                      <input type="number" value={editingWorkScheduleData?.max_hours_per_week ?? newWorkSchedule.max_hours_per_week}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 40; if (editingWorkScheduleData) { setEditingWorkScheduleData({...editingWorkScheduleData, max_hours_per_week: val}); } else { setNewWorkSchedule({...newWorkSchedule, max_hours_per_week: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingWorkSchedule} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingWorkSchedule ? t('settings.workSchedules.saving') : (editingWorkSchedule ? t('settings.workSchedules.update') : t('settings.workSchedules.add'))}
                    </button>
                    {editingWorkSchedule && <button type="button" onClick={() => { setEditingWorkSchedule(null); setEditingWorkScheduleData(null); setWorkScheduleError(''); }} className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white">{t('settings.workSchedules.cancel')}</button>}
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
                    <div key={ws.id} className="flex items-center justify-between p-4 rounded-tahoe-input border">
                      <div className="flex-1">
                        <div className="font-medium text-white">{ws.name}</div>
                        {ws.description && <div className="text-sm text-secondary mt-1">{ws.description}</div>}
                        <div className="text-xs text-secondary mt-1">{ws.start_time} - {ws.end_time} • {ws.days_of_week?.join(', ') || 'No days'} • {ws.flexible_hours ? t('settings.workSchedules.flexible') : t('settings.workSchedules.fixed')}</div>
                        {ws.employee_count > 0 && <div className="text-xs text-yellow-400 mt-1">{t('settings.workSchedules.inUse', { count: ws.employee_count })}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => {
                          const schedule = workSchedules.find(w => w.id === ws.id);
                          setEditingWorkScheduleData(schedule ? {...schedule} : null);
                          setEditingWorkSchedule(ws.id);
                        }} className="btn-primary">{t('settings.workSchedules.edit')}</button>
                        <button onClick={() => handleDeleteWorkSchedule(ws.id)} disabled={deletingWorkSchedule === ws.id || (ws.employee_count || 0) > 0} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed" title={ws.employee_count > 0 ? t('settings.workSchedules.cannotDelete') : t('settings.workSchedules.delete')}>
                          {deletingWorkSchedule === ws.id ? t('settings.workSchedules.deleting') : t('settings.workSchedules.delete')}
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Overtime Policies Modal (Simplified)
  // ============================================================================

  const OvertimePoliciesModal = () => {
    if (!showOvertimePoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowOvertimePoliciesModal(false); setEditingOvertimePolicy(null); setEditingOvertimePolicyData(null); setOvertimePolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
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
                    <input type="text" value={editingOvertimePolicyData?.name ?? newOvertimePolicy.name}
                      onChange={(e) => { if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, name: e.target.value}); } else { setNewOvertimePolicy({...newOvertimePolicy, name: e.target.value}); } setOvertimePolicyError(''); }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.descriptionLabel')}</label>
                    <textarea value={editingOvertimePolicyData?.description ?? newOvertimePolicy.description}
                      onChange={(e) => { if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, description: e.target.value}); } else { setNewOvertimePolicy({...newOvertimePolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.weeklyThreshold')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicyData?.weekly_threshold_hours ?? newOvertimePolicy.weekly_threshold_hours}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 40; if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, weekly_threshold_hours: val}); } else { setNewOvertimePolicy({...newOvertimePolicy, weekly_threshold_hours: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.dailyThreshold')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicyData?.daily_threshold_hours ?? newOvertimePolicy.daily_threshold_hours}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 8; if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, daily_threshold_hours: val}); } else { setNewOvertimePolicy({...newOvertimePolicy, daily_threshold_hours: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.multiplier')}</label>
                      <input type="number" step="0.1" value={editingOvertimePolicyData?.multiplier ?? newOvertimePolicy.multiplier}
                        onChange={(e) => { const val = parseFloat(e.target.value) || 1.5; if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, multiplier: val}); } else { setNewOvertimePolicy({...newOvertimePolicy, multiplier: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center"><input type="checkbox" checked={editingOvertimePolicyData?.requires_approval ?? newOvertimePolicy.requires_approval}
                      onChange={(e) => { if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, requires_approval: e.target.checked}); } else { setNewOvertimePolicy({...newOvertimePolicy, requires_approval: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                      <label className="text-sm">{t('settings.overtimePolicies.requiresApproval')}</label>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.overtimePolicies.appliesTo')}</label>
                      <select value={editingOvertimePolicyData?.applies_to_type ?? newOvertimePolicy.applies_to_type}
                        onChange={(e) => { if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, applies_to_type: e.target.value, applies_to_id: null}); } else { setNewOvertimePolicy({...newOvertimePolicy, applies_to_type: e.target.value, applies_to_id: null}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                        <option value="All">{t('settings.overtimePolicies.all')}</option>
                        <option value="Department">{t('settings.overtimePolicies.department')}</option>
                        <option value="JobTitle">{t('settings.overtimePolicies.jobTitle')}</option>
                      </select>
                    </div>
                    {(editingOvertimePolicyData?.applies_to_type ?? newOvertimePolicy.applies_to_type) !== 'All' && (
                      <div><label className="block text-sm font-medium mb-2">
                        {(editingOvertimePolicyData?.applies_to_type ?? newOvertimePolicy.applies_to_type) === 'Department' ? t('settings.overtimePolicies.selectDepartment') : t('settings.overtimePolicies.selectJobTitle')}
                      </label>
                        <select value={editingOvertimePolicyData?.applies_to_id ?? newOvertimePolicy.applies_to_id ?? ''}
                          onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingOvertimePolicyData) { setEditingOvertimePolicyData({...editingOvertimePolicyData, applies_to_id: val}); } else { setNewOvertimePolicy({...newOvertimePolicy, applies_to_id: val}); } }}
                          className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                          <option value="">{t('settings.overtimePolicies.select')}</option>
                          {(editingOvertimePolicyData?.applies_to_type ?? newOvertimePolicy.applies_to_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingOvertimePolicy} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingOvertimePolicy ? t('settings.overtimePolicies.saving') : (editingOvertimePolicy ? t('settings.overtimePolicies.update') : t('settings.overtimePolicies.add'))}
                    </button>
                    {editingOvertimePolicy && <button type="button" onClick={() => { setEditingOvertimePolicy(null); setEditingOvertimePolicyData(null); setOvertimePolicyError(''); }} className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white">{t('settings.overtimePolicies.cancel')}</button>}
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
                    <div key={op.id} className="flex items-center justify-between p-4 rounded-tahoe-input border">
                      <div className="flex-1">
                        <div className="font-medium text-white">{op.name}</div>
                        {op.description && <div className="text-sm text-secondary mt-1">{op.description}</div>}
                        <div className="text-xs text-secondary mt-1">{t('settings.overtimePolicies.weeklyThreshold')}: {op.weekly_threshold_hours}h • {t('settings.overtimePolicies.dailyThreshold')}: {op.daily_threshold_hours}h • {t('settings.overtimePolicies.multiplier')}: {op.multiplier}x</div>
                        {op.applies_to_name && <div className="text-xs text-secondary mt-1">{t('settings.overtimePolicies.appliesTo')}: {op.applies_to_name}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => {
                          const policy = overtimePolicies.find(o => o.id === op.id);
                          setEditingOvertimePolicyData(policy ? {...policy} : null);
                          setEditingOvertimePolicy(op.id);
                        }} className="btn-primary">{t('settings.overtimePolicies.edit')}</button>
                        <button onClick={() => handleDeleteOvertimePolicy(op.id)} disabled={deletingOvertimePolicy === op.id} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed">
                          {deletingOvertimePolicy === op.id ? t('settings.overtimePolicies.deleting') : t('settings.overtimePolicies.delete')}
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Attendance Policies Modal (Simplified)
  // ============================================================================

  const AttendancePoliciesModal = () => {
    if (!showAttendancePoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowAttendancePoliciesModal(false); setEditingAttendancePolicy(null); setEditingAttendancePolicyData(null); setAttendancePolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
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
                    <input type="text" value={editingAttendancePolicyData?.name ?? newAttendancePolicy.name}
                      onChange={(e) => { if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, name: e.target.value}); } else { setNewAttendancePolicy({...newAttendancePolicy, name: e.target.value}); } setAttendancePolicyError(''); }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.descriptionLabel')}</label>
                    <textarea value={editingAttendancePolicyData?.description ?? newAttendancePolicy.description}
                      onChange={(e) => { if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, description: e.target.value}); } else { setNewAttendancePolicy({...newAttendancePolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.lateGracePeriod')}</label>
                      <input type="number" value={editingAttendancePolicyData?.late_grace_period_minutes ?? newAttendancePolicy.late_grace_period_minutes}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 15; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, late_grace_period_minutes: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, late_grace_period_minutes: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.absenceLimitPerMonth')}</label>
                      <input type="number" value={editingAttendancePolicyData?.absence_limit_per_month ?? newAttendancePolicy.absence_limit_per_month}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 3; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, absence_limit_per_month: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, absence_limit_per_month: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.tardinessPenalty')}</label>
                      <input type="number" value={editingAttendancePolicyData?.tardiness_penalty_points ?? newAttendancePolicy.tardiness_penalty_points}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 1; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, tardiness_penalty_points: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, tardiness_penalty_points: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.absencePenalty')}</label>
                      <input type="number" value={editingAttendancePolicyData?.absence_penalty_points ?? newAttendancePolicy.absence_penalty_points}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 3; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, absence_penalty_points: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, absence_penalty_points: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.pointThresholdTermination')}</label>
                      <input type="number" value={editingAttendancePolicyData?.point_threshold_termination ?? newAttendancePolicy.point_threshold_termination}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 10; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, point_threshold_termination: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, point_threshold_termination: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.attendancePolicies.appliesTo')}</label>
                      <select value={editingAttendancePolicyData?.applies_to_type ?? newAttendancePolicy.applies_to_type}
                        onChange={(e) => { if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, applies_to_type: e.target.value, applies_to_id: null}); } else { setNewAttendancePolicy({...newAttendancePolicy, applies_to_type: e.target.value, applies_to_id: null}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                        <option value="All">{t('settings.attendancePolicies.all')}</option>
                        <option value="Department">{t('settings.attendancePolicies.department')}</option>
                        <option value="JobTitle">{t('settings.attendancePolicies.jobTitle')}</option>
                      </select>
                    </div>
                  </div>
                  {(editingAttendancePolicyData?.applies_to_type ?? newAttendancePolicy.applies_to_type) !== 'All' && (
                    <div><label className="block text-sm font-medium mb-2">
                      {(editingAttendancePolicyData?.applies_to_type ?? newAttendancePolicy.applies_to_type) === 'Department' ? t('settings.attendancePolicies.selectDepartment') : t('settings.attendancePolicies.selectJobTitle')}
                    </label>
                      <select value={editingAttendancePolicyData?.applies_to_id ?? newAttendancePolicy.applies_to_id ?? ''}
                        onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingAttendancePolicyData) { setEditingAttendancePolicyData({...editingAttendancePolicyData, applies_to_id: val}); } else { setNewAttendancePolicy({...newAttendancePolicy, applies_to_id: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                        <option value="">{t('settings.attendancePolicies.select')}</option>
                        {(editingAttendancePolicyData?.applies_to_type ?? newAttendancePolicy.applies_to_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingAttendancePolicy} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingAttendancePolicy ? t('settings.attendancePolicies.saving') : (editingAttendancePolicy ? t('settings.attendancePolicies.update') : t('settings.attendancePolicies.add'))}
                    </button>
                    {editingAttendancePolicy && <button type="button" onClick={() => { setEditingAttendancePolicy(null); setEditingAttendancePolicyData(null); setAttendancePolicyError(''); }} className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white">{t('settings.attendancePolicies.cancel')}</button>}
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
                    <div key={ap.id} className="flex items-center justify-between p-4 rounded-tahoe-input border">
                      <div className="flex-1">
                        <div className="font-medium text-white">{ap.name}</div>
                        {ap.description && <div className="text-sm text-secondary mt-1">{ap.description}</div>}
                        <div className="text-xs text-secondary mt-1">
                          {t('settings.attendancePolicies.lateGracePeriod')}: {ap.late_grace_period_minutes}min • {t('settings.attendancePolicies.absenceLimitPerMonth')}: {ap.absence_limit_per_month} • {t('settings.attendancePolicies.pointThresholdTermination')}: {ap.point_threshold_termination}
                        </div>
                        {ap.applies_to_name && <div className="text-xs text-secondary mt-1">{t('settings.attendancePolicies.appliesTo')}: {ap.applies_to_name}</div>}
                      </div>
                      {canManage && <div className="flex gap-2">
                        <button onClick={() => {
                          const policy = attendancePolicies.find(a => a.id === ap.id);
                          setEditingAttendancePolicyData(policy ? {...policy} : null);
                          setEditingAttendancePolicy(ap.id);
                        }} className="btn-primary">{t('settings.attendancePolicies.edit')}</button>
                        <button onClick={() => handleDeleteAttendancePolicy(ap.id)} disabled={deletingAttendancePolicy === ap.id} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed">
                          {deletingAttendancePolicy === ap.id ? t('settings.attendancePolicies.deleting') : t('settings.attendancePolicies.delete')}
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Commission Structures Modal
  // ============================================================================
  
  const CommissionStructuresModal = () => {
    if (!showCommissionStructuresModal) return null;
    const canManage = hasFullAccess(userRole);
    
    const [localCommissionStructures, setLocalCommissionStructures] = useState({
      salesAgent: Array(7).fill(null).map(() => ({ leadPct: '', revenue: '', commission: '' })),
      vacationPackage: '',
      salesManager: Array(6).fill(null).map(() => ({ min: '', max: '', commission: '' }))
    });
    const [localSaving, setLocalSaving] = useState(false);
    const initialLoadRef = useRef(false);
    
    useEffect(() => {
      if (showCommissionStructuresModal && !commissionStructuresLoaded) {
        loadCommissionStructures().then(() => {
          setLocalCommissionStructures(commissionStructures);
          initialLoadRef.current = true;
        });
      } else if (showCommissionStructuresModal && commissionStructuresLoaded && !initialLoadRef.current) {
        // Only set on first open after load, not on every render
        setLocalCommissionStructures(commissionStructures);
        initialLoadRef.current = true;
      }
      
      if (!showCommissionStructuresModal) {
        initialLoadRef.current = false;
      }
    }, [showCommissionStructuresModal, commissionStructuresLoaded]);
    
    const handleSave = async () => {
      if (!canManage) return;
      
      setLocalSaving(true);
      
      try {
        // Save Sales Agent thresholds
        for (let i = 0; i < 7; i++) {
          const threshold = localCommissionStructures.salesAgent[i];
          if (threshold.leadPct && threshold.revenue && threshold.commission) {
            const value = `${threshold.leadPct},${threshold.revenue},${threshold.commission}`;
            await API(`/api/settings/system/sales_agent_threshold_${i + 1}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ value })
            }).catch(err => console.error(`Error saving threshold ${i + 1}:`, err));
          }
        }
        
        // Save vacation package
        if (localCommissionStructures.vacationPackage) {
          await API('/api/settings/system/sales_agent_vacation_package_value', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: localCommissionStructures.vacationPackage })
          }).catch(err => console.error('Error saving vacation package:', err));
        }
        
        // Save Sales Manager thresholds
        for (let i = 0; i < 6; i++) {
          const threshold = localCommissionStructures.salesManager[i];
          if (threshold.min && threshold.max && threshold.commission) {
            const value = `${threshold.min},${threshold.max},${threshold.commission}`;
            await API(`/api/settings/system/sales_manager_threshold_${i + 1}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ value })
            }).catch(err => console.error(`Error saving manager threshold ${i + 1}:`, err));
          }
        }
        
        // Update global state
        setCommissionStructures(localCommissionStructures);
        setCommissionStructuresLoaded(true);
        
        alert('Commission structures saved successfully');
        setShowCommissionStructuresModal(false);
      } catch (error) {
        console.error('Error saving commission structures:', error);
        alert('Error saving commission structures: ' + error.message);
      } finally {
        setLocalSaving(false);
      }
    };
    
    const handleClose = () => {
      setShowCommissionStructuresModal(false);
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">Commission Structures</h2>
            <button onClick={handleClose} className="text-secondary hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-secondary mb-6">Configure commission percentages and thresholds for Sales Agents and Sales Managers</p>
            
            {canManage && (
              <>
                {/* Sales Agents Commission Structure */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-primary mb-4">Sales Agents Commission Structure</h4>
                  <div className="space-y-3">
                    {localCommissionStructures.salesAgent.map((threshold, index) => (
                      <div key={index} className="grid grid-cols-4 gap-3 items-end p-3 bg-tahoe-bg-secondary/50 rounded-tahoe-input">
                        <div>
                          <label className="block text-xs text-secondary mb-1">Lead Conversion %</label>
                          <input
                            type="number"
                            value={threshold.leadPct}
                            onChange={(e) => {
                              const newAgent = [...localCommissionStructures.salesAgent];
                              newAgent[index] = { ...newAgent[index], leadPct: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesAgent: newAgent });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary mb-1">Revenue Threshold</label>
                          <input
                            type="number"
                            value={threshold.revenue}
                            onChange={(e) => {
                              const newAgent = [...localCommissionStructures.salesAgent];
                              newAgent[index] = { ...newAgent[index], revenue: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesAgent: newAgent });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="115000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary mb-1">Commission %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={threshold.commission}
                            onChange={(e) => {
                              const newAgent = [...localCommissionStructures.salesAgent];
                              newAgent[index] = { ...newAgent[index], commission: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesAgent: newAgent });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="3.5"
                          />
                        </div>
                        <div className="text-xs text-secondary">
                          Threshold {index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Vacation Package */}
                    <div className="grid grid-cols-2 gap-3 items-end p-3 bg-tahoe-bg-secondary/50 rounded-lg mt-4">
                      <div>
                        <label className="block text-xs text-secondary mb-1">Vacation Package Value ($)</label>
                        <input
                          type="number"
                          value={localCommissionStructures.vacationPackage}
                          onChange={(e) => {
                            setLocalCommissionStructures({ ...localCommissionStructures, vacationPackage: e.target.value });
                          }}
                          className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                          placeholder="5000"
                        />
                      </div>
                      <div className="text-xs text-secondary">
                        For threshold with ≥55% leads & ≥$250k revenue
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sales Managers Commission Structure */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-primary mb-4">Sales Managers Commission Structure</h4>
                  <div className="space-y-3">
                    {localCommissionStructures.salesManager.map((threshold, index) => (
                      <div key={index} className="grid grid-cols-4 gap-3 items-end p-3 bg-tahoe-bg-secondary/50 rounded-tahoe-input">
                        <div>
                          <label className="block text-xs text-secondary mb-1">Min Booking %</label>
                          <input
                            type="number"
                            value={threshold.min}
                            onChange={(e) => {
                              const newManager = [...localCommissionStructures.salesManager];
                              newManager[index] = { ...newManager[index], min: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesManager: newManager });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary mb-1">Max Booking %</label>
                          <input
                            type="number"
                            value={threshold.max}
                            onChange={(e) => {
                              const newManager = [...localCommissionStructures.salesManager];
                              newManager[index] = { ...newManager[index], max: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesManager: newManager });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="19"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-secondary mb-1">Commission %</label>
                          <input
                            type="number"
                            step="0.001"
                            value={threshold.commission}
                            onChange={(e) => {
                              const newManager = [...localCommissionStructures.salesManager];
                              newManager[index] = { ...newManager[index], commission: e.target.value };
                              setLocalCommissionStructures({ ...localCommissionStructures, salesManager: newManager });
                            }}
                            className="w-full px-3 py-2 bg-tahoe-input-bg border border-tahoe-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-tahoe-text-primary"
                            placeholder="0.25"
                          />
                        </div>
                        <div className="text-xs text-secondary">
                          Range {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={localSaving}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {localSaving ? 'Saving...' : 'Save All Changes'}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            
            {!canManage && (
              <div className="text-center py-8">
                <p className="text-secondary">You don't have permission to manage commission structures</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Remote Work Policies Modal (Simplified)
  // ============================================================================

  const RemoteWorkPoliciesModal = () => {
    if (!showRemoteWorkPoliciesModal) return null;
    const canManage = hasFullAccess(userRole);
    const handleClose = () => { setShowRemoteWorkPoliciesModal(false); setEditingRemoteWorkPolicy(null); setEditingRemoteWorkPolicyData(null); setRemoteWorkPolicyError(''); };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
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
                    <input type="text" value={editingRemoteWorkPolicyData?.name ?? newRemoteWorkPolicy.name}
                      onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, name: e.target.value}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, name: e.target.value}); } setRemoteWorkPolicyError(''); }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" required />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.descriptionLabel')}</label>
                    <textarea value={editingRemoteWorkPolicyData?.description ?? newRemoteWorkPolicy.description}
                      onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, description: e.target.value}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, description: e.target.value}); } }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" rows="2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.eligibilityCriteria')}</label>
                      <select value={editingRemoteWorkPolicyData?.eligibility_type ?? newRemoteWorkPolicy.eligibility_type}
                        onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, eligibility_type: e.target.value, eligibility_id: null}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, eligibility_type: e.target.value, eligibility_id: null}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                        <option value="All">{t('settings.remoteWorkPolicies.all')}</option>
                        <option value="Department">{t('settings.remoteWorkPolicies.department')}</option>
                        <option value="JobTitle">{t('settings.remoteWorkPolicies.jobTitle')}</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.daysPerWeekAllowed')}</label>
                      <input type="number" min="0" max="5" value={editingRemoteWorkPolicyData?.days_per_week_allowed ?? newRemoteWorkPolicy.days_per_week_allowed}
                        onChange={(e) => { const val = parseInt(e.target.value, 10) || 5; if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, days_per_week_allowed: val}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, days_per_week_allowed: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                    </div>
                  </div>
                  {(editingRemoteWorkPolicyData?.eligibility_type ?? newRemoteWorkPolicy.eligibility_type) !== 'All' && (
                    <div><label className="block text-sm font-medium mb-2">
                      {(editingRemoteWorkPolicyData?.eligibility_type ?? newRemoteWorkPolicy.eligibility_type) === 'Department' ? t('settings.remoteWorkPolicies.selectDepartment') : t('settings.remoteWorkPolicies.selectJobTitle')}
                    </label>
                      <select value={editingRemoteWorkPolicyData?.eligibility_id ?? newRemoteWorkPolicy.eligibility_id ?? ''}
                        onChange={(e) => { const val = e.target.value ? parseInt(e.target.value, 10) : null; if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, eligibility_id: val}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, eligibility_id: val}); } }}
                        className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white">
                        <option value="">{t('settings.remoteWorkPolicies.select')}</option>
                        {(editingRemoteWorkPolicyData?.eligibility_type ?? newRemoteWorkPolicy.eligibility_type) === 'Department' ? departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>) : jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center"><input type="checkbox" checked={editingRemoteWorkPolicyData?.requires_approval ?? newRemoteWorkPolicy.requires_approval}
                    onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, requires_approval: e.target.checked}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, requires_approval: e.target.checked}); } }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="mr-2" />
                    <label className="text-sm">{t('settings.remoteWorkPolicies.requiresApproval')}</label>
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.equipmentProvided')}</label>
                    <input type="text" value={editingRemoteWorkPolicyData?.equipment_provided ?? newRemoteWorkPolicy.equipment_provided}
                      onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, equipment_provided: e.target.value}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, equipment_provided: e.target.value}); } }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" />
                  </div>
                  <div><label className="block text-sm font-medium mb-2">{t('settings.remoteWorkPolicies.equipmentPolicy')}</label>
                    <textarea value={editingRemoteWorkPolicyData?.equipment_policy ?? newRemoteWorkPolicy.equipment_policy}
                      onChange={(e) => { if (editingRemoteWorkPolicyData) { setEditingRemoteWorkPolicyData({...editingRemoteWorkPolicyData, equipment_policy: e.target.value}); } else { setNewRemoteWorkPolicy({...newRemoteWorkPolicy, equipment_policy: e.target.value}); } }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white" rows="3" />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingRemoteWorkPolicy} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingRemoteWorkPolicy ? t('settings.remoteWorkPolicies.saving') : (editingRemoteWorkPolicy ? t('settings.remoteWorkPolicies.update') : t('settings.remoteWorkPolicies.add'))}
                    </button>
                    {editingRemoteWorkPolicy && <button type="button" onClick={() => { setEditingRemoteWorkPolicy(null); setEditingRemoteWorkPolicyData(null); setRemoteWorkPolicyError(''); }} className="px-6 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg text-white">{t('settings.remoteWorkPolicies.cancel')}</button>}
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
                    <div key={rwp.id} className="flex items-center justify-between p-4 rounded-tahoe-input border">
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
                        <button onClick={() => {
                          const policy = remoteWorkPolicies.find(r => r.id === rwp.id);
                          setEditingRemoteWorkPolicyData(policy ? {...policy} : null);
                          setEditingRemoteWorkPolicy(rwp.id);
                        }} className="btn-primary">{t('settings.remoteWorkPolicies.edit')}</button>
                        <button onClick={() => handleDeleteRemoteWorkPolicy(rwp.id)} disabled={deletingRemoteWorkPolicy === rwp.id} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed">
                          {deletingRemoteWorkPolicy === rwp.id ? t('settings.remoteWorkPolicies.deleting') : t('settings.remoteWorkPolicies.delete')}
                        </button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // User Passwords Modal (memoized to prevent re-creation on every render)
  const UserPasswordsModal = useMemo(() => {
    if (!showUserPasswordsModal) return null;

    const handleClose = () => {
      setShowUserPasswordsModal(false);
      setUserPasswordError('');
      setUserPasswordSuccess(false);
      setSelectedUserId('');
      setSelectedUserName('');
      setUserSearchQuery('');
      setShowUserDropdown(false);
      setShowPassword(false);
      // Clear the password input ref and value ref
      userPasswordValueRef.current = '';
      if (userPasswordInputRef.current) {
        userPasswordInputRef.current.value = '';
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}>
        <div className="bg-black/50 absolute inset-0" />
        <div
          className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">User Passwords</h2>
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
            <p className="text-sm text-secondary mb-6">
              Reset passwords for users who have forgotten their credentials. Select a user and set a new password.
            </p>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              {/* User Selection */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Search User</label>
                <div className="relative">
                  <input
                    data-user-search-input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Type to search employees..."
                    className="w-full px-4 py-2 pl-10 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        handleUserSearch('');
                        setSelectedUserId('');
                        setSelectedUserName('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Dropdown Results */}
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div 
                    data-user-dropdown
                    className="absolute z-50 w-full mt-1 rounded-tahoe-input shadow-xl max-h-60 overflow-y-auto"
                    style={{ backgroundColor: 'rgba(22, 22, 24, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                  >
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full px-4 py-3 text-left hover:bg-tahoe-bg-hover transition-colors border-b border-tahoe-border-primary last:border-b-0"
                      >
                        <div className="font-medium text-white">
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </div>
                        <div className="text-sm text-secondary">{user.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showUserDropdown && filteredUsers.length === 0 && userSearchQuery && (
                  <div 
                    className="absolute z-50 w-full mt-1 rounded-tahoe-input shadow-xl px-4 py-3"
                    style={{ backgroundColor: 'rgba(22, 22, 24, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                  >
                    <p className="text-secondary text-sm">No employees found matching "{userSearchQuery}"</p>
                  </div>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <div className="relative">
                  <input
                    ref={userPasswordInputRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min 8 characters)"
                    className="w-full px-4 py-2 pr-12 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                    minLength={8}
                    onChange={(e) => {
                      userPasswordValueRef.current = e.target.value;
                    }}
                    defaultValue={userPasswordValueRef.current}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-secondary mt-1">Password must be at least 8 characters long</p>
              </div>

              {/* Error Message */}
              {userPasswordError && (
                <div className="bg-red-900/20 border border-red-600 p-3 rounded-lg">
                  <p className="text-red-400 text-sm">{userPasswordError}</p>
                </div>
              )}

              {/* Success Message */}
              {userPasswordSuccess && (
                <div className="bg-green-900/20 border border-green-600 p-3 rounded-lg">
                  <p className="text-green-400 text-sm">Password has been reset successfully.</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-colors"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || !selectedUserId}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }, [
    showUserPasswordsModal,
    userSearchQuery,
    filteredUsers,
    showUserDropdown,
    selectedUserId,
    userPasswordError,
    userPasswordSuccess,
    savingPassword,
    showPassword // Re-added with useEffect to restore password value
  ]);

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
            data-tab-button
            data-tab-id={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-tahoe-pill text-sm font-medium transition-colors ${
              activeTabRef.current === tab.id
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
        <div data-tab-content data-tab-id="system" className="card" style={{ display: activeTabRef.current === 'system' ? 'block' : 'none' }}>
          {renderSystemSettings()}
        </div>
        
        <div data-tab-content data-tab-id="preferences" className="card" style={{ display: activeTabRef.current === 'preferences' ? 'block' : 'none' }}>
          {renderSettingsSection(userPreferences, "preferences", t('settings.userPreferences'))}
        </div>
        
        <div data-tab-content data-tab-id="notifications" className="card" style={{ display: activeTabRef.current === 'notifications' ? 'block' : 'none' }}>
          {renderSettingsSection(notifications, "notifications", t('settings.notificationSettings'))}
        </div>
        
        <div data-tab-content data-tab-id="security" style={{ display: activeTabRef.current === 'security' ? 'block' : 'none' }}>
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
                className="btn-primary hover:opacity-90"
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
                      className="flex items-start justify-between p-4 bg-tahoe-card-bg bg-opacity-40 rounded-lg border hover:border-tahoe-border-primary transition-all"
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
        </div>
        
        <div data-tab-content data-tab-id="maintenance" style={{ display: activeTabRef.current === 'maintenance' ? 'block' : 'none' }}>
          <div className="card">
            {renderSettingsSection(maintenance, "maintenance", t('settings.maintenanceAndBackup'))}
          </div>
        </div>
      </div>
      
      {/* MFA Setup Modal */}
      {showMFAModal && mfaData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-tahoe-card-bg rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-4">{t('settings.mfaSetup.title')}</h2>
            
            <div className="space-y-4">
              {/* Step 1: Scan QR Code */}
              <div>
                <h3 className="font-semibold mb-2">{t('settings.mfaSetup.step1')}</h3>
                <p className="text-sm text-secondary mb-3">
                  {t('settings.mfaSetup.step1Description')}
                </p>
                <div className="bg-tahoe-bg-primary p-4 rounded-lg flex justify-center">
                  <img src={mfaData.qrCode} alt={t('settings.mfaSetup.qrCodeAlt')} className="w-48 h-48" />
                </div>
              </div>
              
              {/* Manual Entry */}
              <div>
                <p className="text-sm text-secondary mb-1">{t('settings.mfaSetup.orManualEntry')}</p>
                <div className="bg-tahoe-card-bg p-3 rounded font-mono text-sm break-all">
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
                  className="w-full px-4 py-3 bg-tahoe-card-bg border rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-tahoe-accent focus:ring-2"
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
                  <div className="grid grid-cols-2 gap-2 bg-tahoe-card-bg p-3 rounded font-mono text-sm">
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
                  className="flex-1 px-4 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {t('settings.cancel')}
                </button>
                <button
                  onClick={verifyMFACode}
                  disabled={mfaVerifying || mfaVerificationCode.length !== 6}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mfaVerifying ? t('settings.mfaSetup.verifying') : t('settings.mfaSetup.enableMFA')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-tahoe-card-bg rounded-lg shadow-xl max-w-md w-full p-6"
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
                  className="w-full px-4 py-2 bg-tahoe-card-bg border rounded-lg focus:outline-none focus:ring-tahoe-accent focus:ring-2"
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
                  className="w-full px-4 py-2 bg-tahoe-card-bg border rounded-lg focus:outline-none focus:ring-tahoe-accent focus:ring-2"
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
                  className="w-full px-4 py-2 bg-tahoe-card-bg border rounded-lg focus:outline-none focus:ring-tahoe-accent focus:ring-2"
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
                  className="flex-1 px-4 py-2 bg-tahoe-bg-secondary hover:bg-tahoe-bg-hover rounded-lg font-medium transition-colors"
                  disabled={passwordSuccess}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={passwordSuccess}
                >
                  {t('settings.changePassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Management Modals */}
      <DepartmentsModal />
      <LocationsModal />
      <LeaveConfigModal 
        isOpen={showLeavePoliciesModal}
        onClose={() => setShowLeavePoliciesModal(false)}
        initialTab="leave-types"
      />
      <HolidaysModal />
      <JobTitlesModal />
      <BenefitsPackagesModal />
      <WorkSchedulesModal />
      <OvertimePoliciesModal />
      <AttendancePoliciesModal />
      <RemoteWorkPoliciesModal />
      <CommissionStructuresModal />
      {UserPasswordsModal}
    </div>
  );
}