import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchUpdatesGateway } from '../gateways/match-updates.gateway';
import { Match, MatchFormat, MatchStatus } from '../entities/match.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Court, SurfaceType } from '../entities/court.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateMatchDto } from './dto/create-match.dto';

describe('MatchesService', () => {
  let service: MatchesService;
  let matchRepository: Repository<Match>;
  let matchSlotRepository: Repository<MatchSlot>;
  let courtRepository: Repository<Court>;
  let userRepository: Repository<User>;
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
    creatorUserId: 'user-1',
    courtId: 'court-1',
    date: new Date(),
    format: MatchFormat.SINGLES,
    status: MatchStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Match;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: getRepositoryToken(Match),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MatchSlot),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Court),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: MatchUpdatesGateway,
          useValue: {
            emitMatchUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
    matchRepository = module.get<Repository<Match>>(getRepositoryToken(Match));
    matchSlotRepository = module.get<Repository<MatchSlot>>(getRepositoryToken(MatchSlot));
    courtRepository = module.get<Repository<Court>>(getRepositoryToken(Court));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    matchUpdatesGateway = module.get<MatchUpdatesGateway>(MatchUpdatesGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateMatchDto = {
      courtId: 'court-1',
      date: new Date(Date.now() + 86400000), // Tomorrow
      format: MatchFormat.SINGLES,
      slots: [
        {
          startTime: '10:00',
          endTime: '11:00',
        },
      ],
    };

    it('should create match with valid data', async () => {
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(matchRepository, 'create').mockReturnValue(mockMatch as Match);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);
      jest.spyOn(matchSlotRepository, 'create').mockReturnValue({} as MatchSlot);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue([]);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      const result = await service.create('user-1', createDto);

      expect(result).toBeDefined();
      expect(matchRepository.save).toHaveBeenCalled();
    });

    it('should require home court', async () => {
      const userWithoutCourt = { ...mockUser, homeCourtId: null };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithoutCourt);

      await expect(service.create('user-1', createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should require phone verification', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false, phone: '+1234567890' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(unverifiedUser);

      await expect(service.create('user-1', createDto)).rejects.toThrow(ForbiddenException);
    });

    it('should validate no past dates', async () => {
      const pastDateDto = { ...createDto, date: new Date(Date.now() - 86400000) };
      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);

      await expect(service.create('user-1', pastDateDto)).rejects.toThrow(BadRequestException);
    });

    it('should create multiple slots', async () => {
      const multiSlotDto: CreateMatchDto = {
        ...createDto,
        slots: [
          { startTime: '10:00', endTime: '11:00' },
          { startTime: '11:00', endTime: '12:00' },
        ],
      };

      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(matchRepository, 'create').mockReturnValue(mockMatch as Match);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);
      jest.spyOn(matchSlotRepository, 'create').mockReturnValue({} as MatchSlot);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue([]);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      await service.create('user-1', multiSlotDto);

      expect(matchSlotRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should apply filters (skill, gender, distance, surface)', async () => {
      const filteredDto: CreateMatchDto = {
        ...createDto,
        skillLevelMin: 3.0,
        skillLevelMax: 4.0,
        genderFilter: 'Male',
        maxDistance: 10,
        surfaceFilter: SurfaceType.HARD,
      };

      const userWithCourt = { ...mockUser, homeCourt: mockCourt };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithCourt);
      jest.spyOn(courtRepository, 'findOne').mockResolvedValue(mockCourt);
      jest.spyOn(matchRepository, 'create').mockReturnValue(mockMatch as Match);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);
      jest.spyOn(matchSlotRepository, 'create').mockReturnValue({} as MatchSlot);
      jest.spyOn(matchSlotRepository, 'save').mockResolvedValue([]);
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      await service.create('user-1', filteredDto);

      expect(matchRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should list matches with filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMatch]),
      };

      jest.spyOn(matchRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll({ userId: 'user-1' });

      expect(result).toEqual([mockMatch]);
    });

    it('should filter by date range', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMatch]),
      };

      jest.spyOn(matchRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.findAll({
        dateFrom: new Date(),
        dateTo: new Date(Date.now() + 86400000),
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should get match details', async () => {
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);

      const result = await service.findOne('match-1');

      expect(result).toEqual(mockMatch);
    });

    it('should include applications', async () => {
      const matchWithApplications = { ...mockMatch };
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(matchWithApplications);

      const result = await service.findOne('match-1');

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update match details', async () => {
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);

      const updateDto = { format: MatchFormat.DOUBLES };
      const result = await service.update('user-1', 'match-1', updateDto);

      expect(result).toBeDefined();
    });

    it('should validate update permissions', async () => {
      const matchByOther = { ...mockMatch, creatorUserId: 'other-user' };
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(matchByOther);

      await expect(service.update('user-1', 'match-1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('should cancel match', async () => {
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(matchRepository, 'save').mockResolvedValue({ ...mockMatch, status: MatchStatus.CANCELLED });

      await service.cancel('user-1', 'match-1');

      expect(matchRepository.save).toHaveBeenCalled();
    });

    it('should notify applicants', async () => {
      jest.spyOn(matchRepository, 'findOne').mockResolvedValue(mockMatch);
      jest.spyOn(matchRepository, 'save').mockResolvedValue(mockMatch);

      await service.cancel('user-1', 'match-1');

      expect(matchRepository.save).toHaveBeenCalled();
    });
  });
});

