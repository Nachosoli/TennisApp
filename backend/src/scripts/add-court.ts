import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Court, SurfaceType } from '../entities/court.entity';

async function addCourt() {
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

    // Get the first admin user or first user as creator
    let creator = await userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (!creator) {
      creator = await userRepository.findOne({});
    }

    if (!creator) {
      console.error('❌ No users found. Please seed users first.');
      process.exit(1);
    }

    // Ponte Vedra Beach, FL coordinates (approximately)
    // 302 Davis Park Rd, Ponte Vedra Beach, FL 32081
    const latitude = 30.2394;
    const longitude = -81.3856;

    // Check if court already exists
    const existingCourt = await courtRepository.findOne({
      where: { name: 'Plannet Swim Tennis Club' },
    });

    if (existingCourt) {
      console.log('⚠️  Court "Plannet Swim Tennis Club" already exists in the database.');
      console.log(`   ID: ${existingCourt.id}`);
      console.log(`   Address: ${existingCourt.address}`);
      return;
    }

    // Create the court
    const court = courtRepository.create({
      name: 'Plannet Swim Tennis Club',
      address: '302 Davis Park Rd, Ponte Vedra Beach, FL 32081',
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
      } as any,
      surfaceType: SurfaceType.CLAY, // Clay surface
      isPublic: true,
      createdByUserId: creator.id,
    } as any);

    const savedCourt = await courtRepository.save(court);
    const finalCourt = Array.isArray(savedCourt) ? savedCourt[0] : savedCourt;

    console.log('\n✅ Court added successfully!');
    console.log(`   Name: ${finalCourt.name}`);
    console.log(`   Address: ${finalCourt.address}`);
    console.log(`   ID: ${finalCourt.id}`);
    console.log(`   Surface: ${finalCourt.surfaceType}`);
    console.log(`   Public: ${finalCourt.isPublic}`);
    console.log(`   Coordinates: ${latitude}, ${longitude}`);

    // Show total court count
    const totalCount = await courtRepository.count({ withDeleted: false });
    console.log(`\n📊 Total courts in database: ${totalCount}`);
  } catch (error) {
    console.error('❌ Failed to add court:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

addCourt();

