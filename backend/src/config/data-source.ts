import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Get database configuration
// Prefer DATABASE_PUBLIC_URL for external access (e.g., from local machine via railway run)
// Use DATABASE_URL when running inside Railway's network
const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

let dataSourceConfig: any;

if (databaseUrl) {
  // Use DATABASE_URL directly with url option
  dataSourceConfig = {
    type: 'postgres' as const,
    url: databaseUrl,
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else {
  // Fall back to individual environment variables
  const hasRailwayPgVars = process.env.PGDATABASE || process.env.PGDAT || process.env.PGHOST;
  
  const dbConfig = hasRailwayPgVars ? {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
    username: process.env.PGUSER || process.env.DB_USER || 'courtmate',
    password: process.env.PGPASSWORD || process.env.PGPASS || process.env.DB_PASSWORD || 'courtmate123',
    database: process.env.PGDATABASE || process.env.PGDAT || process.env.DB_NAME || 'courtmate_db',
    ssl: {
      rejectUnauthorized: false,
    },
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'courtmate',
    password: process.env.DB_PASSWORD || 'courtmate123',
    database: process.env.DB_NAME || 'courtmate_db',
  };

  dataSourceConfig = {
    type: 'postgres' as const,
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    ssl: (dbConfig as any).ssl || false,
  };
}

export default new DataSource(dataSourceConfig);

