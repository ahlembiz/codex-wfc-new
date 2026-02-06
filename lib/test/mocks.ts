import { vi } from 'vitest';

/**
 * Create a mock CacheService with all methods stubbed.
 */
export function createMockCacheService() {
  return {
    getAllTools: vi.fn().mockResolvedValue(null),
    setAllTools: vi.fn(),
    getToolById: vi.fn().mockResolvedValue(null),
    setToolById: vi.fn(),
    getToolMatch: vi.fn().mockResolvedValue(null),
    setToolMatch: vi.fn(),
    invalidateToolCache: vi.fn(),
    invalidateToolById: vi.fn(),
  };
}

/**
 * Create a mock RedundancyService with all methods stubbed.
 */
export function createMockRedundancyService() {
  return {
    analyzeRedundancies: vi.fn().mockResolvedValue({
      displacementSuggestions: [],
      redundancyPairs: [],
    }),
    findRedundanciesInSet: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Create a mock ReplacementService with all methods stubbed.
 */
export function createMockReplacementService() {
  return {
    findBestReplacement: vi.fn().mockResolvedValue(null),
  };
}
