import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as readline from 'readline';

config();

// Create a custom data source for this script that handles SSL more flexibly
const databaseUrl = (() => {
  const dbUrl = process.env.DATABASE_URL;
  const publicUrl = process.env.DATABASE_PUBLIC_URL;
  
  // If DATABASE_URL contains .railway.internal, we're running locally via railway run
  // In that case, prefer DATABASE_PUBLIC_URL (proxy URL) if available
  // Otherwise, construct URL from PG* environment variables if available
  if (dbUrl && dbUrl.includes('.railway.internal')) {
    if (publicUrl) {
      console.log('⚠️  Detected Railway internal URL, using DATABASE_PUBLIC_URL instead');
      return publicUrl;
    } else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
      // Construct connection URL from PG* variables
      // Note: This will only work if Railway provides a public proxy or if we're actually in Railway's network
      // For Railway, we need to check if there's a public proxy URL available
      console.log('⚠️  Detected Railway internal URL, but DATABASE_PUBLIC_URL not set.');
      console.log('   Attempting to use Railway service connection...');
      // When running via railway run, we should be in Railway's network, so internal URL should work
      // But if it doesn't, we need DATABASE_PUBLIC_URL
      return dbUrl; // Try the internal URL - it should work when running via railway run
    } else {
      console.error('❌ DATABASE_URL points to Railway internal hostname but DATABASE_PUBLIC_URL is not set!');
      console.error('   Please set DATABASE_PUBLIC_URL in Railway or ensure you are running via "railway run"');
      process.exit(1);
    }
  }
  
  // Otherwise, prefer DATABASE_URL (for Railway services) or fall back to DATABASE_PUBLIC_URL
  return dbUrl || publicUrl;
})();

// Determine if we should use SSL (only for remote connections, not localhost)
const useSSL = databaseUrl 
  ? !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1') && !databaseUrl.includes('postgresql://localhost')
  : (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1');

const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl || undefined,
  host: databaseUrl ? undefined : (process.env.DB_HOST || 'localhost'),
  port: databaseUrl ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
  username: databaseUrl ? undefined : (process.env.DB_USER || 'courtmate'),
  password: databaseUrl ? undefined : (process.env.DB_PASSWORD || 'courtmate123'),
  database: databaseUrl ? undefined : (process.env.DB_NAME || 'courtmate_db'),
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
});

const TABLES_TO_DELETE = [
  'chat_messages',
  'results',
  'elo_logs',
  'applications',
  'match_slots',
  'matches',
  'notifications',
  'notification_preferences',
  'user_stats',
  'reports',
  'admin_actions',
  'payment_methods',
  'push_subscriptions',
];

const TABLES_TO_KEEP = ['courts', 'users'];

async function confirm(skipConfirmation: boolean): Promise<boolean> {
  // Show warning regardless
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the following tables:');
  console.log('   Tables to DELETE:');
  TABLES_TO_DELETE.forEach((table) => {
    console.log(`   - ${table}`);
  });
  console.log('\n   Tables to KEEP:');
  TABLES_TO_KEEP.forEach((table) => {
    console.log(`   - ${table}`);
  });
  console.log('\n⚠️  This action CANNOT be undone!\n');

  // Skip confirmation if --yes flag is provided
  if (skipConfirmation) {
    console.log('⚠️  Confirmation skipped (--yes flag provided)');
    return true;
  }

  // Otherwise, prompt for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Type "YES" (all caps) to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'YES');
    });
  });
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await dataSource.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result[0]?.exists === true;
  } catch {
    return false;
  }
}

async function getTableCount(tableName: string): Promise<number> {
  try {
    const result = await dataSource.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result[0]?.count || '0', 10);
  } catch (error: any) {
    // Table doesn't exist
    if (error.code === '42P01') {
      return -1; // Return -1 to indicate table doesn't exist
    }
    throw error;
  }
}

async function wipeDatabase() {
  try {
    // Check for --yes flag (npm passes args after --)
    const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y') || process.env.SKIP_CONFIRM === 'true';

    console.log('🔄 Connecting to database...');
    if (databaseUrl) {
      console.log(`   Using: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password
    }
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Confirm before proceeding
    const confirmed = await confirm(skipConfirmation);
    if (!confirmed) {
      console.log('❌ Operation cancelled. No data was deleted.');
      await dataSource.destroy();
      process.exit(0);
    }

    console.log('\n🗑️  Starting database wipe...\n');

    const deletionResults: Array<{ table: string; count: number }> = [];

    // Delete tables in order (respecting foreign key constraints)
    for (const tableName of TABLES_TO_DELETE) {
      try {
        // Check if table exists first
        const exists = await tableExists(tableName);
        if (!exists) {
          console.log(`ℹ️  ${tableName} does not exist (skipping)`);
          deletionResults.push({ table: tableName, count: 0 });
          continue;
        }

        // Get count before deletion
        const countBefore = await getTableCount(tableName);
        
        if (countBefore > 0) {
          // Use TRUNCATE CASCADE to handle foreign keys automatically
          await dataSource.query(`TRUNCATE TABLE ${tableName} CASCADE`);
          console.log(`✅ Deleted ${countBefore} record(s) from ${tableName}`);
          deletionResults.push({ table: tableName, count: countBefore });
        } else if (countBefore === 0) {
          console.log(`ℹ️  ${tableName} is already empty`);
          deletionResults.push({ table: tableName, count: 0 });
        }
      } catch (error: any) {
        console.error(`❌ Error deleting from ${tableName}:`, error.message);
        // Continue with other tables even if one fails
        deletionResults.push({ table: tableName, count: 0 });
      }
    }

    // Verify tables are empty
    console.log('\n🔍 Verifying deletion...\n');
    let allEmpty = true;
    for (const tableName of TABLES_TO_DELETE) {
      try {
        const exists = await tableExists(tableName);
        if (!exists) {
          continue; // Skip non-existent tables
        }
        const count = await getTableCount(tableName);
        if (count > 0) {
          console.log(`⚠️  ${tableName} still has ${count} record(s)`);
          allEmpty = false;
        }
      } catch (error: any) {
        // Table doesn't exist or other error, skip
        continue;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    const totalDeleted = deletionResults.reduce((sum, r) => sum + r.count, 0);
    console.log(`Total records deleted: ${totalDeleted}`);
    console.log('\nBreakdown:');
    deletionResults.forEach(({ table, count }) => {
      if (count > 0) {
        console.log(`  ${table}: ${count} record(s)`);
      }
    });
    console.log('\n' + '='.repeat(60));

    if (allEmpty) {
      console.log('✅ Database wipe completed successfully!');
      console.log('✅ Courts and Users tables are preserved.');
    } else {
      console.log('⚠️  Some tables may still contain data. Please check manually.');
    }

    await dataSource.destroy();
    console.log('\n✅ Database connection closed.');
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the script
wipeDatabase();
