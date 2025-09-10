import React from 'react';
import { Box, Typography, CircularProgress, styled } from '@mui/material';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  transparent?: boolean;
  message?: string;
  color?: string;
}

// Custom styled circular progress with glow
const GlowingCircularProgress = styled(CircularProgress)<{ glowColor?: string }>(
  ({ glowColor = 'rgba(99, 102, 241, 0.6)' }) => ({
    filter: `drop-shadow(0 0 8px ${glowColor})`,
  })
);

// Container for the loading indicator
const LoadingContainer = styled(Box, {
  shouldForwardProp: (prop) => !['transparent'].includes(prop as string),
})<{ transparent?: boolean }>(
  ({ transparent = false }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    borderRadius: '16px',
    minHeight: '120px',
    width: '100%',
    ...(transparent ? {} : {
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }),
  })
);

// Animation for the pulse effect
const pulse = {
  '@keyframes pulse': {
    '0%': {
      opacity: 0.6,
    },
    '50%': {
      opacity: 1,
    },
    '100%': {
      opacity: 0.6,
    },
  },
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  transparent = false,
  message = 'Loading...',
  color = '#6366f1',
}) => {
  // Size mapping
  const sizeMap = {
    small: 30,
    medium: 50,
    large: 70,
  };

  const progressSize = sizeMap[size];
  const glowColor = `${color}99`; // Adding transparency to the glow

  return (
    <LoadingContainer transparent={transparent}>
      <Box sx={{ 
        mb: message ? 2 : 0,
        animation: 'pulse 2s infinite ease-in-out',
        ...pulse 
      }}>
        <GlowingCircularProgress
          size={progressSize}
          color="primary"
          glowColor={glowColor}
          thickness={4}
        />
      </Box>
      
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ opacity: 0.7, fontWeight: 500 }}
        >
          {message}
        </Typography>
      )}
    </LoadingContainer>
  );
};

export default Loading;
