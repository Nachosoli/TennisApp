import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../entities/user.entity';
import { Court } from '../entities/court.entity';
import { Match } from '../entities/match.entity';
import { Result } from '../entities/result.entity';
import { AdminAction } from '../entities/admin-action.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Court, Match, Result, AdminAction]),
    NotificationsModule,
    AuthModule, // Import AuthModule to access PasswordService
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
