export interface EmailAccount {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  isActive: boolean;
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

export interface EmailCategorization {
  category: EmailCategory;
  confidence: number;
  reasoning?: string;
}

export interface SlackNotification {
  channel: string;
  text: string;
  email: EmailMessage;
  timestamp: Date;
}

export interface WebhookPayload {
  event: 'email_categorized' | 'interested_email' | 'meeting_booked';
  email: any;
  category?: EmailCategory;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IMAPConnection {
  accountId: string;
  connection: any; // IMAP connection object
  isConnected: boolean;
  lastSync: Date;
  errorCount: number;
}

export interface SuggestedReply {
  id: string;
  emailId: string;
  subject: string;
  body: string;
  confidence: number;
  context: string[];
  generatedAt: Date;
}
