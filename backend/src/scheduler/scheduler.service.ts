import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from '../entities/match.entity';
import { SlotStatus } from '../entities/match-slot.entity';
import { Result } from '../entities/result.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Send score reminder notifications 24 hours after match date
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
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
      .leftJoinAndSelect('slots.application', 'application')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .getMany();

    let reminderCount = 0;

    for (const match of matches) {
      const confirmedSlot = match.slots.find((slot) => slot.status === SlotStatus.CONFIRMED);
      if (!confirmedSlot?.application) continue;

      const applicant = confirmedSlot.application.applicant;
      const creator = match.creator;

      // Notify creator
      if (creator) {
        await this.notificationsService.createNotification(
          creator.id,
          NotificationType.SCORE_REMINDER,
          `Don't forget to submit the score for your match`,
          {
            opponentName: applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Opponent',
            date: match.date,
            matchId: match.id,
          },
        );
        reminderCount++;
      }

      // Notify applicant
      if (applicant) {
        await this.notificationsService.createNotification(
          applicant.id,
          NotificationType.SCORE_REMINDER,
          `Don't forget to submit the score for your match`,
          {
            opponentName: creator ? `${creator.firstName} ${creator.lastName}` : 'Opponent',
            date: match.date,
            matchId: match.id,
          },
        );
        reminderCount++;
      }
    }

    this.logger.log(`Sent ${reminderCount} score reminder notifications`);
  }
}

