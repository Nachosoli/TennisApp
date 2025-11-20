import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sendGridApiKey: string;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY') || '';
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'noreply@courtmate.com';

    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    if (!this.sendGridApiKey) {
      this.logger.warn('SendGrid API key not configured, skipping email send');
      return false;
    }

    try {
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  generateMatchCreatedEmail(matchDetails: {
    creatorName: string;
    courtName: string;
    date: string;
    time: string;
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Match Created!</h2>
          <p>Hello,</p>
          <p><strong>${matchDetails.creatorName}</strong> has created a new match:</p>
          <ul>
            <li><strong>Court:</strong> ${matchDetails.courtName}</li>
            <li><strong>Date:</strong> ${matchDetails.date}</li>
            <li><strong>Time:</strong> ${matchDetails.time}</li>
          </ul>
          <p>Check it out in the CourtMate app!</p>
        </body>
      </html>
    `;
  }

  generateMatchAcceptedEmail(matchDetails: {
    applicantName: string;
    courtName: string;
    date: string;
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Match Application Received</h2>
          <p>Hello,</p>
          <p><strong>${matchDetails.applicantName}</strong> has applied to your match at <strong>${matchDetails.courtName}</strong> on ${matchDetails.date}.</p>
          <p>Please confirm or reject the application in the app.</p>
        </body>
      </html>
    `;
  }

  generateMatchConfirmedEmail(matchDetails: {
    opponentName: string;
    courtName: string;
    date: string;
    time: string;
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Match Confirmed! 🎾</h2>
          <p>Hello,</p>
          <p>Your match has been confirmed!</p>
          <ul>
            <li><strong>Opponent:</strong> ${matchDetails.opponentName}</li>
            <li><strong>Court:</strong> ${matchDetails.courtName}</li>
            <li><strong>Date:</strong> ${matchDetails.date}</li>
            <li><strong>Time:</strong> ${matchDetails.time}</li>
          </ul>
          <p>See you on the court!</p>
        </body>
      </html>
    `;
  }

  generateScoreReminderEmail(matchDetails: {
    opponentName: string;
    date: string;
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Score Reminder</h2>
          <p>Hello,</p>
          <p>Don't forget to submit the score for your match against <strong>${matchDetails.opponentName}</strong> on ${matchDetails.date}.</p>
          <p>Submit your score in the app to update your ELO rating!</p>
        </body>
      </html>
    `;
  }

  generateNewChatMessageEmail(matchDetails: {
    senderName: string;
    courtName: string;
    date: string;
    messagePreview: string;
  }): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Chat Message</h2>
          <p>Hello,</p>
          <p><strong>${matchDetails.senderName}</strong> sent a message in your match chat:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-left: 3px solid #007bff;">
            "${matchDetails.messagePreview}"
          </p>
          <p><strong>Match:</strong> ${matchDetails.courtName} on ${matchDetails.date}</p>
          <p>Reply in the app to continue the conversation.</p>
        </body>
      </html>
    `;
  }

  generateEmailVerificationEmail(verificationLink: string, firstName: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Verify Your Email Address</h2>
            <p>Hello ${firstName},</p>
            <p>Thank you for signing up for CourtMate! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; word-break: break-all; font-size: 14px;">${verificationLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with CourtMate, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  generatePasswordResetEmail(resetLink: string, firstName: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Reset Your Password</h2>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password for your CourtMate account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; word-break: break-all; font-size: 14px;">${resetLink}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>
        </body>
      </html>
    `;
  }
}
