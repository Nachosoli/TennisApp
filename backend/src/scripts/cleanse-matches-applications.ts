import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function cleanseMatchesAndApplications() {
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
    
    console.log('🗑️  Deleting Applications...');
    await safeDelete('applications', 'Applications');
    
    console.log('🗑️  Deleting Match Slots...');
    await safeDelete('match_slots', 'Match Slots');
    
    console.log('🗑️  Deleting Results...');
    await safeDelete('results', 'Results');
    
    console.log('🗑️  Deleting Chat Messages...');
    await safeDelete('chat_messages', 'Chat Messages');
    
    console.log('🗑️  Deleting Matches...');
    await safeDelete('matches', 'Matches');

    // Clear home court references (optional - users can keep their home court preference)
    // Uncomment if you want to clear home court references:
    // try {
    //   await dataSource.query('UPDATE users SET home_court_id = NULL WHERE home_court_id IS NOT NULL;');
    //   console.log('🗑️  Cleared home court references');
    // } catch (error: any) {
    //   if (error.code !== '42P01') {
    //     throw error;
    //   }
    // }

    console.log('✅ Matches and applications cleansed successfully!');
    console.log('✅ Users, profiles (user_stats), and courts have been preserved.');
  } catch (error) {
    console.error('❌ Cleanse failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

cleanseMatchesAndApplications();

