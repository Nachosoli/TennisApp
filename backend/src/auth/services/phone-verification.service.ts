import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import twilio from 'twilio';

@Injectable()
export class PhoneVerificationService {
  private twilioClient: twilio.Twilio | null = null;
  private readonly CODE_EXPIRATION_SECONDS = 600; // 10 minutes
  private readonly CODE_LENGTH = 6;
  private readonly MAX_ATTEMPTS = 5; // Maximum verification attempts
  private readonly RATE_LIMIT_SECONDS = 60; // Rate limit: 1 code per minute

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && phoneNumber) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
      } catch (error) {
        console.warn('Failed to initialize Twilio client:', error);
        this.twilioClient = null;
      }
    }
  }

  /**
   * Generate a random 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get Redis key for verification code
   */
  private getCodeKey(phone: string): string {
    return `phone_verification:code:${phone}`;
  }

  /**
   * Get Redis key for verification attempts
   */
  private getAttemptsKey(phone: string): string {
    return `phone_verification:attempts:${phone}`;
  }

  /**
   * Get Redis key for rate limiting
   */
  private getRateLimitKey(phone: string): string {
    return `phone_verification:rate_limit:${phone}`;
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(phone: string): Promise<void> {
    if (!this.twilioClient) {
      // Don't throw error, just log warning - allow registration to proceed
      console.warn('Twilio is not configured - phone verification skipped');
      return;
    }

    const phoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    if (!phoneNumber) {
      console.warn('Twilio phone number not configured - phone verification skipped');
      return;
    }

    // Check rate limiting
    const rateLimitKey = this.getRateLimitKey(phone);
    const lastSent = await this.cacheManager.get<number>(rateLimitKey);
    if (lastSent) {
      const timeSinceLastSent = Date.now() - lastSent;
      const remainingSeconds = Math.ceil((this.RATE_LIMIT_SECONDS * 1000 - timeSinceLastSent) / 1000);
      if (remainingSeconds > 0) {
        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting a new code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    try {
      // Generate verification code
      const verificationCode = this.generateVerificationCode();

      // Store verification code in Redis with expiration
      const codeKey = this.getCodeKey(phone);
      await this.cacheManager.set(
        codeKey,
        verificationCode,
        this.CODE_EXPIRATION_SECONDS * 1000, // Convert to milliseconds
      );

      // Reset verification attempts when new code is sent
      const attemptsKey = this.getAttemptsKey(phone);
      await this.cacheManager.del(attemptsKey);

      // Set rate limit
      await this.cacheManager.set(
        rateLimitKey,
        Date.now(),
        this.RATE_LIMIT_SECONDS * 1000,
      );

      // Send SMS via Twilio
      await this.twilioClient.messages.create({
        body: `Your CourtMate verification code is: ${verificationCode}. This code expires in 10 minutes.`,
        to: phone,
        from: phoneNumber,
      });
    } catch (error: any) {
      // If Twilio error, log it but don't throw - let registration proceed without verification
      // The auth service will handle this gracefully
      console.error('Twilio SMS send failed:', error?.message || error);
      // Don't throw - registration should succeed even if SMS fails
      // Just log the error and return silently
      return;
    }
  }

  /**
   * Verify the code sent to phone number
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    // Check verification attempts
    const attemptsKey = this.getAttemptsKey(phone);
    const attempts = (await this.cacheManager.get<number>(attemptsKey)) || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many verification attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored verification code
    const codeKey = this.getCodeKey(phone);
    const storedCode = await this.cacheManager.get<string>(codeKey);

    if (!storedCode) {
      // Increment attempts
      await this.cacheManager.set(
        attemptsKey,
        attempts + 1,
        this.CODE_EXPIRATION_SECONDS * 1000,
      );
      throw new BadRequestException('Verification code expired or invalid. Please request a new code.');
    }

    // Verify code
    const isValid = storedCode === code;

    if (isValid) {
      // Code is valid - delete it and attempts
      await this.cacheManager.del(codeKey);
      await this.cacheManager.del(attemptsKey);
      return true;
    } else {
      // Increment attempts
      await this.cacheManager.set(
        attemptsKey,
        attempts + 1,
        this.CODE_EXPIRATION_SECONDS * 1000,
      );
      return false;
    }
  }

  /**
   * Check if a verification code exists for phone number (without verifying)
   */
  async hasPendingVerification(phone: string): Promise<boolean> {
    const codeKey = this.getCodeKey(phone);
    const code = await this.cacheManager.get<string>(codeKey);
    return !!code;
  }

  /**
   * Invalidate verification code for phone number
   */
  async invalidateCode(phone: string): Promise<void> {
    const codeKey = this.getCodeKey(phone);
    const attemptsKey = this.getAttemptsKey(phone);
    await this.cacheManager.del(codeKey);
    await this.cacheManager.del(attemptsKey);
  }
}

