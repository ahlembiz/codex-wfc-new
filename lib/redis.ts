import { Redis } from '@upstash/redis';

// Upstash Redis client singleton
// Uses REST API, works perfectly with serverless

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing Upstash Redis credentials. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

// Cache key patterns
export const CACHE_KEYS = {
  // Tool name to canonical ID mapping (24h TTL)
  toolMatch: (name: string) => `tool:match:${name.toLowerCase().trim()}`,

  // Full tool list (1h TTL)
  toolsAll: 'tools:all',

  // Diagnosis result cache (15m TTL)
  diagnosis: (hash: string) => `diagnosis:${hash}`,

  // Tool by ID (1h TTL)
  toolById: (id: string) => `tool:id:${id}`,

  // Bundles list (1h TTL)
  bundlesAll: 'bundles:all',
} as const;

// TTL values in seconds
export const CACHE_TTL = {
  toolMatch: 24 * 60 * 60,    // 24 hours
  toolsAll: 60 * 60,          // 1 hour
  diagnosis: 15 * 60,         // 15 minutes
  toolById: 60 * 60,          // 1 hour
  bundlesAll: 60 * 60,        // 1 hour
} as const;

// Helper to create a hash from assessment data for caching
export function hashAssessmentData(data: Record<string, unknown>): string {
  const sorted = JSON.stringify(data, Object.keys(data).sort());
  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export default getRedis;
