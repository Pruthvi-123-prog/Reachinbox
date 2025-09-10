import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Dialog, 
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  ZoomOutMap as ZoomOutMapIcon,
  Close as CloseIcon,
  Email as EmailIcon
} from '@mui/icons-material';

import D3RingChart from './D3RingChart';
import EmailTrendChart from './EmailTrendChart';
import EmailAnalysis3D from './EmailAnalysis3D';

interface ChartDashboardProps {
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

const ChartDashboard: React.FC<ChartDashboardProps> = ({ emailData }) => {
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openTrendModal, setOpenTrendModal] = useState(false);
  const [openAnalysisModal, setOpenAnalysisModal] = useState(false);

  // Prepare data for charts
  const categoryData = {
    categories: emailData.categories.map(cat => cat.name),
    values: emailData.categories.map(cat => cat.count),
    colors: [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#FFB347', '#87CEEB', '#DDA0DD', '#F0E68C'
    ]
  };

  const trendData = {
    labels: emailData.trends.map(trend => trend.period),
    values: emailData.trends.map(trend => trend.count),
    seriesName: 'Emails'
  };

  const analysisData = {
    categories: emailData.categories.map(cat => cat.name),
    values: emailData.categories.map(cat => cat.count),
    colors: categoryData.colors
  };

  return (
    <Box sx={{ 
      width: '100%', 
      p: 3, 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
      minHeight: '100vh'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4, 
          p: 3, 
          background: 'linear-gradient(135deg, #1f1f1f 0%, #0f0f0f 100%)',
          color: 'primary.main',
          borderRadius: 2,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <EmailIcon sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Email Analytics Dashboard
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'primary.light' }}>
            Comprehensive analysis of your email patterns and trends
          </Typography>
          
          {/* Stats Chips */}
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Chip 
              label={`${emailData.totalEmails} Total Emails`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`${emailData.categories.length} Categories`} 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              label={`${emailData.recentEmails.length} Recent`} 
              color="success" 
              variant="outlined"
            />
          </Stack>
        </Box>

        <Grid container spacing={3}>
          {/* Category Distribution Ring Chart */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3,
                height: '600px',
                background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                borderRadius: 2,
                position: 'relative',
                color: 'primary.light',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 6px 8px rgba(0, 0, 0, 0.3)'
                }
              }}
              onClick={() => setOpenCategoryModal(true)}
            >
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <PieChartIcon />
                  <Typography variant="h6">Email Categories</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'primary.main' }}>
                  <ZoomOutMapIcon />
                </IconButton>
              </Box>
              <Box sx={{ width: '100%', height: 'calc(100% - 50px)' }}>
                <D3RingChart 
                  data={categoryData} 
                  isPreview={true} 
                  title="Categories"
                />
              </Box>
            </Paper>

            {/* Category Modal */}
            <Dialog 
              fullWidth 
              maxWidth="md" 
              open={openCategoryModal} 
              onClose={() => setOpenCategoryModal(false)}
              PaperProps={{
                sx: { 
                  background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                  borderRadius: 2,
                  height: '600px',
                  maxHeight: '600px',
                  boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
                }
              }}
            >
              <Box sx={{ 
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography variant="h5" sx={{ color: 'primary.main' }}>
                    Email Category Distribution
                  </Typography>
                  <IconButton 
                    onClick={() => setOpenCategoryModal(false)} 
                    sx={{ color: 'primary.main' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <D3RingChart 
                    data={categoryData} 
                    isPreview={false} 
                    title="Email Categories"
                  />
                </Box>
              </Box>
            </Dialog>
          </Grid>

          {/* Email Trends Chart */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3,
                height: '600px',
                background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                borderRadius: 2,
                position: 'relative',
                color: 'primary.light',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 6px 8px rgba(0, 0, 0, 0.3)'
                }
              }}
              onClick={() => setOpenTrendModal(true)}
            >
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <TimelineIcon />
                  <Typography variant="h6">Email Trends</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'primary.main' }}>
                  <ZoomOutMapIcon />
                </IconButton>
              </Box>
              <Box sx={{ width: '100%', height: 'calc(100% - 50px)' }}>
                <EmailTrendChart 
                  data={trendData} 
                  isPreview={true} 
                  title="Email Trends"
                  type="line"
                />
              </Box>
            </Paper>

            {/* Trend Modal */}
            <Dialog 
              fullWidth 
              maxWidth="md" 
              open={openTrendModal} 
              onClose={() => setOpenTrendModal(false)}
              PaperProps={{
                sx: { 
                  background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                  borderRadius: 2,
                  height: '600px',
                  maxHeight: '600px',
                  boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
                }
              }}
            >
              <Box sx={{ 
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography variant="h5" sx={{ color: 'primary.main' }}>
                    Email Trends Analysis
                  </Typography>
                  <IconButton 
                    onClick={() => setOpenTrendModal(false)} 
                    sx={{ color: 'primary.main' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <EmailTrendChart 
                    data={trendData} 
                    isPreview={false} 
                    title="Email Trends Over Time"
                    type="area"
                  />
                </Box>
              </Box>
            </Dialog>
          </Grid>

          {/* 3D Analysis Chart */}
          <Grid item xs={12}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3,
                height: '700px',
                background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                borderRadius: 2,
                position: 'relative',
                color: 'primary.light',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  transform: 'scale(1.01)',
                  boxShadow: '0 6px 8px rgba(0, 0, 0, 0.3)'
                }
              }}
              onClick={() => setOpenAnalysisModal(true)}
            >
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <AssessmentIcon />
                  <Typography variant="h6">3D Email Analysis</Typography>
                </Box>
                <IconButton size="small" sx={{ color: 'primary.main' }}>
                  <ZoomOutMapIcon />
                </IconButton>
              </Box>
              <Box sx={{ width: '100%', height: 'calc(100% - 50px)' }}>
                <EmailAnalysis3D 
                  data={analysisData} 
                  isPreview={true} 
                  title="Email Analysis"
                />
              </Box>
            </Paper>

            {/* Analysis Modal */}
            <Dialog 
              fullWidth 
              maxWidth="lg" 
              open={openAnalysisModal} 
              onClose={() => setOpenAnalysisModal(false)}
              PaperProps={{
                sx: { 
                  background: 'linear-gradient(135deg, #242424 0%, #1a1a1a 100%)',
                  borderRadius: 2,
                  height: '80vh',
                  maxHeight: '800px',
                  boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
                }
              }}
            >
              <Box sx={{ 
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography variant="h5" sx={{ color: 'primary.main' }}>
                    3D Email Analysis Dashboard
                  </Typography>
                  <IconButton 
                    onClick={() => setOpenAnalysisModal(false)} 
                    sx={{ color: 'primary.main' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <EmailAnalysis3D 
                    data={analysisData} 
                    isPreview={false} 
                    title="Comprehensive Email Analysis"
                  />
                </Box>
              </Box>
            </Dialog>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

export default ChartDashboard;
