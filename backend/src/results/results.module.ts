import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { Result } from '../entities/result.entity';
import { Match } from '../entities/match.entity';
import { UserStats } from '../entities/user-stats.entity';
import { ELOLog } from '../entities/elo-log.entity';
import { Application } from '../entities/application.entity';
import { MatchSlot } from '../entities/match-slot.entity';
import { EloModule } from '../elo/elo.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, Match, UserStats, ELOLog, Application, MatchSlot]),
    EloModule,
    NotificationsModule,
  ],
  providers: [ResultsService],
  controllers: [ResultsController],
  exports: [ResultsService],
})
export class ResultsModule {}

