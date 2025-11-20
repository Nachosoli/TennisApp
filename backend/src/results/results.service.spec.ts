import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ResultsService } from './results.service';
import { Result } from '../entities/result.entity';
import { Match, MatchStatus, MatchFormat } from '../entities/match.entity';
import { UserStats } from '../entities/user-stats.entity';
import { ELOLog, MatchType } from '../entities/elo-log.entity';
import { Application } from '../entities/application.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { EloService } from '../elo/elo.service';

describe('ResultsService', () => {
  let service: ResultsService;
  let resultRepository: jest.Mocked<Repository<Result>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let userStatsRepository: jest.Mocked<Repository<UserStats>>;
  let eloLogRepository: jest.Mocked<Repository<ELOLog>>;
  let applicationRepository: jest.Mocked<Repository<Application>>;
  let matchSlotRepository: jest.Mocked<Repository<MatchSlot>>;
  let eloService: jest.Mocked<EloService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockMatch: Partial<Match> = {
    id: 'match-1',
    creatorUserId: 'user-1',
    status: MatchStatus.CONFIRMED,
    format: MatchFormat.SINGLES,
    slots: [
      {
        id: 'slot-1',
        status: SlotStatus.CONFIRMED,
        application: {
          id: 'app-1',
          applicantUserId: 'user-2',
        } as Application,
      } as MatchSlot,
    ],
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn((callback) => callback({
        save: jest.fn(),
        create: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        {
          provide: getRepositoryToken(Result),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserStats),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ELOLog),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MatchSlot),
          useValue: mockRepository,
        },
        {
          provide: EloService,
          useValue: {
            calculateElo: jest.fn(() => ({ newElo1: 1020, newElo2: 980 })),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
    resultRepository = module.get(getRepositoryToken(Result));
    matchRepository = module.get(getRepositoryToken(Match));
    userStatsRepository = module.get(getRepositoryToken(UserStats));
    eloLogRepository = module.get(getRepositoryToken(ELOLog));
    applicationRepository = module.get(getRepositoryToken(Application));
    matchSlotRepository = module.get(getRepositoryToken(MatchSlot));
    eloService = module.get(EloService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateScore', () => {
    it('should accept valid score format', () => {
      const validScores = ['6-4', '6-4 6-3', '6-4 3-6 6-2', '7-5 6-4'];
      
      validScores.forEach((score) => {
        expect(() => {
          // Access private method via any for testing
          (service as any).validateScore(score);
        }).not.toThrow();
      });
    });

    it('should reject invalid score format', () => {
      const invalidScores = ['invalid', '6-4-3', '6 4', '6:4'];
      
      invalidScores.forEach((score) => {
        expect(() => {
          (service as any).validateScore(score);
        }).toThrow();
      });
    });
  });

  describe('submitScore', () => {
    it('should submit result successfully', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
        submittedByUserId: 'user-1',
        disputed: false,
      } as Result;

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue(null);
      resultRepository.create.mockReturnValue(result);
      resultRepository.save.mockResolvedValue(result);
      matchRepository.save.mockResolvedValue({ ...mockMatch, status: MatchStatus.COMPLETED } as Match);
      userStatsRepository.findOne
        .mockResolvedValueOnce({ userId: 'user-1', singlesElo: 1000 } as UserStats)
        .mockResolvedValueOnce({ userId: 'user-2', singlesElo: 1000 } as UserStats);

      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);
      jest.spyOn(service as any, 'updateEloAfterMatch').mockResolvedValue(undefined);

      const savedResult = await service.submitScore('user-1', createDto);

      expect(savedResult).toBeDefined();
      expect(resultRepository.save).toHaveBeenCalled();
      expect(matchRepository.save).toHaveBeenCalled();
    });

    it('should validate match is CONFIRMED', async () => {
      matchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.PENDING,
      } as Match);

      await expect(
        service.submitScore('user-1', {
          matchId: 'match-1',
          score: '6-4 6-3',
        }),
      ).rejects.toThrow('Match must be confirmed');
    });

    it('should validate user is participant', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(false);

      await expect(
        service.submitScore('user-3', {
          matchId: 'match-1',
          score: '6-4 6-3',
        }),
      ).rejects.toThrow('You are not a participant');
    });

    it('should validate score format', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue(null);
      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);

      await expect(
        service.submitScore('user-1', {
          matchId: 'match-1',
          score: 'invalid-score',
        }),
      ).rejects.toThrow('Invalid score format');
    });

    it('should support singles format', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
      } as Result;

      matchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        format: MatchFormat.SINGLES,
      } as Match);
      resultRepository.findOne.mockResolvedValue(null);
      resultRepository.create.mockReturnValue(result);
      resultRepository.save.mockResolvedValue(result);
      matchRepository.save.mockResolvedValue(mockMatch as Match);
      userStatsRepository.findOne
        .mockResolvedValueOnce({ userId: 'user-1', singlesElo: 1000 } as UserStats)
        .mockResolvedValueOnce({ userId: 'user-2', singlesElo: 1000 } as UserStats);

      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);
      jest.spyOn(service as any, 'updateEloAfterMatch').mockResolvedValue(undefined);

      await service.submitScore('user-1', createDto);

      expect(resultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          player1UserId: 'user-1',
          player2UserId: 'user-2',
        }),
      );
    });

    it('should support doubles format', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3', guestPlayer1Name: 'Guest' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
        guestPlayer1Name: 'Guest',
      } as Result;

      matchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        format: MatchFormat.DOUBLES,
        slots: [
          {
            id: 'slot-1',
            status: SlotStatus.CONFIRMED,
            application: {
              id: 'app-1',
              applicantUserId: 'user-2',
              guestPartnerName: 'Partner',
            } as Application,
          } as MatchSlot,
        ],
      } as Match);
      resultRepository.findOne.mockResolvedValue(null);
      resultRepository.create.mockReturnValue(result);
      resultRepository.save.mockResolvedValue(result);
      matchRepository.save.mockResolvedValue(mockMatch as Match);
      userStatsRepository.findOne
        .mockResolvedValueOnce({ userId: 'user-1', doublesElo: 1000 } as UserStats)
        .mockResolvedValueOnce({ userId: 'user-2', doublesElo: 1000 } as UserStats);

      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);
      jest.spyOn(service as any, 'updateEloAfterMatch').mockResolvedValue(undefined);

      await service.submitScore('user-1', createDto);

      expect(resultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          guestPlayer1Name: 'Guest',
          guestPlayer2Name: 'Partner',
        }),
      );
    });

    it('should calculate winner correctly', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
      } as Result;

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue(null);
      resultRepository.create.mockReturnValue(result);
      resultRepository.save.mockResolvedValue(result);
      matchRepository.save.mockResolvedValue(mockMatch as Match);
      userStatsRepository.findOne
        .mockResolvedValueOnce({ userId: 'user-1', singlesElo: 1000 } as UserStats)
        .mockResolvedValueOnce({ userId: 'user-2', singlesElo: 1000 } as UserStats);

      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);
      jest.spyOn(service as any, 'updateEloAfterMatch').mockResolvedValue(undefined);

      await service.submitScore('user-1', createDto);

      expect((service as any).updateEloAfterMatch).toHaveBeenCalledWith(
        'match-1',
        MatchType.SINGLES,
        'user-1',
        'user-2',
        '6-4 6-3',
      );
    });

    it('should update match status to COMPLETED', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
      } as Result;

      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue(null);
      resultRepository.create.mockReturnValue(result);
      resultRepository.save.mockResolvedValue(result);
      matchRepository.save.mockResolvedValue({ ...mockMatch, status: MatchStatus.COMPLETED } as Match);
      userStatsRepository.findOne
        .mockResolvedValueOnce({ userId: 'user-1', singlesElo: 1000 } as UserStats)
        .mockResolvedValueOnce({ userId: 'user-2', singlesElo: 1000 } as UserStats);

      jest.spyOn(service as any, 'verifyParticipant').mockResolvedValue(true);
      jest.spyOn(service as any, 'updateEloAfterMatch').mockResolvedValue(undefined);

      await service.submitScore('user-1', createDto);

      expect(matchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MatchStatus.COMPLETED }),
      );
    });

    it('should throw error if match not found', async () => {
      matchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.submitScore('user-1', {
          matchId: 'non-existent',
          score: '6-4 6-3',
        }),
      ).rejects.toThrow('Match not found');
    });

    it('should throw error if score already submitted', async () => {
      matchRepository.findOne.mockResolvedValue(mockMatch as Match);
      resultRepository.findOne.mockResolvedValue({} as Result);

      await expect(
        service.submitScore('user-1', {
          matchId: 'match-1',
          score: '6-4 6-3',
        }),
      ).rejects.toThrow('Score already submitted');
    });
  });

  describe('disputeScore', () => {
    it('should dispute score successfully', async () => {
      const result = {
        id: 'result-1',
        matchId: 'match-1',
        player1UserId: 'user-1',
        player2UserId: 'user-2',
        submittedByUserId: 'user-1',
        disputed: false,
      } as Result;

      resultRepository.findOne.mockResolvedValue(result);
      resultRepository.save.mockResolvedValue({ ...result, disputed: true });

      const disputedResult = await service.disputeScore('user-1', 'match-1');

      expect(disputedResult.disputed).toBe(true);
      expect(resultRepository.save).toHaveBeenCalled();
    });

    it('should reject non-participant', async () => {
      const result = {
        id: 'result-1',
        matchId: 'match-1',
        player1UserId: 'user-1',
        player2UserId: 'user-2',
        submittedByUserId: 'user-1',
        disputed: false,
      } as Result;

      resultRepository.findOne.mockResolvedValue(result);

      await expect(service.disputeScore('user-3', 'match-1')).rejects.toThrow(
        'You are not authorized',
      );
    });
  });

  describe('getResult', () => {
    it('should get result by match ID', async () => {
      const result = {
        id: 'result-1',
        matchId: 'match-1',
      } as Result;

      resultRepository.findOne.mockResolvedValue(result);

      const foundResult = await service.getResult('match-1');

      expect(foundResult).toEqual(result);
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { matchId: 'match-1' },
        relations: ['player1', 'player2', 'submittedBy', 'match'],
      });
    });

    it('should return null for no result', async () => {
      resultRepository.findOne.mockResolvedValue(null);

      const result = await service.getResult('match-1');

      expect(result).toBeNull();
    });
  });
});

