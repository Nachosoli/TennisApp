// Polyfill for crypto in Node.js 18+ environments (Railway, etc.)
// This ensures crypto is available globally before TypeORM initializes
import * as crypto from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto as any;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  // Initialize Sentry if DSN is provided
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }

  // Create logs directory if it doesn't exist
  const fs = require('fs');
  const logsDir = join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        new winston.transports.File({
          filename: join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    }),
  });

  // Enable CORS
  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log for debugging but allow in development
        console.warn(`CORS: Origin ${origin} not in allowed list:`, corsOrigins);
        callback(null, true); // Allow for now to debug
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Sentry interceptor (only if DSN is configured)
  if (process.env.SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  // API versioning
  app.setGlobalPrefix('api/v1');

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('CourtMate API')
    .setDescription('CourtMate Tennis App API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('courts', 'Court management')
    .addTag('matches', 'Match management')
    .addTag('chat', 'Real-time chat')
    .addTag('results', 'Match results and score entry')
    .addTag('stats', 'User statistics and ELO')
    .addTag('notifications', 'Notifications management')
    .addTag('admin', 'Admin operations')
    .addTag('reports', 'User reporting system')
    .addTag('analytics', 'Analytics dashboard')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const backendUrl = process.env.BACKEND_URL || `${protocol}://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  console.log(`🚀 Backend is running on: ${backendUrl}/api/v1`);
  console.log(`📚 API Documentation: ${backendUrl}/api/v1/docs`);
}
bootstrap();
