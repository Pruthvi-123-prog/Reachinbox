import React from 'react';
import { styled, Paper, PaperProps } from '@mui/material';

// Separate our custom props from MUI Paper props
interface CustomGlassCardProps {
  elevation?: 'low' | 'medium' | 'high';
  borderGlow?: boolean;
  animated?: boolean;
  hoverEffect?: boolean;
}

// Create type that combines our props with Paper props
type GlassCardProps = CustomGlassCardProps & Omit<PaperProps, 'elevation'>;

// Styled Paper component with glassmorphic effect
const StyledGlassCard = styled(Paper, {
  shouldForwardProp: (prop) => 
    !['elevation', 'borderGlow', 'animated', 'hoverEffect'].includes(prop as string),
})<GlassCardProps>(({ 
  theme, 
  elevation = 'medium',
  borderGlow = false,
  animated = false,
  hoverEffect = true
}) => {
  // Define elevation levels with proper typing
  const elevationLevels: Record<'low' | 'medium' | 'high', {
    background: string;
    backdropFilter: string;
    boxShadow: string;
  }> = {
    low: {
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    },
    medium: {
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)'
    },
    high: {
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)'
    }
  };

  // Use type assertion to ensure TypeScript knows elevation is a valid key
  const elevationStyle = elevationLevels[elevation as 'low' | 'medium' | 'high'];

  return {
    position: 'relative',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    ...elevationStyle,
    transition: 'all 0.4s ease',
    overflow: 'hidden',
    zIndex: 1,
    
    ...(animated && {
      animation: 'fadeIn 0.6s ease-out'
    }),

    ...(borderGlow && {
      '&::after': {
        content: '""',
        position: 'absolute',
        top: '-1px',
        left: '-1px',
        right: '-1px',
        bottom: '-1px',
        borderRadius: '16px',
        padding: '1px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.5) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(30, 64, 175, 0.5) 100%)',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        pointerEvents: 'none',
        zIndex: -1,
      }
    }),

    ...(hoverEffect && {
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }
    }),

    '@keyframes fadeIn': {
      '0%': { 
        opacity: 0, 
        transform: 'translateY(20px)'
      },
      '100%': { 
        opacity: 1, 
        transform: 'translateY(0)'
      }
    }
  };
});

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  elevation = 'medium',
  borderGlow = false,
  animated = false,
  hoverEffect = true,
  ...props
}) => {
  // Cast to any to allow our custom elevation prop to work with Paper
  const paperProps = {
    ...props,
    elevation: undefined // Remove MUI elevation
  };

  return (
    <StyledGlassCard
      elevation-level={elevation}
      borderGlow={borderGlow}
      animated={animated}
      hoverEffect={hoverEffect}
      {...paperProps}
    >
      {children}
    </StyledGlassCard>
  );
};

export default GlassCard;
