import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function MyLeaveRequests({ refreshTrigger }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [refreshTrigger]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await API('/api/leave-requests');
      
      if (response.success) {
        setRequests(response.data);
      } else {
        console.error('Failed to load leave requests:', response.message);
      }
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-secondary mt-2">Loading your leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">My Leave Requests</h2>
          <button
            onClick={loadRequests}
            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-primary rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-primary mb-2">No leave requests yet</h3>
            <p className="text-secondary">Submit your first leave request using the form above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-primary">{request.leave_type}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                        {STATUS_ICONS[request.status]} {request.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-secondary">
                      <div>
                        <span className="font-medium">Start Date:</span> {formatDate(request.start_date)}
                      </div>
                      <div>
                        <span className="font-medium">End Date:</span> {formatDate(request.end_date)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {getDuration(request.start_date, request.end_date)} day{getDuration(request.start_date, request.end_date) !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-2">
                        <span className="font-medium text-primary text-sm">Reason:</span>
                        <p className="text-secondary text-sm mt-1">{request.reason}</p>
                      </div>
                    )}

                    {request.review_notes && (
                      <div className="mt-2">
                        <span className="font-medium text-primary text-sm">HR Notes:</span>
                        <p className="text-secondary text-sm mt-1">{request.review_notes}</p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-tertiary">
                      Submitted: {formatDate(request.requested_at)}
                      {request.reviewed_at && (
                        <span> • Reviewed: {formatDate(request.reviewed_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
