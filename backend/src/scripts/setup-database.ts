import { DataSource } from 'typeorm';
import dataSource from '../config/data-source';

async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Enable PostGIS extension
    console.log('📦 Enabling PostGIS extension...');
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension enabled');

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

