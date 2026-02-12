import { prisma } from '../db';
import type { Tool, ToolCluster } from '@prisma/client';

type ClusterWithTools = ToolCluster & {
  tools: Array<{
    id: string;
    toolId: string;
    role: string | null;
    tool: { id: string; name: string; displayName: string; category: string };
  }>;
};

export interface ClusterMatch {
  cluster: ClusterWithTools;
  matchedToolCount: number;
  matchScore: number;
}

/**
 * Cluster Service — engine-facing queries for ToolCluster.
 * Used by ScenarioBuilder to enrich scenarios with cluster metadata.
 */
export class ClusterService {

  /**
   * Find approved clusters that contain any of the given tools.
   * Returns clusters sorted by match score (how many of the cluster's tools
   * are present in the provided tool list).
   */
  async findClustersForTools(tools: Tool[], minConfidence: number = 60): Promise<ClusterMatch[]> {
    if (tools.length === 0) return [];

    const toolIds = tools.map(t => t.id);

    // Find clusters containing at least one of the provided tools
    const clusters = await prisma.toolCluster.findMany({
      where: {
        status: 'approved',
        confidence: { gte: minConfidence },
        tools: {
          some: { toolId: { in: toolIds } },
        },
      },
      include: {
        tools: {
          include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
        },
      },
    });

    // Score each cluster by how many of its tools are in the provided set
    const matches: ClusterMatch[] = clusters.map(cluster => {
      const clusterToolIds = cluster.tools.map(ct => ct.toolId);
      const matchedToolCount = clusterToolIds.filter(id => toolIds.includes(id)).length;
      const matchScore = calculateClusterMatchScore(matchedToolCount, clusterToolIds.length, cluster.confidence, cluster.synergyStrength);
      return { cluster, matchedToolCount, matchScore };
    });

    return matches
      .filter(m => m.matchedToolCount >= 2) // At least 2 tools must match
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Find clusters best suited for a specific segment.
   */
  async findClustersForSegment(params: {
    teamSize?: string;
    stage?: string;
    techSavviness?: string;
  }, minConfidence: number = 60): Promise<ClusterWithTools[]> {
    const where: Record<string, unknown> = {
      status: 'approved',
      confidence: { gte: minConfidence },
    };

    if (params.teamSize) where.bestForTeamSize = { has: params.teamSize };
    if (params.stage) where.bestForStage = { has: params.stage };
    if (params.techSavviness) where.bestForTechSavviness = { has: params.techSavviness };

    return prisma.toolCluster.findMany({
      where,
      include: {
        tools: {
          include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
        },
      },
      orderBy: [{ confidence: 'desc' }, { synergyStrength: 'desc' }],
      take: 10,
    });
  }
}

/**
 * Calculate match score for a cluster against a tool set.
 * Factors: tool overlap ratio, confidence, synergy strength.
 */
export function calculateClusterMatchScore(
  matchedToolCount: number,
  totalClusterTools: number,
  confidence: number,
  synergyStrength: number,
): number {
  if (totalClusterTools === 0) return 0;

  const overlapRatio = matchedToolCount / totalClusterTools;
  const confidenceNorm = confidence / 100;
  const synergyNorm = synergyStrength / 100;

  // Weighted combination: overlap matters most, then confidence, then synergy
  return Math.round(
    (overlapRatio * 50 + confidenceNorm * 30 + synergyNorm * 20),
  );
}

// Singleton
let clusterServiceInstance: ClusterService | null = null;

export function getClusterService(): ClusterService {
  if (!clusterServiceInstance) {
    clusterServiceInstance = new ClusterService();
  }
  return clusterServiceInstance;
}
