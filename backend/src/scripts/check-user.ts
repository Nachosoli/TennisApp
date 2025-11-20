import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

async function checkUser() {
  const email = process.argv[2] || 'ignacio.solinas@hotmail.com';
  
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
    console.log(`   Phone: ${user.phone || 'Not set'}`);
    console.log(`   Phone Verified: ${user.phoneVerified}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}`);
    console.log(`\n⚠️  Password: Cannot retrieve (stored as hash)`);
    console.log(`   Passwords are hashed using bcrypt and cannot be retrieved in plain text.`);
    console.log(`   To reset the password, use the password reset functionality or update it via admin.`);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

checkUser();

