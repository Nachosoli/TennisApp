import { DataSource } from 'typeorm';
import { Court } from '../entities/court.entity';

async function deleteAllCourts() {
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

    // Get all courts (including soft-deleted)
    const allCourts = await courtRepository.find({
      withDeleted: true,
    });
    const totalCourts = allCourts.length;

    if (totalCourts === 0) {
      console.log('✅ No courts found in the database.');
      return;
    }

    console.log(`\n⚠️  Found ${totalCourts} court(s) to delete:`);
    
    // Show some examples
    const previewCount = Math.min(10, totalCourts);
    for (let i = 0; i < previewCount; i++) {
      const court = allCourts[i];
      console.log(`   ${i + 1}. ${court.name} - ${court.address}`);
    }
    if (totalCourts > previewCount) {
      console.log(`   ... and ${totalCourts - previewCount} more`);
    }

    // Delete all courts (hard delete - remove completely)
    await courtRepository.remove(allCourts);

    console.log(`\n✅ Successfully deleted all ${totalCourts} court(s).`);

    // Verify deletion
    const remainingCount = await courtRepository.count({ withDeleted: true });
    console.log(`\n📊 Remaining courts: ${remainingCount}`);
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteAllCourts();

