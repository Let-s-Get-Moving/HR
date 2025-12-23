import ChatAttachment from './ChatAttachment.jsx';

export default function ChatMessage({ message, isOwn, senderName, highlightMessageId, messageRef }) {
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isHighlighted = highlightMessageId && message.id === highlightMessageId;

  return (
    <div 
      ref={isHighlighted ? messageRef : null}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[70%] sm:max-w-[60%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <p className="text-xs text-tahoe-text-muted mb-1 px-2">
            {senderName || 'Unknown'}
          </p>
        )}
        <div
          className={`rounded-tahoe px-4 py-2 transition-all duration-tahoe ${
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

          {/* Timestamp and edit indicator */}
          <div className="flex items-center justify-end space-x-2 mt-1">
            {message.is_edited && (
              <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-tahoe-text-muted'}`}>
                (edited)
              </span>
            )}
            <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-tahoe-text-muted'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

