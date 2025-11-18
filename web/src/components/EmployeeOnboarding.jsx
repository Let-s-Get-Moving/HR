import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { API } from '../config/api.js';

export default function EmployeeOnboarding({ onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
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
    { id: 1, title: "Basic Information", icon: "👤" },
    { id: 2, title: "Employment Details", icon: "💼" },
    { id: 3, title: "Personal Details & Banking", icon: "🏦" },
    { id: 4, title: "Review & Submit", icon: "📋" }
  ];

  React.useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [deptData, locData] = await Promise.all([
        API("/api/employees/departments"),
        API("/api/employees/locations")
      ]);
      setDepartments(deptData);
      setLocations(locData);
    } catch (error) {
      console.error("Error loading reference data:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('📤 [Onboarding] Creating employee with data:', formData);
      
      // Create employee with all collected data
      const employeeResponse = await API("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          work_email: formData.work_email,
          email: formData.email || null,
          phone: formData.phone,
          gender: formData.gender,
          birth_date: formData.birth_date,
          hire_date: formData.hire_date,
          employment_type: formData.employment_type,
          department_id: formData.department_id || null,
          probation_end: formData.probation_end,
          hourly_rate: formData.hourly_rate,
          // Step 3 data
          full_address: formData.full_address,
          sin_number: formData.sin_number,
          sin_expiry_date: formData.sin_expiry_date || null,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_transit_number: formData.bank_transit_number,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone
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
        alert(`Employee ${formData.first_name} ${formData.last_name} created successfully!\n\nLogin Credentials:\nUsername: ${username}\nPassword: ${password}\n\nRole: ${formData.user_role}`);
      } catch (userError) {
        console.error("⚠️ [Onboarding] Error creating user account:", userError);
        alert(`Employee created, but failed to create user account: ${userError.message}\nPlease create user account manually.`);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ [Onboarding] Error creating employee:", error);
      alert('Failed to create employee: ' + (error.message || 'Unknown error'));
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
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Work Email * (Company Email)</label>
              <input
                type="email"
                required
                placeholder="firstname@letsgetmovinggroup.com"
                value={formData.work_email}
                onChange={(e) => setFormData({...formData, work_email: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-neutral-400 mt-1">Company email address</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Personal Email (Optional)</label>
                <input
                  type="email"
                  placeholder="personal@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Birth Date</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
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
            <h3 className="text-lg font-semibold mb-4">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hire Date *</label>
                <input
                  type="date"
                  required
                  value={formData.hire_date}
                  onChange={(e) => {
                    const hireDate = e.target.value;
                    const probationEnd = hireDate ? new Date(hireDate) : null;
                    if (probationEnd) {
                      probationEnd.setMonth(probationEnd.getMonth() + 3);
                    }
                    setFormData({
                      ...formData, 
                      hire_date: hireDate,
                      probation_end: probationEnd ? probationEnd.toISOString().split('T')[0] : ""
                    });
                  }}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Employment Type *</label>
                <select
                  required
                  value={formData.employment_type}
                  onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Department (HR will assign)</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value ? parseInt(e.target.value, 10) : ""})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None - To be assigned by HR</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  System Access Role * <span className="text-indigo-400">(Determines permissions)</span>
                </label>
                <select
                  value={formData.user_role}
                  onChange={(e) => setFormData({...formData, user_role: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="user">User (Employee Access)</option>
                  <option value="manager">Manager (HR Access)</option>
                </select>
                <p className="text-xs text-neutral-400 mt-1">
                  User: Can only view their own data | Manager: Full HR access to all employees
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
                <input
                  type="text"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Probation End Date (Auto-calculated)</label>
                <input
                  type="date"
                  value={formData.probation_end}
                  onChange={(e) => setFormData({...formData, probation_end: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                  readOnly
                />
              </div>
            </div>
            <p className="text-xs text-neutral-400">Standard 3-month probation period for all employees</p>
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
            <h3 className="text-lg font-semibold mb-4">Personal Details & Banking</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Documents can be uploaded later through the employee profile
            </p>
            
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium mb-2">Full Address</label>
                <textarea
                  rows="3"
                  placeholder="Street, City, Province, Postal Code"
                  value={formData.full_address}
                  onChange={(e) => setFormData({...formData, full_address: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* SIN Information */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Social Insurance Number (SIN)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="123-456-789"
                    value={formData.sin_number}
                    onChange={(e) => setFormData({...formData, sin_number: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <div>
                    <input
                      type="date"
                      placeholder="Expiry Date (if temporary)"
                      value={formData.sin_expiry_date}
                      onChange={(e) => setFormData({...formData, sin_expiry_date: e.target.value})}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-xs text-neutral-400 mt-1">Leave empty if permanent</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-2">Required for payroll and tax purposes</p>
              </div>

              {/* Direct Deposit Information */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Direct Deposit Information</h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Transit Number (5 digits)"
                    value={formData.bank_transit_number}
                    onChange={(e) => setFormData({...formData, bank_transit_number: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
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
            <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-neutral-400">Name:</span> {formData.first_name} {formData.last_name}</div>
                    <div><span className="text-neutral-400">Work Email:</span> <span className="font-mono text-xs text-indigo-400">{formData.work_email}</span></div>
                    {formData.email && <div><span className="text-neutral-400">Personal Email:</span> {formData.email}</div>}
                    <div><span className="text-neutral-400">Phone:</span> {formData.phone || 'Not provided'}</div>
                    <div><span className="text-neutral-400">Gender:</span> {formData.gender || 'Not specified'}</div>
                    <div><span className="text-neutral-400">Birth Date:</span> {formData.birth_date || 'Not provided'}</div>
                  </div>
                </div>
                
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Employment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-neutral-400">Hire Date:</span> {formData.hire_date}</div>
                    <div><span className="text-neutral-400">Type:</span> {formData.employment_type}</div>
                    <div><span className="text-neutral-400">Department:</span> {departments.find(d => d.id == formData.department_id)?.name || 'None'}</div>
                    <div><span className="text-neutral-400">Hourly Rate:</span> ${formData.hourly_rate}/hr</div>
                    <div><span className="text-neutral-400">System Access:</span> <span className="text-indigo-400">{formData.user_role === 'user' ? 'User (Employee)' : 'Manager (HR)'}</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Banking & Personal Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-neutral-400">Address:</span> {formData.full_address || 'Not provided'}</div>
                  <div><span className="text-neutral-400">SIN:</span> {formData.sin_number ? '***-***-' + formData.sin_number.slice(-3) : 'Not provided'}</div>
                  <div><span className="text-neutral-400">Bank:</span> {formData.bank_name || 'Not provided'}</div>
                  <div><span className="text-neutral-400">Emergency Contact:</span> {formData.emergency_contact_name || 'Not provided'}</div>
                </div>
              </div>

              <div className="bg-indigo-900/30 border border-indigo-700 p-4 rounded-lg">
                <p className="text-sm text-indigo-300">
                  📄 <strong>Note:</strong> Documents can be uploaded after employee creation through their profile page.
                </p>
              </div>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.reviewed}
                  onChange={(e) => setFormData({...formData, reviewed: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm">I confirm all information is correct and complete</span>
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
              <h2 className="text-2xl font-bold">Add New Employee</h2>
              <p className="text-neutral-400">Complete onboarding process</p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'border-neutral-600 text-neutral-400'
                }`}>
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-indigo-600' : 'bg-neutral-600'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!formData.reviewed}
                className="bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 px-6 py-2 rounded-lg font-medium transition-colors"
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
