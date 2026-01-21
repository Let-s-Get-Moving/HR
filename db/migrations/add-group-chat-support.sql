-- Migration: Add group chat support
-- Extends chat_threads for groups and adds participants table

-- 1. Extend chat_threads with group support columns
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- 2. Create chat_thread_participants table for membership tracking
CREATE TABLE IF NOT EXISTS chat_thread_participants (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT unique_thread_participant UNIQUE(thread_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_user ON chat_thread_participants(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_thread ON chat_thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_is_group ON chat_threads(is_group);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by ON chat_threads(created_by);

-- 4. Backfill existing DM threads into participants table
-- Insert participant1 as owner (lower ID = creator by convention)
INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
SELECT 
  id AS thread_id,
  participant1_id AS user_id,
  'owner' AS role,
  created_at AS joined_at
FROM chat_threads
WHERE participant1_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_thread_participants p 
    WHERE p.thread_id = chat_threads.id AND p.user_id = chat_threads.participant1_id
  );

-- Insert participant2 as member
INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
SELECT 
  id AS thread_id,
  participant2_id AS user_id,
  'member' AS role,
  created_at AS joined_at
FROM chat_threads
WHERE participant2_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_thread_participants p 
    WHERE p.thread_id = chat_threads.id AND p.user_id = chat_threads.participant2_id
  );

-- 5. Comments for documentation
COMMENT ON TABLE chat_thread_participants IS 'Tracks membership in chat threads (DMs and groups)';
COMMENT ON COLUMN chat_thread_participants.role IS 'owner = creator/can manage, admin = can manage, member = regular participant';
COMMENT ON COLUMN chat_threads.is_group IS 'FALSE for 1:1 DMs, TRUE for group chats';
COMMENT ON COLUMN chat_threads.name IS 'Display name for group chats (NULL for DMs)';
COMMENT ON COLUMN chat_threads.created_by IS 'User who created the thread';
