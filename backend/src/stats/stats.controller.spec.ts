import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

describe('StatsController', () => {
  let controller: StatsController;
  let statsService: jest.Mocked<StatsService>;

  beforeEach(async () => {
    const mockStatsService = {
      getUserStats: jest.fn(),
      getHeadToHead: jest.fn(),
      getEloHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        {
          provide: StatsService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    controller = module.get<StatsController>(StatsController);
    statsService = module.get(StatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/stats/users/:userId', () => {
    it('should get user stats', async () => {
      const stats = {
        id: 'stats-1',
        userId: 'user-1',
        totalMatches: 10,
        totalWins: 6,
      };

      statsService.getUserStats.mockResolvedValue(stats as any);

      const result = await controller.getUserStats('user-1');

      expect(result).toEqual(stats);
      expect(statsService.getUserStats).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /api/v1/stats/head-to-head/:userId1/:userId2', () => {
    it('should get head-to-head stats', async () => {
      const headToHead = {
        totalMatches: 2,
        player1Wins: 1,
        player2Wins: 1,
        matches: [],
      };

      statsService.getHeadToHead.mockResolvedValue(headToHead);

      const result = await controller.getHeadToHead('user-1', 'user-2');

      expect(result).toEqual(headToHead);
      expect(statsService.getHeadToHead).toHaveBeenCalledWith('user-1', 'user-2');
    });
  });

  describe('GET /api/v1/stats/users/:userId/elo-history', () => {
    it('should get ELO history', async () => {
      const eloHistory = [
        {
          id: 'log-1',
          userId: 'user-1',
          eloBefore: 1000,
          eloAfter: 1020,
        },
      ];

      statsService.getEloHistory.mockResolvedValue(eloHistory as any);

      const result = await controller.getEloHistory('user-1', undefined);

      expect(result).toEqual(eloHistory);
      expect(statsService.getEloHistory).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should filter by match type', async () => {
      const eloHistory = [];

      statsService.getEloHistory.mockResolvedValue(eloHistory as any);

      await controller.getEloHistory('user-1', 'SINGLES');

      expect(statsService.getEloHistory).toHaveBeenCalledWith('user-1', 'SINGLES');
    });
  });
});

