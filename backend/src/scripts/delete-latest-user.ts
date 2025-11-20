import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

async function deleteLatestUser() {
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

    // Get the latest user (most recently created)
    const users = await userRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    const latestUser = users[0];

    if (!latestUser) {
      console.log('❌ No users found in the database.');
      return;
    }

    console.log(`\n⚠️  Found latest user to delete:`);
    console.log(`   Email: ${latestUser.email}`);
    console.log(`   Name: ${latestUser.firstName} ${latestUser.lastName}`);
    console.log(`   Created: ${latestUser.createdAt.toLocaleString()}`);

    // Delete the user (cascade will handle related data)
    await userRepository.remove(latestUser);

    console.log(`\n✅ Successfully deleted latest user: ${latestUser.email}`);

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

deleteLatestUser();

