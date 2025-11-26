import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import { User } from '../entities/user.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { NotificationsGateway } from '../gateways/notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private smsService: SmsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Create and send a notification based on user preferences
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      return;
    }

    // Get user preferences for this notification type
    const preference = await this.notificationPreferenceRepository.findOne({
      where: { userId, notificationType: type },
    });

    // Default preferences: Critical notifications ON, others OFF
    const isCritical = type === NotificationType.MATCH_CONFIRMED || type === NotificationType.MATCH_ACCEPTED;
    const emailEnabled = preference?.emailEnabled ?? isCritical;
    const smsEnabled = preference?.smsEnabled ?? isCritical;

    // Create notifications based on preferences
    const notifications: Notification[] = [];

    if (emailEnabled && user.email) {
      const emailNotification = this.notificationRepository.create({
        userId,
        type,
        channel: NotificationChannel.EMAIL,
        content,
        status: NotificationStatus.PENDING,
      });
      notifications.push(emailNotification);
    }

    if (smsEnabled && user.phone && user.phoneVerified) {
      const smsNotification = this.notificationRepository.create({
        userId,
        type,
        channel: NotificationChannel.SMS,
        content,
        status: NotificationStatus.PENDING,
      });
      notifications.push(smsNotification);
    }

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
      // Process notifications asynchronously
      this.processNotifications(notifications, metadata).catch((error) => {
        this.logger.error('Error processing notifications:', error);
      });
    }
  }

  /**
   * Process and send pending notifications
   */
  private async processNotifications(
    notifications: Notification[],
    metadata?: Record<string, any>,
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: notification.userId },
        });

        if (!user) {
          notification.status = NotificationStatus.FAILED;
          await this.notificationRepository.save(notification);
          continue;
        }

        let success = false;

        if (notification.channel === NotificationChannel.EMAIL) {
          const htmlContent = this.generateEmailContent(notification.type, notification.content, metadata || {});
          success = await this.emailService.sendEmail(user.email, this.getEmailSubject(notification.type), htmlContent);
        } else if (notification.channel === NotificationChannel.SMS) {
          const smsContent = this.generateSmsContent(notification.type, notification.content, metadata || {});
          success = await this.smsService.sendSms(user.phone, smsContent);
        }

        if (success) {
          notification.status = NotificationStatus.SENT;
          notification.sentAt = new Date();
          
          // Emit real-time notification
          try {
            this.notificationsGateway.sendNotification(notification.userId, {
              id: notification.id,
              type: notification.type,
              content: notification.content,
              createdAt: notification.createdAt.toISOString(),
            });
          } catch (error) {
            this.logger.warn('Failed to emit real-time notification:', error);
          }
        } else {
          notification.status = NotificationStatus.FAILED;
        }

        await this.notificationRepository.save(notification);
      } catch (error) {
        this.logger.error(`Error processing notification ${notification.id}:`, error);
        notification.status = NotificationStatus.FAILED;
        notification.retryCount = (notification.retryCount || 0) + 1;
        await this.notificationRepository.save(notification);
      }
    }
  }

  /**
   * Retry failed notifications (once after 1 hour)
   */
  async retryFailedNotifications(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: 0,
        createdAt: LessThan(oneHourAgo),
      },
    });

    for (const notification of failedNotifications) {
      const user = await this.userRepository.findOne({
        where: { id: notification.userId },
      });

      if (!user) continue;

      let success = false;
      if (notification.channel === NotificationChannel.EMAIL) {
        success = await this.emailService.sendEmail(user.email, this.getEmailSubject(notification.type), notification.content);
      } else if (notification.channel === NotificationChannel.SMS) {
        success = await this.smsService.sendSms(user.phone, notification.content);
      }

      if (success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
      } else {
        notification.retryCount = 1; // Mark as retried
      }

      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark notification as read (if needed in future)
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (notification) {
      // Could add a readAt field if needed
      await this.notificationRepository.save(notification);
    }
  }

  private generateEmailContent(type: NotificationType, content: string, metadata?: Record<string, any>): string {
    const meta = metadata || {};
    switch (type) {
      case NotificationType.MATCH_CREATED:
        return this.emailService.generateMatchCreatedEmail({
          creatorName: meta.creatorName || 'Someone',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
          time: meta.matchTime || '',
        });
      case NotificationType.MATCH_ACCEPTED:
        return this.emailService.generateMatchAcceptedEmail({
          applicantName: meta.applicantName || 'Someone',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
        });
      case NotificationType.MATCH_CONFIRMED:
        return this.emailService.generateMatchConfirmedEmail({
          opponentName: meta.opponentName || 'Your opponent',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
          time: meta.matchTime || '',
        });
      case NotificationType.SCORE_REMINDER:
        return this.emailService.generateScoreReminderEmail({
          opponentName: meta.opponentName || 'Your opponent',
          date: meta.matchDate || '',
        });
      case NotificationType.NEW_CHAT:
        return this.emailService.generateNewChatMessageEmail({
          senderName: meta.senderName || 'Someone',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
          messagePreview: meta.messagePreview || content.substring(0, 100),
        });
      default:
        return `<html><body><p>${content}</p></body></html>`;
    }
  }

  private generateSmsContent(type: NotificationType, content: string, metadata?: Record<string, any>): string {
    const meta = metadata || {};
    switch (type) {
      case NotificationType.MATCH_CREATED:
        return this.smsService.generateMatchCreatedSms({
          creatorName: meta.creatorName || 'Someone',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
        });
      case NotificationType.MATCH_ACCEPTED:
        return this.smsService.generateMatchAcceptedSms({
          applicantName: meta.applicantName || 'Someone',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
        });
      case NotificationType.MATCH_CONFIRMED:
        return this.smsService.generateMatchConfirmedSms({
          opponentName: meta.opponentName || 'Your opponent',
          courtName: meta.courtName || 'a court',
          date: meta.matchDate || '',
          time: meta.matchTime || '',
        });
      case NotificationType.SCORE_REMINDER:
        return this.smsService.generateScoreReminderSms({
          opponentName: meta.opponentName || 'Your opponent',
          date: meta.matchDate || '',
        });
      case NotificationType.NEW_CHAT:
        return this.smsService.generateNewChatMessageSms({
          senderName: meta.senderName || 'Someone',
          messagePreview: meta.messagePreview || content.substring(0, 50),
        });
      default:
        return content;
    }
  }

  private getEmailSubject(type: NotificationType): string {
    const subjects = {
      [NotificationType.MATCH_CREATED]: 'New Match Created - CourtBuddy',
      [NotificationType.MATCH_ACCEPTED]: 'Match Application Received - CourtBuddy',
      [NotificationType.MATCH_CONFIRMED]: 'Match Confirmed! - CourtBuddy',
      [NotificationType.COURT_CHANGES]: 'Court Changes - CourtBuddy',
      [NotificationType.SCORE_REMINDER]: 'Score Reminder - CourtBuddy',
      [NotificationType.NEW_CHAT]: 'New Chat Message - CourtBuddy',
    };
    return subjects[type] || 'Notification from CourtBuddy';
  }

  /**
   * Save push notification subscription
   */
  async savePushSubscription(userId: string, subscriptionDto: PushSubscriptionDto): Promise<PushSubscription> {
    // Check if subscription already exists for this endpoint
    const existing = await this.pushSubscriptionRepository.findOne({
      where: {
        userId,
        endpoint: subscriptionDto.endpoint,
      },
    });

    if (existing) {
      // Update existing subscription
      existing.p256dhKey = subscriptionDto.keys.p256dh;
      existing.authKey = subscriptionDto.keys.auth;
      return this.pushSubscriptionRepository.save(existing);
    }

    // Create new subscription
    const subscription = this.pushSubscriptionRepository.create({
      userId,
      endpoint: subscriptionDto.endpoint,
      p256dhKey: subscriptionDto.keys.p256dh,
      authKey: subscriptionDto.keys.auth,
    });

    return this.pushSubscriptionRepository.save(subscription);
  }

  /**
   * Delete push notification subscription
   */
  async deletePushSubscription(userId: string, subscriptionId: string): Promise<void> {
    await this.pushSubscriptionRepository.delete({
      id: subscriptionId,
      userId,
    });
  }

  /**
   * Get user's push subscriptions
   */
  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.find({
      where: { userId },
    });
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<void> {
    await this.notificationRepository.delete({
      userId,
    });
  }
}
