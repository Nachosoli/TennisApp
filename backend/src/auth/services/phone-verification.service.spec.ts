import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PhoneVerificationService } from './phone-verification.service';
import type { Cache } from 'cache-manager';
import twilio from 'twilio';

jest.mock('twilio');

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let cacheManager: Cache;
  let configService: ConfigService;
  let mockTwilioClient: any;

  const mockCache: Partial<Cache> = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (twilio as any).mockImplementation(() => mockTwilioClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhoneVerificationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                TWILIO_ACCOUNT_SID: 'test-account-sid',
                TWILIO_AUTH_TOKEN: 'test-auth-token',
                TWILIO_PHONE_NUMBER: '+1234567890',
              };
              return config[key];
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<PhoneVerificationService>(PhoneVerificationService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationCode', () => {
    const phone = '+1234567890';

    it('should generate and send code', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(mockTwilioClient.messages, 'create').mockResolvedValue({ sid: 'test-sid' });

      await service.sendVerificationCode(phone);

      expect(cacheManager.set).toHaveBeenCalled();
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
    });

    it('should store code in Redis with TTL', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(mockTwilioClient.messages, 'create').mockResolvedValue({ sid: 'test-sid' });

      await service.sendVerificationCode(phone);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('phone_verification:code:'),
        expect.any(String),
        600000, // 10 minutes in milliseconds
      );
    });

    it('should handle Twilio API errors', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const twilioError = new Error('Twilio error');
      (twilioError as any).code = '20003';
      jest.spyOn(mockTwilioClient.messages, 'create').mockRejectedValue(twilioError);

      await expect(service.sendVerificationCode(phone)).rejects.toThrow(BadRequestException);
    });

    it('should respect rate limiting', async () => {
      const recentTimestamp = Date.now() - 30000; // 30 seconds ago
      jest.spyOn(cacheManager, 'get').mockResolvedValue(recentTimestamp);

      await expect(service.sendVerificationCode(phone)).rejects.toThrow(HttpException);
    });

    it('should reset verification attempts when new code is sent', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      jest.spyOn(mockTwilioClient.messages, 'create').mockResolvedValue({ sid: 'test-sid' });

      await service.sendVerificationCode(phone);

      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining('phone_verification:attempts:'));
    });
  });

  describe('verifyCode', () => {
    const phone = '+1234567890';
    const code = '123456';

    it('should verify correct code', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(0).mockResolvedValueOnce(code);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.verifyCode(phone, code);

      expect(result).toBe(true);
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should reject incorrect code', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(0).mockResolvedValueOnce('wrong-code');
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.verifyCode(phone, code);

      expect(result).toBe(false);
      expect(cacheManager.set).toHaveBeenCalled(); // Increment attempts
    });

    it('should reject expired code', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(0).mockResolvedValueOnce(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await expect(service.verifyCode(phone, code)).rejects.toThrow(BadRequestException);
    });

    it('should reject code after max attempts', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(5); // Max attempts reached

      await expect(service.verifyCode(phone, code)).rejects.toThrow(HttpException);
      expect((await cacheManager.get(''))).toBe(5);
    });

    it('should increment attempts on failed verification', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(2).mockResolvedValueOnce('wrong-code');
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.verifyCode(phone, code);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('phone_verification:attempts:'),
        3, // Incremented from 2
        expect.any(Number),
      );
    });
  });

  describe('hasPendingVerification', () => {
    const phone = '+1234567890';

    it('should return true if code exists', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue('123456');

      const result = await service.hasPendingVerification(phone);

      expect(result).toBe(true);
    });

    it('should return false if no code exists', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);

      const result = await service.hasPendingVerification(phone);

      expect(result).toBe(false);
    });
  });

  describe('invalidateCode', () => {
    const phone = '+1234567890';

    it('should invalidate verification code', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.invalidateCode(phone);

      expect(cacheManager.del).toHaveBeenCalledTimes(2); // Code and attempts
    });
  });
});

