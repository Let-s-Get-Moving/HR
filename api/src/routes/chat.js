import express from 'express';
import multer from 'multer';
import { requireAuth } from '../session.js';
import { applyScopeFilter } from '../middleware/rbac.js';
import { q } from '../db.js';
import { sendToUser } from '../websocket/server.js';
import { createNotification } from '../utils/notifications.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);
router.use(applyScopeFilter);

// Get available users for messaging
router.get('/available-users', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      // Users can only message HR (manager/admin)
      query = `
        SELECT 
          u.id,
          u.username,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
          u.email,
          COALESCE(r.role_name, 'user') as role
        FROM users u
        LEFT JOIN hr_roles r ON u.role_id = r.id
        WHERE u.id != $1 
          AND COALESCE(r.role_name, 'user') IN ('manager', 'admin')
        ORDER BY u.username
      `;
      params = [userId];
    } else {
      // HR can message anyone
      query = `
        SELECT 
          u.id,
          u.username,
          COALESCE(u.first_name || ' ' || u.last_name, u.username) as full_name,
          u.email,
          COALESCE(r.role_name, 'user') as role
        FROM users u
        LEFT JOIN hr_roles r ON u.role_id = r.id
        WHERE u.id != $1
        ORDER BY u.username
      `;
      params = [userId];
    }

    const result = await q(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    logger.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
});

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now (can be restricted later)
    cb(null, true);
  }
});

/**
 * Helper: Get user's role
 */
