import { q } from '../db.js';
import { sendToUser } from '../websocket/server.js';
import logger from './logger.js';

/**
 * Create a notification and send via WebSocket
 */
export async function createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
  try {
    // Insert notification into database
    const result = await q(`
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
      RETURNING *
    `, [userId, type, title, message, relatedId, relatedType]);

    const notification = result.rows[0];

    // Send via WebSocket if user is connected
    sendToUser(userId, 'notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.related_id,
      related_type: notification.related_type,
      is_read: notification.is_read,
      created_at: notification.created_at
    });

    logger.info(`Notification created for user ${userId}: ${type} - ${title}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users (e.g., payroll processed)
 */
export async function createBulkNotifications(userIds, type, title, message, relatedId = null, relatedType = null) {
  try {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    // Insert all notifications
    const values = userIds.map((_, index) => {
      const base = index * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, FALSE, NOW())`;
    }).join(', ');

    const params = [];
    userIds.forEach(userId => {
      params.push(userId, type, title, message, relatedId, relatedType);
    });

    const result = await q(`
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type, is_read, created_at)
      VALUES ${values}
      RETURNING *
    `, params);

    const notifications = result.rows;

    // Send via WebSocket to all connected users
    notifications.forEach(notification => {
      sendToUser(notification.user_id, 'notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        related_id: notification.related_id,
        related_type: notification.related_type,
        is_read: notification.is_read,
        created_at: notification.created_at
      });
    });

    logger.info(`Created ${notifications.length} bulk notifications: ${type} - ${title}`);
    return notifications;
  } catch (error) {
    logger.error('Error creating bulk notifications:', error);
    throw error;
  }
}

