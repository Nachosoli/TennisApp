import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { PhoneVerificationService } from './services/phone-verification.service';
import { User, UserRole } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let userStatsRepository: Repository<UserStats>;
  let passwordService: PasswordService;
  let phoneVerificationService: PhoneVerificationService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    phoneVerified: false,
    role: UserRole.USER,
    isActive: true,
    bannedAt: null,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockUserStats: UserStats = {
    id: 'stats-1',
    userId: 'user-1',
    singlesElo: 1000,
    doublesElo: 1000,
    winStreakSingles: 0,
    winStreakDoubles: 0,
    totalMatches: 0,
    totalWins: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserStats;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserStats),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
          },
        },
        {
          provide: PhoneVerificationService,
          useValue: {
            sendVerificationCode: jest.fn(),
            verifyCode: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'jwt.secret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.expiresIn': '1h',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userStatsRepository = module.get<Repository<UserStats>>(getRepositoryToken(UserStats));
    passwordService = module.get<PasswordService>(PasswordService);
    phoneVerificationService = module.get<PhoneVerificationService>(PhoneVerificationService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      phone: '+1234567890',
    };

    it('should register user successfully with valid data', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed_password');
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(userStatsRepository, 'create').mockReturnValue(mockUserStats as UserStats);
      jest.spyOn(userStatsRepository, 'save').mockResolvedValue(mockUserStats);
      jest.spyOn(phoneVerificationService, 'sendVerificationCode').mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result.user).toBeDefined();
      expect(result.message).toContain('verify your phone number');
      expect(passwordService.hashPassword).toHaveBeenCalledWith(registerDto.password);
      expect(userRepository.save).toHaveBeenCalled();
      expect(phoneVerificationService.sendVerificationCode).toHaveBeenCalledWith(registerDto.phone);
    });

    it('should reject duplicate email', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash password correctly', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed_password');
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(userStatsRepository, 'create').mockReturnValue(mockUserStats as UserStats);
      jest.spyOn(userStatsRepository, 'save').mockResolvedValue(mockUserStats);
      jest.spyOn(phoneVerificationService, 'sendVerificationCode').mockResolvedValue(undefined);

      await service.register(registerDto);

      expect(passwordService.hashPassword).toHaveBeenCalledWith(registerDto.password);
    });

    it('should register without phone verification if no phone provided', async () => {
      const registerDtoNoPhone: RegisterDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(passwordService, 'hashPassword').mockResolvedValue('hashed_password');
      const verifiedUser = { ...mockUser, phoneVerified: true };
      jest.spyOn(userRepository, 'create').mockReturnValue(verifiedUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(verifiedUser);
      jest.spyOn(userStatsRepository, 'create').mockReturnValue(mockUserStats as UserStats);
      jest.spyOn(userStatsRepository, 'save').mockResolvedValue(mockUserStats);

      const result = await service.register(registerDtoNoPhone);

      expect(result.message).toContain('registered successfully');
      expect(phoneVerificationService.sendVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('access_token');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('access_token').mockResolvedValueOnce('refresh_token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(passwordService.comparePassword).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
    });

    it('should reject invalid email', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('should reject incorrect password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should generate access and refresh tokens', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('access_token').mockResolvedValueOnce('refresh_token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should reject suspended user', async () => {
      const suspendedUser = { ...mockUser, suspendedUntil: new Date(Date.now() + 86400000) };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(suspendedUser);
      jest.spyOn(passwordService, 'comparePassword').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject banned user', async () => {
      const bannedUser = { ...mockUser, bannedAt: new Date() };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(bannedUser);
      jest.spyOn(passwordService, 'comparePassword').mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyPhone', () => {
    const verifyDto: VerifyPhoneDto = {
      phone: '+1234567890',
      code: '123456',
    };

    it('should verify phone successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(phoneVerificationService, 'verifyCode').mockResolvedValue(true);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, phoneVerified: true });

      await service.verifyPhone('user-1', verifyDto);

      expect(phoneVerificationService.verifyCode).toHaveBeenCalledWith(verifyDto.phone, verifyDto.code);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid verification code', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(phoneVerificationService, 'verifyCode').mockResolvedValue(false);

      await expect(service.verifyPhone('user-1', verifyDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject if phone number does not match', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const wrongPhoneDto = { ...verifyDto, phone: '+9999999999' };
      await expect(service.verifyPhone('user-1', wrongPhoneDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.verifyPhone('non-existent', verifyDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce('new_access_token').mockResolvedValueOnce('new_refresh_token');

      const result = await service.refreshToken('user-1');

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });

    it('should reject if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refreshToken('non-existent')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if user is suspended', async () => {
      const suspendedUser = { ...mockUser, suspendedUntil: new Date(Date.now() + 86400000) };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(suspendedUser);

      await expect(service.refreshToken('user-1')).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if user is banned', async () => {
      const bannedUser = { ...mockUser, bannedAt: new Date() };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(bannedUser);

      await expect(service.refreshToken('user-1')).rejects.toThrow(UnauthorizedException);
    });
  });

});

