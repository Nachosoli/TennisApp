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
    const parsed = parseRedisUrl(redisUrl);
    if (parsed) {
      redisConfig = parsed;
    } else {
      // Fall back to individual env vars if REDIS_URL is invalid
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      };
    }
  } else {
    // Use individual environment variables
    redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };
  }

  return {
    ...redisConfig,
    ttl: 3600, // 1 hour default TTL
  };
});

