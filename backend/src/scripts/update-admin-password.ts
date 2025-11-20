import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

async function updateAdminPassword() {
  const email = process.argv[2] || 'admin@courtmate.com';
  const newPassword = process.argv[3] || '12345678';
  
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

    const user = await userRepository.findOne({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User with email "${email}" not found in the database.`);
      return;
    }

    console.log(`\n✅ User found:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.passwordHash = passwordHash;
    await userRepository.save(user);

    console.log(`\n✅ Password updated successfully!`);
    console.log(`   New password: ${newPassword}`);
    console.log(`\n⚠️  You can now log in with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateAdminPassword();

