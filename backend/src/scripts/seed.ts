import { DataSource } from 'typeorm';
import { User, UserRole, RatingType } from '../entities/user.entity';
import { Court, SurfaceType } from '../entities/court.entity';
import { UserStats } from '../entities/user-stats.entity';
import * as bcrypt from 'bcrypt';
// import * as geojson from 'geojson';

// Florida cities coordinates (lat, lng)
const FLORIDA_CITIES = [
  { name: 'Miami', lat: 25.7617, lng: -80.1918 },
  { name: 'Tampa', lat: 27.9506, lng: -82.4572 },
  { name: 'Orlando', lat: 28.5383, lng: -81.3792 },
  { name: 'Jacksonville', lat: 30.3322, lng: -81.6557 },
  { name: 'Fort Lauderdale', lat: 26.1224, lng: -80.1373 },
  { name: 'Tallahassee', lat: 30.4515, lng: -84.2807 },
  { name: 'St. Petersburg', lat: 27.7676, lng: -82.6403 },
  { name: 'Naples', lat: 26.1420, lng: -81.7948 },
  { name: 'Sarasota', lat: 27.3364, lng: -82.5307 },
  { name: 'West Palm Beach', lat: 26.7153, lng: -80.0534 },
];

const SURFACES: SurfaceType[] = [SurfaceType.HARD, SurfaceType.CLAY, SurfaceType.GRASS, SurfaceType.INDOOR];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function seedUsers(dataSource: DataSource, count: number): Promise<User[]> {
  const userRepository = dataSource.getRepository(User);
  const statsRepository = dataSource.getRepository(UserStats);
  const users: User[] = [];

  // Create admin user
  const adminUser = userRepository.create({
    email: 'admin@courtmate.com',
    passwordHash: await bcrypt.hash('admin123', 10),
    firstName: 'Admin',
    lastName: 'User',
    phone: '+15551234567',
    phoneVerified: true,
    role: UserRole.ADMIN,
    isActive: true,
    ratingType: RatingType.UTR,
    ratingValue: 5.0,
  } as any);
  const savedAdminUser = await userRepository.save(adminUser);
  users.push(Array.isArray(savedAdminUser) ? savedAdminUser[0] : savedAdminUser);

  // Create test users
  const testUsers = [
    {
      email: 'test@courtmate.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '+15551234568',
      hasHomeCourt: true,
    },
    {
      email: 'test2@courtmate.com',
      firstName: 'Test',
      lastName: 'User2',
      phone: '+15551234569',
      hasHomeCourt: false,
    },
  ];

  for (const testUser of testUsers) {
    const user = userRepository.create({
      email: testUser.email,
      passwordHash: await bcrypt.hash('test123', 10),
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      phone: testUser.phone,
      phoneVerified: true,
      role: UserRole.USER,
      isActive: true,
      ratingType: RatingType.UTR,
      ratingValue: randomFloat(3.0, 7.0),
    } as any);
    const savedUser = await userRepository.save(user);
    const userEntity = Array.isArray(savedUser) ? savedUser[0] : savedUser;
    users.push(userEntity);

    // Create stats
    const stats = statsRepository.create({
      userId: userEntity.id,
      singlesElo: 1000,
      doublesElo: 1000,
      winStreakSingles: 0,
      winStreakDoubles: 0,
      totalMatches: 0,
      totalWins: 0,
    });
    await statsRepository.save(stats);
  }

  // Create regular users
  for (let i = 0; i < count - 3; i++) {
    const city = randomElement(FLORIDA_CITIES);
    const lat = city.lat + randomFloat(-0.1, 0.1);
    const lng = city.lng + randomFloat(-0.1, 0.1);

    const user = userRepository.create({
      email: `user${i + 1}@courtmate.com`,
      passwordHash: await bcrypt.hash('password123', 10),
      firstName: randomElement(FIRST_NAMES),
      lastName: randomElement(LAST_NAMES),
      phone: `+1555${randomInt(1000000, 9999999)}`,
      phoneVerified: Math.random() > 0.3, // 70% verified
      role: UserRole.USER,
      isActive: Math.random() > 0.1, // 90% active
      ratingType: randomElement([RatingType.UTR, RatingType.USTA, RatingType.CUSTOM]),
      ratingValue: randomFloat(2.0, 8.0),
      bio: Math.random() > 0.5 ? `Tennis enthusiast from ${city.name}` : undefined,
    } as any);
    const savedUser = await userRepository.save(user);
    const savedUserEntity = Array.isArray(savedUser) ? savedUser[0] : savedUser;
    users.push(savedUserEntity);

    // Create stats
    const stats = statsRepository.create({
      userId: savedUserEntity.id,
      singlesElo: 1000 + randomInt(-200, 200),
      doublesElo: 1000 + randomInt(-200, 200),
      winStreakSingles: randomInt(0, 5),
      winStreakDoubles: randomInt(0, 5),
      totalMatches: randomInt(0, 50),
      totalWins: randomInt(0, 30),
    });
    await statsRepository.save(stats);
  }

  return users;
}

async function seedCourts(dataSource: DataSource, users: User[], count: number): Promise<Court[]> {
  const courtRepository = dataSource.getRepository(Court);
  const courts: Court[] = [];

  const courtNames = [
    'Central Park Tennis Center',
    'Riverside Tennis Club',
    'Sunset Courts',
    'Oceanview Tennis Facility',
    'Downtown Tennis Academy',
    'Palm Beach Courts',
    'Tropical Tennis Club',
    'Bayfront Tennis Center',
    'Island Tennis Courts',
    'Paradise Tennis Club',
  ];

  for (let i = 0; i < count; i++) {
    const city = randomElement(FLORIDA_CITIES);
    const lat = city.lat + randomFloat(-0.2, 0.2);
    const lng = city.lng + randomFloat(-0.2, 0.2);
    const creator = randomElement(users);

    const court = courtRepository.create({
      name: `${randomElement(courtNames)} ${i > 9 ? Math.floor(i / 10) : ''}`.trim(),
      address: `${randomInt(100, 9999)} ${randomElement(['Main', 'Park', 'Ocean', 'Bay', 'Palm'])} St, ${city.name}, FL`,
      coordinates: {
        type: 'Point',
        coordinates: [lng, lat],
      } as any,
      surfaceType: randomElement(SURFACES),
      isPublic: Math.random() > 0.3, // 70% public
      createdByUserId: creator.id,
    } as any);

    const savedCourt = await courtRepository.save(court);
    courts.push(Array.isArray(savedCourt) ? savedCourt[0] : savedCourt);
  }

  // Assign home courts to some users
  const usersWithHomeCourt = users.filter((u) => u.role === UserRole.USER).slice(0, Math.floor(users.length * 0.6));
  for (let i = 0; i < usersWithHomeCourt.length; i++) {
    const user = usersWithHomeCourt[i];
    const court = courts[i % courts.length];
    user.homeCourtId = court.id;
    await dataSource.getRepository(User).save(user);
  }

  return courts;
}

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'courtmate',
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('📦 Database connected');

    console.log('👥 Seeding users...');
    const users = await seedUsers(dataSource, 200);
    console.log(`✅ Created ${users.length} users`);

    console.log('🏟️  Seeding courts...');
    const courts = await seedCourts(dataSource, users, 100);
    console.log(`✅ Created ${courts.length} courts`);

    console.log('✨ Seed completed successfully!');
    console.log('\n📝 Test Accounts:');
    console.log('  Admin: admin@courtmate.com / admin123');
    console.log('  User:  test@courtmate.com / test123');
    console.log('  User2: test2@courtmate.com / test123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();

