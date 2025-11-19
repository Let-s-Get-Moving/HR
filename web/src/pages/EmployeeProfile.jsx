import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

export default function EmployeeProfile({ employeeId, onClose, onUpdate }) {
  const { t } = useTranslation();
  const [employee, setEmployee] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [hrDetails, setHrDetails] = useState({ addresses: [], emergency_contacts: [], bank_accounts: [], identifiers: [], compensation_history: [], status_history: [] });
  const [terminationDetails, setTerminationDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    doc_type: 'Other',
    document_category: 'Other',
    file_name: '',
    file: null,
    notes: '',
    signed: false
  });

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    console.log(`🔄 [EmployeeProfile] ===== Loading data for employee ${employeeId} =====`);
    try {
      console.log(`🔄 [EmployeeProfile] Fetching employee data...`);
      const [empData, timeData, docData, trainingData, payrollData, hrData, deptsData, locsData] = await Promise.all([
        API(`/api/employees/${employeeId}`),
        API(`/api/employees/${employeeId}/time-entries`),
        API(`/api/employees/${employeeId}/documents`),
        API(`/api/employees/${employeeId}/training-records`),
        API(`/api/employees/${employeeId}/payroll-history`),
        API(`/api/employees/${employeeId}/hr-details`),
        API(`/api/employees/departments`).catch(() => []),
        API(`/api/employees/locations`).catch(() => [])
      ]);
      
      console.log(`✅ [EmployeeProfile] Employee data loaded:`, {
        employee: empData,
        timeEntries: timeData?.length || 0,
        documents: docData,
        trainingRecords: trainingData?.length || 0,
        payrollHistory: payrollData?.length || 0,
        hrDetails: {
          addresses: hrData?.addresses?.length || 0,
          emergencyContacts: hrData?.emergency_contacts?.length || 0,
          bankAccounts: hrData?.bank_accounts?.length || 0,
          identifiers: hrData?.identifiers?.length || 0,
          compensationHistory: hrData?.compensation_history?.length || 0,
          statusHistory: hrData?.status_history?.length || 0
        },
        departments: deptsData?.length || 0,
        locations: locsData?.length || 0
      });
      
      console.log(`📄 [EmployeeProfile] Documents received:`, docData);
      console.log(`👤 [EmployeeProfile] Employee details:`, {
        id: empData?.id,
        name: `${empData?.first_name} ${empData?.last_name}`,
        birth_date: empData?.birth_date,
        sin_number: empData?.sin_number ? t('employeeProfile.present') : t('employeeProfile.notProvided'),
        bank_name: empData?.bank_name || t('employeeProfile.notProvided'),
        emergency_contact_name: empData?.emergency_contact_name || t('employeeProfile.notProvided')
      });
      
      setEmployee(empData);
      setTimeEntries(timeData);
      setDocuments(docData);
      setTrainingRecords(trainingData);
      setPayrollHistory(payrollData);
      setHrDetails(hrData);
      setDepartments(deptsData || []);
      setLocations(locsData || []);
      
      // If employee is terminated, fetch termination details
      if (empData.status === 'Terminated') {
        console.log(`🔄 [EmployeeProfile] Employee is terminated, fetching termination details...`);
        try {
          const termData = await API(`/api/termination/details/${employeeId}`);
          console.log(`✅ [EmployeeProfile] Termination details loaded:`, termData);
          setTerminationDetails(termData);
        } catch (error) {
          console.error("❌ [EmployeeProfile] Error loading termination details:", error);
          setTerminationDetails(null);
        }
      }
    } catch (error) {
      console.error("❌ [EmployeeProfile] Error loading employee data:", error);
      console.error("❌ [EmployeeProfile] Error details:", {
        message: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
      console.log(`✅ [EmployeeProfile] Loading complete, setting loading=false`);
    }
  };

  // Convert decimal hours to HH:MM format
  const formatHoursAsTime = (decimalHours) => {
    if (!decimalHours || decimalHours === 0) return '0:00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Canadian payroll deduction rates (2024/2025)
  const DEDUCTION_RATES = {
    cpp: 0.0595,  // 5.95% CPP contribution
    ei: 0.0158,   // 1.58% EI premium
    federal_tax: {
      basic: 0.15,  // 15% federal tax (simplified - first bracket)
    },
    provincial_tax: {
      'ON': 0.0505,  // Ontario
      'BC': 0.0506,  // British Columbia
      'AB': 0.10,    // Alberta
      'QC': 0.15,    // Quebec
      'MB': 0.108,   // Manitoba
      'SK': 0.105,   // Saskatchewan
      'NS': 0.0879,  // Nova Scotia
      'NB': 0.094,   // New Brunswick
      'NL': 0.087,   // Newfoundland
      'PE': 0.098,   // PEI
      'NT': 0.059,   // Northwest Territories
      'YT': 0.064,   // Yukon
      'NU': 0.04,    // Nunavut
    }
  };

  // Get province from employee address or default to ON
  const getEmployeeProvince = () => {
    if (!employee?.full_address) return 'ON';
    const address = employee.full_address.toUpperCase();
    
    // Check for province codes or names in address
    if (address.includes('ONTARIO') || address.includes('ON')) return 'ON';
    if (address.includes('BRITISH COLUMBIA') || address.includes('BC')) return 'BC';
    if (address.includes('ALBERTA') || address.includes('AB')) return 'AB';
    if (address.includes('QUEBEC') || address.includes('QC')) return 'QC';
    if (address.includes('MANITOBA') || address.includes('MB')) return 'MB';
    if (address.includes('SASKATCHEWAN') || address.includes('SK')) return 'SK';
    if (address.includes('NOVA SCOTIA') || address.includes('NS')) return 'NS';
    if (address.includes('NEW BRUNSWICK') || address.includes('NB')) return 'NB';
    if (address.includes('NEWFOUNDLAND') || address.includes('NL')) return 'NL';
    if (address.includes('PEI') || address.includes('PE')) return 'PE';
    if (address.includes('NORTHWEST') || address.includes('NT')) return 'NT';
    if (address.includes('YUKON') || address.includes('YT')) return 'YT';
    if (address.includes('NUNAVUT') || address.includes('NU')) return 'NU';
    
    return 'ON'; // Default to Ontario
  };

  // Calculate deductions for a given amount
  const calculateDeductions = (grossAmount) => {
    const province = getEmployeeProvince();
    const provincialRate = DEDUCTION_RATES.provincial_tax[province] || 0.0505;
    
    const cpp = grossAmount * DEDUCTION_RATES.cpp;
    const ei = grossAmount * DEDUCTION_RATES.ei;
    const federalTax = grossAmount * DEDUCTION_RATES.federal_tax.basic;
    const provincialTax = grossAmount * provincialRate;
    
    return {
      cpp,
      ei,
      federalTax,
      provincialTax,
      total: cpp + ei + federalTax + provincialTax,
      province
    };
  };

  // Calculate total hours from time entries
  const calculateTotalHours = () => {
    if (!timeEntries || !Array.isArray(timeEntries) || timeEntries.length === 0) return 0;
    const total = timeEntries.reduce((total, entry) => {
      const hours = parseFloat(entry.hours_worked) || 0;
      return total + hours;
    }, 0);
    return isNaN(total) ? 0 : total;
  };

  const calculateTotalEarnings = () => {
    if (!timeEntries || !Array.isArray(timeEntries) || timeEntries.length === 0) return 0;
    const total = timeEntries.reduce((total, entry) => {
      const hours = parseFloat(entry.hours_worked) || 0;
      const rate = parseFloat(employee?.hourly_rate) || 25;
      const overtimeHours = parseFloat(entry.overtime_hours) || 0;
      const overtimeRate = rate * 1.5;
      
      return total + (hours * rate) + (overtimeHours * overtimeRate);
    }, 0);
    return isNaN(total) ? 0 : total;
  };

  const handleEdit = () => {
    setEditData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      gender: employee.gender,
      birth_date: employee.birth_date ? employee.birth_date.split('T')[0] : '',
      role_title: employee.role_title,
      hourly_rate: employee.hourly_rate || 25,
      employment_type: employee.employment_type,
      department_id: employee.department_id,
      location_id: employee.location_id || null,
      hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      probation_end: employee.probation_end ? employee.probation_end.split('T')[0] : '',
      status: employee.status,
      // New onboarding fields
      full_address: employee.full_address || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      sin_number: employee.sin_number || '',
      sin_expiry_date: employee.sin_expiry_date ? employee.sin_expiry_date.split('T')[0] : '',
      bank_name: employee.bank_name || '',
      bank_transit_number: employee.bank_transit_number || '',
      bank_account_number: employee.bank_account_number || '',
      contract_status: employee.contract_status || 'Not Sent',
      contract_signed_date: employee.contract_signed_date ? employee.contract_signed_date.split('T')[0] : '',
      gift_card_sent: employee.gift_card_sent || false
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await API(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData)
      });
      setIsEditing(false);
      loadEmployeeData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  // Document handling functions
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({
        ...uploadData,
        file,
        file_name: file.name
      });
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadData.file || !uploadData.doc_type) {
      alert(t('employeeProfile.selectFileAndType'));
      return;
    }

    try {
      console.log(`📤 [EmployeeProfile] Uploading document...`, {
        employeeId,
        doc_type: uploadData.doc_type,
        file_name: uploadData.file_name,
        file_size: uploadData.file.size,
        mime_type: uploadData.file.type,
        category: uploadData.document_category,
        signed: uploadData.signed
      });
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        
        console.log(`🔄 [EmployeeProfile] File converted to base64, size: ${base64.length} characters`);
        
        const payload = {
          doc_type: uploadData.doc_type,
          file_name: uploadData.file_name,
          file_data_base64: base64,
          mime_type: uploadData.file.type,
          document_category: uploadData.document_category,
          notes: uploadData.notes,
          signed: uploadData.signed
        };

        console.log(`🚀 [EmployeeProfile] Sending upload request...`);
        const result = await API(`/api/employees/${employeeId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        console.log(`✅ [EmployeeProfile] Document uploaded successfully:`, result);
        alert(t('employeeProfile.documentUploadSuccess'));
        setShowUploadModal(false);
        setUploadData({
          doc_type: 'Other',
          document_category: 'Other',
          file_name: '',
          file: null,
          notes: '',
          signed: false
        });
        await loadEmployeeData();
      };
      reader.readAsDataURL(uploadData.file);
    } catch (error) {
      console.error('❌ [EmployeeProfile] Error uploading document:', error);
      console.error('❌ [EmployeeProfile] Error details:', {
        message: error.message,
        stack: error.stack
      });
      alert(t('employeeProfile.failedToUploadDocument', { error: error.message }));
    }
  };

  const handleViewDocument = async (doc) => {
    console.log(`👁️ [EmployeeProfile] Viewing document:`, doc);
    try {
      if (doc.file_url && !doc.has_file_data) {
        console.log(`🌐 [EmployeeProfile] Opening external URL:`, doc.file_url);
        // External URL - open in new tab
        window.open(doc.file_url, '_blank');
      } else {
        console.log(`📥 [EmployeeProfile] Downloading from server...`);
        // Download from server
        const response = await fetch(`/api/employees/${employeeId}/documents/${doc.id}/download`, {
          credentials: 'include',
          headers: {
            'x-session-id': localStorage.getItem('sessionId') || ''
          }
        });
        
        console.log(`📡 [EmployeeProfile] Download response status:`, response.status);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`📄 [EmployeeProfile] Content-Type:`, contentType);
          
          if (contentType && contentType.includes('application/json')) {
            // It's a JSON response with a URL
            const data = await response.json();
            console.log(`🔗 [EmployeeProfile] Got JSON response with URL:`, data);
            if (data.url) {
              window.open(data.url, '_blank');
            }
          } else {
            // It's a file blob - create proper blob URL and open
            const blob = await response.blob();
            console.log(`📦 [EmployeeProfile] Received blob, size:`, blob.size);
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Open in new window with proper handling
            const newWindow = window.open(blobUrl, '_blank');
            
            // Clean up blob URL after window loads
            if (newWindow) {
              console.log(`✅ [EmployeeProfile] Opened in new window`);
              newWindow.onload = () => {
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
              };
            } else {
              console.log(`⚠️ [EmployeeProfile] Popup blocked, downloading instead`);
              // If popup blocked, download instead
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = doc.file_name || 'document';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
            }
          }
        } else {
          console.error(`❌ [EmployeeProfile] Download failed:`, response.statusText);
          alert(t('employeeProfile.failedToLoadDocument', { error: response.statusText }));
        }
      }
    } catch (error) {
      console.error('❌ [EmployeeProfile] Error viewing document:', error);
      console.error('❌ [EmployeeProfile] Error details:', {
        message: error.message,
        stack: error.stack
      });
      alert(t('employeeProfile.failedToOpenDocument', { error: error.message }));
    }
  };

  const handleDeleteDocument = async (docId) => {
    console.log(`🗑️ [EmployeeProfile] Deleting document:`, docId);
    if (!confirm(t('employeeProfile.confirmDeleteDocument'))) return;
    
    try {
      console.log(`🚀 [EmployeeProfile] Sending delete request...`);
      await API(`/api/employees/${employeeId}/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log(`✅ [EmployeeProfile] Document deleted successfully`);
      alert(t('employeeProfile.documentDeletedSuccess'));
      await loadEmployeeData();
    } catch (error) {
      console.error('❌ [EmployeeProfile] Error deleting document:', error);
      console.error('❌ [EmployeeProfile] Error details:', {
        message: error.message,
        stack: error.stack
      });
      alert(t('employeeProfile.failedToDeleteDocument', { error: error.message }));
    }
  };

  const getDocumentIcon = (docType) => {
    const icons = {
      Contract: '📄',
      VoidCheque: '💳',
      DirectDeposit: '🏦',
      WorkPermit: '🛂',
      PR_Card: '🇨🇦',
      Citizenship: '📜',
      SIN_Document: '🔢',
      StudyPermit: '🎓',
      PolicyAck: '✅',
      Visa: '✈️',
      Other: '📎'
    };
    return icons[docType] || '📎';
  };

  const formatDocType = (docType) => {
    return docType.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  };

  const categorizeDocuments = () => {
    if (!documents || documents.length === 0) return {};
    
    return {
      Financial: documents.filter(d => ['VoidCheque', 'DirectDeposit', 'SIN_Document'].includes(d.doc_type)),
      Immigration: documents.filter(d => ['WorkPermit', 'PR_Card', 'Citizenship', 'StudyPermit', 'Visa'].includes(d.doc_type)),
      Employment: documents.filter(d => ['Contract', 'PolicyAck'].includes(d.doc_type)),
      Other: documents.filter(d => d.doc_type === 'Other' || !['VoidCheque', 'DirectDeposit', 'SIN_Document', 'WorkPermit', 'PR_Card', 'Citizenship', 'StudyPermit', 'Visa', 'Contract', 'PolicyAck'].includes(d.doc_type))
    };
  };

  const tabs = employee?.status === 'Terminated' ? [
    { id: "overview", name: "Overview", icon: "👤" },
    { id: "termination", name: "Termination", icon: "🚪" },
    { id: "exit", name: "Exit Details", icon: "📋" },
    { id: "financial", name: "Financial", icon: "💰" },
    { id: "documents", name: "Documents", icon: "📄" },
    { id: "time", name: "Time Tracking", icon: "⏰" }
  ] : [
    { id: "overview", name: "Overview", icon: "👤" },
    { id: "financial", name: "Financial", icon: "💰" },
    { id: "hr", name: "HR Details", icon: "🗂️" },
    { id: "time", name: "Time Tracking", icon: "⏰" },
    { id: "documents", name: "Documents", icon: "📄" },
    { id: "training", name: "Training", icon: "✅" }
  ];

  const handleTabChange = (tabId) => {
    console.log(`📑 [EmployeeProfile] Switching to tab: ${tabId}`);
    setActiveTab(tabId);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-neutral-400">{t('employeeProfile.loadingProfile')}</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-red-400">{t('employeeProfile.employeeNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={editData.first_name || ''}
                      onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                      placeholder={t('employeeProfile.firstName')}
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1 text-xl font-bold"
                    />
                    <input
                      type="text"
                      value={editData.last_name || ''}
                      onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                      placeholder={t('employeeProfile.lastName')}
                      className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1 text-xl font-bold"
                    />
                  </div>
                  <input
                    type="text"
                    value={editData.role_title || ''}
                    onChange={(e) => setEditData({...editData, role_title: e.target.value})}
                    placeholder={t('employeeProfile.roleTitle')}
                    className="bg-neutral-700 border border-neutral-600 rounded px-3 py-1 text-sm text-neutral-400 w-full"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold">{employee.first_name} {employee.last_name}</h1>
                  <p className="text-neutral-400">{employee.role_title}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-neutral-600 hover:bg-neutral-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">{t('employeeProfile.status')}</div>
            {isEditing ? (
              <select
                value={editData.status || ''}
                onChange={(e) => setEditData({...editData, status: e.target.value})}
                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 w-full mt-1"
              >
                <option value="Active">{t('employeeProfile.statusActive')}</option>
                <option value="On Leave">{t('employeeProfile.statusOnLeave')}</option>
                <option value="Terminated">{t('employeeProfile.statusTerminated')}</option>
              </select>
            ) : (
              <div className="font-medium">{employee.status}</div>
            )}
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">{t('employeeProfile.hireDate')}</div>
            {isEditing ? (
              <input
                type="date"
                value={editData.hire_date || ''}
                onChange={(e) => setEditData({...editData, hire_date: e.target.value})}
                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 w-full mt-1"
              />
            ) : (
              <div className="font-medium">{formatShortDate(employee.hire_date)}</div>
            )}
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">{t('employeeProfile.hourlyRate')}</div>
            {isEditing ? (
              <div className="flex items-center">
                <span className="mr-1">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.hourly_rate || ''}
                  onChange={(e) => setEditData({...editData, hourly_rate: parseFloat(e.target.value) || 0})}
                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 w-20 text-center"
                />
                <span className="ml-1">/hr</span>
              </div>
            ) : (
              <div className="font-medium">${employee.hourly_rate || 25}/hr</div>
            )}
          </div>
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="text-sm text-neutral-400">{t('employeeProfile.department')}</div>
            {isEditing ? (
              <select
                value={editData.department_id || ''}
                onChange={(e) => setEditData({...editData, department_id: parseInt(e.target.value) || null})}
                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 w-full mt-1"
              >
                <option value="">{t('employeeProfile.notAssigned')}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            ) : (
              <div className="font-medium">{employee.department_name || 'Not assigned'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-neutral-800 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-8"
        >
          <div className="space-y-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.personalInformation')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.email')}:</span>
                  {isEditing ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-neutral-500">{t('employeeProfile.workEmail')}</div>
                      <input
                        type="email"
                        value={editData.work_email || ''}
                        onChange={(e) => setEditData({...editData, work_email: e.target.value})}
                        className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-right w-64 font-mono text-xs text-indigo-400"
                        placeholder="firstname@letsgetmovinggroup.com"
                      />
                      <div className="text-xs text-neutral-500 mt-2">{t('employeeProfile.personalEmail')}</div>
                      <input
                        type="email"
                        value={editData.email || ''}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                        className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-right w-64"
                        placeholder={t('employeeProfile.personalEmailOptional')}
                      />
                    </div>
                  ) : (
                    <div className="text-right space-y-1">
                      <div className="font-mono text-xs text-indigo-400">
                        {employee.work_email || `${employee.first_name?.toLowerCase()}@letsgetmovinggroup.com`}
                      </div>
                      {employee.email && (
                        <div className="text-neutral-300 text-xs">
                          {employee.email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.phone')}:</span>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-right"
                    />
                  ) : (
                    <span>{employee.phone || t('employeeProfile.notProvided')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.gender')}:</span>
                  {isEditing ? (
                    <select
                      value={editData.gender || ''}
                      onChange={(e) => setEditData({...editData, gender: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    >
                      <option value="">{t('employeeProfile.notSpecified')}</option>
                      <option value="Male">{t('employeeProfile.genderMale')}</option>
                      <option value="Female">{t('employeeProfile.genderFemale')}</option>
                      <option value="Non-binary">{t('employeeProfile.genderNonBinary')}</option>
                      <option value="Prefer not to say">{t('employeeProfile.genderPreferNotToSay')}</option>
                    </select>
                  ) : (
                    <span>{employee.gender || t('employeeProfile.notSpecified')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.birthDate')}:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.birth_date || ''}
                      onChange={(e) => setEditData({...editData, birth_date: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    />
                  ) : (
                    <span>
                      {employee.birth_date && employee.birth_date !== 'Invalid Date' 
                        ? (() => {
                            try {
                              const dateStr = employee.birth_date.includes('T') 
                                ? employee.birth_date.split('T')[0] 
                                : employee.birth_date;
                              const date = new Date(dateStr + 'T00:00:00');
                              return formatShortDate(date);
                            } catch (e) {
                              console.error('❌ [EmployeeProfile] Error parsing birth date:', employee.birth_date, e);
                              return 'Invalid Date';
                            }
                          })()
                        : t('employeeProfile.notProvided')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.employmentDetails')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.hireDate')}:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.hire_date || ''}
                      onChange={(e) => setEditData({...editData, hire_date: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    />
                  ) : (
                    <span>{employee.hire_date ? formatShortDate(employee.hire_date) : t('employeeProfile.notSet')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.employmentType')}:</span>
                  {isEditing ? (
                    <select
                      value={editData.employment_type || ''}
                      onChange={(e) => setEditData({...editData, employment_type: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    >
                      <option value="Full-time">{t('employeeProfile.fullTime')}</option>
                      <option value="Part-time">{t('employeeProfile.partTime')}</option>
                      <option value="Contract">{t('employeeProfile.contract')}</option>
                    </select>
                  ) : (
                    <span>{employee.employment_type}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.department')}:</span>
                  {isEditing ? (
                    <select
                      value={editData.department_id || ''}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || null;
                        console.log('Department changed to:', newValue);
                        setEditData({...editData, department_id: newValue});
                      }}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 min-w-[200px]"
                    >
                      <option value="">{t('employeeProfile.noneToBeAssigned')}</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{employee.department_name || t('employeeProfile.notAssigned')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.location')}:</span>
                  {isEditing ? (
                    <select
                      value={editData.location_id || ''}
                      onChange={(e) => setEditData({...editData, location_id: parseInt(e.target.value) || null})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    >
                      <option value="">{t('employeeProfile.noneToBeAssigned')}</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span>{employee.location_name || t('employeeProfile.notAssigned')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{t('employeeProfile.probationEnd')}:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editData.probation_end || ''}
                      onChange={(e) => setEditData({...editData, probation_end: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    />
                  ) : (
                    <span>{employee.probation_end ? formatShortDate(employee.probation_end) : t('employeeProfile.notSet')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">📋</span> Onboarding Status
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">{t('employeeProfile.contract')}:</span>
                  {isEditing ? (
                    <select
                      value={editData.contract_status || 'Not Sent'}
                      onChange={(e) => setEditData({...editData, contract_status: e.target.value})}
                      className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                    >
                      <option value="Not Sent">{t('employeeProfile.contractNotSent')}</option>
                      <option value="Sent">{t('employeeProfile.contractSent')}</option>
                      <option value="Signed">{t('employeeProfile.contractSigned')}</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.contract_status === 'Signed' 
                        ? 'bg-green-900/50 text-green-300' 
                        : employee.contract_status === 'Sent' 
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : 'bg-neutral-700 text-neutral-400'
                    }`}>
                      {employee.contract_status || t('employeeProfile.contractNotSent')}
                    </span>
                  )}
                </div>
                {(employee.contract_signed_date || isEditing) && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t('employeeProfile.signedOn')}:</span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.contract_signed_date || ''}
                        onChange={(e) => setEditData({...editData, contract_signed_date: e.target.value})}
                        className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1"
                      />
                    ) : (
                      <span>{formatShortDate(employee.contract_signed_date)}</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">{t('employeeProfile.giftCard')}:</span>
                  {isEditing ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editData.gift_card_sent || false}
                        onChange={(e) => setEditData({...editData, gift_card_sent: e.target.checked})}
                        className="w-4 h-4 bg-neutral-700 border-neutral-600 rounded"
                      />
                      <span className="text-sm">{t('employeeProfile.sent')}</span>
                    </label>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      employee.gift_card_sent 
                        ? 'bg-green-900/50 text-green-300' 
                        : 'bg-neutral-700 text-neutral-400'
                    }`}>
                      {employee.gift_card_sent ? t('employeeProfile.sentCheckmark') : t('employeeProfile.pending')}
                    </span>
                  )}
                </div>
                {employee.onboarding_source && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t('employeeProfile.source')}:</span>
                    <span className="text-xs">{employee.onboarding_source}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.quickStats')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>{t('employeeProfile.totalHoursWorked')}</span>
                  <span className="font-bold">{formatHoursAsTime(calculateTotalHours())}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('employeeProfile.totalEarnings')}</span>
                  <span className="font-bold">${(calculateTotalEarnings() || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('employeeProfile.documents')}</span>
                  <span className="font-bold">{documents?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('employeeProfile.trainingRecords')}</span>
                  <span className="font-bold">{trainingRecords?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.recentActivity')}</h3>
              <div className="space-y-3">
                {(timeEntries || []).slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between text-sm">
                    <span>{formatShortDate(entry.work_date)}</span>
                    <span>{formatHoursAsTime(entry.hours_worked)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Tab */}
      {activeTab === "financial" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.earningsSummary')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t('employeeProfile.regularHours')}:</span>
                  <span>${((calculateTotalHours() || 0) * (parseFloat(employee?.hourly_rate) || 25)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('employeeProfile.overtime')}:</span>
                  <span>${(timeEntries || []).reduce((total, entry) => {
                    const overtimeHours = entry.overtime_hours || 0;
                    const overtimeRate = (parseFloat(employee.hourly_rate) || 25) * 1.5;
                    return total + (overtimeHours * overtimeRate);
                  }, 0).toFixed(2)}</span>
                </div>
                <hr className="border-neutral-700" />
                <div className="flex justify-between font-bold">
                  <span>{t('employeeProfile.total')}:</span>
                  <span>${(calculateTotalEarnings() || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.deductions')}</h3>
              <div className="space-y-3">
                {(() => {
                  const deductions = calculateDeductions(calculateTotalEarnings() || 0);
                  return (
                    <>
                      <div className="flex justify-between text-xs text-neutral-400 mb-2">
                        <span>{t('employeeProfile.province')}: {deductions.province}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('employeeProfile.cpp')} (5.95%):</span>
                        <span>${deductions.cpp.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('employeeProfile.ei')} (1.58%):</span>
                        <span>${deductions.ei.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('employeeProfile.federalTax')} (15%):</span>
                        <span>${deductions.federalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('employeeProfile.provincialTax')} ({(DEDUCTION_RATES.provincial_tax[deductions.province] * 100).toFixed(2)}%):</span>
                        <span>${deductions.provincialTax.toFixed(2)}</span>
                      </div>
                      <hr className="border-neutral-700" />
                      <div className="flex justify-between font-bold">
                        <span>{t('employeeProfile.totalDeductions')}:</span>
                        <span>${deductions.total.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.netPay')}</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${(() => {
                    const gross = calculateTotalEarnings() || 0;
                    const deductions = calculateDeductions(gross);
                    return (gross - deductions.total).toFixed(2);
                  })()}
                </div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.netEarningsAfterDeductions')}</div>
            </div>
          </div>
          </div>

          {/* YTD (Year-to-Date) Summary */}
          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 p-6 rounded-lg border border-indigo-700/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">📊</span> {t('employeeProfile.yearToDateSummary', { year: new Date().getFullYear() })}
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {(() => {
                const gross = calculateTotalEarnings() || 0;
                const deductions = calculateDeductions(gross);
                const net = gross - deductions.total;
                
                return (
                  <>
                    <div className="text-center">
                      <div className="text-sm text-neutral-400 mb-1">{t('employeeProfile.grossEarnings')}</div>
                      <div className="text-2xl font-bold text-green-400">${gross.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-neutral-400 mb-1">{t('employeeProfile.cppDeducted')}</div>
                      <div className="text-xl font-semibold">${deductions.cpp.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-neutral-400 mb-1">{t('employeeProfile.eiDeducted')}</div>
                      <div className="text-xl font-semibold">${deductions.ei.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-neutral-400 mb-1">{t('employeeProfile.taxWithheld')}</div>
                      <div className="text-xl font-semibold">${(deductions.federalTax + deductions.provincialTax).toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-neutral-400 mb-1">{t('employeeProfile.netPay')}</div>
                      <div className="text-2xl font-bold text-indigo-400">${net.toFixed(2)}</div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="mt-4 text-xs text-neutral-400 text-center">
              {t('employeeProfile.basedOnTimeEntries', { province: getEmployeeProvince() })}
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.payrollHistory')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">{t('employeeProfile.period')}</th>
                    <th className="text-left py-2">{t('employeeProfile.hours')}</th>
                    <th className="text-left py-2">{t('employeeProfile.rate')}</th>
                    <th className="text-left py-2">{t('employeeProfile.gross')}</th>
                    <th className="text-left py-2">{t('employeeProfile.deductions')}</th>
                    <th className="text-left py-2">{t('employeeProfile.net')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrollHistory || []).map((payroll) => (
                    <tr key={payroll.id} className="border-b border-neutral-700">
                      <td className="py-2">{formatShortDate(payroll.pay_period_start)} - {formatShortDate(payroll.pay_period_end)}</td>
                      <td className="py-2">{payroll.total_hours}</td>
                      <td className="py-2">${payroll.hourly_rate}</td>
                      <td className="py-2">${payroll.gross_pay}</td>
                      <td className="py-2">${payroll.total_deductions}</td>
                      <td className="py-2">${payroll.net_pay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Time Tracking Tab */}
      {activeTab === "time" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.timeEntries')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">{t('employeeProfile.day')}</th>
                    <th className="text-left py-2">{t('employeeProfile.date')}</th>
                    <th className="text-left py-2">{t('employeeProfile.clockIn')}</th>
                    <th className="text-left py-2">{t('employeeProfile.clockOut')}</th>
                    <th className="text-right py-2">{t('employeeProfile.hours')}</th>
                    <th className="text-right py-2">{t('employeeProfile.dailyTotal')}</th>
                    <th className="text-left py-2 pl-8">{t('employeeProfile.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group entries by date
                    const entriesByDate = {};
                    (timeEntries || []).forEach(entry => {
                      const date = entry.work_date;
                      if (!entriesByDate[date]) {
                        entriesByDate[date] = [];
                      }
                      entriesByDate[date].push(entry);
                    });

                    // Render grouped entries (oldest first, newest last)
                    return Object.keys(entriesByDate).sort().map(date => {
                      const dayEntries = entriesByDate[date];
                      const dailyTotal = dayEntries.reduce((sum, e) => sum + parseFloat(e.hours_worked || 0), 0);
                      
                      return dayEntries.map((entry, idx) => (
                        <tr key={entry.id} className="border-b border-neutral-700">
                          <td className="py-2 font-medium">
                            {idx === 0 ? formatShortDate(entry.work_date) : ''}
                          </td>
                          <td className="py-2">
                            {idx === 0 ? formatShortDate(entry.work_date) : ''}
                          </td>
                          <td className="py-2">{entry.clock_in ? (typeof entry.clock_in === 'string' && entry.clock_in.length <= 8 ? entry.clock_in.slice(0, 5) : new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})) : '-'}</td>
                          <td className="py-2">{entry.clock_out ? (typeof entry.clock_out === 'string' && entry.clock_out.length <= 8 ? entry.clock_out.slice(0, 5) : new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})) : '-'}</td>
                          <td className="py-2 text-right">{entry.hours_worked ? formatHoursAsTime(parseFloat(entry.hours_worked)) : '-'}</td>
                          <td className="py-2 text-right font-semibold text-indigo-400">
                            {idx === dayEntries.length - 1 ? formatHoursAsTime(dailyTotal) : ''}
                          </td>
                          <td className="py-2 pl-8 text-sm text-neutral-400">{entry.notes || ''}</td>
                        </tr>
                      ));
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">{t('employeeProfile.employeeDocuments')}</h3>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition"
              >
                <span>📤</span>
                <span>{t('employeeProfile.uploadDocument')}</span>
              </button>
            </div>

            {(() => {
              const categorized = categorizeDocuments();
              const hasDocuments = documents && documents.length > 0;

              if (!hasDocuments) {
                return (
                  <div className="text-center py-12 text-neutral-400">
                    <div className="text-6xl mb-4">📁</div>
                    <p>{t('employeeProfile.noDocumentsUploadedYet')}</p>
                    <p className="text-sm mt-2">{t('employeeProfile.clickUploadDocumentToAddFiles')}</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Financial Documents */}
                  {categorized.Financial && categorized.Financial.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-300 mb-3 flex items-center">
                        <span className="mr-2">💰</span> {t('employeeProfile.financialDocuments')}
                      </h4>
                      <div className="grid gap-3">
                        {categorized.Financial.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg hover:bg-neutral-650 transition">
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl">{getDocumentIcon(doc.doc_type)}</div>
                              <div>
                                <div className="font-medium">{formatDocType(doc.doc_type)}</div>
                                <div className="text-sm text-neutral-400">{doc.file_name}</div>
                                <div className="text-xs text-neutral-500">
                                  {t('employeeProfile.uploaded')}: {formatShortDate(doc.uploaded_on)}
                                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                doc.signed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                              }`}>
                                {doc.signed ? t('employeeProfile.signedCheckmark') : t('employeeProfile.pending')}
                              </span>
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                              >
                                👁️ {t('employeeProfile.view')}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-neutral-400 hover:text-red-400 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Immigration Documents */}
                  {categorized.Immigration && categorized.Immigration.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-300 mb-3 flex items-center">
                        <span className="mr-2">🛂</span> {t('employeeProfile.immigrationStatus')}
                      </h4>
                      <div className="grid gap-3">
                        {categorized.Immigration.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg hover:bg-neutral-650 transition">
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl">{getDocumentIcon(doc.doc_type)}</div>
                              <div>
                                <div className="font-medium">{formatDocType(doc.doc_type)}</div>
                                <div className="text-sm text-neutral-400">{doc.file_name}</div>
                                <div className="text-xs text-neutral-500">
                                  {t('employeeProfile.uploaded')}: {formatShortDate(doc.uploaded_on)}
                                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                doc.signed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                              }`}>
                                {doc.signed ? t('employeeProfile.signedCheckmark') : t('employeeProfile.pending')}
                              </span>
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                              >
                                👁️ {t('employeeProfile.view')}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-neutral-400 hover:text-red-400 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employment Documents */}
                  {categorized.Employment && categorized.Employment.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-300 mb-3 flex items-center">
                        <span className="mr-2">📄</span> {t('employeeProfile.employmentDocuments')}
                      </h4>
                      <div className="grid gap-3">
                        {categorized.Employment.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg hover:bg-neutral-650 transition">
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl">{getDocumentIcon(doc.doc_type)}</div>
                              <div>
                                <div className="font-medium">{formatDocType(doc.doc_type)}</div>
                                <div className="text-sm text-neutral-400">{doc.file_name}</div>
                                <div className="text-xs text-neutral-500">
                                  {t('employeeProfile.uploaded')}: {formatShortDate(doc.uploaded_on)}
                                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                doc.signed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                              }`}>
                                {doc.signed ? t('employeeProfile.signedCheckmark') : t('employeeProfile.pending')}
                              </span>
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                              >
                                👁️ {t('employeeProfile.view')}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-neutral-400 hover:text-red-400 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Documents */}
                  {categorized.Other && categorized.Other.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-300 mb-3 flex items-center">
                        <span className="mr-2">📎</span> {t('employeeProfile.otherDocuments')}
                      </h4>
                      <div className="grid gap-3">
                        {categorized.Other.map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg hover:bg-neutral-650 transition">
                            <div className="flex items-center space-x-4">
                              <div className="text-3xl">{getDocumentIcon(doc.doc_type)}</div>
                              <div>
                                <div className="font-medium">{formatDocType(doc.doc_type)}</div>
                                <div className="text-sm text-neutral-400">{doc.file_name}</div>
                                <div className="text-xs text-neutral-500">
                                  {t('employeeProfile.uploaded')}: {formatShortDate(doc.uploaded_on)}
                                  {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(1)} KB`}
                                </div>
                                {doc.notes && (
                                  <div className="text-xs text-neutral-400 mt-1">{t('employeeProfile.note')}: {doc.notes}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                doc.signed ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                              }`}>
                                {doc.signed ? t('employeeProfile.signedCheckmark') : t('employeeProfile.pending')}
                              </span>
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                              >
                                👁️ {t('employeeProfile.view')}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-neutral-400 hover:text-red-400 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neutral-800 p-6 rounded-lg max-w-md w-full mx-4"
              >
                <h3 className="text-xl font-semibold mb-4">{t('employeeProfile.uploadDocument')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('employeeProfile.documentType')} *</label>
                    <select
                      value={uploadData.doc_type}
                      onChange={(e) => setUploadData({...uploadData, doc_type: e.target.value})}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2"
                    >
                      <option value="Contract">{t('employeeProfile.docTypeContract')}</option>
                      <option value="VoidCheque">{t('employeeProfile.docTypeVoidCheque')}</option>
                      <option value="DirectDeposit">{t('employeeProfile.docTypeDirectDeposit')}</option>
                      <option value="WorkPermit">{t('employeeProfile.docTypeWorkPermit')}</option>
                      <option value="PR_Card">{t('employeeProfile.docTypePRCard')}</option>
                      <option value="Citizenship">{t('employeeProfile.docTypeCitizenship')}</option>
                      <option value="SIN_Document">{t('employeeProfile.docTypeSINDocument')}</option>
                      <option value="StudyPermit">{t('employeeProfile.docTypeStudyPermit')}</option>
                      <option value="PolicyAck">{t('employeeProfile.docTypePolicyAck')}</option>
                      <option value="Visa">{t('employeeProfile.docTypeVisa')}</option>
                      <option value="Other">{t('common.other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('employeeProfile.category')}</label>
                    <select
                      value={uploadData.document_category}
                      onChange={(e) => setUploadData({...uploadData, document_category: e.target.value})}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2"
                    >
                      <option value="Financial">{t('employeeProfile.categoryFinancial')}</option>
                      <option value="Immigration">{t('employeeProfile.categoryImmigration')}</option>
                      <option value="Employment">{t('employeeProfile.categoryEmployment')}</option>
                      <option value="Personal">{t('employeeProfile.categoryPersonal')}</option>
                      <option value="Other">{t('common.other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('employeeProfile.file')} *</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-sm"
                    />
                    {uploadData.file && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {t('employeeProfile.selected')}: {uploadData.file_name} ({(uploadData.file.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('employeeProfile.notes')}</label>
                    <textarea
                      value={uploadData.notes}
                      onChange={(e) => setUploadData({...uploadData, notes: e.target.value})}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-sm"
                      rows="3"
                      placeholder={t('employeeProfile.optionalNotesPlaceholder')}
                    ></textarea>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="signed"
                      checked={uploadData.signed}
                      onChange={(e) => setUploadData({...uploadData, signed: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="signed" className="text-sm">{t('employeeProfile.documentIsSigned')}</label>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleUploadDocument}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition"
                    >
                      {t('common.upload')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadData({
                          doc_type: 'Other',
                          document_category: 'Other',
                          file_name: '',
                          file: null,
                          notes: '',
                          signed: false
                        });
                      }}
                      className="flex-1 bg-neutral-700 hover:bg-neutral-600 px-4 py-2 rounded-lg transition"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* HR Details Tab */}
      {activeTab === "hr" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.identifiers')}</h3>
            <div className="space-y-4">
              {/* SIN Number */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.sinNumber')}</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.sin_number || ''}
                    onChange={(e) => setEditData({...editData, sin_number: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.sinPlaceholder')}
                  />
                ) : (
                  <div className="font-mono text-indigo-400">{employee.sin_number || '—'}</div>
                )}
              </div>
              {/* SIN Expiry Date */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.sinExpiryDate')}</div>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.sin_expiry_date ? editData.sin_expiry_date.split('T')[0] : ''}
                    onChange={(e) => setEditData({...editData, sin_expiry_date: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <div>
                    {employee.sin_expiry_date ? (() => {
                      try {
                        const dateStr = employee.sin_expiry_date.includes('T') 
                          ? employee.sin_expiry_date.split('T')[0] 
                          : employee.sin_expiry_date;
                        const date = new Date(dateStr + 'T00:00:00');
                        return date.toLocaleDateString();
                      } catch (e) {
                        return 'Invalid';
                      }
                    })() : '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.bankAccounts')}</h3>
            <div className="space-y-4">
              {/* Bank Name */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.bankName')}</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.bank_name || ''}
                    onChange={(e) => setEditData({...editData, bank_name: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.bankName')}
                  />
                ) : (
                  <div>{employee.bank_name || '—'}</div>
                )}
              </div>
              {/* Transit Number */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.transitNumber')}</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.bank_transit_number || ''}
                    onChange={(e) => setEditData({...editData, bank_transit_number: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.transitNumberPlaceholder')}
                  />
                ) : (
                  <div>{employee.bank_transit_number || '—'}</div>
                )}
              </div>
              {/* Account Number */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.accountNumber')}</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.bank_account_number || ''}
                    onChange={(e) => setEditData({...editData, bank_account_number: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.accountNumber')}
                  />
                ) : (
                  <div className="font-mono">{employee.bank_account_number || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.addresses')}</h3>
            <div className="space-y-4">
              {/* Full Address */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.fullAddress')}</div>
                {isEditing ? (
                  <textarea
                    value={editData.full_address || ''}
                    onChange={(e) => setEditData({...editData, full_address: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.fullAddress')}
                    rows={3}
                  />
                ) : (
                  <div>{employee.full_address || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.emergencyContacts')}</h3>
            <div className="space-y-4">
              {/* Emergency Contact Name */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.emergencyContactName')}</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.emergency_contact_name || ''}
                    onChange={(e) => setEditData({...editData, emergency_contact_name: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.contactName')}
                  />
                ) : (
                  <div>{employee.emergency_contact_name || '—'}</div>
                )}
              </div>
              {/* Emergency Contact Phone */}
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('employeeProfile.emergencyContactPhone')}</div>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.emergency_contact_phone || ''}
                    onChange={(e) => setEditData({...editData, emergency_contact_phone: e.target.value})}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:border-indigo-500"
                    placeholder={t('employeeProfile.phoneNumber')}
                  />
                ) : (
                  <div>{employee.emergency_contact_phone || '—'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.compensationHistory')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left py-2">{t('employeeProfile.effective')}</th>
                    <th className="text-left py-2">{t('employeeProfile.type')}</th>
                    <th className="text-left py-2">{t('employeeProfile.rate')}</th>
                    <th className="text-left py-2">{t('employeeProfile.hoursBiweekly')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(hrDetails.compensation_history || []).map(ch => (
                    <tr key={ch.id} className="border-b border-neutral-700">
                      <td className="py-2">{formatShortDate(ch.effective_date)}</td>
                      <td className="py-2">{ch.rate_type}</td>
                      <td className="py-2">${ch.regular_rate}</td>
                      <td className="py-2">{ch.hours_biweekly ?? '—'}</td>
                    </tr>
                  ))}
                  {(!hrDetails.compensation_history || hrDetails.compensation_history.length === 0) && (
                    <tr><td className="text-neutral-400 text-sm py-2" colSpan={4}>{t('employeeProfile.noCompensationRecords')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.statusHistory')}</h3>
            <div className="space-y-2">
              {(hrDetails.status_history || []).map(sh => (
                <div key={sh.id} className="flex justify-between text-sm">
                  <span>{sh.status}</span>
                  <span>{formatShortDate(sh.status_date)}</span>
                </div>
              ))}
              {(!hrDetails.status_history || hrDetails.status_history.length === 0) && (
                <div className="text-neutral-400 text-sm">{t('employeeProfile.noStatusHistory')}</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Training Tab */}
      {activeTab === "training" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{t('employeeProfile.trainingRecords')}</h3>
            <div className="grid gap-4">
              {(trainingRecords || []).map((record) => (
                <div key={record.id} className="flex justify-between items-center p-4 bg-neutral-700 rounded-lg">
                  <div>
                    <div className="font-medium">{record.training_name}</div>
                    <div className="text-sm text-neutral-400">{t('employeeProfile.completed')}: {formatShortDate(record.completed_on)}</div>
                    <div className="text-xs text-neutral-500">{t('employeeProfile.validFor', { months: record.validity_months })}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      new Date(record.completed_on).getTime() + (record.validity_months * 30 * 24 * 60 * 60 * 1000) > Date.now()
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {new Date(record.completed_on).getTime() + (record.validity_months * 30 * 24 * 60 * 60 * 1000) > Date.now()
                        ? t('employeeProfile.valid')
                        : t('employeeProfile.expired')
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Termination Tab */}
      {activeTab === "termination" && terminationDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-red-900/20 border border-red-700 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-red-400">⚠️ {t('employeeProfile.terminationInformation')}</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.terminationDate')}</div>
                <div className="font-medium text-lg">{terminationDetails.termination_date ? formatShortDate(terminationDetails.termination_date) : t('common.n/a')}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.terminationType')}</div>
                <div className="font-medium">{terminationDetails.termination_type || t('common.n/a')}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.reasonCategory')}</div>
                <div className="font-medium">{terminationDetails.reason_category || t('common.n/a')}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.initiatedBy')}</div>
                <div className="font-medium">{terminationDetails.initiated_by || t('common.n/a')}</div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-800 p-6 rounded-lg">
            <h4 className="font-semibold mb-3">{t('employeeProfile.terminationReason')}</h4>
            <p className="text-neutral-300">{terminationDetails.termination_reason || t('employeeProfile.noReasonProvided')}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">{t('employeeProfile.timeline')}</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.noticePeriod')}</div>
                  <div className="font-medium">{terminationDetails.notice_period_days || 0} {t('employeeProfile.days')}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.lastWorkingDay')}</div>
                  <div className="font-medium">{terminationDetails.last_working_day ? formatShortDate(terminationDetails.last_working_day) : t('common.n/a')}</div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">{t('employeeProfile.financialSummary')}</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.severancePayment')}</div>
                  <div className="font-medium">{terminationDetails.severance_paid ? `$${terminationDetails.severance_amount || 0}` : t('employeeProfile.notPaid')}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.vacationPayout')}</div>
                  <div className="font-medium">${terminationDetails.vacation_payout || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.finalPayDate')}</div>
                  <div className="font-medium">{terminationDetails.final_pay_date ? formatShortDate(terminationDetails.final_pay_date) : t('common.n/a')}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">{t('employeeProfile.benefitsEndDate')}</div>
                  <div className="font-medium">{terminationDetails.benefits_end_date ? formatShortDate(terminationDetails.benefits_end_date) : t('common.n/a')}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Exit Details Tab */}
      {activeTab === "exit" && terminationDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-neutral-800 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">{t('employeeProfile.exitInterview')}</h4>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.interviewDate')}</div>
                <div className="font-medium">{terminationDetails.exit_interview_date ? formatShortDate(terminationDetails.exit_interview_date) : t('employeeProfile.notConducted')}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-400">{t('employeeProfile.conductedBy')}</div>
                <div className="font-medium">{terminationDetails.exit_interview_conducted_by || t('common.n/a')}</div>
              </div>
            </div>
            {terminationDetails.exit_interview_notes && (
              <div>
                <div className="text-sm text-neutral-400 mb-2">{t('employeeProfile.interviewNotes')}</div>
                <div className="bg-neutral-700 p-4 rounded text-neutral-300 whitespace-pre-wrap">{terminationDetails.exit_interview_notes}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">{t('employeeProfile.equipmentReturn')}</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-sm ${terminationDetails.equipment_returned ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {terminationDetails.equipment_returned ? t('employeeProfile.returnedCheckmark') : t('employeeProfile.notReturned')}
                  </span>
                </div>
                {terminationDetails.equipment_return_date && (
                  <div>
                    <div className="text-sm text-neutral-400">{t('employeeProfile.returnDate')}</div>
                    <div className="font-medium">{formatShortDate(terminationDetails.equipment_return_date)}</div>
                  </div>
                )}
                {terminationDetails.equipment_return_notes && (
                  <div>
                    <div className="text-sm text-neutral-400">{t('employeeProfile.notes')}</div>
                    <div className="text-neutral-300">{terminationDetails.equipment_return_notes}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">{t('employeeProfile.systemAccess')}</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-sm ${terminationDetails.access_revoked ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {terminationDetails.access_revoked ? t('employeeProfile.revokedCheckmark') : t('employeeProfile.notRevoked')}
                  </span>
                </div>
                {terminationDetails.access_revoked_date && (
                  <div>
                    <div className="text-sm text-neutral-400">{t('employeeProfile.revokedDate')}</div>
                    <div className="font-medium">{formatShortDate(terminationDetails.access_revoked_date)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {terminationDetails.final_pay_notes && (
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h4 className="font-semibold mb-3">{t('employeeProfile.finalPayNotes')}</h4>
              <div className="bg-neutral-700 p-4 rounded text-neutral-300 whitespace-pre-wrap">{terminationDetails.final_pay_notes}</div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
