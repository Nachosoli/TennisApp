import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationType } from '../entities/notification.entity';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

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
    try {
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

      return await this.notificationPreferenceRepository.save(preference);
    } catch (error: any) {
      this.logger.error(
        `Failed to update notification preference: ${error.message}`,
        error.stack,
      );
      
      // Check if it's a database enum error
      if (error.message?.includes('invalid input value for enum') || 
          error.message?.includes('enum') ||
          error.code === '22P02') {
        throw new BadRequestException(
          `Invalid notification type: ${updateDto.notificationType}. ` +
          `This may require a database migration to add the enum value. ` +
          `Please contact support if this issue persists.`,
        );
      }
      
      // Re-throw other errors
      throw error;
    }
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
