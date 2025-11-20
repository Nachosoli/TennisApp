import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };

    const allHealthy = checks.checks.database.status === 'ok' && checks.checks.redis.status === 'ok';
    checks.status = allHealthy ? 'ok' : 'degraded';

    return checks;
  }

  async ready() {
    const checks = await this.check();
    const isReady = checks.checks.database.status === 'ok' && checks.checks.redis.status === 'ok';
    
    return {
      status: isReady ? 'ready' : 'not ready',
      checks: checks.checks,
    };
  }

  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<{ status: string; message?: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  private async checkRedis(): Promise<{ status: string; message?: string }> {
    try {
      await this.cacheManager.get('health-check');
      // Try to set a test value
      await this.cacheManager.set('health-check', 'ok', 1000);
      await this.cacheManager.del('health-check');
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }
}

