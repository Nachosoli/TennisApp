import { DataSource } from 'typeorm';

async function clearDatabase() {
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

    // Get all entity tables
    const entities = dataSource.entityMetadatas;

    // Disable foreign key checks temporarily
    await dataSource.query('SET session_replication_role = replica;');

    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
      console.log(`🗑️  Cleared ${entity.tableName}`);
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');

    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Clear failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

clearDatabase();

