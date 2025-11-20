import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: twilio.Twilio | null = null;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.twilioClient || !this.twilioPhoneNumber) {
      this.logger.warn('Twilio not configured, skipping SMS send');
      return false;
    }

    // Validate US phone number format
    if (!to.startsWith('+1') || to.length !== 12) {
      this.logger.warn(`Invalid phone number format: ${to}. Must be US format: +1XXXXXXXXXX`);
      return false;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to,
      });
      this.logger.log(`SMS sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      return false;
    }
  }

  generateMatchCreatedSms(matchDetails: {
    creatorName: string;
    courtName: string;
    date: string;
  }): string {
    return `New match at ${matchDetails.courtName} on ${matchDetails.date} by ${matchDetails.creatorName}. Check CourtMate app!`;
  }

  generateMatchAcceptedSms(matchDetails: {
    applicantName: string;
    courtName: string;
    date: string;
  }): string {
    return `${matchDetails.applicantName} applied to your match at ${matchDetails.courtName} on ${matchDetails.date}. Check CourtMate app!`;
  }

  generateMatchConfirmedSms(matchDetails: {
    opponentName: string;
    courtName: string;
    date: string;
    time: string;
  }): string {
    return `Match confirmed! ${matchDetails.opponentName} at ${matchDetails.courtName} on ${matchDetails.date} at ${matchDetails.time}. See you on the court!`;
  }

  generateScoreReminderSms(matchDetails: {
    opponentName: string;
    date: string;
  }): string {
    return `Reminder: Submit score for match vs ${matchDetails.opponentName} on ${matchDetails.date}. Update your ELO in CourtMate app!`;
  }

  generateNewChatMessageSms(matchDetails: {
    senderName: string;
    messagePreview: string;
  }): string {
    const preview = matchDetails.messagePreview.length > 50
      ? matchDetails.messagePreview.substring(0, 50) + '...'
      : matchDetails.messagePreview;
    return `New message from ${matchDetails.senderName}: "${preview}" - Reply in CourtMate app`;
  }
}
