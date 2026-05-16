import React, { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import NotificationCard from '../components/NotificationCard';
import FilterBar from '../components/FilterBar';
import { useNotifications } from '../hooks/useNotifications';
import { useWebSocket } from '../hooks/useWebSocket';
import { Log } from '../utils/logger';

interface Props {
  onUnreadCountChange: (count: number) => void;
}

const AllNotifications: React.FC<Props> = ({ onUnreadCountChange }) => {
  const [typeFilter, setTypeFilter] = useState('');
  const { notifications, loading, error, refresh, markRead, addNotification } = useNotifications(typeFilter || undefined);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  React.useEffect(() => {
    onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useWebSocket(addNotification);

  const handleFilterChange = async (type: string) => {
    setTypeFilter(type);
    await Log('info', 'page', `filter changed to: ${type || 'all'}`);
  };

  const handleRefresh = async () => {
    await Log('info', 'page', 'manual refresh triggered');
    refresh();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          {unreadCount > 0 && (
            <Typography component="span" color="primary.main" sx={{ ml: 1, fontSize: '0.9rem' }}>
              ({unreadCount} unread)
            </Typography>
          )}
        </Typography>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      <FilterBar selected={typeFilter} onChange={handleFilterChange} />

      {notifications.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          no notifications found
        </Typography>
      ) : (
        notifications.map((n) => (
          <NotificationCard
            key={n.id}
            notification={n}
            onRead={markRead}
          />
        ))
      )}
    </Box>
  );
};

export default AllNotifications;
