import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => {
    const databaseUrl = process.env.DATABASE_URL;
    
    // Only use DATABASE_URL if it's set and not empty
    if (databaseUrl && databaseUrl.trim() !== '') {
      console.log('Using DATABASE_URL for database connection');
      // Check if this is a local Docker connection (postgres service name) - disable SSL
      const isLocalDocker = databaseUrl.includes('@postgres:') || databaseUrl.includes('@localhost:');
      return {
        type: 'postgres',
        url: databaseUrl,
        autoLoadEntities: true,
        synchronize: false, // Disabled - use migrations instead
        ssl: isLocalDocker ? false : {
          rejectUnauthorized: false,
        },
        entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        logging: process.env.NODE_ENV === 'development',
        extra: {
          // Enable PostGIS extension
          options: '-c search_path=public',
          // Connection pool settings
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          acquireTimeoutMillis: 60000,
        },
      };
    }

    // Fall back to individual environment variables if DATABASE_URL is not set
    console.log('DATABASE_URL not found, using individual environment variables');
    const hasRailwayPgVars = process.env.PGDATABASE || process.env.PGDAT || process.env.PGHOST;
    
    return {
      type: 'postgres',
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      username: process.env.PGUSER || process.env.DB_USER || 'courtmate',
      password: process.env.PGPASSWORD || process.env.PGPASS || process.env.DB_PASSWORD || 'courtmate123',
      database: process.env.PGDATABASE || process.env.PGDAT || process.env.DB_NAME || 'courtmate_db',
      autoLoadEntities: true,
      synchronize: false, // Disabled - use migrations instead
      ssl: hasRailwayPgVars ? {
        rejectUnauthorized: false,
      } : false,
      entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      logging: process.env.NODE_ENV === 'development',
      extra: {
        // Enable PostGIS extension
        options: '-c search_path=public',
        // Connection pool settings
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        acquireTimeoutMillis: 60000,
      },
    };
  },
);

