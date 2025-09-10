import React, { useState } from 'react';
import { Box, Typography, Container, Stack } from '@mui/material';
import '../styles/animations.css';
import Button from '../components/DiganthadeepaUI/Button';
import GlassCard from '../components/DiganthadeepaUI/GlassCard';

/**
 * Example component demonstrating how to use the Diganthadeepa design system in a real application
 */
const ExamplePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAction = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header Section with Gradient Text */}
      <Box className="animate-fadeInUp" sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h2" className="gradient-text" sx={{ mb: 1 }}>
          Welcome to Diganthadeepa
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Experience the elegance of our premium design system
        </Typography>
        <Button variant="contained" gradient size="large" onClick={handleAction} loading={isLoading}>
          Get Started
        </Button>
      </Box>
      
      {/* Main Content with Glass Cards */}
      <Stack spacing={3}>
        {/* Feature Card 1 */}
        <GlassCard sx={{ p: 3 }} animated>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Modern Glass Morphism
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            Our design system utilizes glass morphism effects to create depth and visual interest
            while maintaining readability and elegance.
          </Typography>
          <Button variant="outlined" glassMorphic>
            Learn More
          </Button>
        </GlassCard>
        
        {/* Feature Card 2 */}
        <GlassCard sx={{ p: 3 }} animated borderGlow>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Subtle Animations
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            Smooth transitions and micro-interactions enhance the user experience without being
            distracting, creating a polished and professional feel.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined">View Examples</Button>
            <Button variant="text" glow color="secondary">
              Documentation
            </Button>
          </Stack>
        </GlassCard>
        
        {/* Feature Card 3 */}
        <GlassCard sx={{ p: 3 }} animated>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Customizable Components
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            Our design system provides highly customizable components that adapt to your brand
            while maintaining consistency and visual harmony.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" color="success">
              Try Now
            </Button>
            <Button variant="outlined" color="error">
              Reset
            </Button>
          </Stack>
        </GlassCard>
      </Stack>
      
      {/* Footer Section */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          Created with Diganthadeepa Design System
        </Typography>
      </Box>
    </Container>
  );
};

export default ExamplePage;
