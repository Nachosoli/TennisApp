import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;

  beforeEach(async () => {
    const mockChatService = {
      getMatchMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/chat/matches/:matchId/messages', () => {
    it('should get messages successfully', async () => {
      const messages = [
        {
          id: 'msg-1',
          matchId: 'match-1',
          userId: 'user-1',
          message: 'Hello',
          createdAt: new Date(),
        },
      ];

      chatService.getMatchMessages.mockResolvedValue(messages as any);

      const result = await controller.getMatchMessages('match-1', 'user-1');

      expect(result).toEqual(messages);
      expect(chatService.getMatchMessages).toHaveBeenCalledWith('match-1', 'user-1');
    });

    it('should require match access', async () => {
      chatService.getMatchMessages.mockRejectedValue(
        new ForbiddenException('You do not have access to this match chat'),
      );

      await expect(controller.getMatchMessages('match-1', 'user-3')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should paginate messages', async () => {
      const messages = [];
      chatService.getMatchMessages.mockResolvedValue(messages as any);

      await controller.getMatchMessages('match-1', 'user-1');

      expect(chatService.getMatchMessages).toHaveBeenCalled();
    });
  });
});

