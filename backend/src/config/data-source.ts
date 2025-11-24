import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Helper function to parse DATABASE_URL
function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      username: parsed.username,
      password: parsed.password,
      database: parsed.pathname.slice(1), // Remove leading '/'
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

// Get database configuration
function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    if (parsed) {
      return {
        ...parsed,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }
  }
  
  // Check for Railway's PostgreSQL variables (PGDATABASE/PGDAT, PGHOST, etc.)
  // Railway uses shortened names: PGDAT instead of PGDATABASE, PGPASS instead of PGPASSWORD
  const hasRailwayPgVars = process.env.PGDATABASE || process.env.PGDAT || process.env.PGHOST;
  
  if (hasRailwayPgVars) {
    return {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      username: process.env.PGUSER || process.env.DB_USER || 'courtmate',
      password: process.env.PGPASSWORD || process.env.PGPASS || process.env.DB_PASSWORD || 'courtmate123',
      database: process.env.PGDATABASE || process.env.PGDAT || process.env.DB_NAME || 'courtmate_db',
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }
  
  // Fall back to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'courtmate',
    password: process.env.DB_PASSWORD || 'courtmate123',
    database: process.env.DB_NAME || 'courtmate_db',
  };
}

const dbConfig = getDatabaseConfig();

export default new DataSource({
  type: 'postgres',
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
});

