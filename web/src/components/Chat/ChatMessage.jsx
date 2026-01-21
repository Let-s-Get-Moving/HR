import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatAttachment from './ChatAttachment.jsx';

export default function ChatMessage({ 
  message, 
  isOwn, 
  senderName, 
  highlightMessageId, 
  messageRef, 
  showSenderName = false,
  onDeleteForMe,
  onEdit
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatFullDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const isHighlighted = highlightMessageId && message.id === highlightMessageId;
  const shouldShowSender = showSenderName && !isOwn;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = bubbleRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    setShowMenu(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.message);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDeleteForMe = () => {
    if (onDeleteForMe) {
      onDeleteForMe(message.id);
    }
    setShowMenu(false);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message);
    }
    setShowMenu(false);
  };

  return (
    <div 
      ref={isHighlighted ? messageRef : null}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
    >
      <div className={`max-w-[70%] sm:max-w-[60%] relative ${isOwn ? 'order-2' : 'order-1'}`}>
        {shouldShowSender && (
          <p className="text-xs text-tahoe-text-muted mb-1 px-2">
            {senderName || 'Unknown'}
          </p>
        )}
        <div
          ref={bubbleRef}
          onContextMenu={handleContextMenu}
          className={`relative rounded-tahoe px-4 py-2 transition-all duration-tahoe cursor-default ${
            isOwn
              ? 'rounded-br-sm'
              : 'rounded-bl-sm'
          } ${
            isHighlighted 
              ? 'ring-4 ring-yellow-400 shadow-tahoe-md scale-105' 
              : ''
          }`}
          style={isOwn ? { backgroundColor: '#0A84FF', color: '#ffffff' } : { backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' }}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <ChatAttachment key={attachment.id} attachment={attachment} isOwn={isOwn} />
              ))}
            </div>
          )}

          {/* Timestamp and edit indicator - with tooltip */}
          <div className="flex items-center justify-end space-x-2 mt-1">
            {message.is_edited && (
              <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-tahoe-text-muted'}`}>
                (edited)
              </span>
            )}
            <span 
              className={`text-xs cursor-default ${isOwn ? 'text-white/70' : 'text-tahoe-text-muted'}`}
              title={formatFullDateTime(message.created_at)}
            >
              {formatTime(message.created_at)}
            </span>
          </div>

          {/* Hover menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = bubbleRef.current?.getBoundingClientRect();
              if (rect) {
                setMenuPosition({ x: 0, y: 30 });
              }
              setShowMenu(!showMenu);
            }}
            className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <svg className="w-4 h-4 text-tahoe-text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Context menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className={`absolute z-50 min-w-[140px] rounded-tahoe overflow-hidden shadow-tahoe-lg ${isOwn ? 'right-0' : 'left-0'}`}
                style={{ 
                  top: menuPosition.y,
                  backgroundColor: 'rgba(40, 40, 44, 0.98)', 
                  backdropFilter: 'blur(20px)', 
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <button
                  onClick={handleCopy}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                {isOwn && onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                    style={{ color: '#ffffff' }}
                  >
                    <svg className="w-4 h-4 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                )}
                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                <button
                  onClick={handleDeleteForMe}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-tahoe-bg-hover transition-colors"
                  style={{ color: '#FF453A' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete for me
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
