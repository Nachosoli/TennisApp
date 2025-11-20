import { DataSource } from 'typeorm';
import { Court } from '../entities/court.entity';
import { Match } from '../entities/match.entity';

async function deleteCourtsExceptPlanet() {
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
    const matchRepository = dataSource.getRepository(Match);

    // Get all matches first to show count
    const allMatches = await matchRepository.find();
    const matchCount = allMatches.length;

    // Delete all matches first (cascade will handle related data)
    if (matchCount > 0) {
      console.log(`\n🗑️  Deleting ${matchCount} match(es)...`);
      await matchRepository.remove(allMatches);
      console.log(`✅ Deleted ${matchCount} match(es) and related data`);
    } else {
      console.log('\n✅ No matches found to delete');
    }

    // Get all courts
    const allCourts = await courtRepository.find({ withDeleted: false });
    
    // Find the Planet Swim Tennis Club court
    const planetCourt = allCourts.find(c => 
      c.name.toLowerCase().includes('planet') || 
      c.name.toLowerCase().includes('plannet')
    );

    if (!planetCourt) {
      console.log('\n⚠️  Planet Swim Tennis Club not found. Deleting all courts...');
      await courtRepository.remove(allCourts);
      console.log(`✅ Deleted ${allCourts.length} court(s)`);
    } else {
      console.log(`\n✅ Found Planet Swim Tennis Club: ${planetCourt.name}`);
      
      // Get courts to delete (all except Planet)
      const courtsToDelete = allCourts.filter(c => c.id !== planetCourt.id);
      
      if (courtsToDelete.length === 0) {
        console.log('✅ No other courts to delete. Only Planet Swim Tennis Club exists.');
        return;
      }

      console.log(`\n⚠️  Found ${courtsToDelete.length} court(s) to delete:`);
      courtsToDelete.forEach((court, index) => {
        console.log(`   ${index + 1}. ${court.name} - ${court.address}`);
      });

      // Delete courts (cascade will handle related data)
      await courtRepository.remove(courtsToDelete);

      console.log(`\n✅ Successfully deleted ${courtsToDelete.length} court(s).`);
    }

    // Show remaining courts
    const remainingCourts = await courtRepository.count({ withDeleted: false });
    console.log(`\n📊 Remaining courts: ${remainingCourts}`);
    
    if (remainingCourts > 0) {
      const remaining = await courtRepository.find({ withDeleted: false });
      remaining.forEach(court => {
        console.log(`   - ${court.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteCourtsExceptPlanet();

