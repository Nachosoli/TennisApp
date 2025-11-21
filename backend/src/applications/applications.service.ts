import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { User } from '../entities/user.entity';
import { ApplyToSlotDto } from './dto/apply-to-slot.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { MatchUpdatesGateway } from '../gateways/match-updates.gateway';

@Injectable()
export class ApplicationsService {
  private readonly lockExpirationHours: number;

  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(MatchSlot)
    private matchSlotRepository: Repository<MatchSlot>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => MatchUpdatesGateway))
    private matchUpdatesGateway: MatchUpdatesGateway,
  ) {
    // Get lock expiration from config (default 2 hours)
    this.lockExpirationHours = parseInt(
      this.configService.get<string>('SLOT_LOCK_EXPIRATION_HOURS') || '2',
      10,
    );
  }

  async applyToSlot(userId: string, applyDto: ApplyToSlotDto): Promise<Application> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has home court (at least one player must have home court)
    if (!user.homeCourtId) {
      throw new ForbiddenException('Users without a home court cannot apply to matches');
    }

    // Check if user is verified (if phone provided)
    if (user.phone && !user.phoneVerified) {
      throw new ForbiddenException('Please verify your phone number before applying to matches');
    }

    // Get match slot
    const slot = await this.matchSlotRepository.findOne({
      where: { id: applyDto.matchSlotId },
      relations: ['match', 'match.creator', 'match.court'],
    });

    if (!slot) {
      throw new NotFoundException('Match slot not found');
    }

    // Check if slot is available
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Slot is not available');
    }

    // Check if user is the creator
    if (slot.match.creatorUserId === userId) {
      throw new BadRequestException('Cannot apply to your own match');
    }

    // Check if match is still pending
    if (slot.match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Match is not accepting applications');
    }

    // Check for time overlap with other confirmed/pending applications
    await this.checkTimeOverlap(userId, slot.match.date, slot.startTime, slot.endTime);

    // Check if slot is already locked
    const lockKey = `slot_lock:${slot.id}`;
    const existingLock = await this.cacheManager.get<string>(lockKey);
    if (existingLock && existingLock !== userId) {
      throw new BadRequestException('Slot is currently locked by another user');
    }

    // Lock the slot
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + this.lockExpirationHours);

    await this.cacheManager.set(lockKey, userId, this.lockExpirationHours * 60 * 60 * 1000);

    // Update slot status
    slot.status = SlotStatus.LOCKED;
    slot.lockedByUserId = userId;
    slot.lockedAt = new Date();
    slot.expiresAt = expirationTime;
    await this.matchSlotRepository.save(slot);

    // Create application
    const application = this.applicationRepository.create({
      matchSlotId: slot.id,
      applicantUserId: userId,
      guestPartnerName: applyDto.guestPartnerName,
      status: ApplicationStatus.PENDING,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Notify match creator about new application
    await this.notificationsService.createNotification(
      slot.match.creatorUserId,
      NotificationType.MATCH_ACCEPTED,
      `${user.firstName} ${user.lastName} has applied to your match`,
      {
        applicantName: `${user.firstName} ${user.lastName}`,
        courtName: slot.match.court?.name || 'Court',
        date: slot.match.date.toLocaleDateString(),
        matchId: slot.match.id,
      },
    );

    // Emit real-time update
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: slot.match.id },
        relations: ['court', 'creator', 'slots'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(slot.match.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(
          slot.match.creatorUserId,
          'application_updated',
          savedApplication,
        );
      }
    } catch (error) {
      console.warn('Failed to emit application update:', error);
    }

    return savedApplication;
  }

  async confirmApplication(
    creatorUserId: string,
    applicationId: string,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['matchSlot', 'matchSlot.match', 'applicant'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify creator
    if (application.matchSlot.match.creatorUserId !== creatorUserId) {
      throw new ForbiddenException('Only match creator can confirm applications');
    }

    // Check if application is still pending
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending');
    }

    // Check if slot lock is still valid
    const lockKey = `slot_lock:${application.matchSlotId}`;
    const lockUserId = await this.cacheManager.get<string>(lockKey);
    if (lockUserId !== application.applicantUserId) {
      throw new BadRequestException('Slot lock has expired or been released');
    }

    // Confirm application
    application.status = ApplicationStatus.CONFIRMED;
    await this.applicationRepository.save(application);

    // Update slot status
    application.matchSlot.status = SlotStatus.CONFIRMED;
    application.matchSlot.confirmedAt = new Date();
    await this.matchSlotRepository.save(application.matchSlot);

    // Update match status
    application.matchSlot.match.status = MatchStatus.CONFIRMED;
    await this.matchRepository.save(application.matchSlot.match);

    // Remove lock from Redis
    await this.cacheManager.del(lockKey);

    // Notify applicant about match confirmation
    const match = application.matchSlot.match;
    const creator = await this.userRepository.findOne({
      where: { id: creatorUserId },
    });
    
    await this.notificationsService.createNotification(
      application.applicantUserId,
      NotificationType.MATCH_CONFIRMED,
      `Your application has been confirmed!`,
      {
        opponentName: creator ? `${creator.firstName} ${creator.lastName}` : 'Match Creator',
        courtName: match.court?.name || 'Court',
        date: match.date.toLocaleDateString(),
        time: `${application.matchSlot.startTime} - ${application.matchSlot.endTime}`,
        matchId: match.id,
      },
    );

    // Also notify creator
    await this.notificationsService.createNotification(
      creatorUserId,
      NotificationType.MATCH_CONFIRMED,
      `Match confirmed with ${application.applicant.firstName} ${application.applicant.lastName}`,
      {
        opponentName: `${application.applicant.firstName} ${application.applicant.lastName}`,
        courtName: match.court?.name || 'Court',
        date: match.date.toLocaleDateString(),
        time: `${application.matchSlot.startTime} - ${application.matchSlot.endTime}`,
        matchId: match.id,
      },
    );

    // Emit real-time updates
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: match.id },
        relations: ['court', 'creator', 'slots'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(match.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_updated', application);
        this.matchUpdatesGateway.emitToUser(creatorUserId, 'application_updated', application);
      }
    } catch (error) {
      console.warn('Failed to emit application update:', error);
    }

    return application;
  }

  async rejectApplication(
    creatorUserId: string,
    applicationId: string,
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['matchSlot', 'matchSlot.match'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify creator
    if (application.matchSlot.match.creatorUserId !== creatorUserId) {
      throw new ForbiddenException('Only match creator can reject applications');
    }

    // Reject application
    application.status = ApplicationStatus.REJECTED;
    await this.applicationRepository.save(application);

    // Release slot lock
    const lockKey = `slot_lock:${application.matchSlotId}`;
    await this.cacheManager.del(lockKey);

    // Reset slot status
    application.matchSlot.status = SlotStatus.AVAILABLE;
    (application.matchSlot as any).lockedByUserId = null;
    (application.matchSlot as any).lockedAt = null;
    (application.matchSlot as any).expiresAt = null;
    await this.matchSlotRepository.save(application.matchSlot);

    // Emit real-time update
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: application.matchSlot.match.id },
        relations: ['court', 'creator', 'slots'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(application.matchSlot.match.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_updated', application);
      }
    } catch (error) {
      console.warn('Failed to emit application update:', error);
    }

    return application;
  }

  async withdrawApplication(userId: string, applicationId: string): Promise<void> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['matchSlot', 'matchSlot.match'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify user is the applicant
    if (application.applicantUserId !== userId) {
      throw new ForbiddenException('Only the applicant can withdraw from their application');
    }

    // Check if match is already completed
    if (application.matchSlot.match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Cannot withdraw from a completed match');
    }

    // Release slot lock
    const lockKey = `slot_lock:${application.matchSlotId}`;
    await this.cacheManager.del(lockKey);

    // Reset slot status
    application.matchSlot.status = SlotStatus.AVAILABLE;
    (application.matchSlot as any).lockedByUserId = null;
    (application.matchSlot as any).lockedAt = null;
    (application.matchSlot as any).expiresAt = null;
    await this.matchSlotRepository.save(application.matchSlot);

    // Delete the application
    await this.applicationRepository.remove(application);

    // Emit real-time update
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: application.matchSlot.match.id },
        relations: ['court', 'creator', 'slots'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(application.matchSlot.match.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_withdrawn', {
          applicationId,
          matchId: application.matchSlot.match.id,
        });
      }
    } catch (error) {
      console.warn('Failed to emit application withdrawal update:', error);
    }
  }

  async getMyApplications(userId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { applicantUserId: userId },
      relations: ['matchSlot', 'matchSlot.match', 'matchSlot.match.court'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMatchApplications(matchId: string, creatorUserId: string): Promise<Application[]> {
    // Verify creator
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }
    if (match.creatorUserId !== creatorUserId) {
      throw new ForbiddenException('Only match creator can view applications');
    }

    const slots = await this.matchSlotRepository.find({
      where: { matchId },
      relations: ['application', 'application.applicant', 'application.applicant.stats'],
    });

    return slots
      .map((slot) => slot.application)
      .filter((app) => app !== null) as Application[];
  }

  private async checkTimeOverlap(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    // Find all confirmed matches for this user on this date
    const confirmedMatches = await this.matchRepository
      .createQueryBuilder('match')
      .innerJoin('match.slots', 'slot')
      .where('slot.status = :confirmed', { confirmed: SlotStatus.CONFIRMED })
      .andWhere('match.date = :date', { date })
      .andWhere(
        `(slot.startTime <= :endTime AND slot.endTime >= :startTime)`,
        { startTime, endTime },
      )
      .andWhere(
        `(match.creatorUserId = :userId OR EXISTS (
          SELECT 1 FROM applications app 
          WHERE app.match_slot_id = slot.id 
          AND app.applicant_user_id = :userId 
          AND app.status = :confirmed
        ))`,
        { userId, confirmed: ApplicationStatus.CONFIRMED },
      )
      .getMany();

    if (confirmedMatches.length > 0) {
      throw new BadRequestException('You already have a match at this time');
    }

    // Check pending applications
    const pendingApplications = await this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .where('app.applicantUserId = :userId', { userId })
      .andWhere('app.status = :pending', { pending: ApplicationStatus.PENDING })
      .andWhere('match.date = :date', { date })
      .andWhere(
        `(slot.startTime <= :endTime AND slot.endTime >= :startTime)`,
        { startTime, endTime },
      )
      .getMany();

    if (pendingApplications.length > 0) {
      throw new BadRequestException('You already have a pending application at this time');
    }
  }

  async expireLocks(): Promise<void> {
    // Find all locked slots with expired locks
    const expiredSlots = await this.matchSlotRepository.find({
      where: {
        status: SlotStatus.LOCKED,
        expiresAt: MoreThan(new Date()), // Actually, we want expired ones
      },
    });

    for (const slot of expiredSlots) {
      if (slot.expiresAt && slot.expiresAt < new Date()) {
        // Release lock
        const lockKey = `slot_lock:${slot.id}`;
        await this.cacheManager.del(lockKey);

        // Reset slot
        slot.status = SlotStatus.AVAILABLE;
        (slot as any).lockedByUserId = null;
        (slot as any).lockedAt = null;
        (slot as any).expiresAt = null;
        await this.matchSlotRepository.save(slot);

        // Update application status
        const application = await this.applicationRepository.findOne({
          where: { matchSlotId: slot.id },
        });
        if (application && application.status === ApplicationStatus.PENDING) {
          application.status = ApplicationStatus.EXPIRED;
          await this.applicationRepository.save(application);
        }
      }
    }
  }
}

