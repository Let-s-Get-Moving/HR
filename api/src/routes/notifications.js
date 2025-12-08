import express from 'express';
import { requireAuth } from '../session.js';
import { applyScopeFilter } from '../middleware/rbac.js';
import { q } from '../db.js';
import { sendToUser } from '../websocket/server.js';
import logger from '../utils/logger.js';
import { createValidationMiddleware } from '../middleware/validation.js';
import { notificationSchema } from '../schemas/enhancedSchemas.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);
router.use(applyScopeFilter);

// Get user's notifications (filtered by role)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';
    const { type, is_read, limit = 50, offset = 0 } = req.query;

    let query = '';
    let params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'user') {
      // Users see only their notifications
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $${paramIndex}
      `;
      params.push(userId);
      paramIndex++;
    } else {
      // HR/Manager see all notifications + system alerts
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $${paramIndex} OR type = 'system_alert'
      `;
      params.push(userId);
      paramIndex++;
    }

    // Add filters
    const conditions = [];
    if (type) {
      conditions.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    if (is_read !== undefined) {
      conditions.push(`is_read = $${paramIndex}`);
      params.push(is_read === 'true');
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await q(query, params);

    res.json({
      notifications: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = $1 AND is_read = FALSE
      `;
      params = [userId];
    } else {
      query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE (user_id = $1 OR type = 'system_alert') AND is_read = FALSE
      `;
      params = [userId];
    }

    const result = await q(query, params);
    const count = parseInt(result.rows[0].count);

    res.json({ count });
  } catch (error) {
    logger.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    // Verify user owns this notification (or is HR/Manager)
    let query = '';
    let params = [];

    if (userRole === 'user') {
      query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      params = [id, userId];
    } else {
      // HR/Manager can mark any notification as read
      query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      params = [id];
    }

    const result = await q(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = result.rows[0];

    // Send WebSocket update
    sendToUser(notification.user_id, 'notification:read', {
      id: notification.id,
      is_read: notification.is_read
    });

    res.json({ notification });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark notification as unread
router.put('/:id/unread', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      query = `
        UPDATE notifications 
        SET is_read = FALSE, read_at = NULL
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      params = [id, userId];
    } else {
      query = `
        UPDATE notifications 
        SET is_read = FALSE, read_at = NULL
        WHERE id = $1
        RETURNING *
      `;
      params = [id];
    }

    const result = await q(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = result.rows[0];

    // Send WebSocket update
    sendToUser(notification.user_id, 'notification:read', {
      id: notification.id,
      is_read: notification.is_read
    });

    res.json({ notification });
  } catch (error) {
    logger.error('Error marking notification as unread:', error);
    res.status(500).json({ error: 'Failed to mark notification as unread' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE
        RETURNING id
      `;
      params = [userId];
    } else {
      query = `
        UPDATE notifications 
        SET is_read = TRUE, read_at = NOW()
        WHERE (user_id = $1 OR type = 'system_alert') AND is_read = FALSE
        RETURNING id
      `;
      params = [userId];
    }

    const result = await q(query, params);

    // Send WebSocket update
    sendToUser(userId, 'notifications:all-read', {
      count: result.rows.length
    });

    res.json({ 
      message: 'All notifications marked as read',
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.userRole || req.user.role || 'user';

    let query = '';
    let params = [];

    if (userRole === 'user') {
      query = `
        DELETE FROM notifications 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      params = [id, userId];
    } else {
      query = `
        DELETE FROM notifications 
        WHERE id = $1
        RETURNING id, user_id
      `;
      params = [id];
    }

    const result = await q(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const deleted = result.rows[0];
    const targetUserId = deleted.user_id || userId;

    // Send WebSocket update
    sendToUser(targetUserId, 'notification:deleted', {
      id: deleted.id
    });

    res.json({ message: 'Notification deleted', id: deleted.id });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;

