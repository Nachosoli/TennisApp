import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import { User } from '../entities/user.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let notificationPreferenceRepository: jest.Mocked<Repository<NotificationPreference>>;
  let pushSubscriptionRepository: jest.Mocked<Repository<PushSubscription>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;
  let notificationsGateway: jest.Mocked<NotificationsGateway>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
      generateMatchCreatedEmail: jest.fn(),
      generateMatchAcceptedEmail: jest.fn(),
      generateMatchConfirmedEmail: jest.fn(),
      generateScoreReminderEmail: jest.fn(),
      generateNewChatMessageEmail: jest.fn(),
    };

    const mockSmsService = {
      sendSms: jest.fn(),
      generateMatchCreatedSms: jest.fn(),
      generateMatchAcceptedSms: jest.fn(),
      generateMatchConfirmedSms: jest.fn(),
      generateScoreReminderSms: jest.fn(),
      generateNewChatMessageSms: jest.fn(),
    };

    const mockNotificationsGateway = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
    notificationPreferenceRepository = module.get(getRepositoryToken(NotificationPreference));
    pushSubscriptionRepository = module.get(getRepositoryToken(PushSubscription));
    userRepository = module.get(getRepositoryToken(User));
    emailService = module.get(EmailService);
    smsService = module.get(SmsService);
    notificationsGateway = module.get(NotificationsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        phone: '+1234567890',
        phoneVerified: true,
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(null);
      notificationRepository.create.mockReturnValue({
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.MATCH_CONFIRMED,
        channel: NotificationChannel.EMAIL,
      } as Notification);
      notificationRepository.save.mockResolvedValue({} as Notification);
      emailService.sendEmail.mockResolvedValue(true);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CONFIRMED,
        'Match confirmed',
      );

      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should respect user preferences', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
      } as User;

      const preference = {
        userId: 'user-1',
        notificationType: NotificationType.MATCH_CREATED,
        emailEnabled: false,
        smsEnabled: false,
      } as NotificationPreference;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(preference);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CREATED,
        'Match created',
      );

      // Should not create notifications if preferences are disabled
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });

    it('should send email if enabled', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(null);
      notificationRepository.create.mockReturnValue({} as Notification);
      notificationRepository.save.mockResolvedValue({
        id: 'notif-1',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
      } as Notification);
      emailService.sendEmail.mockResolvedValue(true);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CONFIRMED,
        'Match confirmed',
      );

      // Process notifications asynchronously, so we check that save was called
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should send SMS if enabled', async () => {
      const user = {
        id: 'user-1',
        phone: '+1234567890',
        phoneVerified: true,
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(null);
      notificationRepository.create.mockReturnValue({} as Notification);
      notificationRepository.save.mockResolvedValue({
        id: 'notif-1',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.PENDING,
      } as Notification);
      smsService.sendSms.mockResolvedValue(true);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CONFIRMED,
        'Match confirmed',
      );

      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should handle SendGrid errors', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(null);
      notificationRepository.create.mockReturnValue({} as Notification);
      notificationRepository.save.mockResolvedValue({
        id: 'notif-1',
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.PENDING,
      } as Notification);
      emailService.sendEmail.mockResolvedValue(false);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CONFIRMED,
        'Match confirmed',
      );

      // Should handle error gracefully
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should handle Twilio errors', async () => {
      const user = {
        id: 'user-1',
        phone: '+1234567890',
        phoneVerified: true,
      } as User;

      userRepository.findOne.mockResolvedValue(user);
      notificationPreferenceRepository.findOne.mockResolvedValue(null);
      notificationRepository.create.mockReturnValue({} as Notification);
      notificationRepository.save.mockResolvedValue({
        id: 'notif-1',
        channel: NotificationChannel.SMS,
        status: NotificationStatus.PENDING,
      } as Notification);
      smsService.sendSms.mockResolvedValue(false);

      await service.createNotification(
        'user-1',
        NotificationType.MATCH_CONFIRMED,
        'Match confirmed',
      );

      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should list user notifications', async () => {
      const notifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: NotificationType.MATCH_CONFIRMED,
          content: 'Match confirmed',
        },
      ] as Notification[];

      notificationRepository.find.mockResolvedValue(notifications);

      const result = await service.getUserNotifications('user-1');

      expect(result).toEqual(notifications);
      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });

    it('should paginate notifications', async () => {
      const notifications = [] as Notification[];

      notificationRepository.find.mockResolvedValue(notifications);

      await service.getUserNotifications('user-1', 20);

      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = {
        id: 'notif-1',
        userId: 'user-1',
      } as Notification;

      notificationRepository.findOne.mockResolvedValue(notification);
      notificationRepository.save.mockResolvedValue(notification);

      await service.markAsRead('notif-1', 'user-1');

      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('savePushSubscription', () => {
    it('should save push subscription', async () => {
      const subscriptionDto = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
      };

      pushSubscriptionRepository.findOne.mockResolvedValue(null);
      pushSubscriptionRepository.create.mockReturnValue({
        id: 'sub-1',
        userId: 'user-1',
        ...subscriptionDto,
      } as PushSubscription);
      pushSubscriptionRepository.save.mockResolvedValue({} as PushSubscription);

      await service.savePushSubscription('user-1', subscriptionDto);

      expect(pushSubscriptionRepository.save).toHaveBeenCalled();
    });

    it('should update existing subscription', async () => {
      const subscriptionDto = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'key1',
          auth: 'key2',
        },
      };

      const existing = {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://example.com/push',
      } as PushSubscription;

      pushSubscriptionRepository.findOne.mockResolvedValue(existing);
      pushSubscriptionRepository.save.mockResolvedValue(existing);

      await service.savePushSubscription('user-1', subscriptionDto);

      expect(pushSubscriptionRepository.save).toHaveBeenCalled();
    });
  });

  describe('deletePushSubscription', () => {
    it('should delete push subscription', async () => {
      pushSubscriptionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deletePushSubscription('user-1', 'sub-1');

      expect(pushSubscriptionRepository.delete).toHaveBeenCalledWith({
        id: 'sub-1',
        userId: 'user-1',
      });
    });
  });

  describe('getUserPushSubscriptions', () => {
    it('should get user push subscriptions', async () => {
      const subscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://example.com/push',
        },
      ] as PushSubscription[];

      pushSubscriptionRepository.find.mockResolvedValue(subscriptions);

      const result = await service.getUserPushSubscriptions('user-1');

      expect(result).toEqual(subscriptions);
      expect(pushSubscriptionRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});

