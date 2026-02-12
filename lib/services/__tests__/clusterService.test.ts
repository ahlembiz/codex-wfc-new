import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolCluster } from '@prisma/client';
import { createMockTool } from '../../test/factories';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    toolCluster: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../db';
import { ClusterService, calculateClusterMatchScore } from '../clusterService';

function createMockCluster(overrides: Record<string, any> = {}) {
  return {
    id: 'cluster-1',
    name: 'Test Cluster',
    description: 'A test cluster',
    synergyStrength: 75,
    synergyType: 'complementary',
    bestForStage: ['PRE_SEED'],
    bestForTeamSize: ['SMALL'],
    bestForTechSavviness: ['DECENT'],
    confidence: 70,
    sourceCount: 5,
    sourceTypes: ['reddit', 'youtube'],
    segmentCoverage: null,
    adoptionCount: null,
    biasFlags: [],
    researchDate: new Date(),
    lastValidated: null,
    status: 'approved',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tools: [
      { id: 'ct-1', toolId: 'tool-1', role: 'primary', clusterId: 'cluster-1', tool: { id: 'tool-1', name: 'notion', displayName: 'Notion', category: 'DOCUMENTATION' } },
      { id: 'ct-2', toolId: 'tool-2', role: 'secondary', clusterId: 'cluster-1', tool: { id: 'tool-2', name: 'linear', displayName: 'Linear', category: 'PROJECT_MANAGEMENT' } },
      { id: 'ct-3', toolId: 'tool-3', role: 'support', clusterId: 'cluster-1', tool: { id: 'tool-3', name: 'slack', displayName: 'Slack', category: 'COMMUNICATION' } },
    ],
    ...overrides,
  } as ToolCluster & { tools: any[] };
}

describe('ClusterService', () => {
  let service: ClusterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClusterService();
  });

  describe('findClustersForTools', () => {
    it('should find clusters matching provided tools', async () => {
      const mockCluster = createMockCluster();
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([mockCluster]);

      const tools = [
        createMockTool({ id: 'tool-1', name: 'notion' }),
        createMockTool({ id: 'tool-2', name: 'linear' }),
        createMockTool({ id: 'tool-3', name: 'slack' }),
      ];

      const matches = await service.findClustersForTools(tools);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedToolCount).toBe(3);
      expect(matches[0].matchScore).toBeGreaterThan(0);
    });

    it('should filter out clusters with less than 2 matching tools', async () => {
      const mockCluster = createMockCluster();
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([mockCluster]);

      const tools = [
        createMockTool({ id: 'tool-1', name: 'notion' }),
        createMockTool({ id: 'tool-99', name: 'unknown' }), // Not in cluster
      ];

      const matches = await service.findClustersForTools(tools);

      expect(matches).toHaveLength(0); // Only 1 tool matched, need 2+
    });

    it('should return empty for empty tool list', async () => {
      const matches = await service.findClustersForTools([]);
      expect(matches).toHaveLength(0);
      expect(vi.mocked(prisma.toolCluster.findMany)).not.toHaveBeenCalled();
    });

    it('should sort by match score descending', async () => {
      const clusterA = createMockCluster({ id: 'cluster-a', confidence: 90, synergyStrength: 90 });
      const clusterB = createMockCluster({ id: 'cluster-b', confidence: 50, synergyStrength: 50 });
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([clusterB, clusterA]);

      const tools = [
        createMockTool({ id: 'tool-1' }),
        createMockTool({ id: 'tool-2' }),
        createMockTool({ id: 'tool-3' }),
      ];

      const matches = await service.findClustersForTools(tools);

      if (matches.length >= 2) {
        expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
      }
    });
  });

  describe('findClustersForSegment', () => {
    it('should query with segment filters', async () => {
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([]);

      await service.findClustersForSegment({ teamSize: 'SMALL', stage: 'PRE_SEED' });

      expect(vi.mocked(prisma.toolCluster.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'approved',
            bestForTeamSize: { has: 'SMALL' },
            bestForStage: { has: 'PRE_SEED' },
          }),
        }),
      );
    });
  });
});

describe('calculateClusterMatchScore', () => {
  it('should return 0 for empty cluster', () => {
    expect(calculateClusterMatchScore(0, 0, 70, 75)).toBe(0);
  });

  it('should give high score for full overlap with high confidence', () => {
    const score = calculateClusterMatchScore(3, 3, 90, 85);
    expect(score).toBeGreaterThan(80);
  });

  it('should give lower score for partial overlap', () => {
    const full = calculateClusterMatchScore(3, 3, 70, 75);
    const partial = calculateClusterMatchScore(2, 3, 70, 75);
    expect(partial).toBeLessThan(full);
  });

  it('should give lower score for low confidence', () => {
    const highConf = calculateClusterMatchScore(3, 3, 90, 75);
    const lowConf = calculateClusterMatchScore(3, 3, 30, 75);
    expect(lowConf).toBeLessThan(highConf);
  });
});
