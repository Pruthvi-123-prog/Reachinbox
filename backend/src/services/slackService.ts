import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger';
import { EmailMessage, EmailCategory, SlackNotification } from '../models/email';

export class SlackService {
  private client?: WebClient;
  private channelId: string;
  private isEnabled: boolean;

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    this.channelId = process.env.SLACK_CHANNEL_ID || '';
    this.isEnabled = !!(token && this.channelId);

    if (this.isEnabled && token) {
      try {
        this.client = new WebClient(token);
        logger.info('Slack service initialized');
      } catch (error) {
        logger.error('Failed to initialize Slack service:', error);
        this.isEnabled = false;
        this.client = undefined;
      }
    } else {
      logger.warn('Slack service disabled - missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID');
      this.isEnabled = false;
    }
  }

  async sendEmailNotification(email: EmailMessage): Promise<void> {
    if (!this.isEnabled || !this.client) {
      logger.debug('Slack service not enabled, skipping notification');
      return;
    }

    try {
      // Only send notifications for interested emails
      if (email.category !== EmailCategory.INTERESTED) {
        return;
      }

      const message = this.formatEmailMessage(email);
      
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        blocks: message.blocks,
        text: message.text // Fallback text for notifications
      });

      if (result.ok) {
        logger.info(`Sent Slack notification for email ${email.id}`);
      } else {
        logger.error('Failed to send Slack message:', result.error);
      }

    } catch (error) {
      logger.error('Error sending Slack notification:', error);
    }
  }

  async sendBulkEmailNotifications(emails: EmailMessage[]): Promise<void> {
    const interestedEmails = emails.filter(email => email.category === EmailCategory.INTERESTED);
    
    if (interestedEmails.length === 0) {
      return;
    }

    // Send notifications in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < interestedEmails.length; i += batchSize) {
      const batch = interestedEmails.slice(i, i + batchSize);
      const promises = batch.map(email => this.sendEmailNotification(email));
      
      await Promise.allSettled(promises);
      
      // Small delay between batches
      if (i + batchSize < interestedEmails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async sendCustomMessage(text: string, channelId?: string): Promise<void> {
    if (!this.isEnabled || !this.client) {
      logger.debug('Slack service not enabled');
      return;
    }

    try {
      const result = await this.client.chat.postMessage({
        channel: channelId || this.channelId,
        text
      });

      if (result.ok) {
        logger.info('Sent custom Slack message');
      } else {
        logger.error('Failed to send custom Slack message:', result.error);
      }

    } catch (error) {
      logger.error('Error sending custom Slack message:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      const result = await this.client.auth.test();
      return result.ok || false;
    } catch (error) {
      logger.error('Slack connection test failed:', error);
      return false;
    }
  }

  private formatEmailMessage(email: EmailMessage): { blocks: any[], text: string } {
    const confidence = email.confidence ? Math.round(email.confidence * 100) : 0;
    const truncatedBody = email.bodyText.length > 200 
      ? email.bodyText.substring(0, 200) + '...' 
      : email.bodyText;

    const text = `🎯 New Interested Email from ${email.sender.name || email.sender.address}`;

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎯 New Interested Email Received!'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*From:* ${email.sender.name || 'Unknown'} <${email.sender.address}>`
          },
          {
            type: 'mrkdwn',
            text: `*Account:* ${email.account}`
          },
          {
            type: 'mrkdwn',
            text: `*Date:* ${email.date.toLocaleDateString()}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:* ${confidence}%`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Subject:* ${email.subject}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Preview:*\n${truncatedBody}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Email ID: ${email.id} | Folder: ${email.folder}`
          }
        ]
      }
    ];

    return { blocks, text };
  }

  async sendSummaryNotification(stats: {
    totalEmails: number;
    interestedCount: number;
    meetingBookedCount: number;
    notInterestedCount: number;
    spamCount: number;
  }): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    try {
      const message = `📊 *Daily Email Summary*
      
📧 Total Emails: ${stats.totalEmails}
🎯 Interested: ${stats.interestedCount}
📅 Meetings Booked: ${stats.meetingBookedCount}
❌ Not Interested: ${stats.notInterestedCount}
🗑️ Spam: ${stats.spamCount}`;

      await this.client.chat.postMessage({
        channel: this.channelId,
        text: message
      });

    } catch (error) {
      logger.error('Error sending summary notification:', error);
    }
  }
}
