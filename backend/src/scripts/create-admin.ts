import { DataSource } from 'typeorm';
import { User, UserRole, Gender } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

async function createAdmin() {
  const email = process.argv[2] || 'admin@courtmate.com';
  const password = process.argv[3] || '12345678';
  
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

    // Check if user already exists
    let user = await userRepository.findOne({
      where: { email },
    });

    if (user) {
      console.log(`\n⚠️  User with email "${email}" already exists.`);
      console.log(`   Updating password...`);
      
      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      user.passwordHash = passwordHash;
      await userRepository.save(user);
      
      console.log(`\n✅ Password updated successfully!`);
    } else {
      console.log(`\n👤 Creating admin user...`);
      
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const adminUser = userRepository.create({
        email: email,
        passwordHash: passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+15551234567',
        phoneVerified: true,
        gender: Gender.OTHER,
        role: UserRole.ADMIN,
        isActive: true,
      } as any);
      
      const savedUser = await userRepository.save(adminUser);
      user = Array.isArray(savedUser) ? savedUser[0] : savedUser;
      
      console.log(`\n✅ Admin user created successfully!`);
    }

    console.log(`\n📝 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n✨ You can now log in with these credentials.`);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createAdmin();

