import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  transparent?: boolean;
}

/**
 * Diganthadeepa-styled loading component with custom animations
 */
const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false,
  transparent = false
}) => {
  // Determine the circular progress size based on prop
  const getProgressSize = () => {
    switch (size) {
      case 'small': return 30;
      case 'large': return 60;
      default: return 40;
    }
  };

  // Base styling for the loading container
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    height: fullScreen ? '100vh' : '100%',
    width: '100%',
    backgroundColor: transparent ? 'transparent' : 'rgba(3, 3, 3, 0.7)',
    backdropFilter: transparent ? 'none' : 'blur(10px)',
    position: fullScreen ? 'fixed' : 'relative' as const,
    top: fullScreen ? 0 : 'auto',
    left: fullScreen ? 0 : 'auto',
    right: fullScreen ? 0 : 'auto',
    bottom: fullScreen ? 0 : 'auto',
    zIndex: fullScreen ? 9999 : 1,
  };

  return (
    <Box sx={containerStyle} className="animate-fadeIn">
      <Box className="loading-animation-container" sx={{ position: 'relative' }}>
        {/* Main circular progress */}
        <CircularProgress 
          size={getProgressSize()} 
          thickness={3}
          sx={{
            color: 'var(--color-primary-light)',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        
        {/* Secondary circular progress for layered effect */}
        <CircularProgress 
          size={getProgressSize() + 15} 
          thickness={1.5}
          sx={{
            color: 'rgba(255, 255, 255, 0.15)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'reverse-spin 3s linear infinite'
          }}
        />

        {/* Third decorative circular element */}
        <Box 
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: getProgressSize() - 15,
            height: getProgressSize() - 15,
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      </Box>

      {/* Loading message */}
      {message && (
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ 
            mt: 2, 
            opacity: 0.8,
            animation: 'fadeIn 1s ease-in-out infinite alternate',
            fontWeight: 500,
            letterSpacing: '1px'
          }}
        >
          {message}
        </Typography>
      )}

      {/* CSS for custom animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.5; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 0.5; transform: scale(0.98); }
          }
          
          @keyframes reverse-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(-360deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default Loading;
