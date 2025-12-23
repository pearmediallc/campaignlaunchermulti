/**
 * NotificationsPanel.tsx
 *
 * Displays intelligence notifications with priority-based styling.
 * Supports marking as read, action buttons, and filtering.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  CheckCircle,
  Warning,
  Error,
  Info,
  MarkEmailRead,
  MoreVert,
  Delete,
  Refresh,
  FilterList,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { intelligenceApi, Notification } from '../../services/intelligenceApi';

interface NotificationsPanelProps {
  compact?: boolean;
  onRefresh?: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ compact = false, onRefresh }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; notif: Notification } | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notifResponse, unreadResponse] = await Promise.all([
        intelligenceApi.getNotifications({ include_read: true, limit: compact ? 5 : 50 }),
        intelligenceApi.getUnreadNotifications()
      ]);

      let notifs = notifResponse.notifications || [];

      if (filterType) {
        notifs = notifs.filter((n: Notification) => n.type === filterType);
      }

      setNotifications(notifs);
      setUnreadCount(unreadResponse.count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await intelligenceApi.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await intelligenceApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleAction = async (notification: Notification, action: string) => {
    try {
      await intelligenceApi.handleNotificationAction(notification.id, action);
      toast.success('Action completed');
      fetchNotifications();
      onRefresh?.();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Error color="error" />;
      case 'high':
        return <Warning color="warning" />;
      case 'medium':
        return <NotificationsActive color="primary" />;
      default:
        return <Info color="action" />;
    }
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'primary' | 'default' => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && notifications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
          <Typography variant="h6">
            Notifications
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Filter">
            <IconButton size="small" onClick={(e) => setFilterAnchor(e.currentTarget)}>
              <FilterList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchNotifications}>
              <Refresh />
            </IconButton>
          </Tooltip>
          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={handleMarkAllRead}>
                <MarkEmailRead />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem
          onClick={() => { setFilterType(null); setFilterAnchor(null); }}
          selected={filterType === null}
        >
          All Types
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setFilterType('action_required'); setFilterAnchor(null); }}
          selected={filterType === 'action_required'}
        >
          Action Required
        </MenuItem>
        <MenuItem
          onClick={() => { setFilterType('performance_alert'); setFilterAnchor(null); }}
          selected={filterType === 'performance_alert'}
        >
          Performance Alerts
        </MenuItem>
        <MenuItem
          onClick={() => { setFilterType('insight'); setFilterAnchor(null); }}
          selected={filterType === 'insight'}
        >
          Insights
        </MenuItem>
        <MenuItem
          onClick={() => { setFilterType('action_executed'); setFilterAnchor(null); }}
          selected={filterType === 'action_executed'}
        >
          Executed Actions
        </MenuItem>
      </Menu>

      {/* Notifications List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Box p={4} textAlign="center">
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography color="text.secondary">
              {filterType ? 'No notifications match the filter' : 'All caught up!'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <ListItemIcon>
                    {getPriorityIcon(notification.priority)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: notification.is_read ? 400 : 600 }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={getTypeLabel(notification.type)}
                          size="small"
                          variant="outlined"
                          color={getPriorityColor(notification.priority)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatTime(notification.created_at)}
                        </Typography>

                        {/* Action Buttons */}
                        {notification.action_buttons && notification.action_buttons.length > 0 && (
                          <Box display="flex" gap={1} mt={1}>
                            {notification.action_buttons.map((btn, idx) => (
                              <Button
                                key={idx}
                                size="small"
                                variant={btn.style === 'primary' ? 'contained' : 'outlined'}
                                color={btn.style === 'danger' ? 'error' : 'primary'}
                                onClick={() => handleAction(notification, btn.action)}
                              >
                                {btn.label}
                              </Button>
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchor({ el: e.currentTarget, notif: notification })}
                    >
                      <MoreVert />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Item Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuAnchor && !menuAnchor.notif.is_read && (
          <MenuItem onClick={() => {
            handleMarkRead(menuAnchor.notif.id);
            setMenuAnchor(null);
          }}>
            <ListItemIcon><MarkEmailRead fontSize="small" /></ListItemIcon>
            Mark as read
          </MenuItem>
        )}
      </Menu>

      {/* View All Link for Compact Mode */}
      {compact && notifications.length > 0 && (
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Button size="small">View All Notifications</Button>
        </Box>
      )}
    </Paper>
  );
};

export default NotificationsPanel;
