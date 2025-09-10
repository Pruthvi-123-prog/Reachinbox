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
  ListItemButton
} from '@mui/material';
import Grid from '@mui/material/Grid';
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
  InboxOutlined
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useEmailContext } from '../../context/EmailContext';
import api, { analyticsAPI } from '../../services/api';
import { styled } from '@mui/material';

// Create a styled Grid component
export const StyledGrid = Grid;

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
  if (!category) return 'Uncategorized';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const Dashboard: React.FC = () => {
  const { state, dispatch } = useEmailContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [analyticsData, setAnalytics] = useState<{
    emailVolume: any[];
    categoryDistribution: any[];
  }>({ emailVolume: [], categoryDistribution: [] });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching dashboard data...');

      // Fetch emails using the proper API service
      const emailsResult = await api.get('/api/emails?limit=1000&sortBy=date&sortOrder=desc');
      console.log('Emails response:', emailsResult.data);

      // Process emails data
      const emails = Array.isArray(emailsResult.data?.data?.emails) 
        ? emailsResult.data.data.emails 
        : Array.isArray(emailsResult.data?.emails) 
          ? emailsResult.data.emails 
          : Array.isArray(emailsResult.data) 
            ? emailsResult.data 
            : [];

      const totalEmails = emails.length;
      const unreadEmails = emails.filter((email: any) => !email.isRead).length;
      
      // Categorize emails
      const categoryCounts: Record<string, number> = {};
      emails.forEach((email: any) => {
        const category = email.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Set stats
      setStats({
        totalEmails,
        unreadEmails,
        interestedEmails: categoryCounts['interested'] || 0,
        meetingBookedEmails: categoryCounts['meeting'] || categoryCounts['meeting-booked'] || 0,
        categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({
          category,
          count,
          percentage: Math.round((count / (totalEmails || 1)) * 100) || 0
        })),
        syncStatus: {
          isActive: true, // Will be updated by sync status API
          lastSync: new Date().toISOString(),
          errors: 0
        }
      });

      // Set recent emails (sorted by date, most recent first)
      const recentEmails = [...emails]
        .sort((a: any, b: any) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10);
      
      console.log('Recent emails:', recentEmails);
      setRecentEmails(recentEmails);

      // Generate analytics data from emails
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Group emails by date for volume chart
      const emailVolume = emails
        .filter((email: any) => email.date && new Date(email.date) > thirtyDaysAgo)
        .reduce((acc: any, email: any) => {
          try {
            const date = new Date(email.date).toISOString().split('T')[0];
            if (!acc[date]) {
              acc[date] = 0;
            }
            acc[date]++;
          } catch (e) {
            console.warn('Invalid date format:', email.date);
          }
          return acc;
        }, {});

      // Format for chart
      const emailVolumeData = Object.entries(emailVolume).map(([date, count]) => ({
        date,
        count
      }));

      // Set analytics data
      setAnalytics({
        emailVolume: emailVolumeData,
        categoryDistribution: Object.entries(categoryCounts).map(([category, count]) => ({
          key: category,
          doc_count: count
        }))
      });

      // Fetch sync status
      try {
        const syncStatusResponse = await api.get('/api/emails/sync/status');
        if (syncStatusResponse.data?.success) {
          const syncData = syncStatusResponse.data.data;
          setStats(prevStats => ({
            ...prevStats!,
            syncStatus: {
              isActive: syncData.isActive || false,
              lastSync: syncData.lastSync ? Object.values(syncData.lastSync)[0] as string : new Date().toISOString(),
              errors: syncData.errors || 0
            }
          }));
        }
      } catch (syncErr) {
        console.warn('Failed to fetch sync status:', syncErr);
      }

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
      // Trigger sync on the backend
      await api.post('/api/emails/sync');
      // Wait a moment for sync to complete, then refetch data
      setTimeout(() => {
        fetchDashboardData();
      }, 2000);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError('Failed to refresh data. Please try again.');
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

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return '#757575';
    
    const colors: Record<string, string> = {
      'interested': '#4caf50',
      'meeting-booked': '#2196f3',
      'meeting_booked': '#2196f3',
      'not-interested': '#f44336',
      'not_interested': '#f44336',
      'spam': '#ff9800',
      'out-of-office': '#9c27b0',
      'out_of_office': '#9c27b0',
      'business': '#607d8b',
      'personal': '#795548',
      'support': '#009688',
      'promotional': '#ff5722',
      'newsletter': '#3f51b5',
      'uncategorized': '#757575'
    };
    
    // Normalize the category name
    const normalizedCategory = category.toLowerCase();
    return colors[normalizedCategory] || '#757575';
  };
  
  const getCategoryDisplayName = (category: string | undefined) => {
    if (!category) return 'Uncategorized';
    
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'meeting-booked': 'Meeting Booked',
      'not-interested': 'Not Interested',
      'out-of-office': 'Out of Office'
    };
    
    if (specialCases[category]) {
      return specialCases[category];
    }
    
    // Convert snake_case or kebab-case to Title Case
    return category
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="70vh"
        p={3}
      >
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" mt={3} color="text.secondary">
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
        p={3}
      >
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" color="error" gutterBottom>
          Something went wrong
        </Typography>
        <Typography color="text.secondary" align="center" mb={3}>
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchDashboardData}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualSync}
            disabled={syncing || (stats?.syncStatus?.isActive ?? false)}
            startIcon={
              syncing || (stats?.syncStatus?.isActive ?? false) ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Sync />
              )
            }
          >
            {syncing || (stats?.syncStatus?.isActive ?? false) ? 'Syncing...' : 'Sync Now'}
          </Button>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Emails
              </Typography>
              <Typography variant="h3" component="div">
                {stats?.totalEmails || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unread
              </Typography>
              <Typography variant="h3" component="div">
                {stats?.unreadEmails || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Interested
              </Typography>
              <Typography variant="h3" component="div">
                {stats?.interestedEmails || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meetings
              </Typography>
              <Typography variant="h3" component="div">
                {stats?.meetingBookedEmails || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Email Categories */}
        <Grid xs={12} md={6} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="div">
                  Email Categories
                </Typography>
                <Tooltip title="Categories are automatically assigned based on email content">
                  <InfoOutlined fontSize="small" color="action" />
                </Tooltip>
              </Box>
              <Box sx={{ height: 400 }}>
                {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="category"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="text.secondary">No category data available</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Emails */}
        <Grid xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="div">
                  Recent Emails
                </Typography>
                <Tooltip title="Most recent emails">
                  <Email fontSize="small" color="action" />
                </Tooltip>
              </Box>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {recentEmails && recentEmails.length > 0 ? (
                  recentEmails.map((email) => (
                    <ListItem
                      key={email.id}
                      component={ListItemButton}
                      onClick={() => {}}
                      sx={{
                        borderLeft: `4px solid ${getCategoryColor(email.category)}`,
                        mb: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText
                        primary={email.subject}
                        secondary={
                          <>
                            {typeof email.sender === 'string' ? email.sender : email.sender?.name || email.sender?.address || 'Unknown Sender'}
                            {' • '}
                            {formatDate(email.date)}
                          </>
                        }
                        primaryTypographyProps={{
                          sx: {
                            fontWeight: email.isRead ? 'normal' : 'bold',
                            color: 'text.primary',
                          },
                        }}
                        secondaryTypographyProps={{
                          color: 'text.secondary',
                        }}
                      />
                      {email.category && (
                        <Chip
                          label={getCategoryDisplayName(email.category)}
                          size="small"
                          sx={{
                            bgcolor: `${getCategoryColor(email.category)}20`,
                            color: getCategoryColor(email.category),
                            ml: 1,
                          }}
                        />
                      )}
                    </ListItem>
                  ))
                ) : (
                  <Box textAlign="center" py={4}>
                    <InboxOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No emails found</Typography>
                  </Box>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email Volume Over Time */}
      {analyticsData?.emailVolume.length > 0 && (
        <Box mt={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Email Volume (Last 30 Days)</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analyticsData.emailVolume}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any, name: any) => [value, getCategoryDisplayName(name)]}
                      contentStyle={{
                        backgroundColor: 'background.paper',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: '8px 12px'
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {analyticsData?.categoryDistribution.length > 0 && (
        <Box mt={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Distribution</Typography>
              <Grid container spacing={2}>
                {analyticsData.categoryDistribution.map((item: any) => (
                  <Grid xs={12} sm={6} md={4} key={item.key}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: getCategoryColor(item.key),
                          mr: 1,
                        }}
                      />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {getCategoryDisplayName(item.key)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.doc_count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.doc_count / (stats?.totalEmails || 1)) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getCategoryColor(item.key),
                        },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
      
      <Card sx={{ mt: 4 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between" 
            alignItems={{ xs: 'start', sm: 'center' }}
            gap={2}
            className="sync-status-container"
          >
            <Box display="flex" alignItems="center" className="sync-title">
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: '12px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(0, 119, 255, 0.15), rgba(0, 119, 255, 0.05))',
                  mr: 1.5
                }}
              >
                <Sync sx={{ color: '#0077ff' }} />
              </Box>
              <Typography 
                variant="h6"
                sx={{ fontWeight: 600 }}
              >
                Sync Status
              </Typography>
            </Box>
            
            <Box 
              display="flex" 
              alignItems="center" 
              gap={2}
              sx={{ 
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
              className="sync-details"
            >
              {stats?.syncStatus.isActive ? (
                <Chip
                  icon={<Sync sx={{ animation: 'spin 2s linear infinite' }} />}
                  label="Active"
                  size="small"
                  className="status-chip active"
                  sx={{
                    bgcolor: 'rgba(46, 125, 50, 0.2)',
                    color: '#69f0ae',
                    border: '1px solid rgba(46, 125, 50, 0.5)',
                    fontWeight: 'bold'
                  }}
                />
              ) : (
                <Chip
                  icon={<Warning />}
                  label="Inactive"
                  size="small"
                  className="status-chip inactive"
                  sx={{
                    bgcolor: 'rgba(255, 152, 0, 0.2)',
                    color: '#ffab40',
                    border: '1px solid rgba(255, 152, 0, 0.5)',
                    fontWeight: 'bold'
                  }}
                />
              )}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
                className="last-sync"
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: stats?.syncStatus.isActive ? '#69f0ae' : '#ffab40',
                    boxShadow: `0 0 10px ${stats?.syncStatus.isActive ? 'rgba(105, 240, 174, 0.5)' : 'rgba(255, 171, 64, 0.5)'}`
                  }} 
                />
                Last sync: {formatDate(stats?.syncStatus.lastSync || new Date().toISOString())}
              </Typography>
              {stats?.syncStatus?.errors && stats.syncStatus.errors > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${stats.syncStatus.errors} errors`}
                  size="small"
                  className="status-chip error"
                  sx={{
                    bgcolor: 'rgba(211, 47, 47, 0.2)',
                    color: '#ff5252',
                    border: '1px solid rgba(211, 47, 47, 0.5)',
                    fontWeight: 'bold'
                  }}
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
