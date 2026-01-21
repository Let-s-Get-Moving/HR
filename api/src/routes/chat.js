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

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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
 * Helper: Check if user is HR (admin/manager)
 */
function isHR(role) {
  return ['admin', 'manager', 'hr_admin', 'hr_manager'].includes(role);
}

/**
 * Helper: Verify user can access thread via participants table
 */
async function verifyThreadAccess(threadId, userId) {
  try {
    // Check membership in participants table
    const result = await q(`
      SELECT p.role as participant_role, t.is_group, t.name
      FROM chat_thread_participants p
      JOIN chat_threads t ON p.thread_id = t.id
      WHERE p.thread_id = $1 AND p.user_id = $2
    `, [threadId, userId]);

    if (result.rows.length === 0) {
      // Fallback: check legacy participant1/participant2 columns for backward compat
      const legacyResult = await q(`
        SELECT id FROM chat_threads
        WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)
      `, [threadId, userId]);
      
      if (legacyResult.rows.length === 0) {
        return { allowed: false, reason: 'Access denied - not a participant' };
      }
    }

    return { allowed: true, participantRole: result.rows[0]?.participant_role };
  } catch (error) {
    logger.error('Error verifying thread access:', error);
    return { allowed: false, reason: 'Error verifying access' };
  }
}

/**
 * Helper: Get all participants for a thread
 */
async function getThreadParticipants(threadId) {
  const result = await q(`
    SELECT 
      p.user_id,
      p.role as participant_role,
      p.joined_at,
      u.username,
      COALESCE(e.first_name || ' ' || e.last_name, u.username) as display_name,
      COALESCE(r.role_name, 'user') as user_role
    FROM chat_thread_participants p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN employees e ON u.employee_id = e.id
    LEFT JOIN hr_roles r ON u.role_id = r.id
    WHERE p.thread_id = $1
    ORDER BY p.joined_at ASC
  `, [threadId]);
  return result.rows;
}

/**
 * Helper: Check if user can manage thread (owner or HR)
 */
async function canManageThread(threadId, userId, userRole) {
  if (isHR(userRole)) return true;
  
  const result = await q(`
    SELECT role FROM chat_thread_participants
    WHERE thread_id = $1 AND user_id = $2
  `, [threadId, userId]);
  
  return result.rows[0]?.role === 'owner';
}

// ============================================================================
// GET /available-users - All active employees (company-wide directory)
// ============================================================================
router.get('/available-users', async (req, res) => {
  try {
    const userId = req.user.id;

    // Return ALL active employees with user accounts (no HR-only restriction)
    const result = await q(`
      SELECT 
        u.id,
        u.username,
        COALESCE(e.first_name || ' ' || e.last_name, u.username) as employee_name,
        e.first_name,
        e.last_name,
        u.email,
        COALESCE(r.role_name, 'user') as role,
        d.name as department
      FROM users u
      INNER JOIN employees e ON u.employee_id = e.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE u.id != $1 
        AND e.status = 'Active'
        AND u.is_active IS NOT FALSE
      ORDER BY e.first_name, e.last_name
    `, [userId]);

    res.json({ users: result.rows });
  } catch (error) {
    logger.error('Error fetching available users:', error);
    res.status(500).json({ error: 'Failed to fetch available users' });
  }
});

