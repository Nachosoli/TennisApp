import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Court } from '../entities/court.entity';
import { Result } from '../entities/result.entity';
import { UserStats } from '../entities/user-stats.entity';
import { Application } from '../entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, Court, Result, UserStats, Application]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

