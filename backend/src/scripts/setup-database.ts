import { DataSource } from 'typeorm';
import dataSource from '../config/data-source';

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Enable PostGIS extension (optional - may not be available in all PostgreSQL instances)
    console.log('📦 Attempting to enable PostGIS extension...');
    try {
      await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('✅ PostGIS extension enabled');
    } catch (error: any) {
      if (error.code === '0A000' || error.message?.includes('extension "postgis" is not available')) {
        console.warn('⚠️  PostGIS extension is not available in this PostgreSQL instance');
        console.warn('   Location-based features may not work, but the app will still function');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Run migrations
    console.log('🔄 Running migrations...');
    const migrations = await dataSource.runMigrations();
    
    if (migrations.length > 0) {
      console.log(`✅ Applied ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log('✅ No new migrations to apply');
    }

    // Verify tables were created
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n📊 Database tables (${tables.length}):`);
    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

setupDatabase();

