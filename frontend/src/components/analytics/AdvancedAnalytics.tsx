import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Email,
  Schedule,
  Person,
  Category,
  Assessment,
  Insights,
  Speed,
  Psychology,
  Timeline,
  BarChart,
  PieChart,
  ShowChart
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface AdvancedAnalyticsProps {
  emailData: {
    totalEmails: number;
    categories: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    trends: Array<{
      period: string;
      count: number;
    }>;
    recentEmails: Array<{
      id: string;
      subject: string;
      sender: string;
      date: string;
      category: string;
    }>;
  };
}

interface AnalyticsMetrics {
  responseTime: number;
  engagementRate: number;
  productivityScore: number;
  emailVelocity: number;
  categoryDistribution: any[];
  timeAnalysis: any[];
  senderAnalysis: any[];
  sentimentAnalysis: any[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ emailData }) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalytics = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock analytics data based on email data
      const mockMetrics: AnalyticsMetrics = {
        responseTime: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
        engagementRate: Math.floor(Math.random() * 40) + 60, // 60-100%
        productivityScore: Math.floor(Math.random() * 30) + 70, // 70-100
        emailVelocity: Math.floor(Math.random() * 50) + 20, // 20-70 emails/day
        categoryDistribution: emailData.categories.map(cat => ({
          name: cat.name,
          y: cat.percentage,
          count: cat.count
        })),
        timeAnalysis: [
          { hour: '6AM', emails: Math.floor(Math.random() * 10) },
          { hour: '9AM', emails: Math.floor(Math.random() * 20) + 10 },
          { hour: '12PM', emails: Math.floor(Math.random() * 25) + 15 },
          { hour: '3PM', emails: Math.floor(Math.random() * 20) + 10 },
          { hour: '6PM', emails: Math.floor(Math.random() * 15) + 5 },
          { hour: '9PM', emails: Math.floor(Math.random() * 8) }
        ],
        senderAnalysis: [
          { sender: 'Work Colleagues', count: Math.floor(emailData.totalEmails * 0.4) },
          { sender: 'Clients', count: Math.floor(emailData.totalEmails * 0.3) },
          { sender: 'Newsletters', count: Math.floor(emailData.totalEmails * 0.2) },
          { sender: 'Personal', count: Math.floor(emailData.totalEmails * 0.1) }
        ],
        sentimentAnalysis: [
          { sentiment: 'Positive', count: Math.floor(emailData.totalEmails * 0.6) },
          { sentiment: 'Neutral', count: Math.floor(emailData.totalEmails * 0.3) },
          { sentiment: 'Negative', count: Math.floor(emailData.totalEmails * 0.1) }
        ]
      };
      
      setMetrics(mockMetrics);
      setLoading(false);
    };

    loadAnalytics();
  }, [emailData]);

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Average';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="error">Failed to load analytics data</Alert>
    );
  }

  const timeAnalysisChart = {
    chart: {
      type: 'column',
      backgroundColor: 'transparent',
      height: 300
    },
    title: {
      text: 'Email Activity by Hour',
      style: { color: '#ffffff' }
    },
    xAxis: {
      categories: metrics.timeAnalysis.map(item => item.hour),
      labels: { style: { color: '#ffffff' } }
    },
    yAxis: {
      title: { text: 'Number of Emails', style: { color: '#ffffff' } },
      labels: { style: { color: '#ffffff' } }
    },
    series: [{
      name: 'Emails',
      data: metrics.timeAnalysis.map(item => item.emails),
      color: '#4CAF50'
    }],
    credits: { enabled: false },
    legend: { itemStyle: { color: '#ffffff' } }
  };

  const categoryChart = {
    chart: {
      type: 'pie',
      backgroundColor: 'transparent',
      height: 300
    },
    title: {
      text: 'Email Categories Distribution',
      style: { color: '#ffffff' }
    },
    series: [{
      name: 'Categories',
      data: metrics.categoryDistribution,
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    }],
    credits: { enabled: false },
    legend: { itemStyle: { color: '#ffffff' } }
  };

  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
            Advanced Analytics
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Deep insights into your email patterns and productivity
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Key Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '150px' }}>
                  <CardContent sx={{ height: '100%', p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Response Time
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {metrics.responseTime}m
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Average
                        </Typography>
                      </Box>
                      <Speed color="primary" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '150px' }}>
                  <CardContent sx={{ height: '100%', p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Engagement Rate
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {metrics.engagementRate}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          High
                        </Typography>
                      </Box>
                      <TrendingUp color="success" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '150px' }}>
                  <CardContent sx={{ height: '100%', p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Productivity Score
                        </Typography>
                        <Typography variant="h4" color={getPerformanceColor(metrics.productivityScore)}>
                          {metrics.productivityScore}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getPerformanceLabel(metrics.productivityScore)}
                        </Typography>
                      </Box>
                      <Assessment color={getPerformanceColor(metrics.productivityScore)} sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '150px' }}>
                  <CardContent sx={{ height: '100%', p: 2 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Email Velocity
                        </Typography>
                        <Typography variant="h4" color="info.main">
                          {metrics.emailVelocity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          emails/day
                        </Typography>
                      </Box>
                      <Email color="info" sx={{ fontSize: 40 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Email Activity by Hour
                </Typography>
                <Box sx={{ height: 'calc(100% - 60px)' }}>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={timeAnalysisChart}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Category Distribution
                </Typography>
                <Box sx={{ height: 'calc(100% - 60px)' }}>
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={categoryChart}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sender Analysis */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Sender Analysis
                </Typography>
                <Box sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                  <List>
                    {metrics.senderAnalysis.map((sender, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemIcon>
                            <Person color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" fontWeight={600}>
                                {sender.sender}
                              </Typography>
                            }
                            secondary={`${sender.count} emails`}
                          />
                          <Chip
                            label={`${Math.round((sender.count / emailData.totalEmails) * 100)}%`}
                            color="primary"
                            variant="outlined"
                            size="medium"
                          />
                        </ListItem>
                        {index < metrics.senderAnalysis.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sentiment Analysis */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '500px' }}>
              <CardContent sx={{ height: '100%', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  Sentiment Analysis
                </Typography>
                <Box sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
                  <List>
                    {metrics.sentimentAnalysis.map((sentiment, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemIcon>
                            <Psychology color={
                              sentiment.sentiment === 'Positive' ? 'success' :
                              sentiment.sentiment === 'Neutral' ? 'warning' : 'error'
                            } />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" fontWeight={600}>
                                {sentiment.sentiment}
                              </Typography>
                            }
                            secondary={`${sentiment.count} emails`}
                          />
                          <Box sx={{ width: '100px', mr: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(sentiment.count / emailData.totalEmails) * 100}
                              color={
                                sentiment.sentiment === 'Positive' ? 'success' :
                                sentiment.sentiment === 'Neutral' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round((sentiment.count / emailData.totalEmails) * 100)}%
                          </Typography>
                        </ListItem>
                        {index < metrics.sentimentAnalysis.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Insights and Recommendations */}
          <Grid item xs={12}>
            <Card sx={{ height: '300px' }}>
              <CardContent sx={{ height: '100%', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                  AI-Powered Insights & Recommendations
                </Typography>
                <Box sx={{ height: 'calc(100% - 60px)' }}>
                  <Grid container spacing={2} sx={{ height: '100%' }}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                        border: '1px solid',
                        borderColor: 'success.200',
                        borderRadius: 2
                      }}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Insights color="success" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2" color="success.main" fontWeight={600}>
                            Peak Performance
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Your most productive hours are 9AM-12PM. Schedule important tasks during this time.
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
                        border: '1px solid',
                        borderColor: 'warning.200',
                        borderRadius: 2
                      }}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Timeline color="warning" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2" color="warning.main" fontWeight={600}>
                            Optimization Opportunity
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Consider batching similar emails to improve efficiency and reduce context switching.
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 188, 212, 0.05) 100%)',
                        border: '1px solid',
                        borderColor: 'info.200',
                        borderRadius: 2
                      }}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <BarChart color="info" sx={{ mr: 1 }} />
                          <Typography variant="subtitle2" color="info.main" fontWeight={600}>
                            Trend Analysis
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Email volume has increased 15% this month. Consider implementing email templates.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

export default AdvancedAnalytics;
