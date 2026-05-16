import { useEffect, useRef } from 'react';
import { Log } from '../utils/logger';
import type { Notification } from '../api';

const WS_URL = 'ws://localhost:5000';

export function useWebSocket(onNewNotification: (n: Notification) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  // use a ref so reconnect logic doesn't cause re-renders
  const onNewRef = useRef(onNewNotification);
  onNewRef.current = onNewNotification;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let alive = true;

    function connect() {
      if (!alive) return;

      Log('info', 'hook', 'connecting to websocket...');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        Log('info', 'hook', 'websocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'new_notification' && msg.data) {
            Log('info', 'hook', `got new notification via ws: ${msg.data.ID || msg.data.id}`);
            // backend sends the raw API format, normalize it
            const n: Notification = {
              id: msg.data.ID || msg.data.id,
              student_id: msg.data.student_id || '',
              type: msg.data.Type || msg.data.type,
              message: msg.data.Message || msg.data.message,
              is_read: false,
              created_at: msg.data.Timestamp || msg.data.created_at,
            };
            onNewRef.current(n);
          }
        } catch {
          // malformed message, ignore
        }
      };

      ws.onclose = () => {
        Log('warn', 'hook', 'websocket disconnected, retrying in 5s');
        if (alive) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        Log('error', 'hook', 'websocket error');
        ws.close();
      };
    }

    connect();

    return () => {
      alive = false;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []); // only run once on mount
}
