import { DataSource } from 'typeorm';
import { Court } from '../entities/court.entity';

async function countCourts() {
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

    const courtRepository = dataSource.getRepository(Court);

    // Count all courts (including soft-deleted)
    const totalCount = await courtRepository.count({ withDeleted: true });
    
    // Count active courts (not soft-deleted)
    const activeCount = await courtRepository.count({ withDeleted: false });

    // Count deleted courts
    const deletedCount = totalCount - activeCount;

    console.log(`\n📊 Court Statistics:`);
    console.log(`   Total courts: ${totalCount}`);
    console.log(`   Active courts: ${activeCount}`);
    console.log(`   Deleted courts: ${deletedCount}`);

    // Show some sample courts
    const sampleCourts = await courtRepository.find({
      take: 10,
      withDeleted: false,
      order: { createdAt: 'DESC' },
    });

    if (sampleCourts.length > 0) {
      console.log(`\n📋 Sample courts (showing up to 10):`);
      sampleCourts.forEach((court, index) => {
        console.log(`   ${index + 1}. ${court.name} - ${court.address}`);
      });
    }
  } catch (error) {
    console.error('❌ Count failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

countCourts();

