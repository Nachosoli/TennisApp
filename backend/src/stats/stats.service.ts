import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStats } from '../entities/user-stats.entity';
import { Result } from '../entities/result.entity';
import { Match, MatchFormat } from '../entities/match.entity';
import { ELOLog, MatchType } from '../entities/elo-log.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(ELOLog)
    private eloLogRepository: Repository<ELOLog>,
  ) {}

  async getUserStats(userId: string): Promise<UserStats> {
    const stats = await this.userStatsRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!stats) {
      throw new NotFoundException('User stats not found');
    }

    // Calculate totalLosses: totalMatches - totalWins
    // Cancelled matches are excluded from totalMatches, so losses = matches - wins
    const totalLosses = Math.max(0, stats.totalMatches - stats.totalWins);

    // Return stats with totalLosses included
    return {
      ...stats,
      totalLosses,
    } as UserStats;
  }

  async getHeadToHead(userId1: string, userId2: string): Promise<{
    totalMatches: number;
    player1Wins: number;
    player2Wins: number;
    matches: Array<{
      matchId: string;
      date: Date;
      format: MatchFormat;
      score: string;
      winnerId: string;
    }>;
  }> {
    // Find all matches between these two users
    const results = await this.resultRepository
      .createQueryBuilder('result')
      .leftJoinAndSelect('result.match', 'match')
      .where(
        '(result.player1UserId = :userId1 AND result.player2UserId = :userId2) OR (result.player1UserId = :userId2 AND result.player2UserId = :userId1)',
        { userId1, userId2 },
      )
      .orderBy('match.date', 'DESC')
      .getMany();

    let player1Wins = 0;
    let player2Wins = 0;

    const matches = results.map((result) => {
      // Parse score to determine winner
      const sets = result.score.trim().split(/\s+/);
      let player1Sets = 0;
      let player2Sets = 0;

      for (const set of sets) {
        const [p1Games, p2Games] = set.split('-').map(Number);
        if (p1Games > p2Games) {
          player1Sets++;
        } else if (p2Games > p1Games) {
          player2Sets++;
        }
      }

      const player1Won = player1Sets > player2Sets;
      const winnerId = player1Won ? result.player1UserId : result.player2UserId;

      if (result.player1UserId === userId1) {
        if (player1Won) player1Wins++;
        else player2Wins++;
      } else {
        if (player1Won) player2Wins++;
        else player1Wins++;
      }

      return {
        matchId: result.matchId,
        date: result.match.date,
        format: result.match.format,
        score: result.score,
        winnerId,
      };
    });

    return {
      totalMatches: results.length,
      player1Wins,
      player2Wins,
      matches,
    };
  }

  async getEloHistory(userId: string, matchType?: MatchType): Promise<ELOLog[]> {
    const query = this.eloLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.match', 'match')
      .leftJoinAndSelect('log.opponent', 'opponent')
      .where('log.userId = :userId', { userId })
      .orderBy('log.createdAt', 'DESC');

    if (matchType) {
      query.andWhere('log.matchType = :matchType', { matchType });
    }

    return query.getMany();
  }

  async getEloChangeForMatch(userId: string, matchId: string): Promise<number | null> {
    const eloLog = await this.eloLogRepository.findOne({
      where: {
        userId,
        matchId,
      },
    });

    if (!eloLog) {
      return null;
    }

    return Number(eloLog.eloAfter) - Number(eloLog.eloBefore);
  }
}

