import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Match, MatchStatus, MatchFormat } from '../entities/match.entity';
import { User } from '../entities/user.entity';
import { UserStats } from '../entities/user-stats.entity';
import { ApplyToSlotDto } from './dto/apply-to-slot.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.enums';
import { MatchUpdatesGateway } from '../gateways/match-updates.gateway';
import { ChatService } from '../chat/chat.service';
import { MatchesService } from '../matches/matches.service';
import { ChatGateway } from '../chat/chat.gateway';
import { sanitizeInput } from '../common/utils/sanitize.util';

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
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => MatchUpdatesGateway))
    private matchUpdatesGateway: MatchUpdatesGateway,
    private chatService: ChatService,
    @Inject(forwardRef(() => MatchesService))
    private matchesService: MatchesService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
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

    // TODO: Re-enable verification checks once Twilio and SendGrid are configured
    // Check if user email is verified
    // if (!user.emailVerified) {
    //   throw new ForbiddenException('Please verify your email address before applying to matches');
    // }

    // Check if user has gender defined
    if (!user.gender) {
      throw new ForbiddenException('Please set your gender in your profile before applying to matches');
    }

    // Check if user is verified (if phone provided)
    // if (user.phone && !user.phoneVerified) {
    //   throw new ForbiddenException('Please verify your phone number before applying to matches');
    // }

    // Get match slot
    const slot = await this.matchSlotRepository.findOne({
      where: { id: applyDto.matchSlotId },
      relations: ['match', 'match.creator', 'match.court'],
    });

    if (!slot) {
      throw new NotFoundException('Match slot not found');
    }

    // Check if user is the creator
    if (slot.match.creatorUserId === userId) {
      throw new BadRequestException('Cannot apply to your own match');
    }

    // Check if match is still pending or confirmed (for waitlist)
    const isSingles = slot.match.format === 'singles';
    if (slot.match.status === MatchStatus.CANCELLED || slot.match.status === MatchStatus.COMPLETED) {
      throw new BadRequestException('Match is not accepting applications');
    }

    // For confirmed singles matches, allow waitlist applications (skip slot availability check)
    if (slot.match.status === MatchStatus.CONFIRMED && isSingles) {
      // Allow application but set status to WAITLISTED immediately
      // Sanitize guest partner name if provided
      const sanitizedGuestName = applyDto.guestPartnerName 
        ? sanitizeInput(applyDto.guestPartnerName) 
        : undefined;

      const application = this.applicationRepository.create({
        matchSlotId: slot.id,
        applicantUserId: userId,
        guestPartnerName: sanitizedGuestName,
        status: ApplicationStatus.WAITLISTED, // Auto-waitlist for confirmed singles matches
      });

      let savedApplication: Application;
      try {
        savedApplication = await this.applicationRepository.save(application);
      } catch (error: any) {
        // Check if it's a unique constraint violation (user already applied to this slot)
        if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
          throw new BadRequestException('You have already applied to this time slot');
        }
        // Re-throw other errors
        throw error;
      }

      // Clear match cache to force refresh on frontend
      try {
        await this.matchesService.clearMatchCache(slot.match.id);
      } catch (error) {
        // Log error but don't fail the request if cache clearing fails
        console.warn('Failed to clear match cache after waitlist application:', error);
      }

      // Notify match creator about new waitlist application
      const matchDate = slot.match.date instanceof Date 
        ? slot.match.date.toLocaleDateString() 
        : new Date(slot.match.date).toLocaleDateString();
      
      try {
        await this.notificationsService.createNotification(
          slot.match.creatorUserId,
          NotificationType.MATCH_APPLICANT,
          `${user.firstName} ${user.lastName} has joined the waitlist for your match`,
          {
            applicantName: `${user.firstName} ${user.lastName}`,
            courtName: slot.match.court?.name || 'Court',
            date: matchDate,
            matchId: slot.match.id,
          },
        );
      } catch (error: any) {
        // Log error but don't fail the request if notification fails
        console.error('Failed to send waitlist application notification:', error);
        console.error('Error details:', error.message, error.stack);
      }

      // Emit real-time update
      try {
        const updatedMatch = await this.matchRepository.findOne({
          where: { id: slot.match.id },
          relations: ['court', 'creator', 'slots'],
        });
        if (updatedMatch) {
          this.matchUpdatesGateway.emitMatchUpdate(slot.match.id, updatedMatch);
          this.chatGateway.emitMatchUpdate(slot.match.id, updatedMatch);
        }
      } catch (error) {
        console.warn('Failed to emit application update:', error);
      }

      return savedApplication;
    }

    // For pending matches, check slot availability
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Slot is not available');
    }

    // For pending matches, continue with normal flow
    if (slot.match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Match is not accepting applications');
    }

    // REMOVED: Allow users to apply to multiple slots in the same match
    // Users can now apply to different time slots of the same match
    // The unique constraint on (matchSlotId, applicantUserId) prevents applying twice to the same slot

    // Check for time overlap with confirmed matches only (allow pending overlaps)
    // Normalize date to string (YYYY-MM-DD) format for database comparison
    // slot.match.date is stored as string in DB to avoid timezone issues, but TypeScript types it as Date
    const dateValue = slot.match.date as any;  // Type assertion to handle runtime string vs TypeScript Date type
    const dateStr = typeof dateValue === 'string' 
      ? dateValue.split('T')[0]  // Extract YYYY-MM-DD if it has time component
      : dateValue instanceof Date
        ? dateValue.toISOString().split('T')[0]  // Convert Date to YYYY-MM-DD
        : String(dateValue).split('T')[0];  // Fallback: convert to string and extract date part
    
    try {
      await this.checkTimeOverlap(userId, dateStr, slot.startTime, slot.endTime);
    } catch (error) {
      // If it's a BadRequestException (expected error), re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      // For unexpected errors (database issues, etc.), log and allow the application
      // Time overlap check is a nice-to-have, shouldn't block applications
      console.warn('Failed to check time overlap, allowing application:', error);
    }

    // Sanitize guest partner name if provided
    const sanitizedGuestName = applyDto.guestPartnerName 
      ? sanitizeInput(applyDto.guestPartnerName) 
      : undefined;

    // Create application
    const application = this.applicationRepository.create({
      matchSlotId: slot.id,
      applicantUserId: userId,
      guestPartnerName: sanitizedGuestName,
      status: ApplicationStatus.PENDING,
    });

    let savedApplication: Application;
    try {
      savedApplication = await this.applicationRepository.save(application);
    } catch (error: any) {
      // Check if it's a unique constraint violation (user already applied to this slot)
      if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
        throw new BadRequestException('You have already applied to this time slot');
      }
      // Re-throw other errors
      throw error;
    }

    // Clear match cache to force refresh on frontend
    try {
      await this.matchesService.clearMatchCache(slot.match.id);
    } catch (error) {
      // Log error but don't fail the request if cache clearing fails
      console.warn('Failed to clear match cache after application:', error);
    }

    // Notify match creator about new application
    const matchDate = slot.match.date instanceof Date 
      ? slot.match.date.toLocaleDateString() 
      : new Date(slot.match.date).toLocaleDateString();
    
    try {
      await this.notificationsService.createNotification(
        slot.match.creatorUserId,
        NotificationType.MATCH_APPLICANT,
        `${user.firstName} ${user.lastName} has applied to your match`,
        {
          applicantName: `${user.firstName} ${user.lastName}`,
          courtName: slot.match.court?.name || 'Court',
          date: matchDate,
          matchId: slot.match.id,
        },
      );
    } catch (error: any) {
      // Log error but don't fail the request if notification fails
      console.error('Failed to send application notification:', error);
      console.error('Error details:', error.message, error.stack);
    }

    // Emit real-time update
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: slot.match.id },
        relations: ['court', 'creator', 'slots'],
      });
      if (updatedMatch) {
        // Emit on /matches namespace
        this.matchUpdatesGateway.emitMatchUpdate(slot.match.id, updatedMatch);
        // Also emit on /chat namespace for frontend compatibility
        this.chatGateway.emitMatchUpdate(slot.match.id, updatedMatch);
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
      relations: ['matchSlot', 'matchSlot.match', 'matchSlot.match.court', 'applicant'],
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

    const currentMatch = application.matchSlot.match;
    const isSingles = currentMatch.format === MatchFormat.SINGLES;

    // For singles: Match is confirmed when creator + 1 applicant (2 total)
    // For doubles: Keep existing logic (will be updated separately)
    if (isSingles) {
      // Count confirmed applications (creator + confirmed applicants)
      const confirmedApplications = await this.applicationRepository
        .createQueryBuilder('app')
        .innerJoin('app.matchSlot', 'slot')
        .innerJoin('slot.match', 'm')
        .where('m.id = :matchId', { matchId: currentMatch.id })
        .andWhere('app.status = :confirmed', { confirmed: ApplicationStatus.CONFIRMED })
        .getCount();

      // Creator + 1 confirmed applicant = 2 total (match is full)
      if (confirmedApplications >= 1) { // At least 1 confirmed applicant (plus creator = 2)
        currentMatch.status = MatchStatus.CONFIRMED;
        await this.matchRepository.save(currentMatch);

        // Now waitlist all other pending applications (match is full)
        const matchOtherApplications = await this.applicationRepository
          .createQueryBuilder('app')
          .innerJoin('app.matchSlot', 'slot')
          .innerJoin('slot.match', 'm')
          .where('m.id = :matchId', { matchId: currentMatch.id })
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
          try {
            await this.notificationsService.createNotification(
              otherApp.applicantUserId,
              NotificationType.MATCH_ACCEPTED,
              `Your application has been waitlisted for this match. You may be selected if the confirmed participant withdraws.`,
              {
                matchId: currentMatch.id,
              },
            );
          } catch (error: any) {
            console.error(`Failed to send waitlist notification to user ${otherApp.applicantUserId}:`, error);
            console.error('Error details:', error.message, error.stack);
            // Don't fail confirmation if notification fails
          }
        }
      } else {
        // Not enough confirmed applications yet, keep match as pending
        currentMatch.status = MatchStatus.PENDING;
        await this.matchRepository.save(currentMatch);
        // Don't waitlist other applications yet - they can still be confirmed
      }
    } else {
      // Doubles: Keep existing logic (confirm immediately and waitlist others)
      currentMatch.status = MatchStatus.CONFIRMED;
      await this.matchRepository.save(currentMatch);

      // Auto-waitlist all other pending and rejected applications for this match
      const matchOtherApplications = await this.applicationRepository
        .createQueryBuilder('app')
        .innerJoin('app.matchSlot', 'slot')
        .innerJoin('slot.match', 'm')
        .where('m.id = :matchId', { matchId: currentMatch.id })
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
        try {
          await this.notificationsService.createNotification(
            otherApp.applicantUserId,
            NotificationType.MATCH_ACCEPTED,
            `Your application has been waitlisted for this match. You may be selected if the confirmed participant withdraws.`,
            {
              matchId: currentMatch.id,
            },
          );
        } catch (error) {
          console.warn(`Failed to send waitlist notification to user ${otherApp.applicantUserId}:`, error);
          // Don't fail confirmation if notification fails
        }
      }
    }
    
    // Clear match cache to force refresh on frontend
    await this.matchesService.clearMatchCache(currentMatch.id);

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
      try {
        await this.notificationsService.createNotification(
          overlappingApp.applicantUserId,
          NotificationType.MATCH_ACCEPTED,
          `Your application was automatically removed due to time conflict with a confirmed match`,
          {
            matchId: overlappingApp.matchSlot.match.id,
          },
        );
      } catch (error: any) {
        console.error(`Failed to send overlap notification to user ${overlappingApp.applicantUserId}:`, error);
        console.error('Error details:', error.message, error.stack);
        // Don't fail confirmation if notification fails
      }
    }

    // Notify applicant about match confirmation
    const notificationMatch = application.matchSlot.match;
    const creator = await this.userRepository.findOne({
      where: { id: creatorUserId },
    });
    
    // Handle date conversion (notificationMatch.date is stored as string to avoid timezone issues)
    const matchDate = notificationMatch.date instanceof Date 
      ? notificationMatch.date.toLocaleDateString() 
      : new Date(notificationMatch.date).toLocaleDateString();
    
    // Send notifications - wrap in try-catch to prevent confirmation failure if notifications fail
    try {
      await this.notificationsService.createNotification(
        application.applicantUserId,
        NotificationType.MATCH_CONFIRMED,
        `Your application has been confirmed!`,
        {
          opponentName: creator ? `${creator.firstName} ${creator.lastName}` : 'Match Creator',
          courtName: notificationMatch.court?.name || 'Court',
          date: matchDate,
          time: `${application.matchSlot.startTime} - ${application.matchSlot.endTime}`,
          matchId: notificationMatch.id,
        },
      );
    } catch (error: any) {
      console.error('Failed to send notification to applicant:', error);
      console.error('Error details:', error.message, error.stack);
      // Don't fail confirmation if notification fails
    }

    // Also notify creator
    try {
      await this.notificationsService.createNotification(
        creatorUserId,
        NotificationType.MATCH_CONFIRMED,
        `Match confirmed with ${application.applicant.firstName} ${application.applicant.lastName}`,
        {
          opponentName: `${application.applicant.firstName} ${application.applicant.lastName}`,
          courtName: notificationMatch.court?.name || 'Court',
          date: matchDate,
          time: `${application.matchSlot.startTime} - ${application.matchSlot.endTime}`,
          matchId: notificationMatch.id,
        },
      );
    } catch (error: any) {
      console.error('Failed to send notification to creator:', error);
      console.error('Error details:', error.message, error.stack);
      // Don't fail confirmation if notification fails
    }

    // Create automatic match confirmation messages for both participants
    try {
      // Load match with relations for message creation
      const matchWithRelations = await this.matchRepository.findOne({
        where: { id: notificationMatch.id },
        relations: ['court', 'slots'],
      });

      if (matchWithRelations) {
        // Message from applicant to creator
        await this.chatService.createContactInfoMessage(
          notificationMatch.id,
          application.applicantUserId, // Sender: applicant
          creatorUserId, // Recipient: creator
          matchWithRelations,
          application.matchSlot,
        );

        // Message from creator to applicant
        await this.chatService.createContactInfoMessage(
          notificationMatch.id,
          creatorUserId, // Sender: creator
          application.applicantUserId, // Recipient: applicant
          matchWithRelations,
          application.matchSlot,
        );
      }
    } catch (error) {
      // Log error but don't fail confirmation if message creation fails
      console.warn('Failed to create match confirmation messages:', error);
    }

    // Emit real-time updates
    try {
      // Load match with applications for proper frontend display
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: notificationMatch.id },
        relations: ['court', 'creator', 'slots', 'slots.applications', 'slots.applications.applicant'],
      });
      if (updatedMatch) {
        // Emit on /matches namespace
        this.matchUpdatesGateway.emitMatchUpdate(notificationMatch.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_updated', application);
        this.matchUpdatesGateway.emitToUser(creatorUserId, 'application_updated', application);
        
        // Also emit on /chat namespace for frontend compatibility
        this.chatGateway.emitMatchUpdate(notificationMatch.id, updatedMatch);
      }
    } catch (error) {
      console.warn('Failed to emit application update:', error);
    }

    return application;
  }

  async approveFromWaitlist(
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
      throw new ForbiddenException('Only match creator can approve waitlisted applications');
    }

    // Check if application is waitlisted
    if (application.status !== ApplicationStatus.WAITLISTED) {
      throw new BadRequestException('Application is not waitlisted');
    }

    // Check if match is pending (opponent withdrew)
    if (application.matchSlot.match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('Match must be pending to approve from waitlist');
    }

    // Check if match is singles
    if (application.matchSlot.match.format !== MatchFormat.SINGLES) {
      throw new BadRequestException('Waitlist approval is only for singles matches');
    }

    // Approve the waitlisted application
    application.status = ApplicationStatus.CONFIRMED;
    await this.applicationRepository.save(application);

    // Update slot status
    application.matchSlot.status = SlotStatus.CONFIRMED;
    application.matchSlot.confirmedAt = new Date();
    await this.matchSlotRepository.save(application.matchSlot);

    // Confirm match (singles: creator + 1 applicant = 2 total)
    const currentMatch = application.matchSlot.match;
    currentMatch.status = MatchStatus.CONFIRMED;
    await this.matchRepository.save(currentMatch);

    // Waitlist all other waitlisted applications (match is now full again)
    const otherWaitlistedApplications = await this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'm')
      .where('m.id = :matchId', { matchId: currentMatch.id })
      .andWhere('app.id != :applicationId', { applicationId: application.id })
      .andWhere('app.status = :waitlisted', { waitlisted: ApplicationStatus.WAITLISTED })
      .getMany();

    // They're already waitlisted, just notify them that spot was filled
    for (const otherApp of otherWaitlistedApplications) {
      await this.notificationsService.createNotification(
        otherApp.applicantUserId,
        NotificationType.MATCH_ACCEPTED,
        `The waitlist spot for this match has been filled by another player.`,
        {
          matchId: currentMatch.id,
        },
      );
    }

    // Notify the approved user
    await this.notificationsService.createNotification(
      application.applicantUserId,
      NotificationType.MATCH_CONFIRMED,
      `Your waitlist application has been approved! The match is confirmed.`,
      {
        matchId: currentMatch.id,
      },
    );

    // Create automatic match confirmation messages for both participants
    try {
      // Load match with relations for message creation
      const matchWithRelations = await this.matchRepository.findOne({
        where: { id: currentMatch.id },
        relations: ['court', 'slots'],
      });

      if (matchWithRelations) {
        // Message from new applicant to creator
        await this.chatService.createContactInfoMessage(
          currentMatch.id,
          application.applicantUserId, // Sender: new applicant
          creatorUserId, // Recipient: creator
          matchWithRelations,
          application.matchSlot,
        );

        // Message from creator to new applicant
        await this.chatService.createContactInfoMessage(
          currentMatch.id,
          creatorUserId, // Sender: creator
          application.applicantUserId, // Recipient: new applicant
          matchWithRelations,
          application.matchSlot,
        );
      }
    } catch (error) {
      // Log error but don't fail approval if message creation fails
      console.warn('Failed to create match confirmation messages:', error);
    }

    // Clear match cache
    await this.matchesService.clearMatchCache(currentMatch.id);

    // Emit real-time updates
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: currentMatch.id },
        relations: ['court', 'creator', 'slots', 'slots.applications', 'slots.applications.applicant'],
      });
      if (updatedMatch) {
        this.matchUpdatesGateway.emitMatchUpdate(currentMatch.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_updated', application);
        this.matchUpdatesGateway.emitToUser(creatorUserId, 'application_updated', application);
        this.chatGateway.emitMatchUpdate(currentMatch.id, updatedMatch);
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
        relations: ['court', 'creator', 'slots', 'slots.applications', 'slots.applications.applicant'],
      });
      if (updatedMatch) {
        // Emit on /matches namespace
        this.matchUpdatesGateway.emitMatchUpdate(application.matchSlot.match.id, updatedMatch);
        this.matchUpdatesGateway.emitToUser(application.applicantUserId, 'application_updated', application);
        // Also emit on /chat namespace for frontend compatibility
        this.chatGateway.emitMatchUpdate(application.matchSlot.match.id, updatedMatch);
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
    const applicantUserId = application.applicantUserId; // Store before deletion

    // Increment cancelledMatches counter if applicant was confirmed and match is confirmed
    if (wasConfirmed && match.status === MatchStatus.CONFIRMED) {
      const applicantStats = await this.userStatsRepository.findOne({
        where: { userId: applicantUserId },
      });
      if (applicantStats) {
        applicantStats.cancelledMatches = (applicantStats.cancelledMatches || 0) + 1;
        await this.userStatsRepository.save(applicantStats);
      } else {
        // Create stats if they don't exist
        const newStats = this.userStatsRepository.create({
          userId: applicantUserId,
          cancelledMatches: 1,
        });
        await this.userStatsRepository.save(newStats);
      }
    }

    // Delete the application
    await this.applicationRepository.remove(application);

    // If this was a confirmed application, delete all chat messages for this match
    // This clears the chat history so creator doesn't see old messages from withdrawn participant
    if (wasConfirmed) {
      try {
        await this.chatService.deleteAllMatchMessages(matchId);
      } catch (error) {
        console.warn(`Failed to delete chat messages for match ${matchId}:`, error);
        // Don't fail withdrawal if message deletion fails
      }
    }

    // If this was a confirmed application, check if we need to revert match status
    if (wasConfirmed) {
      // Reload match to get current state after deletion
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
        relations: ['slots', 'slots.applications'],
      });

      if (!updatedMatch) {
        return;
      }

      const isSingles = updatedMatch.format === MatchFormat.SINGLES;

      // Check if there are any other confirmed applications for this match
      const hasOtherConfirmedApplications = updatedMatch.slots?.some(s => 
        s.applications?.some(app => 
          app.status === ApplicationStatus.CONFIRMED
        )
      ) || false;

      // For singles: If no other confirmed applications, revert match to pending and notify waitlisted users
      // For doubles: Keep existing logic
      if (!hasOtherConfirmedApplications) {
        updatedMatch.status = MatchStatus.PENDING;
        await this.matchRepository.save(updatedMatch);

        // Invalidate match cache to ensure updated status is reflected
        try {
          await this.cacheManager.del(`match:${matchId}`);
          await this.cacheManager.del(`match:details:${matchId}`);
        } catch (error) {
          console.warn(`Failed to invalidate match cache for ${matchId}:`, error);
        }

        // Revert slot status
        const updatedSlot = await this.matchSlotRepository.findOne({
          where: { id: slot.id },
        });
        if (updatedSlot) {
          updatedSlot.status = SlotStatus.AVAILABLE;
          updatedSlot.confirmedAt = null as any;
          await this.matchSlotRepository.save(updatedSlot);
        }

        // For singles matches, notify all waitlisted users that a spot opened up
        if (isSingles) {
          const waitlistedApplications = await this.applicationRepository
            .createQueryBuilder('app')
            .innerJoin('app.matchSlot', 'slot')
            .innerJoin('slot.match', 'm')
            .where('m.id = :matchId', { matchId: updatedMatch.id })
            .andWhere('app.status = :waitlisted', { waitlisted: ApplicationStatus.WAITLISTED })
            .getMany();

          for (const waitlistedApp of waitlistedApplications) {
            await this.notificationsService.createNotification(
              waitlistedApp.applicantUserId,
              NotificationType.MATCH_ACCEPTED,
              `A spot has opened up in a match you're waitlisted for. The creator can now approve your application.`,
              {
                matchId: updatedMatch.id,
              },
            );
          }
        }
      }
    }

    // Emit real-time update with full relations
    try {
      const updatedMatch = await this.matchRepository.findOne({
        where: { id: matchId },
        relations: ['court', 'creator', 'slots', 'slots.applications', 'slots.applications.applicant'],
      });
      if (updatedMatch) {
        // Emit on /matches namespace
        // Emit on /matches namespace
        this.matchUpdatesGateway.emitMatchUpdate(matchId, updatedMatch);
        this.matchUpdatesGateway.emitToUser(applicantUserId, 'application_withdrawn', {
          applicationId,
          matchId: matchId,
        });
        // Also emit on /chat namespace for frontend compatibility
        this.chatGateway.emitMatchUpdate(matchId, updatedMatch);
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

