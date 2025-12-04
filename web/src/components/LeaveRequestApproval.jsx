import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  'Approved': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  'Rejected': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-secondary mt-2">{t('leave.loadingRequests')}</p>
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
          <h2 className="text-2xl font-bold text-primary">{t('leave.leaveRequestManagement')}</h2>
          <button
            onClick={loadRequests}
            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-primary rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            {t('common.refresh')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {t('leave.pending')} ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
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
            <h3 className="text-lg font-medium text-primary mb-2">{t('leave.noLeaveRequests')}</h3>
            <p className="text-secondary">
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
              className="card p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-medium text-primary">{request.leave_type}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                      {STATUS_ICONS[request.status]} {request.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-secondary mb-3">
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
                    <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <h4 className="font-medium text-primary text-sm mb-2">{t('leave.employeeLeaveBalance')}:</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>{t('leave.vacation')}: {getLeaveBalance(request, 'Vacation')} {t('leave.days')}</div>
                        <div>{t('leave.sickLeave')}: {getLeaveBalance(request, 'Sick Leave')} {t('leave.days')}</div>
                        <div>{t('leave.personal')}: {getLeaveBalance(request, 'Personal Leave')} {t('leave.days')}</div>
                      </div>
                    </div>
                  )}

                  {request.reason && (
                    <div className="mb-3">
                      <span className="font-medium text-primary text-sm">{t('leave.reason')}:</span>
                      <p className="text-secondary text-sm mt-1">{request.reason}</p>
                    </div>
                  )}

                  {request.review_notes && (
                    <div className="mb-3">
                      <span className="font-medium text-primary text-sm">{t('leave.hrNotes')}:</span>
                      <p className="text-secondary text-sm mt-1">{request.review_notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-tertiary">
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
                      className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-primary mb-4">
              {t('leave.reviewLeaveRequest')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="font-medium">{t('leave.employee')}:</span> {selectedRequest.first_name} {selectedRequest.last_name}
              </div>
              <div>
                <span className="font-medium">{t('leave.leaveType')}:</span> {selectedRequest.leave_type}
              </div>
              <div>
                <span className="font-medium">{t('leave.dates')}:</span> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
              </div>
              <div>
                <span className="font-medium">{t('leave.duration')}:</span> {getDuration(selectedRequest.start_date, selectedRequest.end_date)} {t('leave.days')}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder={t('leave.addNotesAboutDecision')}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-primary resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewNotes('');
                }}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-primary rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                disabled={processing}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'Rejected')}
                className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                disabled={processing}
              >
                {processing ? t('common.processing') : t('leave.reject')}
              </button>
              <button
                onClick={() => handleApproveReject(selectedRequest.id, 'Approved')}
                className="px-4 py-2 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
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
