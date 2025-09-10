import axios from 'axios';
import { logger } from '../utils/logger';
import { EmailMessage, EmailCategory, WebhookPayload } from '../models/email';

export class WebhookService {
  private webhookUrl: string;
  private isEnabled: boolean;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || '';
    this.isEnabled = !!this.webhookUrl;
    this.timeout = 10000; // 10 seconds
    this.retryAttempts = 3;

    if (this.isEnabled) {
      logger.info(`Webhook service initialized with URL: ${this.maskUrl(this.webhookUrl)}`);
    } else {
      logger.warn('Webhook service disabled - missing WEBHOOK_URL');
    }
  }

  async sendEmailCategorizedWebhook(email: EmailMessage): Promise<void> {
    if (!this.isEnabled || !email.category) {
      logger.debug('Webhook service not enabled or email has no category, skipping notification');
      return;
    }

    const payload: WebhookPayload = {
      event: 'email_categorized',
      email: this.sanitizeEmailForWebhook(email),
      category: email.category,
      timestamp: new Date(),
      metadata: {
        confidence: email.confidence,
        account: email.account,
        folder: email.folder
      }
    };

    await this.sendWebhook(payload);
  }

  async sendInterestedEmailWebhook(email: EmailMessage): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('Webhook service not enabled, skipping notification');
      return;
    }

    // Only send webhook for interested emails
    if (email.category !== EmailCategory.INTERESTED) {
      return;
    }

    const payload: WebhookPayload = {
      event: 'interested_email',
      email: this.sanitizeEmailForWebhook(email),
      category: email.category,
      timestamp: new Date(),
      metadata: {
        confidence: email.confidence,
        account: email.account,
        folder: email.folder,
        priority: 'high'
      }
    };

    await this.sendWebhook(payload);
  }

  async sendMeetingBookedWebhook(email: EmailMessage): Promise<void> {
    if (!this.isEnabled) {
      logger.debug('Webhook service not enabled, skipping notification');
      return;
    }

    // Only send webhook for meeting booked emails
    if (email.category !== EmailCategory.MEETING_BOOKED) {
      return;
    }

    const payload: WebhookPayload = {
      event: 'meeting_booked',
      email: this.sanitizeEmailForWebhook(email),
      category: email.category,
      timestamp: new Date(),
      metadata: {
        confidence: email.confidence,
        account: email.account,
        folder: email.folder,
        priority: 'high'
      }
    };

    await this.sendWebhook(payload);
  }

  async sendBulkEmailWebhooks(emails: EmailMessage[]): Promise<void> {
    const relevantEmails = emails.filter(email => 
      email.category === EmailCategory.INTERESTED || 
      email.category === EmailCategory.MEETING_BOOKED
    );

    if (relevantEmails.length === 0) {
      return;
    }

    // Send webhooks in batches to avoid overwhelming the endpoint
    const batchSize = 3;
    for (let i = 0; i < relevantEmails.length; i += batchSize) {
      const batch = relevantEmails.slice(i, i + batchSize);
      const promises = batch.map(email => {
        if (email.category === EmailCategory.INTERESTED) {
          return this.sendInterestedEmailWebhook(email);
        } else if (email.category === EmailCategory.MEETING_BOOKED) {
          return this.sendMeetingBookedWebhook(email);
        }
        return Promise.resolve();
      });

      await Promise.allSettled(promises);

      // Small delay between batches
      if (i + batchSize < relevantEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async sendWebhook(payload: WebhookPayload): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.post(this.webhookUrl, payload, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ReachInbox-EmailAggregator/1.0',
            'X-ReachInbox-Event': payload.event,
            'X-ReachInbox-Timestamp': payload.timestamp.toISOString()
          }
        });

        if (response.status >= 200 && response.status < 300) {
          logger.info(`Webhook sent successfully for event: ${payload.event}, email: ${payload.email.id}`);
          return;
        } else {
          throw new Error(`Webhook responded with status: ${response.status}`);
        }

      } catch (error: any) {
        lastError = error;
        logger.warn(`Webhook attempt ${attempt}/${this.retryAttempts} failed:`, {
          error: error.message,
          event: payload.event,
          emailId: payload.email.id
        });

        // Wait before retrying (exponential backoff)
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`Failed to send webhook after ${this.retryAttempts} attempts:`, {
      error: lastError?.message,
      event: payload.event,
      emailId: payload.email.id,
      webhookUrl: this.maskUrl(this.webhookUrl)
    });
  }

  async testWebhook(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const testPayload = {
        event: 'test',
        message: 'ReachInbox webhook test',
        timestamp: new Date().toISOString(),
        service: 'reachinbox-email-aggregator'
      };

      const response = await axios.post(this.webhookUrl, testPayload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ReachInbox-EmailAggregator/1.0',
          'X-ReachInbox-Event': 'test'
        }
      });

      const success = response.status >= 200 && response.status < 300;
      
      if (success) {
        logger.info('Webhook test successful');
      } else {
        logger.error(`Webhook test failed with status: ${response.status}`);
      }

      return success;

    } catch (error: any) {
      logger.error('Webhook test failed:', error.message);
      return false;
    }
  }

  private sanitizeEmailForWebhook(email: EmailMessage): any {
    // Remove sensitive information and reduce payload size
    return {
      id: email.id,
      messageId: email.messageId,
      account: email.account,
      folder: email.folder,
      sender: email.sender,
      recipients: email.recipients.slice(0, 3), // Limit recipients
      subject: email.subject,
      body: email.bodyText.substring(0, 500), // Truncate body
      date: email.date,
      category: email.category,
      confidence: email.confidence,
      isRead: email.isRead,
      isStarred: email.isStarred,
      priority: email.priority,
      attachments: email.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      })) || []
    };
  }

  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.length > 8) {
          pathParts[pathParts.length - 1] = lastPart.substring(0, 4) + '****' + lastPart.substring(lastPart.length - 4);
        }
      }
      urlObj.pathname = pathParts.join('/');
      return urlObj.toString();
    } catch {
      return url.substring(0, 20) + '****';
    }
  }

  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    this.isEnabled = !!url;
    logger.info(`Webhook URL updated: ${this.maskUrl(url)}`);
  }

  getStatus(): { enabled: boolean; url: string; masked: boolean } {
    return {
      enabled: this.isEnabled,
      url: this.isEnabled ? this.maskUrl(this.webhookUrl) : 'Not configured',
      masked: true
    };
  }
}
