import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockTool } from '../../test/factories';
import type { TechSavviness, AutomationLevel, ConnectorType, SetupDifficulty, WorkflowPhase } from '@prisma/client';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    toolPhaseCapability: { findMany: vi.fn() },
    automationRecipe: { findMany: vi.fn() },
    workflowBucket: { findMany: vi.fn() },
  },
}));

vi.mock('../../providers/aiProvider', () => ({
  generateText: vi.fn().mockResolvedValue('AI-generated fallback text'),
  AI_MODELS: { DEFAULT: 'test-model' },
}));

import { prisma } from '../../db';
import { WorkflowIntelligenceService } from '../workflowIntelligenceService';

// Helper to create a mock capability
function createMockCapability(overrides: Record<string, any> = {}) {
  return {
    id: 'cap-1',
    toolId: 'tool-notion',
    bucketId: 'bucket-1',
    featureName: 'Notion AI Writer',
    aiAction: 'Generate PRD drafts from templates',
    humanAction: 'Review and refine spec',
    artifact: 'Complete PRD',
    automationLevel: 'ASSISTED' as AutomationLevel,
    philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'],
    techSavviness: ['NEWBIE', 'DECENT', 'NINJA'] as TechSavviness[],
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    bucket: {
      id: 'bucket-1',
      phase: 'DECIDE' as WorkflowPhase,
      name: 'Spec Writing',
      slug: 'decide-spec-writing',
      description: 'Write specs',
      displayOrder: 2,
      inputs: [] as string[],
      outputs: [] as string[],
      createdAt: new Date(),
    },
    ...overrides,
  };
}

// Helper to create a mock recipe
function createMockRecipe(overrides: Record<string, any> = {}) {
  return {
    id: 'recipe-1',
    triggerToolId: 'tool-linear',
    triggerEvent: 'Issue moved to In Progress',
    triggerDetail: 'When status changes',
    actionToolId: 'tool-github',
    actionType: 'Create branch',
    actionDetail: 'Auto-create feature branch',
    connectorType: 'NATIVE' as ConnectorType,
    connectorDetail: null,
    phases: ['BUILD'] as WorkflowPhase[],
    philosophyFit: ['Hybrid', 'Auto-Pilot'],
    setupDifficulty: 'PLUG_AND_PLAY' as SetupDifficulty,
    techSavviness: 'DECENT' as TechSavviness,
    timeSavedPerWeek: 1.5,
    humanBehaviorChange: 'Start work from Linear',
    // Research metadata (optional fields)
    confidence: null,
    sourceCount: null,
    sourceTypes: [],
    segmentCoverage: null,
    adoptionCount: null,
    biasFlags: [],
    researchDate: null,
    lastValidated: null,
    researchStatus: null,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    triggerTool: createMockTool({ id: 'tool-linear', name: 'linear', displayName: 'Linear', category: 'PROJECT_MANAGEMENT' }),
    actionTool: createMockTool({ id: 'tool-github', name: 'github', displayName: 'GitHub', category: 'DEVELOPMENT' }),
    ...overrides,
  };
}

