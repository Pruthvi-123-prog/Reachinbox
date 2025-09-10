import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import Grid from '@mui/material/Grid';
import Button from '../../components/DiganthadeepaUI/Button';
import GlassCard from '../../components/DiganthadeepaUI/GlassCard';
import Loading from '../../components/DiganthadeepaUI/Loading';
import Badge from '../../components/DiganthadeepaUI/Badge';

/**
 * Design system page showcasing UI components and styles
 */
const DesignSystem: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography 
          variant="h2" 
          sx={{ 
            mb: 2, 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700
          }}
        >
          Diganthadeepa Design System
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ mb: 4, maxWidth: 700, mx: 'auto' }}
        >
          A comprehensive showcase of UI components, styles, and design principles used throughout the application
        </Typography>
      </Box>

      {/* Typography Section */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Typography</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          <Box>
            <Typography variant="h1" sx={{ mb: 2 }}>Heading 1</Typography>
            <Typography variant="h2" sx={{ mb: 2 }}>Heading 2</Typography>
            <Typography variant="h3" sx={{ mb: 2 }}>Heading 3</Typography>
            <Typography variant="h4" sx={{ mb: 2 }}>Heading 4</Typography>
            <Typography variant="h5" sx={{ mb: 2 }}>Heading 5</Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>Heading 6</Typography>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Subtitle 1 - Neue Montreal</Typography>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Subtitle 2 - Neue Montreal</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>Body 1 - This is the standard body text used throughout the application. It uses the Neue Montreal font.</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Body 2 - Secondary text with smaller font size, useful for descriptions, captions, and less important content.</Typography>
            <Typography variant="button" sx={{ mb: 2, display: 'block' }}>BUTTON TEXT</Typography>
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>Caption text for smaller elements</Typography>
          </Box>
        </Box>
      </GlassCard>

      {/* Buttons Section */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Buttons</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Primary Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" color="primary">Default</Button>
              <Button variant="contained" color="primary" gradient>Gradient</Button>
              <Button variant="contained" color="primary" glow>Glow</Button>
            </Box>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Secondary Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="outlined" color="primary">Outlined</Button>
              <Button variant="outlined" color="primary" glassMorphic>Glassmorphic</Button>
              <Button variant="outlined" color="primary" glow>Glow</Button>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Text Buttons</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="text" color="primary">Text</Button>
              <Button variant="text" color="secondary">Secondary</Button>
              <Button variant="text" color="primary" loading>Loading</Button>
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Cards & Surfaces */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Cards & Surfaces</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
          <GlassCard sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Standard Card</Typography>
            <Typography variant="body2" color="textSecondary">
              Default glass card with subtle hover effect and medium elevation shadow.
            </Typography>
          </GlassCard>
          
          <GlassCard elevation="high" borderGlow sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Elevated Card</Typography>
            <Typography variant="body2" color="textSecondary">
              Higher elevation with stronger shadow and border glow effect on hover.
            </Typography>
          </GlassCard>
          
          <GlassCard elevation="low" hoverEffect={false} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Static Card</Typography>
            <Typography variant="body2" color="textSecondary">
              Low elevation card with no hover effect, good for content that shouldn't appear interactive.
            </Typography>
          </GlassCard>
        </Box>
      </GlassCard>

      {/* Loading States */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Loading States</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Loading size="small" transparent message="Small Loader" />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Loading size="medium" transparent message="Medium Loader" />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Loading size="large" transparent message="Large Loader" />
            </Box>
          </Box>
        </Box>
      </GlassCard>

      {/* Badges & Status Indicators */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Badges & Status Indicators</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Badge label="Primary" variant="primary" />
          <Badge label="Secondary" variant="secondary" />
          <Badge label="Success" variant="success" />
          <Badge label="Error" variant="error" />
          <Badge label="Warning" variant="warning" />
          <Badge label="Info" variant="info" />
          <Badge label="Neutral" variant="neutral" />
          <Badge label="Glow Effect" variant="primary" glow />
          <Badge label="Square" variant="secondary" pill={false} />
          <Badge label="Medium" variant="success" size="medium" />
          <Badge label="Small" variant="error" size="small" />
        </Box>
      </GlassCard>

      {/* Design Principles */}
      <GlassCard sx={{ mb: 6, p: 4 }} animated>
        <Typography variant="h4" sx={{ mb: 3 }} className="gradient-text-silver">Design Principles</Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, gap: 4 }}>
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Glass Morphism</Typography>
            <Typography variant="body2" color="textSecondary">
              Semi-transparent surfaces with blur effects create depth and modern aesthetics.
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Subtle Animations</Typography>
            <Typography variant="body2" color="textSecondary">
              Smooth transitions and motion enhance user experience without being distracting.
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Depth & Layering</Typography>
            <Typography variant="body2" color="textSecondary">
              Thoughtful use of shadows and elevation create visual hierarchy.
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Gradient Accents</Typography>
            <Typography variant="body2" color="textSecondary">
              Colorful gradients add visual interest and guide user attention.
            </Typography>
          </Box>
        </Box>
      </GlassCard>
    </Container>
  );
};

export default DesignSystem;
