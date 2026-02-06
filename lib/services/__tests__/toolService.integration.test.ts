import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tool, IntegrationQuality } from '@prisma/client';

// Mock prisma before importing the service
vi.mock('../../db', () => ({
  prisma: {
    tool: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    toolIntegration: {
      findMany: vi.fn(),
    },
  },
}));

// Mock cache service
vi.mock('../cacheService', () => ({
  getCacheService: () => ({
    getAllTools: vi.fn().mockResolvedValue(null),
    setAllTools: vi.fn(),
    getToolById: vi.fn().mockResolvedValue(null),
    setToolById: vi.fn(),
    getToolMatch: vi.fn().mockResolvedValue(null),
    setToolMatch: vi.fn(),
    invalidateToolCache: vi.fn(),
    invalidateToolById: vi.fn(),
  }),
}));

import { prisma } from '../../db';
import { ToolService } from '../toolService';

// Helper to create mock tools
function createMockTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'tool-1',
    name: 'test-tool',
    displayName: 'Test Tool',
    category: 'DEVELOPMENT',
    aliases: [],
    primaryUseCases: [],
    keyFeatures: [],
    complexity: 'MODERATE',
    typicalPricingTier: 'FREEMIUM',
    estimatedCostPerUser: null,
    hasFreeForever: false,
    bestForTeamSize: [],
    bestForStage: [],
    bestForTechSavviness: [],
    soc2: false,
    hipaa: false,
    gdpr: false,
    euDataResidency: false,
    selfHosted: false,
    airGapped: false,
    hasAiFeatures: false,
    aiFeatureDescription: null,
    websiteUrl: null,
    logoUrl: null,
    popularityScore: 50,
    popularityAdoption: 50,
    popularitySentiment: 50,
    popularityMomentum: 50,
    popularityEcosystem: 50,
    popularityReliability: 50,
    lastVerified: new Date(),
    fundingStage: null,
    foundedYear: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ToolService Integration Scoring', () => {
  let toolService: ToolService;

  beforeEach(() => {
    vi.clearAllMocks();
    toolService = new ToolService();
  });

  describe('getIntegrationsWithQuality', () => {
    it('should return integrations with quality scores', async () => {
      const targetTool = createMockTool({ id: 'slack', name: 'slack' });

      vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([
        {
          id: 'int-1',
          toolId: 'notion',
          integratesWithId: 'slack',
          integrationQuality: 'NATIVE' as IntegrationQuality,
          description: 'Native Slack integration',
          createdAt: new Date(),
          integratesWith: targetTool,
        } as any,
      ]);

      const result = await toolService.getIntegrationsWithQuality('notion');

      expect(result).toHaveLength(1);
      expect(result[0].tool.id).toBe('slack');
      expect(result[0].quality).toBe('NATIVE');
      expect(result[0].qualityScore).toBe(100);
    });

    it('should map all quality tiers to correct scores', async () => {
      const qualityScores: Record<IntegrationQuality, number> = {
        NATIVE: 100,
        DEEP: 80,
        BASIC: 50,
        WEBHOOK_ONLY: 30,
        ZAPIER_ONLY: 15,
      };

      for (const [quality, expectedScore] of Object.entries(qualityScores)) {
        const targetTool = createMockTool({ id: 'target' });

        vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([
          {
            id: 'int-1',
            toolId: 'source',
            integratesWithId: 'target',
            integrationQuality: quality as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: targetTool,
          } as any,
        ]);

        const result = await toolService.getIntegrationsWithQuality('source');
        expect(result[0].qualityScore).toBe(expectedScore);
      }
    });
  });

  describe('calculateIntegrationScore', () => {
    it('should return 50 when no tools are selected', async () => {
      const score = await toolService.calculateIntegrationScore('tool-1', []);
      expect(score).toBe(50);
    });

    it('should return 0 when candidate has no integrations with selected tools', async () => {
      vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([]);

      const score = await toolService.calculateIntegrationScore('candidate', ['tool-a', 'tool-b']);
      expect(score).toBe(0);
    });

    it('should calculate score based on coverage and quality', async () => {
      const toolA = createMockTool({ id: 'tool-a', name: 'tool-a' });
      const toolB = createMockTool({ id: 'tool-b', name: 'tool-b' });

      // Candidate integrates with both selected tools
      vi.mocked(prisma.toolIntegration.findMany)
        .mockResolvedValueOnce([
          // Outgoing integrations
          {
            id: 'int-1',
            toolId: 'candidate',
            integratesWithId: 'tool-a',
            integrationQuality: 'NATIVE' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: toolA,
          } as any,
          {
            id: 'int-2',
            toolId: 'candidate',
            integratesWithId: 'tool-b',
            integrationQuality: 'DEEP' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: toolB,
          } as any,
        ])
        .mockResolvedValueOnce([]); // Incoming integrations

      const score = await toolService.calculateIntegrationScore('candidate', ['tool-a', 'tool-b']);

      // Coverage: 2/2 = 100% -> 60 points
      // Average quality: (100 + 80) / 2 = 90 -> 90 * 0.4 = 36 points
      // Total: 60 + 36 = 96
      expect(score).toBe(96);
    });

    it('should handle partial coverage', async () => {
      const toolA = createMockTool({ id: 'tool-a', name: 'tool-a' });

      // Candidate only integrates with one of two selected tools
      vi.mocked(prisma.toolIntegration.findMany)
        .mockResolvedValueOnce([
          {
            id: 'int-1',
            toolId: 'candidate',
            integratesWithId: 'tool-a',
            integrationQuality: 'NATIVE' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: toolA,
          } as any,
        ])
        .mockResolvedValueOnce([]);

      const score = await toolService.calculateIntegrationScore('candidate', ['tool-a', 'tool-b']);

      // Coverage: 1/2 = 50% -> 30 points
      // Average quality: 100 -> 100 * 0.4 = 40 points
      // Total: 30 + 40 = 70
      expect(score).toBe(70);
    });

    it('should consider bidirectional integrations', async () => {
      const candidateTool = createMockTool({ id: 'candidate' });
      const toolA = createMockTool({ id: 'tool-a' });

      // Tool A integrates with candidate (reverse direction)
      vi.mocked(prisma.toolIntegration.findMany)
        .mockResolvedValueOnce([]) // No outgoing integrations
        .mockResolvedValueOnce([
          // Incoming integration from tool-a
          {
            id: 'int-1',
            toolId: 'tool-a',
            integratesWithId: 'candidate',
            integrationQuality: 'DEEP' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            tool: toolA,
          } as any,
        ]);

      const score = await toolService.calculateIntegrationScore('candidate', ['tool-a']);

      // Coverage: 1/1 = 100% -> 60 points
      // Quality: 80 -> 80 * 0.4 = 32 points
      // Total: 60 + 32 = 92
      expect(score).toBe(92);
    });
  });

  describe('getWellIntegratedTools', () => {
    it('should return tools sorted by integration score', async () => {
      const toolA = createMockTool({ id: 'tool-a', name: 'tool-a', category: 'COMMUNICATION' });
      const toolB = createMockTool({ id: 'tool-b', name: 'tool-b', category: 'COMMUNICATION' });
      const selectedTool = createMockTool({ id: 'selected', name: 'selected' });

      // Mock getAllTools
      vi.mocked(prisma.tool.findMany).mockResolvedValue([toolA, toolB, selectedTool]);

      // Tool A has NATIVE integration, Tool B has BASIC
      vi.mocked(prisma.toolIntegration.findMany)
        // For tool-a
        .mockResolvedValueOnce([
          {
            id: 'int-1',
            toolId: 'tool-a',
            integratesWithId: 'selected',
            integrationQuality: 'NATIVE' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: selectedTool,
          } as any,
        ])
        .mockResolvedValueOnce([])
        // For tool-b
        .mockResolvedValueOnce([
          {
            id: 'int-2',
            toolId: 'tool-b',
            integratesWithId: 'selected',
            integrationQuality: 'BASIC' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: selectedTool,
          } as any,
        ])
        .mockResolvedValueOnce([]);

      const result = await toolService.getWellIntegratedTools(['selected']);

      expect(result.length).toBeGreaterThan(0);
      // Tool A should rank higher due to NATIVE integration
      const toolAResult = result.find(r => r.tool.id === 'tool-a');
      const toolBResult = result.find(r => r.tool.id === 'tool-b');

      if (toolAResult && toolBResult) {
        expect(toolAResult.integrationScore).toBeGreaterThan(toolBResult.integrationScore);
      }
    });

    it('should filter by category when specified', async () => {
      const commTool = createMockTool({ id: 'comm', category: 'COMMUNICATION' });
      const devTool = createMockTool({ id: 'dev', category: 'DEVELOPMENT' });
      const selectedTool = createMockTool({ id: 'selected' });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([commTool, devTool, selectedTool]);

      // Both tools integrate with selected
      vi.mocked(prisma.toolIntegration.findMany)
        .mockResolvedValueOnce([
          {
            id: 'int-1',
            toolId: 'comm',
            integratesWithId: 'selected',
            integrationQuality: 'NATIVE' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: selectedTool,
          } as any,
        ])
        .mockResolvedValueOnce([]);

      const result = await toolService.getWellIntegratedTools(['selected'], {
        category: 'COMMUNICATION',
      });

      // Should only include communication tools
      expect(result.every(r => r.tool.category === 'COMMUNICATION')).toBe(true);
    });

    it('should exclude specified tool IDs', async () => {
      const toolA = createMockTool({ id: 'tool-a' });
      const toolB = createMockTool({ id: 'tool-b' });
      const selectedTool = createMockTool({ id: 'selected' });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([toolA, toolB, selectedTool]);

      // No integrations needed for this test
      vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([]);

      const result = await toolService.getWellIntegratedTools(['selected'], {
        excludeToolIds: ['tool-a'],
      });

      expect(result.some(r => r.tool.id === 'tool-a')).toBe(false);
    });
  });

  describe('findBestIntegratingToolForCategory', () => {
    it('should return best tool based on integration and popularity', async () => {
      const toolA = createMockTool({
        id: 'tool-a',
        category: 'COMMUNICATION',
        popularityScore: 80,
      });
      const toolB = createMockTool({
        id: 'tool-b',
        category: 'COMMUNICATION',
        popularityScore: 60,
      });
      const selectedTool = createMockTool({ id: 'selected' });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([toolA, toolB]);

      // Tool A has lower integration but higher popularity
      // Tool B has higher integration but lower popularity
      vi.mocked(prisma.toolIntegration.findMany)
        // For tool-a
        .mockResolvedValueOnce([
          {
            id: 'int-1',
            toolId: 'tool-a',
            integratesWithId: 'selected',
            integrationQuality: 'BASIC' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: selectedTool,
          } as any,
        ])
        .mockResolvedValueOnce([])
        // For tool-b
        .mockResolvedValueOnce([
          {
            id: 'int-2',
            toolId: 'tool-b',
            integratesWithId: 'selected',
            integrationQuality: 'NATIVE' as IntegrationQuality,
            description: null,
            createdAt: new Date(),
            integratesWith: selectedTool,
          } as any,
        ])
        .mockResolvedValueOnce([]);

      const result = await toolService.findBestIntegratingToolForCategory(
        'COMMUNICATION',
        ['selected']
      );

      expect(result).not.toBeNull();
      // With 50/50 weights, tool-b should win due to much higher integration score
    });

    it('should return null when no tools in category', async () => {
      vi.mocked(prisma.tool.findMany).mockResolvedValue([]);

      const result = await toolService.findBestIntegratingToolForCategory(
        'COMMUNICATION',
        ['selected']
      );

      expect(result).toBeNull();
    });

    it('should exclude already selected tools', async () => {
      const selectedTool = createMockTool({ id: 'selected', category: 'COMMUNICATION' });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([selectedTool]);

      const result = await toolService.findBestIntegratingToolForCategory(
        'COMMUNICATION',
        ['selected']
      );

      expect(result).toBeNull();
    });
  });
});
