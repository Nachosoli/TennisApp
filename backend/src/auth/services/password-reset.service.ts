import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_EXPIRATION_SECONDS = 3600; // 1 hour
  private readonly TOKEN_LENGTH = 32;
  private readonly MAX_ATTEMPTS = 5; // Maximum verification attempts
  private readonly RATE_LIMIT_SECONDS = 300; // Rate limit: 1 email per 5 minutes

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Generate a secure random reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Get Redis key for reset token
   */
  private getTokenKey(email: string): string {
    return `password_reset:token:${email}`;
  }

  /**
   * Get Redis key for reset attempts
   */
  private getAttemptsKey(email: string): string {
    return `password_reset:attempts:${email}`;
  }

  /**
   * Get Redis key for rate limiting
   */
  private getRateLimitKey(email: string): string {
    return `password_reset:rate_limit:${email}`;
  }

  /**
   * Send password reset token (stores token in Redis, returns token for email service)
   */
  async sendResetToken(email: string): Promise<string> {
    // Check rate limiting
    const rateLimitKey = this.getRateLimitKey(email);
    const lastSent = await this.cacheManager.get<number>(rateLimitKey);
    if (lastSent) {
      const timeSinceLastSent = Date.now() - lastSent;
      const remainingSeconds = Math.ceil((this.RATE_LIMIT_SECONDS * 1000 - timeSinceLastSent) / 1000);
      if (remainingSeconds > 0) {
        throw new HttpException(
          `Please wait ${remainingSeconds} seconds before requesting a new password reset email`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Generate reset token
    const token = this.generateResetToken();

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

    this.logger.log(`Password reset token generated for ${email}`);
    return token;
  }

  /**
   * Verify the reset token
   */
  async verifyResetToken(email: string, token: string): Promise<boolean> {
    // Check verification attempts
    const attemptsKey = this.getAttemptsKey(email);
    const attempts = (await this.cacheManager.get<number>(attemptsKey)) || 0;

    if (attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many reset attempts. Please request a new password reset email.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Get stored reset token
    const tokenKey = this.getTokenKey(email);
    const storedToken = await this.cacheManager.get<string>(tokenKey);

    if (!storedToken) {
      // Increment attempts
      await this.cacheManager.set(
        attemptsKey,
        attempts + 1,
        this.TOKEN_EXPIRATION_SECONDS * 1000,
      );
      throw new BadRequestException('Password reset token expired or invalid. Please request a new password reset email.');
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
   * Invalidate reset token for email
   */
  async invalidateToken(email: string): Promise<void> {
    const tokenKey = this.getTokenKey(email);
    const attemptsKey = this.getAttemptsKey(email);
    await this.cacheManager.del(tokenKey);
    await this.cacheManager.del(attemptsKey);
  }
}

