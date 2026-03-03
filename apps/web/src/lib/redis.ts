import { createClient } from 'redis';
import { isRedisEnabled } from './runtime-config';

let client: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!isRedisEnabled()) {
    return null;
  }

  if (client) {
    return client;
  }

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Redis max retries exceeded');
        }
        return retries * 50;
      },
    },
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  client.on('connect', () => console.log('Redis Client Connected'));

  await client.connect();
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return null;
    }

    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet(key: string, data: any, ttl = 3600): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    await client.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    await client.del(key);
  } catch (error) {
    console.error('Cache del error:', error);
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) {
      return;
    }

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidate pattern error:', error);
  }
}
