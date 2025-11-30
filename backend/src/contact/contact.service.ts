import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../notifications/services/email.service';
import { UsersService } from '../users/users.service';
import { CreateContactDto, ContactSubject } from './dto/create-contact.dto';
import { sanitizeTextContent } from '../common/utils/sanitize.util';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly supportEmail = 'support@courtbuddyapp.com';

  constructor(
    private emailService: EmailService,
    private usersService: UsersService,
  ) {}

  async submitContactForm(userId: string, createContactDto: CreateContactDto): Promise<{ success: boolean; message: string }> {
    try {
      // Get user information
      const user = await this.usersService.findById(userId);

      // Generate email subject
      const subjectLabels: Record<ContactSubject, string> = {
        [ContactSubject.SUPPORT]: 'Support',
        [ContactSubject.BUG]: 'Report a Bug',
        [ContactSubject.FEEDBACK]: 'Feedback',
        [ContactSubject.FEATURE]: 'Request Feature',
        [ContactSubject.OTHER]: 'Other',
      };

      const emailSubject = `[CourtBuddy Contact] ${subjectLabels[createContactDto.subject]} - ${user.firstName} ${user.lastName}`;

      // Sanitize message content (will be HTML-escaped in email template)
      const sanitizedMessage = sanitizeTextContent(createContactDto.message);

      // Generate HTML email content
      const htmlContent = this.generateContactEmailHtml({
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userId: user.id,
        subject: subjectLabels[createContactDto.subject],
        message: sanitizedMessage,
        timestamp: new Date().toISOString(),
      });

      // Send email
      const emailSent = await this.emailService.sendEmail(
        this.supportEmail,
        emailSubject,
        htmlContent,
      );

      if (!emailSent) {
        this.logger.error(`Failed to send contact form email from user ${userId}`);
        throw new Error('Failed to send email');
      }

      this.logger.log(`Contact form submitted successfully by user ${userId}`);
      return {
        success: true,
        message: 'Your message has been sent successfully. We will respond within 24-48 hours.',
      };
    } catch (error) {
      this.logger.error(`Error processing contact form for user ${userId}:`, error);
      throw error;
    }
  }

  private generateContactEmailHtml(data: {
    userName: string;
    userEmail: string;
    userId: string;
    subject: string;
    message: string;
    timestamp: string;
  }): string {
    const formattedDate = new Date(data.timestamp).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .info-row {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-label {
            font-weight: bold;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .info-value {
            color: #111827;
            font-size: 14px;
          }
          .message-box {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border-left: 4px solid #2563eb;
            margin-top: 20px;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">New Contact Form Submission</h2>
        </div>
        <div class="content">
          <div class="info-row">
            <div class="info-label">User Name</div>
            <div class="info-value">${data.userName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">User Email</div>
            <div class="info-value">${data.userEmail}</div>
          </div>
          <div class="info-row">
            <div class="info-label">User ID</div>
            <div class="info-value">${data.userId}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Subject</div>
            <div class="info-value">${data.subject}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Submitted At</div>
            <div class="info-value">${formattedDate}</div>
          </div>
          <div class="message-box">
            <div class="info-label">Message</div>
            <div class="info-value" style="white-space: pre-wrap; margin-top: 10px;">${this.escapeHtml(data.message)}</div>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent from the CourtBuddy contact form.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Escape HTML entities for safe display in email
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

