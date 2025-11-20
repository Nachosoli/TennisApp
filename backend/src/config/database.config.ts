import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'courtmate',
    password: process.env.DB_PASSWORD || 'courtmate123',
    database: process.env.DB_NAME || 'courtmate_db',
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
    },
  }),
);

