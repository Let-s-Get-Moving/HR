import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';
import { parseLocalDate } from '../utils/timezone.js';

const LEAVE_TYPES = [
  'Vacation',
  'Sick Leave', 
  'Personal Leave',
  'Bereavement',
  'Parental Leave',
  'Jury Duty',
  'Military Leave'
];

export default function LeaveRequestForm({ onRequestSubmitted }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.leave_type || !formData.start_date || !formData.end_date) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const startDate = parseLocalDate(formData.start_date);
    const endDate = parseLocalDate(formData.end_date);
    
    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Invalid date format' });
      return;
    }
    
    if (startDate > endDate) {
      setMessage({ type: 'error', text: 'End date cannot be before start date' });
      return;
    }

    // Compare with today's date (local, midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      setMessage({ type: 'error', text: 'Cannot request leave for past dates' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const response = await API('/api/leave-requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: 'Leave request submitted successfully! HR will review your request.' 
        });
        
        // Reset form
        setFormData({
          leave_type: '',
          start_date: '',
          end_date: '',
          reason: ''
        });

        // Notify parent component
        if (onRequestSubmitted) {
          onRequestSubmitted();
        }
      } else {
        // Parse error details for clearer messages
        let errorMessage = response.message || 'Failed to submit leave request';
        if (response.details && Array.isArray(response.details)) {
          const fieldErrors = response.details.map(d => d.message || `${d.field}: ${d.message || 'Invalid value'}`).join('; ');
          errorMessage = fieldErrors || errorMessage;
        }
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      
      // Try to parse error response for better messages
      let errorMessage = 'Failed to submit leave request. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details && Array.isArray(error.details)) {
        const fieldErrors = error.details.map(d => d.message || `${d.field}: ${d.message || 'Invalid value'}`).join('; ');
        errorMessage = fieldErrors || errorMessage;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-tahoe-text-primary mb-6">{t('leave.submitLeaveRequest')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
              required
            >
              <option value="">{t('leave.selectLeaveType')}</option>
              {LEAVE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
              Reason/Description
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              placeholder={t('leave.reasonPlaceholderForm')}
              className="w-full px-3 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent resize-none transition-all duration-tahoe"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
            />
          </div>

          {/* Message */}
          {message.text && (
            <div 
              className={`p-4 rounded-tahoe-input border ${
                message.type === 'success' 
                  ? 'bg-tahoe-success-bg text-tahoe-success-text border-black' 
                  : 'bg-tahoe-bg-secondary text-tahoe-text-primary border-tahoe-border'
              }`}
              style={message.type === 'success' ? { color: 'rgba(0, 0, 0, 1)' } : undefined}
            >
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-tahoe-pill focus:outline-none focus:ring-2 focus:ring-tahoe-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-tahoe"
              style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
