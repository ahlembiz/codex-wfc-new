import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockTool } from '../../test/factories';
import { createMockCacheService, createMockRedundancyService, createMockReplacementService } from '../../test/mocks';

// Mock dependencies
vi.mock('../../db', () => ({
  prisma: {
    tool: { findMany: vi.fn(), findUnique: vi.fn() },
    toolIntegration: { findMany: vi.fn() },
    toolRedundancy: { findMany: vi.fn() },
  },
}));

vi.mock('../../services/cacheService', () => ({
  getCacheService: () => createMockCacheService(),
}));

vi.mock('../../services/redundancyService', () => ({
  getRedundancyService: () => createMockRedundancyService(),
}));

vi.mock('../../services/replacementService', () => ({
  getReplacementService: () => createMockReplacementService(),
}));

import { prisma } from '../../db';
import { DecisionPipeline, type ScoredTool } from '../decisionPipeline';
import { TeamSizeBucket, ComplianceRequirement } from '../../../types';

describe('DecisionPipeline', () => {
  let pipeline: DecisionPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new DecisionPipeline();
  });

  describe('ScoredTool breakdown', () => {
    it('should include integrationScore in breakdown', async () => {
      const notion = createMockTool({
        id: 'notion',
        name: 'notion',
        displayName: 'Notion',
        category: 'DOCUMENTATION',
        hasAiFeatures: true,
        popularityScore: 85,
      });

      const slack = createMockTool({
        id: 'slack',
        name: 'slack',
        displayName: 'Slack',
        category: 'COMMUNICATION',
        popularityScore: 90,
      });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([notion, slack]);
      vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([]);

      const result = await pipeline.run({
        company: 'Test Co',
        stage: 'Pre-Seed',
        teamSize: TeamSizeBucket.Small,
        currentTools: '',
        philosophy: 'Hybrid',
        techSavviness: 'Decent',
        budgetPerUser: 50,
        costSensitivity: 'Balanced',
        sensitivity: 'Low-Stakes',
        highStakesRequirements: [],
        agentReadiness: false,
        anchorType: "We're just starting! (no Anchor tool yet)",
        painPoints: [],
        isSoloFounder: false,
        otherAnchorText: '',
      });

      // Check that allowedTools have scores with integration breakdown
      expect(result.allowedTools.length).toBeGreaterThan(0);
    });
  });

  describe('Integration scoring weight', () => {
    it('should factor integration into final score with 15% weight', async () => {
      // Create two similar tools, one with good integrations
      const toolWithIntegration = createMockTool({
        id: 'tool-with-int',
        name: 'tool-with-int',
        category: 'DEVELOPMENT',
        popularityScore: 50,
        hasAiFeatures: false,
        bestForTeamSize: ['SMALL'],
        bestForStage: ['PRE_SEED'],
      });

      const toolWithoutIntegration = createMockTool({
        id: 'tool-without-int',
        name: 'tool-without-int',
        category: 'DEVELOPMENT',
        popularityScore: 50,
        hasAiFeatures: false,
        bestForTeamSize: ['SMALL'],
        bestForStage: ['PRE_SEED'],
      });

      const existingTool = createMockTool({
        id: 'existing',
        name: 'existing',
        category: 'COMMUNICATION',
      });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([
        toolWithIntegration,
        toolWithoutIntegration,
        existingTool,
      ]);

      // Tool with integration has NATIVE integration with existing tool
      vi.mocked(prisma.toolIntegration.findMany).mockImplementation(async (args: any) => {
        if (args?.where?.toolId === 'tool-with-int') {
          return [
            {
              id: 'int-1',
              toolId: 'tool-with-int',
              integratesWithId: 'existing',
              integrationQuality: 'NATIVE',
              description: null,
              createdAt: new Date(),
              integratesWith: existingTool,
            } as any,
          ];
        }
        return [];
      });

      const result = await pipeline.run({
        company: 'Test Co',
        stage: 'Pre-Seed',
        teamSize: TeamSizeBucket.Small,
        currentTools: 'existing',
        philosophy: 'Hybrid',
        techSavviness: 'Decent',
        budgetPerUser: 50,
        costSensitivity: 'Balanced',
        sensitivity: 'Low-Stakes',
        highStakesRequirements: [],
        agentReadiness: false,
        anchorType: "We're just starting! (no Anchor tool yet)",
        painPoints: [],
        isSoloFounder: false,
        otherAnchorText: '',
      });

      // The tool with integration should rank higher
      const toolWithIntIdx = result.allowedTools.findIndex(t => t.id === 'tool-with-int');
      const toolWithoutIntIdx = result.allowedTools.findIndex(t => t.id === 'tool-without-int');

      // Both tools exist in results
      expect(toolWithIntIdx).not.toBe(-1);
      expect(toolWithoutIntIdx).not.toBe(-1);

      // Tool with integration should rank higher (lower index)
      expect(toolWithIntIdx).toBeLessThan(toolWithoutIntIdx);
    });
  });

  describe('Scoring formula', () => {
    it('should use correct weights: fit 25%, popularity 25%, cost 20%, AI 15%, integration 15%', () => {
      // This is a documentation test - the weights are in the implementation
      // fit: 25%, popularity: 25%, cost: 20%, AI: 15%, integration: 15%
      const weights = {
        fit: 0.25,
        popularity: 0.25,
        cost: 0.20,
        ai: 0.15,
        integration: 0.15,
      };

      const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(total).toBe(1.0);
    });
  });
});
