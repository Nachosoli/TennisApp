import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { Court } from '../entities/court.entity';
import { Result } from '../entities/result.entity';
import { UserStats } from '../entities/user-stats.entity';
import { Application } from '../entities/application.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
  ) {}

  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(): Promise<{
    userGrowth: any;
    matchCompletion: any;
    popularCourts: any;
    eloDistribution: any;
    geographicDistribution: any;
    peakUsage: any;
    revenue: any; // Placeholder
  }> {
    const [
      userGrowth,
      matchCompletion,
      popularCourts,
      eloDistribution,
      geographicDistribution,
      peakUsage,
    ] = await Promise.all([
      this.getUserGrowth(),
      this.getMatchCompletion(),
      this.getPopularCourts(),
      this.getEloDistribution(),
      this.getGeographicDistribution(),
      this.getPeakUsage(),
    ]);

    return {
      userGrowth,
      matchCompletion,
      popularCourts,
      eloDistribution,
      geographicDistribution,
      peakUsage,
      revenue: { placeholder: true }, // Placeholder for future revenue tracking
    };
  }

  /**
   * User growth analytics
   */
  async getUserGrowth(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersLast30Days: number;
    growthRate: number;
    monthlyGrowth: Array<{ month: string; count: number }>;
  }> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await this.userRepository.count({
      where: {
        createdAt: MoreThan(thirtyDaysAgo),
      },
    });

    // Monthly growth for last 6 months
    const monthlyGrowth: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const count = await this.userRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      });

      monthlyGrowth.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count,
      });
    }

    const growthRate = totalUsers > 0 ? (newUsersLast30Days / totalUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      newUsersLast30Days,
      growthRate: Number(growthRate.toFixed(2)),
      monthlyGrowth,
    };
  }

  /**
   * Match completion analytics
   */
  async getMatchCompletion(): Promise<{
    totalMatches: number;
    completedMatches: number;
    cancelledMatches: number;
    pendingMatches: number;
    confirmedMatches: number;
    completionRate: number;
  }> {
    const totalMatches = await this.matchRepository.count();
    const completedMatches = await this.matchRepository.count({
      where: { status: MatchStatus.COMPLETED },
    });
    const cancelledMatches = await this.matchRepository.count({
      where: { status: MatchStatus.CANCELLED },
    });
    const pendingMatches = await this.matchRepository.count({
      where: { status: MatchStatus.PENDING },
    });
    const confirmedMatches = await this.matchRepository.count({
      where: { status: MatchStatus.CONFIRMED },
    });

    const completionRate =
      totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

    return {
      totalMatches,
      completedMatches,
      cancelledMatches,
      pendingMatches,
      confirmedMatches,
      completionRate: Number(completionRate.toFixed(2)),
    };
  }

  /**
   * Popular courts analytics
   */
  async getPopularCourts(limit: number = 10): Promise<
    Array<{
      courtId: string;
      courtName: string;
      matchCount: number;
      surfaceType: string;
    }>
  > {
    const courts = await this.courtRepository
      .createQueryBuilder('court')
      .leftJoin('court.matches', 'match')
      .select('court.id', 'courtId')
      .addSelect('court.name', 'courtName')
      .addSelect('court.surfaceType', 'surfaceType')
      .addSelect('COUNT(match.id)', 'matchCount')
      .where('court.deletedAt IS NULL')
      .groupBy('court.id')
      .orderBy('matchCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return courts.map((court) => ({
      courtId: court.courtId,
      courtName: court.courtName,
      matchCount: parseInt(court.matchCount, 10),
      surfaceType: court.surfaceType,
    }));
  }

  /**
   * ELO distribution analytics
   */
  async getEloDistribution(): Promise<{
    singles: {
      average: number;
      min: number;
      max: number;
      distribution: Array<{ range: string; count: number }>;
    };
    doubles: {
      average: number;
      min: number;
      max: number;
      distribution: Array<{ range: string; count: number }>;
    };
  }> {
    const singlesStats = await this.userStatsRepository
      .createQueryBuilder('stats')
      .select('AVG(stats.singlesElo)', 'average')
      .addSelect('MIN(stats.singlesElo)', 'min')
      .addSelect('MAX(stats.singlesElo)', 'max')
      .getRawOne();

    const doublesStats = await this.userStatsRepository
      .createQueryBuilder('stats')
      .select('AVG(stats.doublesElo)', 'average')
      .addSelect('MIN(stats.doublesElo)', 'min')
      .addSelect('MAX(stats.doublesElo)', 'max')
      .getRawOne();

    // ELO distribution ranges
    const ranges = [
      { min: 0, max: 800, label: '0-800' },
      { min: 800, max: 1000, label: '800-1000' },
      { min: 1000, max: 1200, label: '1000-1200' },
      { min: 1200, max: 1400, label: '1200-1400' },
      { min: 1400, max: 1600, label: '1400-1600' },
      { min: 1600, max: 9999, label: '1600+' },
    ];

    const singlesDistribution = await Promise.all(
      ranges.map(async (range) => {
        const count = await this.userStatsRepository.count({
          where: {
            singlesElo: Between(range.min, range.max),
          },
        });
        return { range: range.label, count };
      }),
    );

    const doublesDistribution = await Promise.all(
      ranges.map(async (range) => {
        const count = await this.userStatsRepository.count({
          where: {
            doublesElo: Between(range.min, range.max),
          },
        });
        return { range: range.label, count };
      }),
    );

    return {
      singles: {
        average: Number(singlesStats?.average || 1000),
        min: Number(singlesStats?.min || 1000),
        max: Number(singlesStats?.max || 1000),
        distribution: singlesDistribution,
      },
      doubles: {
        average: Number(doublesStats?.average || 1000),
        min: Number(doublesStats?.min || 1000),
        max: Number(doublesStats?.max || 1000),
        distribution: doublesDistribution,
      },
    };
  }

  /**
   * Geographic distribution (based on courts)
   */
  async getGeographicDistribution(): Promise<{
    totalCourts: number;
    publicCourts: number;
    privateCourts: number;
    surfaceDistribution: Array<{ surface: string; count: number }>;
  }> {
    const totalCourts = await this.courtRepository.count({
      where: { deletedAt: IsNull() },
    });
    const publicCourts = await this.courtRepository.count({
      where: { isPublic: true, deletedAt: IsNull() },
    });
    const privateCourts = await this.courtRepository.count({
      where: { isPublic: false, deletedAt: IsNull() },
    });

    // Surface distribution
    const surfaces = await this.courtRepository
      .createQueryBuilder('court')
      .select('court.surfaceType', 'surface')
      .addSelect('COUNT(*)', 'count')
      .where('court.deletedAt IS NULL')
      .groupBy('court.surfaceType')
      .getRawMany();

    return {
      totalCourts,
      publicCourts,
      privateCourts,
      surfaceDistribution: surfaces.map((s) => ({
        surface: s.surface,
        count: parseInt(s.count, 10),
      })),
    };
  }

  /**
   * Peak usage analytics
   */
  async getPeakUsage(): Promise<{
    peakDays: Array<{ day: string; matchCount: number }>;
    peakHours: Array<{ hour: number; matchCount: number }>;
  }> {
    // Peak days of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = await Promise.all(
      daysOfWeek.map(async (day, index) => {
        const matches = await this.matchRepository
          .createQueryBuilder('match')
          .where(`EXTRACT(DOW FROM match.date) = :dayIndex`, { dayIndex: index })
          .getCount();
        return { day, matchCount: matches };
      }),
    );

    // Peak hours (based on slot start times)
    const peakHours: Array<{ hour: number; matchCount: number }> = [];
    for (let hour = 6; hour < 22; hour++) {
      const matches = await this.matchRepository
        .createQueryBuilder('match')
        .leftJoin('match.slots', 'slot')
        .where(`EXTRACT(HOUR FROM slot.start_time) = :hour`, { hour })
        .getCount();
      peakHours.push({ hour, matchCount: matches });
    }

    return {
      peakDays: peakDays.sort((a, b) => b.matchCount - a.matchCount),
      peakHours: peakHours.sort((a, b) => b.matchCount - a.matchCount),
    };
  }
}

