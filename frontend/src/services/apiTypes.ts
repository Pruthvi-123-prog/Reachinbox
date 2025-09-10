import { EmailMessage } from '../context/EmailContext';

// Interface for email reply suggestions
export interface EmailReply {
  subject: string;
  body: string;
  tone: 'formal' | 'friendly' | 'concise' | 'detailed';
  intent: 'acknowledge' | 'agree' | 'disagree' | 'inquire' | 'schedule' | 'follow-up';
}

// Interface for reply suggestions response
export interface ReplySuggestionsResponse {
  emailId: string;
  suggestions: EmailReply[];
}
