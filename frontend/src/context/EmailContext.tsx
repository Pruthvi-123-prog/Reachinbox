import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  disposition?: string;
}

export enum EmailCategory {
  INTERESTED = 'interested',
  MEETING_BOOKED = 'meeting_booked',
  NOT_INTERESTED = 'not_interested',
  SPAM = 'spam',
  OUT_OF_OFFICE = 'out_of_office',
  PROMOTIONAL = 'promotional',
  NEWSLETTER = 'newsletter',
  PERSONAL = 'personal',
  BUSINESS = 'business',
  SUPPORT = 'support',
  UNCATEGORIZED = 'uncategorized'
}

export interface EmailMessage {
  id: string;
  messageId: string;
  account: string;
  folder: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyText: string;
  bodyHtml: string;
  date: Date;
  flags: string[];
  attachments?: EmailAttachment[];
  category?: EmailCategory;
  confidence?: number;
  isRead: boolean;
  isStarred: boolean;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  priority?: 'high' | 'normal' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSearchQuery {
  q?: string;
  account?: string;
  folder?: string;
  category?: EmailCategory;
  sender?: string;
  subject?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'sender' | 'subject';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailSearchResult {
  emails: EmailMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EmailStats {
  totalEmails: number;
  byAccount: Array<{ account: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byFolder: Array<{ folder: string; count: number }>;
}

export interface SyncStatus {
  isRunning: boolean;
  connectedAccounts: number;
  totalAccounts: number;
  lastSync: { [accountId: string]: Date };
}

export interface VolumeByTimeData {
  date: string;
  count: number;
}

export interface HourlyVolumeData {
  hour: string;
  count: number;
}

export interface CategoryTrendData {
  date: string;
  [categoryName: string]: string | number;
}

export interface ResponseTimeDistribution {
  range: string;
  count: number;
}

export interface ResponseTimeMetrics {
  averageResponseTimeHours: number;
  maxResponseTimeHours: number;
  minResponseTimeHours: number;
  medianResponseTimeHours: number;
  responseTimeDistribution: ResponseTimeDistribution[];
}

export interface AnalyticsData {
  summary: {
    totalEmails: number;
    byAccount: Array<{ key: string; doc_count: number }>;
    byCategory: Array<{ key: string; doc_count: number }>;
    byFolder: Array<{ key: string; doc_count: number }>;
  };
  dailyVolume: VolumeByTimeData[];
  hourlyVolume: HourlyVolumeData[];
  categoryTrends: CategoryTrendData[];
  responseTimeMetrics: ResponseTimeMetrics;
}

export interface ResponseTimeMetrics {
  averageResponseTimeHours: number;
  maxResponseTimeHours: number;
  minResponseTimeHours: number;
  medianResponseTimeHours: number;
  responseTimeDistribution: Array<{ range: string; count: number }>;
}

export interface AnalyticsData {
  summary: {
    totalEmails: number;
    byAccount: Array<{ key: string; doc_count: number }>;
    byCategory: Array<{ key: string; doc_count: number }>;
    byFolder: Array<{ key: string; doc_count: number }>;
  };
  dailyVolume: VolumeByTimeData[];
  hourlyVolume: HourlyVolumeData[];
  categoryTrends: CategoryTrendData[];
  responseTimeMetrics: ResponseTimeMetrics;
}

// State interface
interface EmailState {
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  searchResults: EmailSearchResult | null;
  stats: EmailStats | null;
  syncStatus: SyncStatus | null;
  loading: boolean;
  error: string | null;
  searchQuery: EmailSearchQuery;
  filters: {
    account?: string;
    category?: EmailCategory;
    folder?: string;
    isRead?: boolean;
    isStarred?: boolean;
  };
}

// Action types
type EmailAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EMAILS'; payload: EmailMessage[] }
  | { type: 'SET_SELECTED_EMAIL'; payload: EmailMessage | null }
  | { type: 'SET_SEARCH_RESULTS'; payload: EmailSearchResult }
  | { type: 'SET_STATS'; payload: EmailStats }
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'UPDATE_EMAIL'; payload: { id: string; updates: Partial<EmailMessage> } }
  | { type: 'SET_SEARCH_QUERY'; payload: EmailSearchQuery }
  | { type: 'SET_FILTERS'; payload: Partial<EmailState['filters']> }
  | { type: 'CLEAR_SEARCH' };

// Initial state
const initialState: EmailState = {
  emails: [],
  selectedEmail: null,
  searchResults: null,
  stats: null,
  syncStatus: null,
  loading: false,
  error: null,
  searchQuery: {
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'desc'
  },
  filters: {}
};

// Reducer
function emailReducer(state: EmailState, action: EmailAction): EmailState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_EMAILS':
      return { ...state, emails: action.payload, loading: false, error: null };
    
    case 'SET_SELECTED_EMAIL':
      return { ...state, selectedEmail: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, loading: false, error: null };
    
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    
    case 'UPDATE_EMAIL':
      const updatedEmails = state.emails.map(email =>
        email.id === action.payload.id 
          ? { ...email, ...action.payload.updates }
          : email
      );
      const updatedSearchResults = state.searchResults ? {
        ...state.searchResults,
        emails: state.searchResults.emails.map(email =>
          email.id === action.payload.id 
            ? { ...email, ...action.payload.updates }
            : email
        )
      } : null;
      
      return {
        ...state,
        emails: updatedEmails,
        searchResults: updatedSearchResults,
        selectedEmail: state.selectedEmail?.id === action.payload.id 
          ? { ...state.selectedEmail, ...action.payload.updates }
          : state.selectedEmail
      };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'CLEAR_SEARCH':
      return { ...state, searchResults: null, searchQuery: initialState.searchQuery };
    
    default:
      return state;
  }
}

// Context
interface EmailContextType {
  state: EmailState;
  dispatch: React.Dispatch<EmailAction>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

// Provider component
interface EmailProviderProps {
  children: ReactNode;
}

export function EmailProvider({ children }: EmailProviderProps) {
  const [state, dispatch] = useReducer(emailReducer, initialState);

  return (
    <EmailContext.Provider value={{ state, dispatch }}>
      {children}
    </EmailContext.Provider>
  );
}

// Custom hook
export function useEmailContext() {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmailContext must be used within an EmailProvider');
  }
  return context;
}

// Helper functions for common operations
export const emailActions = {
  setLoading: (loading: boolean): EmailAction => ({ type: 'SET_LOADING', payload: loading }),
  setError: (error: string | null): EmailAction => ({ type: 'SET_ERROR', payload: error }),
  setEmails: (emails: EmailMessage[]): EmailAction => ({ type: 'SET_EMAILS', payload: emails }),
  setSelectedEmail: (email: EmailMessage | null): EmailAction => ({ type: 'SET_SELECTED_EMAIL', payload: email }),
  setSearchResults: (results: EmailSearchResult): EmailAction => ({ type: 'SET_SEARCH_RESULTS', payload: results }),
  setStats: (stats: EmailStats): EmailAction => ({ type: 'SET_STATS', payload: stats }),
  setSyncStatus: (status: SyncStatus): EmailAction => ({ type: 'SET_SYNC_STATUS', payload: status }),
  updateEmail: (id: string, updates: Partial<EmailMessage>): EmailAction => ({ type: 'UPDATE_EMAIL', payload: { id, updates } }),
  setSearchQuery: (query: EmailSearchQuery): EmailAction => ({ type: 'SET_SEARCH_QUERY', payload: query }),
  setFilters: (filters: Partial<EmailState['filters']>): EmailAction => ({ type: 'SET_FILTERS', payload: filters }),
  clearSearch: (): EmailAction => ({ type: 'CLEAR_SEARCH' })
};
