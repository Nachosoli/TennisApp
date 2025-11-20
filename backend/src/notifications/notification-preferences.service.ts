import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification.entity';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.notificationPreferenceRepository.find({
      where: { userId },
    });
  }

  async updatePreference(
    userId: string,
    updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    let preference = await this.notificationPreferenceRepository.findOne({
      where: {
        userId,
        notificationType: updateDto.notificationType,
      },
    });

    if (preference) {
      preference.emailEnabled = updateDto.emailEnabled;
      preference.smsEnabled = updateDto.smsEnabled;
    } else {
      preference = this.notificationPreferenceRepository.create({
        userId,
        notificationType: updateDto.notificationType,
        emailEnabled: updateDto.emailEnabled,
        smsEnabled: updateDto.smsEnabled,
      });
    }

    return this.notificationPreferenceRepository.save(preference);
  }

  async getPreferenceForType(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference | null> {
    return this.notificationPreferenceRepository.findOne({
      where: { userId, notificationType: type },
    });
  }
}
