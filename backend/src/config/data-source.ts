import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Get database configuration
// When running locally via Railway CLI, DATABASE_URL points to internal hostname (.railway.internal)
// which is not accessible from local machine. In that case, prefer DATABASE_PUBLIC_URL (proxy URL).
// When running inside Railway's network, DATABASE_URL works fine.
const databaseUrl = (() => {
  const dbUrl = process.env.DATABASE_URL;
  const publicUrl = process.env.DATABASE_PUBLIC_URL;
  
  // If DATABASE_URL contains .railway.internal, we're likely running locally via railway run
  // In that case, use DATABASE_PUBLIC_URL (proxy) if available
  if (dbUrl && dbUrl.includes('.railway.internal') && publicUrl) {
    return publicUrl;
  }
  
  // Otherwise, prefer DATABASE_URL (for Railway services) or fall back to DATABASE_PUBLIC_URL
  return dbUrl || publicUrl;
})();

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

