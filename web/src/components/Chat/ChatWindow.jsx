import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { API } from '../../config/api.js';
import { useChatMessages } from '../../hooks/useWebSocket.js';
import ChatMessage from './ChatMessage.jsx';

export default function ChatWindow({ thread, currentUserId, onBack, highlightMessageId, onClearHighlight }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const highlightMessageRef = useRef(null);
  const fileInputRef = useRef(null);
  const { messages: realTimeMessages, setMessages: setRealTimeMessages } = useChatMessages(thread?.id);

  // Load messages
  const loadMessages = async () => {
    if (!thread?.id) return;
    setLoading(true);
    try {
      console.log('[ChatWindow] Loading messages for thread:', thread.id);
      const response = await API(`/api/chat/threads/${thread.id}/messages?limit=100`);
      const loadedMessages = response.messages || [];
      console.log('[ChatWindow] Loaded messages:', loadedMessages.length);
      setMessages(loadedMessages);
      setRealTimeMessages(loadedMessages);
    } catch (error) {
      console.error('[ChatWindow] Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (thread?.id) {
      loadMessages();
    } else {
      setMessages([]);
      setRealTimeMessages([]);
    }
  }, [thread?.id]);

  // Merge real-time messages
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

  // Scroll to bottom when messages change, or scroll to highlighted message
  useEffect(() => {
    if (highlightMessageId && highlightMessageRef.current) {
      // Scroll to highlighted message
      highlightMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Clear highlight after scrolling
      if (onClearHighlight) {
        setTimeout(() => onClearHighlight(), 3000);
      }
    } else {
      // Scroll to bottom for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, highlightMessageId, onClearHighlight]);

  const sendMessage = async () => {
    if (!message.trim() || !thread?.id || sending) return;

    const messageText = message.trim();
    setSending(true);
    try {
      console.log('[ChatWindow] Sending message:', { threadId: thread.id, message: messageText });
      
      const response = await API(`/api/chat/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });

      console.log('[ChatWindow] Message sent, response:', response);

      // Immediately add the sent message to local state
      if (response.message) {
        const sentMessage = {
          ...response.message,
          sender_id: currentUserId,
          sender_name: response.message.sender_name,
          sender_username: response.message.sender_username,
          attachments: response.message.attachments || []
        };
        
        console.log('[ChatWindow] Adding message to local state:', sentMessage);
        
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => m.id === sentMessage.id);
          if (exists) {
            console.log('[ChatWindow] Message already exists, skipping');
            return prev;
          }
          
          const updated = [...prev, sentMessage].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
          console.log('[ChatWindow] Updated messages count:', updated.length);
          return updated;
        });
      } else {
        console.warn('[ChatWindow] No message in response, reloading messages');
        // Fallback: reload messages if response doesn't have message
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

    // First send a message, then attach the file
    setUploading(true);
    try {
      // Send message first
      const messageResponse = await API(`/api/chat/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `📎 ${file.name}` })
      });

      // Then upload attachment
      const formData = new FormData();
      formData.append('file', file);

      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com'}/api/chat/messages/${messageResponse.message.id}/attachments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'x-session-id': sessionId || ''
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Reload messages to show attachment
      loadMessages();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
      {/* Header - Always visible at top */}
      <div className="flex-shrink-0 z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {/* Mobile back button */}
          <button
            onClick={onBack}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
            {thread.other_user_name?.charAt(0)?.toUpperCase() || thread.other_username?.charAt(0)?.toUpperCase() || '?'}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary">
              {thread.other_user_name || thread.other_username || 'Unknown User'}
            </h3>
            {thread.subject && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{thread.subject}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Constrained, non-expandable, scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="p-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-slate-500 dark:text-slate-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                senderName={msg.sender_name || msg.sender_username}
                highlightMessageId={highlightMessageId}
                messageRef={highlightMessageRef}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Always visible at bottom */}
      <div className="flex-shrink-0 z-10 p-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md">
        <div className="flex items-end space-x-2">
          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Attach file"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Message Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-primary text-sm"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}

