import { DataSource } from 'typeorm';
import { Match } from '../entities/match.entity';
import { MatchStatus } from '../entities/match.entity';

async function deleteCancelledMatches() {
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

    // Find all cancelled matches
    const cancelledMatches = await matchRepository.find({
      where: { status: MatchStatus.CANCELLED },
      relations: ['court', 'creator'],
    });

    const matchCount = cancelledMatches.length;
    console.log(`\n📊 Found ${matchCount} cancelled match(es) in the database`);

    if (matchCount === 0) {
      console.log('✅ No cancelled matches to delete.');
      return;
    }

    // Show preview of matches to be deleted
    console.log('\n⚠️  Cancelled matches to be deleted:');
    const previewCount = Math.min(10, matchCount);
    for (let i = 0; i < previewCount; i++) {
      const match = cancelledMatches[i];
      const dateStr = match.date ? new Date(match.date).toLocaleDateString() : 'N/A';
      const courtName = match.court?.name || 'Unknown Court';
      console.log(`   ${i + 1}. Match ${match.id.substring(0, 8)}... - ${courtName} - ${dateStr}`);
    }
    if (matchCount > previewCount) {
      console.log(`   ... and ${matchCount - previewCount} more`);
    }

    // Delete all cancelled matches
    // This will cascade delete: match_slots, applications, chat_messages
    console.log('\n🗑️  Deleting cancelled matches and related data...');
    await matchRepository
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: MatchStatus.CANCELLED })
      .execute();

    console.log(`\n✅ Successfully deleted ${matchCount} cancelled match(es) and related data!`);

    // Verify deletion
    const remainingCount = await matchRepository.count({
      where: { status: MatchStatus.CANCELLED },
    });
    console.log(`\n📊 Remaining cancelled matches: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('✅ Database cleanse complete - all cancelled matches deleted!');
    } else {
      console.log('⚠️  Warning: Some cancelled matches still remain in the database.');
    }
  } catch (error) {
    console.error('❌ Delete failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

deleteCancelledMatches();


