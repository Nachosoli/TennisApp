import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Match, MatchStatus } from '../entities/match.entity';
import { SlotStatus } from '../entities/match-slot.entity';
import { ApplicationStatus } from '../entities/application.entity';
import { Result } from '../entities/result.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.enums';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Send score reminder notifications 24 hours after match date
   * Runs once per day at midnight
   */
  @Cron('0 0 * * *') // Every day at midnight (00:00)
  async sendScoreReminders() {
    this.logger.log('Running score reminder job...');

    const now = new Date();
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find confirmed matches from 24+ hours ago that don't have results
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoin('match.results', 'result')
      .where('match.status = :status', { status: MatchStatus.CONFIRMED })
      .andWhere('match.date <= :date', { date: twentyFourHoursAgo })
      .andWhere('result.id IS NULL')
      .leftJoinAndSelect('match.creator', 'creator')
      .leftJoinAndSelect('match.slots', 'slots')
      .leftJoinAndSelect('slots.applications', 'applications')
      .leftJoinAndSelect('applications.applicant', 'applicant')
      .getMany();

    let reminderCount = 0;
    let skippedCount = 0;

    for (const match of matches) {
      const confirmedSlot = match.slots.find((slot) => slot.status === SlotStatus.CONFIRMED);
      if (!confirmedSlot?.applications || confirmedSlot.applications.length === 0) continue;

      // Find the confirmed application (should only be one)
      const confirmedApplication = confirmedSlot.applications.find(
        (app) => app.status === ApplicationStatus.CONFIRMED,
      );
      if (!confirmedApplication) continue;

      const applicant = confirmedApplication.applicant;
      const creator = match.creator;

      // Notify creator
      if (creator) {
        // Check if a score reminder was already sent to this user in the last 24 hours
        const existingReminder = await this.notificationRepository.findOne({
          where: {
            userId: creator.id,
            type: NotificationType.SCORE_REMINDER,
            createdAt: MoreThan(twentyFourHoursAgo),
          },
        });

        if (!existingReminder) {
          await this.notificationsService.createNotification(
            creator.id,
            NotificationType.SCORE_REMINDER,
            `Don't forget to submit the score for your match`,
            {
              opponentName: applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Opponent',
              date: match.date instanceof Date 
                ? match.date.toLocaleDateString() 
                : new Date(match.date).toLocaleDateString(),
              matchId: match.id,
            },
          );
          reminderCount++;
        } else {
          skippedCount++;
        }
      }

      // Notify applicant
      if (applicant) {
        // Check if a score reminder was already sent to this user in the last 24 hours
        const existingReminder = await this.notificationRepository.findOne({
          where: {
            userId: applicant.id,
            type: NotificationType.SCORE_REMINDER,
            createdAt: MoreThan(twentyFourHoursAgo),
          },
        });

        if (!existingReminder) {
          await this.notificationsService.createNotification(
            applicant.id,
            NotificationType.SCORE_REMINDER,
            `Don't forget to submit the score for your match`,
            {
              opponentName: creator ? `${creator.firstName} ${creator.lastName}` : 'Opponent',
              date: match.date instanceof Date 
                ? match.date.toLocaleDateString() 
                : new Date(match.date).toLocaleDateString(),
              matchId: match.id,
            },
          );
          reminderCount++;
        } else {
          skippedCount++;
        }
      }
    }

    this.logger.log(`Sent ${reminderCount} score reminder notifications, skipped ${skippedCount} duplicates`);
  }
}

