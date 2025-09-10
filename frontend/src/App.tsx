import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import { EmailProvider } from './context/EmailContext';
import './App.css';

function AppLayout() {
  return (
    <EmailProvider>
      {/* Main application structure */}
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        position: 'relative', 
        zIndex: 1,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
      }}>
        <Header />
        <Sidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            width: { sm: `calc(100% - 280px)` },
            ml: { xs: 0, sm: '280px' },
            mt: '64px',
            backgroundColor: 'transparent',
            minHeight: 'calc(100vh - 64px)',
            overflowX: 'hidden',
            transition: 'all 0.3s ease'
          }}
          className="page-container animate-fadeIn"
        >
          <Outlet />
        </Box>
      </Box>
    </EmailProvider>
  );
}

export default AppLayout;
