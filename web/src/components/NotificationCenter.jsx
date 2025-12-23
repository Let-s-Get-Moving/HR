import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../config/api.js';
import { useNotifications, useWebSocket } from '../hooks/useWebSocket.js';

const NOTIFICATION_TYPES = {
  leave_approval: { label: 'Leave Approval', color: 'bg-green-500' },
  leave_rejection: { label: 'Leave Rejection', color: 'bg-red-500' },
  payroll_processed: { label: 'Payroll', color: 'bg-blue-500' },
  chat_message: { label: 'Message', color: 'bg-purple-500' },
  system_alert: { label: 'System', color: 'bg-yellow-500' }
};

export default function NotificationCenter({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', or type
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount, connected } = useNotifications();
  const { subscribe } = useWebSocket();

  // Load notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'unread') {
          params.append('is_read', 'false');
        } else {
          params.append('type', filter);
        }
      }
      params.append('limit', '50');

      const response = await API(`/api/notifications?${params.toString()}`);
      const newNotifications = response.notifications || [];
      
      // Smart update: merge old and new notifications to prevent blinking
      // Only update if data actually changed (deep comparison)
      setNotifications(prev => {
        // Check if data actually changed
        const prevMap = new Map(prev.map(n => [n.id, n]));
        const hasChanged = newNotifications.some(newNotif => {
          const oldNotif = prevMap.get(newNotif.id);
          if (!oldNotif) return true; // New notification
          // Compare relevant fields
          return oldNotif.is_read !== newNotif.is_read ||
                 oldNotif.title !== newNotif.title ||
                 oldNotif.message !== newNotif.message ||
                 oldNotif.created_at !== newNotif.created_at;
        }) || prev.length !== newNotifications.length;
        
        // If nothing changed, return previous state to prevent re-render
        if (!hasChanged) {
          return prev;
        }
        
        // Create a map of existing notifications by ID
        const notificationMap = new Map(prev.map(n => [n.id, n]));
        
        // Update or add new notifications
        newNotifications.forEach(newNotif => {
          notificationMap.set(newNotif.id, newNotif);
        });
        
        // Only keep notifications that still exist (remove deleted ones)
        const existingIds = new Set(newNotifications.map(n => n.id));
        const updatedNotifications = Array.from(notificationMap.values())
          .filter(n => existingIds.has(n.id))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return updatedNotifications;
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications when dropdown opens or filter changes
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeNew = subscribe('notification:new', (data) => {
      setNotifications(prev => [data, ...prev]);
    });

    const unsubscribeRead = subscribe('notification:read', (data) => {
      setNotifications(prev => 
        prev.map(n => n.id === data.id ? { ...n, is_read: data.is_read } : n)
      );
    });

    const unsubscribeDeleted = subscribe('notification:deleted', (data) => {
      setNotifications(prev => prev.filter(n => n.id !== data.id));
    });

    const unsubscribeAllRead = subscribe('notifications:all-read', () => {
      loadNotifications();
    });

    // No periodic polling - rely on WebSocket for real-time updates

    return () => {
      unsubscribeNew();
      unsubscribeRead();
      unsubscribeDeleted();
      unsubscribeAllRead();
    };
  }, [isOpen, subscribe]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const markAsRead = async (id) => {
    try {
      await API(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (id) => {
    try {
      await API(`/api/notifications/${id}/unread`, { method: 'PUT' });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: false, read_at: null } : n)
      );
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API('/api/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await API(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Memoize filtered notifications to prevent unnecessary re-renders
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.is_read);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);
  
  const unreadInFilter = useMemo(() => 
    filteredNotifications.filter(n => !n.is_read).length,
    [filteredNotifications]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-tahoe-input text-tahoe-text-secondary hover:text-tahoe-text-primary hover:bg-tahoe-bg-hover transition-all duration-tahoe"
        aria-label="Notifications"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}

        {/* Connection Status Indicator */}
        {!connected && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full border-2" style={{ borderColor: '#0B0B0C' }} />
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile: Full-screen overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-[90vw] sm:w-96 lg:w-[400px] max-h-[600px] rounded-tahoe shadow-tahoe-lg z-50 flex flex-col"
              style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <h3 className="text-lg font-semibold text-tahoe-text-primary">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadInFilter > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-tahoe-accent hover:underline transition-all duration-tahoe"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-tahoe-text-secondary hover:text-tahoe-text-primary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="p-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <div className="flex space-x-2 overflow-x-auto">
                  {['all', 'unread', ...Object.keys(NOTIFICATION_TYPES)].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={`px-3 py-1.5 rounded-tahoe-pill text-sm font-medium whitespace-nowrap transition-all duration-tahoe ${
                        filter === type
                          ? 'text-white'
                          : 'text-tahoe-text-secondary hover:text-tahoe-text-primary hover:bg-tahoe-bg-hover'
                      }`}
                      style={filter === type ? { backgroundColor: '#0A84FF' } : { backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                    >
                      {type === 'all' ? 'All' : type === 'unread' ? 'Unread' : NOTIFICATION_TYPES[type]?.label || type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="w-8 h-8 border-4 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <svg className="w-12 h-12 text-tahoe-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-tahoe-text-muted">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                    {filteredNotifications.map((notification) => {
                      const typeInfo = NOTIFICATION_TYPES[notification.type] || { label: notification.type, color: 'bg-gray-500' };
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 hover:bg-tahoe-bg-hover transition-all duration-tahoe cursor-pointer"
                          style={!notification.is_read ? { backgroundColor: 'rgba(10, 132, 255, 0.1)' } : {}}
                          onClick={() => {
                            // Mark as read
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                            
                            // Navigate if it's a chat notification
                            if (notification.type === 'chat_message' && notification.related_type === 'chat_thread' && notification.related_id) {
                              setIsOpen(false);
                              if (onNavigate) {
                                onNavigate('messages', { 
                                  threadId: notification.related_id,
                                  messageId: notification.related_id // Will use thread's last message or find by timestamp
                                });
                              }
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Type Indicator */}
                            <div className={`w-2 h-2 rounded-full mt-2 ${typeInfo.color} ${notification.is_read ? 'opacity-50' : ''}`} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <h4 className={`text-sm font-medium ${notification.is_read ? 'text-tahoe-text-secondary' : 'text-tahoe-text-primary font-semibold'}`}>
                                  {notification.title}
                                </h4>
                                <div className="flex items-center space-x-1 ml-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      notification.is_read ? markAsUnread(notification.id) : markAsRead(notification.id);
                                    }}
                                    className="p-1 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                                    title={notification.is_read ? 'Mark as unread' : 'Mark as read'}
                                  >
                                    {notification.is_read ? (
                                      <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4 text-tahoe-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="p-1 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                                    title="Delete"
                                  >
                                    <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-tahoe-text-secondary mt-1 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-tahoe-text-muted mt-2">{formatTime(notification.created_at)}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

