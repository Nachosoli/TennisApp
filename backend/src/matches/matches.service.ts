import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Match, MatchFormat, MatchStatus } from '../entities/match.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { Court } from '../entities/court.entity';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { MatchUpdatesGateway } from '../gateways/match-updates.gateway';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);
  private readonly MATCH_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly COURT_LIST_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchSlot)
    private matchSlotRepository: Repository<MatchSlot>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => MatchUpdatesGateway))
    private matchUpdatesGateway: MatchUpdatesGateway,
  ) {}

  async create(userId: string, createDto: CreateMatchDto): Promise<Match> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has home court
    if (!user.homeCourtId) {
      throw new ForbiddenException('Users without a home court cannot create matches');
    }

    // TODO: Re-enable verification check once Twilio is configured
    // Verify user is verified (if phone provided)
    // if (user.phone && !user.phoneVerified) {
    //   throw new ForbiddenException('Please verify your phone number before creating matches');
    // }

    // Verify court exists
    const court = await this.courtRepository.findOne({
      where: { id: createDto.courtId },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Validate slots
    if (!createDto.slots || createDto.slots.length === 0) {
      throw new BadRequestException('At least one time slot is required');
    }

    // Normalize date to avoid timezone issues
    // Extract YYYY-MM-DD from the date string
    // Pass as string to TypeORM to avoid timezone conversion
    const dateString = createDto.date.split('T')[0]; // Get YYYY-MM-DD part (e.g., "2025-11-24")
    const [year, month, day] = dateString.split('-').map(Number);

    // Validate date is not in the past
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const matchDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    if (matchDateUTC < today) {
      throw new BadRequestException('Match date cannot be in the past');
    }

    // Create match
    const matchData: any = {
      creatorUserId: userId,
      courtId: createDto.courtId,
      date: dateString, // Pass as string (YYYY-MM-DD) to avoid timezone conversion
      format: createDto.format,
      skillLevelMin: createDto.skillLevelMin,
      skillLevelMax: createDto.skillLevelMax,
      genderFilter: createDto.genderFilter,
      surfaceFilter: createDto.surfaceFilter,
      status: MatchStatus.PENDING,
    };

    if (createDto.maxDistance) {
      matchData.maxDistance = createDto.maxDistance * 1609.34; // Convert miles to meters
    }

    const match = this.matchRepository.create(matchData);
    const savedMatch = await this.matchRepository.save(match);
    // TypeORM save() returns Match | Match[], but we're saving a single entity
    const matchId = (savedMatch as any).id || (Array.isArray(savedMatch) ? savedMatch[0]?.id : null);
    if (!matchId) {
      throw new Error('Failed to save match');
    }

    // Create match slots
    const slots = createDto.slots.map((slotDto) =>
      this.matchSlotRepository.create({
        matchId: matchId,
        startTime: slotDto.startTime,
        endTime: slotDto.endTime,
        status: SlotStatus.AVAILABLE,
      }),
    );

    await this.matchSlotRepository.save(slots);

    // Reload match with minimal relations needed for response (avoid expensive nested joins)
    // Only load essential relations to avoid timeout
    const createdMatch = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['court', 'creator', 'slots'], // Don't load nested relations like slots.lockedBy, slots.application
    });

    if (!createdMatch) {
      throw new Error('Failed to load created match');
    }

    // Cache the created match
    const cacheKey = `match:${matchId}`;
    await this.cacheManager.set(cacheKey, createdMatch, this.MATCH_CACHE_TTL);

    // Emit real-time update (non-blocking, don't wait for it)
    try {
      this.matchUpdatesGateway.emitMatchUpdate(matchId, createdMatch);
    } catch (error) {
      // Don't fail if gateway is not available
      console.warn('Failed to emit match update:', error);
    }

    return createdMatch;
  }

  async findAll(filters?: {
    userId?: string;
    excludeUserId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    format?: MatchFormat;
    status?: MatchStatus;
    skillLevel?: number;
    gender?: string;
    maxDistance?: number;
    latitude?: number;
    longitude?: number;
    surfaceType?: string;
  }): Promise<Match[]> {
    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.court', 'court')
      .leftJoinAndSelect('match.creator', 'creator')
      .leftJoinAndSelect('creator.stats', 'creatorStats')
      .leftJoinAndSelect('match.slots', 'slots')
      .leftJoinAndSelect('slots.applications', 'applications');

    if (filters?.userId) {
      query.andWhere('match.creatorUserId = :userId', { userId: filters.userId });
    }

    if (filters?.excludeUserId) {
      query.andWhere('match.creatorUserId != :excludeUserId', { excludeUserId: filters.excludeUserId });
    }

    if (filters?.dateFrom) {
      query.andWhere('match.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      query.andWhere('match.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters?.format) {
      query.andWhere('match.format = :format', { format: filters.format });
    }

    if (filters?.status) {
      query.andWhere('match.status = :status', { status: filters.status });
    }

    if (filters?.skillLevel) {
      query.andWhere(
        '(match.skillLevelMin IS NULL OR match.skillLevelMin <= :skillLevel)',
        { skillLevel: filters.skillLevel },
      );
      query.andWhere(
        '(match.skillLevelMax IS NULL OR match.skillLevelMax >= :skillLevel)',
        { skillLevel: filters.skillLevel },
      );
    }

    if (filters?.gender) {
      query.andWhere(
        '(match.genderFilter IS NULL OR match.genderFilter = :gender)',
        { gender: filters.gender },
      );
    }

    if (filters?.surfaceType) {
      query.andWhere(
        '(match.surfaceFilter IS NULL OR match.surfaceFilter = :surfaceType)',
        { surfaceType: filters.surfaceType },
      );
    }

    // Distance filter (requires coordinates)
    // Note: PostGIS is not available, so distance filtering is done in memory after fetching
    // For now, we'll skip distance filtering in the query and apply it after if needed
    if (filters?.latitude && filters?.longitude && filters?.maxDistance) {
      // Without PostGIS, we can't filter by distance in the query
      // The distance filter will be applied after fetching if needed
      // For now, we'll just order by date
      query.orderBy('match.date', 'ASC').addOrderBy('match.createdAt', 'DESC'        );
    } else {
      query.orderBy('match.date', 'ASC').addOrderBy('match.createdAt', 'DESC');
    }

    let matches = await query.getMany();

    // Apply distance filter in memory if PostGIS is not available
    if (filters?.latitude && filters?.longitude && filters?.maxDistance) {
      const R = 6371000; // Earth radius in meters
      matches = matches
        .map((match) => {
          if (!match.court?.coordinates || !match.court.coordinates.coordinates) {
            return null;
          }
          const [lng, lat] = match.court.coordinates.coordinates;
          const dLat = ((lat - filters.latitude!) * Math.PI) / 180;
          const dLon = ((lng - filters.longitude!) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((filters.latitude! * Math.PI) / 180) *
              Math.cos((lat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { match, distance };
        })
        .filter((item): item is { match: Match; distance: number } => 
          item !== null && item.distance <= filters.maxDistance!
        )
        .sort((a, b) => a.distance - b.distance)
        .map((item) => item.match);
    }

    return matches;
  }

  async findById(id: string): Promise<Match> {
    // Check cache first
    const cacheKey = `match:${id}`;
    const cached = await this.cacheManager.get<Match>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load only essential relations to avoid timeout
    // Nested relations like slots.lockedBy and slots.application can be loaded separately if needed
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['court', 'creator', 'slots'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Cache the match for 2 minutes
    await this.cacheManager.set(cacheKey, match, this.MATCH_CACHE_TTL);

    return match;
  }

  async findByIdWithDetails(id: string): Promise<Match> {
    // Check cache first
    const cacheKey = `match:details:${id}`;
    const cached = await this.cacheManager.get<Match>(cacheKey);
    if (cached) {
      return cached;
    }

    // Full match details with all relations (for match detail page)
    // Include applications so opponent name can be determined on score page
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['court', 'creator', 'slots', 'slots.lockedBy', 'slots.applications', 'slots.applications.applicant', 'results', 'results.player1', 'results.player2'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Cache the match details for 2 minutes
    await this.cacheManager.set(cacheKey, match, this.MATCH_CACHE_TTL);

    return match;
  }

  async update(
    userId: string,
    matchId: string,
    updateDto: UpdateMatchDto,
  ): Promise<Match> {
    const match = await this.findById(matchId);

    if (match.creatorUserId !== userId) {
      throw new ForbiddenException('Only match creator can update the match');
    }

    Object.assign(match, updateDto);
    const updatedMatch = await this.matchRepository.save(match);

    // Invalidate cache
    await this.cacheManager.del(`match:${matchId}`);
    await this.cacheManager.del(`match:details:${matchId}`);

    // Emit real-time update
    try {
      this.matchUpdatesGateway.emitMatchUpdate(matchId, updatedMatch);
    } catch (error) {
      console.warn('Failed to emit match update:', error);
    }

    return updatedMatch;
  }

  async cancelOld(
    userId: string,
    matchId: string,
    updateDto: UpdateMatchDto,
  ): Promise<Match> {
    const match = await this.findById(matchId);

    // Only creator can update
    if (match.creatorUserId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.isAdmin) {
        throw new ForbiddenException('Not authorized to update this match');
      }
    }

    Object.assign(match, updateDto);
    return this.matchRepository.save(match);
  }

  async cancel(userId: string, matchId: string): Promise<void> {
    const match = await this.findById(matchId);

    // Only creator can cancel
    if (match.creatorUserId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.isAdmin) {
        throw new ForbiddenException('Not authorized to cancel this match');
      }
    }

    // Only increment cancelledMatches counter if match is in CONFIRMED status
    if (match.status === MatchStatus.CONFIRMED) {
      // Increment cancelledMatches counter for the creator
      const creatorStats = await this.userStatsRepository.findOne({
        where: { userId: match.creatorUserId },
      });
      if (creatorStats) {
        creatorStats.cancelledMatches = (creatorStats.cancelledMatches || 0) + 1;
        await this.userStatsRepository.save(creatorStats);
      } else {
        // Create stats if they don't exist
        const newStats = this.userStatsRepository.create({
          userId: match.creatorUserId,
          cancelledMatches: 1,
        });
        await this.userStatsRepository.save(newStats);
      }
    }

    // Delete the match from database (CASCADE will delete related slots and applications)
    await this.matchRepository.remove(match);

    // Invalidate cache
    await this.cacheManager.del(`match:${matchId}`);
    await this.cacheManager.del(`match:details:${matchId}`);
  }

  async getCalendar(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
    userPreferences?: {
      skillLevel?: number;
      gender?: string;
      maxDistance?: number;
      latitude?: number;
      longitude?: number;
      surfaceType?: string;
    },
  ): Promise<Match[]> {
    // Get matches matching user preferences, excluding user's own matches
    // BUT include matches where user has a waitlisted application
    const filters = {
      dateFrom,
      dateTo,
      excludeUserId: userId,
      ...userPreferences,
    };

    // Get regular matches (excluding user's own)
    const regularMatches = await this.findAll(filters);

    // Also get matches where user has a waitlisted application (even if they're the creator or match is confirmed)
    const waitlistedMatchesQuery = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.court', 'court')
      .leftJoinAndSelect('match.creator', 'creator')
      .leftJoinAndSelect('creator.stats', 'creatorStats')
      .leftJoinAndSelect('match.slots', 'slots')
      .leftJoinAndSelect('slots.applications', 'applications')
      .where('match.date >= :dateFrom', { dateFrom })
      .andWhere('match.date <= :dateTo', { dateTo })
      .andWhere('match.status != :cancelledStatus', { cancelledStatus: MatchStatus.CANCELLED })
      .andWhere('match.status != :completedStatus', { completedStatus: MatchStatus.COMPLETED })
      .andWhere(
        'EXISTS (SELECT 1 FROM applications app INNER JOIN match_slots ms ON app.match_slot_id = ms.id WHERE ms.match_id = match.id AND app.applicant_user_id = :userId AND app.status = :waitlistedStatus)',
        {
          userId,
          waitlistedStatus: ApplicationStatus.WAITLISTED,
        },
      )
      .orderBy('match.date', 'ASC')
      .addOrderBy('match.createdAt', 'DESC');

    const waitlistedMatches = await waitlistedMatchesQuery.getMany();

    // Combine and deduplicate by match ID
    const allMatches = [...regularMatches, ...waitlistedMatches];
    const uniqueMatches = Array.from(
      new Map(allMatches.map((match) => [match.id, match])).values(),
    );

    return uniqueMatches;
  }

  async findUserMatches(userId: string): Promise<Match[]> {
    try {
      // Find matches where user is creator OR has a confirmed OR waitlisted application
      // Optimized query with only essential relations for dashboard display
      const query = this.matchRepository
        .createQueryBuilder('match')
        .leftJoinAndSelect('match.court', 'court')
        .leftJoinAndSelect('match.creator', 'creator')
        .leftJoinAndSelect('match.slots', 'slots')
        .leftJoinAndSelect('slots.applications', 'applications')
        .leftJoinAndSelect('applications.applicant', 'applicant')
        .leftJoinAndSelect('match.results', 'results')
        .leftJoinAndSelect('results.player1', 'player1')
        .leftJoinAndSelect('results.player2', 'player2')
        .leftJoinAndSelect('results.submittedBy', 'submittedBy')
        .where(
          '(match.creatorUserId = :userId OR EXISTS (SELECT 1 FROM applications app INNER JOIN match_slots ms ON app.match_slot_id = ms.id WHERE ms.match_id = match.id AND app.applicant_user_id = :userId AND (app.status = :confirmedStatus OR app.status = :waitlistedStatus OR app.status = :pendingStatus)))',
          {
            userId,
            confirmedStatus: ApplicationStatus.CONFIRMED,
            waitlistedStatus: ApplicationStatus.WAITLISTED,
            pendingStatus: ApplicationStatus.PENDING,
          },
        )
        // Note: Excluding completed matches with scores is handled on the frontend (dashboard only)
        // Match history page needs these matches, so we don't filter them here
        .orderBy('match.date', 'ASC') // Sort by date, earlier to later
        .addOrderBy('match.createdAt', 'DESC') // Tie-breaker: most recently created
        .limit(50); // Limit results to prevent excessive data loading

      return await query.getMany();
    } catch (error) {
      this.logger.error(`Error fetching user matches for userId ${userId}:`, error);
      throw error;
    }
  }

  async clearMatchCache(matchId: string): Promise<void> {
    await this.cacheManager.del(`match:${matchId}`);
    await this.cacheManager.del(`match:details:${matchId}`);
  }
}

