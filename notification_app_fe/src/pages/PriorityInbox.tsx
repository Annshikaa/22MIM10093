import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NotificationCard from '../components/NotificationCard';
import { fetchPriorityInbox, markAsRead, type Notification } from '../api';
import { Log } from '../utils/logger';

const PriorityInbox: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Log('info', 'page', 'loading priority inbox');
      const data = await fetchPriorityInbox(15);
      setNotifications(data);
      await Log('debug', 'page', `priority inbox loaded: ${data.length} items`);
    } catch (err: any) {
      const msg = err.message || 'failed to load priority inbox';
      setError(msg);
      await Log('error', 'page', `priority inbox error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await markAsRead(id);
    await Log('info', 'page', `marked priority notification ${id} as read`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error} — make sure the backend is running on port 5000.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Priority Inbox
        </Typography>
        <Tooltip
          title="Score = type_weight / (1 + age_days). Placement=3, Result=2, Event=1. Higher score = show first."
          arrow
        >
          <IconButton size="small">
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        top 15 notifications ranked by urgency and recency — placements first, then results, then events
      </Typography>

      {notifications.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          nothing here yet
        </Typography>
      ) : (
        notifications.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            onRead={handleRead}
            showScore={true}
          />
        ))
      )}
    </Box>
  );
};

export default PriorityInbox;
