import { DataSource } from 'typeorm';
import { User, UserRole, Gender } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import * as bcrypt from 'bcrypt';

async function createUsersWithMatches() {
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
    const matchRepository = dataSource.getRepository(Match);

    // Create admin user (or get existing)
    console.log('\n👤 Checking admin user...');
    let admin = await userRepository.findOne({
      where: { email: 'admin@courtmate.com' },
    });

    if (!admin) {
      const adminUser = userRepository.create({
        email: 'admin@courtmate.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        firstName: 'Admin',
        lastName: 'User',
        phone: '+15551234567',
        phoneVerified: true,
        gender: Gender.OTHER,
        role: UserRole.ADMIN,
        isActive: true,
      } as any);
      const savedAdmin = await userRepository.save(adminUser);
      admin = Array.isArray(savedAdmin) ? savedAdmin[0] : savedAdmin;
      console.log(`✅ Created admin user: ${admin.email}`);
    } else {
      console.log(`✅ Admin user already exists: ${admin.email}`);
    }

    // Get all matches to find unique creator IDs
    const allMatches = await matchRepository.find({
      select: ['creatorUserId'],
    });

    const uniqueCreatorIds = [...new Set(allMatches.map(m => m.creatorUserId))];
    console.log(`\n🎾 Found ${allMatches.length} matches created by ${uniqueCreatorIds.length} unique user(s)`);

    if (uniqueCreatorIds.length === 0) {
      console.log('✅ No matches found. Only admin user created.');
      return;
    }

    // Check which creators already exist
    const existingUsers = await userRepository.find({
      where: uniqueCreatorIds.map(id => ({ id })),
    });
    const existingUserIds = new Set(existingUsers.map(u => u.id));
    const missingCreatorIds = uniqueCreatorIds.filter(id => !existingUserIds.has(id));

    // Also check by email to avoid duplicates
    const existingEmails = new Set(existingUsers.map(u => u.email));

    console.log(`\n📊 Status:`);
    console.log(`   Existing users: ${existingUsers.length}`);
    console.log(`   Missing users: ${missingCreatorIds.length}`);

    if (missingCreatorIds.length === 0) {
      console.log('✅ All match creators already exist in the database.');
      return;
    }

    // Create missing users
    console.log(`\n👥 Creating ${missingCreatorIds.length} user(s) that have matches...`);
    
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    for (let i = 0; i < missingCreatorIds.length; i++) {
      const userId = missingCreatorIds[i];
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      let userNumber = i + 1;
      let email = `user${userNumber}@courtmate.com`;

      // Make sure email is unique
      while (existingEmails.has(email)) {
        userNumber++;
        email = `user${userNumber}@courtmate.com`;
      }

      const user = userRepository.create({
        id: userId, // Use the existing ID from matches
        email: email,
        passwordHash: await bcrypt.hash('password123', 10),
        firstName: firstName,
        lastName: lastName,
        phone: `+1555${String(1000000 + i).padStart(7, '0')}`,
        phoneVerified: true,
        gender: Gender.OTHER,
        role: UserRole.USER,
        isActive: true,
      } as any);

      try {
        const savedUser = await userRepository.save(user);
        const finalUser = Array.isArray(savedUser) ? savedUser[0] : savedUser;
        existingEmails.add(email); // Track created email
        console.log(`   ✅ Created: ${finalUser.email} (${finalUser.firstName} ${finalUser.lastName})`);
      } catch (error: any) {
        console.log(`   ⚠️  Failed to create user with ID ${userId}: ${error.message}`);
      }
    }

    // Show summary
    const totalUsers = await userRepository.count();
    const totalMatches = await matchRepository.count();
    
    console.log(`\n✨ Summary:`);
    console.log(`   Total users: ${totalUsers}`);
    console.log(`   Total matches: ${totalMatches}`);
    console.log(`\n📝 Admin credentials:`);
    console.log(`   Email: admin@courtmate.com`);
    console.log(`   Password: admin123`);

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createUsersWithMatches();

