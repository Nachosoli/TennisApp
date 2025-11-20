import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

async function cleanseUsers() {
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

    // Find all users that don't have @courtmate.com email
    const usersToDelete = await userRepository
      .createQueryBuilder('user')
      .where('user.email NOT LIKE :domain', { domain: '%@courtmate.com' })
      .getMany();

    const count = usersToDelete.length;

    if (count === 0) {
      console.log('✅ No users to delete. All users have @courtmate.com email addresses.');
      return;
    }

    console.log(`\n⚠️  Found ${count} user(s) to delete:`);
    usersToDelete.forEach((user) => {
      console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
    });

    // Delete users (cascade will handle related data)
    await userRepository.remove(usersToDelete);

    console.log(`\n✅ Successfully deleted ${count} user(s) that did not have @courtmate.com email addresses.`);

    // Show remaining users count
    const remainingCount = await userRepository.count();
    console.log(`\n📊 Remaining users: ${remainingCount}`);
  } catch (error) {
    console.error('❌ Cleanse failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

cleanseUsers();

