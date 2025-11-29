import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Court } from '../entities/court.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { Result } from '../entities/result.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import { AdminAction, ActionType, TargetType } from '../entities/admin-action.entity';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { EditUserDto } from './dto/edit-user.dto';
import { AdjustScoreDto } from './dto/adjust-score.dto';
import { WipeDatabaseDto } from './dto/wipe-database.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.enums';
import { PasswordService } from '../auth/services/password.service';

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
    private passwordService: PasswordService,
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
   * Get all courts with pagination and filters
   */
  async getAllCourts(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<{ courts: Court[]; total: number }> {
    const query = this.courtRepository.createQueryBuilder('court')
      .leftJoinAndSelect('court.createdBy', 'createdBy')
      .where('court.deletedAt IS NULL');

    // Search by name or address
    if (search) {
      query.andWhere(
        '(LOWER(court.name) LIKE LOWER(:search) OR LOWER(court.address) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [courts, total] = await query
      .orderBy('court.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { courts, total };
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
   * Get all users with pagination and filters
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    role?: string,
    isActive?: boolean,
  ): Promise<{ users: User[]; total: number }> {
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.homeCourt', 'homeCourt')
      .leftJoinAndSelect('user.stats', 'stats');

    // Search by name or email
    if (search) {
      query.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Filter by role
    if (role) {
      query.andWhere('user.role = :role', { role: role.toUpperCase() });
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive });
    }

    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt', 'stats'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Set user's home court (admin action)
   */
  async setUserHomeCourt(adminId: string, userId: string, courtId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const court = await this.courtRepository.findOne({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    const oldCourtId = user.homeCourtId;
    (user as any).homeCourtId = courtId;
    await this.userRepository.save(user);

    // Log admin action
    await this.logAdminAction(adminId, ActionType.EDIT_USER, TargetType.USER, userId, {
      action: 'set_home_court',
      oldCourtId,
      newCourtId: courtId,
      courtName: court.name,
    });

    // Reload user with relations
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt'],
    }) as Promise<User>;
  }

  /**
   * Get all matches for a user (as creator and as participant)
   */
  async getUserMatches(userId: string): Promise<Match[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get matches where user is creator
    const createdMatches = await this.matchRepository.find({
      where: { creatorUserId: userId },
      relations: ['court', 'creator', 'slots', 'slots.applications', 'slots.applications.applicant'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    // Get matches where user is a confirmed participant
    const participatedMatches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.court', 'court')
      .leftJoinAndSelect('match.creator', 'creator')
      .leftJoinAndSelect('match.slots', 'slots')
      .leftJoinAndSelect('slots.applications', 'applications')
      .leftJoinAndSelect('applications.applicant', 'applicant')
      .leftJoin('slots.applications', 'userApplication')
      .where('userApplication.applicantUserId = :userId', { userId })
      .andWhere('userApplication.status = :status', { status: ApplicationStatus.CONFIRMED })
      .orderBy('match.date', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .getMany();

    // Combine and deduplicate (user might be creator and participant in same match)
    const allMatches = [...createdMatches];
    const createdMatchIds = new Set(createdMatches.map(m => m.id));
    
    for (const match of participatedMatches) {
      if (!createdMatchIds.has(match.id)) {
        allMatches.push(match);
      }
    }

    // Sort by date descending
    return allMatches.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get comprehensive user statistics
   */
  async getUserStats(userId: string): Promise<{
    user: User;
    matchesCreated: number;
    matchesParticipated: number;
    matchesCompleted: number;
    matchesCancelled: number;
    totalMatches: number;
    winRate: number;
    stats: any;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['homeCourt', 'stats'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get matches created
    const matchesCreated = await this.matchRepository.count({
      where: { creatorUserId: userId },
    });

    // Get matches participated (confirmed applications)
    const matchesParticipated = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoin('match.slots', 'slots')
      .leftJoin('slots.applications', 'applications')
      .where('applications.applicantUserId = :userId', { userId })
      .andWhere('applications.status = :status', { status: 'confirmed' })
      .getCount();

    // Get completed matches
    const matchesCompleted = await this.matchRepository.count({
      where: { creatorUserId: userId, status: MatchStatus.COMPLETED },
    });

    // Get cancelled matches
    const matchesCancelled = await this.matchRepository.count({
      where: { creatorUserId: userId, status: MatchStatus.CANCELLED },
    });

    const totalMatches = matchesCreated;
    const winRate = user.stats && user.stats.totalMatches > 0
      ? (user.stats.totalWins / user.stats.totalMatches) * 100
      : 0;

    return {
      user,
      matchesCreated,
      matchesParticipated,
      matchesCompleted,
      matchesCancelled,
      totalMatches,
      winRate: Number(winRate.toFixed(2)),
      stats: user.stats || null,
    };
  }

  /**
   * Get all matches with pagination and filters
   */
  async getAllMatches(
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: MatchStatus,
  ): Promise<{ matches: Match[]; total: number }> {
    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.court', 'court')
      .leftJoinAndSelect('match.creator', 'creator')
      .leftJoinAndSelect('creator.stats', 'creatorStats')
      .leftJoinAndSelect('match.slots', 'slots')
      .leftJoinAndSelect('slots.applications', 'applications')
      .leftJoinAndSelect('applications.applicant', 'applicant');

    // Search by creator name or court name
    if (search) {
      query.andWhere(
        '(LOWER(creator.firstName) LIKE LOWER(:search) OR LOWER(creator.lastName) LIKE LOWER(:search) OR LOWER(court.name) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Filter by status
    if (status) {
      query.andWhere('match.status = :status', { status });
    }

    const [matches, total] = await query
      .orderBy('match.date', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { matches, total };
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

  /**
   * TEMPORARY: Wipe database except courts table
   */
  async wipeDatabaseExceptCourts(adminId: string, wipeDto: WipeDatabaseDto): Promise<{ success: boolean; message: string; deletedCounts?: Record<string, number> }> {
    try {
      // Get admin user and verify password
      const adminUser = await this.userRepository.findOne({
        where: { id: adminId },
      });

      if (!adminUser) {
        throw new NotFoundException('Admin user not found');
      }

      // Check if user has a password (OAuth users don't have passwords)
      if (!adminUser.passwordHash) {
        throw new UnauthorizedException('Password verification not available for OAuth accounts. Please use an account with a password.');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.comparePassword(
        wipeDto.password,
        adminUser.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password. Please verify your password and try again.');
      }

      // Log admin action
      await this.logAdminAction(
        adminId,
        ActionType.EDIT_USER, // Using available action type
        TargetType.USER,
        adminId,
        { action: 'wipe_database_except_courts' },
      );

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const deletedCounts: Record<string, number> = {};

        // Helper function to check if table exists
        const tableExists = async (tableName: string): Promise<boolean> => {
          try {
            const result = await queryRunner.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '${tableName}'
              ) as exists;
            `);
            return result[0]?.exists || false;
          } catch {
            return false;
          }
        };

        // Helper function to safely delete from a table
        const safeDelete = async (tableName: string, displayName: string) => {
          try {
            // Check if table exists first
            const exists = await tableExists(tableName);
            if (!exists) {
              deletedCounts[displayName] = 0;
              return 0;
            }

            // Get count before deletion for reporting
            const countResult = await queryRunner.query(`SELECT COUNT(*) as count FROM "${tableName}";`);
            const count = parseInt(countResult[0]?.count || '0', 10);
            
            // Use TRUNCATE CASCADE for efficiency
            await queryRunner.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
            
            deletedCounts[displayName] = count;
            return count;
          } catch (error: any) {
            // If transaction is aborted, we need to rollback and rethrow
            if (error.message && error.message.includes('current transaction is aborted')) {
              throw error;
            }
            // Log error but don't abort transaction for non-critical errors
            console.error(`Error truncating table ${tableName}:`, error.message);
            deletedCounts[displayName] = 0;
            return 0;
          }
        };

        // Delete in order to respect foreign key constraints
        // Order matters: delete child tables first, then parent tables
        
        await safeDelete('applications', 'Applications');
        await safeDelete('match_slots', 'Match Slots');
        await safeDelete('results', 'Results');
        await safeDelete('chat_messages', 'Chat Messages');
        await safeDelete('matches', 'Matches');
        await safeDelete('notifications', 'Notifications');
        await safeDelete('notification_preferences', 'Notification Preferences');
        await safeDelete('reports', 'Reports');
        await safeDelete('admin_actions', 'Admin Actions');
        await safeDelete('elo_logs', 'ELO Logs');
        await safeDelete('user_stats', 'User Stats');
        await safeDelete('payment_methods', 'Payment Methods');
        await safeDelete('push_subscriptions', 'Push Subscriptions');
        
        // Clear home court references before deleting users
        try {
          await queryRunner.query('UPDATE users SET home_court_id = NULL WHERE home_court_id IS NOT NULL;');
        } catch (error: any) {
          if (error.code !== '42P01') {
            throw error;
          }
        }
        
        // Delete users (but NOT courts)
        await safeDelete('users', 'Users');

        await queryRunner.commitTransaction();

        const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
        return {
          success: true,
          message: `Database wiped successfully. Deleted ${totalDeleted} records across ${Object.keys(deletedCounts).length} tables. Courts table preserved.`,
          deletedCounts,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Database wipe failed: ${error.message}`,
      };
    }
  }

  /**
   * TEMPORARY: Run migration to refactor notifications to use deliveries
   */
  async runNotificationRefactoringMigration(adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Log admin action
      await this.logAdminAction(
        adminId,
        ActionType.EDIT_USER, // Using available action type
        TargetType.USER,
        adminId,
        { action: 'run_notification_refactoring_migration' },
      );

      // Check if migration already ran
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        const tableExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notification_deliveries'
          ) as exists;
        `);

        if (tableExists[0]?.exists) {
          await queryRunner.release();
          return {
            success: true,
            message: 'Migration already applied. notification_deliveries table already exists.',
          };
        }

        // Import and run the migration
        const { RefactorNotificationsToUseDeliveries1734570000000 } = await import(
          '../migrations/1734570000000-RefactorNotificationsToUseDeliveries'
        );
        const migration = new RefactorNotificationsToUseDeliveries1734570000000();
        
        await migration.up(queryRunner);

        await queryRunner.release();

        return {
          success: true,
          message: 'Migration completed successfully. Notifications have been refactored to use delivery records.',
        };
      } catch (error) {
        await queryRunner.release();
        throw error;
      }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
      };
    }
  }

  /**
   * TEMPORARY: Run migration to add match_applicant to notification enums
   */
  async runMatchApplicantMigration(adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Log admin action
      await this.logAdminAction(
        adminId,
        ActionType.EDIT_USER, // Using available action type
        TargetType.USER,
        adminId,
        { action: 'run_match_applicant_migration' },
      );

      // Run the migration SQL directly
      // NOTE: ALTER TYPE ADD VALUE cannot be run inside a transaction in PostgreSQL
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        // Add 'match_applicant' to notifications_type_enum if it doesn't exist
        // Run outside transaction as ALTER TYPE ADD VALUE has transaction restrictions
        await queryRunner.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'match_applicant' 
              AND enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'notifications_type_enum'
              )
            ) THEN
              ALTER TYPE "notifications_type_enum" ADD VALUE 'match_applicant';
            END IF;
          END $$;
        `);

        // Add 'match_applicant' to notification_preferences_notificationtype_enum if it doesn't exist
        await queryRunner.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'match_applicant' 
              AND enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'notification_preferences_notificationtype_enum'
              )
            ) THEN
              ALTER TYPE "notification_preferences_notificationtype_enum" ADD VALUE 'match_applicant';
            END IF;
          END $$;
        `);

        return {
          success: true,
          message: 'Migration completed successfully. match_applicant has been added to notification enum types.',
        };
      } catch (error) {
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
      };
    }
  }
}
