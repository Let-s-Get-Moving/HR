-- Migration: Add per-user thread state flags and message delete-for-me support
-- Telegram-inspired chat enhancements

-- 1. Extend chat_thread_participants with per-user state columns
ALTER TABLE chat_thread_participants ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ NULL;
ALTER TABLE chat_thread_participants ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ NULL;
ALTER TABLE chat_thread_participants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- 2. Create indexes for efficient filtering/sorting
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_pinned ON chat_thread_participants(user_id, pinned_at) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_hidden ON chat_thread_participants(user_id, hidden_at) WHERE hidden_at IS NOT NULL;

-- 3. Create chat_message_user_states table for per-user message delete
CREATE TABLE IF NOT EXISTS chat_message_user_states (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_message_user_state UNIQUE(message_id, user_id)
);

-- 4. Indexes for message state lookups
CREATE INDEX IF NOT EXISTS idx_chat_message_user_states_user ON chat_message_user_states(user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_user_states_message ON chat_message_user_states(message_id);

-- 5. Documentation
COMMENT ON COLUMN chat_thread_participants.pinned_at IS 'When user pinned this thread (NULL = not pinned)';
COMMENT ON COLUMN chat_thread_participants.hidden_at IS 'When user hid/deleted this thread (NULL = visible). Thread reappears if new message arrives after hidden_at.';
COMMENT ON COLUMN chat_thread_participants.archived_at IS 'When user archived this thread (NULL = not archived)';
COMMENT ON TABLE chat_message_user_states IS 'Per-user message states for delete-for-me functionality';
COMMENT ON COLUMN chat_message_user_states.deleted_at IS 'When user deleted this message for themselves';
