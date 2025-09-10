import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { logger } from '../utils/logger';
import { EmailMessage, EmailSearchQuery, EmailSearchResult, EmailCategory, EmailAccount, EmailAddress } from '../models/email';
import { EventEmitter } from 'events';

/**
 * Format a date for IMAP search criteria (DD-MMM-YYYY format)
 */
function formatDateForIMAP(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export class ImapEmailService extends EventEmitter {
  private accounts: EmailAccount[] = [];
  private connections: Map<string, Imap> = new Map();
  private emailCache: Map<string, EmailMessage[]> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.configureAccountsFromEnv();
  }

  private configureAccountsFromEnv(): void {
    const accounts: EmailAccount[] = [];

    // IMAP Account 1
    if (process.env.IMAP1_USER && process.env.IMAP1_PASSWORD) {
      accounts.push({
        id: 'account1',
        name: 'Primary Email',
        host: process.env.IMAP1_HOST || 'imap.gmail.com',
        port: parseInt(process.env.IMAP1_PORT || '993'),
        user: process.env.IMAP1_USER,
        password: process.env.IMAP1_PASSWORD,
        tls: process.env.IMAP1_TLS === 'true',
        isActive: true
      });
    }

    // IMAP Account 2
    if (process.env.IMAP2_USER && process.env.IMAP2_PASSWORD) {
      accounts.push({
        id: 'account2',
        name: 'Secondary Email',
        host: process.env.IMAP2_HOST || 'imap.outlook.com',
        port: parseInt(process.env.IMAP2_PORT || '993'),
        user: process.env.IMAP2_USER,
        password: process.env.IMAP2_PASSWORD,
        tls: process.env.IMAP2_TLS === 'true',
        isActive: true
      });
    }

    this.accounts = accounts;
    logger.info(`Configured ${accounts.length} email accounts for direct IMAP access`);
  }

  async initialize(): Promise<boolean> {
    try {
      logger.info('Initializing IMAP Email Service...');
      
      // Connect to all configured email accounts
      for (const account of this.accounts) {
        await this.connectAccount(account);
      }

      // Load initial email cache
      await this.loadEmailCache();

      this.isInitialized = true;
      logger.info('IMAP Email Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize IMAP Email Service:', error);
      return false;
    }
  }

  private async connectAccount(account: EmailAccount): Promise<void> {
    return new Promise((resolve, reject) => {
      const imapConfig = {
        user: account.user,
        password: account.password,
        host: account.host,
        port: account.port,
        tls: account.tls,
        tlsOptions: {
          rejectUnauthorized: false,
          servername: account.host
        },
        authTimeout: 15000,
        connTimeout: 15000
      };

      const imap = new Imap(imapConfig);

      imap.once('ready', () => {
        logger.info(`Connected to IMAP account: ${account.name} (${account.user})`);
        this.connections.set(account.id, imap);
        resolve();
      });

      imap.once('error', (error: any) => {
        logger.error(`IMAP connection error for ${account.name}:`, error);
        reject(error);
      });

      imap.once('end', () => {
        logger.info(`IMAP connection ended for ${account.name}`);
        this.connections.delete(account.id);
      });

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        logger.warn(`Connection timeout for ${account.name}`);
        reject(new Error(`Connection timeout for ${account.name}`));
      }, 20000);

      imap.once('ready', () => {
        clearTimeout(timeout);
      });

      imap.once('error', () => {
        clearTimeout(timeout);
      });

      try {
        imap.connect();
      } catch (error) {
        clearTimeout(timeout);
        logger.error(`Failed to initiate connection for ${account.name}:`, error);
        reject(error);
      }
    });
  }

  private async loadEmailCache(): Promise<void> {
    logger.info('Loading email cache from IMAP servers...');
    
    for (const [accountId, imap] of this.connections) {
      try {
        const emails = await this.fetchEmailsFromAccount(imap, accountId, 100); // Load last 100 emails
        this.emailCache.set(accountId, emails);
        logger.info(`Loaded ${emails.length} emails for account ${accountId}`);
      } catch (error) {
        logger.error(`Failed to load emails for account ${accountId}:`, error);
        this.emailCache.set(accountId, []);
      }
    }
  }

  private async fetchEmailsFromAccount(imap: Imap, accountId: string, limit: number = 50): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', true, async (error: any, box: any) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          // Get recent emails
          const searchCriteria = ['ALL'];
          imap.search(searchCriteria, async (searchError: any, uids: number[]) => {
            if (searchError) {
              logger.warn(`Search error for account ${accountId}, using fallback:`, searchError);
              // Fallback: get the most recent UIDs
              const totalMessages = box.messages.total;
              const startUid = Math.max(1, totalMessages - limit + 1);
              uids = Array.from({length: Math.min(limit, totalMessages)}, (_, i) => startUid + i);
            }

            if (uids.length === 0) {
              resolve([]);
              return;
            }

            // Sort UIDs in descending order (newest first) and limit
            uids.sort((a, b) => b - a);
            const limitedUids = uids.slice(0, limit);

            try {
              const emails = await this.processEmailUIDs(imap, limitedUids, accountId);
              resolve(emails);
            } catch (processError) {
              logger.error(`Failed to process emails for account ${accountId}:`, processError);
              resolve([]);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async processEmailUIDs(imap: Imap, uids: number[], accountId: string): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const fetch = imap.fetch(uids, {
        bodies: '',
        struct: true,
        markSeen: false
      });

      const emails: EmailMessage[] = [];

      fetch.on('message', (msg: any, seqno: number) => {
        let buffer = '';

        msg.on('body', (stream: any) => {
          stream.on('data', (chunk: any) => {
            buffer += chunk.toString('utf8');
          });
        });

        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer);
            const email = await this.parseEmailMessage(parsed, accountId);
            emails.push(email);
          } catch (parseError) {
            logger.error(`Failed to parse email ${seqno}:`, parseError);
          }
        });
      });

      fetch.once('error', (error: any) => {
        logger.error(`Fetch error:`, error);
        reject(error);
      });

      fetch.once('end', () => {
        resolve(emails);
      });
    });
  }

  private async parseEmailMessage(parsed: ParsedMail, accountId: string): Promise<EmailMessage> {
    // Apply basic categorization rules
    let initialCategory = EmailCategory.INTERESTED;
    let confidence = 0.5;
    
    const subject = parsed.subject?.toLowerCase() || '';
    const body = parsed.text?.toLowerCase() || '';
    
    if (subject.includes('newsletter') || subject.includes('digest')) {
      initialCategory = EmailCategory.NEWSLETTER;
      confidence = 0.6;
    } else if (subject.includes('meeting') || subject.includes('appointment')) {
      initialCategory = EmailCategory.MEETING_BOOKED;
      confidence = 0.7;
    } else if (subject.includes('invoice') || subject.includes('payment')) {
      initialCategory = EmailCategory.BUSINESS;
      confidence = 0.6;
    } else if (subject.includes('out of office') || body.includes('out of office')) {
      initialCategory = EmailCategory.OUT_OF_OFFICE;
      confidence = 0.8;
    } else if (subject.includes('discount') || subject.includes('offer')) {
      initialCategory = EmailCategory.PROMOTIONAL;
      confidence = 0.6;
    }
    
    const email: EmailMessage = {
      id: this.generateEmailId(parsed),
      messageId: parsed.messageId || '',
      account: accountId,
      folder: 'INBOX',
      sender: this.parseEmailAddress(parsed.from),
      recipients: this.parseEmailAddresses(parsed.to),
      cc: this.parseEmailAddresses(parsed.cc),
      bcc: this.parseEmailAddresses(parsed.bcc),
      subject: parsed.subject || '',
      body: parsed.text || '',
      bodyText: parsed.text || '',
      bodyHtml: parsed.html || '',
      date: parsed.date || new Date(),
      flags: [],
      attachments: (parsed.attachments || []).map(att => ({
        filename: att.filename || '',
        contentType: att.contentType || '',
        size: att.size || 0
      })),
      category: initialCategory,
      confidence: confidence,
      isRead: false,
      isStarred: false,
      threadId: '',
      inReplyTo: parsed.inReplyTo || '',
      references: parsed.references ? (Array.isArray(parsed.references) ? parsed.references : [parsed.references]) : [],
      priority: 'normal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return email;
  }

  private generateEmailId(parsed: ParsedMail): string {
    const content = `${parsed.messageId || ''}${parsed.subject || ''}${parsed.date?.getTime() || Date.now()}`;
    return require('crypto').createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private parseEmailAddress(address: any): EmailAddress {
    if (!address) return { address: '', name: '' };
    if (typeof address === 'string') return { address: address, name: '' };
    if (Array.isArray(address) && address.length > 0) {
      return {
        address: address[0].address || '',
        name: address[0].name || ''
      };
    }
    if (address.address) return { address: address.address, name: address.name || '' };
    return { address: '', name: '' };
  }

  private parseEmailAddresses(addresses: any): EmailAddress[] {
    if (!addresses) return [];
    if (typeof addresses === 'string') return [{ address: addresses, name: '' }];
    if (Array.isArray(addresses)) {
      return addresses.map(addr => ({
        address: addr.address || '',
        name: addr.name || ''
      })).filter(addr => addr.address);
    }
    if (addresses.address) return [{ address: addresses.address, name: addresses.name || '' }];
    return [];
  }

  async searchEmails(query: EmailSearchQuery): Promise<EmailSearchResult> {
    if (!this.isInitialized) {
      logger.warn('IMAP Email Service not initialized, returning empty results');
      return {
        emails: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      };
    }

    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = this.applyFilters(allEmails, query);

      // Apply text search if provided
      if (query.q) {
        filteredEmails = this.applyTextSearch(filteredEmails, query.q);
      }

      // Sort emails
      filteredEmails = this.sortEmails(filteredEmails, query.sortBy, query.sortOrder);

      // Apply pagination
      const total = filteredEmails.length;
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

      return {
        emails: paginatedEmails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      };

    } catch (error) {
      logger.error('Failed to search emails:', error);
      throw error;
    }
  }

  private applyFilters(emails: EmailMessage[], query: EmailSearchQuery): EmailMessage[] {
    return emails.filter(email => {
      if (query.account && email.account !== query.account) return false;
      if (query.folder && email.folder !== query.folder) return false;
      if (query.category && email.category !== query.category) return false;
      if (query.sender && !email.sender.address.toLowerCase().includes(query.sender.toLowerCase())) return false;
      if (query.subject && !email.subject.toLowerCase().includes(query.subject.toLowerCase())) return false;
      if (query.isRead !== undefined && email.isRead !== query.isRead) return false;
      if (query.isStarred !== undefined && email.isStarred !== query.isStarred) return false;
      if (query.hasAttachments !== undefined) {
        const hasAttachments = email.attachments && email.attachments.length > 0;
        if (hasAttachments !== query.hasAttachments) return false;
      }
      if (query.dateFrom && email.date < query.dateFrom) return false;
      if (query.dateTo && email.date > query.dateTo) return false;
      return true;
    });
  }

  private applyTextSearch(emails: EmailMessage[], searchTerm: string): EmailMessage[] {
    const term = searchTerm.toLowerCase();
    return emails.filter(email => {
      return email.subject.toLowerCase().includes(term) ||
             email.bodyText.toLowerCase().includes(term) ||
             email.sender.name.toLowerCase().includes(term) ||
             email.sender.address.toLowerCase().includes(term);
    });
  }

  private sortEmails(emails: EmailMessage[], sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc'): EmailMessage[] {
    return emails.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
        case 'sender':
          aValue = a.sender.name || a.sender.address;
          bValue = b.sender.name || b.sender.address;
          break;
        case 'subject':
          aValue = a.subject;
          bValue = b.subject;
          break;
        default:
          aValue = a.date.getTime();
          bValue = b.date.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  async getEmailById(id: string): Promise<EmailMessage | null> {
    if (!this.isInitialized) {
      return null;
    }

    for (const emails of this.emailCache.values()) {
      const email = emails.find(e => e.id === id);
      if (email) {
        return email;
      }
    }

    return null;
  }

  async updateEmail(id: string, update: Partial<EmailMessage>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IMAP Email Service not initialized');
    }

    for (const [accountId, emails] of this.emailCache.entries()) {
      const emailIndex = emails.findIndex(e => e.id === id);
      if (emailIndex !== -1) {
        emails[emailIndex] = {
          ...emails[emailIndex],
          ...update,
          updatedAt: new Date()
        };
        logger.debug(`Updated email: ${id}`);
        return;
      }
    }

    throw new Error(`Email with id ${id} not found`);
  }

  async deleteEmail(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IMAP Email Service not initialized');
    }

    for (const [accountId, emails] of this.emailCache.entries()) {
      const emailIndex = emails.findIndex(e => e.id === id);
      if (emailIndex !== -1) {
        emails.splice(emailIndex, 1);
        logger.debug(`Deleted email: ${id}`);
        return;
      }
    }

    throw new Error(`Email with id ${id} not found`);
  }

  async getEmailStats(): Promise<any> {
    if (!this.isInitialized) {
      return {
        by_account: { buckets: [] },
        by_category: { buckets: [] },
        by_folder: { buckets: [] }
      };
    }

    const stats = {
      by_account: new Map<string, number>(),
      by_category: new Map<string, number>(),
      by_folder: new Map<string, number>()
    };

    for (const emails of this.emailCache.values()) {
      for (const email of emails) {
        // Count by account
        const accountCount = stats.by_account.get(email.account) || 0;
        stats.by_account.set(email.account, accountCount + 1);

        // Count by category
        const categoryCount = stats.by_category.get(email.category) || 0;
        stats.by_category.set(email.category, categoryCount + 1);

        // Count by folder
        const folderCount = stats.by_folder.get(email.folder) || 0;
        stats.by_folder.set(email.folder, folderCount + 1);
      }
    }

    return {
      by_account: {
        buckets: Array.from(stats.by_account.entries()).map(([key, count]) => ({ key, doc_count: count }))
      },
      by_category: {
        buckets: Array.from(stats.by_category.entries()).map(([key, count]) => ({ key, doc_count: count }))
      },
      by_folder: {
        buckets: Array.from(stats.by_folder.entries()).map(([key, count]) => ({ key, doc_count: count }))
      }
    };
  }

  async refreshCache(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IMAP Email Service not initialized');
    }

    logger.info('Refreshing email cache...');
    await this.loadEmailCache();
    logger.info('Email cache refreshed');
  }

  async close(): Promise<void> {
    logger.info('Closing IMAP Email Service...');
    
    for (const [accountId, imap] of this.connections) {
      try {
        if (imap.state === 'authenticated') {
          imap.end();
        }
      } catch (error) {
        logger.error(`Failed to close connection for account ${accountId}:`, error);
      }
    }

    this.connections.clear();
    this.emailCache.clear();
    this.isInitialized = false;
    logger.info('IMAP Email Service closed');
  }

  /**
   * Get email analytics data based on various filters
   */
  async getEmailAnalytics({ dateFrom, dateTo, account, category }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
    category?: string;
  }) {
    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = allEmails.filter(email => {
        if (email.date < dateFrom || email.date > dateTo) return false;
        if (account && email.account !== account) return false;
        if (category && email.category !== category) return false;
        return true;
      });

      // Calculate analytics
      const stats = {
        byAccount: new Map<string, number>(),
        byCategory: new Map<string, number>(),
        byFolder: new Map<string, number>()
      };

      for (const email of filteredEmails) {
        // Count by account
        const accountCount = stats.byAccount.get(email.account) || 0;
        stats.byAccount.set(email.account, accountCount + 1);

        // Count by category
        const categoryCount = stats.byCategory.get(email.category) || 0;
        stats.byCategory.set(email.category, categoryCount + 1);

        // Count by folder
        const folderCount = stats.byFolder.get(email.folder) || 0;
        stats.byFolder.set(email.folder, folderCount + 1);
      }

      return {
        totalEmails: filteredEmails.length,
        byAccount: Array.from(stats.byAccount.entries()).map(([key, count]) => ({ key, doc_count: count })),
        byCategory: Array.from(stats.byCategory.entries()).map(([key, count]) => ({ key, doc_count: count })),
        byFolder: Array.from(stats.byFolder.entries()).map(([key, count]) => ({ key, doc_count: count }))
      };
      
    } catch (error) {
      logger.error('Failed to get email analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get email volume by day for the specified date range
   */
  async getEmailVolumeByDay({ dateFrom, dateTo, account, category }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
    category?: string;
  }) {
    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = allEmails.filter(email => {
        if (email.date < dateFrom || email.date > dateTo) return false;
        if (account && email.account !== account) return false;
        if (category && email.category !== category) return false;
        return true;
      });

      // Group by day
      const dailyCounts = new Map<string, number>();
      
      for (const email of filteredEmails) {
        const dayKey = email.date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const count = dailyCounts.get(dayKey) || 0;
        dailyCounts.set(dayKey, count + 1);
      }

      // Convert to array format
      return Array.from(dailyCounts.entries()).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date));
      
    } catch (error) {
      logger.error('Failed to get email volume by day:', error);
      throw error;
    }
  }
  
  /**
   * Get email volume by hour of day
   */
  async getEmailVolumeByHour({ dateFrom, dateTo, account, category }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
    category?: string;
  }) {
    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = allEmails.filter(email => {
        if (email.date < dateFrom || email.date > dateTo) return false;
        if (account && email.account !== account) return false;
        if (category && email.category !== category) return false;
        return true;
      });

      // Initialize hourly data (0-23)
      const hourlyData = Array(24).fill(0).map((_, i) => ({
        hour: i.toString().padStart(2, '0'),
        count: 0
      }));

      // Count emails by hour
      for (const email of filteredEmails) {
        const hour = email.date.getHours();
        hourlyData[hour].count++;
      }

      return hourlyData;
      
    } catch (error) {
      logger.error('Failed to get email volume by hour:', error);
      throw error;
    }
  }
  
  /**
   * Get category distribution trends over time
   */
  async getCategoryTrends({ dateFrom, dateTo, account }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
  }) {
    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = allEmails.filter(email => {
        if (email.date < dateFrom || email.date > dateTo) return false;
        if (account && email.account !== account) return false;
        return true;
      });

      // Group by week and category
      const weeklyTrends = new Map<string, Map<string, number>>();
      
      for (const email of filteredEmails) {
        // Get week start date (Monday)
        const weekStart = new Date(email.date);
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - daysToMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyTrends.has(weekKey)) {
          weeklyTrends.set(weekKey, new Map());
        }
        
        const weekData = weeklyTrends.get(weekKey)!;
        const categoryCount = weekData.get(email.category) || 0;
        weekData.set(email.category, categoryCount + 1);
      }

      // Convert to array format
      return Array.from(weeklyTrends.entries()).map(([date, categories]) => {
        const result: any = { date };
        for (const [category, count] of categories) {
          result[category] = count;
        }
        return result;
      }).sort((a, b) => a.date.localeCompare(b.date));
      
    } catch (error) {
      logger.error('Failed to get category trends:', error);
      throw error;
    }
  }
  
  /**
   * Calculate response time metrics for emails
   */
  async getResponseTimeMetrics({ dateFrom, dateTo, account }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
  }) {
    try {
      // Get all emails from cache
      let allEmails: EmailMessage[] = [];
      for (const emails of this.emailCache.values()) {
        allEmails = allEmails.concat(emails);
      }

      // Apply filters
      let filteredEmails = allEmails.filter(email => {
        if (email.date < dateFrom || email.date > dateTo) return false;
        if (account && email.account !== account) return false;
        return true;
      });

      // Simple response time metrics based on thread analysis
      const threads: Map<string, any[]> = new Map();
      const responseTimes: number[] = [];
      
      filteredEmails.forEach(email => {
        // Group by threadId if available, otherwise by subject or a combination
        const threadKey = email.threadId || email.id;
        
        if (!threads.has(threadKey)) {
          threads.set(threadKey, []);
        }
        
        threads.get(threadKey)!.push({
          id: email.id,
          date: email.date,
          inReplyTo: email.inReplyTo
        });
      });
      
      // Calculate response times for each thread
      threads.forEach(thread => {
        if (thread.length > 1) {
          // Sort by date
          thread.sort((a, b) => a.date.getTime() - b.date.getTime());
          
          // Calculate time differences
          for (let i = 1; i < thread.length; i++) {
            const timeDiff = thread[i].date.getTime() - thread[i-1].date.getTime();
            // Convert to hours
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            // Only include reasonable response times (less than 7 days)
            if (hoursDiff < 24 * 7) {
              responseTimes.push(hoursDiff);
            }
          }
        }
      });
      
      // Calculate metrics
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
        
      const maxResponseTime = responseTimes.length > 0
        ? Math.max(...responseTimes)
        : 0;
        
      const minResponseTime = responseTimes.length > 0
        ? Math.min(...responseTimes)
        : 0;
        
      // Return the metrics
      return {
        averageResponseTimeHours: avgResponseTime,
        maxResponseTimeHours: maxResponseTime,
        minResponseTimeHours: minResponseTime,
        medianResponseTimeHours: this.calculateMedian(responseTimes),
        responseTimeDistribution: this.calculateDistribution(responseTimes)
      };
      
    } catch (error) {
      logger.error('Failed to get response time metrics:', error);
      throw error;
    }
  }
  
  /**
   * Calculate the median value of an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }
  
  /**
   * Calculate distribution of values into buckets
   */
  private calculateDistribution(values: number[]): Array<{range: string; count: number}> {
    const distribution = [
      { range: "< 1 hour", count: 0 },
      { range: "1-4 hours", count: 0 },
      { range: "4-12 hours", count: 0 },
      { range: "12-24 hours", count: 0 },
      { range: "> 24 hours", count: 0 }
    ];
    
    values.forEach(value => {
      if (value < 1) {
        distribution[0].count++;
      } else if (value < 4) {
        distribution[1].count++;
      } else if (value < 12) {
        distribution[2].count++;
      } else if (value < 24) {
        distribution[3].count++;
      } else {
        distribution[4].count++;
      }
    });
    
    return distribution;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      connectedAccounts: this.connections.size,
      accountStatus: Array.from(this.connections.keys()).map(accountId => ({
        accountId,
        isConnected: true,
        emailCount: this.emailCache.get(accountId)?.length || 0
      })),
      totalAccounts: this.accounts.length,
      totalEmails: Array.from(this.emailCache.values()).reduce((sum, emails) => sum + emails.length, 0)
    };
  }
}
