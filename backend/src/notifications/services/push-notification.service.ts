import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { NotificationType } from '../../entities/notification.enums';
import * as webpush from 'web-push';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // In production, these should come from environment variables
    // For now, generate them if not provided
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (publicKey && privateKey) {
      this.vapidKeys = { publicKey, privateKey };
      webpush.setVapidDetails('mailto:noreply@domaincourt.io', publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys not configured, push notifications disabled');
    }
  }

  async sendPushNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!this.vapidKeys) {
      return false;
    }

    // Only send critical notifications via push (MATCH_CONFIRMED only)
    const isCritical = type === NotificationType.MATCH_CONFIRMED;
    if (!isCritical) {
      return false;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Get user's push subscriptions from database
    // Note: This requires injecting NotificationsService or PushSubscription repository
    // For now, this is handled by NotificationsService

    // for (const subscription of subscriptions) {
    //   try {
    //     await webpush.sendNotification(
    //       JSON.parse(subscription.endpoint),
    //       JSON.stringify({
    //         title,
    //         body,
    //         icon: '/icon-192x192.png',
    //         badge: '/badge-72x72.png',
    //         data,
    //       }),
    //     );
    //   } catch (error) {
    //     this.logger.error(`Failed to send push notification:`, error);
    //   }
    // }

    return true;
  }

  generatePushTitle(type: NotificationType): string {
    const titles = {
      [NotificationType.MATCH_CONFIRMED]: 'Match Confirmed!',
      [NotificationType.MATCH_ACCEPTED]: 'Application Accepted',
      [NotificationType.MATCH_APPLICANT]: 'New Application',
      [NotificationType.MATCH_CREATED]: 'New Match',
      [NotificationType.COURT_CHANGES]: 'Court Updated',
      [NotificationType.SCORE_REMINDER]: 'Score Reminder',
      [NotificationType.NEW_CHAT]: 'New Message',
    };
    return titles[type] || 'CourtBuddy Notification';
  }

  generatePushBody(type: NotificationType, metadata: Record<string, any>): string {
    switch (type) {
      case NotificationType.MATCH_CONFIRMED:
        return `Your match on ${metadata.matchDate || 'the scheduled date'} at ${metadata.courtName || 'the court'} is confirmed!`;
      case NotificationType.MATCH_ACCEPTED:
        return `Your application to join a match has been accepted!`;
      case NotificationType.MATCH_APPLICANT:
        return `${metadata.applicantName || 'Someone'} applied to your match. Confirm now!`;
      default:
        return 'You have a new notification in CourtBuddy';
    }
  }
}

