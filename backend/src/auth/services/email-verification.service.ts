import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly TOKEN_EXPIRATION_SECONDS = 86400; // 24 hours
  private readonly TOKEN_LENGTH = 32;
  private readonly MAX_ATTEMPTS = 5; // Maximum verification attempts
  private readonly RATE_LIMIT_SECONDS = 300; // Rate limit: 1 email per 5 minutes

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Generate a secure random verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Get Redis key for verification token
   */
  private getTokenKey(email: string): string {
    return `email_verification:token:${email}`;
  }

  /**
   * Get Redis key for verification attempts
   */
  private getAttemptsKey(email: string): string {
    return `email_verification:attempts:${email}`;
  }

  /**
   * Get Redis key for rate limiting
   */
  private getRateLimitKey(email: string): string {
    return `email_verification:rate_limit:${email}`;
  }

  /**
   * Send verification email (stores token in Redis, returns token for email service)
   */
  async sendVerificationEmail(email: string): Promise<string> {
    // Check rate limiting
    const rateLimitKey = this.getRateLimitKey(email);
    const lastSent = await this.cacheManager.get<number>(rateLimitKey);
    if (lastSent) {
      const timeSinceLastSent = Date.now() - lastSent;
      const remainingSeconds = Math.ceil((this.RATE_LIMIT_SECONDS * 1000 - timeSinceLastSent) / 1000);
      if (remainingSeconds > 0) {
        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting a new verification email`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Generate verification token
    const token = this.generateVerificationToken();

    // Store token in Redis with expiration
    const tokenKey = this.getTokenKey(email);
    await this.cacheManager.set(
      tokenKey,
      token,
      this.TOKEN_EXPIRATION_SECONDS * 1000, // Convert to milliseconds
    );

    // Reset verification attempts when new token is sent
    const attemptsKey = this.getAttemptsKey(email);
    await this.cacheManager.del(attemptsKey);

    // Set rate limit
    await this.cacheManager.set(
      rateLimitKey,
      Date.now(),
      this.RATE_LIMIT_SECONDS * 1000,
    );

    this.logger.log(`Verification token generated for ${email}`);
    return token;
  }

  /**
   * Verify the email token
   */
  async verifyEmailToken(email: string, token: string): Promise<boolean> {
    // Check verification attempts
    const attemptsKey = this.getAttemptsKey(email);
    const attempts = (await this.cacheManager.get<number>(attemptsKey)) || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many verification attempts. Please request a new verification email.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored verification token
    const tokenKey = this.getTokenKey(email);
    const storedToken = await this.cacheManager.get<string>(tokenKey);

    if (!storedToken) {
      // Increment attempts
      await this.cacheManager.set(
        attemptsKey,
        attempts + 1,
        this.TOKEN_EXPIRATION_SECONDS * 1000,
      );
      throw new BadRequestException('Verification token expired or invalid. Please request a new verification email.');
    }

    // Verify token
    const isValid = storedToken === token;

    if (isValid) {
      // Token is valid - delete it and attempts
      await this.cacheManager.del(tokenKey);
      await this.cacheManager.del(attemptsKey);
      return true;
    } else {
      // Increment attempts
      await this.cacheManager.set(
        attemptsKey,
        attempts + 1,
        this.TOKEN_EXPIRATION_SECONDS * 1000,
      );
      return false;
    }
  }

  /**
   * Check if a verification token exists for email (without verifying)
   */
  async hasPendingVerification(email: string): Promise<boolean> {
    const tokenKey = this.getTokenKey(email);
    const token = await this.cacheManager.get<string>(tokenKey);
    return !!token;
  }

  /**
   * Invalidate verification token for email
   */
  async invalidateToken(email: string): Promise<void> {
    const tokenKey = this.getTokenKey(email);
    const attemptsKey = this.getAttemptsKey(email);
    await this.cacheManager.del(tokenKey);
    await this.cacheManager.del(attemptsKey);
  }
}