describe('WorkflowIntelligenceService', () => {
  let service: WorkflowIntelligenceService;

  const mockFindToolForPhase = vi.fn();
  const mockGetFallbackRoles = vi.fn().mockReturnValue({
    aiRole: 'Generic AI role',
    humanRole: 'Generic human role',
    outcome: 'Generic outcome',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkflowIntelligenceService();
    // Default: return empty buckets (tests can override)
    vi.mocked(prisma.workflowBucket.findMany).mockResolvedValue([]);
  });

  describe('buildIntelligentWorkflow', () => {
    it('should return 7 workflow steps', async () => {
      const notion = createMockTool({ id: 'tool-notion', name: 'notion', displayName: 'Notion', category: 'DOCUMENTATION' });
      mockFindToolForPhase.mockReturnValue(notion);

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([]);

      const result = await service.buildIntelligentWorkflow(
        [notion],
        'Hybrid',
        'Decent',
        mockFindToolForPhase,
        mockGetFallbackRoles,
      );

      expect(result).toHaveLength(7);
      expect(result.map(s => s.phase)).toEqual([
        'Discover', 'Decide', 'Design', 'Build', 'Launch', 'Review', 'Iterate',
      ]);
    });

    it('should use rich data (tier 1) when capabilities exist', async () => {
      const notion = createMockTool({ id: 'tool-notion', name: 'notion', displayName: 'Notion', category: 'DOCUMENTATION' });
      mockFindToolForPhase.mockReturnValue(notion);

      const decideCap = createMockCapability({
        toolId: 'tool-notion',
        bucket: {
          ...createMockCapability().bucket,
          phase: 'DECIDE',
        },
      });

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([decideCap]);
      vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([]);

      const result = await service.buildIntelligentWorkflow(
        [notion],
        'Hybrid',
        'Decent',
        mockFindToolForPhase,
        mockGetFallbackRoles,
      );

      const decideStep = result.find(s => s.phase === 'Decide');
      expect(decideStep?.subSteps).toHaveLength(1);
      expect(decideStep?.subSteps?.[0].featureName).toBe('Notion AI Writer');
      expect(decideStep?.aiAgentRole).toContain('Notion AI Writer');
    });

    it('should fall back to generic roles (tier 2) when no capabilities exist', async () => {
      const notion = createMockTool({ id: 'tool-notion', name: 'notion', displayName: 'Notion', category: 'DOCUMENTATION' });
      mockFindToolForPhase.mockReturnValue(notion);

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([]);

      const result = await service.buildIntelligentWorkflow(
        [notion],
        'Hybrid',
        'Decent',
        mockFindToolForPhase,
        mockGetFallbackRoles,
      );

      const discoverStep = result.find(s => s.phase === 'Discover');
      expect(discoverStep?.aiAgentRole).toBe('Generic AI role');
      expect(discoverStep?.subSteps).toBeUndefined();
    });

    it('should include automation recipes when applicable', async () => {
      const linear = createMockTool({ id: 'tool-linear', name: 'linear', displayName: 'Linear', category: 'PROJECT_MANAGEMENT' });
      const github = createMockTool({ id: 'tool-github', name: 'github', displayName: 'GitHub', category: 'DEVELOPMENT' });
      mockFindToolForPhase.mockReturnValue(linear);

      vi.mocked(prisma.toolPhaseCapability.findMany).mockResolvedValue([]);
      vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([createMockRecipe()]);

      const result = await service.buildIntelligentWorkflow(
        [linear, github],
        'Hybrid',
        'Decent',
        mockFindToolForPhase,
        mockGetFallbackRoles,
      );

      const buildStep = result.find(s => s.phase === 'Build');
      expect(buildStep?.automations).toHaveLength(1);
      expect(buildStep?.automations?.[0].triggerTool).toBe('Linear');
      expect(buildStep?.automations?.[0].actionTool).toBe('GitHub');
    });
  });

  describe('composeChains', () => {
    it('should compose sequential recipes into chains', () => {
      const recipe1 = createMockRecipe({
        id: 'r1',
        triggerToolId: 'tool-linear',
        actionToolId: 'tool-github',
      });
      const recipe2 = createMockRecipe({
        id: 'r2',
        triggerToolId: 'tool-github',
        actionToolId: 'tool-slack',
        triggerTool: createMockTool({ id: 'tool-github', displayName: 'GitHub' }),
        actionTool: createMockTool({ id: 'tool-slack', displayName: 'Slack' }),
        timeSavedPerWeek: 0.5,
      });

      const chains = service.composeChains([recipe1, recipe2]);

      expect(chains).toHaveLength(1);
      expect(chains[0].steps).toHaveLength(2);
      expect(chains[0].totalTimeSaved).toBe(2.0);
      expect(chains[0].name).toContain('Linear');
      expect(chains[0].name).toContain('Slack');
    });

    it('should not chain unrelated recipes', () => {
      const recipe1 = createMockRecipe({ id: 'r1' });
      const recipe2 = createMockRecipe({
        id: 'r2',
        triggerToolId: 'tool-posthog',
        actionToolId: 'tool-slack',
        triggerTool: createMockTool({ id: 'tool-posthog', displayName: 'PostHog' }),
        actionTool: createMockTool({ id: 'tool-slack', displayName: 'Slack' }),
      });

      const chains = service.composeChains([recipe1, recipe2]);
      expect(chains).toHaveLength(0);
    });
  });
});
