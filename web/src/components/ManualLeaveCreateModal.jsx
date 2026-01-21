import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal.tsx';
import Button from './Button.tsx';
import { API } from '../config/api.js';
import DateRangePicker from './DateRangePicker.jsx';

/**
 * Modal for manager/admin to manually create or edit a leave entry
 * Used when an employee cannot submit a request themselves, or to edit existing leaves
 */
export default function ManualLeaveCreateModal({
  isOpen,
  onClose,
  defaultDate,
  employees,
  leaveTypes,
  onCreated,
  editingLeave = null // Pass leave object to enable edit mode
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Determine if we're in edit mode
  const isEditMode = !!editingLeave;
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [requestMethod, setRequestMethod] = useState('Other');
  
  // Reset/populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      
      if (editingLeave) {
        // Edit mode - pre-fill with existing leave data
        setEmployeeId(editingLeave.employee_id?.toString() || '');
        setLeaveTypeId(editingLeave.leave_type_id?.toString() || '');
        setStartDate(formatDateToYYYYMMDD(editingLeave.start_date));
        setEndDate(formatDateToYYYYMMDD(editingLeave.end_date));
        setReason(editingLeave.reason || '');
        setNotes(editingLeave.notes?.replace(/\n?\[Created manually by manager\/admin\]/, '') || '');
        setRequestMethod(editingLeave.request_method || 'Other');
      } else if (defaultDate) {
        // Create mode - prefill date from clicked day
        const dateStr = formatDateToYYYYMMDD(defaultDate);
        setStartDate(dateStr);
        setEndDate(dateStr);
        setEmployeeId('');
        setLeaveTypeId('');
        setReason('');
        setNotes('');
        setRequestMethod('Other');
      }
    }
  }, [isOpen, defaultDate, editingLeave]);
  
  // Format Date to YYYY-MM-DD string
  function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    
    // If already a YYYY-MM-DD string, return as is (avoids timezone conversion)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.split('T')[0]; // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS"
    }
    
    // Otherwise convert Date object to YYYY-MM-DD using UTC to avoid timezone shifts
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Calculate total days between two dates (inclusive)
  function calculateTotalDays(start, end) {
    if (!start || !end) return 0;
    // Parse dates as YYYY-MM-DD without timezone conversion
    const [startYear, startMonth, startDay] = start.split('-').map(Number);
    const [endYear, endMonth, endDay] = end.split('-').map(Number);
    const startD = new Date(startYear, startMonth - 1, startDay);
    const endD = new Date(endYear, endMonth - 1, endDay);
    const diffTime = Math.abs(endD - startD);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  
  const totalDays = calculateTotalDays(startDate, endDate);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!employeeId) {
      setError(t('leave.employee') + ' is required');
      return;
    }
    if (!leaveTypeId) {
      setError(t('leave.leaveType') + ' is required');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before start date');
      return;
    }
    
    setSaving(true);
    
    try {
      if (isEditMode) {
        // Edit mode - use PUT
        const payload = {
          employee_id: parseInt(employeeId, 10),
          leave_type_id: parseInt(leaveTypeId, 10),
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          request_method: requestMethod,
          reason: reason || null,
          notes: notes || null
        };
        
        await API(`/api/leave/requests/${editingLeave.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        // Create mode - use POST with Approved status
        const payload = {
          employee_id: parseInt(employeeId, 10),
          leave_type_id: parseInt(leaveTypeId, 10),
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          status: 'Approved',
          request_method: requestMethod,
          reason: reason || null,
          notes: notes 
            ? `${notes}\n[Created manually by manager/admin]`
            : '[Created manually by manager/admin]'
        };
        
        await API('/api/leave/requests', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      
      // Success - close and trigger refresh
      onClose();
      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} leave:`, err);
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} leave entry`);
    } finally {
      setSaving(false);
    }
  };
  
  // Filter to active employees only
  const activeEmployees = (employees || []).filter(e => e.status === 'Active');
  
  const modalTitle = isEditMode 
    ? (t('leave.editLeaveEntry') || 'Edit Leave Entry')
    : t('leave.recordLeaveEntry');
  
  const modalDescription = isEditMode
    ? (t('leave.editLeaveDescription') || 'Update the leave entry details')
    : t('leave.hrRecordsDescription');
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Employee Selection */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.employee')} <span className="text-red-500">*</span>
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-tahoe-input transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.12)', 
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}
          >
            <option value="">{t('leave.typeToSearch')}</option>
            {activeEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} {emp.department ? `(${emp.department})` : ''}
              </option>
            ))}
          </select>
        </div>
        
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.leaveType')} <span className="text-red-500">*</span>
          </label>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-tahoe-input transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.12)', 
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}
          >
            <option value="">{t('leave.selectLeaveType')}</option>
            {(leaveTypes || []).map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.startDate')} / {t('leave.endDate')} <span className="text-red-500">*</span>
          </label>
          <DateRangePicker
            startYmd={startDate}
            endYmd={endDate}
            onApply={({ startYmd, endYmd }) => {
              setStartDate(startYmd);
              setEndDate(endYmd);
            }}
            onClear={() => {
              setStartDate('');
              setEndDate('');
            }}
            placeholder={t('leave.selectDateRange') || 'Select leave dates'}
            commitMode="instant"
          />
        </div>
        
        {/* Total Days Display */}
        {startDate && endDate && (
          <div 
            className="rounded-tahoe-input p-3 text-sm"
            style={{ 
              backgroundColor: 'rgba(10, 132, 255, 0.1)', 
              border: '1px solid rgba(10, 132, 255, 0.3)' 
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-tahoe-text-primary">{t('leave.totalDays')}</span>
              <span className="text-tahoe-accent font-semibold text-lg">
                {totalDays} {t('leave.days')}
              </span>
            </div>
          </div>
        )}
        
        {/* Request Method */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.requestMethod')} <span className="text-red-500">*</span>
          </label>
          <select
            value={requestMethod}
            onChange={(e) => setRequestMethod(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-tahoe-input transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.12)', 
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}
          >
            <option value="Email">{t('leave.email')}</option>
            <option value="Phone">{t('leave.phone')}</option>
            <option value="In-Person">{t('leave.inPerson')}</option>
            <option value="Slack">{t('leave.slack')}</option>
            <option value="Written">{t('leave.written')}</option>
            <option value="Other">{t('leave.other')}</option>
          </select>
        </div>
        
        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.reason')}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={t('leave.reasonPlaceholder')}
            className="w-full px-4 py-2.5 rounded-tahoe-input transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white resize-none"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.12)', 
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}
          />
        </div>
        
        {/* HR Notes */}
        <div>
          <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
            {t('leave.hrNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t('leave.hrNotesPlaceholder')}
            className="w-full px-4 py-2.5 rounded-tahoe-input transition-all duration-tahoe focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-white resize-none"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.12)', 
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}
          />
        </div>
        
        {/* Status indicator - only shown in create mode */}
        {!isEditMode && (
          <div 
            className="rounded-tahoe-input p-3 text-sm"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.3)' 
            }}
          >
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-green-400 font-medium">
                This leave will be created as Approved
              </span>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-sm p-3 rounded-tahoe-input bg-red-500/10 border border-red-500/30">
            {error}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
          >
            {isEditMode ? (t('common.save') || 'Save') : t('leave.saveAndApprove')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
