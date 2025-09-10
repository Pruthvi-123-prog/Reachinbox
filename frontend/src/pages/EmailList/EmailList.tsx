import React, { useEffect, useState } from 'react';
import {
  Box, 
  Typography, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip, 
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachmentIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEmailContext } from '../../context/EmailContext';
import api from '../../services/api';

const EmailList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useEmailContext();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '30days'>('all');

  // Parse query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const categoryFilter = queryParams.get('category');

  useEffect(() => {
    const fetchEmails = async () => {
      setLoading(true);
      try {
        const params: any = { 
          limit: 100, // Increased limit to get more emails
          sort: 'date',
          order: 'desc'
        };
        
        if (categoryFilter) {
          params.category = categoryFilter;
        }
        
        if (searchQuery) {
          params.q = searchQuery;
        }
        
        // Add date filter for last 30 days
        if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          params.dateFrom = thirtyDaysAgo.toISOString();
        }
        
        const response = await api.get('/api/emails', { params });
        console.log('API Response:', response.data);
        
        let emailData: any[] = [];
        
        if (response.data && response.data.data && response.data.data.emails) {
          // Handle the nested structure
          emailData = response.data.data.emails;
        } else if (response.data && response.data.emails) {
          // Handle direct emails array
          emailData = response.data.emails;
        } else {
          console.error('Unexpected API response format:', response.data);
          setEmails([]);
          return;
        }
        
        // Process emails to ensure proper format
        const processedEmails = emailData.map(email => {
          // Ensure sender is properly formatted
          if (email.sender && typeof email.sender === 'object') {
            // Already formatted correctly
            return email;
          } else if (typeof email.sender === 'string') {
            // Convert string sender to object format
            return {
              ...email,
              sender: {
                name: '',
                address: email.sender
              }
            };
          } else {
            // Handle missing sender
            return {
              ...email,
              sender: {
                name: '',
                address: 'unknown@example.com'
              }
            };
          }
        });
        
        setEmails(processedEmails);
      } catch (error) {
        console.error('Failed to fetch emails:', error);
        setEmails([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmails();
  }, [categoryFilter, searchQuery, dateFilter]);

  const handleEmailClick = (emailId: string) => {
    navigate(`/emails/${emailId}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await api.post('/api/emails/sync');
      setTimeout(() => {
        // Refetch emails after sync
        const fetchEmails = async () => {
          const response = await api.get('/api/emails');
          setEmails(response.data.emails || []);
          setLoading(false);
        };
        fetchEmails();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string | undefined) => {
    // Return gray for undefined or null categories
    if (!category) return '#757575';
    
    const colors: Record<string, string> = {
      'interested': '#4caf50',
      'meeting_booked': '#2196f3',
      'not_interested': '#f44336',
      'spam': '#ff9800',
      'out_of_office': '#9c27b0',
      'business': '#607d8b',
      'personal': '#795548',
      'support': '#009688',
      'promotional': '#ff5722',
      'newsletter': '#3f51b5',
      'uncategorized': '#757575'
    };
    
    // Handle both formats (with underscore or hyphen)
    const normalizedCategory = category.replace('-', '_').toLowerCase();
    return colors[normalizedCategory] || '#757575';
  };
  
  const getCategoryDisplayName = (category: string | undefined) => {
    if (!category) return 'Uncategorized';
    
    // Convert category_name to Category Name format
    return category
      .replace('_', ' ')
      .replace('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Box p={3} className="email-list-container">
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        className="email-list-header"
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          className="page-title"
          sx={{ 
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(90deg, #ffffff, #a0a0a0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px'
          }}
        >
          {categoryFilter ? `${categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)} Emails` : 'All Emails'}
        </Typography>
        <Box display="flex" gap={2} className="email-actions">
          <TextField
            placeholder="Search emails..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-field"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="search-icon" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: 'rgba(15, 15, 15, 0.6)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none'
                },
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0, 119, 255, 0.15)',
                  border: '1px solid rgba(0, 119, 255, 0.3)'
                },
                '&.Mui-focused': {
                  boxShadow: '0 4px 20px rgba(0, 119, 255, 0.2)',
                  border: '1px solid rgba(0, 119, 255, 0.5)'
                }
              }
            }}
            sx={{ width: '300px' }}
          />
          <Tooltip title="Show last 30 days">
            <Chip
              label={dateFilter === '30days' ? "Last 30 Days" : "All Time"}
              color={dateFilter === '30days' ? "primary" : "default"}
              onClick={() => setDateFilter(dateFilter === '30days' ? 'all' : '30days')}
              className="date-filter-chip"
              sx={{ 
                cursor: 'pointer',
                bgcolor: dateFilter === '30days' ? 'rgba(0, 119, 255, 0.2)' : 'rgba(15, 15, 15, 0.6)',
                border: dateFilter === '30days' ? '1px solid rgba(0, 119, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: dateFilter === '30days' ? '#0077ff' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: dateFilter === '30days' ? 'rgba(0, 119, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Refresh emails">
            <span>
              <IconButton 
                onClick={handleRefresh} 
                disabled={loading}
                className="refresh-button"
                sx={{
                  bgcolor: 'rgba(15, 15, 15, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 119, 255, 0.1)',
                    border: '1px solid rgba(0, 119, 255, 0.3)'
                  }
                }}
              >
                {loading ? (
                  <CircularProgress 
                    size={24} 
                    sx={{ color: '#0077ff' }} 
                  />
                ) : (
                  <RefreshIcon sx={{ color: '#0077ff' }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      
      {dateFilter === '30days' && emails.length > 0 && (
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 3, 
            p: 3,
            bgcolor: 'rgba(15, 15, 15, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          }}
          className="summary-container"
        >
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(90deg, #0077ff, #7928ca)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
            className="summary-title"
          >
            Last 30 Days Summary
          </Typography>
          <Box 
            display="flex" 
            flexWrap="wrap" 
            gap={1.5}
            className="category-chips"
          >
            {Object.entries(
              emails.reduce((acc: Record<string, number>, email) => {
                const category = email.category || 'uncategorized';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
              }, {})
            ).map(([category, count]) => (
              <Chip 
                key={category}
                label={`${getCategoryDisplayName(category)}: ${count}`}
                className="category-chip"
                sx={{ 
                  backgroundColor: `${getCategoryColor(category)}20`,
                  color: getCategoryColor(category),
                  border: `1px solid ${getCategoryColor(category)}50`,
                  fontWeight: 'bold',
                  '&:hover': {
                    backgroundColor: `${getCategoryColor(category)}30`,
                    boxShadow: `0 2px 10px ${getCategoryColor(category)}20`,
                  }
                }}
              />
            ))}
          </Box>
        </Paper>
      )}
      
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: 'rgba(15, 15, 15, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}
        className="email-list-paper"
      >
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4} className="loading-state">
            <CircularProgress 
              size={40} 
              thickness={3}
              sx={{ 
                color: '#0077ff',
                boxShadow: '0 0 20px rgba(0, 119, 255, 0.2)'
              }} 
            />
          </Box>
        ) : emails.length === 0 ? (
          <Box p={4} textAlign="center" className="empty-state">
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 500
              }}
            >
              No emails found. {categoryFilter && 'Try removing filters or '} 
              <Box 
                component="span" 
                sx={{ 
                  cursor: 'pointer', 
                  color: '#0077ff',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }} 
                onClick={handleRefresh}
              >
                refresh
              </Box>
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%' }} className="email-list">
            {emails.map((email, index) => (
              <React.Fragment key={email.id || index}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.03)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
                    },
                    py: 1.5,
                    borderLeft: email.isRead ? 'none' : '4px solid #0077ff',
                    position: 'relative'
                  }}
                  className={`email-item ${!email.isRead ? 'unread' : ''}`}
                  onClick={() => handleEmailClick(email.id)}
                >
                  <ListItemAvatar className="email-avatar">
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(15, 15, 15, 0.8)',
                        border: `2px solid ${email.category ? getCategoryColor(email.category) : 'rgba(255, 255, 255, 0.2)'}`,
                        color: email.category ? getCategoryColor(email.category) : 'rgba(255, 255, 255, 0.7)',
                        boxShadow: email.category ? `0 0 10px ${getCategoryColor(email.category)}40` : 'none',
                        fontWeight: 'bold'
                      }}
                      className="sender-avatar"
                    >
                      {(() => {
                        // Handle different sender formats
                        if (typeof email.sender === 'string') {
                          return email.sender.charAt(0).toUpperCase();
                        } else if (email.sender && typeof email.sender === 'object') {
                          // Handle object with name and address properties
                          return (email.sender.name || email.sender.address || 'U').charAt(0).toUpperCase();
                        } else {
                          return 'U';
                        }
                      })()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5} className="email-header">
                        <Typography 
                          variant="subtitle1" 
                          className="email-subject"
                          sx={{ 
                            fontWeight: email.isRead ? 500 : 700,
                            maxWidth: '70%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: email.isRead ? 'rgba(255, 255, 255, 0.85)' : 'white',
                            letterSpacing: '0.2px'
                          }}
                        >
                          {email.subject || '(No Subject)'}
                        </Typography>
                        <Box className="email-metadata">
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: email.isRead ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.7)',
                              fontWeight: email.isRead ? 400 : 600
                            }}
                            className="email-date"
                          >
                            {formatDate(email.date)}
                          </Typography>
                          {email.isStarred && (
                            <StarIcon 
                              fontSize="small" 
                              sx={{ 
                                ml: 1, 
                                color: '#ffab00',
                                filter: 'drop-shadow(0 0 2px rgba(255, 171, 0, 0.5))'
                              }} 
                              className="star-icon"
                            />
                          )}
                          {email.attachments && email.attachments.length > 0 && (
                            <AttachmentIcon 
                              fontSize="small" 
                              sx={{ ml: 1, color: '#0077ff' }} 
                              className="attachment-icon"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box className="email-details">
                        <Typography 
                          variant="body2" 
                          className="email-sender"
                          sx={{
                            display: 'block',
                            maxWidth: '90%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: email.isRead ? 'rgba(255, 255, 255, 0.7)' : '#0077ff',
                            fontWeight: email.isRead ? 500 : 600,
                            mb: 0.5
                          }}
                        >
                          From: {(() => {
                            // Handle different sender formats
                            if (typeof email.sender === 'string') {
                              return email.sender;
                            } else if (email.sender && typeof email.sender === 'object') {
                              // Handle object with name and address properties
                              return email.sender.name ? `${email.sender.name} <${email.sender.address}>` : email.sender.address;
                            } else {
                              return 'Unknown';
                            }
                          })()}
                        </Typography>
                        <Box 
                          display="flex" 
                          justifyContent="space-between" 
                          alignItems="center"
                          className="email-content-row"
                          sx={{ mt: 0.5 }}
                        >
                          <Typography 
                            variant="body2"
                            className="email-snippet"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              color: 'rgba(255, 255, 255, 0.5)',
                              maxWidth: '75%'
                            }}
                          >
                            {email.bodyText?.substring(0, 120) || 'No content'}
                          </Typography>
                          
                          {email.category && (
                            <Chip 
                              label={getCategoryDisplayName(email.category)} 
                              size="small"
                              className="category-chip"
                              sx={{ 
                                backgroundColor: `${getCategoryColor(email.category)}20`,
                                color: getCategoryColor(email.category),
                                border: `1px solid ${getCategoryColor(email.category)}40`,
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                ml: 'auto'
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < emails.length - 1 && (
                  <Divider 
                    variant="inset" 
                    component="li" 
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      opacity: 0.5
                    }}
                    className="list-divider"
                  />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default EmailList;
