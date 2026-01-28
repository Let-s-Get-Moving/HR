import { useEffect, useRef, useState, useCallback } from 'react';
import { sessionManager } from '../utils/sessionManager.js';
import { API } from '../config/api.js';

/**
 * WebSocket hook for real-time updates
 * Uses cookie-based auth - browser sends HttpOnly session cookie during handshake
 */
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef(new Map());

  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const user = sessionManager.getUser();
      if (!user) {
        console.warn('[WebSocket] No user session, skipping connection');
        return;
      }

      // Determine WebSocket URL - NO sessionId in query params
      // Browser will send HttpOnly session cookie during handshake
      const apiUrl = import.meta.env.VITE_API_URL || 'https://hr-api-wbzs.onrender.com';
      const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws`;

      console.log('[WebSocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to notifications
        ws.send(JSON.stringify({
          event: 'subscribe:notifications'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { event: eventType, data: eventData } = data;

          // Handle built-in events
          if (eventType === 'connected') {
            console.log('[WebSocket] Connection confirmed');
          } else if (eventType === 'subscribed') {
            console.log('[WebSocket] Subscribed to:', eventData.type);
          } else if (eventType === 'pong') {
            // Heartbeat response
          } else {
            // Call registered handlers
            const handlers = eventHandlersRef.current.get(eventType) || [];
            handlers.forEach(handler => {
              try {
                handler(eventData);
              } catch (error) {
                console.error(`[WebSocket] Error in handler for ${eventType}:`, error);
              }
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionError('WebSocket connection error');
        setConnected(false);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', event.code, event.reason);
        setConnected(false);

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(error.message);
      setConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const subscribe = useCallback((eventType, handler) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, []);
    }
    eventHandlersRef.current.get(eventType).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }, []);

  const send = useCallback((event, data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
      return true;
    }
    console.warn('[WebSocket] Cannot send message, not connected');
    return false;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Send periodic ping to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      send('ping');
    }, 30000); // Every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connected, send]);

  return {
    connected,
    connectionError,
    subscribe,
    send,
    disconnect,
    reconnect: connect
  };
}

/**
 * Hook for notification updates
 */
export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { subscribe, connected } = useWebSocket();

  useEffect(() => {
    // Subscribe to notification events for unread count
    const unsubscribeNew = subscribe('notification:new', () => {
      setUnreadCount(prev => prev + 1);
    });

    const unsubscribeRead = subscribe('notification:read', (data) => {
      if (data.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }
    });

    const unsubscribeDeleted = subscribe('notification:deleted', () => {
      // Count might decrease, but we'll refresh from API
    });

    const unsubscribeAllRead = subscribe('notifications:all-read', () => {
      setUnreadCount(0);
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
      unsubscribeDeleted();
      unsubscribeAllRead();
    };
  }, [subscribe]);

  // Load initial unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        // Use API helper (cookie-based auth, no x-session-id)
        const data = await API('/api/notifications/unread-count');
        setUnreadCount(data.count || 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };
    loadUnreadCount();
  }, []);

  return {
    unreadCount,
    connected,
    subscribe
  };
}

/**
 * Hook for chat message updates
 */
export function useChatMessages(threadId) {
  const [messages, setMessages] = useState([]);
  const { subscribe, send, connected } = useWebSocket();

  useEffect(() => {
    if (!threadId) return;

    // Subscribe to chat thread
    send('subscribe:chat:thread', { threadId });

    // Subscribe to new messages
    const unsubscribe = subscribe('chat:message', (data) => {
      if (data.thread_id === threadId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    return unsubscribe;
  }, [threadId, subscribe, send]);

  return {
    messages,
    setMessages,
    connected
  };
}
