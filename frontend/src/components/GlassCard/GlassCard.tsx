import React from 'react';
import { Card, Box, SxProps, Theme } from '@mui/material';

// Create a custom CardProps type
interface CustomCardProps {
  children?: React.ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
  [key: string]: any;
}

interface GlassCardProps extends CustomCardProps {
  hoverEffect?: boolean;
  elevation?: 'low' | 'medium' | 'high' | number;
  borderGlow?: boolean;
  animated?: boolean;
}

/**
 * Diganthadeepa-styled glass card component with hover effects and animations
 */
const GlassCard: React.FC<GlassCardProps> = ({
  children,
  hoverEffect = true,
  elevation = 'medium',
  borderGlow = false,
  animated = false,
  sx,
  ...rest
}) => {
  // Get elevation shadow based on prop
  const getElevationShadow = () => {
    switch (elevation) {
      case 'low': return '0 4px 15px rgba(0, 0, 0, 0.1)';
      case 'high': return '0 12px 30px rgba(0, 0, 0, 0.2)';
      default: return '0 8px 20px rgba(0, 0, 0, 0.15)';
    }
  };

  // Get hover shadow based on elevation
  const getHoverShadow = () => {
    switch (elevation) {
      case 'low': return '0 6px 20px rgba(0, 0, 0, 0.15)';
      case 'high': return '0 16px 40px rgba(0, 0, 0, 0.25)';
      default: return '0 12px 30px rgba(0, 0, 0, 0.2)';
    }
  };

  // Combine default and custom styles
  const getStyles = (): SxProps<Theme> => {
    const defaultStyles: SxProps<Theme> = {
      backgroundColor: 'rgba(17, 17, 17, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)', // For Safari
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: getElevationShadow(),
      transition: 'var(--transition-base)',
      overflow: 'hidden',
      position: 'relative',
      ...(hoverEffect && {
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: getHoverShadow(),
          border: borderGlow 
            ? '1px solid rgba(13, 77, 110, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        }
      })
    };

    return sx ? { ...defaultStyles, ...sx } : defaultStyles;
  };

  return (
    <Card 
      sx={getStyles()} 
      className={`glass-card ${animated ? 'animate-fadeIn' : ''}`}
      elevation={0 as number}
      {...rest}
    >
      {/* Add subtle border glow effect */}
      {borderGlow && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            opacity: 0,
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 0 15px rgba(13, 77, 110, 0.3)',
            transition: 'var(--transition-base)',
            '.glass-card:hover &': {
              opacity: 0.6,
            }
          }}
        />
      )}

      {children}
    </Card>
  );
};

export default GlassCard;
