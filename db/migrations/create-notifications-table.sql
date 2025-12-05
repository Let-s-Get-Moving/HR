-- Create notifications table for in-app notification center
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('leave_approval', 'leave_rejection', 'payroll_processed', 'chat_message', 'system_alert')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER, -- e.g., leave_request_id, payroll_run_id, message_id
  related_type VARCHAR(50), -- 'leave_request', 'payroll_run', 'chat_thread', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id) WHERE related_id IS NOT NULL;

