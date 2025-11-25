import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { PhoneVerificationService } from './services/phone-verification.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret');
        const expiresIn = configService.get<string>('jwt.expiresIn');
        if (!secret) {
          throw new Error('JWT secret is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn || '1h',
          } as any,
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, UserStats]),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    PhoneVerificationService,
    EmailVerificationService,
    PasswordResetService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}

