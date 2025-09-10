import React, { useState } from 'react';
import { Box, Typography, Container } from '@mui/material';
import '../styles/designSystem.css';
import Button from '../components/DiganthadeepaUI/Button';
import GlassCard from '../components/DiganthadeepaUI/GlassCard';
import Loading from '../components/DiganthadeepaUI/Loading';
import Badge from '../components/DiganthadeepaUI/Badge';

/**
 * Component to showcase the Diganthadeepa design system elements
 */
const DesignSystemSimple = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8, px: { xs: 2, md: 3 } }}>
      <Box className="animate-fadeInUp" sx={{ mb: 6, textAlign: 'center' }}>
        <Typography
          variant="h2"
          className="gradient-text"
          sx={{
            fontWeight: 700,
            mb: 2
          }}
        >
          Diganthadeepa Design System
        </Typography>
        <Typography
          variant="body1"
          color="textSecondary"
          sx={{ maxWidth: '700px', mx: 'auto', mb: 4 }}
        >
          A premium, modern design system combining minimalist principles with functional elegance.
          Featuring glass morphism, subtle animations, and thoughtful interactions.
        </Typography>
      </Box>

      {/* Typography Section */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Typography</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <Typography variant="h1" sx={{ mb: 2 }}>Heading 1</Typography>
            <Typography variant="h2" sx={{ mb: 2 }}>Heading 2</Typography>
            <Typography variant="h3" sx={{ mb: 2 }}>Heading 3</Typography>
            <Typography variant="h4" sx={{ mb: 2 }}>Heading 4</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Heading 5</Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>Heading 6</Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Subtitle 1 - Neue Montreal</Typography>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Subtitle 2 - Neue Montreal</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>Body 1 - This is the standard body text used throughout the application. It uses the Neue Montreal font.</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Body 2 - Secondary body text for smaller content areas. Also uses Neue Montreal.</Typography>
            <Typography variant="button" sx={{ mb: 2, display: 'block' }}>BUTTON TEXT</Typography>
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>Caption text for smaller elements</Typography>
          </Box>
        </Box>
      </GlassCard>

      {/* Buttons Section */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Buttons</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 30%', minWidth: 250, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Primary Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained">Default</Button>
              <Button variant="contained" gradient>Gradient</Button>
              <Button variant="contained" disabled>Disabled</Button>
            </Box>
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Secondary Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined">Outlined</Button>
              <Button variant="outlined" glassMorphic>Glass</Button>
              <Button variant="outlined" loading={isLoading} onClick={handleLoadingDemo}>
                {isLoading ? 'Loading' : 'Loading Demo'}
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Text Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="text">Text</Button>
              <Button variant="text" color="secondary">Secondary</Button>
              <Button variant="text" color="error">Error</Button>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Cards & Surfaces */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Cards & Surfaces</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 30%', minWidth: 250 }}>
            <GlassCard sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Standard Card</Typography>
              <Typography variant="body2" color="textSecondary">
                Default glass card with hover effect and medium elevation.
              </Typography>
            </GlassCard>
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250 }}>
            <GlassCard sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Elevated Card</Typography>
              <Typography variant="body2" color="textSecondary">
                High elevation glass card with border glow effect.
              </Typography>
            </GlassCard>
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250 }}>
            <GlassCard sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Static Card</Typography>
              <Typography variant="body2" color="textSecondary">
                Low elevation card without hover effects.
              </Typography>
            </GlassCard>
          </Box>
        </Box>
      </GlassCard>

      {/* Loading States */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Loading States</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 30%', minWidth: 250, display: 'flex', justifyContent: 'center' }}>
            <Loading size="small" transparent message="Small Loader" />
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250, display: 'flex', justifyContent: 'center' }}>
            <Loading size="medium" transparent message="Medium Loader" />
          </Box>
          
          <Box sx={{ flex: '1 1 30%', minWidth: 250, display: 'flex', justifyContent: 'center' }}>
            <Loading size="large" transparent message="Large Loader" />
          </Box>
        </Box>
      </GlassCard>

      {/* Badges & Status Indicators */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Badges & Status Indicators</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Badge label="Primary" />
          <Badge label="Secondary" />
          <Badge label="Success" />
          <Badge label="Warning" />
          <Badge label="Error" />
          <Badge label="Info" />
          <Badge label="Neutral" />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Badge label="Small" size="small" />
          <Badge label="Medium" size="medium" />
          <Badge label="Medium" size="medium" />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Badge label="Glow Effect" glow />
          <Badge label="Rounded" pill={false} />
          <Badge label="Glow + Medium" glow size="medium" />
        </Box>
      </GlassCard>

      {/* Design Principles */}
      <GlassCard sx={{ p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Design Principles</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 21%', minWidth: 220, textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Glass Morphism</Typography>
            <Typography variant="body2" color="textSecondary">
              Translucent surfaces with subtle backdrop filters for depth and elegance
            </Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 21%', minWidth: 220, textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Subtle Animations</Typography>
            <Typography variant="body2" color="textSecondary">
              Smooth transitions and micro-interactions for an engaging experience
            </Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 21%', minWidth: 220, textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Depth & Layering</Typography>
            <Typography variant="body2" color="textSecondary">
              Strategic use of shadows and elevation for visual hierarchy
            </Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 21%', minWidth: 220, textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Gradient Accents</Typography>
            <Typography variant="body2" color="textSecondary">
              Subtle color gradients for emphasis and visual interest
            </Typography>
          </Box>
        </Box>
      </GlassCard>
    </Container>
  );
};

export default DesignSystemSimple;
