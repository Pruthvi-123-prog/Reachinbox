import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress, SxProps, Theme } from '@mui/material';

interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
  gradient?: boolean;
  glassMorphic?: boolean;
  hoverScale?: boolean;
}

/**
 * Diganthadeepa-styled button component with custom styles and animations
 */
const Button: React.FC<ButtonProps> = ({
  loading = false,
  gradient = false,
  glassMorphic = false,
  hoverScale = true,
  children,
  sx,
  disabled,
  ...rest
}) => {
  // Combine default and custom styles
  const getStyles = (): SxProps<Theme> => {
    const defaultStyles: SxProps<Theme> = {
      borderRadius: 'var(--radius-round)',
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.5px',
      transition: 'var(--transition-base)',
      boxShadow: 'none',
      padding: '10px 24px',
      ...(hoverScale && {
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        }
      }),
      ...(gradient && {
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
        }
      }),
      ...(glassMorphic && {
        backgroundColor: 'rgba(15, 15, 15, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        '&:hover': {
          backgroundColor: 'rgba(15, 15, 15, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          transform: 'translateY(-2px)',
        }
      }),
      ...(disabled && {
        opacity: 0.6,
        '&:hover': {
          transform: 'none',
          boxShadow: 'none',
        }
      })
    };

    return sx ? { ...defaultStyles, ...sx } : defaultStyles;
  };

  return (
    <MuiButton
      disabled={loading || disabled}
      sx={getStyles()}
      {...rest}
    >
      {loading ? (
        <>
          <CircularProgress 
            size={20} 
            thickness={4} 
            sx={{ 
              color: 'inherit', 
              opacity: 0.8,
              mr: 1 
            }} 
          />
          Loading...
        </>
      ) : (
        children
      )}
    </MuiButton>
  );
};

export default Button;
