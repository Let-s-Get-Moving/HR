import ChatAttachment from './ChatAttachment.jsx';

export default function ChatMessage({ message, isOwn, senderName }) {
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] sm:max-w-[60%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-2">
            {senderName || 'Unknown'}
          </p>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-slate-100 dark:bg-slate-700 text-primary rounded-bl-sm'
          }`}
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
              <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                (edited)
              </span>
            )}
            <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

