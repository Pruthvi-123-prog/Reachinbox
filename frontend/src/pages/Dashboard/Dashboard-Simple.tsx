import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Email,
  Category,
  TrendingUp,
  Sync,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Settings,
  Search,
  Analytics
} from '@mui/icons-material';
import { useEmailContext } from '../../context/EmailContext';
import api from '../../services/api';

interface DashboardStats {
  totalEmails: number;
  unreadEmails: number;
  interestedEmails: number;
  meetingBookedEmails: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  syncStatus: {
    isActive: boolean;
    lastSync: string;
    errors: number;
  };
}

interface RecentEmail {
  id: string;
  subject: string;
  sender: string;
  category?: string;
  date: string;
  isRead: boolean;
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useEmailContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats and recent emails in parallel
      const [statsResponse, emailsResponse, syncStatusResponse] = await Promise.all([
        api.get('/api/emails/stats/overview'),
        api.get('/api/emails?limit=10&sort=date&order=desc'),
        api.get('/api/emails/sync/status')
      ]);

      // Process stats
      const statsData = statsResponse.data;
      setStats({
        totalEmails: statsData.total || 0,
        unreadEmails: statsData.unread || 0,
        interestedEmails: statsData.categories?.interested || 0,
        meetingBookedEmails: statsData.categories?.['meeting-booked'] || 0,
        categoryBreakdown: Object.entries(statsData.categories || {}).map(([category, count]) => ({
          category,
          count: count as number,
          percentage: Math.round(((count as number) / (statsData.total || 1)) * 100)
        })),
        syncStatus: {
          isActive: syncStatusResponse.data.isActive || false,
          lastSync: syncStatusResponse.data.lastSync || new Date().toISOString(),
          errors: syncStatusResponse.data.errors || 0
        }
      });

      // Process recent emails
      setRecentEmails(emailsResponse.data.emails || []);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      await api.post('/api/emails/sync');
      // Refresh data after sync
      setTimeout(fetchDashboardData, 2000);
    } catch (err) {
      console.error('Failed to trigger sync:', err);
      setError('Failed to start email sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'interested': '#4caf50',
      'meeting-booked': '#2196f3',
      'not-interested': '#f44336',
      'spam': '#ff9800',
      'out-of-office': '#9c27b0',
      'business': '#607d8b',
      'personal': '#795548',
      'support': '#009688',
      'promotional': '#ff5722',
      'newsletter': '#3f51b5'
    };
    return colors[category] || '#757575';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleManualSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Email color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="h6">
                Total Emails
              </Typography>
            </Box>
            <Typography variant="h4" component="div">
              {stats?.totalEmails || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <TrendingUp color="warning" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="h6">
                Unread
              </Typography>
            </Box>
            <Typography variant="h4" component="div">
              {stats?.unreadEmails || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="h6">
                Interested
              </Typography>
            </Box>
            <Typography variant="h4" component="div" color="success.main">
              {stats?.interestedEmails || 0}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Category color="info" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="h6">
                Meetings
              </Typography>
            </Box>
            <Typography variant="h4" component="div" color="info.main">
              {stats?.meetingBookedEmails || 0}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Category Breakdown and Recent Emails */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        {/* Category Breakdown */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Email Categories
            </Typography>
            <Box>
              {stats?.categoryBreakdown.map(({ category, count, percentage }) => (
                <Box key={category} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {category.replace('-', ' ')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {count} ({percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getCategoryColor(category)
                      }
                    }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Emails
            </Typography>
            <List>
              {recentEmails.map((email) => (
                <ListItem
                  key={email.id}
                  sx={{
                    borderLeft: email.isRead ? 'none' : '4px solid #2196f3',
                    backgroundColor: email.isRead ? 'transparent' : 'rgba(33, 150, 243, 0.05)'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getCategoryColor(email.category || 'business') }}>
                      {email.sender.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body1" noWrap sx={{ maxWidth: 200 }}>
                          {email.subject}
                        </Typography>
                        {email.category && (
                          <Chip
                            label={email.category}
                            size="small"
                            sx={{
                              backgroundColor: getCategoryColor(email.category),
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          From: {email.sender}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(email.date)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Stack>

      {/* Sync Status */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Sync Status
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {stats?.syncStatus.isActive ? (
                <Chip
                  icon={<Sync />}
                  label="Active"
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  icon={<Warning />}
                  label="Inactive"
                  color="warning"
                  size="small"
                />
              )}
              <Typography variant="body2" color="textSecondary">
                Last sync: {formatDate(stats?.syncStatus.lastSync || new Date().toISOString())}
              </Typography>
              {stats?.syncStatus?.errors && stats.syncStatus.errors > 0 && (
                <Chip
                  icon={<Error />}
                  label={`${stats.syncStatus.errors} errors`}
                  color="error"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
