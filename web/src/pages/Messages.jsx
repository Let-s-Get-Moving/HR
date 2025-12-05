import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API } from '../config/api.js';
import { sessionManager } from '../utils/sessionManager.js';
import ChatSidebar from '../components/Chat/ChatSidebar.jsx';
import ChatWindow from '../components/Chat/ChatWindow.jsx';

export default function Messages() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThreadParticipant, setNewThreadParticipant] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [creatingThread, setCreatingThread] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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
              onBack={() => {
                if (isMobile) {
                  setShowSidebar(true);
                  setSelectedThread(null);
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
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Select participant
                </label>
                <select
                  value={newThreadParticipant}
                  onChange={(e) => setNewThreadParticipant(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary"
                >
                  <option value="">Choose...</option>
                  {availableUsers
                    .filter(u => u.id !== currentUserId)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.role || 'user'})
                      </option>
                    ))}
                </select>
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

