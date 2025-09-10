import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Box
      className="animate-fadeIn"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        textAlign: 'center',
        padding: 3
      }}
    >
      <Typography
        variant="h1"
        className="gradient-text"
        sx={{
          fontSize: { xs: '5rem', md: '8rem' },
          fontWeight: 700,
          marginBottom: 2
        }}
      >
        404
      </Typography>
      
      <Typography
        variant="h4"
        sx={{
          marginBottom: 4,
          fontWeight: 500,
          background: 'linear-gradient(90deg, #ffffff, #a0a0a0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Page not found
      </Typography>
      
      <Typography 
        variant="body1"
        color="textSecondary"
        sx={{ 
          maxWidth: '500px',
          marginBottom: 4
        }}
      >
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </Typography>
      
      <Button
        component={Link}
        to="/"
        variant="contained"
        sx={{
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
          padding: '10px 30px',
          boxShadow: '0 4px 20px rgba(13, 77, 110, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 25px rgba(13, 77, 110, 0.4)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        Return to Dashboard
      </Button>
      
      <Box
        className="decorative-element"
        sx={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          opacity: 0.5,
          zIndex: -1,
          bottom: '10%',
          right: '5%',
          boxShadow: 'inset 0 0 50px rgba(13, 77, 110, 0.2)',
        }}
      />
      
      <Box
        className="decorative-element"
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '50%',
          opacity: 0.3,
          zIndex: -1,
          top: '10%',
          left: '5%',
          boxShadow: 'inset 0 0 50px rgba(13, 77, 110, 0.1)',
        }}
      />
    </Box>
  );
};

export default NotFound;
