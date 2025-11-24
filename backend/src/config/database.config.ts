import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    // Check for DATABASE_URL first (Railway, Heroku, etc.)
    const databaseUrl = process.env.DATABASE_URL;
    let dbConfig: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };

    if (databaseUrl) {
      console.log('Using DATABASE_URL for database connection');
      const parsed = parseDatabaseUrl(databaseUrl);
      if (parsed) {
        dbConfig = parsed;
        console.log(`Database config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.username}`);
      } else {
        console.warn('Failed to parse DATABASE_URL, falling back to individual env vars');
        // Fall back to individual env vars if DATABASE_URL is invalid
        dbConfig = {
          host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
          port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
          username: process.env.DB_USER || process.env.PGUSER || 'courtmate',
          password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'courtmate123',
          database: process.env.DB_NAME || process.env.PGDATABASE || 'courtmate_db',
        };
      }
    } else {
      // Check for Railway's PostgreSQL variables (PGDATABASE, PGHOST, etc.)
      const hasRailwayPgVars = process.env.PGDATABASE || process.env.PGHOST;
      
      if (hasRailwayPgVars) {
        console.log('Using Railway PostgreSQL environment variables (PG*)');
        dbConfig = {
          host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
          username: process.env.PGUSER || process.env.DB_USER || 'courtmate',
          password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'courtmate123',
          database: process.env.PGDATABASE || process.env.DB_NAME || 'courtmate_db',
        };
        console.log(`Database config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.username}`);
      } else {
        console.log('Using individual environment variables (DB_*)');
        // Use individual environment variables
        dbConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'courtmate',
          password: process.env.DB_PASSWORD || 'courtmate123',
          database: process.env.DB_NAME || 'courtmate_db',
        };
        console.log(`Database config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.username}`);
      }
    }

    return {
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: false, // Disabled - use migrations instead
      logging: process.env.NODE_ENV === 'development',
      extra: {
        // Enable PostGIS extension
        options: '-c search_path=public',
        // Connection pool settings
        max: 20, // Maximum number of connections in the pool
        min: 5, // Minimum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 10000, // Timeout when acquiring a connection
        acquireTimeoutMillis: 60000, // Maximum time to wait for a connection from the pool
        // SSL configuration for Railway/cloud databases
        ssl: (process.env.DATABASE_URL || process.env.PGDATABASE || process.env.PGHOST) ? {
          rejectUnauthorized: false,
        } : false,
      },
    };
  },
);

