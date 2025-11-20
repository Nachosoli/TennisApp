import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchUpdatesGateway } from '../gateways/match-updates.gateway';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { User, UserRole } from '../entities/user.entity';
import { Court, SurfaceType } from '../entities/court.entity';
import { ApplyToSlotDto } from './dto/apply-to-slot.dto';
import type { Cache } from 'cache-manager';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationRepository: Repository<Application>;
  let matchSlotRepository: Repository<MatchSlot>;
  let matchRepository: Repository<Match>;
  let userRepository: Repository<User>;
  let cacheManager: Cache;
  let notificationsService: NotificationsService;
  let matchUpdatesGateway: MatchUpdatesGateway;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    homeCourtId: 'court-1',
    phoneVerified: true,
    phone: '+1234567890',
    role: UserRole.USER,
    isActive: true,
    bannedAt: null,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockCourt: Court = {
    id: 'court-1',
    name: 'Test Court',
    address: '123 Test St',
    surfaceType: SurfaceType.HARD,
  } as Court;

  const mockMatch: Match = {
    id: 'match-1',
    creatorUserId: 'creator-1',
    courtId: 'court-1',
    date: new Date(),
    status: MatchStatus.PENDING,
    court: mockCourt,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Match;

  const mockSlot: MatchSlot = {
    id: 'slot-1',
    matchId: 'match-1',
    startTime: '10:00',
    endTime: '11:00',
    status: SlotStatus.AVAILABLE,
    match: mockMatch,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as MatchSlot;

  const mockApplication: Application = {
    id: 'app-1',
    matchSlotId: 'slot-1',
    applicantUserId: 'user-1',
    status: ApplicationStatus.PENDING,
    matchSlot: mockSlot,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Application;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MatchSlot),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => '2'),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
        {
          provide: MatchUpdatesGateway,
          useValue: {
            emitMatchUpdate: jest.fn(),
            emitToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    applicationRepository = module.get<Repository<Application>>(getRepositoryToken(Application));
    matchSlotRepository = module.get<Repository<MatchSlot>>(getRepositoryToken(MatchSlot));
    matchRepository = module.get<Repository<Match>>(getRepositoryToken(Match));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    matchUpdatesGateway = module.get<MatchUpdatesGateway>(MatchUpdatesGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyToSlot', () => {
    const applyDto: ApplyToSlotDto = {
      matchSlotId: 'slot-1',
    };

    it('should apply to available slot', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      const slotWithMatch = { ...mockSlot, match: { ...mockMatch, creator: { id: 'creator-1' } } };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(matchSlotRepository, 'findOne').mockResolvedValue(slotWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(applicationRepository, 'create').mockReturnValue(mockApplication as Application);
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(applicationRepository, 'find').mockResolvedValue([]);

      const result = await service.applyToSlot('user-1', applyDto);

      expect(result).toBeDefined();
      expect(applicationRepository.save).toHaveBeenCalled();
    });

    it('should require home court', async () => {
      const userWithoutCourt = { ...mockUser, homeCourtId: null };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithoutCourt);

      await expect(service.applyToSlot('user-1', applyDto)).rejects.toThrow(ForbiddenException);
    });

    it('should require phone verification', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false, phone: '+1234567890' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(unverifiedUser);

      await expect(service.applyToSlot('user-1', applyDto)).rejects.toThrow(ForbiddenException);
    });

    it('should create Redis lock', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      const slotWithMatch = { ...mockSlot, match: { ...mockMatch, creator: { id: 'creator-1' } } };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(matchSlotRepository, 'findOne').mockResolvedValue(slotWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(applicationRepository, 'create').mockReturnValue(mockApplication as Application);
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(applicationRepository, 'find').mockResolvedValue([]);

      await service.applyToSlot('user-1', applyDto);

      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should reject already locked slot', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      const slotWithMatch = { ...mockSlot, match: { ...mockMatch, creator: { id: 'creator-1' } } };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(matchSlotRepository, 'findOne').mockResolvedValue(slotWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue('other-user');

      await expect(service.applyToSlot('user-1', applyDto)).rejects.toThrow(BadRequestException);
    });

    it('should prevent time overlap', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      const slotWithMatch = { ...mockSlot, match: { ...mockMatch, creator: { id: 'creator-1' } } };
      const overlappingApplication = {
        ...mockApplication,
        status: ApplicationStatus.CONFIRMED,
        matchSlot: {
          ...mockSlot,
          startTime: '10:30',
          endTime: '11:30',
        },
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(matchSlotRepository, 'findOne').mockResolvedValue(slotWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(applicationRepository, 'find').mockResolvedValue([overlappingApplication]);

      await expect(service.applyToSlot('user-1', applyDto)).rejects.toThrow(BadRequestException);
    });

    it('should support guest partner (doubles)', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      const slotWithMatch = { ...mockSlot, match: { ...mockMatch, creator: { id: 'creator-1' } } };
      const applyDtoWithGuest: ApplyToSlotDto = {
        matchSlotId: 'slot-1',
        guestPartnerName: 'Guest Partner',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(matchSlotRepository, 'findOne').mockResolvedValue(slotWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(applicationRepository, 'create').mockReturnValue({
        ...mockApplication,
        guestPartnerName: 'Guest Partner',
      } as Application);
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(applicationRepository, 'find').mockResolvedValue([]);

      const result = await service.applyToSlot('user-1', applyDtoWithGuest);

      expect(result).toBeDefined();
    });
  });

  describe('confirm', () => {
    it('should confirm application (creator only)', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue('user-1');
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.CONFIRMED,
      });
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      const result = await service.confirmApplication('creator-1', 'app-1');

      expect(result.status).toBe(ApplicationStatus.CONFIRMED);
    });

    it('should reject non-creator', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);

      await expect(service.confirmApplication('other-user', 'app-1')).rejects.toThrow(ForbiddenException);
    });

    it('should update match status to CONFIRMED', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue('user-1');
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(matchRepository, 'save').mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.CONFIRMED,
      });
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      await service.confirmApplication('creator-1', 'app-1');

      expect(matchRepository.save).toHaveBeenCalled();
    });

    it('should release other slot locks', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);
      jest.spyOn(cacheManager, 'get').mockResolvedValue('user-1');
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      await service.confirmApplication('creator-1', 'app-1');

      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should reject application', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);
      jest.spyOn(applicationRepository, 'save').mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.REJECTED,
      });
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      const result = await service.rejectApplication('creator-1', 'app-1');

      expect(result.status).toBe(ApplicationStatus.REJECTED);
    });

    it('should release lock', async () => {
      const applicationWithMatch = {
        ...mockApplication,
        matchSlot: {
          ...mockSlot,
          match: mockMatch,
        },
      };

      jest.spyOn(applicationRepository, 'findOne').mockResolvedValue(applicationWithMatch);
      jest.spyOn(applicationRepository, 'save').mockResolvedValue(mockApplication);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue(mockSlot);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      await service.rejectApplication('creator-1', 'app-1');

      expect(cacheManager.del).toHaveBeenCalled();
    });
  });
});

