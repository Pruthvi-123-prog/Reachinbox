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
  ListItemIcon,
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
  Grid,
  Divider,
  Fade,
  Skeleton,
  Badge,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Email,
  Category,
  TrendingUp,
  TrendingDown,
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
  Timeline,
  Speed,
  Psychology,
  Assessment,
  Insights,
  ShowChart,
  FilterList,
  ViewModule,
  ViewList,
  MoreVert,
  Download,
  Share,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  Person,
  Close as CloseIcon
} from '@mui/icons-material';
import { useEmailContext } from '../../context/EmailContext';
import api, { analyticsAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

// Enhanced StatCard component
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend, 
  subtitle,
  loading = false 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  subtitle?: string;
  loading?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card
      sx={{
        height: '140px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
          borderColor: `${color}.main`
        }
      }}
    >
      <CardContent sx={{ height: '100%', p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" height="100%">
          <Box flexGrow={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width="60%" height={40} />
            ) : (
              <Typography variant="h4" component="div" color={`${color}.main`} fontWeight={700}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp 
                  sx={{ 
                    fontSize: 16, 
                    color: trend.direction === 'up' ? 'success.main' : 'error.main',
                    transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none'
                  }} 
                />
                <Typography 
                  variant="caption" 
                  color={trend.direction === 'up' ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5, fontWeight: 600 }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: 2,
              borderRadius: '50%',
              bgcolor: `${color}.20`,
              color: `${color}.main`,
              boxShadow: `0 0 20px ${color}40`
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
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

const DashboardRedesigned: React.FC = () => {
  const { state } = useEmailContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoadingStats(true);
      setErrorStats(null);

      const emailsResponse = await api.get('/api/emails');
      const emails = Array.isArray(emailsResponse.data?.data?.emails) 
        ? emailsResponse.data.data.emails 
        : Array.isArray(emailsResponse.data?.emails) 
          ? emailsResponse.data.emails 
          : Array.isArray(emailsResponse.data) 
            ? emailsResponse.data 
            : [];

      const totalEmails = emails.length;
      const unreadEmails = emails.filter((email: any) => !email.isRead).length;

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

      const interestedEmails = emails.filter((email: any) => 
        email.subject?.toLowerCase().includes('interested') || 
        email.subject?.toLowerCase().includes('opportunity')
      ).length;

      const meetingBookedEmails = emails.filter((email: any) => 
        email.subject?.toLowerCase().includes('meeting') || 
        email.subject?.toLowerCase().includes('call')
      ).length;

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
      await api.post('/api/emails/sync');
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

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'interested': '#4caf50',
      'meeting_booked': '#2196f3',
      'not_interested': '#f44336',
      'spam': '#ff9800',
      'out_of_office': '#9c27b0',
      'business': '#607d8b',
      'personal': '#795548',
      'support': '#009688',
      'promotional': '#ff5722',
      'newsletter': '#3f51b5',
      'uncategorized': '#757575'
    };
    
    const normalizedCategory = category?.replace('-', '_').toLowerCase();
    return colors[normalizedCategory || 'uncategorized'] || '#757575';
  };

  const getCategoryDisplayName = (category?: string) => {
    if (!category) return 'Uncategorized';
    
    return category
      .replace('_', ' ')
      .replace('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Chart configurations
  const categoryChartConfig = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 300
    },
    title: {
      text: 'Email Categories',
      style: { color: '#ffffff', fontSize: '16px' }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.1f}%',
          style: { color: '#ffffff' }
        }
      }
    },
    series: [{
      name: 'Categories',
      data: stats?.categoryBreakdown.map(cat => ({
        name: getCategoryDisplayName(cat.category),
        y: cat.percentage,
        color: getCategoryColor(cat.category)
      })) || []
    }],
    credits: { enabled: false },
    legend: { 
      itemStyle: { color: '#ffffff' },
      itemHoverStyle: { color: '#4CAF50' }
    }
  };

  const trendChartConfig = {
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      height: 300
    },
    title: {
      text: 'Email Trends',
      style: { color: '#ffffff', fontSize: '16px' }
    },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      labels: { style: { color: '#ffffff' } }
    },
    yAxis: {
      title: { text: 'Number of Emails', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } }
    },
    series: [{
      name: 'Emails',
      data: [20, 35, 28, 42, 38, 45],
      color: '#4CAF50',
      lineWidth: 3,
      marker: { radius: 6 }
    }],
    credits: { enabled: false },
    legend: { itemStyle: { color: '#ffffff' } }
  };

  if (loadingStats) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
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

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(90deg, #4CAF50, #81C784)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              Email Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive insights into your email patterns and productivity
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="1d">Last 24h</MenuItem>
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto Refresh"
            />
            
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
              onClick={handleManualSync}
              disabled={syncing}
              sx={{ minWidth: 140 }}
            >
              {syncing ? 'Syncing...' : 'Sync Emails'}
            </Button>
          </Box>
        </Box>
      </motion.div>

      {/* Enhanced Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                fontWeight: 600
              }
            }}
          >
            <Tab icon={<Analytics />} label="Overview" />
            <Tab icon={<BarChart />} label="Charts" />
            <Tab icon={<Timeline />} label="Analytics" />
          </Tabs>
        </Box>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Enhanced Stats Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Emails"
                  value={stats.totalEmails}
                  icon={<Email />}
                  color="primary"
                  trend={{ value: 12, direction: 'up' }}
                  subtitle="All time"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Unread"
                  value={stats.unreadEmails}
                  icon={<Markunread />}
                  color="warning"
                  trend={{ value: 5, direction: 'down' }}
                  subtitle="Requires attention"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Interested"
                  value={stats.interestedEmails}
                  icon={<ThumbUp />}
                  color="success"
                  trend={{ value: 8, direction: 'up' }}
                  subtitle="High priority"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Meetings"
                  value={stats.meetingBookedEmails}
                  icon={<EventAvailable />}
                  color="info"
                  trend={{ value: 3, direction: 'up' }}
                  subtitle="Scheduled"
                />
              </Grid>

              {/* Enhanced Category Breakdown */}
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card sx={{ 
                    height: '500px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          Email Categories
                        </Typography>
                        <IconButton size="small">
                          <MoreVert />
                        </IconButton>
                      </Box>
                      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <List>
                          {stats.categoryBreakdown.map((category, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              <ListItem sx={{ px: 0, py: 1.5 }}>
                                <ListItemAvatar>
                                  <Avatar sx={{ 
                                    bgcolor: getCategoryColor(category.category), 
                                    width: 40, 
                                    height: 40,
                                    boxShadow: `0 0 10px ${getCategoryColor(category.category)}40`
                                  }}>
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
                                <Box display="flex" alignItems="center" gap={1}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={category.percentage}
                                    sx={{
                                      width: 60,
                                      height: 6,
                                      borderRadius: 3,
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: getCategoryColor(category.category),
                                        borderRadius: 3
                                      }
                                    }}
                                  />
                                  <Chip
                                    label={`${category.percentage}%`}
                                    size="small"
                                    sx={{
                                      backgroundColor: `${getCategoryColor(category.category)}20`,
                                      color: getCategoryColor(category.category),
                                      border: `1px solid ${getCategoryColor(category.category)}40`,
                                      fontWeight: 600
                                    }}
                                  />
                                </Box>
                              </ListItem>
                            </motion.div>
                          ))}
                        </List>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Enhanced Recent Emails */}
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card sx={{ 
                    height: '500px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          Recent Emails
                        </Typography>
                        <IconButton size="small">
                          <MoreVert />
                        </IconButton>
                      </Box>
                      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                        <List>
                          {recentEmails.map((email, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              <ListItemButton 
                                sx={{ 
                                  px: 0, 
                                  mb: 1, 
                                  borderRadius: 2, 
                                  py: 1.5,
                                  '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 0.05)'
                                  }
                                }}
                              >
                                <ListItemAvatar>
                                  <Avatar sx={{ 
                                    bgcolor: getCategoryColor(email.category), 
                                    width: 40, 
                                    height: 40,
                                    boxShadow: `0 0 10px ${getCategoryColor(email.category)}40`
                                  }}>
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
                                <Box display="flex" alignItems="center" gap={1}>
                                  {!email.isRead && (
                                    <Chip 
                                      label="Unread" 
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                    />
                                  )}
                                  {email.category && (
                                    <Chip
                                      label={getCategoryDisplayName(email.category)}
                                      size="small"
                                      sx={{
                                        backgroundColor: `${getCategoryColor(email.category)}20`,
                                        color: getCategoryColor(email.category),
                                        border: `1px solid ${getCategoryColor(email.category)}40`
                                      }}
                                    />
                                  )}
                                </Box>
                              </ListItemButton>
                            </motion.div>
                          ))}
                        </List>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Enhanced Sync Status */}
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card sx={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Sync Status
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stats.syncStatus.isActive ? 'Active' : 'Inactive'} • Last sync: {formatDate(stats.syncStatus.lastSync)}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                          {stats.syncStatus.isActive ? (
                            <CheckCircle color="success" sx={{ fontSize: 32 }} />
                          ) : (
                            <ErrorIcon color="error" sx={{ fontSize: 32 }} />
                          )}
                          {stats.syncStatus.errors > 0 && (
                            <Chip 
                              label={`${stats.syncStatus.errors} errors`} 
                              color="error" 
                              size="small" 
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              {/* Category Chart - Full Width */}
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{
                    height: '400px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                      borderColor: 'primary.main'
                    }
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          Email Category Distribution
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Expand Chart">
                            <IconButton size="small" onClick={() => setExpandedChart('category')}>
                              <Fullscreen />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box sx={{ height: 'calc(100% - 60px)' }}>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={categoryChartConfig}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Trend Chart - Full Width */}
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card sx={{
                    height: '400px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                      borderColor: 'primary.main'
                    }
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          Email Trends Over Time
                        </Typography>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Expand Chart">
                            <IconButton size="small" onClick={() => setExpandedChart('trends')}>
                              <Fullscreen />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box sx={{ height: 'calc(100% - 60px)' }}>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={trendChartConfig}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              {/* Key Performance Metrics */}
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', fontWeight: 600, mb: 3 }}>
                    Advanced Performance Analytics
                  </Typography>
                </motion.div>
              </Grid>

              {/* Performance Metrics Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card sx={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Response Time
                          </Typography>
                          <Typography variant="h4" color="primary" fontWeight={700}>
                            2.4h
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Average
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <TrendingDown sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              15% faster
                            </Typography>
                          </Box>
                        </Box>
                        <Speed sx={{ fontSize: 40, color: 'primary.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card sx={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Engagement Rate
                          </Typography>
                          <Typography variant="h4" color="success.main" fontWeight={700}>
                            87%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            High
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              8% increase
                            </Typography>
                          </Box>
                        </Box>
                        <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card sx={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Productivity Score
                          </Typography>
                          <Typography variant="h4" color="warning.main" fontWeight={700}>
                            92
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Excellent
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              5% increase
                            </Typography>
                          </Box>
                        </Box>
                        <Assessment sx={{ fontSize: 40, color: 'warning.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card sx={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Email Velocity
                          </Typography>
                          <Typography variant="h4" color="info.main" fontWeight={700}>
                            45
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            emails/day
                          </Typography>
                          <Box display="flex" alignItems="center" mt={1}>
                            <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              12% increase
                            </Typography>
                          </Box>
                        </Box>
                        <Email sx={{ fontSize: 40, color: 'info.main' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Advanced Charts */}
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Card sx={{
                    height: '400px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                        Email Activity by Hour
                      </Typography>
                      <Box sx={{ height: 'calc(100% - 60px)' }}>
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={{
                            chart: {
                              type: 'column',
                              backgroundColor: 'transparent',
                              height: 300
                            },
                            title: { text: null },
                            xAxis: {
                              categories: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                              labels: { style: { color: '#ffffff' } }
                            },
                            yAxis: {
                              title: { text: 'Emails', style: { color: '#ffffff' } },
                              labels: { style: { color: '#ffffff' } }
                            },
                            series: [{
                              name: 'Emails',
                              data: [8, 25, 35, 28, 15, 5],
                              color: '#4CAF50'
                            }],
                            credits: { enabled: false },
                            legend: { itemStyle: { color: '#ffffff' } }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Card sx={{
                    height: '400px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                        Sender Analysis
                      </Typography>
                      <Box sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                        <List>
                          {[
                            { sender: 'Work Colleagues', count: 45, percentage: 40 },
                            { sender: 'Clients', count: 32, percentage: 28 },
                            { sender: 'Newsletters', count: 22, percentage: 20 },
                            { sender: 'Personal', count: 13, percentage: 12 }
                          ].map((item, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 1.5 }}>
                              <ListItemIcon>
                                <Person sx={{ color: 'primary.main' }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {item.sender}
                                  </Typography>
                                }
                                secondary={`${item.count} emails`}
                              />
                              <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress
                                  variant="determinate"
                                  value={item.percentage}
                                  sx={{
                                    width: 60,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: '#4CAF50',
                                      borderRadius: 3
                                    }
                                  }}
                                />
                                <Chip
                                  label={`${item.percentage}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                    color: '#4CAF50',
                                    border: '1px solid rgba(76, 175, 80, 0.4)',
                                    fontWeight: 600
                                  }}
                                />
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* AI Insights */}
              <Grid item xs={12}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Card sx={{
                    height: '300px',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2
                  }}>
                    <CardContent sx={{ height: '100%', p: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                        AI-Powered Insights & Recommendations
                      </Typography>
                      <Grid container spacing={2} sx={{ height: 'calc(100% - 60px)' }}>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ 
                            p: 2, 
                            height: '100%',
                            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                            border: '1px solid rgba(76, 175, 80, 0.3)',
                            borderRadius: 2
                          }}>
                            <Box display="flex" alignItems="center" mb={1}>
                              <Insights sx={{ color: 'success.main', mr: 1 }} />
                              <Typography variant="subtitle2" color="success.main" fontWeight={600}>
                                Peak Performance
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Your most productive hours are 9AM-12PM. Schedule important tasks during this time for maximum efficiency.
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ 
                            p: 2, 
                            height: '100%',
                            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: 2
                          }}>
                            <Box display="flex" alignItems="center" mb={1}>
                              <Timeline sx={{ color: 'warning.main', mr: 1 }} />
                              <Typography variant="subtitle2" color="warning.main" fontWeight={600}>
                                Optimization
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Consider batching similar emails to improve efficiency and reduce context switching by 25%.
                            </Typography>
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ 
                            p: 2, 
                            height: '100%',
                            background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 188, 212, 0.05) 100%)',
                            border: '1px solid rgba(0, 188, 212, 0.3)',
                            borderRadius: 2
                          }}>
                            <Box display="flex" alignItems="center" mb={1}>
                              <BarChart sx={{ color: 'info.main', mr: 1 }} />
                              <Typography variant="subtitle2" color="info.main" fontWeight={600}>
                                Trend Analysis
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Email volume has increased 15% this month. Consider implementing email templates for faster responses.
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Chart Expansion Dialogs */}
      <Dialog
        open={expandedChart === 'category'}
        onClose={() => setExpandedChart(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            borderRadius: 2,
            height: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: 'primary.main',
          fontWeight: 600
        }}>
          Email Category Distribution - Expanded View
          <IconButton onClick={() => setExpandedChart(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: 'calc(100% - 60px)' }}>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                ...categoryChartConfig,
                chart: {
                  ...categoryChartConfig.chart,
                  height: 500
                }
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={expandedChart === 'trends'}
        onClose={() => setExpandedChart(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
            borderRadius: 2,
            height: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          color: 'primary.main',
          fontWeight: 600
        }}>
          Email Trends Over Time - Expanded View
          <IconButton onClick={() => setExpandedChart(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: 'calc(100% - 60px)' }}>
            <HighchartsReact
              highcharts={Highcharts}
              options={{
                ...trendChartConfig,
                chart: {
                  ...trendChartConfig.chart,
                  height: 500
                }
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DashboardRedesigned;
