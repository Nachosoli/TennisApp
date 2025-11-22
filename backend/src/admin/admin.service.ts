import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Court } from '../entities/court.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { Result } from '../entities/result.entity';
import { AdminAction, ActionType, TargetType } from '../entities/admin-action.entity';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { AdjustScoreDto } from './dto/adjust-score.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Court)
    private courtRepository: Repository<Court>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(AdminAction)
    private adminActionRepository: Repository<AdminAction>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Suspend a user
   */
  async suspendUser(adminId: string, userId: string, suspendDto: SuspendUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.suspendedUntil = suspendDto.suspendedUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days
    await this.userRepository.save(user);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.SUSPEND_USER, TargetType.USER, userId, {
      reason: suspendDto.reason,
      suspendedUntil: user.suspendedUntil,
    });

    // Notify user
    await this.notificationsService.createNotification(
      userId,
      NotificationType.COURT_CHANGES, // Using available type
      `Your account has been suspended until ${user.suspendedUntil?.toLocaleDateString()}. Reason: ${suspendDto.reason}`,
    );

    return user;
  }

  /**
   * Ban a user
   */
  async banUser(adminId: string, userId: string, reason: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.bannedAt = new Date();
    user.isActive = false;
    await this.userRepository.save(user);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.BAN_USER, TargetType.USER, userId, {
      reason,
    });

    return user;
  }

  /**
   * Edit user profile
   */
  async editUser(adminId: string, userId: string, editDto: EditUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const editDtoWithRole = editDto as EditUserDto & { role?: UserRole };
    Object.assign(user, editDtoWithRole);
    await this.userRepository.save(user);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.EDIT_USER, TargetType.USER, userId, {
      changes: editDto,
    });

    return user;
  }

  /**
   * Delete a user (permanently)
   */
  async deleteUser(adminId: string, userId: string, reason: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting yourself
    if (adminId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Log admin action before deletion
    await this.logAdminAction(adminId, ActionType.DELETE_USER, TargetType.USER, userId, {
      reason,
      deletedUserEmail: user.email,
      deletedUserName: `${user.firstName} ${user.lastName}`,
    });

    // Delete the user from database (CASCADE will delete related data)
    await this.userRepository.remove(user);
  }

  /**
   * Delete a court
   */
  async deleteCourt(adminId: string, courtId: string, reason: string): Promise<Court> {
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Soft delete
    court.deletedAt = new Date();
    await this.courtRepository.save(court);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.DELETE_COURT, TargetType.COURT, courtId, {
      reason,
    });

    // Notify court creator if exists
    if (court.createdByUserId) {
      await this.notificationsService.createNotification(
        court.createdByUserId,
        NotificationType.COURT_CHANGES,
        `Your court "${court.name}" has been deleted by an admin. Reason: ${reason}`,
      );
    }

    return court;
  }

  /**
   * Edit a court
   */
  async editCourt(adminId: string, courtId: string, updateData: Partial<Court>): Promise<Court> {
    const court = await this.courtRepository.findOne({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    Object.assign(court, updateData);
    await this.courtRepository.save(court);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.EDIT_COURT, TargetType.COURT, courtId, {
      changes: updateData,
    });

    return court;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(adminId: string, resultId: string, resolution: string): Promise<Result> {
    const result = await this.resultRepository.findOne({
      where: { id: resultId },
      relations: ['match', 'player1', 'player2'],
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    if (!result.disputed) {
      throw new BadRequestException('This result is not disputed');
    }

    result.disputed = false;
    await this.resultRepository.save(result);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.RESOLVE_DISPUTE, TargetType.RESULT, resultId, {
      resolution,
    });

    // Notify both players
    if (result.player1UserId) {
      await this.notificationsService.createNotification(
        result.player1UserId,
        NotificationType.COURT_CHANGES,
        `The dispute for your match has been resolved: ${resolution}`,
      );
    }
    if (result.player2UserId) {
      await this.notificationsService.createNotification(
        result.player2UserId,
        NotificationType.COURT_CHANGES,
        `The dispute for your match has been resolved: ${resolution}`,
      );
    }

    return result;
  }

  /**
   * Override match confirmation
   */
  async overrideConfirmation(adminId: string, matchId: string, reason: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['creator', 'slots', 'slots.applications'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    match.status = MatchStatus.CONFIRMED;
    await this.matchRepository.save(match);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.OVERRIDE_CONFIRMATION, TargetType.MATCH, matchId, {
      reason,
    });

    // Notify participants
    if (match.creatorUserId) {
      await this.notificationsService.createNotification(
        match.creatorUserId,
        NotificationType.MATCH_CONFIRMED,
        `Your match has been confirmed by an admin. Reason: ${reason}`,
        {
          opponentName: 'Admin Override',
          courtName: match.court?.name || 'Court',
          date: match.date.toLocaleDateString(),
          time: 'N/A',
        },
      );
    }

    return match;
  }

  /**
   * Adjust score
   */
  async adjustScore(adminId: string, resultId: string, adjustDto: AdjustScoreDto): Promise<Result> {
    const result = await this.resultRepository.findOne({
      where: { id: resultId },
      relations: ['match', 'player1', 'player2'],
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    const oldScore = result.score;
    result.score = adjustDto.score;
    await this.resultRepository.save(result);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.ADJUST_SCORE, TargetType.RESULT, resultId, {
      oldScore,
      newScore: adjustDto.score,
      reason: adjustDto.reason,
    });

    // Notify both players
    if (result.player1UserId) {
      await this.notificationsService.createNotification(
        result.player1UserId,
        NotificationType.COURT_CHANGES,
        `Your match score has been adjusted by an admin. New score: ${adjustDto.score}. Reason: ${adjustDto.reason}`,
      );
    }
    if (result.player2UserId) {
      await this.notificationsService.createNotification(
        result.player2UserId,
        NotificationType.COURT_CHANGES,
        `Your match score has been adjusted by an admin. New score: ${adjustDto.score}. Reason: ${adjustDto.reason}`,
      );
    }

    return result;
  }

  /**
   * Force cancel a match (delete from database)
   */
  async forceCancelMatch(adminId: string, matchId: string, reason: string): Promise<void> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['creator', 'slots', 'slots.applications'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Log admin action before deletion
    await this.logAdminAction(adminId, ActionType.FORCE_CANCEL_MATCH, TargetType.MATCH, matchId, {
      reason,
    });

    // Notify participants before deletion
    if (match.creatorUserId) {
      await this.notificationsService.createNotification(
        match.creatorUserId,
        NotificationType.COURT_CHANGES,
        `Your match has been cancelled by an admin. Reason: ${reason}`,
      );
    }

    // Delete the match from database (CASCADE will delete related slots and applications)
    await this.matchRepository.remove(match);
  }

  /**
   * Get admin action logs
   */
  async getAdminActions(limit: number = 100): Promise<AdminAction[]> {
    return this.adminActionRepository.find({
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Log an admin action
   */
  private async logAdminAction(
    adminId: string,
    actionType: ActionType,
    targetType: TargetType,
    targetId: string,
    details?: Record<string, any>,
  ): Promise<AdminAction> {
    const action = this.adminActionRepository.create({
      adminUserId: adminId,
      actionType,
      targetType,
      targetId,
      details,
    });

    return this.adminActionRepository.save(action);
  }
}
