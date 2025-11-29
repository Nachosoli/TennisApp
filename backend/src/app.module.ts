import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CourtsModule } from './courts/courts.module';
import { MatchesModule } from './matches/matches.module';
import { ApplicationsModule } from './applications/applications.module';
import { ChatModule } from './chat/chat.module';
import { ResultsModule } from './results/results.module';
import { EloModule } from './elo/elo.module';
import { StatsModule } from './stats/stats.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { GatewaysModule } from './gateways/gateways.module';
import { ContactModule } from './contact/contact.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import { TimeoutMiddleware } from './common/middleware/timeout.middleware';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    // Database module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        console.log('TypeORM connecting to:', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          ssl: dbConfig.extra?.ssl || false,
        });
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    // Redis cache module - using ioredis directly for cache-manager v7
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redis = configService.get('redis');
        try {
          const store = await redisStore({
            socket: {
              host: redis.host,
              port: redis.port,
              tls: redis.tls || false,
            },
            password: redis.password || undefined,
          });
          return {
            store,
            ttl: redis.ttl * 1000, // Convert to milliseconds
          };
        } catch (error) {
          // If Redis is not available, fall back to memory store
          console.warn('Redis not available, using memory store:', error.message);
          return {
            ttl: redis.ttl * 1000,
          };
        }
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    // Feature modules
    AuthModule,
    UsersModule,
    CourtsModule,
    MatchesModule,
    ApplicationsModule,
    ChatModule,
    ResultsModule,
    EloModule,
    StatsModule,
    NotificationsModule,
    AdminModule,
    ReportsModule,
    AnalyticsModule,
    SchedulerModule,
    GatewaysModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply timeout middleware to all routes
    consumer.apply(TimeoutMiddleware).forRoutes('*');
  }
}
