import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled, CircularProgress, Theme } from '@mui/material';

interface ButtonProps extends Omit<MuiButtonProps, 'color'> {
  gradient?: boolean;
  glassMorphic?: boolean;
  loading?: boolean;
  glow?: boolean;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

// No need for getPaletteColor helper function anymore as we access palette directly

// Styled button with glassmorphic and gradient options
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => 
    !['gradient', 'glassMorphic', 'glow', 'loading'].includes(prop as string),
})<ButtonProps>(({ theme, gradient, glassMorphic, glow, variant, color = 'primary' }) => ({
  borderRadius: '8px',
  padding: '10px 24px',
  fontWeight: 500,
  textTransform: 'none',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  letterSpacing: '0.2px',
  boxShadow: glow 
    ? `0 0 15px 2px ${theme.palette.primary.main}40` 
    : 'none',

  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: glow 
      ? `0 0 20px 5px ${theme.palette.primary.main}60` 
      : glassMorphic 
        ? '0 8px 16px rgba(0, 0, 0, 0.15)' 
        : '',
  },
  
  ...(variant === 'contained' && {
    background: gradient 
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
      : theme.palette[color !== 'inherit' ? color : 'primary'].main,
    color: theme.palette[color !== 'inherit' ? color : 'primary'].contrastText,
    '&:hover': {
      background: gradient 
        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' 
        : theme.palette[color !== 'inherit' ? color : 'primary'].dark,
      transform: 'translateY(-2px)',
    },
  }),

  ...(variant === 'outlined' && {
    borderColor: glassMorphic ? 'rgba(255, 255, 255, 0.2)' : theme.palette[color !== 'inherit' ? color : 'primary'].main,
    background: glassMorphic 
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)' 
      : 'transparent',
    backdropFilter: glassMorphic ? 'blur(12px)' : 'none',
    color: glassMorphic ? 'rgba(255, 255, 255, 0.9)' : theme.palette[color !== 'inherit' ? color : 'primary'].main,
    '&:hover': {
      borderColor: glassMorphic ? 'rgba(255, 255, 255, 0.3)' : theme.palette[color !== 'inherit' ? color : 'primary'].dark,
      background: glassMorphic 
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.09) 100%)' 
        : 'rgba(255, 255, 255, 0.05)',
    },
  }),

  ...(variant === 'text' && {
    color: theme.palette[color !== 'inherit' ? color : 'primary'].main,
    '&:hover': {
      backgroundColor: `${theme.palette[color !== 'inherit' ? color : 'primary'].main}15`,
    },
  }),
  
  '&.Mui-disabled': {
    backgroundColor: variant === 'contained' 
      ? 'rgba(255, 255, 255, 0.12)'
      : 'transparent',
    color: 'rgba(255, 255, 255, 0.3)',
    borderColor: variant === 'outlined' 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'transparent',
  },
}));

// Button component with loading state
export const Button: React.FC<ButtonProps> = ({
  children,
  gradient = false,
  glassMorphic = false,
  glow = false,
  loading = false,
  disabled = false,
  startIcon,
  ...props
}) => {
  return (
    <StyledButton
      gradient={gradient}
      glassMorphic={glassMorphic}
      glow={glow}
      disabled={disabled || loading}
      startIcon={loading ? undefined : startIcon}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress
            size={20}
            color="inherit"
            sx={{ 
              marginRight: '10px',
              color: 'inherit',
            }}
          />
          {children}
        </>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default Button;