async function getUserRole(userId) {
  try {
    const result = await q(`
      SELECT COALESCE(r.role_name, 'user') as role
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);
    return result.rows[0]?.role || 'user';
  } catch (error) {
    logger.error('Error getting user role:', error);
    return 'user';
  }
}

/**
 * Helper: Verify user can access thread
 */
async function verifyThreadAccess(threadId, userId, userRole) {
  try {
    const result = await q(`
      SELECT participant1_id, participant2_id
      FROM chat_threads
      WHERE id = $1
    `, [threadId]);

    if (result.rows.length === 0) {
      return { allowed: false, reason: 'Thread not found' };
    }

    const thread = result.rows[0];
    const isParticipant = thread.participant1_id === userId || thread.participant2_id === userId;

    if (userRole === 'user') {
      // Users can only access threads they're part of
      if (!isParticipant) {
        return { allowed: false, reason: 'Access denied' };
      }

      // Verify other participant is HR (manager/admin)
      const otherParticipantId = thread.participant1_id === userId 
        ? thread.participant2_id 
        : thread.participant1_id;
      
      const otherRole = await getUserRole(otherParticipantId);
      if (!['manager', 'admin'].includes(otherRole)) {
        return { allowed: false, reason: 'Users can only chat with HR' };
      }
    } else {
      // HR/Manager can access any thread
      if (!isParticipant) {
        // Still allow if they're HR
        return { allowed: true };
      }
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Error verifying thread access:', error);
    return { allowed: false, reason: 'Error verifying access' };
  }
}

// Get user's chat threads
router.get('/threads', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      // Users see only threads where they're a participant
      query = `
        SELECT 
          t.*,
          CASE 
            WHEN t.participant1_id = $1 THEN u2.id
            ELSE u1.id
          END as other_user_id,
          CASE 
            WHEN t.participant1_id = $1 THEN COALESCE(u2.first_name || ' ' || u2.last_name, u2.username)
            ELSE COALESCE(u1.first_name || ' ' || u1.last_name, u1.username)
          END as other_user_name,
          CASE 
            WHEN t.participant1_id = $1 THEN u2.username
            ELSE u1.username
          END as other_username,
          COALESCE(r2.role_name, r1.role_name, 'user') as other_user_role
        FROM chat_threads t
        JOIN users u1 ON t.participant1_id = u1.id
        JOIN users u2 ON t.participant2_id = u2.id
        LEFT JOIN hr_roles r1 ON u1.role_id = r1.id
        LEFT JOIN hr_roles r2 ON u2.role_id = r2.id
        WHERE (t.participant1_id = $1 OR t.participant2_id = $1)
          AND (
            CASE 
              WHEN t.participant1_id = $1 THEN COALESCE(r2.role_name, 'user')
              ELSE COALESCE(r1.role_name, 'user')
            END IN ('manager', 'admin')
          )
        ORDER BY t.last_message_at DESC
      `;
      params = [userId];
    } else {
      // HR/Manager see all threads
      query = `
        SELECT 
          t.*,
          CASE 
            WHEN t.participant1_id = $1 THEN u2.id
            ELSE u1.id
          END as other_user_id,
          CASE 
            WHEN t.participant1_id = $1 THEN COALESCE(u2.first_name || ' ' || u2.last_name, u2.username)
            ELSE COALESCE(u1.first_name || ' ' || u1.last_name, u1.username)
          END as other_user_name,
          CASE 
            WHEN t.participant1_id = $1 THEN u2.username
            ELSE u1.username
          END as other_username,
          CASE 
            WHEN t.participant1_id = $1 THEN COALESCE(r2.role_name, 'user')
            ELSE COALESCE(r1.role_name, 'user')
          END as other_user_role
        FROM chat_threads t
        JOIN users u1 ON t.participant1_id = u1.id
        JOIN users u2 ON t.participant2_id = u2.id
        LEFT JOIN hr_roles r1 ON u1.role_id = r1.id
        LEFT JOIN hr_roles r2 ON u2.role_id = r2.id
        WHERE t.participant1_id = $1 OR t.participant2_id = $1
        ORDER BY t.last_message_at DESC
      `;
      params = [userId];
    }

    const result = await q(query, params);
    res.json({ threads: result.rows });
  } catch (error) {
    logger.error('Error fetching chat threads:', error);
    res.status(500).json({ error: 'Failed to fetch chat threads' });
  }
});

// Create new chat thread
router.post('/threads', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { participant_id, subject, related_type, related_id } = req.body;

    if (!participant_id) {
      return res.status(400).json({ error: 'participant_id is required' });
    }

    // Verify participant exists
    const participantResult = await q(`
      SELECT u.id, COALESCE(r.role_name, 'user') as role
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [participant_id]);

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const participantRole = participantResult.rows[0].role;

    // Access control: Users can only create threads with HR
    if (userRole === 'user') {
      if (!['manager', 'admin'].includes(participantRole)) {
        return res.status(403).json({ 
          error: 'Users can only create chat threads with HR (Manager/Admin)' 
        });
      }
    }

    // Prevent self-chat
    if (userId === participant_id) {
      return res.status(400).json({ error: 'Cannot create thread with yourself' });
    }

    // Ensure participant1_id < participant2_id for consistency
    const participant1_id = userId < participant_id ? userId : participant_id;
    const participant2_id = userId < participant_id ? participant_id : userId;

    // Check if thread already exists
    const existingResult = await q(`
      SELECT id FROM chat_threads
      WHERE participant1_id = $1 
        AND participant2_id = $2
        AND (related_type = $3 OR ($3 IS NULL AND related_type IS NULL))
        AND (related_id = $4 OR ($4 IS NULL AND related_id IS NULL))
    `, [participant1_id, participant2_id, related_type || null, related_id || null]);

    if (existingResult.rows.length > 0) {
      return res.json({ 
        thread: existingResult.rows[0],
        message: 'Thread already exists'
      });
    }

    // Create new thread
    const result = await q(`
      INSERT INTO chat_threads (participant1_id, participant2_id, subject, related_type, related_id, last_message_at, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [participant1_id, participant2_id, subject || null, related_type || null, related_id || null]);

    const thread = result.rows[0];

    // Get other participant info
    const otherParticipantId = thread.participant1_id === userId 
      ? thread.participant2_id 
      : thread.participant1_id;

    const otherUserResult = await q(`
      SELECT 
        id,
        COALESCE(first_name || ' ' || last_name, username) as full_name,
        username
      FROM users
      WHERE id = $1
    `, [otherParticipantId]);

    const threadWithUser = {
      ...thread,
      other_user_id: otherParticipantId,
      other_user_name: otherUserResult.rows[0]?.full_name,
      other_username: otherUserResult.rows[0]?.username
    };

    res.json({ thread: threadWithUser });
  } catch (error) {
    logger.error('Error creating chat thread:', error);
    res.status(500).json({ error: 'Failed to create chat thread' });
  }
});

// Get messages in thread
router.get('/threads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { limit = 50, offset = 0 } = req.query;

    // Verify access
    const access = await verifyThreadAccess(id, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    // Get messages
    const result = await q(`
      SELECT 
        m.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as sender_name,
        u.username as sender_username
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);

    // Get attachments for each message
    const messages = await Promise.all(result.rows.map(async (message) => {
      const attachmentsResult = await q(`
        SELECT id, file_name, file_size, mime_type, uploaded_at
        FROM chat_attachments
        WHERE message_id = $1
      `, [message.id]);

      return {
        ...message,
        attachments: attachmentsResult.rows
      };
    }));

    res.json({ messages });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message in thread
router.post('/threads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify access
    const access = await verifyThreadAccess(id, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    // Get thread to find other participant
    const threadResult = await q(`
      SELECT participant1_id, participant2_id
      FROM chat_threads
      WHERE id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const thread = threadResult.rows[0];
    const recipientId = thread.participant1_id === userId 
      ? thread.participant2_id 
      : thread.participant1_id;

    // Insert message
    const result = await q(`
      INSERT INTO chat_messages (thread_id, sender_id, message, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [id, userId, message.trim()]);

    const newMessage = result.rows[0];

    // Update thread's last_message_at
    await q(`
      UPDATE chat_threads
      SET last_message_at = NOW()
      WHERE id = $1
    `, [id]);

    // Get sender info
    const senderResult = await q(`
      SELECT 
        COALESCE(first_name || ' ' || last_name, username) as full_name,
        username
      FROM users
      WHERE id = $1
    `, [userId]);

    const messageWithSender = {
      ...newMessage,
      sender_name: senderResult.rows[0]?.full_name,
      sender_username: senderResult.rows[0]?.username,
      attachments: []
    };

    // Send via WebSocket to recipient
    sendToUser(recipientId, 'chat:message', {
      thread_id: parseInt(id),
      message: messageWithSender
    });

    // Create notification for recipient
    await createNotification(
      recipientId,
      'chat_message',
      'New message',
      `You have a new message from ${senderResult.rows[0]?.full_name || senderResult.rows[0]?.username}`,
      parseInt(id),
      'chat_thread'
    );

    res.json({ message: messageWithSender });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload file attachment
router.post('/messages/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify message exists and user is sender
    const messageResult = await q(`
      SELECT m.id, m.thread_id, m.sender_id
      FROM chat_messages m
      WHERE m.id = $1
    `, [id]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only attach files to your own messages' });
    }

    // Verify thread access
    const access = await verifyThreadAccess(message.thread_id, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    // Insert attachment
    const result = await q(`
      INSERT INTO chat_attachments (message_id, file_name, file_data, file_size, mime_type, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, file_name, file_size, mime_type, uploaded_at
    `, [
      id,
      req.file.originalname,
      req.file.buffer,
      req.file.size,
      req.file.mimetype || 'application/octet-stream'
    ]);

    const attachment = result.rows[0];

    res.json({ attachment });
  } catch (error) {
    logger.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Download attachment
router.get('/attachments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    // Get attachment with message and thread info
    const result = await q(`
      SELECT 
        a.id,
        a.message_id,
        a.file_name,
        a.file_data,
        a.file_size,
        a.mime_type,
        m.thread_id,
        m.sender_id
      FROM chat_attachments a
      JOIN chat_messages m ON a.message_id = m.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Verify thread access
    const access = await verifyThreadAccess(attachment.thread_id, userId, userRole);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    // Send file
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.setHeader('Content-Length', attachment.file_size);
    res.send(attachment.file_data);
  } catch (error) {
    logger.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Edit message
router.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify message exists and user is sender
    const result = await q(`
      UPDATE chat_messages
      SET message = $1, is_edited = TRUE, edited_at = NOW()
      WHERE id = $2 AND sender_id = $3
      RETURNING *
    `, [message.trim(), id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or you are not the sender' });
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    logger.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    // Verify message exists
    const messageResult = await q(`
      SELECT m.id, m.thread_id, m.sender_id
      FROM chat_messages m
      WHERE m.id = $1
    `, [id]);

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messageResult.rows[0];

    // Users can only delete their own messages, HR can delete any
    if (userRole === 'user' && message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete message (cascade will delete attachments)
    await q(`
      DELETE FROM chat_messages
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Message deleted' });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;

