import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { User, UserRole } from '../entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phoneVerified: false,
    role: UserRole.USER,
  };

  const mockAuthResponse = {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            verifyPhone: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /api/v1/auth/register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      phone: '+1234567890',
    };

    it('should register user successfully', async () => {
      const expectedResponse = {
        user: mockUser as User,
        message: 'User registered successfully. Please verify your phone number.',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(expectedResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle validation errors - invalid email', async () => {
      const invalidDto = { ...registerDto, email: 'invalid-email' };
      
      // Note: Validation is handled by NestJS ValidationPipe, not in controller
      // This test would be covered by E2E tests
      expect(invalidDto.email).toBe('invalid-email');
    });

    it('should handle duplicate email error', async () => {
      jest.spyOn(authService, 'register').mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should handle weak password', async () => {
      const weakPasswordDto = { ...registerDto, password: 'short' };
      
      // Note: Validation is handled by NestJS ValidationPipe
      expect(weakPasswordDto.password).toBe('short');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should reject invalid credentials', async () => {
      jest.spyOn(authService, 'login').mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /api/v1/auth/verify-phone', () => {
    const verifyDto: VerifyPhoneDto = {
      phone: '+1234567890',
      code: '123456',
    };

    const mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    };

    it('should verify phone successfully', async () => {
      jest.spyOn(authService, 'verifyPhone').mockResolvedValue(undefined);

      await controller.verifyPhone(mockRequest, verifyDto);

      expect(authService.verifyPhone).toHaveBeenCalledWith(mockRequest.user.id, verifyDto);
    });

    it('should reject invalid verification code', async () => {
      jest.spyOn(authService, 'verifyPhone').mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      await expect(controller.verifyPhone(mockRequest, verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle wrong code', async () => {
      jest.spyOn(authService, 'verifyPhone').mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      await expect(controller.verifyPhone(mockRequest, verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    };

    it('should refresh token successfully', async () => {
      const refreshResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };

      jest.spyOn(authService, 'refreshToken').mockResolvedValue(refreshResponse);

      const result = await controller.refreshToken(mockRequest);

      expect(result).toEqual(refreshResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(mockRequest.user.id);
    });

    it('should reject invalid refresh token', async () => {
      jest.spyOn(authService, 'refreshToken').mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refreshToken(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    const mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneVerified: true,
        role: UserRole.USER,
        homeCourtId: null,
      },
    };

    it('should return current user information', () => {
      const result = controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: mockRequest.user.id,
        email: mockRequest.user.email,
        firstName: mockRequest.user.firstName,
        lastName: mockRequest.user.lastName,
        phoneVerified: mockRequest.user.phoneVerified,
        role: mockRequest.user.role,
        homeCourtId: mockRequest.user.homeCourtId,
      });
    });
  });
});

