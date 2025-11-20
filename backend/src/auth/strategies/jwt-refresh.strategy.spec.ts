import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { User, UserRole } from '../../entities/user.entity';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let userRepository: Repository<User>;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    firstName: 'Test',
    lastName: 'User',
    phoneVerified: true,
    role: UserRole.USER,
    isActive: true,
    bannedAt: null,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.refreshSecret') {
                return 'test-refresh-secret';
              }
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    it('should validate refresh token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
    });

    it('should reject invalid refresh token - user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid refresh token - user banned', async () => {
      const bannedUser = { ...mockUser, bannedAt: new Date() };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(bannedUser);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid refresh token - user suspended', async () => {
      const suspendedUser = { ...mockUser, suspendedUntil: new Date(Date.now() + 86400000) };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(suspendedUser);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});

