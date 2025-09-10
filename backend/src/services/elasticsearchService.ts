import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';
import { EmailMessage, EmailSearchQuery, EmailSearchResult, EmailCategory } from '../models/email';

export class ElasticsearchService {
  private client: Client;
  private indexName: string;
  private isAvailable: boolean = false;

  constructor() {
    // Parse the ELASTICSEARCH_HOST environment variable with fallbacks
    const elasticsearchHost = process.env.ELASTICSEARCH_HOST || 
                             process.env.ELASTICSEARCH_URL || 
                             'http://elasticsearch:9200';
    
    logger.info(`Initializing Elasticsearch with host: ${elasticsearchHost}`);
    
    // Extract credentials from the URL if present (Bonsai format)
    const url = new URL(elasticsearchHost);
    let credentials: { username?: string, password?: string } = {};
    
    if (url.username && url.password) {
      credentials.username = url.username;
      credentials.password = url.password;
      logger.debug('Using credentials from the Elasticsearch URL');
    } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      credentials.username = process.env.ELASTICSEARCH_USERNAME;
      credentials.password = process.env.ELASTICSEARCH_PASSWORD;
      logger.debug('Using credentials from environment variables');
    }

    // Create client options
    const clientOptions: any = {
      node: elasticsearchHost,
      requestTimeout: 30000,
      tls: {
        rejectUnauthorized: false
      },
      // For Elasticsearch v8, add these compatibility options
      disablePrototypePoisoningProtection: true
    };
    
    // Add auth if we have credentials
    if (credentials.username && credentials.password) {
      clientOptions.auth = {
        username: credentials.username,
        password: credentials.password
      };
    }
    
