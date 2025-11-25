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

    // Check if user email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException('Please verify your email address before applying to matches');
    }

    // Check if user has gender defined
    if (!user.gender) {
      throw new ForbiddenException('Please set your gender in your profile before applying to matches');
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

    // Check if user already has a pending application for this match
    const existingApplication = await this.applicationRepository.findOne({
      where: {
        applicantUserId: userId,
        status: ApplicationStatus.PENDING,
      },
      relations: ['matchSlot', 'matchSlot.match'],
    });

    if (existingApplication && existingApplication.matchSlot.match.id === slot.match.id) {
      throw new BadRequestException('You already have a pending application for this match');
    }

    // Check for time overlap with confirmed matches only (allow pending overlaps)
    // Normalize date to string (YYYY-MM-DD) format for database comparison
    // slot.match.date is stored as string in DB to avoid timezone issues, but TypeScript types it as Date
    const dateValue = slot.match.date as any;  // Type assertion to handle runtime string vs TypeScript Date type
    const dateStr = typeof dateValue === 'string' 
      ? dateValue.split('T')[0]  // Extract YYYY-MM-DD if it has time component
      : dateValue instanceof Date
        ? dateValue.toISOString().split('T')[0]  // Convert Date to YYYY-MM-DD
        : String(dateValue).split('T')[0];  // Fallback: convert to string and extract date part
    
    await this.checkTimeOverlap(userId, dateStr, slot.startTime, slot.endTime);

    // Create application
    const application = this.applicationRepository.create({
      matchSlotId: slot.id,
      applicantUserId: userId,
      guestPartnerName: applyDto.guestPartnerName,
      status: ApplicationStatus.PENDING,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Notify match creator about new application
    const matchDate = slot.match.date instanceof Date 
      ? slot.match.date.toLocaleDateString() 
      : new Date(slot.match.date).toLocaleDateString();
    
    await this.notificationsService.createNotification(
      slot.match.creatorUserId,
      NotificationType.MATCH_ACCEPTED,
      `${user.firstName} ${user.lastName} has applied to your match`,
      {
        applicantName: `${user.firstName} ${user.lastName}`,
        courtName: slot.match.court?.name || 'Court',
        date: matchDate,
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

    // Auto-waitlist all other pending and rejected applications for this match
    // This includes both new pending applications and previously rejected ones (from before waitlist feature)
    const matchOtherApplications = await this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .where('match.id = :matchId', { matchId: application.matchSlot.match.id })
      .andWhere('app.id != :applicationId', { applicationId: application.id })
      .andWhere('(app.status = :pending OR app.status = :rejected)', { 
        pending: ApplicationStatus.PENDING,
        rejected: ApplicationStatus.REJECTED 
      })
      .getMany();

    for (const otherApp of matchOtherApplications) {
      otherApp.status = ApplicationStatus.WAITLISTED;
      await this.applicationRepository.save(otherApp);
      
      // Notify waitlisted applicant
      await this.notificationsService.createNotification(
        otherApp.applicantUserId,
        NotificationType.MATCH_ACCEPTED,
        `Your application has been waitlisted for this match. You may be selected if the confirmed participant withdraws.`,
        {
          matchId: application.matchSlot.match.id,
        },
      );
    }

    // Auto-remove overlapping applications from the confirmed applicant (±2 hours)
    const confirmedSlot = application.matchSlot;
    const confirmedDate = application.matchSlot.match.date;
    const confirmedStartTime = confirmedSlot.startTime;
    const confirmedEndTime = confirmedSlot.endTime;

    // Find all other pending applications from the same applicant
    const applicantOtherApplications = await this.applicationRepository.find({
      where: {
        applicantUserId: application.applicantUserId,
        status: ApplicationStatus.PENDING,
      },
      relations: ['matchSlot', 'matchSlot.match'],
    });

    // Filter applications that overlap with confirmed slot (±2 hours)
    const overlappingApplications = applicantOtherApplications.filter((app) => {
      if (app.id === application.id) return false; // Skip the confirmed one
      
      // Check if same date
      const appDate = app.matchSlot.match.date;
      const appDateStr = appDate instanceof Date ? appDate.toISOString().split('T')[0] : appDate;
      const confirmedDateStr = confirmedDate instanceof Date ? confirmedDate.toISOString().split('T')[0] : confirmedDate;
      if (appDateStr !== confirmedDateStr) return false;

      // Check time overlap with ±2 hour buffer
      return this.checkTimeOverlapWithBuffer(
        confirmedStartTime,
        confirmedEndTime,
        app.matchSlot.startTime,
        app.matchSlot.endTime,
        2, // 2 hours buffer
      );
    });

    // Remove overlapping applications
    for (const overlappingApp of overlappingApplications) {
      overlappingApp.status = ApplicationStatus.REJECTED;
      await this.applicationRepository.save(overlappingApp);
      
      // Notify applicant about removed application
      await this.notificationsService.createNotification(
        overlappingApp.applicantUserId,
        NotificationType.MATCH_ACCEPTED,
        `Your application was automatically removed due to time conflict with a confirmed match`,
        {
          matchId: overlappingApp.matchSlot.match.id,
        },
      );
    }

    // Notify applicant about match confirmation
    const match = application.matchSlot.match;
    const creator = await this.userRepository.findOne({
      where: { id: creatorUserId },
    });
    
    // Handle date conversion (match.date is stored as string to avoid timezone issues)
    const matchDate = match.date instanceof Date 
      ? match.date.toLocaleDateString() 
      : new Date(match.date).toLocaleDateString();
    
    await this.notificationsService.createNotification(
      application.applicantUserId,
      NotificationType.MATCH_CONFIRMED,
      `Your application has been confirmed!`,
      {
        opponentName: creator ? `${creator.firstName} ${creator.lastName}` : 'Match Creator',
        courtName: match.court?.name || 'Court',
        date: matchDate,
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
        date: matchDate,
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
    // Load application with full relations including match slots and applications
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['matchSlot', 'matchSlot.match', 'matchSlot.match.slots', 'matchSlot.match.slots.applications'],
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

    // Store status and references BEFORE deletion
    const wasConfirmed = application.status === ApplicationStatus.CONFIRMED;
    const match = application.matchSlot.match;
    const slot = application.matchSlot;
    const matchId = match.id;

    // Delete the application
    await this.applicationRepository.remove(application);

    // If this was a confirmed application, check if we need to revert match status
    if (wasConfirmed) {
      // Reload match to get current state after deletion
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
        relations: ['slots', 'slots.applications'],
      });

      // Check if there are any other confirmed applications for this match
      const hasOtherConfirmedApplications = updatedMatch?.slots?.some(s => 
        s.applications?.some(app => 
          app.status === ApplicationStatus.CONFIRMED
        )
      ) || false;

      // If no other confirmed applications, revert match and slot status
      if (!hasOtherConfirmedApplications && updatedMatch) {
        updatedMatch.status = MatchStatus.PENDING;
        await this.matchRepository.save(updatedMatch);

        // Revert slot status
        const updatedSlot = await this.matchSlotRepository.findOne({
          where: { id: slot.id },
        });
        if (updatedSlot) {
          updatedSlot.status = SlotStatus.AVAILABLE;
          updatedSlot.confirmedAt = null as any;
          await this.matchSlotRepository.save(updatedSlot);
        }
      }
    }

    // Emit real-time update with full relations
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
        relations: ['court', 'creator', 'slots', 'slots.applications'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(matchId, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_withdrawn', {
          applicationId,
          matchId: matchId,
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

    // Query applications directly - more efficient and scalable
    // This uses the index on match_slot_id and can be easily extended with pagination/filtering
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.matchSlot', 'slot')
      .where('slot.matchId = :matchId', { matchId })
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoinAndSelect('applicant.stats', 'stats')
      .leftJoinAndSelect('application.matchSlot', 'matchSlot')
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    return applications;
  }

  /**
   * Check if two time slots overlap with a buffer (in hours)
   * Times are in format "HH:MM:SS" or "HH:MM"
   */
  private checkTimeOverlapWithBuffer(
    startTime1: string,
    endTime1: string,
    startTime2: string,
    endTime2: string,
    bufferHours: number,
  ): boolean {
    // Convert time strings to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1] || '0', 10);
      return hours * 60 + minutes;
    };

    const start1 = timeToMinutes(startTime1) - bufferHours * 60; // Subtract buffer from start
    const end1 = timeToMinutes(endTime1) + bufferHours * 60; // Add buffer to end
    const start2 = timeToMinutes(startTime2);
    const end2 = timeToMinutes(endTime2);

    // Check if intervals overlap: (start1 <= end2) && (end1 >= start2)
    return start1 <= end2 && end1 >= start2;
  }

  private async checkTimeOverlap(
    userId: string,
    date: string,  // Accept string (YYYY-MM-DD format) to match database storage and avoid timezone issues
    startTime: string,
    endTime: string,
  ): Promise<void> {
    // Ensure date is in YYYY-MM-DD format (already should be, but normalize just in case)
    const dateStr = date.split('T')[0];  // Extract YYYY-MM-DD if it has time component

    // Find all confirmed matches for this user on this date
    // Only prevent if there's a confirmed match at the same time
    const confirmedMatches = await this.matchRepository
      .createQueryBuilder('match')
      .innerJoin('match.slots', 'slot')
      .where('slot.status = :slotConfirmed', { slotConfirmed: SlotStatus.CONFIRMED })
      .andWhere('match.date = :date', { date: dateStr })  // Compare as string (YYYY-MM-DD) to match database storage
      .andWhere(
        `(slot.startTime <= :endTime AND slot.endTime >= :startTime)`,
        { startTime, endTime },
      )
      .andWhere(
        `(match.creatorUserId = :userId OR EXISTS (
          SELECT 1 FROM applications app 
          WHERE app.match_slot_id = slot.id 
          AND app.applicant_user_id = :userId 
          AND app.status = :appConfirmed
        ))`,
        { userId, appConfirmed: ApplicationStatus.CONFIRMED },
      )
      .getMany();

    if (confirmedMatches.length > 0) {
      throw new BadRequestException('You already have a confirmed match at this time');
    }

    // Note: We allow pending applications to overlap (users can apply to multiple matches)
    // Overlapping pending applications will be auto-removed when one is confirmed
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

