import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteAllDataExceptCourts1734570300000 implements MigrationInterface {
  name = 'DeleteAllDataExceptCourts1734570300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to safely delete from a table using savepoints
    // This prevents one failure from aborting the entire transaction
    const safeDelete = async (tableName: string, displayName: string) => {
      const savepointName = `sp_${tableName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        // Create a savepoint before the operation
        await queryRunner.query(`SAVEPOINT ${savepointName};`);
        
        // Check if table exists first
        const tableExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists;
        `, [tableName]);
        
        if (!tableExists[0]?.exists) {
          await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName};`);
          console.log(`⏭️  Skipping ${displayName} (table doesn't exist)`);
          return;
        }
        
        // Perform the delete
        const result = await queryRunner.query(`DELETE FROM ${tableName};`);
        const rowCount = result.rowCount || 0;
        
        // Release the savepoint on success
        await queryRunner.query(`RELEASE SAVEPOINT ${savepointName};`);
        console.log(`🗑️  Deleted from ${displayName} (${rowCount} rows)`);
      } catch (error: any) {
        // Rollback to savepoint on error to prevent transaction abort
        try {
          await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName};`);
        } catch (rollbackError: any) {
          // Savepoint might not exist if error occurred before creating it
          if (rollbackError.code !== '3B001') {
            throw rollbackError;
          }
        }
        
        if (error.code === '42P01') {
          // Table doesn't exist, skip it
          console.log(`⏭️  Skipping ${displayName} (table doesn't exist)`);
        } else {
          // Log error but continue - we'll try to delete anyway
          console.log(`⚠️  Warning: Error deleting from ${displayName}: ${error.message}`);
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
    // Use savepoint to prevent transaction abort on error
    const clearHomeCourtRefsSavepoint = 'sp_clear_home_court_refs';
    try {
      await queryRunner.query(`SAVEPOINT ${clearHomeCourtRefsSavepoint};`);
      
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        ) as exists;
      `);
      
      if (tableExists[0]?.exists) {
        const result = await queryRunner.query('UPDATE users SET home_court_id = NULL WHERE home_court_id IS NOT NULL;');
        const rowCount = result.rowCount || 0;
        await queryRunner.query(`RELEASE SAVEPOINT ${clearHomeCourtRefsSavepoint};`);
        console.log(`🗑️  Cleared home court references from users (${rowCount} rows)`);
      } else {
        await queryRunner.query(`ROLLBACK TO SAVEPOINT ${clearHomeCourtRefsSavepoint};`);
        console.log('⏭️  Skipping home court reference clearing (users table doesn\'t exist)');
      }
    } catch (error: any) {
      // Rollback to savepoint on error to prevent transaction abort
      try {
        await queryRunner.query(`ROLLBACK TO SAVEPOINT ${clearHomeCourtRefsSavepoint};`);
      } catch (rollbackError: any) {
        if (rollbackError.code !== '3B001') {
          throw rollbackError;
        }
      }
      // Log warning but continue - we'll still try to delete users
      console.log(`⚠️  Warning: Could not clear home court references: ${error.message}`);
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

