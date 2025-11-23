import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Match, MatchStatus } from '../entities/match.entity';

config();

async function updateMatchToPending() {
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

    const matchRepository = dataSource.getRepository(Match);
    
    // Find all matches
    const matches = await matchRepository.find();
    
    if (matches.length === 0) {
      console.log('⚠️  No matches found in the database');
      return;
    }

    console.log(`📋 Found ${matches.length} match(es)`);

    // Update all matches to pending status
    for (const match of matches) {
      console.log(`🔄 Updating match ${match.id} from ${match.status} to ${MatchStatus.PENDING}`);
      match.status = MatchStatus.PENDING;
      (match as any).cancelledAt = null;
      (match as any).cancelledByUserId = null;
      await matchRepository.save(match);
    }

    console.log(`✅ Successfully updated ${matches.length} match(es) to pending status`);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateMatchToPending();

