import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Result } from '../entities/result.entity';
import { Match, MatchFormat, MatchStatus } from '../entities/match.entity';
import { UserStats } from '../entities/user-stats.entity';
import { ELOLog, MatchType } from '../entities/elo-log.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { EloService } from '../elo/elo.service';
import { sanitizeInput } from '../common/utils/sanitize.util';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @InjectRepository(ELOLog)
    private eloLogRepository: Repository<ELOLog>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(MatchSlot)
    private matchSlotRepository: Repository<MatchSlot>,
    private eloService: EloService,
    private dataSource: DataSource,
  ) {}

  async submitScore(userId: string, createDto: CreateResultDto): Promise<Result> {
    const match = await this.matchRepository.findOne({
      where: { id: createDto.matchId },
      relations: ['slots', 'slots.applications', 'slots.applications.applicant'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Check if match is confirmed
    if (match.status !== MatchStatus.CONFIRMED) {
      throw new BadRequestException('Match must be confirmed before submitting scores');
    }

    // Check if result already exists
    const existingResult = await this.resultRepository.findOne({
      where: { matchId: createDto.matchId },
    });

    if (existingResult) {
      throw new BadRequestException('Score already submitted for this match');
    }

    // Verify user is a participant
    const isParticipant = await this.verifyParticipant(userId, match);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this match');
    }

    // Get confirmed slot and find confirmed application
    const confirmedSlot = match.slots.find((slot) => slot.status === SlotStatus.CONFIRMED);
    if (!confirmedSlot || !confirmedSlot.applications || confirmedSlot.applications.length === 0) {
      throw new BadRequestException('Match does not have a confirmed application');
    }

    // Find the confirmed application (should only be one)
    const application = confirmedSlot.applications.find(
      (app) => app.status === ApplicationStatus.CONFIRMED,
    );
    if (!application) {
      throw new BadRequestException('Match does not have a confirmed application');
    }

    // Determine players based on match format
    let player1UserId: string | null = null;
    let player2UserId: string | null = null;
    let guestPlayer1Name: string | null = null;
    let guestPlayer2Name: string | null = null;

    if (match.format === MatchFormat.SINGLES) {
      player1UserId = match.creatorUserId;
      player2UserId = application.applicantUserId;
    } else {
      // Doubles: creator + applicant, with optional guests
      player1UserId = match.creatorUserId;
      player2UserId = application.applicantUserId;
      // Sanitize guest player names
      guestPlayer1Name = createDto.guestPlayer1Name 
        ? sanitizeInput(createDto.guestPlayer1Name) 
        : null;
      guestPlayer2Name = application.guestPartnerName 
        ? sanitizeInput(application.guestPartnerName) 
        : null;
    }

    // Validate score format (allow alternative outcomes)
    this.validateScore(createDto.score);
    
    // Handle alternative outcomes for winner determination
    const isAlternativeOutcome = createDto.score.toLowerCase().includes('won by default') || 
                                  createDto.score.toLowerCase().includes('retired');

    // Create result
    const result = this.resultRepository.create({
      matchId: createDto.matchId,
      player1UserId,
      player2UserId,
      guestPlayer1Name,
      guestPlayer2Name,
      score: createDto.score,
      submittedByUserId: userId,
      disputed: false,
    } as Partial<Result>);

    const savedResult = await this.resultRepository.save(result);

    // Update match status to completed
    match.status = MatchStatus.COMPLETED;
    await this.matchRepository.save(match);

    // Calculate and update ELO if both players are platform users
    // For alternative outcomes, determine winner based on who submitted
    if (player1UserId && player2UserId) {
      let scoreForElo = createDto.score;
      
      // If alternative outcome, we need to determine winner
      // If "Won by default" or "Opponent retired", the submitter won
      // We need to know if submitter is player1 or player2
      const submitterIsPlayer1 = userId === player1UserId;
      const isAlternativeOutcome = createDto.score.toLowerCase().includes('won by default') || 
                                    createDto.score.toLowerCase().includes('retired');
      
      if (isAlternativeOutcome) {
        // For ELO calculation, use a default score format
        // Score format is always "player1Games-player2Games"
        // If submitter (winner) is player1: "6-0 6-0" (player1 wins)
        // If submitter (winner) is player2: "0-6 0-6" (player2 wins, meaning player1 lost)
        scoreForElo = submitterIsPlayer1 ? '6-0 6-0' : '0-6 0-6';
      }
      
      try {
        await this.updateEloAfterMatch(
          match.id,
          match.format === MatchFormat.SINGLES ? MatchType.SINGLES : MatchType.DOUBLES,
          player1UserId,
          player2UserId,
          scoreForElo,
        );
      } catch (error) {
        // Log error but don't fail the result submission
        console.error(`Failed to update ELO for match ${match.id}:`, error);
        // Continue - result is still saved, just ELO wasn't updated
      }
    }

    return savedResult;
  }

  async disputeScore(userId: string, matchId: string): Promise<Result> {
    const result = await this.resultRepository.findOne({
      where: { matchId },
      relations: ['match', 'player1', 'player2'],
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    // Verify user is a participant
    if (
      result.player1UserId !== userId &&
      result.player2UserId !== userId &&
      result.submittedByUserId !== userId
    ) {
      throw new ForbiddenException('You are not authorized to dispute this score');
    }

    result.disputed = true;
    return this.resultRepository.save(result);
  }

  async getResult(matchId: string): Promise<Result | null> {
    return this.resultRepository.findOne({
      where: { matchId },
      relations: ['player1', 'player2', 'submittedBy', 'match'],
    });
  }

  private async verifyParticipant(userId: string, match: Match): Promise<boolean> {
    if (match.creatorUserId === userId) {
      return true;
    }

    const hasApplication = match.slots.some(
      (slot) => slot.applications?.some((app) => app.applicantUserId === userId),
    );

    return hasApplication;
  }

  private isValidTennisSetScore(playerGames: number, opponentGames: number): boolean {
    // Both must be non-negative integers
    if (playerGames < 0 || opponentGames < 0 || !Number.isInteger(playerGames) || !Number.isInteger(opponentGames)) {
      return false;
    }

    // If both are 0, it's empty (valid for partial entry)
    if (playerGames === 0 && opponentGames === 0) {
      return true;
    }

    // A set must be won by at least 2 games
    const diff = Math.abs(playerGames - opponentGames);
    
    // If one player has 6 or more games, they must win by 2
    if (playerGames >= 6 || opponentGames >= 6) {
      // Check for tiebreak (7-6 or 6-7)
      if ((playerGames === 7 && opponentGames === 6) || (playerGames === 6 && opponentGames === 7)) {
        return true; // Valid tiebreak
      }
      // Otherwise, must win by 2 and winner must have at least 6
      if (diff >= 2 && Math.max(playerGames, opponentGames) >= 6) {
        // But can't have scores like 7-4, 8-5, etc. (must be 6-0 to 6-4, or 7-5, or 7-6)
        const winner = Math.max(playerGames, opponentGames);
        const loser = Math.min(playerGames, opponentGames);
        
        // Valid scores: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
        if (winner === 6 && loser <= 4) {
          return true;
        }
        if (winner === 7 && (loser === 5 || loser === 6)) {
          return true;
        }
        // Invalid: 7-4, 8-6, etc.
        return false;
      }
      return false;
    }

    // If neither has 6, it's incomplete (valid for partial entry or retirement)
    return true;
  }

  private isSetComplete(playerGames: number, opponentGames: number): boolean {
    // If both are 0, it's empty (not complete)
    if (playerGames === 0 && opponentGames === 0) {
      return false;
    }

    // Check if one player has won the set
    const diff = Math.abs(playerGames - opponentGames);
    
    // If one player has 6+ games and leads by 2+, set is complete
    if ((playerGames >= 6 || opponentGames >= 6) && diff >= 2) {
      // Validate it's a valid winning score
      const winner = Math.max(playerGames, opponentGames);
      const loser = Math.min(playerGames, opponentGames);
      
      // Valid winning scores: 6-0 to 6-4, 7-5, 7-6
      if (winner === 6 && loser <= 4) {
        return true;
      }
      if (winner === 7 && (loser === 5 || loser === 6)) {
        return true;
      }
    }
    
    // Tiebreak (7-6 or 6-7) is complete
    if ((playerGames === 7 && opponentGames === 6) || (playerGames === 6 && opponentGames === 7)) {
      return true;
    }
    
    // Otherwise, set is incomplete
    return false;
  }

  private validateScore(score: string): void {
    // Allow alternative outcomes or standard score format
    const alternativeOutcomes = ['won by default', 'opponent retired'];
    const isAlternative = alternativeOutcomes.some(outcome => 
      score.toLowerCase().includes(outcome)
    );
    
    if (isAlternative) {
      // For alternative outcomes, allow incomplete scores
      // Extract set scores from the string (they may be before or after the alternative outcome text)
      const sets = score.trim().split(/\s+/).filter(s => /\d+-\d+/.test(s));
      
      if (sets.length > 0) {
        // Parse and validate incomplete scores are allowed
        for (const set of sets) {
          const [playerGamesStr, opponentGamesStr] = set.split('-');
          const playerGames = parseInt(playerGamesStr, 10);
          const opponentGames = parseInt(opponentGamesStr, 10);
          
          // Incomplete sets are allowed with alternative outcomes
          // But still validate format (non-negative integers)
          if (isNaN(playerGames) || isNaN(opponentGames) || playerGames < 0 || opponentGames < 0) {
            throw new BadRequestException('Invalid score format. Games must be non-negative integers.');
          }
        }
      }
      return; // Alternative outcomes are valid
    }
    
    // Format: "6-4 3-6 6-2" or "6-4 6-3"
    const scoreRegex = /^(\d+-\d+)(\s+\d+-\d+)*$/;
    if (!scoreRegex.test(score.trim())) {
      throw new BadRequestException(
        'Invalid score format. Use format like "6-4 3-6 6-2" or "6-4 6-3", or select an alternative outcome',
      );
    }

    // Parse and validate each set score
    const sets = score.trim().split(/\s+/);
    let hasIncompleteSet = false;

    for (const set of sets) {
      const [playerGamesStr, opponentGamesStr] = set.split('-');
      const playerGames = parseInt(playerGamesStr, 10);
      const opponentGames = parseInt(opponentGamesStr, 10);

      if (isNaN(playerGames) || isNaN(opponentGames)) {
        throw new BadRequestException(`Invalid score format in set: ${set}. Games must be numbers.`);
      }

      // Check if set is incomplete
      if (!this.isSetComplete(playerGames, opponentGames)) {
        hasIncompleteSet = true;
      }

      // Validate complete sets
      if (this.isSetComplete(playerGames, opponentGames)) {
        if (!this.isValidTennisSetScore(playerGames, opponentGames)) {
          throw new BadRequestException(
            `Invalid set score: ${set}. A set must be won by at least 2 games (e.g., 6-4, 7-5, or 7-6 for tiebreak). Scores like 6-5 are not valid.`,
          );
        }
      }
    }

    // If there are incomplete sets without alternative outcome, reject
    if (hasIncompleteSet) {
      throw new BadRequestException(
        'Incomplete scores require indicating opponent retired or won by default',
      );
    }
  }

  private async updateEloAfterMatch(
    matchId: string,
    matchType: MatchType,
    player1Id: string,
    player2Id: string,
    score: string,
  ): Promise<void> {
    // Parse score to determine winner
    const sets = score.trim().split(/\s+/);
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

    // Get current stats
    const player1Stats = await this.userStatsRepository.findOne({
      where: { userId: player1Id },
    });
    const player2Stats = await this.userStatsRepository.findOne({
      where: { userId: player2Id },
    });

    if (!player1Stats || !player2Stats) {
      throw new NotFoundException('User stats not found');
    }

    const currentElo1 =
      matchType === MatchType.SINGLES ? player1Stats.singlesElo : player1Stats.doublesElo;
    const currentElo2 =
      matchType === MatchType.SINGLES ? player2Stats.singlesElo : player2Stats.doublesElo;

    // Calculate new ELO
    const { newElo1, newElo2 } = this.eloService.calculateElo(
      Number(currentElo1),
      Number(currentElo2),
      player1Won,
    );

    // Use transaction to ensure consistency
    await this.dataSource.transaction(async (manager) => {
      // Update stats
      if (matchType === MatchType.SINGLES) {
        player1Stats.singlesElo = newElo1;
        player2Stats.singlesElo = newElo2;
      } else {
        player1Stats.doublesElo = newElo1;
        player2Stats.doublesElo = newElo2;
      }

      // Update win streaks
      if (player1Won) {
        player1Stats.winStreakSingles =
          matchType === MatchType.SINGLES
            ? player1Stats.winStreakSingles + 1
            : player1Stats.winStreakSingles;
        player1Stats.winStreakDoubles =
          matchType === MatchType.DOUBLES
            ? player1Stats.winStreakDoubles + 1
            : player1Stats.winStreakDoubles;
        player1Stats.totalWins++;
        player2Stats.winStreakSingles =
          matchType === MatchType.SINGLES ? 0 : player2Stats.winStreakSingles;
        player2Stats.winStreakDoubles =
          matchType === MatchType.DOUBLES ? 0 : player2Stats.winStreakDoubles;
      } else {
        player2Stats.winStreakSingles =
          matchType === MatchType.SINGLES
            ? player2Stats.winStreakSingles + 1
            : player2Stats.winStreakSingles;
        player2Stats.winStreakDoubles =
          matchType === MatchType.DOUBLES
            ? player2Stats.winStreakDoubles + 1
            : player2Stats.winStreakDoubles;
        player2Stats.totalWins++;
        player1Stats.winStreakSingles =
          matchType === MatchType.SINGLES ? 0 : player1Stats.winStreakSingles;
        player1Stats.winStreakDoubles =
          matchType === MatchType.DOUBLES ? 0 : player1Stats.winStreakDoubles;
      }

      player1Stats.totalMatches++;
      player2Stats.totalMatches++;

      await manager.save(UserStats, [player1Stats, player2Stats]);

      // Create ELO logs
      const eloLog1 = manager.create(ELOLog, {
        userId: player1Id,
        matchId,
        matchType,
        eloBefore: Number(currentElo1),
        eloAfter: newElo1,
        opponentUserId: player2Id,
      });

      const eloLog2 = manager.create(ELOLog, {
        userId: player2Id,
        matchId,
        matchType,
        eloBefore: Number(currentElo2),
        eloAfter: newElo2,
        opponentUserId: player1Id,
      });

      await manager.save(ELOLog, [eloLog1, eloLog2]);
    });
  }
}

