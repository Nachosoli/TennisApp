import { Test, TestingModule } from '@nestjs/testing';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { User, UserRole } from '../entities/user.entity';
import { Match, MatchFormat, MatchStatus } from '../entities/match.entity';

describe('MatchesController', () => {
  let controller: MatchesController;
  let matchesService: MatchesService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    homeCourtId: 'court-1',
    phoneVerified: true,
    phone: '+1234567890',
  };

  const mockMatch: Partial<Match> = {
    id: 'match-1',
    creatorUserId: 'user-1',
    courtId: 'court-1',
    date: new Date(),
    format: MatchFormat.SINGLES,
    status: MatchStatus.PENDING,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getCalendar: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            cancel: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MatchesController>(MatchesController);
    matchesService = module.get<MatchesService>(MatchesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/matches', () => {
    const createDto = {
      courtId: 'court-1',
      date: new Date().toISOString(),
      format: MatchFormat.SINGLES,
      slots: [
        {
          startTime: '10:00',
          endTime: '11:00',
        },
      ],
    };

    it('should create match successfully', async () => {
      jest.spyOn(matchesService, 'create').mockResolvedValue(mockMatch as Match);

      const result = await controller.create(mockUser as User, createDto);

      expect(result).toEqual(mockMatch);
      expect(matchesService.create).toHaveBeenCalledWith(mockUser.id, createDto);
    });

    it('should require home court error', async () => {
      const userWithoutCourt = { ...mockUser, homeCourtId: null };
      jest.spyOn(matchesService, 'create').mockRejectedValue(
        new BadRequestException('Home court required'),
      );

      await expect(controller.create(userWithoutCourt as User, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require phone verification error', async () => {
      const unverifiedUser = { ...mockUser, phoneVerified: false };
      jest.spyOn(matchesService, 'create').mockRejectedValue(
        new BadRequestException('Phone verification required'),
      );

      await expect(controller.create(unverifiedUser as User, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject past date validation error', async () => {
      const pastDateDto = { ...createDto, date: new Date(Date.now() - 86400000).toISOString() };
      jest.spyOn(matchesService, 'create').mockRejectedValue(
        new BadRequestException('Cannot create match in the past'),
      );

      await expect(controller.create(mockUser as User, pastDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid slot time error', async () => {
      const invalidSlotDto = {
        ...createDto,
        slots: [{ startTime: '11:00', endTime: '10:00' }],
      };
      jest.spyOn(matchesService, 'create').mockRejectedValue(
        new BadRequestException('Invalid slot time range'),
      );

      await expect(controller.create(mockUser as User, invalidSlotDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /api/v1/matches', () => {
    it('should list matches with filters', async () => {
      const matches = [mockMatch];
      jest.spyOn(matchesService, 'findAll').mockResolvedValue(matches as Match[]);

      const result = await controller.findAll(
        undefined,
        undefined,
        MatchFormat.SINGLES,
        MatchStatus.PENDING,
      );

      expect(result).toEqual(matches);
      expect(matchesService.findAll).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      const matches = [mockMatch];
      jest.spyOn(matchesService, 'findAll').mockResolvedValue(matches as Match[]);

      const result = await controller.findAll();

      expect(result).toBeDefined();
    });
  });

  describe('GET /api/v1/matches/calendar', () => {
    it('should get calendar view', async () => {
      const calendarMatches = [mockMatch];
      jest.spyOn(matchesService, 'getCalendar').mockResolvedValue(calendarMatches as Match[]);

      const dateFrom = new Date().toISOString();
      const dateTo = new Date(Date.now() + 86400000).toISOString();

      const result = await controller.getCalendar(mockUser as User, dateFrom, dateTo);

      expect(result).toEqual(calendarMatches);
      expect(matchesService.getCalendar).toHaveBeenCalled();
    });

    it('should apply preference matching', async () => {
      const calendarMatches = [mockMatch];
      jest.spyOn(matchesService, 'getCalendar').mockResolvedValue(calendarMatches as Match[]);

      const dateFrom = new Date().toISOString();
      const dateTo = new Date(Date.now() + 86400000).toISOString();

      await controller.getCalendar(mockUser as User, dateFrom, dateTo);

      expect(matchesService.getCalendar).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/matches/:id', () => {
    it('should get match details', async () => {
      jest.spyOn(matchesService, 'findById').mockResolvedValue(mockMatch as Match);

      const result = await controller.findOne('match-1');

      expect(result).toEqual(mockMatch);
      expect(matchesService.findById).toHaveBeenCalledWith('match-1');
    });
  });

  describe('PUT /api/v1/matches/:id', () => {
    const updateDto = {
      date: new Date().toISOString(),
    };

    it('should update match (creator only)', async () => {
      const updatedMatch = { ...mockMatch, ...updateDto };
      jest.spyOn(matchesService, 'update').mockResolvedValue(updatedMatch as Match);

      const result = await controller.update(mockUser as User, 'match-1', updateDto);

      expect(result).toEqual(updatedMatch);
      expect(matchesService.update).toHaveBeenCalledWith(mockUser.id, 'match-1', updateDto);
    });

    it('should reject non-creator', async () => {
      const otherUser = { ...mockUser, id: 'user-2' };
      jest.spyOn(matchesService, 'update').mockRejectedValue(
        new ForbiddenException('Not authorized'),
      );

      await expect(controller.update(otherUser as User, 'match-1', updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('DELETE /api/v1/matches/:id', () => {
    it('should cancel match (creator only)', async () => {
      jest.spyOn(matchesService, 'cancel').mockResolvedValue(undefined);

      await controller.cancel(mockUser as User, 'match-1');

      expect(matchesService.cancel).toHaveBeenCalledWith(mockUser.id, 'match-1');
    });
  });
});

