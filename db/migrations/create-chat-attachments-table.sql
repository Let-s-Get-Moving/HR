-- Create chat_attachments table for file sharing in chat
CREATE TABLE IF NOT EXISTS chat_attachments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_uploaded ON chat_attachments(uploaded_at DESC);

