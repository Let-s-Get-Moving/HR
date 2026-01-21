import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API } from '../config/api.js';
import { sessionManager } from '../utils/sessionManager.js';
import ChatSidebar from '../components/Chat/ChatSidebar.jsx';
import ChatWindow from '../components/Chat/ChatWindow.jsx';

export default function Messages({ pageParams = {} }) {
  const [selectedThread, setSelectedThread] = useState(null);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [creatingThread, setCreatingThread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSidebar, setShowSidebar] = useState(true);
  const [threads, setThreads] = useState([]);

  // New thread modal state
  const [threadMode, setThreadMode] = useState('direct'); // 'direct' | 'group'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1);
  
  // DM state
  const [newThreadParticipant, setNewThreadParticipant] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');
  
  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    const user = sessionManager.getUser();
    if (user?.id) {
      setCurrentUserId(user.id);
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const response = await API('/api/chat/available-users');
      setAvailableUsers(response.users || []);
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const resetModalState = () => {
    setThreadMode('direct');
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedUserIndex(-1);
    setNewThreadParticipant('');
    setNewThreadSubject('');
    setGroupName('');
    setSelectedParticipants([]);
  };

  const handleNewThread = () => {
    resetModalState();
    setShowNewThreadModal(true);
    loadAvailableUsers();
  };

  const createThread = async () => {
    if (threadMode === 'direct') {
      if (!newThreadParticipant) {
        alert('Please select a participant');
        return;
      }

      setCreatingThread(true);
      try {
        const response = await API('/api/chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant_id: parseInt(newThreadParticipant),
            subject: newThreadSubject || null
          })
        });

        setSelectedThread(response.thread);
        setShowNewThreadModal(false);
        resetModalState();
      } catch (error) {
        console.error('Error creating thread:', error);
        alert('Failed to create conversation');
      } finally {
        setCreatingThread(false);
      }
    } else {
      // Group chat
      if (!groupName.trim()) {
        alert('Please enter a group name');
        return;
      }
      if (selectedParticipants.length < 1) {
        alert('Please select at least one participant');
        return;
      }

      setCreatingThread(true);
      try {
        const response = await API('/api/chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_group: true,
            name: groupName.trim(),
            participant_ids: selectedParticipants.map(p => p.id),
            subject: newThreadSubject || null
          })
        });

        setSelectedThread(response.thread);
        setShowNewThreadModal(false);
        resetModalState();
      } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group');
      } finally {
        setCreatingThread(false);
      }
    }
  };

  const addParticipant = (user) => {
    if (!selectedParticipants.find(p => p.id === user.id)) {
      setSelectedParticipants([...selectedParticipants, user]);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const removeParticipant = (userId) => {
    setSelectedParticipants(selectedParticipants.filter(p => p.id !== userId));
  };

  const loadThreads = async () => {
    try {
      const response = await API('/api/chat/threads');
      const loadedThreads = response.threads || [];
      setThreads(loadedThreads);
      
      if (pageParams.threadId && !selectedThread) {
        const threadToSelect = loadedThreads.find(t => t.id === parseInt(pageParams.threadId));
        if (threadToSelect) {
          setSelectedThread(threadToSelect);
          if (isMobile) {
            setShowSidebar(false);
          }
          if (pageParams.messageId) {
            setHighlightMessageId(parseInt(pageParams.messageId));
          }
        }
      }
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  useEffect(() => {
    if (pageParams.threadId) {
      loadThreads();
    }
  }, []);

  useEffect(() => {
    if (pageParams.threadId) {
      const threadId = parseInt(pageParams.threadId);
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        setSelectedThread(thread);
        if (isMobile) {
          setShowSidebar(false);
        }
        if (pageParams.messageId) {
          setHighlightMessageId(parseInt(pageParams.messageId));
        }
      } else {
        loadThreads();
      }
    }
  }, [pageParams.threadId, pageParams.messageId, threads, isMobile]);

  useEffect(() => {
    if (selectedThread && isMobile) {
      setShowSidebar(false);
    }
  }, [selectedThread, isMobile]);

  const filteredUsers = availableUsers.filter(u => 
    u.id !== currentUserId &&
    !selectedParticipants.find(p => p.id === u.id) &&
    (u.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.department?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {(showSidebar || !isMobile) && (
          <div className={`${isMobile ? 'absolute inset-0 z-10' : 'w-full lg:w-1/3 h-full'}`}>
            <ChatSidebar
              selectedThreadId={selectedThread?.id}
              onSelectThread={(thread) => {
                setSelectedThread(thread);
                setHighlightMessageId(null);
                if (isMobile) {
                  setShowSidebar(false);
                }
              }}
              onNewThread={handleNewThread}
            />
          </div>
        )}

        {(!showSidebar || !isMobile) && (
          <div className={`${isMobile ? 'w-full h-full' : 'flex-1 min-h-0'}`}>
            <ChatWindow
              thread={selectedThread}
              currentUserId={currentUserId}
              highlightMessageId={highlightMessageId}
              onClearHighlight={() => setHighlightMessageId(null)}
              onBack={() => {
                if (isMobile) {
                  setShowSidebar(true);
                  setSelectedThread(null);
                  setHighlightMessageId(null);
                }
              }}
              onThreadUpdate={(updatedThread) => setSelectedThread(updatedThread)}
            />
          </div>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-tahoe p-6 w-full max-w-md shadow-tahoe-lg"
            style={{ backgroundColor: 'rgba(22, 22, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
          >
            <h3 className="text-lg font-semibold text-tahoe-text-primary mb-4">New Conversation</h3>

            {/* Mode Toggle */}
            <div className="flex mb-4 p-1 rounded-tahoe" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
              <button
                onClick={() => setThreadMode('direct')}
                className="flex-1 py-2 px-4 rounded-tahoe text-sm font-medium transition-all duration-tahoe"
                style={threadMode === 'direct' 
                  ? { backgroundColor: '#0A84FF', color: '#ffffff' } 
                  : { color: '#98989a' }}
              >
                Direct Message
              </button>
              <button
                onClick={() => setThreadMode('group')}
                className="flex-1 py-2 px-4 rounded-tahoe text-sm font-medium transition-all duration-tahoe"
                style={threadMode === 'group' 
                  ? { backgroundColor: '#0A84FF', color: '#ffffff' } 
                  : { color: '#98989a' }}
              >
                Group Chat
              </button>
            </div>

            <div className="space-y-4">
              {/* Group Name (only for groups) */}
              {threadMode === 'group' && (
                <div>
                  <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                </div>
              )}

              {/* Participant Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                  {threadMode === 'direct' ? 'Select participant' : 'Add participants'}
                </label>
                
                {/* Selected participants chips (for groups) */}
                {threadMode === 'group' && selectedParticipants.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedParticipants.map(user => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: 'rgba(10, 132, 255, 0.2)', color: '#0A84FF' }}
                      >
                        {user.employee_name || `${user.first_name} ${user.last_name}`}
                        <button
                          onClick={() => removeParticipant(user.id)}
                          className="ml-1 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setSelectedUserIndex(-1);
                      if (!e.target.value && threadMode === 'direct') {
                        setNewThreadParticipant('');
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedUserIndex(prev => 
                          prev < filteredUsers.slice(0, 10).length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedUserIndex(prev => prev > 0 ? prev - 1 : -1);
                      } else if (e.key === 'Enter' && selectedUserIndex >= 0) {
                        e.preventDefault();
                        const selected = filteredUsers[selectedUserIndex];
                        if (threadMode === 'direct') {
                          setNewThreadParticipant(selected.id.toString());
                          setSearchQuery(selected.employee_name || `${selected.first_name} ${selected.last_name}`);
                          setShowSuggestions(false);
                        } else {
                          addParticipant(selected);
                        }
                      }
                    }}
                    placeholder="Search employees..."
                    className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                  />
                  
                  {showSuggestions && searchQuery && (
                    <div className="absolute z-50 w-full mt-1 rounded-tahoe shadow-tahoe-lg max-h-60 overflow-y-auto" style={{ backgroundColor: 'rgba(22, 22, 24, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                      {filteredUsers.slice(0, 10).map((user, index) => {
                        const displayName = user.employee_name || `${user.first_name} ${user.last_name}`;
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              if (threadMode === 'direct') {
                                setNewThreadParticipant(user.id.toString());
                                setSearchQuery(displayName);
                                setShowSuggestions(false);
                              } else {
                                addParticipant(user);
                              }
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-tahoe-bg-hover transition-all duration-tahoe"
                            style={index === selectedUserIndex ? { backgroundColor: 'rgba(10, 132, 255, 0.1)' } : {}}
                          >
                            <div className="font-medium text-tahoe-text-primary">{displayName}</div>
                            <div className="text-xs text-tahoe-text-muted flex items-center gap-2">
                              {user.department && <span>{user.department}</span>}
                              {user.role && user.role !== 'user' && (
                                <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                                  {user.role}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <div className="px-4 py-2 text-sm text-tahoe-text-muted">
                          No employees found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected participant display (for DM) */}
                {threadMode === 'direct' && newThreadParticipant && (
                  <div className="mt-2 text-sm text-tahoe-text-secondary">
                    Selected: {availableUsers.find(u => u.id.toString() === newThreadParticipant)?.employee_name || 
                              `${availableUsers.find(u => u.id.toString() === newThreadParticipant)?.first_name} ${availableUsers.find(u => u.id.toString() === newThreadParticipant)?.last_name}`}
                  </div>
                )}
              </div>

              {/* Subject (optional) */}
              <div>
                <label className="block text-sm font-medium text-tahoe-text-primary mb-2">
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={newThreadSubject}
                  onChange={(e) => setNewThreadSubject(e.target.value)}
                  placeholder="e.g., Project Discussion"
                  className="w-full px-4 py-2 rounded-tahoe-input focus:outline-none focus:ring-2 focus:ring-tahoe-accent transition-all duration-tahoe"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewThreadModal(false);
                  resetModalState();
                }}
                className="px-4 py-2 rounded-tahoe-pill transition-all duration-tahoe"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.12)' }}
              >
                Cancel
              </button>
              <button
                onClick={createThread}
                disabled={
                  creatingThread || 
                  (threadMode === 'direct' && !newThreadParticipant) ||
                  (threadMode === 'group' && (!groupName.trim() || selectedParticipants.length < 1))
                }
                className="px-4 py-2 rounded-tahoe-pill disabled:opacity-50 transition-all duration-tahoe"
                style={{ backgroundColor: '#0A84FF', color: '#ffffff' }}
              >
                {creatingThread ? 'Creating...' : threadMode === 'group' ? 'Create Group' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
