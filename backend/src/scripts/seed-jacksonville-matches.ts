import { DataSource } from 'typeorm';
import { User, UserRole, Gender } from '../entities/user.entity';
import { Court } from '../entities/court.entity';
import { Match, MatchFormat, MatchStatus } from '../entities/match.entity';
import { MatchSlot, SlotStatus } from '../entities/match-slot.entity';
import { Application, ApplicationStatus } from '../entities/application.entity';
import * as bcrypt from 'bcrypt';

// Helper function to format time as HH:MM:SS
function formatTime(hours: number, minutes: number = 0): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
}

// Helper function to get random date between start and end dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random integer between min and max
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedJacksonvilleMatches() {
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
    const courtRepository = dataSource.getRepository(Court);
    const matchRepository = dataSource.getRepository(Match);
    const slotRepository = dataSource.getRepository(MatchSlot);
    const applicationRepository = dataSource.getRepository(Application);

    // Get users
    let users = await userRepository.find({ take: 50 });

    // Create users if we don't have enough
    if (users.length < 5) {
      console.log(`⚠️  Only ${users.length} user(s) found. Creating additional users...`);
      const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
      
      for (let i = users.length; i < 10; i++) {
        const user = userRepository.create({
          email: `user${i + 1}@courtmate.com`,
          passwordHash: await bcrypt.hash('password123', 10),
          firstName: firstNames[i % firstNames.length],
          lastName: lastNames[i % lastNames.length],
          phone: `+1555${String(1000000 + i).padStart(7, '0')}`,
          phoneVerified: true,
          gender: Gender.OTHER,
          role: UserRole.USER,
          isActive: true,
        } as any);
        const savedUser = await userRepository.save(user);
        const finalUser = Array.isArray(savedUser) ? savedUser[0] : savedUser;
        users.push(finalUser);
      }
      console.log(`✅ Created ${10 - users.length} additional users`);
    }

    // Get Jacksonville courts (courts with "Jacksonville" in the name or address)
    let jacksonvilleCourts = await courtRepository
      .createQueryBuilder('court')
      .where('LOWER(court.name) LIKE :name OR LOWER(court.address) LIKE :address', {
        name: '%jacksonville%',
        address: '%jacksonville%',
      })
      .getMany();

    // If no Jacksonville courts found, create some
    if (jacksonvilleCourts.length === 0) {
      console.log('⚠️  No Jacksonville courts found. Creating Jacksonville courts...');
      
      // Jacksonville, FL coordinates
      const jacksonvilleLat = 30.3322;
      const jacksonvilleLng = -81.6557;
      
      const courtNames = [
        'Memorial Park Tennis Courts',
        'Jacksonville Beach Tennis Center',
        'Riverside Park Tennis Courts',
        'Brentwood Park Tennis Courts',
        'Burnett Park Tennis Complex',
        'Durbin Pavilion Tennis Courts',
        'Fleming Island Park Tennis Courts',
        'Losco Regional Park',
        'Jacksonville Tennis Center at Patton Park',
        'Atlantic Beach Tennis Center',
        'Baymeadows Tennis Center',
      ];

      const surfaces = ['Hard', 'Clay', 'Grass', 'Indoor'] as any[];
      const adminUser = users.find(u => u.role === 'admin') || users[0];

      for (let i = 0; i < courtNames.length; i++) {
        const court = courtRepository.create({
          name: courtNames[i],
          address: `${randomInt(100, 9999)} ${randomElement(['Main', 'Park', 'Beach', 'Bay', 'Ocean'])} St, Jacksonville, FL 32202`,
          coordinates: {
            type: 'Point',
            coordinates: [jacksonvilleLng + (Math.random() - 0.5) * 0.1, jacksonvilleLat + (Math.random() - 0.5) * 0.1],
          } as any,
          surfaceType: surfaces[i % surfaces.length],
          isPublic: true,
          createdByUserId: adminUser.id,
        } as any);
        const savedCourt = await courtRepository.save(court);
        jacksonvilleCourts.push(Array.isArray(savedCourt) ? savedCourt[0] : savedCourt);
      }
      console.log(`✅ Created ${jacksonvilleCourts.length} Jacksonville courts`);
    }

    console.log(`📊 Found ${users.length} users and ${jacksonvilleCourts.length} Jacksonville courts`);

    const matches: Match[] = [];
    const statuses = [MatchStatus.PENDING, MatchStatus.CONFIRMED, MatchStatus.COMPLETED, MatchStatus.CANCELLED];
    const formats = [MatchFormat.SINGLES, MatchFormat.DOUBLES];
    const slotStatuses = [SlotStatus.AVAILABLE, SlotStatus.LOCKED, SlotStatus.CONFIRMED];

    // Date range: from today to 60 days in the future
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 60);

    // Time slots (morning, afternoon, evening)
    const timeSlots = [
      { start: 9, end: 10.5 },   // 9:00-10:30
      { start: 10, end: 11.5 },  // 10:00-11:30
      { start: 11, end: 12.5 },  // 11:00-12:30
      { start: 14, end: 15.5 },  // 14:00-15:30
      { start: 15, end: 16.5 },  // 15:00-16:30
      { start: 16, end: 17.5 },  // 16:00-17:30
      { start: 17, end: 18.5 },  // 17:00-18:30
      { start: 18, end: 19.5 },  // 18:00-19:30
    ];

    console.log('\n🎾 Creating 20 matches in Jacksonville...\n');

    for (let i = 0; i < 20; i++) {
      const creator = randomElement(users);
      const court = randomElement(jacksonvilleCourts);
      const format = randomElement(formats);
      const status = randomElement(statuses);
      const date = randomDate(today, futureDate);
      
      // Set skill level range
      const skillMin = randomInt(3, 6);
      const skillMax = skillMin + randomInt(0, 2);

      // Create match
      const match = matchRepository.create({
        creatorUserId: creator.id,
        courtId: court.id,
        date: date,
        format: format,
        skillLevelMin: skillMin,
        skillLevelMax: skillMax,
        status: status,
        cancelledAt: status === MatchStatus.CANCELLED ? new Date() : null,
        cancelledByUserId: status === MatchStatus.CANCELLED ? creator.id : null,
      } as any);

      const savedMatchResult = await matchRepository.save(match);
      const savedMatch = Array.isArray(savedMatchResult) ? savedMatchResult[0] : savedMatchResult;
      matches.push(savedMatch);

      // Create 1-3 time slots for each match
      const numSlots = randomInt(1, 3);
      const selectedTimeSlots: Array<{ start: number; end: number }> = [];
      for (let j = 0; j < numSlots; j++) {
        selectedTimeSlots.push(randomElement(timeSlots));
      }

      for (const timeSlot of selectedTimeSlots) {
        const slotStatus = status === MatchStatus.CONFIRMED 
          ? SlotStatus.CONFIRMED 
          : status === MatchStatus.COMPLETED
          ? SlotStatus.CONFIRMED
          : randomElement([SlotStatus.AVAILABLE, SlotStatus.LOCKED]);

        const slot = slotRepository.create({
          matchId: savedMatch.id,
          startTime: formatTime(Math.floor(timeSlot.start), (timeSlot.start % 1) * 60),
          endTime: formatTime(Math.floor(timeSlot.end), (timeSlot.end % 1) * 60),
          status: slotStatus,
          lockedByUserId: slotStatus === SlotStatus.LOCKED ? randomElement(users).id : null,
          lockedAt: slotStatus === SlotStatus.LOCKED ? new Date() : null,
          expiresAt: slotStatus === SlotStatus.LOCKED ? new Date(Date.now() + 15 * 60 * 1000) : null,
          confirmedAt: slotStatus === SlotStatus.CONFIRMED ? new Date() : null,
        } as any);

        const savedSlotResult = await slotRepository.save(slot);
        const savedSlot = Array.isArray(savedSlotResult) ? savedSlotResult[0] : savedSlotResult;

        // Create application for some slots (especially confirmed ones)
        if (slotStatus === SlotStatus.CONFIRMED || (slotStatus === SlotStatus.LOCKED && Math.random() > 0.5)) {
          const applicant = users.find(u => u.id !== creator.id) || randomElement(users);
          const appStatus = slotStatus === SlotStatus.CONFIRMED 
            ? ApplicationStatus.CONFIRMED 
            : ApplicationStatus.PENDING;

          const application = applicationRepository.create({
            matchSlotId: savedSlot.id,
            applicantUserId: applicant.id,
            guestPartnerName: format === MatchFormat.DOUBLES && Math.random() > 0.5 ? 'Guest Player' : null,
            status: appStatus,
          } as any);
          await applicationRepository.save(application);
        }
      }

      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      console.log(`✅ Match ${i + 1}/20: ${dateStr} - ${format} - ${status} at ${court.name}`);
    }

    console.log(`\n✨ Successfully created ${matches.length} matches in Jacksonville!`);
    console.log(`\n📊 Summary:`);
    
    const statusCounts = matches.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    const formatCounts = matches.reduce((acc, m) => {
      acc[m.format] = (acc[m.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📋 Format breakdown:`);
    Object.entries(formatCounts).forEach(([format, count]) => {
      console.log(`   ${format}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seedJacksonvilleMatches();

