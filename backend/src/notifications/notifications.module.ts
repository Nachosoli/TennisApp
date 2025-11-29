import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../entities/notification.entity';
import { NotificationDelivery } from '../entities/notification-delivery.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import { User } from '../entities/user.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationDelivery, NotificationPreference, PushSubscription, User]),
    GatewaysModule,
  ],
  providers: [NotificationsService, NotificationPreferencesService, EmailService, SmsService],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationPreferencesService, EmailService],
})
export class NotificationsModule {}
