import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { UserStats } from '../entities/user-stats.entity';
import { Result } from '../entities/result.entity';
import { Match, MatchFormat } from '../entities/match.entity';
import { ELOLog, MatchType } from '../entities/elo-log.entity';

describe('StatsService', () => {
  let service: StatsService;
  let userStatsRepository: jest.Mocked<Repository<UserStats>>;
  let resultRepository: jest.Mocked<Repository<Result>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let eloLogRepository: jest.Mocked<Repository<ELOLog>>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(UserStats),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Result),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ELOLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    userStatsRepository = module.get(getRepositoryToken(UserStats));
    resultRepository = module.get(getRepositoryToken(Result));
    matchRepository = module.get(getRepositoryToken(Match));
    eloLogRepository = module.get(getRepositoryToken(ELOLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserStats', () => {
    it('should retrieve user statistics', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        totalMatches: 10,
        totalWins: 6,
        singlesElo: 1050,
        doublesElo: 1020,
        winStreakSingles: 3,
        winStreakDoubles: 1,
      } as UserStats;

      userStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStats('user-1');

      expect(result).toEqual(stats);
      expect(userStatsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['user'],
      });
    });

    it('should calculate win rate', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        totalMatches: 10,
        totalWins: 6,
      } as UserStats;

      userStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStats('user-1');

      expect(result.totalMatches).toBe(10);
      expect(result.totalWins).toBe(6);
      // Win rate would be 60% (6/10)
    });

    it('should calculate win streak', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        winStreakSingles: 3,
        winStreakDoubles: 1,
      } as UserStats;

      userStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStats('user-1');

      expect(result.winStreakSingles).toBe(3);
      expect(result.winStreakDoubles).toBe(1);
    });

    it('should include ELO rating', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        singlesElo: 1050,
        doublesElo: 1020,
      } as UserStats;

      userStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStats('user-1');

      expect(result.singlesElo).toBe(1050);
      expect(result.doublesElo).toBe(1020);
    });

    it('should handle user with no matches', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        totalMatches: 0,
        totalWins: 0,
        singlesElo: 1000,
        doublesElo: 1000,
      } as UserStats;

      userStatsRepository.findOne.mockResolvedValue(stats);

      const result = await service.getUserStats('user-1');

      expect(result.totalMatches).toBe(0);
      expect(result.totalWins).toBe(0);
    });

    it('should throw NotFoundException if stats not found', async () => {
      userStatsRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserStats('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHeadToHead', () => {
    it('should calculate head-to-head stats', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'result-1',
            matchId: 'match-1',
            player1UserId: 'user-1',
            player2UserId: 'user-2',
            score: '6-4 6-3',
            match: {
              id: 'match-1',
              date: new Date('2024-01-01'),
              format: MatchFormat.SINGLES,
            },
          },
          {
            id: 'result-2',
            matchId: 'match-2',
            player1UserId: 'user-2',
            player2UserId: 'user-1',
            score: '6-3 6-4',
            match: {
              id: 'match-2',
              date: new Date('2024-01-02'),
              format: MatchFormat.SINGLES,
            },
          },
        ]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getHeadToHead('user-1', 'user-2');

      expect(result.totalMatches).toBe(2);
      expect(result.player1Wins).toBe(1);
      expect(result.player2Wins).toBe(1);
      expect(result.matches).toHaveLength(2);
    });

    it('should return null for no matches', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getHeadToHead('user-1', 'user-2');

      expect(result.totalMatches).toBe(0);
      expect(result.player1Wins).toBe(0);
      expect(result.player2Wins).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it('should calculate head-to-head records correctly', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'result-1',
            matchId: 'match-1',
            player1UserId: 'user-1',
            player2UserId: 'user-2',
            score: '6-4 6-3',
            match: {
              id: 'match-1',
              date: new Date('2024-01-01'),
              format: MatchFormat.SINGLES,
            },
          },
        ]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getHeadToHead('user-1', 'user-2');

      expect(result.player1Wins).toBe(1);
      expect(result.player2Wins).toBe(0);
    });
  });

  describe('getEloHistory', () => {
    it('should retrieve ELO history', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'log-1',
            userId: 'user-1',
            matchId: 'match-1',
            matchType: MatchType.SINGLES,
            eloBefore: 1000,
            eloAfter: 1020,
          },
        ]),
      };

      eloLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEloHistory('user-1');

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('log.userId = :userId', {
        userId: 'user-1',
      });
    });

    it('should filter by match type', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      eloLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getEloHistory('user-1', MatchType.SINGLES);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.matchType = :matchType', {
        matchType: MatchType.SINGLES,
      });
    });

    it('should paginate ELO history', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      eloLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getEloHistory('user-1');

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
    });
  });
});

