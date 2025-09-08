import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { API } from '../config/api.js';

export default function EmployeeOnboarding({ onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    birth_date: "",
    
    // Step 2: Employment Details
    hire_date: "",
    employment_type: "Full-time",
    department_id: "",
    location_id: "",
    role_title: "",
    probation_end: "",
    hourly_rate: 25,
    
    // Step 3: Documents & Financial
    contract_file: null,
    id_document: null,
    sin_number: "",
    direct_deposit_info: {
      bank_name: "",
      account_number: "",
      transit_number: "",
      institution_number: ""
    },
    tax_forms: {
      td1_on: null,
      td1_ab: null
    },
    status_documents: {
      work_permit: null,
      permanent_resident_card: null,
      canadian_passport: null,
      birth_certificate: null
    },
    emergency_contact: {
      name: "",
      relationship: "",
      phone: ""
    },
    
    // Step 4: Training & Compliance
    required_trainings: [],
    
    // Step 5: Review
    reviewed: false
  });

  const steps = [
    { id: 1, title: "Basic Information", icon: "👤" },
    { id: 2, title: "Employment Details", icon: "💼" },
    { id: 3, title: "Documents & Contracts", icon: "📄" },
    { id: 4, title: "Training & Compliance", icon: "✅" },
    { id: 5, title: "Review & Submit", icon: "📋" }
  ];

  React.useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [deptData, locData, trainingData] = await Promise.all([
        API("/api/employees/departments"),
        API("/api/employees/locations"),
        API("/api/compliance/trainings")
      ]);
      setDepartments(deptData);
      setLocations(locData);
      setTrainings(trainingData);
    } catch (error) {
      console.error("Error loading reference data:", error);
    }
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleSubmit = async () => {
    try {
      // Create employee
      const employeeResponse = await API("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          birth_date: formData.birth_date,
          hire_date: formData.hire_date,
          employment_type: formData.employment_type,
          department_id: formData.department_id,
          location_id: formData.location_id,
          role_title: formData.role_title,
          probation_end: formData.probation_end,
          hourly_rate: formData.hourly_rate
        })
      });

      // Add documents
      if (formData.contract_file) {
        await API("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeResponse.id,
            doc_type: "Contract",
            file_name: formData.contract_file.name,
            signed: true
          })
        });
      }

      if (formData.id_document) {
        await API("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeResponse.id,
            doc_type: "ID",
            file_name: formData.id_document.name,
            signed: false
          })
        });
      }

      // Add training records
      for (const trainingId of formData.required_trainings) {
        await API("/api/training-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: employeeResponse.id,
            training_id: trainingId,
            completed_on: new Date().toISOString().split('T')[0]
          })
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating employee:", error);
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  required
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
                <label className="block text-sm font-medium mb-2">Department *</label>
                <select
                  required
                  value={formData.department_id}
                  onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location *</label>
                <select
                  required
                  value={formData.location_id}
                  onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Role Title</label>
                <input
                  type="text"
                  value={formData.role_title}
                  onChange={(e) => setFormData({...formData, role_title: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Probation End Date (Auto-calculated: 3 months)</label>
              <input
                type="date"
                value={formData.probation_end}
                onChange={(e) => setFormData({...formData, probation_end: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                readOnly
              />
              <p className="text-xs text-neutral-400 mt-1">Standard 3-month probation period for all employees</p>
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
            <h3 className="text-lg font-semibold mb-4">Documents, Financial & Status</h3>
            
            <div className="space-y-6">
              {/* Employment Contract */}
              <div>
                <label className="block text-sm font-medium mb-2">Employment Contract *</label>
                <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('contract_file', e.target.files[0])}
                    className="hidden"
                    id="contract-upload"
                  />
                  <label htmlFor="contract-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-neutral-400">
                      {formData.contract_file ? formData.contract_file.name : "Click to upload contract"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">PDF, DOC, or DOCX files</p>
                  </label>
                </div>
              </div>

              {/* SIN Number */}
              <div>
                <label className="block text-sm font-medium mb-2">SIN Number (Social Insurance Number) *</label>
                <input
                  type="text"
                  placeholder="123-456-789"
                  value={formData.sin_number}
                  onChange={(e) => setFormData({...formData, sin_number: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-neutral-400 mt-1">Required for payroll and tax purposes</p>
              </div>

              {/* Direct Deposit Information */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Direct Deposit Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.direct_deposit_info.bank_name}
                    onChange={(e) => setFormData({
                      ...formData,
                      direct_deposit_info: {...formData.direct_deposit_info, bank_name: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.direct_deposit_info.account_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      direct_deposit_info: {...formData.direct_deposit_info, account_number: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Transit Number (5 digits)"
                    value={formData.direct_deposit_info.transit_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      direct_deposit_info: {...formData.direct_deposit_info, transit_number: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Institution Number (3 digits)"
                    value={formData.direct_deposit_info.institution_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      direct_deposit_info: {...formData.direct_deposit_info, institution_number: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tax Forms */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Tax Forms (TD1)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">TD1-ON (Ontario)</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('tax_forms.td1_on', e.target.files[0])}
                        className="hidden"
                        id="td1-on-upload"
                      />
                      <label htmlFor="td1-on-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">📋</div>
                        <p className="text-xs text-neutral-400">
                          {formData.tax_forms.td1_on ? formData.tax_forms.td1_on.name : "Upload TD1-ON"}
                        </p>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">TD1-AB (Alberta)</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('tax_forms.td1_ab', e.target.files[0])}
                        className="hidden"
                        id="td1-ab-upload"
                      />
                      <label htmlFor="td1-ab-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">📋</div>
                        <p className="text-xs text-neutral-400">
                          {formData.tax_forms.td1_ab ? formData.tax_forms.td1_ab.name : "Upload TD1-AB"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Documents */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Canadian Status Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Work Permit (if applicable)</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('status_documents.work_permit', e.target.files[0])}
                        className="hidden"
                        id="work-permit-upload"
                      />
                      <label htmlFor="work-permit-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">🛂</div>
                        <p className="text-xs text-neutral-400">
                          {formData.status_documents.work_permit ? formData.status_documents.work_permit.name : "Upload Work Permit"}
                        </p>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Permanent Resident Card</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('status_documents.permanent_resident_card', e.target.files[0])}
                        className="hidden"
                        id="pr-card-upload"
                      />
                      <label htmlFor="pr-card-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">🛂</div>
                        <p className="text-xs text-neutral-400">
                          {formData.status_documents.permanent_resident_card ? formData.status_documents.permanent_resident_card.name : "Upload PR Card"}
                        </p>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Canadian Passport</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('status_documents.canadian_passport', e.target.files[0])}
                        className="hidden"
                        id="passport-upload"
                      />
                      <label htmlFor="passport-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">🛂</div>
                        <p className="text-xs text-neutral-400">
                          {formData.status_documents.canadian_passport ? formData.status_documents.canadian_passport.name : "Upload Canadian Passport"}
                        </p>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Birth Certificate</label>
                    <div className="border-2 border-dashed border-neutral-700 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload('status_documents.birth_certificate', e.target.files[0])}
                        className="hidden"
                        id="birth-cert-upload"
                      />
                      <label htmlFor="birth-cert-upload" className="cursor-pointer">
                        <div className="text-2xl mb-1">🛂</div>
                        <p className="text-xs text-neutral-400">
                          {formData.status_documents.birth_certificate ? formData.status_documents.birth_certificate.name : "Upload Birth Certificate"}
                        </p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.emergency_contact.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: {...formData.emergency_contact, name: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={formData.emergency_contact.relationship}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: {...formData.emergency_contact, relationship: e.target.value}
                    })}
                    className="px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.emergency_contact.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: {...formData.emergency_contact, phone: e.target.value}
                    })}
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
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold mb-4">Training & Compliance</h3>
            
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">Select required trainings for this employee:</p>
              {trainings.map((training) => (
                <label key={training.id} className="flex items-center space-x-3 p-3 bg-neutral-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required_trainings.includes(training.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          required_trainings: [...formData.required_trainings, training.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          required_trainings: formData.required_trainings.filter(id => id !== training.id)
                        });
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 bg-neutral-700 border-neutral-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-medium">{training.name}</div>
                    <div className="text-sm text-neutral-400">
                      {training.mandatory ? "Mandatory" : "Optional"} • 
                      {training.validity_months ? ` Valid for ${training.validity_months} months` : " No expiry"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>
        );

      case 5:
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
                    <div><span className="text-neutral-400">Email:</span> {formData.email}</div>
                    <div><span className="text-neutral-400">Phone:</span> {formData.phone || 'Not provided'}</div>
                    <div><span className="text-neutral-400">Gender:</span> {formData.gender || 'Not specified'}</div>
                  </div>
                </div>
                
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Employment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-neutral-400">Hire Date:</span> {formData.hire_date}</div>
                    <div><span className="text-neutral-400">Type:</span> {formData.employment_type}</div>
                    <div><span className="text-neutral-400">Role:</span> {formData.role_title || 'Not specified'}</div>
                    <div><span className="text-neutral-400">Department:</span> {departments.find(d => d.id == formData.department_id)?.name}</div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Documents & Training</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-neutral-400">Contract:</span> {formData.contract_file ? formData.contract_file.name : 'Not uploaded'}</div>
                  <div><span className="text-neutral-400">ID Document:</span> {formData.id_document ? formData.id_document.name : 'Not uploaded'}</div>
                  <div><span className="text-neutral-400">Required Trainings:</span> {formData.required_trainings.length} selected</div>
                </div>
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
            
            {currentStep < 5 ? (
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
