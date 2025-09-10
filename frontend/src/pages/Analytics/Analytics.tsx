import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const Analytics: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        sx={{ 
          p: 3, 
          borderRadius: 2,
          backgroundColor: 'rgba(10, 10, 10, 0.6)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        className="glass-container"
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #2196F3, #64B5F6)',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          Email Analytics
        </Typography>
        <Box mt={4}>
          <Typography variant="body1">
            Analytics dashboard is under construction. Check back soon for email metrics and insights.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Analytics;
