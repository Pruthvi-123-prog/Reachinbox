import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';
import { EmailMessage, EmailSearchQuery, EmailSearchResult } from '../models/email';

export class ElasticsearchService {
  private client: Client;
  private indexName: string;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
      requestTimeout: 30000,
      pingTimeout: 3000,
    });
    this.indexName = `${process.env.ELASTICSEARCH_INDEX_PREFIX || 'reachinbox'}_emails`;
  }

  async initialize(): Promise<void> {
    try {
      // Check if Elasticsearch is available
      await this.client.ping();
      logger.info('Connected to Elasticsearch');

      // Create index if it doesn't exist
      await this.createIndexIfNotExists();
      
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
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
      throw error;
    }
  }

  async searchEmails(query: EmailSearchQuery): Promise<EmailSearchResult> {
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
    try {
      const response = await this.client.get({
        index: this.indexName,
        id
      });

      return response._source as EmailMessage;
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
    try {
      await this.client.close();
      logger.info('Closed Elasticsearch connection');
    } catch (error) {
      logger.error('Failed to close Elasticsearch connection:', error);
    }
  }
}
