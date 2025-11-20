import { IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../entities/notification.entity';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ description: 'Notification type' })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiProperty({ description: 'Enable email notifications' })
  @IsBoolean()
  emailEnabled: boolean;

  @ApiProperty({ description: 'Enable SMS notifications' })
  @IsBoolean()
  smsEnabled: boolean;
}

