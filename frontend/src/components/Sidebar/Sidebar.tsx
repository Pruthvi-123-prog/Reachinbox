import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Chip,
  Box,
  Divider,
  Typography,
  Badge,
  FormControlLabel,
  Switch,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  AccountCircle,
  Folder,
  Label,
  Star,
  MarkEmailRead,
  AttachFile,
  FilterList,
  Analytics,
  Timeline,
  BarChart,
  PieChart,
  Insights,
  TrendingUp,
  Schedule,
  Notifications
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmailContext, emailActions, EmailCategory } from '../../context/EmailContext';
import { emailAPI } from '../../services/api';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: NavigationItem[];
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useEmailContext();
  const [expandedSections, setExpandedSections] = useState<string[]>(['categories', 'filters']);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const stats = await emailAPI.getStats();
        dispatch(emailActions.setStats(stats));
      } catch (error) {
        console.error('Failed to fetch email stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 2 minutes
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getCategoryCount = (category: string) => {
    return state.stats?.byCategory.find(cat => cat.category === category)?.count || 0;
  };

  const getAccountCount = (account: string) => {
    return state.stats?.byAccount.find(acc => acc.account === account)?.count || 0;
  };

  const handleCategoryFilter = (category: EmailCategory) => {
    dispatch(emailActions.setFilters({ category }));
    navigate(`/emails?category=${category}`);
  };

  const handleAccountFilter = (account: string) => {
    dispatch(emailActions.setFilters({ account }));
    navigate(`/emails?account=${account}`);
  };

  const handleFilterToggle = (filterType: string, value: boolean) => {
    const newFilters = { ...state.filters };
    
    switch (filterType) {
      case 'read':
        newFilters.isRead = value;
        break;
      case 'starred':
        newFilters.isStarred = value;
        break;
      default:
        return;
    }
    
    dispatch(emailActions.setFilters(newFilters));
    
    // Navigate to emails with filters
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        params.append(key, val.toString());
      }
    });
    navigate(`/emails?${params.toString()}`);
  };

  const mainNavigation: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      badge: state.stats?.byCategory.find(cat => cat.category === 'interested')?.count
    },
    {
      id: 'emails',
      label: 'Email Inbox',
      icon: <EmailIcon />,
      path: '/emails',
      badge: state.stats?.totalEmails
    },
    {
      id: 'search',
      label: 'Search & Filter',
      icon: <SearchIcon />,
      path: '/search'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings'
    }
  ];

  const categoryItems = [
    { category: EmailCategory.INTERESTED, label: 'Interested', color: '#4caf50' },
    { category: EmailCategory.MEETING_BOOKED, label: 'Meeting Booked', color: '#2196f3' },
    { category: EmailCategory.NOT_INTERESTED, label: 'Not Interested', color: '#f44336' },
    { category: EmailCategory.SPAM, label: 'Spam', color: '#ff9800' },
    { category: EmailCategory.OUT_OF_OFFICE, label: 'Out of Office', color: '#9c27b0' },
    { category: EmailCategory.BUSINESS, label: 'Business', color: '#607d8b' },
    { category: EmailCategory.PERSONAL, label: 'Personal', color: '#795548' },
    { category: EmailCategory.SUPPORT, label: 'Support', color: '#3f51b5' },
    { category: EmailCategory.PROMOTIONAL, label: 'Promotional', color: '#ff5722' },
    { category: EmailCategory.NEWSLETTER, label: 'Newsletter', color: '#009688' }
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Drawer
      variant="permanent"
      className="sidebar-drawer animate-slideInLeft"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
          borderRight: '1px solid #333333',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          top: '64px', // Below header
          height: 'calc(100vh - 64px)',
          transition: 'all 0.3s ease'
        },
      }}
    >
      <Box sx={{ overflow: 'auto', py: 2, height: '100%', display: 'flex', flexDirection: 'column' }} className="sidebar-content">
        {/* Main Navigation */}
        <List className="main-nav">
          {mainNavigation.map((item) => (
            <ListItem key={item.id} disablePadding className="nav-item">
              <ListItemButton
                selected={isActiveRoute(item.path)}
                onClick={() => navigate(item.path)}
                className={`nav-button ${isActiveRoute(item.path) ? 'active' : ''}`}
                sx={{
                  borderRadius: 'var(--radius-md)',
                  mx: 1.5,
                  my: 0.5,
                  transition: 'var(--transition-base)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&.Mui-selected': {
                    background: 'linear-gradient(90deg, rgba(0, 119, 255, 0.15), rgba(121, 40, 202, 0.15))',
                    boxShadow: 'var(--shadow-md)',
                    borderLeft: `3px solid var(--color-primary)`,
                    '&:hover': {
                      background: 'linear-gradient(90deg, rgba(0, 119, 255, 0.2), rgba(121, 40, 202, 0.2))',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'var(--color-primary)',
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      WebkitTextFillColor: 'transparent',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(255, 255, 255, 0.03)',
                      opacity: 0,
                      transition: 'var(--transition-base)'
                    }
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: `3px solid rgba(0, 119, 255, 0.3)`,
                    transform: 'translateX(2px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }} className="nav-icon">
                  {item.badge ? (
                    <Badge 
                      badgeContent={item.badge} 
                      color="secondary" 
                      max={999}
                      sx={{
                        '& .MuiBadge-badge': {
                          background: 'linear-gradient(90deg, #0077ff, #7928ca)',
                          fontWeight: 'bold'
                        }
                      }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.label} className="nav-text" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 1 }} />

        {/* Analytics & Reports */}
        <List className="analytics-list">
          <ListItemButton 
            onClick={() => handleSectionToggle('analytics')}
            className="section-header"
            sx={{
              borderRadius: 1.5,
              mx: 1.5,
              my: 0.5,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.03)',
              }
            }}
          >
            <ListItemIcon className="section-icon">
              <Analytics sx={{ color: '#4CAF50' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Analytics & Reports" 
              className="section-title"
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: 600,
                }
              }}
            />
            {expandedSections.includes('analytics') ? <ExpandLess className="expand-icon" /> : <ExpandMore className="expand-icon" />}
          </ListItemButton>

          <Collapse in={expandedSections.includes('analytics')} timeout="auto" unmountOnExit className="analytics-collapse">
            <List component="div" disablePadding className="analytics-items">
              <ListItem disablePadding className="analytics-item">
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    borderRadius: 1.5, 
                    mx: 1.5,
                    my: 0.2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.03)',
                      pl: 4.5,
                    }
                  }}
                  onClick={() => navigate('/')}
                  className="analytics-button"
                >
                  <ListItemIcon sx={{ minWidth: 36 }} className="analytics-icon">
                    <BarChart sx={{ color: '#4CAF50', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Overview Charts"
                    className="analytics-text"
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      } 
                    }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding className="analytics-item">
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    borderRadius: 1.5, 
                    mx: 1.5,
                    my: 0.2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.03)',
                      pl: 4.5,
                    }
                  }}
                  onClick={() => navigate('/')}
                  className="analytics-button"
                >
                  <ListItemIcon sx={{ minWidth: 36 }} className="analytics-icon">
                    <Timeline sx={{ color: '#2196F3', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Trend Analysis"
                    className="analytics-text"
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      } 
                    }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding className="analytics-item">
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    borderRadius: 1.5, 
                    mx: 1.5,
                    my: 0.2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.03)',
                      pl: 4.5,
                    }
                  }}
                  onClick={() => navigate('/')}
                  className="analytics-button"
                >
                  <ListItemIcon sx={{ minWidth: 36 }} className="analytics-icon">
                    <PieChart sx={{ color: '#FF9800', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Category Breakdown"
                    className="analytics-text"
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      } 
                    }}
                  />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding className="analytics-item">
                <ListItemButton
                  sx={{ 
                    pl: 4, 
                    borderRadius: 1.5, 
                    mx: 1.5,
                    my: 0.2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.03)',
                      pl: 4.5,
                    }
                  }}
                  onClick={() => navigate('/')}
                  className="analytics-button"
                >
                  <ListItemIcon sx={{ minWidth: 36 }} className="analytics-icon">
                    <Insights sx={{ color: '#9C27B0', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="AI Insights"
                    className="analytics-text"
                    sx={{ 
                      '& .MuiListItemText-primary': { 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      } 
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>
        </List>

        <Divider sx={{ my: 1 }} />

        {/* Email Categories */}
        <List className="category-list">
          <ListItemButton 
            onClick={() => handleSectionToggle('categories')}
            className="section-header"
            sx={{
              borderRadius: 1.5,
              mx: 1.5,
              my: 0.5,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.03)',
              }
            }}
          >
            <ListItemIcon className="section-icon">
              <Label sx={{ color: '#7928ca' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Categories" 
              className="section-title"
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: 600,
                }
              }}
            />
            {statsLoading ? (
              <CircularProgress 
                size={18} 
                sx={{ 
                  color: '#0077ff',
                }} 
              />
            ) : expandedSections.includes('categories') ? (
              <ExpandLess className="expand-icon" />
            ) : (
              <ExpandMore className="expand-icon" />
            )}
          </ListItemButton>

          <Collapse in={expandedSections.includes('categories')} timeout="auto" unmountOnExit className="category-collapse">
            <List component="div" disablePadding className="category-items">
              {categoryItems.map((item) => {
                const count = getCategoryCount(item.category);
                return (
                  <ListItem key={item.category} disablePadding className="category-item">
                    <ListItemButton
                      sx={{ 
                        pl: 4, 
                        borderRadius: 1.5, 
                        mx: 1.5,
                        my: 0.2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.03)',
                          pl: 4.5,
                        }
                      }}
                      onClick={() => handleCategoryFilter(item.category)}
                      className="category-button"
                    >
                      <ListItemIcon sx={{ minWidth: 36 }} className="category-icon">
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: item.color,
                            boxShadow: `0 0 10px ${item.color}40`
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label}
                        className="category-text"
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          } 
                        }}
                      />
                      {count > 0 && (
                        <Chip
                          label={count}
                          size="small"
                          className="category-chip"
                          sx={{
                            bgcolor: `${item.color}20`,
                            color: item.color,
                            border: `1px solid ${item.color}40`,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            height: 20,
                            minWidth: 20
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        </List>

        <Divider sx={{ my: 1 }} />

        {/* Accounts */}
        {state.stats?.byAccount && state.stats.byAccount.length > 0 && (
          <>
            <List className="accounts-list">
              <ListItemButton 
                onClick={() => handleSectionToggle('accounts')}
                className="section-header"
                sx={{
                  borderRadius: 1.5,
                  mx: 1.5,
                  my: 0.5,
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.03)',
                  }
                }}
              >
                <ListItemIcon className="section-icon">
                  <AccountCircle sx={{ color: '#0077ff' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Accounts" 
                  className="section-title"
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: 600,
                    }
                  }}
                />
                {expandedSections.includes('accounts') ? <ExpandLess className="expand-icon" /> : <ExpandMore className="expand-icon" />}
              </ListItemButton>

              <Collapse in={expandedSections.includes('accounts')} timeout="auto" unmountOnExit className="accounts-collapse">
                <List component="div" disablePadding className="account-items">
                  {state.stats.byAccount.map((account) => (
                    <ListItem key={account.account} disablePadding className="account-item">
                      <ListItemButton
                        sx={{ 
                          pl: 4, 
                          borderRadius: 1.5, 
                          mx: 1.5,
                          my: 0.2,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.03)',
                            pl: 4.5,
                          }
                        }}
                        onClick={() => handleAccountFilter(account.account)}
                        className="account-button"
                      >
                        <ListItemIcon sx={{ minWidth: 36 }} className="account-icon">
                          <Folder 
                            fontSize="small" 
                            sx={{ 
                              color: '#0077ff', 
                              filter: 'drop-shadow(0 0 2px rgba(0, 119, 255, 0.2))' 
                            }} 
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={account.account}
                          className="account-text"
                          sx={{ 
                            '& .MuiListItemText-primary': { 
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            } 
                          }}
                        />
                        <Chip
                          label={account.count}
                          size="small"
                          className="account-chip"
                          sx={{
                            bgcolor: 'rgba(0, 119, 255, 0.1)',
                            color: '#0077ff',
                            border: '1px solid rgba(0, 119, 255, 0.3)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem', 
                            height: 20
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </List>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} className="accounts-divider" />
          </>
        )}

        {/* Quick Filters */}
        <List className="filters-list">
          <ListItemButton 
            onClick={() => handleSectionToggle('filters')}
            className="section-header"
            sx={{
              borderRadius: 1.5,
              mx: 1.5,
              my: 0.5,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.03)',
              }
            }}
          >
            <ListItemIcon className="section-icon">
              <FilterList sx={{ color: '#7928ca' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Quick Filters" 
              className="section-title"
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: 600,
                }
              }}
            />
            {expandedSections.includes('filters') ? <ExpandLess className="expand-icon" /> : <ExpandMore className="expand-icon" />}
          </ListItemButton>

          <Collapse in={expandedSections.includes('filters')} timeout="auto" unmountOnExit className="filters-collapse">
            <Box sx={{ px: 3, py: 1.5 }} className="filter-options">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={state.filters.isRead === false}
                    onChange={(e) => handleFilterToggle('read', !e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0077ff',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 119, 255, 0.08)',
                        },
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(0, 119, 255, 0.5)',
                      },
                    }}
                    className="filter-switch"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="filter-label">
                    <MarkEmailRead fontSize="small" sx={{ color: '#0077ff' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Unread Only</Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0.5 }}
                className="filter-control"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={state.filters.isStarred === true}
                    onChange={(e) => handleFilterToggle('starred', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#7928ca',
                        '&:hover': {
                          backgroundColor: 'rgba(121, 40, 202, 0.08)',
                        },
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(121, 40, 202, 0.5)',
                      },
                    }}
                    className="filter-switch"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="filter-label">
                    <Star fontSize="small" sx={{ color: '#7928ca' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Starred Only</Typography>
                  </Box>
                }
                sx={{ width: '100%', m: 0.5 }}
                className="filter-control"
              />
            </Box>
          </Collapse>
        </List>

        {/* Sync Status Summary */}
        {state.syncStatus && (
          <>
            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }} className="sync-divider" />
            <Box sx={{ px: 3, py: 1.5 }} className="sync-status-box">
              <Typography 
                variant="caption" 
                className="sync-status-title"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.7rem'
                }}
                gutterBottom
              >
                Sync Status
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
                className="sync-status-content"
              >
                <Typography 
                  variant="body2"
                  className="sync-status-count"
                  sx={{
                    fontWeight: 500
                  }}
                >
                  {state.syncStatus.connectedAccounts} / {state.syncStatus.totalAccounts} Connected
                </Typography>
                <Chip
                  label={state.syncStatus.isRunning ? 'Running' : 'Stopped'}
                  size="small"
                  className="sync-status-chip"
                  sx={{
                    bgcolor: state.syncStatus.isRunning ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                    color: state.syncStatus.isRunning ? '#69f0ae' : '#ff5252',
                    border: `1px solid ${state.syncStatus.isRunning ? 'rgba(46, 125, 50, 0.5)' : 'rgba(211, 47, 47, 0.5)'}`,
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    height: 24
                  }}
                />
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
