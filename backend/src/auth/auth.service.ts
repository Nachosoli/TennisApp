import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User, UserRole, Gender } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { PasswordService } from './services/password.service';
import { PhoneVerificationService } from './services/phone-verification.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { EmailService } from '../notifications/services/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    private passwordService: PasswordService,
    private phoneVerificationService: PhoneVerificationService,
    private emailVerificationService: EmailVerificationService,
    private passwordResetService: PasswordResetService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password (only if provided - OAuth users don't have passwords)
    const passwordHash = registerDto.password
      ? await this.passwordService.hashPassword(registerDto.password)
      : null;

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      phone: registerDto.phone,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phoneVerified: true, // Hardcoded to true for now
      emailVerified: false, // Users must verify their email via the verification link
      gender: Gender.OTHER, // Default to 'other' during registration, user can update on profile page
      role: UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);

    // Create user stats
    const userStats = this.userStatsRepository.create({
      userId: savedUser.id,
      singlesElo: 1500,
      doublesElo: 1500,
    });
    await this.userStatsRepository.save(userStats);

    // Generate tokens (like login does)
    const tokens = await this.generateTokens(savedUser);

    // Send email verification (non-blocking - don't fail registration if this fails)
    try {
      const verificationToken = await this.emailVerificationService.sendVerificationEmail(registerDto.email);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
      const verificationLink = `${frontendUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(registerDto.email)}`;
      const emailContent = this.emailService.generateEmailVerificationEmail(
        verificationLink,
        registerDto.firstName,
      );
      await this.emailService.sendEmail(
        registerDto.email,
        'Verify Your Email Address - CourtBuddy',
        emailContent,
      );
      this.logger.log(`Email verification sent to ${registerDto.email}`);
    } catch (error) {
      // Log error but don't fail registration
      this.logger.warn('Failed to send email verification', error);
    }

    // TODO: Re-enable SMS verification once Twilio is configured
    // Send verification code (non-blocking - don't fail registration if this fails)
    // try {
    //   await this.phoneVerificationService.sendVerificationCode(registerDto.phone);
    // } catch (error) {
    //   // Log error but don't fail registration
    //   this.logger.warn('Failed to send verification code', error);
    // }

    // Return tokens and user info (same structure as login)
    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        phone: savedUser.phone,
        phoneVerified: savedUser.phoneVerified,
        emailVerified: savedUser.emailVerified,
        gender: savedUser.gender,
        role: savedUser.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is OAuth-only (no password hash)
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses OAuth authentication. Please sign in with Google.',
      );
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBanned || user.isSuspended) {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        gender: user.gender,
        role: user.role,
      },
    };
  }

  async verifyEmail(email: string, token: string): Promise<void> {
    this.logger.log(`Email verification attempt for: ${email}`);
    
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Email verification failed: User not found for email ${email}`);
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      this.logger.log(`Email already verified for user ${user.id} - returning success`);
      return; // Email is already verified, treat as success
    }

    const isValid = await this.emailVerificationService.verifyEmailToken(email, token);

    if (!isValid) {
      this.logger.warn(`Email verification failed: Invalid or expired token for email ${email}, user ${user.id}`);
      throw new BadRequestException('Invalid or expired verification token');
    }

    this.logger.log(`Token validated successfully for user ${user.id}, updating database...`);
    
    try {
      user.emailVerified = true;
      await this.userRepository.save(user);
      
      // Invalidate user cache so the updated emailVerified status is reflected immediately
      const cacheKey = `user:${user.id}`;
      await this.cacheManager.del(cacheKey);
      this.logger.log(`User cache invalidated for user ${user.id}`);
      
      this.logger.log(`Email verified successfully for user ${user.id} (${email})`);
    } catch (error) {
      this.logger.error(`Failed to save email verification status for user ${user.id}:`, error);
      // Token was already deleted, so user will need to request a new verification email
      throw new BadRequestException('Failed to verify email. Please request a new verification email.');
    }
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    try {
      const verificationToken = await this.emailVerificationService.sendVerificationEmail(user.email);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
      const verificationLink = `${frontendUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
      const emailContent = this.emailService.generateEmailVerificationEmail(
        verificationLink,
        user.firstName,
      );
      await this.emailService.sendEmail(
        user.email,
        'Verify Your Email Address - CourtBuddy',
        emailContent,
      );
      this.logger.log(`Verification email resent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${user.email}:`, error);
      throw new BadRequestException('Failed to send verification email. Please try again later.');
    }
  }

  async sendPhoneVerification(userId: string, phone: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.phone || user.phone !== phone) {
      throw new BadRequestException('Phone number does not match your profile');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number is already verified');
    }

    await this.phoneVerificationService.sendVerificationCode(phone);
  }

  async verifyPhone(userId: string, verifyDto: VerifyPhoneDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.phone !== verifyDto.phone) {
      throw new BadRequestException('Phone number does not match');
    }

    const isValid = await this.phoneVerificationService.verifyCode(
      verifyDto.phone,
      verifyDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.phoneVerified = true;
    await this.userRepository.save(user);
  }

  async refreshToken(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || user.isBanned || user.isSuspended) {
      throw new UnauthorizedException('User not found or account suspended');
    }

    return this.generateTokens(user);
  }

  async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const secret = this.configService.get<string>('jwt.secret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '1h';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    if (!secret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn,
      } as any),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Don't reveal if email exists for security - always return success
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    try {
      // Generate reset token
      const resetToken = await this.passwordResetService.sendResetToken(email);
      
      // Build reset link
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
      const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      // Generate email content
      const emailContent = this.emailService.generatePasswordResetEmail(resetLink, user.firstName);
      
      // Send email
      await this.emailService.sendEmail(
        email,
        'Reset Your Password - CourtBuddy',
        emailContent,
      );
      
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      // Log error but don't reveal to user if email exists
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      // Still return success for security
    }
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token or email');
    }

    // Verify token
    const isValid = await this.passwordResetService.verifyResetToken(email, token);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired reset token. Please request a new password reset.');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);
    
    // Update user password
    user.passwordHash = passwordHash;
    await this.userRepository.save(user);
    
    // Invalidate token (already done in verifyResetToken, but ensure it's cleared)
    await this.passwordResetService.invalidateToken(email);
    
    this.logger.log(`Password reset successful for user ${user.id}`);
  }
}

