import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  Chip,
  Tooltip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  NotificationsActive,
  SyncOutlined,
  SyncDisabled,
  CheckCircle,
  Error,
  Warning,
  RefreshOutlined,
  Settings as SettingsIcon,
  AccountCircle
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEmailContext, emailActions } from '../../context/EmailContext';
import { emailAPI, searchAPI, healthAPI } from '../../services/api';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useEmailContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Fetch sync status and health on component mount and periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch sync status
        const syncStatus = await emailAPI.getSyncStatus();
        dispatch(emailActions.setSyncStatus(syncStatus));

        // Fetch health status
        const health = await healthAPI.getDetailedHealth();
        setHealthStatus(health);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSyncManual = async () => {
    try {
      dispatch(emailActions.setLoading(true));
      await emailAPI.triggerSync();
      setNotificationMessage('Manual sync triggered successfully');
      setShowNotification(true);
      
      // Refresh sync status after a delay
      setTimeout(async () => {
        try {
          const syncStatus = await emailAPI.getSyncStatus();
          dispatch(emailActions.setSyncStatus(syncStatus));
        } catch (error) {
          console.error('Failed to refresh sync status:', error);
        }
      }, 2000);
    } catch (error: any) {
      setNotificationMessage(`Sync failed: ${error.message}`);
      setShowNotification(true);
    } finally {
      dispatch(emailActions.setLoading(false));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getSyncStatusIcon = () => {
    if (!state.syncStatus) return <SyncDisabled color="disabled" />;
    
    if (state.syncStatus.isRunning) {
      return (
        <Badge
          badgeContent={state.syncStatus.connectedAccounts}
          color="success"
          max={99}
        >
          <SyncOutlined color="success" />
        </Badge>
      );
    } else {
      return <SyncDisabled color="error" />;
    }
  };

  const getHealthStatusIcon = () => {
    if (!healthStatus) return <Warning color="disabled" />;
    
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'unhealthy':
        return <Error color="error" />;
      default:
        return <Warning color="disabled" />;
    }
  };

  const getInterestedEmailsCount = () => {
    return state.stats?.byCategory.find(cat => cat.category === 'interested')?.count || 0;
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        className="app-header animate-slideDown"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
          color: 'text.primary',
          borderBottom: '1px solid #333333',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          {/* Logo and Title */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            className="gradient-text"
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #0077ff, #7928ca)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
              mr: 1
            }}
            onClick={() => navigate('/')}
          >
            ReachInbox
          </Typography>

          {/* Search Bar */}
          <Box
            component="form"
            onSubmit={handleSearch}
            className="search-container animate-fadeIn"
            sx={{ 
              flexGrow: 1, 
              mx: { xs: 1, sm: 2, md: 3 },
              maxWidth: 600 
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search emails, senders, subjects..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="search-input"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--color-text-secondary)' }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'rgba(15, 15, 15, 0.7)',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s ease',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 20px rgba(13, 77, 110, 0.15)',
                    border: '1px solid rgba(13, 77, 110, 0.5)'
                  }
                }
              }}
            />
          </Box>

          {/* Status Indicators */}
          <Box className="status-indicators" sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            {/* Sync Status */}
            <Tooltip title={`Sync Status: ${state.syncStatus?.isRunning ? 'Running' : 'Stopped'}`}>
              <IconButton 
                className="status-icon-button"
                onClick={handleSyncManual}
                sx={{
                  bgcolor: 'rgba(10, 10, 10, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(10, 10, 10, 0.8)',
                  }
                }}
              >
                {getSyncStatusIcon()}
              </IconButton>
            </Tooltip>

            {/* Health Status */}
            <Tooltip title={`System Health: ${healthStatus?.status || 'Unknown'}`}>
              <IconButton 
                className="status-icon-button"
                sx={{
                  bgcolor: 'rgba(10, 10, 10, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(10, 10, 10, 0.8)',
                  }
                }}
              >
                {getHealthStatusIcon()}
              </IconButton>
            </Tooltip>

            {/* Interested Emails Notification */}
            <Tooltip title="Interested Emails">
              <IconButton 
                className="status-icon-button notification-button"
                onClick={() => navigate('/emails?category=interested')}
                sx={{
                  bgcolor: 'rgba(10, 10, 10, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(10, 10, 10, 0.8)',
                  }
                }}
              >
                <Badge 
                  badgeContent={getInterestedEmailsCount()} 
                  color="secondary" 
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      background: 'linear-gradient(90deg, #0077ff, #7928ca)',
                      fontWeight: 'bold'
                    }
                  }}
                >
                  <NotificationsActive className="notification-icon" />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Account Menu */}
          <IconButton
            className="account-icon-button"
            onClick={handleMenuOpen}
            sx={{ 
              ml: 1,
              bgcolor: 'rgba(10, 10, 10, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              '&:hover': {
                bgcolor: 'rgba(10, 10, 10, 0.8)',
              }
            }}
          >
            <AccountCircle className="account-icon" />
          </IconButton>

          <Menu
            className="modern-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            sx={{
              '& .MuiPaper-root': {
                bgcolor: 'rgba(15, 15, 15, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                mt: 1,
                minWidth: 200,
                overflow: 'hidden'
              }
            }}
          >
            <MenuItem 
              onClick={() => { handleMenuClose(); navigate('/settings'); }}
              className="menu-item"
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(0, 119, 255, 0.15)',
                }
              }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" className="menu-icon" sx={{ color: '#0077ff' }} />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', mx: 1 }} />
            <MenuItem 
              onClick={handleSyncManual}
              className="menu-item"
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(0, 119, 255, 0.15)',
                }
              }}
            >
              <ListItemIcon>
                <RefreshOutlined fontSize="small" className="menu-icon" sx={{ color: '#7928ca' }} />
              </ListItemIcon>
              <ListItemText>Manual Sync</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Status Notification */}
      <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          '& .MuiSnackbarContent-root': {
            minWidth: 300
          }
        }}
      >
        <Alert 
          onClose={() => setShowNotification(false)} 
          severity={notificationMessage.includes('failed') ? 'error' : 'success'}
          className="modern-alert"
          sx={{ 
            width: '100%',
            bgcolor: notificationMessage.includes('failed') 
              ? 'rgba(211, 47, 47, 0.15)' 
              : 'rgba(46, 125, 50, 0.15)',
            color: notificationMessage.includes('failed') 
              ? '#ff5252' 
              : '#69f0ae',
            border: `1px solid ${notificationMessage.includes('failed') 
              ? 'rgba(211, 47, 47, 0.3)' 
              : 'rgba(46, 125, 50, 0.3)'}`,
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Header;
