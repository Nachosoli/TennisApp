import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from '../entities/report.entity';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { Court } from '../entities/court.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, User, Match, Court])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}

