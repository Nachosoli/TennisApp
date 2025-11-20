import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

describe('ResultsController', () => {
  let controller: ResultsController;
  let resultsService: jest.Mocked<ResultsService>;

  beforeEach(async () => {
    const mockResultsService = {
      submitScore: jest.fn(),
      getResult: jest.fn(),
      disputeScore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [
        {
          provide: ResultsService,
          useValue: mockResultsService,
        },
      ],
    }).compile();

    controller = module.get<ResultsController>(ResultsController);
    resultsService = module.get(ResultsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/results', () => {
    it('should submit result successfully', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };
      const result = {
        id: 'result-1',
        ...createDto,
        player1UserId: 'user-1',
        player2UserId: 'user-2',
      };

      resultsService.submitScore.mockResolvedValue(result as any);

      const response = await controller.submitScore(createDto, 'user-1');

      expect(response).toEqual(result);
      expect(resultsService.submitScore).toHaveBeenCalledWith('user-1', createDto);
    });

    it('should require confirmed match', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };

      resultsService.submitScore.mockRejectedValue(
        new BadRequestException('Match must be confirmed before submitting scores'),
      );

      await expect(controller.submitScore(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should require participant access', async () => {
      const createDto = { matchId: 'match-1', score: '6-4 6-3' };

      resultsService.submitScore.mockRejectedValue(
        new ForbiddenException('You are not a participant in this match'),
      );

      await expect(controller.submitScore(createDto, 'user-3')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject invalid score format', async () => {
      const createDto = { matchId: 'match-1', score: 'invalid' };

      resultsService.submitScore.mockRejectedValue(
        new BadRequestException('Invalid score format'),
      );

      await expect(controller.submitScore(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /api/v1/results/matches/:matchId', () => {
    it('should get result', async () => {
      const result = {
        id: 'result-1',
        matchId: 'match-1',
        score: '6-4 6-3',
      };

      resultsService.getResult.mockResolvedValue(result as any);

      const response = await controller.getResult('match-1');

      expect(response).toEqual(result);
      expect(resultsService.getResult).toHaveBeenCalledWith('match-1');
    });
  });

  describe('PATCH /api/v1/results/matches/:matchId/dispute', () => {
    it('should dispute score successfully', async () => {
      const result = {
        id: 'result-1',
        matchId: 'match-1',
        disputed: true,
      };

      resultsService.disputeScore.mockResolvedValue(result as any);

      const response = await controller.disputeScore('match-1', 'user-1');

      expect(response).toEqual(result);
      expect(resultsService.disputeScore).toHaveBeenCalledWith('user-1', 'match-1');
    });
  });
});

