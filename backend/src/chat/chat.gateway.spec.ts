import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      handshake: {
        auth: {},
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };

    const mockChatService = {
      verifyMatchAccess: jest.fn(),
      createMessage: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer as Server;
    chatService = module.get(ChatService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate WebSocket connection with valid token', async () => {
      const token = 'valid-token';
      mockSocket.handshake.auth.token = token;
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(mockSocket.data.userId).toBe('user-1');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should authenticate with Bearer token from headers', async () => {
      const token = 'valid-token';
      mockSocket.handshake.headers.authorization = `Bearer ${token}`;
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      await gateway.handleConnection(mockSocket as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(mockSocket.data.userId).toBe('user-1');
    });

    it('should reject invalid token', async () => {
      mockSocket.handshake.auth.token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect if no token provided', async () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = {};

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinMatch', () => {
    it('should join match room for authorized user', async () => {
      mockSocket.data = { userId: 'user-1' };
      chatService.verifyMatchAccess.mockResolvedValue(true);

      await gateway.handleJoinMatch(mockSocket as Socket, { matchId: 'match-1' });

      expect(chatService.verifyMatchAccess).toHaveBeenCalledWith('user-1', 'match-1');
      expect(mockSocket.join).toHaveBeenCalledWith('match:match-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_match', { matchId: 'match-1' });
    });

    it('should validate match access', async () => {
      mockSocket.data = { userId: 'user-1' };
      chatService.verifyMatchAccess.mockResolvedValue(true);

      await gateway.handleJoinMatch(mockSocket as Socket, { matchId: 'match-1' });

      expect(chatService.verifyMatchAccess).toHaveBeenCalled();
    });

    it('should reject unauthorized user', async () => {
      mockSocket.data = { userId: 'user-3' };
      chatService.verifyMatchAccess.mockResolvedValue(false);

      await gateway.handleJoinMatch(mockSocket as Socket, { matchId: 'match-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to this match',
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should emit error if user not authenticated', async () => {
      mockSocket.data = {};

      await gateway.handleJoinMatch(mockSocket as Socket, { matchId: 'match-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
    });
  });

  describe('handleLeaveMatch', () => {
    it('should leave match room', () => {
      gateway.handleLeaveMatch(mockSocket as Socket, { matchId: 'match-1' });

      expect(mockSocket.leave).toHaveBeenCalledWith('match:match-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('left_match', { matchId: 'match-1' });
    });
  });

  describe('handleSendMessage', () => {
    it('should broadcast message to room', async () => {
      const createDto = { matchId: 'match-1', message: 'Hello' };
      const message = {
        id: 'msg-1',
        ...createDto,
        userId: 'user-1',
        createdAt: new Date(),
      };

      mockSocket.data = { userId: 'user-1' };
      chatService.createMessage.mockResolvedValue(message as any);

      await gateway.handleSendMessage(mockSocket as Socket, createDto);

      expect(chatService.createMessage).toHaveBeenCalledWith('user-1', createDto);
      expect(mockServer.to).toHaveBeenCalledWith('match:match-1');
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', message);
    });

    it('should store message in database', async () => {
      const createDto = { matchId: 'match-1', message: 'Hello' };
      const message = {
        id: 'msg-1',
        ...createDto,
        userId: 'user-1',
        createdAt: new Date(),
      };

      mockSocket.data = { userId: 'user-1' };
      chatService.createMessage.mockResolvedValue(message as any);

      await gateway.handleSendMessage(mockSocket as Socket, createDto);

      expect(chatService.createMessage).toHaveBeenCalled();
    });

    it('should emit error if user not authenticated', async () => {
      mockSocket.data = {};

      await gateway.handleSendMessage(mockSocket as Socket, {
        matchId: 'match-1',
        message: 'Hello',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Unauthorized' });
    });

    it('should handle errors gracefully', async () => {
      mockSocket.data = { userId: 'user-1' };
      chatService.createMessage.mockRejectedValue(new Error('Service error'));

      await gateway.handleSendMessage(mockSocket as Socket, {
        matchId: 'match-1',
        message: 'Hello',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Service error',
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnect', () => {
      gateway.handleDisconnect(mockSocket as Socket);

      // Should not throw error
      expect(gateway).toBeDefined();
    });
  });
});

