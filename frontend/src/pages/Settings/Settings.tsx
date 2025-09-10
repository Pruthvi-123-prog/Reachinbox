import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Chip
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Refresh,
  ExpandMore,
  Check,
  Close,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface EmailAccount {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  isActive: boolean;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
}

interface UserSettings {
  id: string;
  emailsPerPage: number;
  defaultView: string;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  autoRefresh: boolean;
  refreshInterval: number;
  timezone: string;
  dateFormat: string;
  signature: string;
}

const Settings: React.FC = () => {
  // State for tab management
  const [tabValue, setTabValue] = useState(0);
  
  // State for managing accounts
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  
  // State for managing webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  
  // State for user settings
  const [userSettings, setUserSettings] = useState<UserSettings>({
    id: 'current-user',
    emailsPerPage: 20,
    defaultView: 'inbox',
    notifications: true,
    theme: 'system',
    autoRefresh: true,
    refreshInterval: 5,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MMM d, yyyy',
    signature: ''
  });
  
  // Notification state
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch settings data when component mounts
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    setLoading(true);
    
    try {
      // Remove mock data; leave empty until real API exists
      setAccounts([]);
      setWebhooks([]);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setLoading(false);
      showNotification('Failed to load settings', 'error');
    }
  };
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Account management
  const openAccountDialog = (account: EmailAccount | null = null) => {
    setSelectedAccount(account || {
      id: '',
      name: '',
      host: '',
      port: 993,
      user: '',
      password: '',
      tls: true,
      isActive: true
    } as EmailAccount);
    setAccountDialogOpen(true);
  };
  
  const closeAccountDialog = () => {
    setSelectedAccount(null);
    setAccountDialogOpen(false);
  };
  
  const saveAccount = () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      if (selectedAccount.id) {
        // Update existing account
        setAccounts(prev => prev.map(acc => 
          acc.id === selectedAccount.id ? selectedAccount : acc
        ));
        showNotification('Account updated successfully', 'success');
      } else {
        // Add new account
        const newAccount = {
          ...selectedAccount,
          id: Date.now().toString() // Generate temporary ID
        };
        setAccounts(prev => [...prev, newAccount]);
        showNotification('Account added successfully', 'success');
      }
      
      closeAccountDialog();
      setLoading(false);
    } catch (error) {
      console.error('Failed to save account:', error);
      setLoading(false);
      showNotification('Failed to save account', 'error');
    }
  };
  
  const deleteAccount = (id: string) => {
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      showNotification('Account deleted successfully', 'success');
      setLoading(false);
    } catch (error) {
      console.error('Failed to delete account:', error);
      setLoading(false);
      showNotification('Failed to delete account', 'error');
    }
  };
  
  const toggleAccountStatus = (id: string, isActive: boolean) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === id ? { ...acc, isActive } : acc
    ));
  };
  
  // Webhook management
  const openWebhookDialog = (webhook: WebhookConfig | null = null) => {
    setSelectedWebhook(webhook || {
      id: '',
      name: '',
      url: '',
      events: [],
      isActive: true
    } as WebhookConfig);
    setWebhookDialogOpen(true);
  };
  
  const closeWebhookDialog = () => {
    setSelectedWebhook(null);
    setWebhookDialogOpen(false);
  };
  
  const saveWebhook = () => {
    if (!selectedWebhook) return;
    
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      if (selectedWebhook.id) {
        // Update existing webhook
        setWebhooks(prev => prev.map(hook => 
          hook.id === selectedWebhook.id ? selectedWebhook : hook
        ));
        showNotification('Webhook updated successfully', 'success');
      } else {
        // Add new webhook
        const newWebhook = {
          ...selectedWebhook,
          id: Date.now().toString() // Generate temporary ID
        };
        setWebhooks(prev => [...prev, newWebhook]);
        showNotification('Webhook added successfully', 'success');
      }
      
      closeWebhookDialog();
      setLoading(false);
    } catch (error) {
      console.error('Failed to save webhook:', error);
      setLoading(false);
      showNotification('Failed to save webhook', 'error');
    }
  };
  
  const deleteWebhook = (id: string) => {
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      setWebhooks(prev => prev.filter(hook => hook.id !== id));
      showNotification('Webhook deleted successfully', 'success');
      setLoading(false);
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      setLoading(false);
      showNotification('Failed to delete webhook', 'error');
    }
  };
  
  const toggleWebhookStatus = (id: string, isActive: boolean) => {
    setWebhooks(prev => prev.map(hook => 
      hook.id === id ? { ...hook, isActive } : hook
    ));
  };
  
  // User settings
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setUserSettings(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setUserSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const saveUserSettings = () => {
    setLoading(true);
    
    try {
      // In a real app, this would be an API call
      // For now we just simulate success
      setTimeout(() => {
        setLoading(false);
        showNotification('Settings saved successfully', 'success');
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setLoading(false);
      showNotification('Failed to save settings', 'error');
    }
  };
  
  // Helper for notifications
  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Accounts" />
          <Tab label="Webhooks" />
          <Tab label="Preferences" />
        </Tabs>
        
        {/* Accounts Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Email Accounts</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => openAccountDialog()}
            >
              Add Account
            </Button>
          </Box>
          
          {accounts.length > 0 ? (
            <List>
              {accounts.map((account) => (
                <Card key={account.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">{account.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.user}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.host}:{account.port} (TLS: {account.tls ? 'Enabled' : 'Disabled'})
                        </Typography>
                      </Box>
                      <Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={account.isActive}
                              onChange={(e) => toggleAccountStatus(account.id, e.target.checked)}
                              color="primary"
                            />
                          }
                          label={account.isActive ? 'Active' : 'Inactive'}
                        />
                        <IconButton onClick={() => openAccountDialog(account)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => deleteAccount(account.id)} color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Alert severity="info">No email accounts configured. Click "Add Account" to get started.</Alert>
          )}
        </TabPanel>
        
        {/* Webhooks Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Webhook Configurations</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => openWebhookDialog()}
            >
              Add Webhook
            </Button>
          </Box>
          
          {webhooks.length > 0 ? (
            <List>
              {webhooks.map((webhook) => (
                <Card key={webhook.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">{webhook.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          URL: {webhook.url}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Events: {webhook.events.join(', ')}
                        </Typography>
                      </Box>
                      <Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={webhook.isActive}
                              onChange={(e) => toggleWebhookStatus(webhook.id, e.target.checked)}
                              color="primary"
                            />
                          }
                          label={webhook.isActive ? 'Active' : 'Inactive'}
                        />
                        <IconButton onClick={() => openWebhookDialog(webhook)}>
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => deleteWebhook(webhook.id)} color="error">
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Alert severity="info">No webhooks configured. Click "Add Webhook" to get started.</Alert>
          )}
        </TabPanel>
        
        {/* Preferences Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Display Settings
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    name="theme"
                    value={userSettings.theme}
                    label="Theme"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System Default</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <TextField
                  fullWidth
                  label="Emails Per Page"
                  name="emailsPerPage"
                  type="number"
                  value={userSettings.emailsPerPage}
                  onChange={handleSettingsChange}
                  InputProps={{ inputProps: { min: 5, max: 100 } }}
                />
              </Box>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Default View</InputLabel>
                  <Select
                    name="defaultView"
                    value={userSettings.defaultView}
                    label="Default View"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="inbox">Inbox</MenuItem>
                    <MenuItem value="unread">Unread</MenuItem>
                    <MenuItem value="starred">Starred</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>Date Format</InputLabel>
                  <Select
                    name="dateFormat"
                    value={userSettings.dateFormat}
                    label="Date Format"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="MMM d, yyyy">May 1, 2023</MenuItem>
                    <MenuItem value="yyyy-MM-dd">2023-05-01</MenuItem>
                    <MenuItem value="dd/MM/yyyy">01/05/2023</MenuItem>
                    <MenuItem value="MM/dd/yyyy">05/01/2023</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.autoRefresh}
                      onChange={handleSwitchChange}
                      name="autoRefresh"
                    />
                  }
                  label="Auto-refresh Inbox"
                />
              </Box>
              {userSettings.autoRefresh && (
                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                  <TextField
                    fullWidth
                    label="Refresh Interval (minutes)"
                    name="refreshInterval"
                    type="number"
                    value={userSettings.refreshInterval}
                    onChange={handleSettingsChange}
                    InputProps={{ inputProps: { min: 1, max: 60 } }}
                  />
                </Box>
              )}
              <Box sx={{ width: '100%' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.notifications}
                      onChange={handleSwitchChange}
                      name="notifications"
                    />
                  }
                  label="Enable Browser Notifications"
                />
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              Email Signature
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Email Signature"
              name="signature"
              value={userSettings.signature}
              onChange={handleSettingsChange}
              placeholder="Enter your email signature here..."
            />
          </Box>
          
          <Box display="flex" justifyContent="flex-end">
            <Button 
              variant="contained" 
              color="primary" 
              onClick={saveUserSettings}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Settings'}
            </Button>
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onClose={closeAccountDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAccount?.id ? 'Edit Email Account' : 'Add Email Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Account Name"
                value={selectedAccount?.name || ''}
                onChange={(e) => setSelectedAccount(prev => ({ ...prev!, name: e.target.value }))}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(66.66% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={selectedAccount?.host || ''}
                  onChange={(e) => setSelectedAccount(prev => ({ ...prev!, host: e.target.value }))}
                  placeholder="imap.example.com"
                />
              </Box>
              <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(33.33% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="Port"
                  type="number"
                  value={selectedAccount?.port || ''}
                  onChange={(e) => setSelectedAccount(prev => ({ ...prev!, port: parseInt(e.target.value) }))}
                />
              </Box>
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Email Address"
                value={selectedAccount?.user || ''}
                onChange={(e) => setSelectedAccount(prev => ({ ...prev!, user: e.target.value }))}
                placeholder="user@example.com"
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={selectedAccount?.password || ''}
                onChange={(e) => setSelectedAccount(prev => ({ ...prev!, password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedAccount?.tls || false}
                    onChange={(e) => setSelectedAccount(prev => ({ ...prev!, tls: e.target.checked }))}
                  />
                }
                label="Use TLS"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAccountDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={saveAccount} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onClose={closeWebhookDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedWebhook?.id ? 'Edit Webhook' : 'Add Webhook'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Webhook Name"
                value={selectedWebhook?.name || ''}
                onChange={(e) => setSelectedWebhook(prev => ({ ...prev!, name: e.target.value }))}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="URL"
                value={selectedWebhook?.url || ''}
                onChange={(e) => setSelectedWebhook(prev => ({ ...prev!, url: e.target.value }))}
                placeholder="https://example.com/webhooks/email"
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <FormControl fullWidth>
                <InputLabel>Events</InputLabel>
                <Select
                  multiple
                  value={selectedWebhook?.events || []}
                  onChange={(e) => {
                    const value = e.target.value as string[];
                    setSelectedWebhook(prev => ({ ...prev!, events: value }));
                  }}
                  label="Events"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="email.received">Email Received</MenuItem>
                  <MenuItem value="email.read">Email Read</MenuItem>
                  <MenuItem value="email.starred">Email Starred</MenuItem>
                  <MenuItem value="email.categorized">Email Categorized</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedWebhook?.isActive || false}
                    onChange={(e) => setSelectedWebhook(prev => ({ ...prev!, isActive: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeWebhookDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={saveWebhook} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={closeNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
