import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import { ArrowBack, Send, Attachment } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const ComposeEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const action = queryParams.get('action');
  const emailId = queryParams.get('id');
  
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load the original email if we're forwarding
  useEffect(() => {
    const fetchOriginalEmail = async () => {
      if (action === 'forward' && emailId) {
        try {
          setLoading(true);
          const response = await api.get(`/api/emails/${emailId}`);
          if (response.data?.data) {
            const email = response.data.data;
            setOriginalEmail(email);
            
            // Set subject with 'Fwd:' prefix if not already present
            let fwdSubject = email.subject || '';
            if (!fwdSubject.toLowerCase().startsWith('fwd:')) {
              fwdSubject = `Fwd: ${fwdSubject}`;
            }
            setSubject(fwdSubject);
            
            // Format forwarded message body
            const forwardedBody = `
            
---------- Forwarded message ---------
From: ${email.from.name} <${email.from.email}>
Date: ${new Date(email.date).toLocaleString()}
Subject: ${email.subject}
To: ${email.to.map((r: any) => `${r.name} <${r.email}>`).join(', ')}

${email.bodyText || ''}`;
            
            setBody(forwardedBody);
          }
        } catch (err) {
          console.error('Failed to load original email:', err);
          setError('Failed to load the original email for forwarding');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchOriginalEmail();
  }, [action, emailId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // This would be implemented if we were actually sending emails
    // For now, just navigate back to the email list
    navigate('/emails');
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto', mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5">
          {action === 'forward' ? 'Forward Email' : 'Compose New Email'}
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="To"
          variant="outlined"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="CC"
          variant="outlined"
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          margin="normal"
        />
        
        <TextField
          fullWidth
          label="BCC"
          variant="outlined"
          value={bcc}
          onChange={(e) => setBcc(e.target.value)}
          margin="normal"
        />
        
        <TextField
          fullWidth
          label="Subject"
          variant="outlined"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="Message"
          variant="outlined"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          margin="normal"
          required
          multiline
          rows={10}
        />
        
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Button
            variant="outlined"
            startIcon={<Attachment />}
          >
            Attach Files
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<Send />}
            disabled={loading}
          >
            Send
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ComposeEmail;
