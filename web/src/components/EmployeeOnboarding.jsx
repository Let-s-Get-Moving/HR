import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';
import { toYMD, parseLocalDate } from '../utils/timezone.js';
import DatePicker from './DatePicker.jsx';

export default function EmployeeOnboarding({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [benefitsPackages, setBenefitsPackages] = useState([]);
  const [workSchedules, setWorkSchedules] = useState([]);
  const [overtimePolicies, setOvertimePolicies] = useState([]);
  const [attendancePolicies, setAttendancePolicies] = useState([]);
  const [remoteWorkPolicies, setRemoteWorkPolicies] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    first_name: "",
    last_name: "",
    work_email: "",  // Company email
    email: "",       // Personal email (optional)
    phone: "",
    gender: "",
    birth_date: "",
    
    // Step 2: Employment Details
    hire_date: "",
    employment_type: "Full-time",
    department_id: "",
    user_role: "user",  // System Access Role - determines RBAC permissions
    probation_end: "",
    hourly_rate: 25,
    // Settings
    job_title_id: "",
    benefits_package_id: "",
    work_schedule_id: "",
    overtime_policy_id: "",
    attendance_policy_id: "",
    remote_work_policy_id: "",
    
    // Step 3: Personal Details & Banking
    full_address: "",
    sin_number: "",
    sin_expiry_date: "",
    bank_name: "",
    bank_account_number: "",
    bank_transit_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    
    // Step 4: Review
    reviewed: false
  });

  const steps = [
    { id: 1, title: t('employeeOnboarding.basicInformation'), icon: "👤" },
    { id: 2, title: t('employeeOnboarding.employmentDetails'), icon: "💼" },
    { id: 3, title: t('employeeOnboarding.personalDetailsBanking'), icon: "🏦" },
    { id: 4, title: t('employeeOnboarding.reviewSubmit'), icon: "📋" }
  ];

  React.useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [deptData, locData, jobTitlesData, benefitsData, schedulesData, overtimeData, attendanceData, remoteData] = await Promise.all([
        API("/api/employees/departments"),
        API("/api/employees/locations"),
        API("/api/settings/job-titles"),
        API("/api/settings/benefits-packages"),
        API("/api/settings/work-schedules"),
        API("/api/settings/overtime-policies"),
        API("/api/settings/attendance-policies"),
        API("/api/settings/remote-work-policies")
      ]);
      setDepartments(deptData);
      setLocations(locData);
      setJobTitles(jobTitlesData);
      setBenefitsPackages(benefitsData);
      setWorkSchedules(schedulesData);
      setOvertimePolicies(overtimeData);
      setAttendancePolicies(attendanceData);
      setRemoteWorkPolicies(remoteData);
    } catch (error) {
      console.error("Error loading reference data:", error);
    }
  };

  const handleSubmit = async () => {
    // Clear previous validation errors
    setValidationErrors([]);
    
    // Client-side validation for required fields
    const errors = [];
    if (!formData.first_name?.trim()) {
      errors.push({ field: 'first_name', message: 'First name is required' });
    }
    if (!formData.last_name?.trim()) {
      errors.push({ field: 'last_name', message: 'Last name is required' });
    }
    if (!formData.work_email?.trim()) {
      errors.push({ field: 'work_email', message: 'Work email is required' });
    }
    if (!formData.hire_date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.hire_date)) {
      errors.push({ field: 'hire_date', message: 'Hire date is required (YYYY-MM-DD)' });
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      console.error('❌ [Onboarding] Client validation failed:', errors);
      return;
    }
    
    try {
      console.log('📤 [Onboarding] Creating employee with data:', formData);
      
      // Create employee with all collected data
      // Send null for optional date fields instead of empty string
      const employeeResponse = await API("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          work_email: formData.work_email,
          email: formData.email || null,
          phone: formData.phone || null,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
          hire_date: formData.hire_date,
          employment_type: formData.employment_type,
          department_id: formData.department_id || null,
          probation_end: formData.probation_end || null,
          hourly_rate: formData.hourly_rate,
          // Settings
          job_title_id: formData.job_title_id || null,
          benefits_package_id: formData.benefits_package_id || null,
          work_schedule_id: formData.work_schedule_id || null,
          overtime_policy_id: formData.overtime_policy_id || null,
          attendance_policy_id: formData.attendance_policy_id || null,
          remote_work_policy_id: formData.remote_work_policy_id || null,
          // Step 3 data
          full_address: formData.full_address || null,
          sin_number: formData.sin_number || null,
          sin_expiry_date: formData.sin_expiry_date || null,
          bank_name: formData.bank_name || null,
          bank_account_number: formData.bank_account_number || null,
          bank_transit_number: formData.bank_transit_number || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null
        })
      });

      console.log('✅ [Onboarding] Employee created successfully:', employeeResponse);
      
      // Auto-create user account with generated credentials
      const username = `${formData.first_name}${formData.last_name}`; // FirstnameLastname format
      const password = 'password123';
      
      try {
        console.log(`👤 [Onboarding] Creating user account for ${username} with role: ${formData.user_role}`);
        
        await API("/api/auth/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            password: password,
            full_name: `${formData.first_name} ${formData.last_name}`,
            email: formData.work_email,
            role: formData.user_role,
            employee_id: employeeResponse.id
          })
        });
        
        console.log(`✅ [Onboarding] User account created successfully`);
        alert(t('employeeOnboarding.successMessage', { 
          firstName: formData.first_name, 
          lastName: formData.last_name,
          username,
          password,
          role: formData.user_role
        }));
      } catch (userError) {
        console.error("⚠️ [Onboarding] Error creating user account:", userError);
        alert(t('employeeOnboarding.partialSuccessMessage', { error: userError.message }));
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ [Onboarding] Error creating employee:", error);
      
      // Try to parse backend validation errors from 400 response
      try {
        const errorData = JSON.parse(error.message.replace(/^HTTP \d+: /, ''));
        if (errorData.details && Array.isArray(errorData.details)) {
          setValidationErrors(errorData.details);
          return;
        }
      } catch (parseErr) {
        // Not a JSON error, fall through to generic handling
      }
      
      alert(t('employeeOnboarding.failedToCreate', { error: error.message || t('common.unknownError') }));
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">{t('employeeOnboarding.basicInformation')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.firstName')} *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.lastName')} *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.workEmail')}</label>
              <input
                type="email"
                required
                placeholder="firstname@letsgetmovinggroup.com"
                value={formData.work_email}
                onChange={(e) => setFormData({...formData, work_email: e.target.value})}
                className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe font-mono text-sm"
              />
              <p className="text-xs text-tahoe-text-muted mt-1">{t('employeeOnboarding.companyEmailAddress')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.personalEmail')}</label>
                <input
                  type="email"
                  placeholder={t('employeeOnboarding.personalEmailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.gender')}</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                >
                  <option value="">{t('employeeOnboarding.selectGender')}</option>
                  <option value="Male">{t('employeeOnboarding.genderMale')}</option>
                  <option value="Female">{t('employeeOnboarding.genderFemale')}</option>
                  <option value="Non-binary">{t('employeeOnboarding.genderNonBinary')}</option>
                  <option value="Prefer not to say">{t('employeeOnboarding.genderPreferNotToSay')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.birthDate')}</label>
                <DatePicker
                  valueYmd={formData.birth_date}
                  onChangeYmd={(ymd) => setFormData({...formData, birth_date: ymd})}
                  placeholder={t('employeeOnboarding.birthDate')}
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">{t('employeeOnboarding.employmentDetails')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.hireDate')} *</label>
                <DatePicker
                  valueYmd={formData.hire_date}
                  onChangeYmd={(hireDate) => {
                    // Use parseLocalDate to avoid UTC interpretation bug
                    const probationEnd = hireDate ? parseLocalDate(hireDate) : null;
                    if (probationEnd) {
                      probationEnd.setMonth(probationEnd.getMonth() + 3);
                    }
                    setFormData({
                      ...formData, 
                      hire_date: hireDate,
                      probation_end: probationEnd ? toYMD(probationEnd) : ""
                    });
                  }}
                  placeholder={t('employeeOnboarding.hireDate')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.employmentType')} *</label>
                <select
                  required
                  value={formData.employment_type}
                  onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                >
                  <option value="Full-time">{t('employeeOnboarding.fullTime')}</option>
                  <option value="Part-time">{t('employeeOnboarding.partTime')}</option>
                  <option value="Contract">{t('employeeOnboarding.contract')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.department')}</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                >
                  <option value="">{t('employeeOnboarding.departmentToBeAssigned')}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('employeeOnboarding.systemAccessRole')} * <span className="text-tahoe-accent">({t('employeeOnboarding.determinesPermissions')})</span>
                </label>
                <select
                  value={formData.user_role}
                  onChange={(e) => setFormData({...formData, user_role: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                >
                  <option value="user">{t('employeeOnboarding.userEmployeeAccess')}</option>
                  <option value="manager">{t('employeeOnboarding.managerHRAccess')}</option>
                </select>
                <p className="text-xs text-tahoe-text-muted mt-1">
                  {t('employeeOnboarding.userManagerDescription')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.hourlyRate')}</label>
                <input
                  type="text"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.probationEndDate')}</label>
                <DatePicker
                  valueYmd={formData.probation_end}
                  onChangeYmd={(ymd) => setFormData({...formData, probation_end: ymd})}
                  placeholder={t('employeeOnboarding.probationEndDate')}
                  disabled
                />
              </div>
            </div>
            <p className="text-xs text-tahoe-text-muted">{t('employeeOnboarding.standardProbationPeriod')}</p>
            
            {/* Settings Section */}
            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
              <h4 className="text-md font-semibold mb-4 text-tahoe-text-primary">{t('employeeOnboarding.settings')}</h4>
              <p className="text-xs text-tahoe-text-muted mb-4">{t('employeeOnboarding.settingsOptional')}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.jobTitle')}</label>
                  <select
                    value={formData.job_title_id}
                    onChange={(e) => setFormData({...formData, job_title_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectJobTitle')}</option>
                    {jobTitles.filter(jt => !formData.department_id || jt.department_id === parseInt(formData.department_id)).map(jt => (
                      <option key={jt.id} value={jt.id}>{jt.name}{jt.department_name ? ` (${jt.department_name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.benefitsPackage')}</label>
                  <select
                    value={formData.benefits_package_id}
                    onChange={(e) => setFormData({...formData, benefits_package_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectBenefitsPackage')}</option>
                    {benefitsPackages.map(bp => (
                      <option key={bp.id} value={bp.id}>{bp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.workSchedule')}</label>
                  <select
                    value={formData.work_schedule_id}
                    onChange={(e) => setFormData({...formData, work_schedule_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectWorkSchedule')}</option>
                    {workSchedules.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.overtimePolicy')}</label>
                  <select
                    value={formData.overtime_policy_id}
                    onChange={(e) => setFormData({...formData, overtime_policy_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectOvertimePolicy')}</option>
                    {overtimePolicies.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.attendancePolicy')}</label>
                  <select
                    value={formData.attendance_policy_id}
                    onChange={(e) => setFormData({...formData, attendance_policy_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectAttendancePolicy')}</option>
                    {attendancePolicies.map(ap => (
                      <option key={ap.id} value={ap.id}>{ap.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.remoteWorkPolicy')}</label>
                  <select
                    value={formData.remote_work_policy_id}
                    onChange={(e) => setFormData({...formData, remote_work_policy_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                    className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  >
                    <option value="">{t('employeeOnboarding.selectRemoteWorkPolicy')}</option>
                    {remoteWorkPolicies.map(rwp => (
                      <option key={rwp.id} value={rwp.id}>{rwp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold mb-4">{t('employeeOnboarding.personalDetailsBanking')}</h3>
            <p className="text-sm text-tahoe-text-muted mb-4">
              {t('employeeOnboarding.documentsCanBeUploadedLater')}
            </p>
            
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('employeeOnboarding.fullAddress')}</label>
                <textarea
                  rows="3"
                  placeholder={t('employeeOnboarding.addressPlaceholder')}
                  value={formData.full_address}
                  onChange={(e) => setFormData({...formData, full_address: e.target.value})}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>

              {/* SIN Information */}
              <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <h4 className="font-medium mb-3">{t('employeeOnboarding.socialInsuranceNumber')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t('employeeOnboarding.sinPlaceholder')}
                    value={formData.sin_number}
                    onChange={(e) => setFormData({...formData, sin_number: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  <div>
                    <DatePicker
                      valueYmd={formData.sin_expiry_date}
                      onChangeYmd={(ymd) => setFormData({...formData, sin_expiry_date: ymd})}
                      placeholder={t('employeeOnboarding.expiryDatePlaceholder')}
                    />
                    <p className="text-xs text-tahoe-text-muted mt-1">{t('employeeOnboarding.leaveEmptyIfPermanent')}</p>
                  </div>
                </div>
                <p className="text-xs text-tahoe-text-muted mt-2">{t('employeeOnboarding.requiredForPayrollTax')}</p>
              </div>

              {/* Direct Deposit Information */}
              <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <h4 className="font-medium mb-3">{t('employeeOnboarding.directDepositInformation')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder={t('employeeOnboarding.bankNamePlaceholder')}
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  <input
                    type="text"
                    placeholder={t('employeeOnboarding.transitNumberPlaceholder')}
                    value={formData.bank_transit_number}
                    onChange={(e) => setFormData({...formData, bank_transit_number: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  <input
                    type="text"
                    placeholder={t('employeeOnboarding.accountNumberPlaceholder')}
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <h4 className="font-medium mb-3">{t('employeeOnboarding.emergencyContact')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder={t('employeeOnboarding.namePlaceholder')}
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  <input
                    type="tel"
                    placeholder={t('employeeOnboarding.phonePlaceholder')}
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                    className="px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">{t('employeeOnboarding.reviewSubmit')}</h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <h4 className="font-medium mb-3">{t('employeeOnboarding.personalInformation')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.name')}:</span> {formData.first_name} {formData.last_name}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.workEmail')}:</span> <span className="font-mono text-xs text-tahoe-accent">{formData.work_email}</span></div>
                    {formData.email && <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.personalEmail')}:</span> {formData.email}</div>}
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.phone')}:</span> {formData.phone || t('employeeOnboarding.notProvided')}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.gender')}:</span> {formData.gender || t('employeeOnboarding.notSpecified')}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.birthDate')}:</span> {formData.birth_date || t('employeeOnboarding.notProvided')}</div>
                  </div>
                </div>
                
                <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <h4 className="font-medium mb-3">{t('employeeOnboarding.employmentDetails')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.hireDate')}:</span> {formData.hire_date}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.type')}:</span> {formData.employment_type}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.department')}:</span> {departments.find(d => d.id == formData.department_id)?.name || t('employeeOnboarding.none')}</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.hourlyRate')}:</span> ${formData.hourly_rate}/hr</div>
                    <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.systemAccess')}:</span> <span className="text-tahoe-accent">{formData.user_role === 'user' ? t('employeeOnboarding.userEmployee') : t('employeeOnboarding.managerHR')}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <h4 className="font-medium mb-3">{t('employeeOnboarding.bankingPersonalDetails')}</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.address')}:</span> {formData.full_address || t('employeeOnboarding.notProvided')}</div>
                  <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.sin')}:</span> {formData.sin_number ? '***-***-' + formData.sin_number.slice(-3) : t('employeeOnboarding.notProvided')}</div>
                  <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.bank')}:</span> {formData.bank_name || t('employeeOnboarding.notProvided')}</div>
                  <div><span className="text-tahoe-text-muted">{t('employeeOnboarding.emergencyContact')}:</span> {formData.emergency_contact_name || t('employeeOnboarding.notProvided')}</div>
                </div>
              </div>

              <div className="p-4 rounded-tahoe-input border" style={{ backgroundColor: 'rgba(10, 132, 255, 0.15)', borderColor: 'rgba(10, 132, 255, 0.3)' }}>
                <p className="text-sm text-tahoe-accent">
                  📄 <strong>{t('employeeOnboarding.note')}:</strong> {t('employeeOnboarding.documentsCanBeUploadedAfter')}
                </p>
              </div>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.reviewed}
                  onChange={(e) => setFormData({...formData, reviewed: e.target.checked})}
                  className="w-4 h-4 rounded focus:ring-tahoe-accent"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', accentColor: '#0A84FF' }}
                />
                <span className="text-sm text-tahoe-text-primary">{t('employeeOnboarding.confirmAllInformation')}</span>
              </label>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">{t('employeeOnboarding.addNewEmployee')}</h2>
              <p className="text-tahoe-text-muted">{t('employeeOnboarding.completeOnboardingProcess')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-tahoe-text-muted hover:text-tahoe-text-primary transition-all duration-tahoe"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-tahoe ${
                  currentStep >= step.id 
                    ? 'text-white' 
                    : 'text-tahoe-text-muted'
                }`}
                style={currentStep >= step.id ? { backgroundColor: '#0A84FF', borderColor: '#0A84FF' } : { borderColor: 'rgba(255, 255, 255, 0.12)' }}
                >
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-all duration-tahoe`}
                  style={currentStep > step.id ? { backgroundColor: '#0A84FF' } : { backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 59, 48, 0.15)', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
              <h4 className="font-medium mb-2" style={{ color: '#FF3B30' }}>Please fix the following errors:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#FF6961' }}>
                {validationErrors.map((err, idx) => (
                  <li key={idx}>
                    <strong>{err.field}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-tahoe-pill disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-tahoe"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              ← Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2 rounded-tahoe-pill font-medium transition-all duration-tahoe"
                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!formData.reviewed}
                className="px-6 py-2 rounded-tahoe-pill font-medium transition-all duration-tahoe disabled:opacity-50"
                style={{ backgroundColor: '#30d158', color: '#ffffff' }}
              >
                Complete Onboarding
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
