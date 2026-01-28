import { APIDownload } from '../../config/api.js';

export default function ChatAttachment({ attachment, isOwn }) {
  const handleDownload = async () => {
    try {
      // Use APIDownload helper (cookie-based auth, no x-session-id)
      const response = await APIDownload(`/api/chat/attachments/${attachment.id}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = attachment.mime_type?.startsWith('image/');
  const isPDF = attachment.mime_type === 'application/pdf';

  return (
    <div className={`mt-2 p-2 rounded-tahoe-input border transition-all duration-tahoe ${
      isOwn 
        ? '' 
        : ''
    }`}
    style={isOwn ? { backgroundColor: 'rgba(10, 132, 255, 0.2)', borderColor: 'rgba(10, 132, 255, 0.3)' } : { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
    >
      <div className="flex items-center space-x-2">
        {/* File Icon */}
        <div className="flex-shrink-0">
          {isImage ? (
            <svg className="w-8 h-8 text-tahoe-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : isPDF ? (
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-tahoe-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-tahoe-text-primary truncate">{attachment.file_name}</p>
          <p className="text-xs text-tahoe-text-muted">
            {formatFileSize(attachment.file_size)}
          </p>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="flex-shrink-0 p-2 rounded-tahoe-input hover:bg-tahoe-bg-hover transition-all duration-tahoe text-tahoe-text-secondary hover:text-tahoe-text-primary"
          title="Download"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