    this.client = new Client(clientOptions);
    this.indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'reachinbox'}_emails`;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if Elasticsearch is available
      await this.client.ping();
      logger.info('Connected to Elasticsearch');

      // Create index if it doesn't exist
      await this.createIndexIfNotExists();
      
      this.isAvailable = true;
      return true;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      logger.info('Continuing without Elasticsearch');
      this.isAvailable = false;
      return false;
    }
  }
  
  // Mock implementations for when Elasticsearch is not available
  async mockSearch(): Promise<any> {
    return { hits: { total: { value: 0 }, hits: [] } };
  }
  
  // Method to set availability
  setAvailability(isAvailable: boolean): void {
    this.isAvailable = isAvailable;
  }

  private async createIndexIfNotExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  email_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                messageId: { type: 'keyword' },
                account: { type: 'keyword' },
                folder: { type: 'keyword' },
                sender: {
                  properties: {
                    name: { type: 'text', analyzer: 'email_analyzer' },
                    address: { type: 'keyword' }
                  }
                },
                recipients: {
                  properties: {
                    name: { type: 'text', analyzer: 'email_analyzer' },
                    address: { type: 'keyword' }
                  }
                },
                cc: {
                  properties: {
                    name: { type: 'text', analyzer: 'email_analyzer' },
                    address: { type: 'keyword' }
                  }
                },
                bcc: {
                  properties: {
                    name: { type: 'text', analyzer: 'email_analyzer' },
                    address: { type: 'keyword' }
                  }
                },
                subject: { 
                  type: 'text', 
                  analyzer: 'email_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                body: { type: 'text', analyzer: 'email_analyzer' },
                bodyText: { type: 'text', analyzer: 'email_analyzer' },
                bodyHtml: { type: 'text', index: false },
                date: { type: 'date' },
                flags: { type: 'keyword' },
                attachments: {
                  properties: {
                    filename: { type: 'text' },
                    contentType: { type: 'keyword' },
                    size: { type: 'long' }
                  }
                },
                category: { type: 'keyword' },
                confidence: { type: 'float' },
                isRead: { type: 'boolean' },
                isStarred: { type: 'boolean' },
                threadId: { type: 'keyword' },
                inReplyTo: { type: 'keyword' },
                references: { type: 'keyword' },
                priority: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });

        logger.info(`Created Elasticsearch index: ${this.indexName}`);
      } else {
        logger.info(`Elasticsearch index already exists: ${this.indexName}`);
      }
    } catch (error) {
      logger.error('Failed to create Elasticsearch index:', error);
      throw error;
    }
  }

  async indexEmail(email: EmailMessage): Promise<void> {
    if (!this.isAvailable) {
      logger.error(`Cannot index email ${email.id} - Elasticsearch not available`);
      throw new Error('Elasticsearch service is not available. Please check your connection.');
    }
    
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        body: email,
        refresh: true
      });

      logger.debug(`Indexed email: ${email.id}`);
    } catch (error) {
      logger.error(`Failed to index email ${email.id}:`, error);
      throw error;
    }
  }

  async bulkIndexEmails(emails: EmailMessage[]): Promise<void> {
    if (emails.length === 0) return;
    
    if (!this.isAvailable) {
      logger.error(`Cannot bulk index ${emails.length} emails - Elasticsearch not available`);
      throw new Error('Elasticsearch service is not available. Please check your connection.');
    }

    try {
      const body = emails.flatMap(email => [
        { index: { _index: this.indexName, _id: email.id } },
        email
      ]);

      const response = await this.client.bulk({
        body,
        refresh: true
      });

      if (response.errors) {
        const erroredDocuments = response.items.filter((item: any) => item.index?.error);
        logger.error(`Bulk indexing errors:`, erroredDocuments);
      }

      logger.info(`Bulk indexed ${emails.length} emails`);
    } catch (error) {
      logger.error('Failed to bulk index emails:', error);
      // Don't throw the error, just log it and continue
    }
  }

  async searchEmails(query: EmailSearchQuery): Promise<EmailSearchResult> {
    if (!this.isAvailable) {
      logger.warn('Elasticsearch is not available, returning sample search results');
      
      // Return some sample data when Elasticsearch is down
      // This helps with testing and demonstration
      return {
        emails: [
          {
            id: 'sample1',
            messageId: 'sample1@reachinbox.example.com',
            account: 'demo@example.com',
            subject: 'Welcome to ReachInbox',
            body: 'Thank you for using ReachInbox. This is a sample email shown when Elasticsearch is unavailable.',
            bodyText: 'Thank you for using ReachInbox. This is a sample email shown when Elasticsearch is unavailable.',
            bodyHtml: '<p>Thank you for using ReachInbox. This is a sample email shown when Elasticsearch is unavailable.</p>',
            date: new Date(),
            sender: {
              name: 'ReachInbox Team',
              address: 'support@reachinbox.example.com'
            },
            recipients: [{ name: 'User', address: 'user@example.com' }],
            flags: ['\\Seen'],
            isRead: false,
            isStarred: true,
            category: EmailCategory.NEWSLETTER,
            folder: 'inbox',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'sample2',
            messageId: 'sample2@reachinbox.example.com',
            account: 'demo@example.com',
            subject: 'Getting Started Guide',
            body: 'Here are some tips to get started with email management. This is a sample email shown when Elasticsearch is unavailable.',
            bodyText: 'Here are some tips to get started with email management. This is a sample email shown when Elasticsearch is unavailable.',
            bodyHtml: '<p>Here are some tips to get started with email management. This is a sample email shown when Elasticsearch is unavailable.</p>',
            date: new Date(Date.now() - 86400000), // 1 day ago
            sender: {
              name: 'ReachInbox Support',
              address: 'help@reachinbox.example.com'
            },
            recipients: [{ name: 'User', address: 'user@example.com' }],
            flags: ['\\Seen'],
            isRead: true,
            isStarred: false,
            category: EmailCategory.NEWSLETTER,
            folder: 'inbox',
            createdAt: new Date(Date.now() - 86400000),
            updatedAt: new Date(Date.now() - 86400000)
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
    
    try {
      const {
        q,
        account,
        folder,
        category,
        sender,
        subject,
        dateFrom,
        dateTo,
        isRead,
        isStarred,
        hasAttachments,
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc'
      } = query;

      const must: any[] = [];
      const filter: any[] = [];

      // Text search
      if (q) {
        must.push({
          multi_match: {
            query: q,
            fields: ['subject^2', 'body', 'bodyText', 'sender.name', 'sender.address'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Filters
      if (account) filter.push({ term: { account } });
      if (folder) filter.push({ term: { folder } });
      if (category) filter.push({ term: { category } });
      if (sender) filter.push({ term: { 'sender.address': sender } });
      if (subject) filter.push({ match: { subject } });
      if (isRead !== undefined) filter.push({ term: { isRead } });
      if (isStarred !== undefined) filter.push({ term: { isStarred } });
      if (hasAttachments !== undefined) {
        filter.push({
          exists: hasAttachments ? { field: 'attachments' } : { field: 'attachments' }
        });
      }

      // Date range
      if (dateFrom || dateTo) {
        const dateRange: any = {};
        if (dateFrom) dateRange.gte = dateFrom;
        if (dateTo) dateRange.lte = dateTo;
        filter.push({ range: { date: dateRange } });
      }

      const searchBody: any = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: [
          { [sortBy]: { order: sortOrder } }
        ],
        from: (page - 1) * limit,
        size: limit
      };

      const response = await this.client.search({
        index: this.indexName,
        body: searchBody
      });

      const emails = response.hits.hits.map((hit: any) => hit._source as EmailMessage);
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return {
        emails,
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

  async getEmailById(id: string): Promise<EmailMessage | null> {
    if (!this.isAvailable) {
      logger.debug(`Cannot get email by ID ${id} - Elasticsearch not available`);
      return null;
    }
    
    try {
      const response = await this.client.get({
        index: this.indexName,
        id
      });

      // Convert date strings to Date objects
      const email = response._source as any;
      
      // Transform dates to ensure they're Date objects
      if (email) {
        if (email.date && typeof email.date === 'string') {
          try {
            email.date = new Date(email.date);
          } catch (err) {
            logger.warn(`Failed to parse email date: ${err}`);
            // Keep as string if parsing fails
          }
        }
        
        if (email.createdAt && typeof email.createdAt === 'string') {
          try {
            email.createdAt = new Date(email.createdAt);
          } catch (err) {
            logger.warn(`Failed to parse email createdAt: ${err}`);
          }
        }
        
        if (email.updatedAt && typeof email.updatedAt === 'string') {
          try {
            email.updatedAt = new Date(email.updatedAt);
          } catch (err) {
            logger.warn(`Failed to parse email updatedAt: ${err}`);
          }
        }
      }

      return email as EmailMessage;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error(`Failed to get email ${id}:`, error);
      throw error;
    }
  }

  async updateEmail(id: string, update: Partial<EmailMessage>): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id,
        body: {
          doc: {
            ...update,
            updatedAt: new Date()
          }
        },
        refresh: true
      });

      logger.debug(`Updated email: ${id}`);
    } catch (error) {
      logger.error(`Failed to update email ${id}:`, error);
      throw error;
    }
  }

  async deleteEmail(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
        refresh: true
      });

      logger.debug(`Deleted email: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete email ${id}:`, error);
      throw error;
    }
  }

  async getEmailStats(): Promise<any> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            by_account: {
              terms: { field: 'account' }
            },
            by_category: {
              terms: { field: 'category' }
            },
            by_folder: {
              terms: { field: 'folder' }
            }
          }
        }
      });

      return response.aggregations;
    } catch (error) {
      logger.error('Failed to get email stats:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.isAvailable) {
      logger.debug('No Elasticsearch connection to close');
      return;
    }
    
    try {
      await this.client.close();
      logger.info('Closed Elasticsearch connection');
    } catch (error) {
      logger.error('Failed to close Elasticsearch connection:', error);
    }
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
      const must: any[] = [];
      
      // Date range query
      must.push({
        range: {
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });
      
      // Optional filters
      if (account) {
        must.push({ term: { account } });
      }
      
      if (category) {
        must.push({ term: { category } });
      }
      
      // Build the query
      const query = {
        bool: {
          must
        }
      };
      
      // Execute the aggregation query
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0, // We only want aggregations, not results
          query,
          aggs: {
            totalEmails: { value_count: { field: "id" } },
            byAccount: { terms: { field: "account", size: 10 } },
            byCategory: { terms: { field: "category", size: 20 } },
            byFolder: { terms: { field: "folder", size: 20 } }
          }
        }
      });
      
      // Extract and format results
      // Using any to bypass TypeScript's type checking for Elasticsearch response
      const aggs = response.aggregations as any;
      return {
        totalEmails: aggs?.totalEmails?.value || 0,
        byAccount: aggs?.byAccount?.buckets || [],
        byCategory: aggs?.byCategory?.buckets || [],
        byFolder: aggs?.byFolder?.buckets || []
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
      const must: any[] = [];
      
      // Date range query
      must.push({
        range: {
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });
      
      // Optional filters
      if (account) {
        must.push({ term: { account } });
      }
      
      if (category) {
        must.push({ term: { category } });
      }
      
      // Execute the aggregation query
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          query: {
            bool: { must }
          },
          aggs: {
            emails_by_day: {
              date_histogram: {
                field: "date",
                calendar_interval: "day",
                format: "yyyy-MM-dd"
              }
            }
          }
        }
      });
      
      // Format the results for charting
      const aggs = response.aggregations as any;
      return (aggs?.emails_by_day?.buckets || []).map((bucket: any) => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }));
      
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
      const must: any[] = [];
      
      // Date range query
      must.push({
        range: {
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });
      
      // Optional filters
      if (account) {
        must.push({ term: { account } });
      }
      
      if (category) {
        must.push({ term: { category } });
      }
      
      // Execute the aggregation query
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          query: {
            bool: { must }
          },
          aggs: {
            emails_by_hour: {
              date_histogram: {
                field: "date",
                calendar_interval: "hour",
                format: "HH"
              }
            }
          }
        }
      });
      
      // Initialize an array with 24 hours (0-23)
      const hourlyData = Array(24).fill(0).map((_, i) => ({
        hour: i.toString().padStart(2, '0'),
        count: 0
      }));
      
      // Fill in the actual data
      const aggs = response.aggregations as any;
      (aggs?.emails_by_hour?.buckets || []).forEach((bucket: any) => {
        const hourIndex = parseInt(bucket.key_as_string, 10);
        hourlyData[hourIndex].count = bucket.doc_count;
      });
      
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
      const must: any[] = [];
      
      // Date range query
      must.push({
        range: {
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });
      
      // Optional account filter
      if (account) {
        must.push({ term: { account } });
      }
      
      // Execute the aggregation query
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          query: {
            bool: { must }
          },
          aggs: {
            emails_over_time: {
              date_histogram: {
                field: "date",
                calendar_interval: "week",
                format: "yyyy-MM-dd"
              },
              aggs: {
                categories: {
                  terms: {
                    field: "category",
                    size: 10
                  }
                }
              }
            }
          }
        }
      });
      
      // Process the results for charting
      const aggs = response.aggregations as any;
      return (aggs?.emails_over_time?.buckets || []).map((bucket: any) => {
        const result: any = {
          date: bucket.key_as_string
        };
        
        // Add each category as a property
        (bucket.categories?.buckets || []).forEach((categoryBucket: any) => {
          result[categoryBucket.key] = categoryBucket.doc_count;
        });
        
        return result;
      });
      
    } catch (error) {
      logger.error('Failed to get category trends:', error);
      throw error;
    }
  }
  
  /**
   * Calculate response time metrics for emails
   * This is done by analyzing email threads and calculating time between emails
   */
  async getResponseTimeMetrics({ dateFrom, dateTo, account }: {
    dateFrom: Date;
    dateTo: Date;
    account?: string;
  }) {
    try {
      // This is a complex analysis that would require:
      // 1. Identifying email threads by threadId, inReplyTo, references
      // 2. Sorting emails in each thread by date
      // 3. Calculating time differences between sent and received emails
      
      // For simplicity, we'll simulate this with a sample implementation
      // that uses aggregations on dates
      
      const must: any[] = [];
      
      // Date range query
      must.push({
        range: {
          date: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      });
      
      // Optional account filter
      if (account) {
        must.push({ term: { account } });
      }
      
      // We need data to actually analyze
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 100,
          _source: ["id", "date", "threadId", "inReplyTo", "references"],
          query: {
            bool: { must }
          },
          sort: [
            { "date": { "order": "asc" } }
          ]
        }
      });
      
      // Simple response time metrics based on thread analysis
      // This is a simplified implementation
      const threads: Map<string, any[]> = new Map();
      const responseTimes: number[] = [];
      
      response.hits.hits.forEach((hit: any) => {
        const email = hit._source;
        
        // Group by threadId if available, otherwise by subject or a combination
        const threadKey = email.threadId || email.id;
        
        if (!threads.has(threadKey)) {
          threads.set(threadKey, []);
        }
        
        threads.get(threadKey)!.push({
          id: email.id,
          date: new Date(email.date),
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
}
