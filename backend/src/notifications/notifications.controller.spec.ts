import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;
  let notificationPreferencesService: jest.Mocked<NotificationPreferencesService>;

  beforeEach(async () => {
    const mockNotificationsService = {
      getUserNotifications: jest.fn(),
      markAsRead: jest.fn(),
      savePushSubscription: jest.fn(),
      deletePushSubscription: jest.fn(),
    };

    const mockNotificationPreferencesService = {
      getUserPreferences: jest.fn(),
      updatePreference: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: NotificationPreferencesService,
          useValue: mockNotificationPreferencesService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
    notificationPreferencesService = module.get(NotificationPreferencesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/notifications', () => {
    it('should list notifications', async () => {
      const notifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'MATCH_CONFIRMED',
          content: 'Match confirmed',
        },
      ];

      notificationsService.getUserNotifications.mockResolvedValue(notifications as any);

      const result = await controller.getNotifications('user-1');

      expect(result).toEqual(notifications);
      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const preferences = [
        {
          userId: 'user-1',
          notificationType: 'MATCH_CONFIRMED',
          emailEnabled: true,
          smsEnabled: false,
        },
      ];

      notificationPreferencesService.getUserPreferences.mockResolvedValue(preferences as any);

      const result = await controller.getPreferences('user-1');

      expect(result).toEqual(preferences);
      expect(notificationPreferencesService.getUserPreferences).toHaveBeenCalledWith('user-1');
    });
  });

  describe('PUT /api/v1/notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const updateDto = {
        notificationType: 'MATCH_CONFIRMED',
        emailEnabled: true,
        smsEnabled: false,
      };

      const preference = {
        id: 'pref-1',
        ...updateDto,
      };

      notificationPreferencesService.updatePreference.mockResolvedValue(preference as any);

      const result = await controller.updatePreferences('user-1', updateDto);

      expect(result).toEqual(preference);
      expect(notificationPreferencesService.updatePreference).toHaveBeenCalledWith(
        'user-1',
        updateDto,
      );
    });
  });

  describe('POST /api/v1/notifications/push-subscription', () => {
    it('should register push subscription', async () => {
      const subscriptionDto = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
      };

      const subscription = {
        id: 'sub-1',
        userId: 'user-1',
        ...subscriptionDto,
      };

      notificationsService.savePushSubscription.mockResolvedValue(subscription as any);

      const result = await controller.subscribeToPush('user-1', subscriptionDto);

      expect(result).toEqual(subscription);
      expect(notificationsService.savePushSubscription).toHaveBeenCalledWith(
        'user-1',
        subscriptionDto,
      );
    });
  });

  describe('DELETE /api/v1/notifications/push-subscription/:id', () => {
    it('should unsubscribe from push notifications', async () => {
      notificationsService.deletePushSubscription.mockResolvedValue(undefined);

      await controller.unsubscribeFromPush('user-1', 'sub-1');

      expect(notificationsService.deletePushSubscription).toHaveBeenCalledWith('user-1', 'sub-1');
    });
  });
});

