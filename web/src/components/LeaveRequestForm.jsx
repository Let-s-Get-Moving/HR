import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API } from '../config/api.js';

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

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (startDate > endDate) {
      setMessage({ type: 'error', text: 'End date cannot be before start date' });
      return;
    }

    if (startDate < new Date()) {
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
        setMessage({ type: 'error', text: response.message || 'Failed to submit leave request' });
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setMessage({ type: 'error', text: 'Failed to submit leave request. Please try again.' });
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
        <h2 className="text-2xl font-bold text-primary mb-6">{t('leave.submitLeaveRequest')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              name="leave_type"
              value={formData.leave_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-primary"
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
              <label className="block text-sm font-medium text-primary mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-primary"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Reason/Description
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              placeholder={t('leave.reasonPlaceholderForm')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-primary resize-none"
            />
          </div>

          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
