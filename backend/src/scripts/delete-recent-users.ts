import { DataSource, LessThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';

async function deleteRecentUsers() {
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

    // Get current date/time
    const now = new Date();
    
    // Delete users created in the last 24 hours (or you can adjust this)
    // For "lately", let's use last 24 hours
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Or delete users created today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Use today as cutoff (users created today)
    const recentUsers = await userRepository.find({
      where: {
        createdAt: LessThanOrEqual(now) as any, // Get all users
      },
      order: { createdAt: 'DESC' },
    });

    // Filter to get users created in the last 24 hours
    const usersToDelete = recentUsers.filter(user => {
      const userCreated = new Date(user.createdAt);
      return userCreated >= cutoffDate;
    });

    if (usersToDelete.length === 0) {
      console.log('✅ No recently created users found to delete.');
      console.log(`   (Cutoff: users created after ${cutoffDate.toLocaleString()})`);
      return;
    }

    console.log(`\n⚠️  Found ${usersToDelete.length} recently created user(s) to delete:`);
    console.log(`   (Users created after ${cutoffDate.toLocaleString()})`);
    
    usersToDelete.forEach((user, index) => {
      const createdDate = new Date(user.createdAt);
      console.log(`   ${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) - Created: ${createdDate.toLocaleString()}`);
    });

    // Delete users (cascade will handle related data)
    await userRepository.remove(usersToDelete);

    console.log(`\n✅ Successfully deleted ${usersToDelete.length} recently created user(s).`);

    // Show remaining users count
    const remainingCount = await userRepository.count();
    console.log(`\n📊 Remaining users: ${remainingCount}`);
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteRecentUsers();


