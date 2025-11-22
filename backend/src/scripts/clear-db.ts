import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function clearDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'courtmate',
    password: process.env.DB_PASSWORD || 'courtmate123',
    database: process.env.DB_NAME || 'courtmate_db',
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connected');

    // Helper function to safely delete from a table
    const safeDelete = async (tableName: string, displayName: string) => {
      try {
        const result = await dataSource.query(`DELETE FROM ${tableName};`);
        const count = result[1] || 0; // PostgreSQL returns [command, rowCount]
        console.log(`🗑️  Deleted from ${displayName} (${count} rows)`);
      } catch (error: any) {
        if (error.code === '42P01') {
          // Table doesn't exist, skip it
          console.log(`⏭️  Skipping ${displayName} (table doesn't exist)`);
        } else {
          throw error;
        }
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
    
    // Clear home court references before deleting courts
    try {
      await dataSource.query('UPDATE users SET home_court_id = NULL WHERE home_court_id IS NOT NULL;');
      console.log('🗑️  Cleared home court references');
    } catch (error: any) {
      if (error.code !== '42P01') {
        throw error;
      }
    }
    
    await safeDelete('courts', 'Courts');
    await safeDelete('users', 'Users');

    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Clear failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

clearDatabase();

