import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

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
      const [pendingResponse, allResponse] = await Promise.all([
        API('/api/leave-requests/pending'),
        API('/api/leave-requests')
      ]);
      
      if (pendingResponse.success) {
        setPendingRequests(pendingResponse.data);
      }
      
      if (allResponse.success) {
        setAllRequests(allResponse.data);
      }
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
    </motion.div>
  );
}
