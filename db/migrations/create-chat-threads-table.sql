-- Create chat_threads table for internal messaging system
CREATE TABLE IF NOT EXISTS chat_threads (
  id SERIAL PRIMARY KEY,
  participant1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  participant2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255), -- e.g., "Leave Request #123", "Onboarding Question"
  related_type VARCHAR(50), -- 'leave_request', 'onboarding', 'general'
  related_id INTEGER,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_thread UNIQUE(participant1_id, participant2_id, related_type, related_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_participant1 ON chat_threads(participant1_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_participant2 ON chat_threads(participant2_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message ON chat_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_related ON chat_threads(related_type, related_id) WHERE related_id IS NOT NULL;

