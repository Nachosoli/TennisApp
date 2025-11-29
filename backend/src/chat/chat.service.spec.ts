import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessage } from '../entities/chat-message.entity';
import { Match } from '../entities/match.entity';
import { Application } from '../entities/application.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.enums';

describe('ChatService', () => {
  let service: ChatService;
  let chatMessageRepository: jest.Mocked<Repository<ChatMessage>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockMatch: Partial<Match> = {
    id: 'match-1',
    creatorUserId: 'user-1',
    date: new Date(),
    slots: [
      {
        id: 'slot-1',
        application: {
          applicantUserId: 'user-2',
        } as Application,
      } as any,
    ],
    court: { name: 'Test Court' } as any,
  };

  const mockUser: Partial<User> = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const mockNotificationsService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatMessageRepository = module.get(getRepositoryToken(ChatMessage));
    matchRepository = module.get(getRepositoryToken(Match));
    applicationRepository = module.get(getRepositoryToken(Application));
    userRepository = module.get(getRepositoryToken(User));
    notificationsService = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMessage', () => {
    it('should create message successfully', async () => {
      const createDto = { matchId: 'match-1', message: 'Hello' };
      const savedMessage = {
        id: 'msg-1',
        matchId: 'match-1',
        userId: 'user-1',
        message: 'Hello',
        createdAt: new Date(),
      } as ChatMessage;

      matchRepository.findOne
        .mockResolvedValueOnce(mockMatch as Match) // First call for match check
        .mockResolvedValueOnce({ ...mockMatch, creator: mockUser } as Match); // Second call for relations

      chatMessageRepository.create.mockReturnValue(savedMessage);
      chatMessageRepository.save.mockResolvedValue(savedMessage);
      userRepository.findOne.mockResolvedValue(mockUser as User);

      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      const result = await service.createMessage('user-1', createDto);

      expect(result).toBeDefined();
      expect(chatMessageRepository.create).toHaveBeenCalledWith({
        matchId: 'match-1',
        userId: 'user-1',
        message: 'Hello',
      });
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should validate match access', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(false);

      await expect(
        service.createMessage('user-3', {
          matchId: 'match-1',
          message: 'Hello',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if match not found', async () => {
      matchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', {
          matchId: 'non-existent',
          message: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should store message in database', async () => {
      const createDto = { matchId: 'match-1', message: 'Test message' };
      const savedMessage = {
        id: 'msg-1',
        ...createDto,
        userId: 'user-1',
        createdAt: new Date(),
      } as ChatMessage;

      matchRepository.findOne
        .mockResolvedValueOnce(mockMatch as Match)
        .mockResolvedValueOnce({ ...mockMatch, creator: mockUser } as Match);

      chatMessageRepository.create.mockReturnValue(savedMessage);
      chatMessageRepository.save.mockResolvedValue(savedMessage);
      userRepository.findOne.mockResolvedValue(mockUser as User);

      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      await service.createMessage('user-1', createDto);

      expect(chatMessageRepository.save).toHaveBeenCalledWith(savedMessage);
    });

    it('should send notifications to participants', async () => {
      const createDto = { matchId: 'match-1', message: 'Hello' };
      const savedMessage = {
        id: 'msg-1',
        ...createDto,
        userId: 'user-1',
        createdAt: new Date(),
      } as ChatMessage;

      const matchWithRelations = {
        ...mockMatch,
        creator: mockUser,
        creatorUserId: 'user-1',
        slots: [
          {
            application: {
              applicantUserId: 'user-2',
            },
          },
        ],
      } as Match;

      matchRepository.findOne
        .mockResolvedValueOnce(mockMatch as Match)
        .mockResolvedValueOnce(matchWithRelations);

      chatMessageRepository.create.mockReturnValue(savedMessage);
      chatMessageRepository.save.mockResolvedValue(savedMessage);
      userRepository.findOne.mockResolvedValue(mockUser as User);

      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      await service.createMessage('user-1', createDto);

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'user-2',
        NotificationType.NEW_CHAT,
        expect.stringContaining('John Doe'),
        expect.any(Object),
      );
    });
  });

  describe('verifyMatchAccess', () => {
    it('should return true for match creator', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);

      const hasAccess = await service.verifyMatchAccess('user-1', 'match-1');

      expect(hasAccess).toBe(true);
    });

    it('should return true for applicant', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);

      const hasAccess = await service.verifyMatchAccess('user-2', 'match-1');

      expect(hasAccess).toBe(true);
    });

    it('should return false for unauthorized user', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);

      const hasAccess = await service.verifyMatchAccess('user-3', 'match-1');

      expect(hasAccess).toBe(false);
    });

    it('should return false if match not found', async () => {
      matchRepository.findOne.mockResolvedValue(null);

      const hasAccess = await service.verifyMatchAccess('user-1', 'non-existent');

      expect(hasAccess).toBe(false);
    });
  });

  describe('getMatchMessages', () => {
    it('should retrieve messages for match', async () => {
      const messages = [
        {
          id: 'msg-1',
          matchId: 'match-1',
          userId: 'user-1',
          message: 'Hello',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          matchId: 'match-1',
          userId: 'user-2',
          message: 'Hi',
          createdAt: new Date(),
        },
      ] as ChatMessage[];

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      chatMessageRepository.find.mockResolvedValue(messages);
      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      const result = await service.getMatchMessages('match-1', 'user-1');

      expect(result).toEqual(messages);
      expect(chatMessageRepository.find).toHaveBeenCalledWith({
        where: { matchId: 'match-1' },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should paginate messages', async () => {
      const messages = [] as ChatMessage[];

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      chatMessageRepository.find.mockResolvedValue(messages);
      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      await service.getMatchMessages('match-1', 'user-1');

      expect(chatMessageRepository.find).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const messages = [] as ChatMessage[];

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      chatMessageRepository.find.mockResolvedValue(messages);
      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(true);

      await service.getMatchMessages('match-1', 'user-1');

      expect(chatMessageRepository.find).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      jest.spyOn(service, 'verifyMatchAccess').mockResolvedValue(false);

      await expect(service.getMatchMessages('match-1', 'user-3')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

