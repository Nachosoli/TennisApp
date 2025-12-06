import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteAllDataExceptCourts1734570300000 implements MigrationInterface {
  name = 'DeleteAllDataExceptCourts1734570300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to safely delete from a table
    const safeDelete = async (tableName: string, displayName: string) => {
      try {
        const result = await queryRunner.query(`DELETE FROM ${tableName};`);
        const rowCount = result[1] || 0; // PostgreSQL returns [command, rowCount]
        console.log(`🗑️  Deleted from ${displayName} (${rowCount} rows)`);
      } catch (error: any) {
        if (error.code === '42P01') {
          // Table doesn't exist, skip it
          console.log(`⏭️  Skipping ${displayName} (table doesn't exist)`);
        } else {
          console.error(`❌ Error deleting from ${displayName}:`, error.message);
          throw error;
        }
      }
    };

    console.log('🗑️  Starting data deletion (preserving courts table)...');

    // Delete in order to respect foreign key constraints
    // Order matters: delete child tables first, then parent tables

    // 1. Delete notification deliveries (depends on notifications)
    await safeDelete('notification_deliveries', 'Notification Deliveries');

    // 2. Delete applications (depends on match_slots, users)
    await safeDelete('applications', 'Applications');

    // 3. Delete match slots (depends on matches, users)
    await safeDelete('match_slots', 'Match Slots');

    // 4. Delete results (depends on matches, users)
    await safeDelete('results', 'Results');

    // 5. Delete chat messages (depends on matches, users)
    await safeDelete('chat_messages', 'Chat Messages');

    // 6. Delete ELO logs (depends on users, matches)
    await safeDelete('elo_logs', 'ELO Logs');

    // 7. Delete transactions (depends on users, matches)
    await safeDelete('transactions', 'Transactions');

    // 8. Delete court reviews (depends on courts, users) - but we keep courts
    await safeDelete('court_reviews', 'Court Reviews');

    // 9. Delete matches (depends on users, courts) - but we keep courts
    await safeDelete('matches', 'Matches');

    // 10. Delete notifications (depends on users)
    await safeDelete('notifications', 'Notifications');

    // 11. Delete notification preferences (depends on users)
    await safeDelete('notification_preferences', 'Notification Preferences');

    // 12. Delete reports (depends on users)
    await safeDelete('reports', 'Reports');

    // 13. Delete admin actions (depends on users)
    await safeDelete('admin_actions', 'Admin Actions');

    // 14. Delete user stats (depends on users)
    await safeDelete('user_stats', 'User Stats');

    // 15. Delete payment methods (depends on users)
    await safeDelete('payment_methods', 'Payment Methods');

    // 16. Delete push subscriptions (depends on users)
    await safeDelete('push_subscriptions', 'Push Subscriptions');

    // 17. Clear home court references before deleting users
    try {
      await queryRunner.query('UPDATE users SET home_court_id = NULL WHERE home_court_id IS NOT NULL;');
      console.log('🗑️  Cleared home court references from users');
    } catch (error: any) {
      if (error.code !== '42P01') {
        console.error('❌ Error clearing home court references:', error.message);
        throw error;
      }
    }

    // 18. Delete users (but we keep courts)
    await safeDelete('users', 'Users');

    // Note: courts table is intentionally NOT deleted

    console.log('✅ Data deletion completed successfully! Courts table preserved.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration cannot be reversed as it deletes data
    // Data recovery would require backups
    console.log('⚠️  This migration cannot be reversed. Data recovery requires backups.');
  }
}