// ============================================================================
// GET /threads - List user's chat threads (DMs and groups)
// ============================================================================
router.get('/threads', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all threads where user is a participant (via participants table)
    // Handles both DMs and groups
    const result = await q(`
      WITH my_threads AS (
        SELECT DISTINCT p.thread_id
        FROM chat_thread_participants p
        WHERE p.user_id = $1
      ),
      thread_data AS (
        SELECT 
          t.id,
          t.subject,
          t.related_type,
          t.related_id,
          t.last_message_at,
          t.created_at,
          COALESCE(t.is_group, FALSE) as is_group,
          t.name as group_name,
          t.created_by,
          t.participant1_id,
          t.participant2_id
        FROM chat_threads t
        JOIN my_threads mt ON t.id = mt.thread_id
      ),
      member_counts AS (
        SELECT thread_id, COUNT(*) as member_count
        FROM chat_thread_participants
        GROUP BY thread_id
      )
      SELECT 
        td.*,
        COALESCE(mc.member_count, 2) as member_count,
        -- For DMs: get other user info
        CASE WHEN td.is_group = FALSE THEN
          CASE 
            WHEN td.participant1_id = $1 THEN td.participant2_id
            ELSE td.participant1_id
          END
        END as other_user_id,
        CASE WHEN td.is_group = FALSE THEN
          CASE 
            WHEN td.participant1_id = $1 THEN COALESCE(e2.first_name || ' ' || e2.last_name, u2.username)
            ELSE COALESCE(e1.first_name || ' ' || e1.last_name, u1.username)
          END
        END as other_user_name,
        CASE WHEN td.is_group = FALSE THEN
          CASE 
            WHEN td.participant1_id = $1 THEN u2.username
            ELSE u1.username
          END
        END as other_username,
        CASE WHEN td.is_group = FALSE THEN
          CASE 
            WHEN td.participant1_id = $1 THEN COALESCE(r2.role_name, 'user')
            ELSE COALESCE(r1.role_name, 'user')
          END
        END as other_user_role
      FROM thread_data td
      LEFT JOIN member_counts mc ON td.id = mc.thread_id
      LEFT JOIN users u1 ON td.participant1_id = u1.id
      LEFT JOIN users u2 ON td.participant2_id = u2.id
      LEFT JOIN employees e1 ON u1.employee_id = e1.id
      LEFT JOIN employees e2 ON u2.employee_id = e2.id
      LEFT JOIN hr_roles r1 ON u1.role_id = r1.id
      LEFT JOIN hr_roles r2 ON u2.role_id = r2.id
      ORDER BY td.last_message_at DESC NULLS LAST
    `, [userId]);

    res.json({ threads: result.rows });
  } catch (error) {
    logger.error('Error fetching chat threads:', error);
    res.status(500).json({ error: 'Failed to fetch chat threads' });
  }
});

