import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { Match } from '../entities/match.entity';
import { Result } from '../entities/result.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    TypeOrmModule.forFeature([Match, Result, User]),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}

