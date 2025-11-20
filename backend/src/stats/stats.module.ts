import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { UserStats } from '../entities/user-stats.entity';
import { Result } from '../entities/result.entity';
import { Match } from '../entities/match.entity';
import { ELOLog } from '../entities/elo-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserStats, Result, Match, ELOLog])],
  providers: [StatsService],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}

