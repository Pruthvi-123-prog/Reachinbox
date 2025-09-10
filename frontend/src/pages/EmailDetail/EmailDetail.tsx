import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Button,
  IconButton,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Link
} from '@mui/material';
import {
  ArrowBack,
  Star,
  StarBorder,
  Delete,
  Archive,
  MarkEmailRead,
  MarkEmailUnread,
  Reply,
  Forward,
  AttachFile,
  Label,
  Print,
  Error,
  Bolt,
  ContentCopy
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useEmailContext, emailActions } from '../../context/EmailContext';
import api, { emailAPI } from '../../services/api';
import { generateEmailReply, isGroqAvailable, testGroqConnection, fetchGroqModels } from '../../services/groqService';

interface EmailDetailParams {
  id: string;
}

const EmailDetail: React.FC = () => {
  const { id } = useParams<keyof EmailDetailParams>() as EmailDetailParams;
  const navigate = useNavigate();
  const { state, dispatch } = useEmailContext();
  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestedReplies, setSuggestedReplies] = useState<{
    category: string;
    confidence: number;
    replies: Array<{ subject: string; body: string }>;
  } | null>(null);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState(0);
  const [loadingReply, setLoadingReply] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  
  useEffect(() => {
    const fetchEmail = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/emails/${id}`);
        
        // Check response structure
        let emailData = null;
        if (response.data?.data) {
          emailData = response.data.data;
        } else if (response.data && !response.data.success) {
          const errorMessage = response.data.error || 'Failed to load email';
          throw Error(errorMessage);
        }
        
        setEmail(emailData);
        
        // Mark as read if needed
        if (emailData && !emailData.isRead) {
          try {
            await api.patch(`/api/emails/${id}/read`, { isRead: true });
            // Update in context if present
            dispatch(emailActions.updateEmail(id, { isRead: true }));
          } catch (readError) {
            console.error('Failed to mark email as read:', readError);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch email:', err);
        setError(err.message || 'Failed to load email');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmail();
  }, [id, dispatch]);
  
  // Test Groq API connection on component mount
  useEffect(() => {
    const checkGroqConnection = async () => {
      if (isGroqAvailable()) {
        console.log('Groq API key is valid. Testing connection and validating model...');
        
        try {
          // First check if we can fetch models
          const models = await fetchGroqModels();
          
          if (models.length === 0) {
            console.warn('Could not fetch Groq models. Check your network connection and CORS settings.');
            setAiError('Could not validate Groq models. CORS issues may prevent API access.');
            return;
          }
          
          // Now test the connection with the configured model
          const isConnected = await testGroqConnection();
          
          if (!isConnected) {
            // If the model is not available, show a more specific error
            console.warn('Groq API connection test failed. The selected model may not be available.');
            setAiError('Groq API model validation failed. The selected model may be deprecated or unavailable.');
          } else {
            console.log('Groq API connection test successful!');
            // Clear any previous errors
            setAiError(null);
          }
        } catch (err) {
          console.error('Error during Groq connection check:', err);
          setAiError('Failed to check Groq API connection. CORS issues may prevent direct API calls.');
        }
      } else {
        console.warn('Groq API key is not properly configured.');
        setAiError('Groq API key is not properly configured.');
      }
    };
    
    checkGroqConnection();
  }, []);
  
  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };
  
  const toggleStar = async () => {
    if (!email) return;
    
    try {
      const newStarredState = !email.isStarred;
      await api.patch(`/api/emails/${id}`, { isStarred: newStarredState });
      setEmail({...email, isStarred: newStarredState});
      dispatch(emailActions.updateEmail(id, { isStarred: newStarredState }));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };
  
  const toggleRead = async () => {
    if (!email) return;
    
    try {
      const newReadState = !email.isRead;
      await api.patch(`/api/emails/${id}`, { isRead: newReadState });
      setEmail({...email, isRead: newReadState});
      dispatch(emailActions.updateEmail(id, { isRead: newReadState }));
    } catch (err) {
      console.error('Failed to toggle read status:', err);
    }
  };
  
  const archiveEmail = async () => {
    if (!email) return;
    
    try {
      // Update the email's folder to "archive"
      await api.patch(`/api/emails/${id}`, { folder: "archive" });
      setEmail({...email, folder: "archive"});
      dispatch(emailActions.updateEmail(id, { folder: "archive" }));
      // Navigate back after archiving
      navigate(-1);
    } catch (err) {
      console.error('Failed to archive email:', err);
    }
  };
  
  const deleteEmail = async () => {
    if (!email) return;
    
    try {
      // Option 1: Actually delete the email
      // await api.delete(`/api/emails/${id}`);
      
      // Option 2: Move to trash folder
      await api.patch(`/api/emails/${id}`, { folder: "trash" });
      setEmail({...email, folder: "trash"});
      dispatch(emailActions.updateEmail(id, { folder: "trash" }));
      // Navigate back after deleting
      navigate(-1);
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  const [aiError, setAiError] = useState<string | null>(null);
  
  const generateGroqReply = async () => {
    if (!email) return;
    
    setLoadingReply(true);
    setAiError(null);
    
    try {
      console.log("Generating Groq AI reply for email:", id);
      
      // Format email content for Groq
      const emailContent = `
From: ${getSenderName()} <${getSenderEmail()}>
Subject: ${email.subject || '(No Subject)'}
Date: ${formatDate(email.date)}
Category: ${email.category || 'None'}

${email.body || email.bodyText || '(No content)'}
      `;
      
      // Generate reply using Groq API - direct call without fallbacks
      const result = await generateEmailReply(emailContent);
      
      console.log("Successfully generated Groq reply:", result);
      
      setSuggestedReplies({
        category: email.category || 'INTERESTED',
        confidence: result.confidence,
        replies: [{ 
          subject: result.subject,
          body: result.body
        }]
      });
      
      // Set initial selected reply and content
      setSelectedReplyIndex(0);
      setReplyContent(result.body);
      
    } catch (err: any) {
      console.error('Failed to generate Groq reply:', err);
      
      // Set more informative error messages
      if (err.message && err.message.includes('decommissioned')) {
        setAiError(`Model error: ${err.message}. The developer needs to update the code with a current model.`);
      } else if (err.message && err.message.includes('CORS')) {
        setAiError('CORS error: Install a browser extension like "Allow CORS" or "CORS Unblock" to enable direct API calls.');
      } else if (err.message && err.message.includes('API key')) {
        setAiError('Groq API key error: The API key may be invalid or has expired.');
      } else if (err.message && err.message.includes('rate limit')) {
        setAiError('Groq API rate limit reached: Try again later or increase your API plan.');
      } else if (err.message && err.message.includes('400')) {
        setAiError('Groq API returned 400 Bad Request: Check console for detailed error information.');
      } else {
        setAiError(`Groq API error: ${err.message || 'Unknown error occurred'}`);
      }
      
      // Show loading UI but don't set fallback replies - we're not using fallbacks anymore
      
      // Don't set any fallback replies - we want to show only real Groq replies
    } finally {
      setLoadingReply(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSnackbarOpen(true);
      },
      (err) => {
        console.error('Failed to copy text: ', err);
      }
    );
  };
  
  const handleSendReply = () => {
    // In a real app, this would send the email
    console.log('Sending reply with content:', replyContent);
    setShowReplyDialog(false);
    // Show success message
    alert('Reply sent successfully!');
  };
  
  const getSenderName = () => {
    if (!email) return '';
    
    if (email.sender && typeof email.sender === 'object') {
      return email.sender.name || email.sender.address;
    }
    return email.sender || 'Unknown Sender';
  };
  
  const getSenderEmail = () => {
    if (!email) return '';
    
    if (email.sender && typeof email.sender === 'object') {
      return email.sender.address;
    }
    return typeof email.sender === 'string' ? email.sender : 'unknown@example.com';
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'interested': '#4caf50',
      'meeting-booked': '#2196f3',
      'not-interested': '#f44336',
      'spam': '#ff9800',
      'out-of-office': '#9c27b0',
      'business': '#607d8b',
      'personal': '#795548',
      'support': '#009688',
      'promotional': '#ff5722',
      'newsletter': '#3f51b5'
    };
    return colors[category] || '#757575';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !email) {
    return (
      <Box p={3}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleBack}>
              Go Back
            </Button>
          }
        >
          {error || 'Email not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} className="animate-fadeIn">
      {isQuotaExceeded ? (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            backdropFilter: 'var(--glass-blur)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-md)'
          }}
          action={
            <Button color="inherit" size="small" href="https://api.deepseek.com" target="_blank">
              Check Account
            </Button>
          }
        >
          <Typography variant="subtitle2">
            DeepSeek API quota has been exceeded. AI-powered features like suggestions will use fallback responses.
          </Typography>
        </Alert>
      ) : null}
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            variant="outlined"
            size="small"
            sx={{
              borderRadius: 'var(--radius-round)',
              borderColor: 'var(--glass-border)',
              backgroundColor: 'rgba(15, 15, 15, 0.6)',
              '&:hover': {
                borderColor: 'var(--color-primary)',
                transform: 'translateY(-2px)'
              }
            }}
          >
            Back
          </Button>
          
          <Breadcrumbs 
            separator="›" 
            aria-label="breadcrumb" 
            sx={{ 
              mt: 1,
              '& .MuiBreadcrumbs-ol': {
                color: 'var(--color-text-secondary)'
              }
            }}
          >
            <Link component={RouterLink} to="/" color="inherit" sx={{ 
              textDecoration: 'none',
              '&:hover': { color: 'var(--color-primary-light)' } 
            }}>
              Dashboard
            </Link>
            <Link component={RouterLink} to="/emails" color="inherit">
              Emails
            </Link>
            <Typography color="text.primary">View Email</Typography>
          </Breadcrumbs>
        </Box>
        
        <Box>
          <Tooltip title={email.isRead ? "Mark as unread" : "Mark as read"}>
            <IconButton onClick={toggleRead} size="small" sx={{ mr: 1 }}>
              {email.isRead ? <MarkEmailUnread /> : <MarkEmailRead />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={email.isStarred ? "Unstar" : "Star"}>
            <IconButton onClick={toggleStar} size="small" sx={{ mr: 1 }}>
              {email.isStarred ? <Star color="warning" /> : <StarBorder />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Archive">
            <IconButton size="small" sx={{ mr: 1 }} onClick={archiveEmail}>
              <Archive />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete">
            <IconButton size="small" onClick={deleteEmail}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h1" gutterBottom>
            {email.subject || "(No Subject)"}
          </Typography>
          
          {email.category ? (
            <Chip 
              label={email.category}
              size="small"
              sx={{
                backgroundColor: getCategoryColor(email.category),
                color: 'white',
                fontWeight: 500
              }}
            />
          ) : null}
        </Box>
        
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ mr: 2, bgcolor: email.category ? getCategoryColor(email.category) : 'grey.500' }}>
            {getSenderName().charAt(0).toUpperCase()}
          </Avatar>
          
          <Box>
            <Typography variant="subtitle1">
              {getSenderName()}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {`<${getSenderEmail()}>`}
              </Typography>
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              {formatDate(email.date)}
            </Typography>
          </Box>
        </Box>
        
        {email.recipients && email.recipients.length > 0 ? (
          <Typography variant="body2" color="text.secondary" mb={2}>
            To: {email.recipients.map((r: any) => 
              typeof r === 'object' ? r.address : r
            ).join(", ")}
          </Typography>
        ) : null}
        
        {email.attachments && email.attachments.length > 0 ? (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              <AttachFile fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Attachments ({email.attachments.length})
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={1}>
              {email.attachments.map((attachment: any, index: number) => (
                <Chip
                  key={index}
                  label={attachment.filename}
                  size="small"
                  variant="outlined"
                  onClick={() => console.log('Download attachment', attachment)}
                />
              ))}
            </Box>
          </Box>
        ) : null}
        
        <Divider sx={{ my: 2 }} />
        
        <Box>
          {email.bodyHtml ? (
            <Box 
              sx={{ 
                '& a': { color: 'primary.main' },
                '& img': { maxWidth: '100%', height: 'auto' }
              }} 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.bodyHtml) }} 
            />
          ) : (
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {email.bodyText || email.body || 'No content'}
            </Typography>
          )}
        </Box>
      </Paper>
      
      <Box display="flex" gap={2}>
        <Button 
          variant="contained"
          startIcon={<Reply />}
          onClick={() => {
            setShowReplyDialog(true);
            if (!suggestedReplies && !loadingReply) {
              generateGroqReply();
            }
          }}
        >
          Reply
        </Button>
        
        <Button 
          variant="outlined"
          startIcon={<Forward />}
          onClick={() => {
            // Navigate to compose page with pre-filled forwarded content
            navigate(`/emails/compose?action=forward&id=${email.id}`);
          }}
        >
          Forward
        </Button>
        
        <Button 
          variant="outlined"
          startIcon={<Bolt />}
          onClick={generateGroqReply}
          disabled={loadingReply}
        >
          {loadingReply ? 'Generating...' : 'Groq AI Reply'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Box>
      
      {/* AI Error Message */}
      {aiError ? (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2">{aiError}</Typography>
          {aiError.includes('API key') && (
            <Box mt={1}>
              <Button 
                href="https://console.groq.com" 
                target="_blank" 
                variant="outlined" 
                size="small"
                startIcon={<Bolt />}
              >
                Get Groq API Key
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Add your Groq API key to the frontend service.
              </Typography>
            </Box>
          )}
          {aiError.includes('insufficient balance') && (
            <Box mt={1}>
              <Button 
                href="https://platform.deepseek.com/billing" 
                target="_blank" 
                variant="outlined" 
                size="small"
                color="primary"
              >
                Add Funds to DeepSeek Account
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                Your DeepSeek API key is valid but has insufficient balance. You can add funds to your account or get a new API key.
              </Typography>
            </Box>
          )}
        </Alert>
      ) : null}
      
      {/* AI Suggested Reply */}
      {suggestedReplies ? (
        <Card sx={{ mt: 3, border: '1px dashed #2196f3' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">
                <Bolt sx={{ mr: 1, verticalAlign: 'middle' }} />
                Groq AI Suggested Replies
                {aiError ? <Chip 
                  label="Fallback" 
                  color="warning"
                  size="small"
                  sx={{ ml: 1 }}
                /> : null}
              </Typography>
              <Box>
                <Chip 
                  label={`Category: ${suggestedReplies.category}`}
                  color="primary"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label={`Confidence: ${Math.round(suggestedReplies.confidence * 100)}%`} 
                  color={suggestedReplies.confidence > 0.8 ? "success" : "warning"}
                  size="small"
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {/* Reply selection tabs */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              {suggestedReplies.replies.map((reply, index) => (
                <Button
                  key={index}
                  variant={selectedReplyIndex === index ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    setSelectedReplyIndex(index);
                    setReplyContent(reply.body);
                  }}
                >
                  Reply {index + 1}
                </Button>
              ))}
            </Box>
            
            {/* Current selected reply */}
            {suggestedReplies.replies[selectedReplyIndex] && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Subject: {suggestedReplies.replies[selectedReplyIndex].subject}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {suggestedReplies.replies[selectedReplyIndex].body}
                </Typography>
              </>
            )}
          </CardContent>
          <CardActions>
            <Button 
              startIcon={<ContentCopy />}
              onClick={() => suggestedReplies.replies[selectedReplyIndex] && 
                copyToClipboard(suggestedReplies.replies[selectedReplyIndex].body)}
            >
              Copy Text
            </Button>
            <Button 
              variant="contained"
              onClick={() => {
                if (suggestedReplies.replies[selectedReplyIndex]) {
                  setReplyContent(suggestedReplies.replies[selectedReplyIndex].body);
                  setShowReplyDialog(true);
                }
              }}
            >
              Use This Reply
            </Button>
            {aiError ? (
              <Button 
                color="primary"
                startIcon={<Bolt />}
                onClick={generateGroqReply}
              >
                Try Groq Again
              </Button>
            ) : null}
          </CardActions>
        </Card>
      ) : null}
      
      {/* Reply Dialog */}
      <Dialog 
        open={showReplyDialog} 
        onClose={() => setShowReplyDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Reply to: {email?.subject}
          {loadingReply ? <CircularProgress size={24} sx={{ ml: 2 }} /> : null}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="To"
            fullWidth
            variant="outlined"
            value={getSenderEmail()}
            disabled
          />
          <TextField
            margin="dense"
            label="Subject"
            fullWidth
            variant="outlined"
            value={`Re: ${email?.subject}`}
          />
          <TextField
            margin="dense"
            label="Message"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReplyDialog(false)}>Cancel</Button>
          {(!suggestedReplies || aiError) && !loadingReply ? (
            <Button 
              onClick={generateGroqReply}
              startIcon={<Bolt />}
              color={aiError ? "warning" : "primary"}
            >
              {aiError ? "Try Groq Again" : "Get Groq Suggestion"}
            </Button>
          ) : null}
          <Button onClick={handleSendReply} variant="contained">Send</Button>
        </DialogActions>
      </Dialog>
      
      {/* Copy Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message="Copied to clipboard"
      />
      
    </Box>
  );
};

export default EmailDetail;
