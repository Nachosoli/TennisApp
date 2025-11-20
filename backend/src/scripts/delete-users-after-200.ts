import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

async function deleteUsersAfter200() {
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

    // Get all users ordered by creation date (oldest first)
    const allUsers = await userRepository.find({
      order: { createdAt: 'ASC' },
    });

    const totalUsers = allUsers.length;
    console.log(`📊 Total users in database: ${totalUsers}`);

    if (totalUsers <= 200) {
      console.log('✅ No users to delete. Database already has 200 or fewer users.');
      return;
    }

    // Keep first 200 users, delete the rest
    const usersToKeep = allUsers.slice(0, 200);
    const usersToDelete = allUsers.slice(200);

    console.log(`\n⚠️  Found ${usersToDelete.length} user(s) to delete (after entry #200):`);

    // Show some examples
    const previewCount = Math.min(10, usersToDelete.length);
    for (let i = 0; i < previewCount; i++) {
      const user = usersToDelete[i];
      console.log(`   ${i + 1}. ${user.email} (${user.firstName} ${user.lastName})`);
    }
    if (usersToDelete.length > previewCount) {
      console.log(`   ... and ${usersToDelete.length - previewCount} more`);
    }

    // Delete users (cascade will handle related data)
    await userRepository.remove(usersToDelete);

    console.log(`\n✅ Successfully deleted ${usersToDelete.length} user(s) after entry #200.`);

    // Show remaining users count
    const remainingCount = await userRepository.count();
    console.log(`\n📊 Remaining users: ${remainingCount}`);
    console.log(`   (Kept first ${usersToKeep.length} users)`);
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteUsersAfter200();


