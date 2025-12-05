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
  const [newThreadParticipant, setNewThreadParticipant] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [creatingThread, setCreatingThread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1);

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

  const handleNewThread = () => {
    setShowNewThreadModal(true);
    loadAvailableUsers();
  };

  const createThread = async () => {
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
      setNewThreadParticipant('');
      setNewThreadSubject('');
    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create conversation');
    } finally {
      setCreatingThread(false);
    }
  };

  // Mobile: show sidebar or chat, not both
  const [showSidebar, setShowSidebar] = useState(true);
  const [threads, setThreads] = useState([]);

  // Load threads and auto-select if threadId is provided in pageParams
  const loadThreads = async () => {
    try {
      const response = await API('/api/chat/threads');
      const loadedThreads = response.threads || [];
      setThreads(loadedThreads);
      
      // Auto-select thread if threadId is provided
      if (pageParams.threadId && !selectedThread) {
        const threadToSelect = loadedThreads.find(t => t.id === parseInt(pageParams.threadId));
        if (threadToSelect) {
          setSelectedThread(threadToSelect);
          if (isMobile) {
            setShowSidebar(false);
          }
          // Set message to highlight if provided
          if (pageParams.messageId) {
            setHighlightMessageId(parseInt(pageParams.messageId));
          }
        }
      }
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  // Initial load - only if we need to auto-select a thread
  useEffect(() => {
    if (pageParams.threadId) {
      loadThreads();
    }
  }, []);

  // Handle pageParams changes (when navigating from notification)
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
        // Thread not loaded yet, reload threads
        loadThreads();
      }
    }
  }, [pageParams.threadId, pageParams.messageId, threads, isMobile]);

  useEffect(() => {
    if (selectedThread && isMobile) {
      setShowSidebar(false);
    }
  }, [selectedThread, isMobile]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop: always visible, Mobile: conditional */}
        {(showSidebar || !isMobile) && (
          <div className={`${isMobile ? 'absolute inset-0 z-10' : 'w-full lg:w-1/3'} flex-shrink-0`}>
            <ChatSidebar
              selectedThreadId={selectedThread?.id}
              onSelectThread={(thread) => {
                setSelectedThread(thread);
                setHighlightMessageId(null); // Clear highlight when selecting new thread
                if (isMobile) {
                  setShowSidebar(false);
                }
              }}
              onNewThread={handleNewThread}
            />
          </div>
        )}

        {/* Chat Window - Desktop: always visible, Mobile: conditional */}
        {(!showSidebar || !isMobile) && (
          <div className={`${isMobile ? 'w-full' : 'flex-1'} flex-shrink-0`}>
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
            />
          </div>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-semibold text-primary mb-4">New Conversation</h3>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-primary mb-2">
                  Select participant
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setSelectedUserIndex(-1);
                      if (!e.target.value) {
                        setNewThreadParticipant('');
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Delay to allow click on suggestion
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    onKeyDown={(e) => {
                      const filtered = availableUsers.filter(u => 
                        u.id !== currentUserId &&
                        (u.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                      );
                      
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedUserIndex(prev => 
                          prev < filtered.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedUserIndex(prev => prev > 0 ? prev - 1 : -1);
                      } else if (e.key === 'Enter' && selectedUserIndex >= 0) {
                        e.preventDefault();
                        const selected = filtered[selectedUserIndex];
                        setNewThreadParticipant(selected.id.toString());
                        setSearchQuery(selected.employee_name || `${selected.first_name} ${selected.last_name}`);
                        setShowSuggestions(false);
                      }
                    }}
                    placeholder="Type to search employees..."
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && searchQuery && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {availableUsers
                        .filter(u => 
                          u.id !== currentUserId &&
                          (u.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .slice(0, 10)
                        .map((user, index) => {
                          const displayName = user.employee_name || `${user.first_name} ${user.last_name}`;
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setNewThreadParticipant(user.id.toString());
                                setSearchQuery(displayName);
                                setShowSuggestions(false);
                              }}
                              className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                                index === selectedUserIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                              }`}
                            >
                              <div className="font-medium text-primary">{displayName}</div>
                              {user.role && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">{user.role}</div>
                              )}
                            </button>
                          );
                        })}
                      {availableUsers.filter(u => 
                        u.id !== currentUserId &&
                        (u.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                          No employees found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {newThreadParticipant && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Selected: {availableUsers.find(u => u.id.toString() === newThreadParticipant)?.employee_name || 
                                `${availableUsers.find(u => u.id.toString() === newThreadParticipant)?.first_name} ${availableUsers.find(u => u.id.toString() === newThreadParticipant)?.last_name}`}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Subject (optional)
                </label>
                <input
                  type="text"
                  value={newThreadSubject}
                  onChange={(e) => setNewThreadSubject(e.target.value)}
                  placeholder="e.g., Leave Request #123"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewThreadModal(false);
                  setNewThreadParticipant('');
                  setNewThreadSubject('');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-primary hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createThread}
                disabled={!newThreadParticipant || creatingThread}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creatingThread ? 'Creating...' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

