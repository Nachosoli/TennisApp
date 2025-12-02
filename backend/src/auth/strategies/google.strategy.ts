import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Gender } from '../../entities/user.entity';
import { UserStats } from '../../entities/user-stats.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    
    console.log('🔵 [GoogleStrategy] Constructor called');
    console.log('🔵 [GoogleStrategy] Client ID:', clientID ? 'SET' : 'NOT SET');
    console.log('🔵 [GoogleStrategy] Client Secret:', clientSecret ? 'SET' : 'NOT SET');
    
    // If credentials are missing, initialize with dummy values (strategy won't work but won't crash)
    if (!clientID || !clientSecret) {
      console.warn('⚠️  [GoogleStrategy] Google OAuth credentials are not configured. Google login will be disabled.');
      console.warn('⚠️  [GoogleStrategy] To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      // Initialize with dummy values so super() can be called
      super({
        clientID: 'dummy',
        clientSecret: 'dummy',
        callbackURL: 'http://localhost:3001/api/v1/auth/google/callback',
        scope: ['email', 'profile'],
      });
      return;
    }
    
    const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    const callbackUrl = configService.get<string>('GOOGLE_CALLBACK_URL') || `${backendUrl}/api/v1/auth/google/callback`;
    
    console.log('🔵 [GoogleStrategy] Initializing with callback:', callbackUrl);
    
    try {
      super({
        clientID,
        clientSecret,
        callbackURL: callbackUrl,
        scope: ['email', 'profile'],
      });
      console.log('✅ [GoogleStrategy] Successfully initialized');
    } catch (error) {
      console.error('❌ [GoogleStrategy] Failed to initialize:', error);
      throw error;
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const email = emails?.[0]?.value;
    const firstName = name?.givenName || '';
    const lastName = name?.familyName || '';
    const photoUrl = photos?.[0]?.value || null;

    if (!email) {
      return done(new Error('No email found in Google profile'), undefined);
    }

    // Try to find existing user by email or provider ID
    // First try by provider ID (more specific)
    let user = await this.userRepository.findOne({
      where: { provider: 'google', providerId: id },
    });
    
    // If not found, try by email
    if (!user) {
      user = await this.userRepository.findOne({
        where: { email },
      });
    }

    if (user) {
      // Update user if they're logging in with Google for the first time
      if (!user.provider || user.provider !== 'google') {
        user.provider = 'google';
        user.providerId = id;
        if (photoUrl && !user.photoUrl) {
          user.photoUrl = photoUrl;
        }
        await this.userRepository.save(user);
      }
    } else {
      // Create new user
      user = this.userRepository.create({
        email,
        firstName,
        lastName,
        provider: 'google',
        providerId: id,
        photoUrl,
        passwordHash: null, // OAuth users don't have passwords
        emailVerified: true, // Google emails are verified
        phoneVerified: true, // TODO: Set to false once Twilio is configured
        gender: Gender.OTHER, // Default to 'other' during registration, user can update on profile page
        role: 'user' as any,
      });
      user = await this.userRepository.save(user);
      
      // Create user stats for new user
      const userStats = this.userStatsRepository.create({
        userId: user.id,
        singlesElo: 1500,
        doublesElo: 1500,
      });
      await this.userStatsRepository.save(userStats);
    }

    return done(null, user);
  }
}

