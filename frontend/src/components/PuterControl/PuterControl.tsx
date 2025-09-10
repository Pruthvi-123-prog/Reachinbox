import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Link } from '@mui/material';
import { SmartToy } from '@mui/icons-material';

interface PuterControlProps {
  isAvailable: boolean;
  onTest: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Puter.js Control Component
 * Shows status and controls for Puter.js integration
 */
const PuterControl: React.FC<PuterControlProps> = ({ isAvailable, onTest, loading, error }) => {
  return (
    <Box sx={{ mt: 3, p: 2, border: '1px dashed #2196f3', borderRadius: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
          Puter.js AI Integration
        </Typography>
        
        {isAvailable ? (
          <Button 
            variant="contained" 
            color="primary"
            size="small"
            onClick={onTest}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="secondary"
            size="small"
            href="https://js.puter.com/v2/"
            target="_blank"
          >
            Learn More
          </Button>
        )}
      </Box>
      
      {isAvailable ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Puter.js is available! You can now use free, unlimited access to DeepSeek AI models directly in your browser.
          </Typography>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Puter.js integration allows free, unlimited access to DeepSeek AI models directly in your browser without API keys.
          </Typography>
          <Link 
            href="https://js.puter.com/v2/" 
            target="_blank"
            sx={{ display: 'block', mt: 1 }}
          >
            Learn more about Puter.js
          </Link>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default PuterControl;
