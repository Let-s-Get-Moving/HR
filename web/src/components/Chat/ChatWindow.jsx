import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../config/api.js';
import { useChatMessages, useWebSocket } from '../../hooks/useWebSocket.js';
import ChatMessage from './ChatMessage.jsx';

// Date separator component
function DateSeparator({ date }) {
  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    // If within the last week, show weekday
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    // Otherwise show full date
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div 
        className="px-3 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#98989a' }}
      >
        {formatDateLabel(date)}
      </div>
    </div>
  );
}

export default function ChatWindow({ thread, currentUserId, onBack, highlightMessageId, onClearHighlight, onThreadUpdate }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  
  // Inline rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  // Actions menu state
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef(null);
  
  // Edit message state
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  const messagesEndRef = useRef(null);
  const highlightMessageRef = useRef(null);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const { messages: realTimeMessages, setMessages: setRealTimeMessages } = useChatMessages(thread?.id);
  const { subscribe, connected } = useWebSocket();

  const loadMessages = async () => {
    if (!thread?.id) return;
    setLoading(true);
    try {
      const response = await API(`/api/chat/threads/${thread.id}/messages?limit=100`);
      const loadedMessages = response.messages || [];
      setMessages(loadedMessages);
      setRealTimeMessages(loadedMessages);
    } catch (error) {
      console.error('[ChatWindow] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!thread?.id) return;
    setLoadingMembers(true);
    try {
      const response = await API(`/api/chat/threads/${thread.id}/members`);
      setMembers(response.members || []);
    } catch (error) {
      console.error('[ChatWindow] Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await API('/api/chat/available-users');
      setAvailableUsers(response.users || []);
    } catch (error) {
      console.error('[ChatWindow] Error loading available users:', error);
    }
  };

  useEffect(() => {
    if (thread?.id) {
      loadMessages();
      if (thread.is_group) {
        loadMembers();
      }
    } else {
      setMessages([]);
      setRealTimeMessages([]);
      setMembers([]);
    }
    // Reset edit state when thread changes
    setIsEditingName(false);
    setShowActionsMenu(false);
  }, [thread?.id]);

  useEffect(() => {
    if (realTimeMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = realTimeMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMessages].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
      });
    }
  }, [realTimeMessages]);

  useEffect(() => {
    if (highlightMessageId && highlightMessageRef.current) {
      highlightMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (onClearHighlight) {
        setTimeout(() => onClearHighlight(), 3000);
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightMessageId, onClearHighlight]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setShowActionsMenu(false);
      }
    };
    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionsMenu]);

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Subscribe to delete-for-me events
  useEffect(() => {
    if (!connected) return;

    const unsubscribe = subscribe('chat:message:deleted_for_me', (data) => {
      if (data.thread_id === thread?.id && data.message_id) {
        setMessages(prev => prev.filter(m => m.id !== data.message_id));
      }
    });

    return () => unsubscribe();
  }, [subscribe, connected, thread?.id]);

  // Delete message for me
  const deleteMessageForMe = async (messageId) => {
    try {
      // Optimistic update
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      await API(`/api/chat/messages/${messageId}/delete-for-me`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      // Reload messages on error
      loadMessages();
    }
  };

  // Edit message
  const startEditMessage = (msg) => {
    setEditingMessage(msg);
    setEditText(msg.message);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const saveEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    
    setSavingEdit(true);
    try {
      const response = await API(`/api/chat/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editText.trim() })
      });
      
      // Update message in local state
      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, message: editText.trim(), is_edited: true }
          : m
      ));
      
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
      alert(error.message || 'Failed to edit message');
    } finally {
      setSavingEdit(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !thread?.id || sending) return;

    const messageText = message.trim();
    setSending(true);
    try {
      const response = await API(`/api/chat/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });

      if (response.message) {
        const sentMessage = {
          ...response.message,
          sender_id: currentUserId,
          sender_name: response.message.sender_name,
          sender_username: response.message.sender_username,
          attachments: response.message.attachments || []
        };
        
        setMessages(prev => {
          const exists = prev.some(m => m.id === sentMessage.id);
          if (exists) return prev;
          return [...prev, sentMessage].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
        });
      } else {
        setTimeout(() => loadMessages(), 500);
      }

      setMessage('');
    } catch (error) {
      console.error('[ChatWindow] Error sending message:', error);
      alert(`Failed to send message: ${error.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !thread?.id) return;

    setUploading(true);
    try {
      const messageResponse = await API(`/api/chat/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `[File] ${file.name}` })
      });

      const formData = new FormData();
      formData.append('file', file);

      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com'}/api/chat/messages/${messageResponse.message.id}/attachments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'x-session-id': sessionId || '' },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Upload failed');
      loadMessages();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addMember = async (userId) => {
    try {
      await API(`/api/chat/threads/${thread.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: [userId] })
      });
      loadMembers();
      setShowAddMembers(false);
      setAddMemberSearch('');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member from the group?')) return;
    try {
      await API(`/api/chat/threads/${thread.id}/members/${userId}`, {
        method: 'DELETE'
      });
      loadMembers();
      if (onThreadUpdate && thread) {
        onThreadUpdate({ ...thread, member_count: (thread.member_count || members.length) - 1 });
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert(error.message || 'Failed to remove member');
    }
  };

  const leaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await API(`/api/chat/threads/${thread.id}/members/${currentUserId}`, {
        method: 'DELETE'
      });
      onBack?.();
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  // Delete group = leave + hide (Telegram-style)
  const deleteGroup = async () => {
    if (!confirm('Delete this group? You will leave the group and it will be hidden from your chat list.')) return;
    try {
      // First leave the group
      await API(`/api/chat/threads/${thread.id}/members/${currentUserId}`, {
        method: 'DELETE'
      });
      // Then hide it (in case leave didn't fully remove membership)
      try {
        await API(`/api/chat/threads/${thread.id}/hide`, { method: 'POST' });
      } catch {
        // Ignore errors on hide - we already left
      }
      onBack?.();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  // Inline rename functions
  const startEditingName = () => {
    const currentName = thread.name || thread.group_name || '';
    setEditName(currentName);
    setIsEditingName(true);
    setShowActionsMenu(false);
  };

  const saveGroupName = async () => {
    if (!editName.trim()) {
      setIsEditingName(false);
      return;
    }
    
    setSavingName(true);
    try {
      const response = await API(`/api/chat/threads/${thread.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });
      
      // Update thread locally
      if (onThreadUpdate && response.thread) {
        onThreadUpdate({ ...thread, name: response.thread.name, group_name: response.thread.name });
      }
      setIsEditingName(false);
    } catch (error) {
      console.error('Error renaming group:', error);
      alert(error.message || 'Failed to rename group');
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveGroupName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const isGroupOwner = members.find(m => m.user_id === currentUserId)?.participant_role === 'owner';
  const canManage = isGroupOwner || members.find(m => m.user_id === currentUserId && ['admin', 'manager'].includes(m.user_role));

  const filteredAvailableUsers = availableUsers.filter(u => 
    u.id !== currentUserId &&
    !members.find(m => m.user_id === u.id) &&
    (u.employee_name?.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
     u.first_name?.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
     u.last_name?.toLowerCase().includes(addMemberSearch.toLowerCase()))
  );

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-tahoe-bg-primary">
        <div className="text-center">
          <svg className="w-16 h-16 text-tahoe-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-tahoe-text-muted">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  const threadName = thread.is_group 
    ? (thread.name || thread.group_name || 'Unnamed Group')
    : (thread.other_user_name || thread.other_username || 'Unknown User');

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="lg:hidden p-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-tahoe-text-secondary hover:text-tahoe-text-primary flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={thread.is_group 
              ? { background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }
              : { backgroundColor: '#0A84FF' }
            }
          >
            {thread.is_group ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              threadName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Inline editable name for groups */}
            {thread.is_group && isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleNameKeyPress}
                  onBlur={() => !savingName && setIsEditingName(false)}
                  disabled={savingName}
                  className="text-sm font-semibold text-tahoe-text-primary px-2 py-1 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                />
                <button
                  onClick={saveGroupName}
                  disabled={savingName}
                  className="p-1 rounded-tahoe-input hover:bg-tahoe-bg-hover text-tahoe-accent"
                >
                  {savingName ? (
                    <div className="w-4 h-4 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1 rounded-tahoe-input hover:bg-tahoe-bg-hover text-tahoe-text-muted"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <h3 
                  className={`text-sm font-semibold text-tahoe-text-primary truncate ${thread.is_group ? 'cursor-pointer hover:text-tahoe-accent transition-colors' : ''}`}
                  onClick={thread.is_group ? startEditingName : undefined}
                  title={thread.is_group ? 'Click to rename' : undefined}
                >
                  {threadName}
                  {thread.is_group && (
                    <svg className="w-3 h-3 inline-block ml-1 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </h3>
                {thread.is_group ? (
                  <p className="text-xs text-tahoe-text-muted">{thread.member_count || members.length} members</p>
                ) : thread.subject && (
                  <p className="text-xs text-tahoe-text-muted truncate">{thread.subject}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {thread.is_group && (
            <>
              {/* Group info button */}
              <button
                onClick={() => {
                  setShowMembersPanel(!showMembersPanel);
                  if (!showMembersPanel) loadMembers();
                }}
                className="p-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-tahoe-text-secondary hover:text-tahoe-text-primary"
                title="Group info"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Actions menu button */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-tahoe-text-secondary hover:text-tahoe-text-primary"
                  title="More options"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {/* Actions dropdown */}
                <AnimatePresence>
                  {showActionsMenu && (
                    <motion.div
                      ref={actionsMenuRef}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 z-50 min-w-[180px] rounded-tahoe overflow-hidden shadow-tahoe-lg"
                      style={{ 
                        backgroundColor: 'rgba(40, 40, 44, 0.95)', 
                        backdropFilter: 'blur(20px)', 
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                      }}
                    >
                      <button
                        onClick={startEditingName}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                        style={{ color: '#ffffff' }}
                      >
                        <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Rename Group
                      </button>
                      <button
                        onClick={() => {
                          setShowMembersPanel(true);
                          setShowActionsMenu(false);
                          loadMembers();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                        style={{ color: '#ffffff' }}
                      >
                        <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Manage Members
                      </button>
                      <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          leaveGroup();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                        style={{ color: '#FFA500' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave Group
                      </button>
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          deleteGroup();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                        style={{ color: '#FF453A' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Group
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="absolute top-[73px] bottom-[89px] left-0 right-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ right: showMembersPanel && thread.is_group ? '280px' : '0' }}>
        <div className="p-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-4 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-tahoe-text-muted">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              // Check if we need a date separator
              const currentDate = new Date(msg.created_at).toDateString();
              const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
              const showDateSeparator = index === 0 || currentDate !== prevDate;
              
              return (
                <div key={msg.id}>
                  {showDateSeparator && <DateSeparator date={msg.created_at} />}
                  <ChatMessage
                    message={msg}
                    isOwn={msg.sender_id === currentUserId}
                    senderName={msg.sender_name || msg.sender_username}
                    highlightMessageId={highlightMessageId}
                    messageRef={highlightMessageRef}
                    showSenderName={thread.is_group}
                    onDeleteForMe={deleteMessageForMe}
                    onEdit={startEditMessage}
                  />
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Members Panel (for groups) */}
      <AnimatePresence>
        {showMembersPanel && thread.is_group && (
          <motion.div
            initial={{ x: 280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 280, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[73px] bottom-[89px] right-0 w-[280px] border-l overflow-y-auto"
            style={{ borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(22, 22, 24, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-tahoe-text-primary">Members</h4>
                {canManage && (
                  <button
                    onClick={() => {
                      setShowAddMembers(!showAddMembers);
                      if (!showAddMembers) loadAvailableUsers();
                    }}
                    className="p-1.5 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                    style={{ color: '#0A84FF' }}
                    title="Add members"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Add members search */}
              {showAddMembers && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                    placeholder="Search to add..."
                    className="w-full px-3 py-2 rounded-tahoe-input text-sm focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe mb-2"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  {addMemberSearch && (
                    <div className="max-h-40 overflow-y-auto rounded-tahoe" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      {filteredAvailableUsers.slice(0, 5).map(user => (
                        <button
                          key={user.id}
                          onClick={() => addMember(user.id)}
                          className="w-full text-left px-3 py-2 hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                        >
                          <div className="text-sm text-tahoe-text-primary">
                            {user.employee_name || `${user.first_name} ${user.last_name}`}
                          </div>
                          {user.department && (
                            <div className="text-xs text-tahoe-text-muted">{user.department}</div>
                          )}
                        </button>
                      ))}
                      {filteredAvailableUsers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-tahoe-text-muted">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Members list */}
              {loadingMembers ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-2 rounded-tahoe hover:bg-tahoe-bg-hover transition-all duration-tahoe">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: '#0A84FF' }}>
                          {(member.display_name || member.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm text-tahoe-text-primary">
                            {member.display_name || member.username}
                            {member.user_id === currentUserId && <span className="text-tahoe-text-muted"> (you)</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {member.participant_role === 'owner' && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24' }}>
                                Owner
                              </span>
                            )}
                            {member.user_role && member.user_role !== 'user' && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#98989a' }}>
                                {member.user_role}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {canManage && member.user_id !== currentUserId && member.participant_role !== 'owner' && (
                        <button
                          onClick={() => removeMember(member.user_id)}
                          className="p-1 rounded hover:bg-red-500/20 text-tahoe-text-muted hover:text-red-400 transition-all duration-tahoe"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Leave group button */}
              {!isGroupOwner && (
                <button
                  onClick={leaveGroup}
                  className="w-full mt-4 px-4 py-2 rounded-tahoe-pill text-sm transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  Leave Group
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe disabled:opacity-50 text-tahoe-text-secondary hover:text-tahoe-text-primary"
            title="Attach file"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-tahoe-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-2 rounded-tahoe-input resize-none focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-sm transition-all duration-tahoe"
            style={{ minHeight: '44px', maxHeight: '120px', backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
          />

          <button
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            className="p-2 rounded-tahoe-input disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-tahoe"
            style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
            title="Send message"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Edit message modal */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={cancelEdit}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-tahoe overflow-hidden"
              style={{ 
                backgroundColor: 'rgba(28, 28, 30, 0.98)', 
                backdropFilter: 'blur(20px)', 
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <h3 className="text-lg font-semibold text-tahoe-text-primary">Edit Message</h3>
              </div>
              <div className="p-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-4 py-3 rounded-tahoe-input resize-none focus:outline-none focus:ring-2 focus:ring-tahoe-accent text-sm transition-all duration-tahoe"
                  style={{ 
                    minHeight: '100px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    color: '#ffffff' 
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded-tahoe-pill text-sm transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditMessage}
                  disabled={savingEdit || !editText.trim()}
                  className="px-4 py-2 rounded-tahoe-pill text-sm disabled:opacity-50 transition-all duration-tahoe"
                  style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
                >
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
