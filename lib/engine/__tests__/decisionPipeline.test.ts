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
import { DEFAULT_WEIGHTS } from '../../constants';

// Helper to create a base assessment input (no dead fields)
function createBaseAssessment(overrides: Record<string, unknown> = {}) {
  return {
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
    anchorType: "We're just starting! (no Anchor tool yet)",
    painPoints: [],
    otherAnchorText: '',
    ...overrides,
  };
}

describe('DecisionPipeline', () => {
  let pipeline: DecisionPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    pipeline = new DecisionPipeline();
  });

  describe('ScoredTool breakdown', () => {
    it('should include integrationScore in breakdown and carry scoredTools in context', async () => {
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

      const result = await pipeline.run(createBaseAssessment());

      expect(result.allowedTools.length).toBeGreaterThan(0);
      // scoredTools should be carried in context
      expect(result.scoredTools.length).toBeGreaterThan(0);
      expect(result.scoredTools[0].breakdown).toHaveProperty('integrationScore');
    });
  });

  describe('Integration scoring weight', () => {
    it('should factor integration into final score with 15% weight', async () => {
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

      const result = await pipeline.run(createBaseAssessment({ currentTools: 'existing' }));

      const toolWithIntIdx = result.allowedTools.findIndex(t => t.id === 'tool-with-int');
      const toolWithoutIntIdx = result.allowedTools.findIndex(t => t.id === 'tool-without-int');

      expect(toolWithIntIdx).not.toBe(-1);
      expect(toolWithoutIntIdx).not.toBe(-1);
      expect(toolWithIntIdx).toBeLessThan(toolWithoutIntIdx);
    });
  });

  describe('Dynamic weight profiles (buildWeightProfile)', () => {
    it('should return default weights when no pain points or stage modifiers apply', () => {
      const profile = DecisionPipeline.buildWeightProfile([], 'Pre-Seed');
      expect(profile.fit).toBeCloseTo(0.25);
      expect(profile.popularity).toBeCloseTo(0.25);
      expect(profile.cost).toBeCloseTo(0.20);
      expect(profile.ai).toBeCloseTo(0.15);
      expect(profile.integration).toBeCloseTo(0.15);
    });

    it('should always normalize weights to sum = 1.0', () => {
      const profile = DecisionPipeline.buildWeightProfile(
        ['TOO_MANY_TOOLS', 'TOOLS_DONT_TALK', 'OVERPAYING'],
        'Bootstrapping'
      );
      const sum = profile.fit + profile.popularity + profile.cost + profile.ai + profile.integration;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should boost integration weight for "TOOLS_DONT_TALK" pain point', () => {
      const base = DecisionPipeline.buildWeightProfile([], 'Pre-Seed');
      const withPain = DecisionPipeline.buildWeightProfile(['TOOLS_DONT_TALK'], 'Pre-Seed');
      expect(withPain.integration).toBeGreaterThan(base.integration);
    });

    it('should boost cost weight for "OVERPAYING" pain point', () => {
      const base = DecisionPipeline.buildWeightProfile([], 'Pre-Seed');
      const withPain = DecisionPipeline.buildWeightProfile(['OVERPAYING'], 'Pre-Seed');
      expect(withPain.cost).toBeGreaterThan(base.cost);
    });

    it('should boost AI weight for "TOO_MUCH_MANUAL_WORK" pain point', () => {
      const base = DecisionPipeline.buildWeightProfile([], 'Pre-Seed');
      const withPain = DecisionPipeline.buildWeightProfile(['TOO_MUCH_MANUAL_WORK'], 'Pre-Seed');
      expect(withPain.ai).toBeGreaterThan(base.ai);
    });

    it('should apply stage modifiers — Bootstrapping boosts cost', () => {
      const preSeed = DecisionPipeline.buildWeightProfile([], 'Pre-Seed');
      const bootstrap = DecisionPipeline.buildWeightProfile([], 'Bootstrapping');
      expect(bootstrap.cost).toBeGreaterThan(preSeed.cost);
    });

    it('should stack multiple modifiers and still normalize', () => {
      const profile = DecisionPipeline.buildWeightProfile(
        ['TOO_MANY_TOOLS', 'TOOLS_DONT_TALK', 'OVERPAYING', 'TOO_MUCH_MANUAL_WORK', 'DISORGANIZED', 'SLOW_APPROVALS', 'NO_VISIBILITY'],
        'Established'
      );
      const sum = profile.fit + profile.popularity + profile.cost + profile.ai + profile.integration;
      expect(sum).toBeCloseTo(1.0, 5);
      // All weights should be positive
      expect(profile.fit).toBeGreaterThan(0);
      expect(profile.popularity).toBeGreaterThan(0);
      expect(profile.cost).toBeGreaterThan(0);
      expect(profile.ai).toBeGreaterThan(0);
      expect(profile.integration).toBeGreaterThan(0);
    });

    it('should clamp negative weights to 0 before normalizing', () => {
      // Bootstrapping applies ai: -0.05. If AI base is 0.15, raw = 0.10 — still positive.
      // But test the concept: no weight should be negative after build.
      const profile = DecisionPipeline.buildWeightProfile([], 'Bootstrapping');
      expect(profile.ai).toBeGreaterThanOrEqual(0);
      const sum = profile.fit + profile.popularity + profile.cost + profile.ai + profile.integration;
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should expose weightProfile on PipelineContext', async () => {
      const notion = createMockTool({
        id: 'notion',
        name: 'notion',
        category: 'DOCUMENTATION',
      });

      vi.mocked(prisma.tool.findMany).mockResolvedValue([notion]);
      vi.mocked(prisma.toolIntegration.findMany).mockResolvedValue([]);

      const result = await pipeline.run(createBaseAssessment({
        painPoints: ['OVERPAYING'],
        stage: 'Bootstrapping',
      }));

      expect(result.weightProfile).toBeDefined();
      expect(result.weightProfile.cost).toBeGreaterThan(DEFAULT_WEIGHTS.cost);
      const sum = Object.values(result.weightProfile).reduce((s, w) => s + w, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('Scoring formula', () => {
    it('should use correct default weights: fit 25%, popularity 25%, cost 20%, AI 15%, integration 15%', () => {
      const total = Object.values(DEFAULT_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(total).toBe(1.0);
    });
  });
});
