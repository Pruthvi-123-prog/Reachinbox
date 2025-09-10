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
  Paper,
  Grid,
  Stack,
  Badge,
  Button,
  Menu,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachmentIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  MoreVert as MoreIcon,
  MarkEmailRead as ReadIcon,
  MarkEmailUnread as UnreadIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Label as LabelIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEmailContext } from '../../context/EmailContext';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailItem {
  id: string;
  subject: string;
  sender: {
    name?: string;
    address?: string;
  } | string;
  date: string;
  category?: string;
  isRead: boolean;
  isStarred?: boolean;
  bodyText?: string;
  attachments?: any[];
}

const EmailListRedesigned: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useEmailContext();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'sender'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Parse query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const urlCategoryFilter = queryParams.get('category');

  useEffect(() => {
    if (urlCategoryFilter) {
      setCategoryFilter(urlCategoryFilter);
    }
  }, [urlCategoryFilter]);

  useEffect(() => {
    fetchEmails();
  }, [categoryFilter, searchQuery, dateFilter, sortBy, sortOrder]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params: any = { 
        limit: 100,
        sort: sortBy,
        order: sortOrder
      };
      
      if (categoryFilter && categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      
      if (searchQuery) {
        params.q = searchQuery;
      }
      
      if (dateFilter !== 'all') {
        const days = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        params.dateFrom = dateFrom.toISOString();
      }
      
      const response = await api.get('/api/emails', { params });
      
      let emailData: any[] = [];
      
      if (response.data?.data?.emails) {
        emailData = response.data.data.emails;
      } else if (response.data?.emails) {
        emailData = response.data.emails;
      } else {
        setEmails([]);
        return;
      }
      
      const processedEmails = emailData.map(email => ({
        ...email,
        sender: typeof email.sender === 'string' 
          ? { name: '', address: email.sender }
          : email.sender || { name: '', address: 'unknown@example.com' }
      }));
      
      setEmails(processedEmails);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = (emailId: string) => {
    navigate(`/emails/${emailId}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await api.post('/api/emails/sync');
      setTimeout(fetchEmails, 2000);
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
    
    const normalizedCategory = category.replace('-', '_').toLowerCase();
    return colors[normalizedCategory] || '#757575';
  };
  
  const getCategoryDisplayName = (category: string | undefined) => {
    if (!category) return 'Uncategorized';
    
    return category
      .replace('_', ' ')
      .replace('-', ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getSenderInitials = (sender: any) => {
    if (typeof sender === 'string') {
      return sender.charAt(0).toUpperCase();
    } else if (sender?.name) {
      return sender.name.charAt(0).toUpperCase();
    } else if (sender?.address) {
      return sender.address.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getSenderDisplayName = (sender: any) => {
    if (typeof sender === 'string') {
      return sender;
    } else if (sender?.name && sender?.address) {
      return `${sender.name} <${sender.address}>`;
    } else if (sender?.address) {
      return sender.address;
    }
    return 'Unknown';
  };

  const categories = [
    { value: 'all', label: 'All Categories', count: emails.length },
    { value: 'interested', label: 'Interested', count: emails.filter(e => e.category === 'interested').length },
    { value: 'meeting_booked', label: 'Meetings', count: emails.filter(e => e.category === 'meeting_booked').length },
    { value: 'business', label: 'Business', count: emails.filter(e => e.category === 'business').length },
    { value: 'personal', label: 'Personal', count: emails.filter(e => e.category === 'personal').length },
    { value: 'promotional', label: 'Promotional', count: emails.filter(e => e.category === 'promotional').length },
    { value: 'spam', label: 'Spam', count: emails.filter(e => e.category === 'spam').length },
    { value: 'uncategorized', label: 'Uncategorized', count: emails.filter(e => !e.category).length }
  ];

  const EmailCard = ({ email, index }: { email: EmailItem; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        sx={{
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: email.isRead ? '1px solid #333333' : '1px solid #4CAF50',
          background: email.isRead 
            ? 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)'
            : 'linear-gradient(135deg, #1a1a1a 0%, rgba(76, 175, 80, 0.05) 100%)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
            borderColor: '#4CAF50'
          }
        }}
        onClick={() => handleEmailClick(email.id)}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <Avatar
              sx={{
                bgcolor: getCategoryColor(email.category),
                width: 48,
                height: 48,
                fontSize: '1.2rem',
                fontWeight: 'bold',
                boxShadow: `0 0 15px ${getCategoryColor(email.category)}40`
              }}
            >
              {getSenderInitials(email.sender)}
            </Avatar>
            
            <Box flexGrow={1} minWidth={0}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: email.isRead ? 500 : 700,
                    color: email.isRead ? 'text.primary' : 'primary.main',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '70%'
                  }}
                >
                  {email.subject || '(No Subject)'}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500
                    }}
                  >
                    {formatDate(email.date)}
                  </Typography>
                  
                  {email.isStarred && (
                    <StarIcon sx={{ color: '#ffab00', fontSize: 18 }} />
                  )}
                  
                  {email.attachments && email.attachments.length > 0 && (
                    <AttachmentIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  )}
                </Box>
              </Box>
              
              <Typography
                variant="body2"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {getSenderDisplayName(email.sender)}
              </Typography>
              
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  mb: 2
                }}
              >
                {email.bodyText || 'No content available'}
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                {email.category && (
                  <Chip
                    label={getCategoryDisplayName(email.category)}
                    size="small"
                    sx={{
                      backgroundColor: `${getCategoryColor(email.category)}20`,
                      color: getCategoryColor(email.category),
                      border: `1px solid ${getCategoryColor(email.category)}40`,
                      fontWeight: 600
                    }}
                  />
                )}
                
                <Box display="flex" gap={1}>
                  {!email.isRead && (
                    <Chip
                      label="Unread"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const EmailListItem = ({ email, index }: { email: EmailItem; index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
    >
      <ListItem
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          borderLeft: email.isRead ? 'none' : '4px solid #4CAF50',
          '&:hover': {
            bgcolor: 'rgba(76, 175, 80, 0.05)',
            transform: 'translateX(4px)'
          },
          py: 2,
          px: 3
        }}
        onClick={() => handleEmailClick(email.id)}
      >
        <ListItemAvatar sx={{ mr: 2 }}>
          <Avatar
            sx={{
              bgcolor: getCategoryColor(email.category),
              width: 40,
              height: 40,
              fontWeight: 'bold',
              boxShadow: `0 0 10px ${getCategoryColor(email.category)}40`
            }}
          >
            {getSenderInitials(email.sender)}
          </Avatar>
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: email.isRead ? 500 : 700,
                  color: email.isRead ? 'text.primary' : 'primary.main',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '60%'
                }}
              >
                {email.subject || '(No Subject)'}
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                >
                  {formatDate(email.date)}
                </Typography>
                
                {email.isStarred && <StarIcon sx={{ color: '#ffab00', fontSize: 16 }} />}
                {email.attachments && email.attachments.length > 0 && (
                  <AttachmentIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                )}
              </Box>
            </Box>
          }
          secondary={
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {getSenderDisplayName(email.sender)}
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '70%'
                  }}
                >
                  {email.bodyText?.substring(0, 100) || 'No content available'}
                </Typography>
                
                {email.category && (
                  <Chip
                    label={getCategoryDisplayName(email.category)}
                    size="small"
                    sx={{
                      backgroundColor: `${getCategoryColor(email.category)}20`,
                      color: getCategoryColor(email.category),
                      border: `1px solid ${getCategoryColor(email.category)}40`,
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  />
                )}
              </Box>
            </Box>
          }
        />
      </ListItem>
    </motion.div>
  );

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(90deg, #4CAF50, #81C784)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              {categoryFilter === 'all' ? 'All Emails' : getCategoryDisplayName(categoryFilter)}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {emails.length} emails found
            </Typography>
          </Box>
          
          <Box display="flex" gap={2} alignItems="center">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="list">
                <ListViewIcon />
              </ToggleButton>
              <ToggleButton value="grid">
                <GridViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            
            <IconButton onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Box>
        </Box>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        <Box display="flex" justifyContent="space-between" width="100%">
                          <span>{cat.label}</span>
                          <Chip label={cat.count} size="small" />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    label="Time Period"
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="7days">Last 7 Days</MenuItem>
                    <MenuItem value="30days">Last 30 Days</MenuItem>
                    <MenuItem value="90days">Last 90 Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    label="Sort By"
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="subject">Subject</MenuItem>
                    <MenuItem value="sender">Sender</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email List/Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {loading ? (
          <Box>
            {[...Array(5)].map((_, index) => (
              <Card key={index} sx={{ mb: 2, background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box flexGrow={1}>
                      <Skeleton variant="text" width="60%" height={24} />
                      <Skeleton variant="text" width="40%" height={20} />
                      <Skeleton variant="text" width="80%" height={16} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : emails.length === 0 ? (
          <Card sx={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' }}>
            <CardContent sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No emails found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search terms
              </Typography>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {emails.map((email, index) => (
              <Grid item xs={12} sm={6} md={4} key={email.id}>
                <EmailCard email={email} index={index} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card sx={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)' }}>
            <List>
              <AnimatePresence>
                {emails.map((email, index) => (
                  <React.Fragment key={email.id}>
                    <EmailListItem email={email} index={index} />
                    {index < emails.length - 1 && (
                      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />
                    )}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </List>
          </Card>
        )}
      </motion.div>
    </Box>
  );
};

export default EmailListRedesigned;

