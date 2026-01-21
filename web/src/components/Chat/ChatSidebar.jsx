import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../config/api.js';
import { useWebSocket } from '../../hooks/useWebSocket.js';

export default function ChatSidebar({ selectedThreadId, onSelectThread, onNewThread, newlyCreatedThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { subscribe, connected } = useWebSocket();

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API('/api/chat/threads');
      const newThreads = response.threads || [];
      
      setThreads(prev => {
        const prevMap = new Map(prev.map(t => [t.id, t]));
        const hasChanged = newThreads.some(newThread => {
          const oldThread = prevMap.get(newThread.id);
          if (!oldThread) return true;
          return oldThread.last_message_at !== newThread.last_message_at ||
                 oldThread.subject !== newThread.subject ||
                 oldThread.name !== newThread.name ||
                 oldThread.group_name !== newThread.group_name ||
                 oldThread.member_count !== newThread.member_count ||
                 oldThread.other_user_name !== newThread.other_user_name;
        }) || prev.length !== newThreads.length;
        
        if (!hasChanged) {
          return prev;
        }
        
        return newThreads.sort((a, b) => 
          new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        );
      });
    } catch (error) {
      console.error('[ChatSidebar] Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Handle newly created thread from parent
  useEffect(() => {
    if (newlyCreatedThread) {
      setThreads(prev => {
        // Check if thread already exists
        if (prev.some(t => t.id === newlyCreatedThread.id)) {
          return prev;
        }
        // Add to top of list
        const updated = [newlyCreatedThread, ...prev];
        return updated.sort((a, b) => 
          new Date(b.last_message_at || b.created_at || 0) - new Date(a.last_message_at || a.created_at || 0)
        );
      });
    }
  }, [newlyCreatedThread]);

  // Subscribe to thread updates via WebSocket
  useEffect(() => {
    if (!connected) return;

    const unsubscribeThreadUpdate = subscribe('chat:thread:update', (data) => {
      if (data.thread_id) {
        setThreads(prev => {
          const updated = prev.map(t => {
            if (t.id === data.thread_id) {
              return {
                ...t,
                last_message_at: data.last_message_at || t.last_message_at,
                name: data.name !== undefined ? data.name : t.name,
                group_name: data.name !== undefined ? data.name : t.group_name,
                member_count: data.member_count !== undefined ? data.member_count : t.member_count
              };
            }
            return t;
          });
          
          // Re-sort by last_message_at
          return updated.sort((a, b) => 
            new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
          );
        });

        // If thread was removed (you_were_removed), remove from list
        if (data.action === 'you_were_removed') {
          setThreads(prev => prev.filter(t => t.id !== data.thread_id));
        }
      }
    });

    // Also subscribe to new messages to update thread order
    const unsubscribeMessage = subscribe('chat:message', (data) => {
      if (data.thread_id) {
        setThreads(prev => {
          const updated = prev.map(t => {
            if (t.id === data.thread_id) {
              return { ...t, last_message_at: new Date().toISOString() };
            }
            return t;
          });
          return updated.sort((a, b) => 
            new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
          );
        });
      }
    });

    return () => {
      unsubscribeThreadUpdate();
      unsubscribeMessage();
    };
  }, [subscribe, connected]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter(thread => {
      if (thread.is_group) {
        return (thread.name || thread.group_name || '').toLowerCase().includes(query) ||
               thread.subject?.toLowerCase().includes(query);
      }
      return thread.subject?.toLowerCase().includes(query) ||
             thread.other_user_name?.toLowerCase().includes(query) ||
             thread.other_username?.toLowerCase().includes(query);
    });
  }, [threads, searchQuery]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getThreadDisplayName = (thread) => {
    if (thread.is_group) {
      return thread.name || thread.group_name || 'Unnamed Group';
    }
    return thread.other_user_name || thread.other_username || 'Unknown User';
  };

  const getThreadAvatar = (thread) => {
    const name = getThreadDisplayName(thread);
    return name.charAt(0).toUpperCase();
  };

  const getAvatarStyle = (thread) => {
    if (thread.is_group) {
      // Purple gradient for groups
      return { background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' };
    }
    // Blue for DMs
    return { backgroundColor: '#0A84FF' };
  };

  return (
    <div className="flex flex-col h-full border-r" style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-tahoe-text-primary">Messages</h2>
          <button
            onClick={onNewThread}
            className="p-2 rounded-tahoe-input transition-all duration-tahoe"
            style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
            title="New conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-tahoe-input text-sm focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-tahoe-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && threads.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <svg className="w-12 h-12 text-tahoe-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-tahoe-text-muted">
              {searchQuery ? 'No conversations match your search' : 'No conversations'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewThread}
                className="mt-4 px-4 py-2 rounded-tahoe-pill transition-all duration-tahoe text-sm"
                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
            {filteredThreads.map((thread) => (
              <motion.button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className="w-full text-left p-4 hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                style={selectedThreadId === thread.id ? { backgroundColor: 'rgba(10, 132, 255, 0.1)' } : {}}
                whileHover={{ x: 2 }}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={getAvatarStyle(thread)}
                  >
                    {thread.is_group ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    ) : (
                      getThreadAvatar(thread)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-tahoe-text-primary truncate">
                        {getThreadDisplayName(thread)}
                      </h3>
                      <span className="text-xs text-tahoe-text-muted flex-shrink-0 ml-2">
                        {formatTime(thread.last_message_at)}
                      </span>
                    </div>
                    
                    {/* Subject or member count */}
                    <div className="flex items-center gap-2">
                      {thread.subject && (
                        <p className="text-xs text-tahoe-text-muted truncate">
                          {thread.subject}
                        </p>
                      )}
                    </div>

                    {/* Role badge (for DMs) or member count (for groups) */}
                    <div className="flex items-center gap-2 mt-1">
                      {thread.is_group ? (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA' }}>
                          {thread.member_count || 0} members
                        </span>
                      ) : thread.other_user_role && thread.other_user_role !== 'user' && (
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#98989a' }}>
                          {thread.other_user_role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
