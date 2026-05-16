import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Typography,
  Box,
} from '@mui/material';
import type { Notification } from '../api';

const TYPE_COLORS: Record<string, 'success' | 'warning' | 'info'> = {
  Placement: 'success',
  Result: 'warning',
  Event: 'info',
};

interface Props {
  notification: Notification;
  onRead: (id: string) => void;
  showScore?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const NotificationCard: React.FC<Props> = ({ notification, onRead, showScore }) => {
  const color = TYPE_COLORS[notification.type] || 'default';
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderLeft: isUnread ? '4px solid' : '4px solid transparent',
        borderLeftColor: isUnread ? 'primary.main' : 'transparent',
        opacity: isUnread ? 1 : 0.75,
        transition: 'opacity 0.2s',
      }}
    >
      <CardActionArea onClick={handleClick} disabled={!isUnread}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={notification.type}
                color={color}
                size="small"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
              {isUnread && (
                <Chip label="new" size="small" variant="outlined" color="primary" sx={{ fontSize: '0.65rem' }} />
              )}
              {showScore && notification.priority_score !== undefined && (
                <Chip
                  label={`score ${notification.priority_score.toFixed(3)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem' }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
              {timeAgo(notification.created_at)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {notification.message}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default NotificationCard;
