import { registerAs } from '@nestjs/config';

// Helper function to parse REDIS_URL
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' || parsed.protocol === 'rediss://',
    };
  } catch (error) {
    console.error('Error parsing REDIS_URL:', error);
    return null;
  }
}

export default registerAs('redis', () => {
  // Check for REDIS_URL first (Railway, Heroku, etc.)
  const redisUrl = process.env.REDIS_URL;
  let redisConfig: {
    host: string;
    port: number;
    password?: string;
    tls?: boolean;
  };

  if (redisUrl) {
    console.log('Using REDIS_URL for Redis connection');
    const parsed = parseRedisUrl(redisUrl);
    if (parsed) {
      redisConfig = parsed;
      console.log(`Redis config: host=${redisConfig.host}, port=${redisConfig.port}, tls=${redisConfig.tls || false}`);
    } else {
      console.warn('Failed to parse REDIS_URL, falling back to individual env vars');
      // Fall back to individual env vars if REDIS_URL is invalid
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      };
    }
  } else {
    console.log('REDIS_URL not found, using individual environment variables');
    // Use individual environment variables
    redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };
    console.log(`Redis config: host=${redisConfig.host}, port=${redisConfig.port}`);
  }

  return {
    ...redisConfig,
    ttl: 3600, // 1 hour default TTL
  };
});

