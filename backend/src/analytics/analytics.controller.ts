import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive analytics dashboard (admin only)' })
  async getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth analytics (admin only)' })
  async getUserGrowth() {
    return this.analyticsService.getUserGrowth();
  }

  @Get('match-completion')
  @ApiOperation({ summary: 'Get match completion analytics (admin only)' })
  async getMatchCompletion() {
    return this.analyticsService.getMatchCompletion();
  }

  @Get('popular-courts')
  @ApiOperation({ summary: 'Get popular courts analytics (admin only)' })
  async getPopularCourts() {
    return this.analyticsService.getPopularCourts();
  }

  @Get('elo-distribution')
  @ApiOperation({ summary: 'Get ELO distribution analytics (admin only)' })
  async getEloDistribution() {
    return this.analyticsService.getEloDistribution();
  }

  @Get('geographic-distribution')
  @ApiOperation({ summary: 'Get geographic distribution analytics (admin only)' })
  async getGeographicDistribution() {
    return this.analyticsService.getGeographicDistribution();
  }

  @Get('peak-usage')
  @ApiOperation({ summary: 'Get peak usage analytics (admin only)' })
  async getPeakUsage() {
    return this.analyticsService.getPeakUsage();
  }
}

