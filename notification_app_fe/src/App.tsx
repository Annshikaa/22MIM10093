import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Badge,
  Box,
  CssBaseline,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';
import AllNotifications from './pages/AllNotifications';
import PriorityInbox from './pages/PriorityInbox';

type TabIndex = 0 | 1;

const App: React.FC = () => {
  const [tab, setTab] = useState<TabIndex>(0);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <>
      <CssBaseline />
      <AppBar position="sticky" elevation={1} color="default">
        <Toolbar>
          <NotificationsIcon sx={{ mr: 1.5 }} color="primary" />
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Campus Notifications
          </Typography>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon color="action" />
          </Badge>
        </Toolbar>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v as TabIndex)}
          sx={{ px: 2 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            label="All"
            icon={<NotificationsIcon fontSize="small" />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
          />
          <Tab
            label="Priority Inbox"
            icon={<StarIcon fontSize="small" />}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
          />
        </Tabs>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box role="tabpanel" hidden={tab !== 0}>
          {tab === 0 && <AllNotifications onUnreadCountChange={setUnreadCount} />}
        </Box>
        <Box role="tabpanel" hidden={tab !== 1}>
          {tab === 1 && <PriorityInbox />}
        </Box>
      </Container>
    </>
  );
};

export default App;
