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
  Stack,
  ListItemButton,
  Tabs,
  Tab,
  Grid
} from '@mui/material';
import {
  Email,
  Category,
  TrendingUp,
  Sync,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  Settings,
  Search,
  Analytics,
  Markunread,
  ThumbUp,
  EventAvailable,
  InfoOutlined,
  InboxOutlined,
  BarChart,
  PieChart as PieChartIcon,
  Timeline
} from '@mui/icons-material';
import { useEmailContext } from '../../context/EmailContext';
import api, { analyticsAPI } from '../../services/api';
import ChartDashboard from '../../components/charts/ChartDashboard';
import AdvancedAnalytics from '../../components/analytics/AdvancedAnalytics';

// StatCard component for displaying statistics
const StatCard = ({ title, value, icon, color = 'primary' }: { title: string; value: number; icon: React.ReactNode; color?: string }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={color}>
            {value.toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: '50%',
            bgcolor: `${color}20`,
            color: `${color}.main`,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

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

interface EmailSender {
  name?: string;
  address?: string;
}

interface RecentEmail {
  id: string;
  subject: string;
  sender: string | EmailSender;
  category?: string;
  date: string;
  isRead: boolean;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to get category color
const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'primary':
      return '#1976d2';
    case 'social':
      return '#9c27b0';
    case 'promotions':
      return '#2e7d32';
    case 'updates':
      return '#ed6c02';
    case 'forums':
      return '#0288d1';
    default:
      return '#757575';
  }
};

// Helper function to get display name for category
const getCategoryDisplayName = (category?: string) => {
  switch (category) {
    case 'primary':
      return 'Primary';
    case 'social':
      return 'Social';
    case 'promotions':
      return 'Promotions';
    case 'updates':
      return 'Updates';
    case 'forums':
      return 'Forums';
    default:
      return 'Uncategorized';
  }
};

const DashboardWithCharts: React.FC = () => {
  const { state } = useEmailContext();
  const { emails, loading, error } = state;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      setErrorStats(null);
      console.log('Fetching dashboard data...');

      // Fetch emails from the API
      const emailsResponse = await api.get('/api/emails');
      console.log('Emails response:', emailsResponse.data);

      // Process emails data
      const emails = Array.isArray(emailsResponse.data?.data?.emails) 
        ? emailsResponse.data.data.emails 
        : Array.isArray(emailsResponse.data?.emails) 
          ? emailsResponse.data.emails 
          : Array.isArray(emailsResponse.data) 
            ? emailsResponse.data 
            : [];

      const totalEmails = emails.length;
      const unreadEmails = emails.filter((email: any) => !email.isRead).length;

      // Calculate category breakdown
      const categoryCounts: { [key: string]: number } = {};
      emails.forEach((email: any) => {
        const category = email.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      const categoryBreakdown = Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalEmails) * 100)
      }));

      // Calculate interested and meeting emails (mock logic for now)
      const interestedEmails = emails.filter((email: any) => 
        email.subject?.toLowerCase().includes('interested') || 
        email.subject?.toLowerCase().includes('opportunity')
      ).length;

      const meetingBookedEmails = emails.filter((email: any) => 
        email.subject?.toLowerCase().includes('meeting') || 
        email.subject?.toLowerCase().includes('call')
      ).length;

      // Set stats
      setStats({
        totalEmails,
        unreadEmails,
        interestedEmails,
        meetingBookedEmails,
        categoryBreakdown,
        syncStatus: {
          isActive: true,
          lastSync: new Date().toISOString(),
          errors: 0
        }
      });

      // Set recent emails
      const recentEmailsData = emails
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((email: any) => ({
          id: email.id || email.uid,
          subject: email.subject || 'No Subject',
          sender: email.sender || email.from || 'Unknown Sender',
          category: email.category,
          date: email.date || email.receivedDate,
          isRead: email.isRead || false
        }));

      setRecentEmails(recentEmailsData);

      // Fetch sync status
      try {
        const syncStatusResponse = await api.get('/api/emails/sync/status');
        if (syncStatusResponse.data?.success) {
          const syncData = syncStatusResponse.data.data;
          setStats(prevStats => ({
            ...prevStats!,
            syncStatus: {
              isActive: syncData.isActive || false,
              lastSync: syncData.lastSync || new Date().toISOString(),
              errors: syncData.errors || 0
            }
          }));
        }
      } catch (syncError) {
        console.warn('Failed to fetch sync status:', syncError);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setErrorStats('Failed to load dashboard data. Please try again.');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      // Trigger sync on the backend
      await api.post('/api/emails/sync');
      // Wait a moment for sync to complete, then refetch data
      setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setErrorStats('Failed to refresh data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loadingStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (errorStats) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        }>
          {errorStats}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="info">No data available</Alert>
      </Box>
    );
  }

  // Prepare data for charts
  const chartData = {
    totalEmails: stats.totalEmails,
    categories: stats.categoryBreakdown.map(cat => ({
      name: getCategoryDisplayName(cat.category),
      count: cat.count,
      percentage: cat.percentage
    })),
    trends: [
      { period: 'Jan', count: Math.floor(stats.totalEmails * 0.8) },
      { period: 'Feb', count: Math.floor(stats.totalEmails * 0.9) },
      { period: 'Mar', count: Math.floor(stats.totalEmails * 0.7) },
      { period: 'Apr', count: Math.floor(stats.totalEmails * 0.6) },
      { period: 'May', count: Math.floor(stats.totalEmails * 0.8) },
      { period: 'Jun', count: stats.totalEmails }
    ],
    recentEmails: recentEmails.map(email => ({
      id: email.id,
      subject: email.subject,
      sender: typeof email.sender === 'string' ? email.sender : email.sender?.name || 'Unknown',
      date: email.date,
      category: email.category || 'uncategorized'
    }))
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
            onClick={handleManualSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Emails'}
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Analytics />} label="Overview" />
          <Tab icon={<BarChart />} label="Charts" />
          <Tab icon={<Timeline />} label="Analytics" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '120px' }}>
              <CardContent sx={{ height: '100%', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" height="100%">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Emails
                    </Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {stats.totalEmails.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '50%',
                      bgcolor: 'primary.20',
                      color: 'primary.main',
                    }}
                  >
                    <Email />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '120px' }}>
              <CardContent sx={{ height: '100%', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" height="100%">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Unread
                    </Typography>
                    <Typography variant="h4" component="div" color="warning.main">
                      {stats.unreadEmails.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '50%',
                      bgcolor: 'warning.20',
                      color: 'warning.main',
                    }}
                  >
                    <Markunread />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '120px' }}>
              <CardContent sx={{ height: '100%', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" height="100%">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Interested
                    </Typography>
                    <Typography variant="h4" component="div" color="success.main">
                      {stats.interestedEmails.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '50%',
                      bgcolor: 'success.20',
                      color: 'success.main',
                    }}
                  >
                    <ThumbUp />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '120px' }}>
              <CardContent sx={{ height: '100%', p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" height="100%">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Meetings
                    </Typography>
                    <Typography variant="h4" component="div" color="info.main">
                      {stats.meetingBookedEmails.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '50%',
                      bgcolor: 'info.20',
                      color: 'info.main',
                    }}
                  >
                    <EventAvailable />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Category Breakdown */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Email Categories
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <List>
                    {stats.categoryBreakdown.map((category, index) => (
                      <ListItem key={index} sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getCategoryColor(category.category), width: 40, height: 40 }}>
                            <Category />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight={600}>
                              {getCategoryDisplayName(category.category)}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {category.count} emails
                            </Typography>
                          }
                        />
                        <Chip
                          label={`${category.percentage}%`}
                          color="primary"
                          variant="outlined"
                          size="medium"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Emails */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
                  Recent Emails
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <List>
                    {recentEmails.map((email, index) => (
                      <ListItemButton key={index} sx={{ px: 0, mb: 1, borderRadius: 2, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: getCategoryColor(email.category), width: 40, height: 40 }}>
                            <Email />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" noWrap fontWeight={500}>
                              {email.subject}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {typeof email.sender === 'string' ? email.sender : email.sender?.name || 'Unknown'} • {formatDate(email.date)}
                            </Typography>
                          }
                        />
                        {!email.isRead && (
                          <Chip label="Unread" color="warning" size="small" />
                        )}
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Status */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Sync Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.syncStatus.isActive ? 'Active' : 'Inactive'} • Last sync: {formatDate(stats.syncStatus.lastSync)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    {stats.syncStatus.isActive ? (
                      <CheckCircle color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    {stats.syncStatus.errors > 0 && (
                      <Chip label={`${stats.syncStatus.errors} errors`} color="error" size="small" />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <ChartDashboard emailData={chartData} />
      )}

      {activeTab === 2 && (
        <AdvancedAnalytics emailData={chartData} />
      )}
    </Box>
  );
};

export default DashboardWithCharts;
