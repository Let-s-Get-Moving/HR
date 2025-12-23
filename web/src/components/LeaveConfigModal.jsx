import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { useUserRole, hasFullAccess } from '../hooks/useUserRole.js';

export default function LeaveConfigModal({ isOpen, onClose, initialTab = 'leave-types' }) {
  const { t } = useTranslation();
  const { userRole } = useUserRole();
  const canManage = hasFullAccess(userRole);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Leave Types state
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [editingLeaveTypeData, setEditingLeaveTypeData] = useState(null);
  const [addingLeaveType, setAddingLeaveType] = useState(false);
  const [deletingLeaveType, setDeletingLeaveType] = useState(null);
  const [leaveTypeError, setLeaveTypeError] = useState('');
  const leaveTypeInputRefs = useRef({});
  
  // Allocations state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [balances, setBalances] = useState([]);
  const [editingBalances, setEditingBalances] = useState({});
  const [savingBalances, setSavingBalances] = useState(false);
  
  // Bulk operations state
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkLeaveType, setBulkLeaveType] = useState('all');
  const [bulkOperation, setBulkOperation] = useState('set');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [executingBulk, setExecutingBulk] = useState(false);
  
  // Policies state
  const [policies, setPolicies] = useState([]);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editingPolicyData, setEditingPolicyData] = useState(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      loadLeaveTypes();
      loadEmployees();
      loadDepartments();
      loadJobTitles();
      if (activeTab === 'allocations' && selectedEmployee) {
        loadBalances(selectedEmployee, selectedYear);
      }
      if (activeTab === 'policies') {
        loadPolicies();
      }
    }
  }, [isOpen, activeTab, selectedEmployee, selectedYear]);
  
  // Load functions
  const loadLeaveTypes = async () => {
    try {
      const types = await API('/api/leave/types');
      setLeaveTypes(types || []);
    } catch (error) {
      console.error('Error loading leave types:', error);
      setLeaveTypes([]);
    }
  };
  
  const loadEmployees = async () => {
    try {
      const emps = await API('/api/employees');
      setEmployees((emps || []).filter(e => e.status === 'Active'));
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
  };
  
  const loadDepartments = async () => {
    try {
      const depts = await API('/api/departments');
      setDepartments(depts || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };
  
  const loadJobTitles = async () => {
    try {
      const jobs = await API('/api/job-titles');
      setJobTitles(jobs || []);
    } catch (error) {
      console.error('Error loading job titles:', error);
      setJobTitles([]);
    }
  };
  
  const loadBalances = async (employeeId, year) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const balancesData = await API(`/api/leave/balances?employee_id=${employeeId}&year=${year}`);
      setBalances(balancesData || []);
      
      // Initialize editing state
      const editingState = {};
      (balancesData || []).forEach(b => {
        editingState[b.id] = parseFloat(b.entitled_days);
      });
      setEditingBalances(editingState);
    } catch (error) {
      console.error('Error loading balances:', error);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadPolicies = async () => {
    try {
      const policiesData = await API('/api/leave/policies');
      setPolicies(policiesData || []);
    } catch (error) {
      console.error('Error loading policies:', error);
      setPolicies([]);
    }
  };
  
  // Leave Types handlers
  const handleAddLeaveType = async (e) => {
    e.preventDefault();
    const name = leaveTypeInputRefs.current.name?.value?.trim() || '';
    const description = leaveTypeInputRefs.current.description?.value?.trim() || '';
    const default_annual_entitlement = parseInt(leaveTypeInputRefs.current.default_annual_entitlement?.value || '0', 10) || 0;
    const is_paid = leaveTypeInputRefs.current.is_paid?.checked !== false;
    const requires_approval = leaveTypeInputRefs.current.requires_approval?.checked !== false;
    const color = leaveTypeInputRefs.current.color?.value || '#3B82F6';
    
    if (!name) {
      setLeaveTypeError(t('settings.leavePolicies.nameRequired'));
      return;
    }
    
    setAddingLeaveType(true);
    setLeaveTypeError('');
    
    try {
      await API('/api/leave/types', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || null,
          default_annual_entitlement,
          is_paid,
          requires_approval,
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
      console.error('Error adding leave type:', error);
      setLeaveTypeError(error.message || t('settings.leavePolicies.addError'));
    } finally {
      setAddingLeaveType(false);
    }
  };
  
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
        method: 'PUT',
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
      console.error('Error updating leave type:', error);
      setLeaveTypeError(error.message || t('settings.leavePolicies.updateError'));
    } finally {
      setAddingLeaveType(false);
    }
  };
  
  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm(t('settings.leavePolicies.confirmDelete'))) {
      return;
    }
    
    setDeletingLeaveType(id);
    
    try {
      await API(`/api/leave/types/${id}`, {
        method: 'DELETE'
      });
      
      await loadLeaveTypes();
    } catch (error) {
      console.error('Error deleting leave type:', error);
      alert(error.message || t('settings.leavePolicies.deleteError'));
    } finally {
      setDeletingLeaveType(null);
    }
  };
  
  // Allocation handlers
  const handleBalanceChange = (balanceId, value) => {
    setEditingBalances(prev => ({
      ...prev,
      [balanceId]: parseFloat(value) || 0
    }));
  };
  
  const handleSaveBalances = async () => {
    if (!selectedEmployee) return;
    
    setSavingBalances(true);
    try {
      const updates = Object.entries(editingBalances).map(([balanceId, entitledDays]) => {
        const balance = balances.find(b => b.id === parseInt(balanceId));
        return {
          employee_id: selectedEmployee,
          leave_type_id: balance.leave_type_id,
          year: selectedYear,
          entitled_days: entitledDays
        };
      });
      
      await API('/api/leave/balances/bulk', {
        method: 'POST',
        body: JSON.stringify({ updates })
      });
      
      await loadBalances(selectedEmployee, selectedYear);
      alert('Balances updated successfully');
    } catch (error) {
      console.error('Error saving balances:', error);
      alert(error.message || 'Failed to save balances');
    } finally {
      setSavingBalances(false);
    }
  };
  
  const handleInitializeBalances = async () => {
    if (!selectedEmployee) return;
    
    if (!window.confirm(`Initialize balances for this employee from default entitlements?`)) {
      return;
    }
    
    try {
      await API('/api/leave/balances/initialize', {
        method: 'POST',
        body: JSON.stringify({
          employee_ids: [selectedEmployee],
          year: selectedYear,
          leave_type_ids: null // All types
        })
      });
      
      await loadBalances(selectedEmployee, selectedYear);
      alert('Balances initialized successfully');
    } catch (error) {
      console.error('Error initializing balances:', error);
      alert(error.message || 'Failed to initialize balances');
    }
  };
  
  // Bulk operations handlers
  const handleBulkPreview = () => {
    if (bulkSelectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    if (!bulkValue || isNaN(parseFloat(bulkValue))) {
      alert('Please enter a valid number');
      return;
    }
    
    const preview = [];
    bulkSelectedEmployees.forEach(empId => {
      leaveTypes.forEach(lt => {
        if (bulkLeaveType !== 'all' && lt.id !== parseInt(bulkLeaveType)) return;
        
        preview.push({
          employee_id: empId,
          employee_name: employees.find(e => e.id === empId)?.first_name + ' ' + employees.find(e => e.id === empId)?.last_name,
          leave_type_id: lt.id,
          leave_type_name: lt.name,
          current_value: 0, // Would need to fetch current balances
          new_value: parseFloat(bulkValue)
        });
      });
    });
    
    setBulkPreview(preview);
  };
  
  const handleExecuteBulk = async () => {
    if (bulkPreview.length === 0) {
      alert('Please generate preview first');
      return;
    }
    
    setExecutingBulk(true);
    try {
      const updates = bulkPreview.map(p => ({
        employee_id: p.employee_id,
        leave_type_id: p.leave_type_id,
        year: bulkYear,
        entitled_days: p.new_value
      }));
      
      await API('/api/leave/balances/bulk', {
        method: 'POST',
        body: JSON.stringify({ updates })
      });
      
      setBulkPreview([]);
      setBulkSelectedEmployees([]);
      setBulkValue('');
      alert('Bulk update completed successfully');
    } catch (error) {
      console.error('Error executing bulk update:', error);
      alert(error.message || 'Failed to execute bulk update');
    } finally {
      setExecutingBulk(false);
    }
  };
  
  // Policy handlers
  const handleSavePolicy = async () => {
    if (!editingPolicyData) return;
    
    setSavingPolicy(true);
    try {
      if (editingPolicy) {
        await API(`/api/leave/policies/${editingPolicy}`, {
          method: 'PUT',
          body: JSON.stringify(editingPolicyData)
        });
      } else {
        await API('/api/leave/policies', {
          method: 'POST',
          body: JSON.stringify(editingPolicyData)
        });
      }
      
      setEditingPolicy(null);
      setEditingPolicyData(null);
      await loadPolicies();
      alert('Policy saved successfully');
    } catch (error) {
      console.error('Error saving policy:', error);
      alert(error.message || 'Failed to save policy');
    } finally {
      setSavingPolicy(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-black/50 absolute inset-0" />
      <div
        className="relative rounded-tahoe-input shadow-xl backdrop-blur-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">{t('settings.leavePolicies.title')}</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('leave-types')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'leave-types'
                ? 'border-b-2 border-tahoe-accent text-tahoe-accent'
                : 'text-secondary hover:text-white'
            }`}
          >
            Leave Types
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'allocations'
                ? 'border-b-2 border-tahoe-accent text-tahoe-accent'
                : 'text-secondary hover:text-white'
            }`}
          >
            Allocations
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'bulk'
                ? 'border-b-2 border-tahoe-accent text-tahoe-accent'
                : 'text-secondary hover:text-white'
            }`}
          >
            Bulk Operations
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'policies'
                ? 'border-b-2 border-tahoe-accent text-tahoe-accent'
                : 'text-secondary hover:text-white'
            }`}
          >
            Policies
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'leave-types' && (
            <LeaveTypesTab
              leaveTypes={leaveTypes}
              editingLeaveType={editingLeaveType}
              editingLeaveTypeData={editingLeaveTypeData}
              setEditingLeaveType={setEditingLeaveType}
              setEditingLeaveTypeData={setEditingLeaveTypeData}
              addingLeaveType={addingLeaveType}
              deletingLeaveType={deletingLeaveType}
              leaveTypeError={leaveTypeError}
              leaveTypeInputRefs={leaveTypeInputRefs}
              handleAddLeaveType={handleAddLeaveType}
              handleUpdateLeaveType={handleUpdateLeaveType}
              handleDeleteLeaveType={handleDeleteLeaveType}
              canManage={canManage}
              t={t}
            />
          )}
          
          {activeTab === 'allocations' && (
            <AllocationsTab
              employees={employees}
              leaveTypes={leaveTypes}
              selectedEmployee={selectedEmployee}
              setSelectedEmployee={setSelectedEmployee}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              balances={balances}
              editingBalances={editingBalances}
              handleBalanceChange={handleBalanceChange}
              handleSaveBalances={handleSaveBalances}
              handleInitializeBalances={handleInitializeBalances}
              savingBalances={savingBalances}
              loading={loading}
              canManage={canManage}
              t={t}
            />
          )}
          
          {activeTab === 'bulk' && (
            <BulkOperationsTab
              employees={employees}
              leaveTypes={leaveTypes}
              bulkSelectedEmployees={bulkSelectedEmployees}
              setBulkSelectedEmployees={setBulkSelectedEmployees}
              bulkYear={bulkYear}
              setBulkYear={setBulkYear}
              bulkLeaveType={bulkLeaveType}
              setBulkLeaveType={setBulkLeaveType}
              bulkOperation={bulkOperation}
              setBulkOperation={setBulkOperation}
              bulkValue={bulkValue}
              setBulkValue={setBulkValue}
              bulkPreview={bulkPreview}
              handleBulkPreview={handleBulkPreview}
              handleExecuteBulk={handleExecuteBulk}
              executingBulk={executingBulk}
              canManage={canManage}
              t={t}
            />
          )}
          
          {activeTab === 'policies' && (
            <PoliciesTab
              policies={policies}
              leaveTypes={leaveTypes}
              departments={departments}
              jobTitles={jobTitles}
              employees={employees}
              editingPolicy={editingPolicy}
              editingPolicyData={editingPolicyData}
              setEditingPolicy={setEditingPolicy}
              setEditingPolicyData={setEditingPolicyData}
              handleSavePolicy={handleSavePolicy}
              savingPolicy={savingPolicy}
              canManage={canManage}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Leave Types Tab Component
function LeaveTypesTab({
  leaveTypes,
  editingLeaveType,
  editingLeaveTypeData,
  setEditingLeaveType,
  setEditingLeaveTypeData,
  addingLeaveType,
  deletingLeaveType,
  leaveTypeError,
  leaveTypeInputRefs,
  handleAddLeaveType,
  handleUpdateLeaveType,
  handleDeleteLeaveType,
  canManage,
  t
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">{t('settings.leavePolicies.description')}</p>
      
      {canManage && (
        <div className="card p-6">
          <h4 className="text-lg font-medium mb-4">
            {editingLeaveType ? t('settings.leavePolicies.edit') : t('settings.leavePolicies.addNew')}
          </h4>
          <form onSubmit={editingLeaveType ? (e) => { e.preventDefault(); handleUpdateLeaveType(editingLeaveType); } : handleAddLeaveType} className="space-y-4">
            {editingLeaveType ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.name')} *</label>
                    <input
                      type="text"
                      value={editingLeaveTypeData?.name ?? ''}
                      onChange={(e) => {
                        setEditingLeaveTypeData({...editingLeaveTypeData, name: e.target.value});
                      }}
                      placeholder={t('settings.leavePolicies.namePlaceholder')}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.annualEntitlement')} *</label>
                    <input
                      type="number"
                      min="0"
                      value={editingLeaveTypeData?.default_annual_entitlement ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setEditingLeaveTypeData({...editingLeaveTypeData, default_annual_entitlement: val});
                      }}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.descriptionLabel')}</label>
                  <textarea
                    value={editingLeaveTypeData?.description ?? ''}
                    onChange={(e) => {
                      setEditingLeaveTypeData({...editingLeaveTypeData, description: e.target.value});
                    }}
                    placeholder={t('settings.leavePolicies.descriptionPlaceholder')}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    rows="2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="modal_is_paid"
                      checked={editingLeaveTypeData?.is_paid ?? true}
                      onChange={(e) => {
                        setEditingLeaveTypeData({...editingLeaveTypeData, is_paid: e.target.checked});
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="modal_is_paid" className="text-sm">{t('settings.leavePolicies.isPaid')}</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="modal_requires_approval"
                      checked={editingLeaveTypeData?.requires_approval ?? true}
                      onChange={(e) => {
                        setEditingLeaveTypeData({...editingLeaveTypeData, requires_approval: e.target.checked});
                      }}
                      className="mr-2"
                    />
                    <label htmlFor="modal_requires_approval" className="text-sm">{t('settings.leavePolicies.requiresApproval')}</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.color')}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={editingLeaveTypeData?.color ?? '#3B82F6'}
                        onChange={(e) => {
                          setEditingLeaveTypeData({...editingLeaveTypeData, color: e.target.value});
                        }}
                        className="h-10 w-20 rounded border"
                      />
                      <input
                        type="text"
                        value={editingLeaveTypeData?.color ?? '#3B82F6'}
                        onChange={(e) => {
                          setEditingLeaveTypeData({...editingLeaveTypeData, color: e.target.value});
                        }}
                        placeholder="#3B82F6"
                        className="flex-1 px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addingLeaveType}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingLeaveType ? t('settings.leavePolicies.saving') : t('settings.leavePolicies.update')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeaveType(null);
                      setEditingLeaveTypeData(null);
                    }}
                    className="btn-secondary"
                  >
                    {t('settings.leavePolicies.cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.name')} *</label>
                    <input
                      ref={(el) => leaveTypeInputRefs.current.name = el}
                      type="text"
                      defaultValue=""
                      placeholder={t('settings.leavePolicies.namePlaceholder')}
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.annualEntitlement')} *</label>
                    <input
                      ref={(el) => leaveTypeInputRefs.current.default_annual_entitlement = el}
                      type="number"
                      min="0"
                      defaultValue="0"
                      className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.descriptionLabel')}</label>
                  <textarea
                    ref={(el) => leaveTypeInputRefs.current.description = el}
                    defaultValue=""
                    placeholder={t('settings.leavePolicies.descriptionPlaceholder')}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    rows="2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      ref={(el) => leaveTypeInputRefs.current.is_paid = el}
                      type="checkbox"
                      id="modal_is_paid_add"
                      defaultChecked={true}
                      className="mr-2"
                    />
                    <label htmlFor="modal_is_paid_add" className="text-sm">{t('settings.leavePolicies.isPaid')}</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      ref={(el) => leaveTypeInputRefs.current.requires_approval = el}
                      type="checkbox"
                      id="modal_requires_approval_add"
                      defaultChecked={true}
                      className="mr-2"
                    />
                    <label htmlFor="modal_requires_approval_add" className="text-sm">{t('settings.leavePolicies.requiresApproval')}</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('settings.leavePolicies.color')}</label>
                    <div className="flex gap-2">
                      <input
                        ref={(el) => leaveTypeInputRefs.current.color = el}
                        type="color"
                        defaultValue="#3B82F6"
                        className="h-10 w-20 rounded border"
                      />
                      <input
                        type="text"
                        defaultValue="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        placeholder="#3B82F6"
                        className="flex-1 px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addingLeaveType}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingLeaveType ? t('settings.leavePolicies.saving') : t('settings.leavePolicies.add')}
                  </button>
                </div>
              </>
            )}
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
              <div
                key={lt.id}
                className="flex items-center justify-between p-4 rounded-tahoe-input border"
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
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingLeaveTypeData({...lt});
                        setEditingLeaveType(lt.id);
                      }}
                      className="btn-primary"
                    >
                      {t('settings.leavePolicies.edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteLeaveType(lt.id)}
                      disabled={deletingLeaveType === lt.id}
                      className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingLeaveType === lt.id ? t('settings.leavePolicies.deleting') : t('settings.leavePolicies.delete')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Allocations Tab Component
function AllocationsTab({
  employees,
  leaveTypes,
  selectedEmployee,
  setSelectedEmployee,
  selectedYear,
  setSelectedYear,
  balances,
  editingBalances,
  handleBalanceChange,
  handleSaveBalances,
  handleInitializeBalances,
  savingBalances,
  loading,
  canManage,
  t
}) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h4 className="text-lg font-medium mb-4">Per-Employee Allocations</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Employee</label>
            <select
              value={selectedEmployee || ''}
              onChange={(e) => {
                const empId = e.target.value ? parseInt(e.target.value, 10) : null;
                setSelectedEmployee(empId);
                if (empId) {
                  // Load balances will be triggered by useEffect
                }
              }}
              className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => {
                const year = parseInt(e.target.value, 10);
                setSelectedYear(year);
              }}
              className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
              min="2020"
              max="2100"
            />
          </div>
        </div>
        
        {selectedEmployee && (
          <>
            <div className="flex gap-3 mb-4">
              {canManage && (
                <>
                  <button
                    onClick={handleSaveBalances}
                    disabled={savingBalances}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingBalances ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleInitializeBalances}
                    className="btn-secondary"
                  >
                    Initialize from Defaults
                  </button>
                </>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tahoe-accent mx-auto"></div>
                <p className="text-secondary mt-2">Loading balances...</p>
              </div>
            ) : balances.length === 0 ? (
              <p className="text-secondary">No balances found for this employee/year. Click "Initialize from Defaults" to create them.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Leave Type</th>
                      <th className="text-left py-2">Default</th>
                      <th className="text-left py-2">Entitled Days</th>
                      <th className="text-left py-2">Used Days</th>
                      <th className="text-left py-2">Available Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(balance => {
                      const leaveType = leaveTypes.find(lt => lt.id === balance.leave_type_id);
                      const entitledDays = editingBalances[balance.id] ?? parseFloat(balance.entitled_days);
                      const usedDays = parseFloat(balance.used_days);
                      const availableDays = entitledDays - usedDays + parseFloat(balance.carried_over_days || 0);
                      
                      return (
                        <tr key={balance.id} className="border-b">
                          <td className="py-2">{leaveType?.name || 'Unknown'}</td>
                          <td className="py-2">{leaveType?.default_annual_entitlement || 0}</td>
                          <td className="py-2">
                            {canManage ? (
                              <input
                                type="number"
                                min={usedDays}
                                value={entitledDays}
                                onChange={(e) => handleBalanceChange(balance.id, e.target.value)}
                                className="w-24 px-2 py-1 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                              />
                            ) : (
                              <span>{entitledDays}</span>
                            )}
                          </td>
                          <td className="py-2">{usedDays}</td>
                          <td className="py-2">{availableDays.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Bulk Operations Tab Component
function BulkOperationsTab({
  employees,
  leaveTypes,
  bulkSelectedEmployees,
  setBulkSelectedEmployees,
  bulkYear,
  setBulkYear,
  bulkLeaveType,
  setBulkLeaveType,
  bulkOperation,
  setBulkOperation,
  bulkValue,
  setBulkValue,
  bulkPreview,
  handleBulkPreview,
  handleExecuteBulk,
  executingBulk,
  canManage,
  t
}) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h4 className="text-lg font-medium mb-4">Bulk Operations</h4>
        
        {!canManage && (
          <p className="text-secondary mb-4">You don't have permission to perform bulk operations.</p>
        )}
        
        {canManage && (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Employees</label>
                <div className="max-h-48 overflow-y-auto border rounded p-2">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-tahoe-bg-hover rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkSelectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedEmployees([...bulkSelectedEmployees, emp.id]);
                          } else {
                            setBulkSelectedEmployees(bulkSelectedEmployees.filter(id => id !== emp.id));
                          }
                        }}
                      />
                      <span>{emp.first_name} {emp.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <input
                    type="number"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    min="2020"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Leave Type</label>
                  <select
                    value={bulkLeaveType}
                    onChange={(e) => setBulkLeaveType(e.target.value)}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  >
                    <option value="all">All Types</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Operation</label>
                  <select
                    value={bulkOperation}
                    onChange={(e) => setBulkOperation(e.target.value)}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  >
                    <option value="set">Set to value</option>
                    <option value="add">Add days</option>
                    <option value="subtract">Subtract days</option>
                    <option value="default">Apply default</option>
                  </select>
                </div>
              </div>
              
              {bulkOperation !== 'default' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Value</label>
                  <input
                    type="number"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                    placeholder="Enter number of days"
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleBulkPreview}
                  className="btn-secondary"
                >
                  Generate Preview
                </button>
              </div>
              
              {bulkPreview.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Preview ({bulkPreview.length} updates)</h5>
                  <div className="max-h-64 overflow-y-auto border rounded p-2">
                    {bulkPreview.map((p, idx) => (
                      <div key={idx} className="text-sm p-2 border-b">
                        {p.employee_name} - {p.leave_type_name}: {p.current_value} → {p.new_value}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleExecuteBulk}
                    disabled={executingBulk}
                    className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executingBulk ? 'Executing...' : 'Execute Bulk Update'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Policies Tab Component
function PoliciesTab({
  policies,
  leaveTypes,
  departments,
  jobTitles,
  employees,
  editingPolicy,
  editingPolicyData,
  setEditingPolicy,
  setEditingPolicyData,
  handleSavePolicy,
  savingPolicy,
  canManage,
  t
}) {
  const startEditing = (policy = null) => {
    if (policy) {
      setEditingPolicyData({...policy});
      setEditingPolicy(policy.id);
    } else {
      setEditingPolicyData({
        name: '',
        description: '',
        leave_type_id: null,
        accrual_rate: 0,
        accrual_frequency: 'monthly',
        carry_over_max_days: null,
        carry_over_expiry_months: null,
        minimum_notice_days: 0,
        max_consecutive_days: null,
        approval_workflow: 'manager',
        applies_to_type: 'All',
        applies_to_id: null
      });
      setEditingPolicy(null);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium">Leave Policies</h4>
        {canManage && (
          <button
            onClick={() => startEditing()}
            className="btn-primary"
          >
            Add Policy
          </button>
        )}
      </div>
      
      {editingPolicyData && (
        <div className="card p-6">
          <h5 className="font-medium mb-4">
            {editingPolicy ? 'Edit Policy' : 'New Policy'}
          </h5>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={editingPolicyData.name || ''}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Leave Type</label>
                <select
                  value={editingPolicyData.leave_type_id || ''}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, leave_type_id: e.target.value ? parseInt(e.target.value, 10) : null})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                >
                  <option value="">All Types</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editingPolicyData.description || ''}
                onChange={(e) => setEditingPolicyData({...editingPolicyData, description: e.target.value})}
                className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                rows="2"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Accrual Rate (days per period)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPolicyData.accrual_rate || 0}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, accrual_rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Accrual Frequency</label>
                <select
                  value={editingPolicyData.accrual_frequency || 'monthly'}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, accrual_frequency: e.target.value})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Carry Over Max Days (leave empty for unlimited)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPolicyData.carry_over_max_days || ''}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, carry_over_max_days: e.target.value ? parseFloat(e.target.value) : null})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Carry Over Expiry (months, leave empty for no expiry)</label>
                <input
                  type="number"
                  value={editingPolicyData.carry_over_expiry_months || ''}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, carry_over_expiry_months: e.target.value ? parseInt(e.target.value, 10) : null})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  placeholder="Never expires"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Notice (days)</label>
                <input
                  type="number"
                  value={editingPolicyData.minimum_notice_days || 0}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, minimum_notice_days: parseInt(e.target.value, 10) || 0})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Consecutive Days</label>
                <input
                  type="number"
                  value={editingPolicyData.max_consecutive_days || ''}
                  onChange={(e) => setEditingPolicyData({...editingPolicyData, max_consecutive_days: e.target.value ? parseInt(e.target.value, 10) : null})}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  placeholder="No limit"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Approval Workflow</label>
              <select
                value={editingPolicyData.approval_workflow || 'manager'}
                onChange={(e) => setEditingPolicyData({...editingPolicyData, approval_workflow: e.target.value})}
                className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
              >
                <option value="auto">Auto-approve</option>
                <option value="manager">Manager approval</option>
                <option value="hr">HR approval</option>
                <option value="custom">Custom workflow</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Applies To</label>
                <select
                  value={editingPolicyData.applies_to_type || 'All'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEditingPolicyData({
                      ...editingPolicyData,
                      applies_to_type: newType,
                      applies_to_id: newType === 'All' ? null : null
                    });
                  }}
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                >
                  <option value="All">All</option>
                  <option value="Department">Department</option>
                  <option value="JobTitle">Job Title</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
              {editingPolicyData.applies_to_type && editingPolicyData.applies_to_type !== 'All' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {editingPolicyData.applies_to_type === 'Department' ? 'Select Department' :
                     editingPolicyData.applies_to_type === 'JobTitle' ? 'Select Job Title' :
                     'Select Employee'}
                  </label>
                  <select
                    value={editingPolicyData.applies_to_id || ''}
                    onChange={(e) => setEditingPolicyData({...editingPolicyData, applies_to_id: e.target.value ? parseInt(e.target.value, 10) : null})}
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe text-white"
                  >
                    <option value="">Select...</option>
                    {editingPolicyData.applies_to_type === 'Department' && departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                    {editingPolicyData.applies_to_type === 'JobTitle' && jobTitles.map(jt => (
                      <option key={jt.id} value={jt.id}>{jt.name}</option>
                    ))}
                    {editingPolicyData.applies_to_type === 'Employee' && employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSavePolicy}
                disabled={savingPolicy || !editingPolicyData.name}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPolicy ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
              </button>
              <button
                onClick={() => {
                  setEditingPolicy(null);
                  setEditingPolicyData(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Policies List */}
      <div className="card p-6">
        <h4 className="text-lg font-medium mb-4">Policies</h4>
        {policies.length === 0 ? (
          <p className="text-secondary">No policies configured. Click "Add Policy" to create one.</p>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-4 rounded-tahoe-input border"
              >
                <div className="flex-1">
                  <div className="font-medium text-white">{policy.name}</div>
                  {policy.description && (
                    <div className="text-sm text-secondary mt-1">{policy.description}</div>
                  )}
                  <div className="text-xs text-secondary mt-1">
                    Leave Type: {policy.leave_type_name || 'All'} • 
                    Accrual: {policy.accrual_rate} days/{policy.accrual_frequency} • 
                    Applies to: {policy.applies_to_type}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(policy)}
                      className="btn-primary"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

