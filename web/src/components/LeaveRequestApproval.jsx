import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';
import ManualLeaveCreateModal from './ManualLeaveCreateModal.jsx';

const STATUS_COLORS = {
  'Pending': 'bg-tahoe-warning-bg text-tahoe-warning-text border-tahoe-warning-border',
  'Approved': 'bg-tahoe-success-bg text-black border-black',
  'Rejected': 'bg-tahoe-error-bg text-tahoe-error-text border-tahoe-error-border'
};

const STATUS_ICONS = {
  'Pending': '⏳',
  'Approved': '✅',
  'Rejected': '❌'
};

export default function LeaveRequestApproval({ onApprovalChange, refreshTrigger }) {
  const { t } = useTranslation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState(null);
  const [editingLeave, setEditingLeave] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editingLeave, setEditingLeave] = useState(null);
  const [deletingLeaveId, setDeletingLeaveId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  // Reload requests when refreshTrigger changes (from parent)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadRequests();
    }
  }, [refreshTrigger]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [pendingResponse, allResponse, employeesData, leaveTypesData] = await Promise.all([
        API('/api/leave-requests/pending'),
        API('/api/leave-requests'),
        API('/api/employees'),
        API('/api/leave/types')
      ]);
      
      if (pendingResponse.success) {
        setPendingRequests(pendingResponse.data);
      }
      
      if (allResponse.success) {
        setAllRequests(allResponse.data);
      }
      
      setEmployees(employeesData || []);
      setLeaveTypes(leaveTypesData || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId, status) => {
    try {
      setProcessing(true);
      
      const response = await API(`/api/leave-requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          review_notes: reviewNotes
        })
      });

      if (response.success) {
        setReviewNotes('');
        setSelectedRequest(null);
        await loadRequests(); // Refresh the list
        
        // Notify parent component to refresh calendar, analytics, and all data
        if (onApprovalChange) {
          onApprovalChange();
        }
      } else {
        alert(response.message || t('leave.failedToUpdateStatus'));
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      alert(t('leave.failedToUpdateStatusRetry'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm(t('leave.confirmDelete') || 'Are you sure you want to delete this leave entry? This action cannot be undone.')) {
      return;
    }
    
    setDeletingLeaveId(leaveId);
    try {
      await API(`/api/leave/requests/${leaveId}`, {
        method: "DELETE"
      });
      
      await loadRequests();
      if (onApprovalChange) {
        onApprovalChange();
      }
    } catch (error) {
      console.error("Error deleting leave:", error);
      alert(t('leave.errorDeleting') || 'Failed to delete leave request');
    } finally {
      setDeletingLeaveId(null);
    }
  };

  const handleEditLeave = (request) => {
    setEditingLeave(request);
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    return formatShortDate(dateString);
  };

  const getDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getLeaveBalance = (request, leaveType) => {
    switch (leaveType) {
      case 'Vacation':
        return request.leave_balance_vacation || 0;
      case 'Sick Leave':
        return request.leave_balance_sick || 0;
      case 'Personal Leave':
        return request.leave_balance_personal || 0;
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tahoe-accent mx-auto"></div>
          <p className="text-tahoe-text-secondary mt-2">{t('leave.loadingRequests')}</p>
        </div>
      </div>
    );
  }

  const currentRequests = activeTab === 'pending' ? pendingRequests : allRequests;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-tahoe-text-primary">{t('leave.leaveRequestManagement')}</h2>
          <button
            onClick={loadRequests}
            className="px-4 py-2 text-sm rounded-tahoe-pill transition-all duration-tahoe"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
          >
            {t('common.refresh')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 rounded-tahoe p-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-4 rounded-tahoe-input text-sm font-medium transition-all duration-tahoe ${
              activeTab === 'pending'
                ? 'text-tahoe-text-primary shadow-sm'
                : 'text-tahoe-text-secondary hover:text-tahoe-text-primary'
            }`}
            style={activeTab === 'pending' ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
          >
            {t('leave.pending')} ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-4 rounded-tahoe-input text-sm font-medium transition-all duration-tahoe ${
              activeTab === 'all'
                ? 'text-tahoe-text-primary shadow-sm'
                : 'text-tahoe-text-secondary hover:text-tahoe-text-primary'
            }`}
            style={activeTab === 'all' ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : {}}
          >
            {t('leave.allRequests')} ({allRequests.length})
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {currentRequests.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-tahoe-text-primary mb-2">{t('leave.noLeaveRequests')}</h3>
            <p className="text-tahoe-text-secondary">
              {activeTab === 'pending' 
                ? t('leave.noPendingRequestsToReview')
                : t('leave.noLeaveRequestsSubmitted')
              }
            </p>
          </div>
        ) : (
          currentRequests.map((request) => (
            <div
              key={request.id}
              className="card p-6 hover:bg-tahoe-bg-hover transition-all duration-tahoe"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-medium text-tahoe-text-primary">{request.leave_type}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[request.status]}`}>
                      {STATUS_ICONS[request.status]} {request.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-tahoe-text-secondary mb-3">
                    <div>
                      <span className="font-medium">{t('leave.employee')}:</span> {request.first_name} {request.last_name}
                    </div>
                    <div>
                      <span className="font-medium">{t('leave.startDate')}:</span> {formatDate(request.start_date)}
                    </div>
                    <div>
                      <span className="font-medium">{t('leave.endDate')}:</span> {formatDate(request.end_date)}
                    </div>
                    <div>
                      <span className="font-medium">{t('leave.duration')}:</span> {getDuration(request.start_date, request.end_date)} {getDuration(request.start_date, request.end_date) !== 1 ? t('leave.days') : t('leave.day')}
                    </div>
                  </div>

                  {/* Leave Balance for Pending Requests */}
                  {request.status === 'Pending' && (
                    <div className="mb-3 p-3 rounded-tahoe-input" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}>
                      <h4 className="font-medium text-tahoe-text-primary text-sm mb-2">{t('leave.employeeLeaveBalance')}:</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm text-tahoe-text-secondary">
                        <div>{t('leave.vacation')}: {getLeaveBalance(request, 'Vacation')} {t('leave.days')}</div>
                        <div>{t('leave.sickLeave')}: {getLeaveBalance(request, 'Sick Leave')} {t('leave.days')}</div>
                        <div>{t('leave.personal')}: {getLeaveBalance(request, 'Personal Leave')} {t('leave.days')}</div>
                      </div>
                    </div>
                  )}

                  {request.reason && (
                    <div className="mb-3">
                      <span className="font-medium text-tahoe-text-primary text-sm">{t('leave.reason')}:</span>
                      <p className="text-tahoe-text-secondary text-sm mt-1">{request.reason}</p>
                    </div>
                  )}

                  {request.review_notes && (
                    <div className="mb-3">
                      <span className="font-medium text-tahoe-text-primary text-sm">{t('leave.hrNotes')}:</span>
                      <p className="text-tahoe-text-secondary text-sm mt-1">{request.review_notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-tahoe-text-muted">
                    {t('leave.submitted')}: {formatDate(request.requested_at)}
                    {request.reviewed_at && (
                      <span> • {t('leave.reviewed')}: {formatDate(request.reviewed_at)} {t('leave.by')} {request.reviewed_by_name}</span>
                    )}
                  </div>
                  
                  {/* Edit/Delete buttons */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-tahoe-border-primary">
                    <button
                      onClick={() => handleEditLeave(request)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-tahoe-bg-secondary hover:bg-tahoe-accent/20 text-tahoe-text-secondary hover:text-tahoe-accent transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLeave(request.id)}
                      disabled={deletingLeaveId === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-tahoe-bg-secondary hover:bg-red-500/20 text-tahoe-text-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {deletingLeaveId === request.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                      Delete
                    </button>
                  </div>
                </div>

                {/* Action Buttons for Pending Requests */}
                {request.status === 'Pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-3 py-1 text-sm rounded-tahoe-pill transition-all duration-tahoe"
                      style={{ backgroundColor: 'rgba(10, 132, 255, 0.2)', color: '#0A84FF', border: '1px solid rgba(10, 132, 255, 0.3)' }}
                    >
                      {t('leave.review')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-tahoe p-6 w-full max-w-md mx-4 shadow-tahoe-lg" style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <h3 className="text-lg font-semibold text-tahoe-text-primary mb-4">
              {t('leave.reviewLeaveRequest')}
            </h3>
            
            <div className="space-y-4">
              <div className="text-tahoe-text-secondary">
                <span className="font-medium text-tahoe-text-primary">{t('leave.employee')}:</span> {selectedRequest.first_name} {selectedRequest.last_name}
              </div>
              <div className="text-tahoe-text-secondary">
                <span className="font-medium text-tahoe-text-primary">{t('leave.leaveType')}:</span> {selectedRequest.leave_type}
              </div>
              <div className="text-tahoe-text-secondary">
                <span className="font-medium text-tahoe-text-primary">{t('leave.dates')}:</span> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
              </div>
              <div className="text-tahoe-text-secondary">
                <span className="font-medium text-tahoe-text-primary">{t('leave.duration')}:</span> {getDuration(selectedRequest.start_date, selectedRequest.end_date)} {t('leave.days')}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder={t('leave.addNotesAboutDecision')}
                  className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent resize-none transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-sm rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                disabled={processing}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'Rejected')}
                className="px-4 py-2 text-sm rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 69, 58, 0.2)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.3)' }}
                disabled={processing}
              >
                {processing ? t('common.processing') : t('leave.reject')}
              </button>
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'Approved')}
                className="px-4 py-2 text-sm rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(48, 209, 88, 0.2)', color: '#30d158', border: '1px solid rgba(48, 209, 88, 0.3)' }}
                disabled={processing}
              >
                {processing ? t('common.processing') : t('leave.approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Modal */}
      {showEditModal && (
        <ManualLeaveCreateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingLeave(null);
          }}
          defaultDate={null}
          employees={employees}
          leaveTypes={leaveTypes}
          editingLeave={editingLeave}
          onCreated={async () => {
            await loadRequests();
            if (onApprovalChange) {
              onApprovalChange();
            }
          }}
        />
      )}
    </motion.div>
  );
}
