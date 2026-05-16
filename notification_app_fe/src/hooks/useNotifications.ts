import { useState, useEffect, useCallback } from 'react';
import { fetchNotifications, markAsRead as apiMarkAsRead, type Notification } from '../api';

export function useNotifications(typeFilter?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotifications({ limit: 50, type: typeFilter });
      setNotifications(data);
    } catch (err: any) {
      const msg = err.message || 'failed to load notifications';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    // update state immediately so UI feels instant
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await apiMarkAsRead(id);
  }, []);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => {
      if (prev.some((existing) => existing.id === n.id)) return prev;
      return [n, ...prev];
    });
    console.log(`new notification via websocket: ${n.id}`);
  }, []);

  return { notifications, loading, error, refresh: load, markRead, addNotification };
}
