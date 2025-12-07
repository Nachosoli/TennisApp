import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Result } from '../entities/result.entity';
import { ELOLog } from '../entities/elo-log.entity';
import { Report } from '../entities/report.entity';
import { Match } from '../entities/match.entity';

async function deleteAllUsers() {
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

    const userRepository = dataSource.getRepository(User);
    const resultRepository = dataSource.getRepository(Result);
    const eloLogRepository = dataSource.getRepository(ELOLog);
    const reportRepository = dataSource.getRepository(Report);
    const matchRepository = dataSource.getRepository(Match);

    // Count users before deletion
    const userCount = await userRepository.count();
    console.log(`\n📊 Found ${userCount} user(s) in the database`);

    if (userCount === 0) {
      console.log('✅ No users to delete.');
      return;
    }

    // Show users that will be deleted
    const allUsers = await userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
    console.log('\n⚠️  Users to be deleted:');
    allUsers.forEach((user) => {
      console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) [${user.role}]`);
    });

    // Clean up orphaned records first (those with SET NULL constraints)
    console.log('\n🧹 Cleaning up orphaned records...');
    
    // Delete results that will have null player references
    const resultCount = await resultRepository.count();
    if (resultCount > 0) {
      await resultRepository.createQueryBuilder().delete().execute();
      console.log(`   ✅ Deleted ${resultCount} result(s)`);
    }

    // Delete ELO logs that will have null user/opponent references
    const eloLogCount = await eloLogRepository.count();
    if (eloLogCount > 0) {
      await eloLogRepository.createQueryBuilder().delete().execute();
      console.log(`   ✅ Deleted ${eloLogCount} ELO log(s)`);
    }

    // Delete reports (admin_user_id will be set to null, but we'll delete all reports)
    const reportCount = await reportRepository.count();
    if (reportCount > 0) {
      await reportRepository.createQueryBuilder().delete().execute();
      console.log(`   ✅ Deleted ${reportCount} report(s)`);
    }

    // Delete all matches (they will cascade delete match_slots, applications, chat_messages)
    const matchCount = await matchRepository.count();
    if (matchCount > 0) {
      await matchRepository.createQueryBuilder().delete().execute();
      console.log(`   ✅ Deleted ${matchCount} match(es) and related data`);
    }

    // Now delete all users - this will CASCADE delete:
    // - user_stats
    // - notifications
    // - notification_preferences
    // - admin_actions
    // - applications (via matches)
    // - chat_messages (via matches)
    // Note: Courts are no longer deleted when users are deleted (removed created_by_user_id)
    console.log('\n🗑️  Deleting all users and related profiles...');
    await userRepository.createQueryBuilder().delete().execute();

    console.log(`\n✅ Successfully deleted all ${userCount} user(s) and their complete profiles!`);

    // Verify deletion
    const remainingCount = await userRepository.count();
    console.log(`\n📊 Remaining users: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('✅ Database cleanse complete - all users deleted!');
    } else {
      console.log('⚠️  Warning: Some users still remain in the database.');
    }
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteAllUsers();
