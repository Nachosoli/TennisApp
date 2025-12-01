import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sendGridApiKey: string;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    this.sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY') || '';
    this.fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL') || 'no-reply@courtbuddy.io';

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
    return this.generateBrandedEmailTemplate(
      'New Match Created! 🎾',
      `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>${matchDetails.creatorName}</strong> has created a new match:</p>
       <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
         <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;"><strong>Court:</strong> ${matchDetails.courtName}</p>
         <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;"><strong>Date:</strong> ${matchDetails.date}</p>
         <p style="margin: 0; color: #111827; font-size: 15px;"><strong>Time:</strong> ${matchDetails.time}</p>
       </div>
       <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">Check it out in the CourtBuddy app!</p>`
    );
  }

  generateMatchAcceptedEmail(matchDetails: {
    applicantName: string;
    courtName: string;
    date: string;
  }): string {
    return this.generateBrandedEmailTemplate(
      'Match Application Received',
      `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>${matchDetails.applicantName}</strong> has applied to your match at <strong>${matchDetails.courtName}</strong> on ${matchDetails.date}.</p>
       <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">Please confirm or reject the application in the CourtBuddy app.</p>`
    );
  }

  generateMatchConfirmedEmail(matchDetails: {
    opponentName: string;
    courtName: string;
    date: string;
    time: string;
  }): string {
    return this.generateBrandedEmailTemplate(
      'Match Confirmed! 🎾',
      `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Your match has been confirmed!</p>
       <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 6px;">
         <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;"><strong>Opponent:</strong> ${matchDetails.opponentName}</p>
         <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;"><strong>Court:</strong> ${matchDetails.courtName}</p>
         <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;"><strong>Date:</strong> ${matchDetails.date}</p>
         <p style="margin: 0; color: #111827; font-size: 15px;"><strong>Time:</strong> ${matchDetails.time}</p>
       </div>
       <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">See you on the court!</p>`
    );
  }

  generateScoreReminderEmail(matchDetails: {
    opponentName: string;
    date: string;
  }): string {
    return this.generateBrandedEmailTemplate(
      'Score Reminder',
      `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Don't forget to submit the score for your match against <strong>${matchDetails.opponentName}</strong> on ${matchDetails.date}.</p>
       <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">Submit your score in the CourtBuddy app to update your ELO rating!</p>`
    );
  }

  generateNewChatMessageEmail(matchDetails: {
    senderName: string;
    courtName: string;
    date: string;
    messagePreview: string;
  }): string {
    return this.generateBrandedEmailTemplate(
      'New Chat Message',
      `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>${matchDetails.senderName}</strong> sent a message in your match chat:</p>
       <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
         <p style="margin: 0; color: #111827; font-size: 15px; font-style: italic;">"${matchDetails.messagePreview}"</p>
       </div>
       <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>Match:</strong> ${matchDetails.courtName} on ${matchDetails.date}</p>
       <p style="margin: 24px 0 0 0; color: #374151; font-size: 16px;">Reply in the CourtBuddy app to continue the conversation.</p>`
    );
  }

  /**
   * Generate a branded email template with consistent styling
   */
  private generateBrandedEmailTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header with Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CourtBuddy</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;">${title}</h2>
                      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Hello,</p>
                      ${content}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">© ${new Date().getFullYear()} CourtBuddy. All rights reserved.</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">You're receiving this email because you have a CourtBuddy account.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  generateEmailVerificationEmail(verificationLink: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header with Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CourtBuddy</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>
                      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Hello ${firstName},</p>
                      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">Thank you for signing up for CourtBuddy! To complete your registration, please verify your email address by clicking the button below.</p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">Verify Email Address</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px; text-align: center;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 32px 0; color: #2563eb; word-break: break-all; font-size: 13px; text-align: center; padding: 12px; background-color: #eff6ff; border-radius: 6px; border: 1px solid #dbeafe;">${verificationLink}</p>
                      
                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;"><strong>Important:</strong> This verification link will expire in 24 hours.</p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">If you didn't create a CourtBuddy account, you can safely ignore this email.</p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">© ${new Date().getFullYear()} CourtBuddy. All rights reserved.</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This email was sent to verify your account. Please do not reply to this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  generatePasswordResetEmail(resetLink: string, firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                  <!-- Header with Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CourtBuddy</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                      <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">Hello ${firstName},</p>
                      <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">We received a request to reset your password for your CourtBuddy account. Click the button below to create a new password.</p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 32px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px; text-align: center;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 32px 0; color: #2563eb; word-break: break-all; font-size: 13px; text-align: center; padding: 12px; background-color: #eff6ff; border-radius: 6px; border: 1px solid #dbeafe;">${resetLink}</p>
                      
                      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;"><strong>Security Notice:</strong> This link will expire in 1 hour for your security.</p>
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">© ${new Date().getFullYear()} CourtBuddy. All rights reserved.</p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">This email was sent for account security. Please do not reply to this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}
