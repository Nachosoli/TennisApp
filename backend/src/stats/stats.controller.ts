import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MatchType } from '../entities/elo-log.entity';

@ApiTags('stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@Param('userId') userId: string) {
    return this.statsService.getUserStats(userId);
  }

  @Get('head-to-head/:userId1/:userId2')
  @ApiOperation({ summary: 'Get head-to-head statistics between two users' })
  async getHeadToHead(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ) {
    return this.statsService.getHeadToHead(userId1, userId2);
  }

  @Get('users/:userId/elo-history')
  @ApiOperation({ summary: 'Get ELO history for a user' })
  async getEloHistory(
    @Param('userId') userId: string,
    @Query('matchType') matchType?: MatchType,
  ) {
    return this.statsService.getEloHistory(userId, matchType);
  }
}

