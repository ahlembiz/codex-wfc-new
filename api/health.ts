import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../lib/db';
import { getRedis } from '../lib/redis';
import { createApiHandler } from '../lib/middleware/apiHandler';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    cache: 'connected' | 'disconnected' | 'error';
  };
  version: string;
}

export default createApiHandler({
  methods: ['GET'],
  async handler(_req: VercelRequest, res: VercelResponse) {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        cache: 'disconnected',
      },
      version: '1.0.0',
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.services.database = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
      healthStatus.services.database = 'error';
      healthStatus.status = 'degraded';
    }

    // Check Redis
    try {
      const redis = getRedis();
      await redis.ping();
      healthStatus.services.cache = 'connected';
    } catch (error) {
      console.error('Redis health check failed:', error);
      healthStatus.services.cache = 'error';
      healthStatus.status = 'degraded';
    }

    // If both services are down, mark as unhealthy
    if (
      healthStatus.services.database === 'error' &&
      healthStatus.services.cache === 'error'
    ) {
      healthStatus.status = 'unhealthy';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  },
});
