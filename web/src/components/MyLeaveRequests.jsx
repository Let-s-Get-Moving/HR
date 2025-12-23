import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API } from '../config/api.js';
import { formatShortDate } from '../utils/timezone.js';

const STATUS_COLORS = {
  'Pending': 'bg-tahoe-warning-bg text-tahoe-warning-text border-tahoe-warning-border',
  'Approved': 'bg-tahoe-success-bg text-black border-tahoe-success-border',
  'Rejected': 'bg-tahoe-error-bg text-tahoe-error-text border-tahoe-error-border'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tahoe-accent mx-auto"></div>
          <p className="text-tahoe-text-secondary mt-2">Loading your leave requests...</p>
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
          <h2 className="text-2xl font-bold text-tahoe-text-primary">My Leave Requests</h2>
          <button
            onClick={loadRequests}
            className="px-4 py-2 text-sm rounded-tahoe-pill transition-all duration-tahoe"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
          >
            Refresh
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-tahoe-text-primary mb-2">No leave requests yet</h3>
            <p className="text-tahoe-text-secondary">Submit your first leave request using the form above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-tahoe p-4 hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-tahoe-text-primary">{request.leave_type}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[request.status]}`}>
                        {STATUS_ICONS[request.status]} {request.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-tahoe-text-secondary">
                      <div>
                        <span className="font-medium text-tahoe-text-primary">Start Date:</span> {formatDate(request.start_date)}
                      </div>
                      <div>
                        <span className="font-medium text-tahoe-text-primary">End Date:</span> {formatDate(request.end_date)}
                      </div>
                      <div>
                        <span className="font-medium text-tahoe-text-primary">Duration:</span> {getDuration(request.start_date, request.end_date)} day{getDuration(request.start_date, request.end_date) !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-2">
                        <span className="font-medium text-tahoe-text-primary text-sm">Reason:</span>
                        <p className="text-tahoe-text-secondary text-sm mt-1">{request.reason}</p>
                      </div>
                    )}

                    {request.review_notes && (
                      <div className="mt-2">
                        <span className="font-medium text-tahoe-text-primary text-sm">HR Notes:</span>
                        <p className="text-tahoe-text-secondary text-sm mt-1">{request.review_notes}</p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-tahoe-text-muted">
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
