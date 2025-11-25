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
    // Check for DATABASE_URL first (Railway, Heroku, etc.) - use url option directly
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      console.log('Using DATABASE_URL for database connection');
      return {
        type: 'postgres',
        url: databaseUrl,
        entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        synchronize: false, // Disabled - use migrations instead
        logging: process.env.NODE_ENV === 'development',
        ssl: {
          rejectUnauthorized: false,
        },
        extra: {
          // Enable PostGIS extension
          options: '-c search_path=public',
          // Connection pool settings
          max: 20, // Maximum number of connections in the pool
          min: 5, // Minimum number of connections in the pool
          idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
          connectionTimeoutMillis: 10000, // Timeout when acquiring a connection
          acquireTimeoutMillis: 60000, // Maximum time to wait for a connection from the pool
        },
      };
    }

    // Fall back to individual environment variables
    // Check for Railway's PostgreSQL variables (PGDATABASE/PGDAT, PGHOST, etc.)
    const hasRailwayPgVars = process.env.PGDATABASE || process.env.PGDAT || process.env.PGHOST;
    
    let dbConfig: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };

    if (hasRailwayPgVars) {
      console.log('Using Railway PostgreSQL environment variables (PG*)');
      dbConfig = {
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
        username: process.env.PGUSER || process.env.DB_USER || 'courtmate',
        password: process.env.PGPASSWORD || process.env.PGPASS || process.env.DB_PASSWORD || 'courtmate123',
        database: process.env.PGDATABASE || process.env.PGDAT || process.env.DB_NAME || 'courtmate_db',
      };
      console.log(`Database config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.username}`);
    } else {
      console.log('Using individual environment variables (DB_*)');
      dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'courtmate',
        password: process.env.DB_PASSWORD || 'courtmate123',
        database: process.env.DB_NAME || 'courtmate_db',
      };
      console.log(`Database config: host=${dbConfig.host}, port=${dbConfig.port}, database=${dbConfig.database}, user=${dbConfig.username}`);
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
      ssl: hasRailwayPgVars ? {
        rejectUnauthorized: false,
      } : false,
      extra: {
        // Enable PostGIS extension
        options: '-c search_path=public',
        // Connection pool settings
        max: 20, // Maximum number of connections in the pool
        min: 5, // Minimum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 10000, // Timeout when acquiring a connection
        acquireTimeoutMillis: 60000, // Maximum time to wait for a connection from the pool
      },
    };
  },
);

