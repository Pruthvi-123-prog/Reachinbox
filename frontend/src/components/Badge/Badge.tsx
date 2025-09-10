import React from 'react';
import { Box, BoxProps, Typography } from '@mui/material';

interface BadgeProps extends BoxProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  glow?: boolean;
  size?: 'small' | 'medium' | 'large';
  pill?: boolean;
}

/**
 * Diganthadeepa-styled badge component
 */
const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  glow = false,
  size = 'medium',
  pill = true,
  sx,
  ...rest
}) => {
  // Get color based on variant
  const getColor = () => {
    switch (variant) {
      case 'primary': return 'var(--color-primary)';
      case 'secondary': return 'var(--color-secondary)';
      case 'success': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'error': return 'var(--color-error)';
      case 'info': return 'var(--color-info)';
      default: return '#9ca3af'; // neutral color
    }
  };

  // Get background color based on variant
  const getBgColor = () => {
    switch (variant) {
      case 'primary': return 'rgba(13, 77, 110, 0.15)';
      case 'secondary': return 'rgba(159, 179, 200, 0.15)';
      case 'success': return 'rgba(14, 165, 233, 0.15)';
      case 'warning': return 'rgba(245, 158, 11, 0.15)';
      case 'error': return 'rgba(239, 68, 68, 0.15)';
      case 'info': return 'rgba(59, 130, 246, 0.15)';
      default: return 'rgba(156, 163, 175, 0.15)'; // neutral background
    }
  };

  // Get size parameters
  const getSizeParams = () => {
    switch (size) {
      case 'small': return {
        px: 1,
        py: 0.25,
        fontSize: '0.75rem',
        fontWeight: 500
      };
      case 'large': return {
        px: 2,
        py: 0.75,
        fontSize: '0.875rem',
        fontWeight: 600
      };
      default: return {
        px: 1.5,
        py: 0.5,
        fontSize: '0.75rem',
        fontWeight: 500
      };
    }
  };

  // Combine default and custom styles
  const getStyles = () => {
    const { px, py, fontSize, fontWeight } = getSizeParams();
    const color = getColor();
    const bgColor = getBgColor();
    
    const defaultStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      px,
      py,
      color,
      backgroundColor: bgColor,
      borderRadius: pill ? '9999px' : 'var(--radius-sm)',
      border: `1px solid ${color}30`, // 30 is hex for 0.2 opacity
      whiteSpace: 'nowrap',
      ...(glow && {
        boxShadow: `0 0 10px ${color}40` // 40 is hex for 0.25 opacity
      })
    };

    return { ...defaultStyles, ...sx };
  };

  return (
    <Box sx={getStyles()} {...rest}>
      <Typography 
        component="span" 
        sx={{ 
          fontSize: getSizeParams().fontSize, 
          fontWeight: getSizeParams().fontWeight,
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default Badge;
