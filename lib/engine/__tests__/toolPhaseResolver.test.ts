import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockTool } from '../../test/factories';

// Mock dependencies
vi.mock('../../db', () => ({
  prisma: {
    toolPhaseCapability: { findMany: vi.fn() },
    phaseToolRecommendation: { findMany: vi.fn() },
  },
}));

vi.mock('../../services/phaseRecommendationService', () => ({
  getPhaseRecommendationService: () => ({
    findMultiPhaseTool: vi.fn().mockResolvedValue([]),
    getToolPhases: vi.fn().mockResolvedValue([]),
    getRecommendationsForPhase: vi.fn().mockResolvedValue([]),
  }),
}));

import { prisma } from '../../db';
import { ToolPhaseResolver, DEFAULT_PHASE_CATEGORY_MAP } from '../toolPhaseResolver';

describe('ToolPhaseResolver', () => {
  let resolver: ToolPhaseResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ToolPhaseResolver();
  });

  describe('findMultiPhaseTools', () => {
    it('returns tools covering 3+ phases from ToolPhaseCapability data', async () => {
      const notion = createMockTool({ id: 'notion', name: 'notion', category: 'DOCUMENTATION' });

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([
        { toolId: 'notion', tool: notion, bucket: { phase: 'DISCOVER' } },
        { toolId: 'notion', tool: notion, bucket: { phase: 'DECIDE' } },
        { toolId: 'notion', tool: notion, bucket: { phase: 'ITERATE' } },
      ] as any);

      const result = await resolver.findMultiPhaseTools(['notion'], 3);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notion');
    });

    it('excludes tools covering fewer than minPhases', async () => {
      const github = createMockTool({ id: 'github', name: 'github', category: 'DEVELOPMENT' });

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([
        { toolId: 'github', tool: github, bucket: { phase: 'BUILD' } },
        { toolId: 'github', tool: github, bucket: { phase: 'LAUNCH' } },
      ] as any);

      const result = await resolver.findMultiPhaseTools(['github'], 3);
      expect(result).toHaveLength(0);
    });

    it('returns empty array and falls back gracefully when no data exists', async () => {
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);

      const result = await resolver.findMultiPhaseTools(['notion'], 3);
      expect(result).toHaveLength(0);
    });
  });

  describe('getPhaseCategoryMap', () => {
    it('returns DEFAULT_PHASE_CATEGORY_MAP when no ToolPhaseCapability data', async () => {
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);

      const result = await resolver.getPhaseCategoryMap();
      expect(result).toEqual(DEFAULT_PHASE_CATEGORY_MAP);
    });

    it('returns data-driven map ordered by frequency when data exists', async () => {
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([
        { tool: { category: 'AI_ASSISTANTS' }, bucket: { phase: 'DISCOVER' } },
        { tool: { category: 'AI_ASSISTANTS' }, bucket: { phase: 'DISCOVER' } },
        { tool: { category: 'AI_ASSISTANTS' }, bucket: { phase: 'DISCOVER' } },
        { tool: { category: 'DOCUMENTATION' }, bucket: { phase: 'DISCOVER' } },
      ] as any);

      const result = await resolver.getPhaseCategoryMap();
      // AI_ASSISTANTS has more entries → should come first for Discover
      const discoverCategories = result['Discover'];
      expect(discoverCategories[0]).toBe('AI_ASSISTANTS');
      expect(discoverCategories).toContain('DOCUMENTATION');
    });

    it('uses fallback for phases with no data', async () => {
      // Only Discover has data
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([
        { tool: { category: 'DOCUMENTATION' }, bucket: { phase: 'DISCOVER' } },
      ] as any);

      const result = await resolver.getPhaseCategoryMap();
      // Build phase should use default since no data
      expect(result['Build']).toEqual(DEFAULT_PHASE_CATEGORY_MAP['Build']);
    });
  });

  describe('getToolPhaseCoverage', () => {
    it('returns phases from ToolPhaseCapability data', async () => {
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([
        { bucket: { phase: 'DISCOVER' } },
        { bucket: { phase: 'DECIDE' } },
        { bucket: { phase: 'DISCOVER' } }, // duplicate phase
      ] as any);

      const result = await resolver.getToolPhaseCoverage('notion');
      expect(result).toContain('Discover');
      expect(result).toContain('Decide');
      expect(result).toHaveLength(2); // deduped
    });

    it('returns empty array when no data exists', async () => {
      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);

      const result = await resolver.getToolPhaseCoverage('unknown-tool');
      expect(result).toEqual([]);
    });
  });
});
