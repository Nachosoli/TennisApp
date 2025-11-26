import { Controller, Get, Put, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUserNotifications(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationPreferencesService.getUserPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationPreferencesService.updatePreference(userId, updateDto);
  }

  @Post('push-subscription')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  async subscribeToPush(
    @CurrentUser('id') userId: string,
    @Body() subscriptionDto: PushSubscriptionDto,
  ) {
    return this.notificationsService.savePushSubscription(userId, subscriptionDto);
  }

  @Delete('push-subscription/:id')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribeFromPush(
    @CurrentUser('id') userId: string,
    @Param('id') subscriptionId: string,
  ) {
    return this.notificationsService.deletePushSubscription(userId, subscriptionId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.deleteNotification(userId, notificationId);
    return { message: 'Notification deleted successfully' };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all notifications for the current user' })
  async clearAllNotifications(@CurrentUser('id') userId: string) {
    await this.notificationsService.clearAllNotifications(userId);
    return { message: 'All notifications cleared successfully' };
  }
}
