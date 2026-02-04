import { getRedis, CACHE_KEYS, CACHE_TTL, hashAssessmentData } from '../redis';
import type { Tool, ToolBundle } from '@prisma/client';

/**
 * CacheService - Redis caching layer for frequently accessed data
 */
export class CacheService {
  private redis = getRedis();

  // ============================================
  // Tool Matching Cache
  // ============================================

  async getToolMatch(name: string): Promise<string | null> {
    const key = CACHE_KEYS.toolMatch(name);
    return this.redis.get<string>(key);
  }

  async setToolMatch(name: string, toolId: string): Promise<void> {
    const key = CACHE_KEYS.toolMatch(name);
    await this.redis.set(key, toolId, { ex: CACHE_TTL.toolMatch });
  }

  async setToolMatchBatch(matches: Array<{ name: string; toolId: string }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const { name, toolId } of matches) {
      const key = CACHE_KEYS.toolMatch(name);
      pipeline.set(key, toolId, { ex: CACHE_TTL.toolMatch });
    }
    await pipeline.exec();
  }

  // ============================================
  // Tool List Cache
  // ============================================

  async getAllTools(): Promise<Tool[] | null> {
    return this.redis.get<Tool[]>(CACHE_KEYS.toolsAll);
  }

  async setAllTools(tools: Tool[]): Promise<void> {
    await this.redis.set(CACHE_KEYS.toolsAll, tools, { ex: CACHE_TTL.toolsAll });
  }

  async getToolById(id: string): Promise<Tool | null> {
    return this.redis.get<Tool>(CACHE_KEYS.toolById(id));
  }

  async setToolById(tool: Tool): Promise<void> {
    await this.redis.set(CACHE_KEYS.toolById(tool.id), tool, { ex: CACHE_TTL.toolById });
  }

  // ============================================
  // Bundle Cache
  // ============================================

  async getAllBundles(): Promise<ToolBundle[] | null> {
    return this.redis.get<ToolBundle[]>(CACHE_KEYS.bundlesAll);
  }

  async setAllBundles(bundles: ToolBundle[]): Promise<void> {
    await this.redis.set(CACHE_KEYS.bundlesAll, bundles, { ex: CACHE_TTL.bundlesAll });
  }

  // ============================================
  // Diagnosis Cache
  // ============================================

  async getDiagnosis<T>(assessmentData: Record<string, unknown>): Promise<T | null> {
    const hash = hashAssessmentData(assessmentData);
    const key = CACHE_KEYS.diagnosis(hash);
    return this.redis.get<T>(key);
  }

  async setDiagnosis<T>(assessmentData: Record<string, unknown>, result: T): Promise<void> {
    const hash = hashAssessmentData(assessmentData);
    const key = CACHE_KEYS.diagnosis(hash);
    await this.redis.set(key, result, { ex: CACHE_TTL.diagnosis });
  }

  // ============================================
  // Cache Invalidation
  // ============================================

  async invalidateToolCache(): Promise<void> {
    // Clear the all-tools cache
    await this.redis.del(CACHE_KEYS.toolsAll);
    // Note: Individual tool caches will expire naturally
    // For a full clear, you'd need to track all keys or use patterns
  }

  async invalidateBundleCache(): Promise<void> {
    await this.redis.del(CACHE_KEYS.bundlesAll);
  }

  async invalidateDiagnosisCache(): Promise<void> {
    // Diagnosis caches have short TTL and include unique hashes
    // For targeted invalidation, you'd need to track keys
    // This is a no-op - they'll expire naturally
  }

  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidateToolCache(),
      this.invalidateBundleCache(),
    ]);
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

export default getCacheService;