// ============================================================================
// POST /threads - Create new DM or group thread
// ============================================================================
router.post('/threads', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      participant_id,      // For DM: single participant
      participant_ids,     // For group: array of participants
      is_group,
      name,                // Group name (required for groups)
      subject, 
      related_type, 
      related_id 
    } = req.body;

    // ---- GROUP CHAT CREATION ----
    if (is_group) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }
      if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length < 1) {
        return res.status(400).json({ error: 'At least 1 other participant is required for a group' });
      }
      
      // Remove duplicates and self from participants
      const uniqueParticipants = [...new Set(participant_ids.map(Number))].filter(id => id !== userId);
      if (uniqueParticipants.length < 1) {
        return res.status(400).json({ error: 'At least 1 other participant is required' });
      }

      // Verify all participants exist
      const verifyResult = await q(`
        SELECT id FROM users WHERE id = ANY($1::int[])
      `, [uniqueParticipants]);
      
      if (verifyResult.rows.length !== uniqueParticipants.length) {
        return res.status(400).json({ error: 'One or more participants not found' });
      }

      // Create group thread
      const threadResult = await q(`
        INSERT INTO chat_threads (is_group, name, subject, related_type, related_id, created_by, last_message_at, created_at)
        VALUES (TRUE, $1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
      `, [name.trim(), subject || null, related_type || null, related_id || null, userId]);

      const thread = threadResult.rows[0];

      // Insert creator as owner
      await q(`
        INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
        VALUES ($1, $2, 'owner', NOW())
      `, [thread.id, userId]);

      // Insert other participants as members
      for (const pid of uniqueParticipants) {
        await q(`
          INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
          VALUES ($1, $2, 'member', NOW())
        `, [thread.id, pid]);
      }

      // Return thread with member count
      const responseThread = {
        ...thread,
        is_group: true,
        group_name: thread.name,
        member_count: uniqueParticipants.length + 1
      };

      res.json({ thread: responseThread });
      return;
    }

    // ---- DM CREATION (existing behavior, but without HR restriction) ----
    if (!participant_id) {
      return res.status(400).json({ error: 'participant_id is required for DM' });
    }

    const participantIdNum = Number(participant_id);

    // Verify participant exists
    const participantResult = await q(`
      SELECT u.id, COALESCE(r.role_name, 'user') as role
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [participantIdNum]);

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Prevent self-chat
    if (userId === participantIdNum) {
      return res.status(400).json({ error: 'Cannot create thread with yourself' });
    }

    // Ensure participant1_id < participant2_id for consistency
    const participant1_id = userId < participantIdNum ? userId : participantIdNum;
    const participant2_id = userId < participantIdNum ? participantIdNum : userId;

    // Check if DM thread already exists
    const existingResult = await q(`
      SELECT * FROM chat_threads
      WHERE participant1_id = $1 
        AND participant2_id = $2
        AND (is_group = FALSE OR is_group IS NULL)
        AND (related_type = $3 OR ($3 IS NULL AND related_type IS NULL))
        AND (related_id = $4 OR ($4 IS NULL AND related_id IS NULL))
    `, [participant1_id, participant2_id, related_type || null, related_id || null]);

    if (existingResult.rows.length > 0) {
      const existingThread = existingResult.rows[0];
      
      // Get other participant info
      const otherParticipantId = existingThread.participant1_id === userId 
        ? existingThread.participant2_id 
        : existingThread.participant1_id;

      const otherUserResult = await q(`
        SELECT 
          u.id,
          u.username,
          COALESCE(e.first_name || ' ' || e.last_name, u.username) as employee_name,
          COALESCE(r.role_name, 'user') as role
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        LEFT JOIN hr_roles r ON u.role_id = r.id
        WHERE u.id = $1
      `, [otherParticipantId]);

      const threadWithUser = {
        ...existingThread,
        is_group: false,
        other_user_id: otherParticipantId,
        other_user_name: otherUserResult.rows[0]?.employee_name,
        other_username: otherUserResult.rows[0]?.username,
        other_user_role: otherUserResult.rows[0]?.role
      };

      return res.json({ 
        thread: threadWithUser,
        message: 'Thread already exists'
      });
    }

    // Create new DM thread
    const result = await q(`
      INSERT INTO chat_threads (participant1_id, participant2_id, is_group, subject, related_type, related_id, created_by, last_message_at, created_at)
      VALUES ($1, $2, FALSE, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [participant1_id, participant2_id, subject || null, related_type || null, related_id || null, userId]);

    const thread = result.rows[0];

    // Insert both participants into participants table
    await q(`
      INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
      VALUES ($1, $2, 'owner', NOW()), ($1, $3, 'member', NOW())
      ON CONFLICT (thread_id, user_id) DO NOTHING
    `, [thread.id, userId, participantIdNum]);

    // Get other participant info
    const otherParticipantId = thread.participant1_id === userId 
      ? thread.participant2_id 
      : thread.participant1_id;

    const otherUserResult = await q(`
      SELECT 
        u.id,
        u.username,
        COALESCE(e.first_name || ' ' || e.last_name, u.username) as employee_name,
        COALESCE(r.role_name, 'user') as role
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [otherParticipantId]);

    const threadWithUser = {
      ...thread,
      is_group: false,
      other_user_id: otherParticipantId,
      other_user_name: otherUserResult.rows[0]?.employee_name,
      other_username: otherUserResult.rows[0]?.username,
      other_user_role: otherUserResult.rows[0]?.role
    };

    res.json({ thread: threadWithUser });
  } catch (error) {
    logger.error('Error creating chat thread:', error);
    res.status(500).json({ error: 'Failed to create chat thread' });
  }
});

// ============================================================================
// GET /threads/:id - Get thread details with participants
// ============================================================================
router.get('/threads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await verifyThreadAccess(id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const threadResult = await q(`
      SELECT 
        t.*,
        COALESCE(t.is_group, FALSE) as is_group
      FROM chat_threads t
      WHERE t.id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const thread = threadResult.rows[0];
    const participants = await getThreadParticipants(id);

    res.json({ 
      thread: {
        ...thread,
        participants,
        member_count: participants.length
      }
    });
  } catch (error) {
    logger.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ============================================================================
// PUT /threads/:id - Rename group thread
// ============================================================================
router.put('/threads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { name } = req.body;

    // Verify thread exists and is a group
    const threadResult = await q(`
      SELECT * FROM chat_threads WHERE id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const thread = threadResult.rows[0];
    if (!thread.is_group) {
      return res.status(400).json({ error: 'Cannot rename a DM thread' });
    }

    // Check permission
    const canManage = await canManageThread(id, userId, userRole);
    if (!canManage) {
      return res.status(403).json({ error: 'Only the group owner or HR can rename the group' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const result = await q(`
      UPDATE chat_threads
      SET name = $1
      WHERE id = $2
      RETURNING *
    `, [name.trim(), id]);

    // Notify all participants about the rename
    const participants = await getThreadParticipants(id);
    for (const p of participants) {
      sendToUser(p.user_id, 'chat:thread:update', {
        thread_id: parseInt(id),
        name: name.trim(),
        action: 'renamed'
      });
    }

    res.json({ thread: result.rows[0] });
  } catch (error) {
    logger.error('Error renaming thread:', error);
    res.status(500).json({ error: 'Failed to rename thread' });
  }
});

// ============================================================================
// GET /threads/:id/members - Get thread members
// ============================================================================
router.get('/threads/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const access = await verifyThreadAccess(id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const members = await getThreadParticipants(id);
    res.json({ members });
  } catch (error) {
    logger.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ============================================================================
// POST /threads/:id/members - Add members to group
// ============================================================================
router.post('/threads/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { user_ids } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    // Verify thread is a group
    const threadResult = await q(`
      SELECT * FROM chat_threads WHERE id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (!threadResult.rows[0].is_group) {
      return res.status(400).json({ error: 'Cannot add members to a DM thread' });
    }

    // Check permission
    const canManage = await canManageThread(id, userId, userRole);
    if (!canManage) {
      return res.status(403).json({ error: 'Only the group owner or HR can add members' });
    }

    // Verify all users exist
    const uniqueUserIds = [...new Set(user_ids.map(Number))];
    const verifyResult = await q(`
      SELECT id FROM users WHERE id = ANY($1::int[])
    `, [uniqueUserIds]);

    if (verifyResult.rows.length !== uniqueUserIds.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // Add members
    const added = [];
    for (const uid of uniqueUserIds) {
      try {
        await q(`
          INSERT INTO chat_thread_participants (thread_id, user_id, role, joined_at)
          VALUES ($1, $2, 'member', NOW())
          ON CONFLICT (thread_id, user_id) DO NOTHING
        `, [id, uid]);
        added.push(uid);
      } catch (e) {
        // Skip if already exists
      }
    }

    // Notify all participants
    const participants = await getThreadParticipants(id);
    for (const p of participants) {
      sendToUser(p.user_id, 'chat:thread:update', {
        thread_id: parseInt(id),
        action: 'members_added',
        added_user_ids: added,
        member_count: participants.length
      });
    }

    res.json({ 
      message: `Added ${added.length} member(s)`,
      added_user_ids: added,
      member_count: participants.length
    });
  } catch (error) {
    logger.error('Error adding members:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// ============================================================================
// DELETE /threads/:id/members/:userId - Remove member from group
// ============================================================================
router.delete('/threads/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const memberIdNum = parseInt(memberId);

    // Verify thread is a group
    const threadResult = await q(`
      SELECT * FROM chat_threads WHERE id = $1
    `, [id]);

    if (threadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (!threadResult.rows[0].is_group) {
      return res.status(400).json({ error: 'Cannot remove members from a DM thread' });
    }

    // Users can remove themselves; owners/HR can remove anyone
    const isSelf = memberIdNum === userId;
    if (!isSelf) {
      const canManage = await canManageThread(id, userId, userRole);
      if (!canManage) {
        return res.status(403).json({ error: 'Only the group owner or HR can remove other members' });
      }
    }

    // Check if target is owner - cannot remove owner
    const memberResult = await q(`
      SELECT role FROM chat_thread_participants
      WHERE thread_id = $1 AND user_id = $2
    `, [id, memberIdNum]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    if (memberResult.rows[0].role === 'owner' && !isSelf) {
      return res.status(400).json({ error: 'Cannot remove the group owner' });
    }

    // Remove member
    await q(`
      DELETE FROM chat_thread_participants
      WHERE thread_id = $1 AND user_id = $2
    `, [id, memberIdNum]);

    // Notify remaining participants
    const participants = await getThreadParticipants(id);
    for (const p of participants) {
      sendToUser(p.user_id, 'chat:thread:update', {
        thread_id: parseInt(id),
        action: 'member_removed',
        removed_user_id: memberIdNum,
        member_count: participants.length
      });
    }

    // Also notify removed user
    sendToUser(memberIdNum, 'chat:thread:update', {
      thread_id: parseInt(id),
      action: 'you_were_removed'
    });

    res.json({ 
      message: isSelf ? 'You left the group' : 'Member removed',
      member_count: participants.length
    });
  } catch (error) {
    logger.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ============================================================================
// POST /threads/:id/leave - Leave a group (convenience endpoint)
// ============================================================================
router.post('/threads/:id/leave', async (req, res) => {
  req.params.memberId = req.user.id.toString();
  // Forward to delete member endpoint
  return router.handle(req, res, () => {});
});

// ============================================================================
// GET /threads/:id/messages - Get messages in thread
// ============================================================================
router.get('/threads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const access = await verifyThreadAccess(id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const result = await q(`
      SELECT 
        m.*,
        COALESCE(e.first_name || ' ' || e.last_name, u.username) as sender_name,
        u.username as sender_username
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN employees e ON u.employee_id = e.id
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

// ============================================================================
// POST /threads/:id/messages - Send message in thread
// ============================================================================
router.post('/threads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const access = await verifyThreadAccess(id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

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
        COALESCE(e.first_name || ' ' || e.last_name, u.username) as full_name,
        u.username
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.id = $1
    `, [userId]);

    const messageWithSender = {
      ...newMessage,
      sender_name: senderResult.rows[0]?.full_name,
      sender_username: senderResult.rows[0]?.username,
      attachments: []
    };

    // Get all participants and send WebSocket messages
    const participants = await getThreadParticipants(id);
    const threadInfo = await q(`SELECT is_group, name FROM chat_threads WHERE id = $1`, [id]);
    const isGroup = threadInfo.rows[0]?.is_group;
    const threadName = threadInfo.rows[0]?.name;

    for (const p of participants) {
      // Send message event
      sendToUser(p.user_id, 'chat:message', {
        thread_id: parseInt(id),
        message: messageWithSender
      });

      // Send thread update event for sidebar refresh
      sendToUser(p.user_id, 'chat:thread:update', {
        thread_id: parseInt(id),
        last_message_at: new Date().toISOString(),
        is_group: isGroup,
        name: threadName
      });

      // Create notification for recipients (not sender)
      if (p.user_id !== userId) {
        const notificationTitle = isGroup 
          ? `New message in ${threadName}`
          : 'New message';
        const notificationBody = isGroup
          ? `${senderResult.rows[0]?.full_name}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`
          : `You have a new message from ${senderResult.rows[0]?.full_name}`;

        await createNotification(
          p.user_id,
          'chat_message',
          notificationTitle,
          notificationBody,
          parseInt(id),
          'chat_thread'
        );
      }
    }

    res.json({ message: messageWithSender });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================================================
// POST /messages/:id/attachments - Upload file attachment
// ============================================================================
router.post('/messages/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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

    const access = await verifyThreadAccess(message.thread_id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

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

    res.json({ attachment: result.rows[0] });
  } catch (error) {
    logger.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// ============================================================================
// GET /attachments/:id - Download attachment
// ============================================================================
router.get('/attachments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await q(`
      SELECT 
        a.id,
        a.message_id,
        a.file_name,
        a.file_data,
        a.file_size,
        a.mime_type,
        m.thread_id
      FROM chat_attachments a
      JOIN chat_messages m ON a.message_id = m.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    const access = await verifyThreadAccess(attachment.thread_id, userId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.setHeader('Content-Length', attachment.file_size);
    res.send(attachment.file_data);
  } catch (error) {
    logger.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// ============================================================================
// PUT /messages/:id - Edit message
// ============================================================================
router.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

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

// ============================================================================
// DELETE /messages/:id - Delete message
// ============================================================================
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

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
    if (!isHR(userRole) && message.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await q(`DELETE FROM chat_messages WHERE id = $1`, [id]);

    res.json({ message: 'Message deleted' });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
