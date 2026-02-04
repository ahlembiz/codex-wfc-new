import { prisma } from '../db';
import type { Tool, ToolRedundancy, RedundancyStrength, RecommendationHint } from '@prisma/client';

export interface RedundancyPair {
  toolA: Tool;
  toolB: Tool;
  overlappingUseCases: string[];
  overlappingFeatures: string[];
  redundancyStrength: RedundancyStrength;
  recommendationHint: RecommendationHint;
  notes: string | null;
}

export interface RedundancyAnalysis {
  redundantPairs: RedundancyPair[];
  displacementSuggestions: Array<{
    displace: Tool;
    keepOrReplace: Tool;
    reason: string;
  }>;
}

/**
 * RedundancyService - Identify and analyze tool redundancies
 */
export class RedundancyService {
  /**
   * Find all redundancy records for a given tool
   */
  async findRedundanciesForTool(toolId: string): Promise<RedundancyPair[]> {
    const redundancies = await prisma.toolRedundancy.findMany({
      where: {
        OR: [{ toolAId: toolId }, { toolBId: toolId }],
      },
      include: {
        toolA: true,
        toolB: true,
      },
    });

    return redundancies.map(r => ({
      toolA: r.toolA,
      toolB: r.toolB,
      overlappingUseCases: r.overlappingUseCases,
      overlappingFeatures: r.overlappingFeatures,
      redundancyStrength: r.redundancyStrength,
      recommendationHint: r.recommendationHint,
      notes: r.notes,
    }));
  }

  /**
   * Find redundancies between a set of tools
   */
  async findRedundanciesInSet(toolIds: string[]): Promise<RedundancyPair[]> {
    if (toolIds.length < 2) return [];

    const redundancies = await prisma.toolRedundancy.findMany({
      where: {
        AND: [
          { toolAId: { in: toolIds } },
          { toolBId: { in: toolIds } },
        ],
      },
      include: {
        toolA: true,
        toolB: true,
      },
    });

    return redundancies.map(r => ({
      toolA: r.toolA,
      toolB: r.toolB,
      overlappingUseCases: r.overlappingUseCases,
      overlappingFeatures: r.overlappingFeatures,
      redundancyStrength: r.redundancyStrength,
      recommendationHint: r.recommendationHint,
      notes: r.notes,
    }));
  }

  /**
   * Analyze redundancies and suggest which tools to displace
   * Takes into account the recommendation hints from the database
   */
  async analyzeRedundancies(
    userToolIds: string[],
    anchorToolId?: string
  ): Promise<RedundancyAnalysis> {
    const redundantPairs = await this.findRedundanciesInSet(userToolIds);
    const displacementSuggestions: RedundancyAnalysis['displacementSuggestions'] = [];

    for (const pair of redundantPairs) {
      // Skip if redundancy is niche - both tools serve valid purposes
      if (pair.redundancyStrength === 'NICHE') continue;

      let displace: Tool;
      let keepOrReplace: Tool;
      let reason: string;

      // Never suggest displacing the anchor tool
      if (anchorToolId) {
        if (pair.toolA.id === anchorToolId) {
          displace = pair.toolB;
          keepOrReplace = pair.toolA;
          reason = `${pair.toolB.displayName} overlaps with your anchor tool ${pair.toolA.displayName}`;
        } else if (pair.toolB.id === anchorToolId) {
          displace = pair.toolA;
          keepOrReplace = pair.toolB;
          reason = `${pair.toolA.displayName} overlaps with your anchor tool ${pair.toolB.displayName}`;
        } else {
          // Neither is anchor, use recommendation hint
          ({ displace, keepOrReplace, reason } = this.applyRecommendationHint(pair));
        }
      } else {
        // No anchor, use recommendation hint
        ({ displace, keepOrReplace, reason } = this.applyRecommendationHint(pair));
      }

      // Avoid duplicate suggestions
      const alreadySuggested = displacementSuggestions.some(
        s => s.displace.id === displace.id
      );

      if (!alreadySuggested) {
        displacementSuggestions.push({ displace, keepOrReplace, reason });
      }
    }

    return { redundantPairs, displacementSuggestions };
  }

  private applyRecommendationHint(pair: RedundancyPair): {
    displace: Tool;
    keepOrReplace: Tool;
    reason: string;
  } {
    const overlapping = pair.overlappingUseCases.slice(0, 2).join(', ');

    switch (pair.recommendationHint) {
      case 'PREFER_A':
        return {
          displace: pair.toolB,
          keepOrReplace: pair.toolA,
          reason: `${pair.toolB.displayName} overlaps with ${pair.toolA.displayName} for ${overlapping}`,
        };
      case 'PREFER_B':
        return {
          displace: pair.toolA,
          keepOrReplace: pair.toolB,
          reason: `${pair.toolA.displayName} overlaps with ${pair.toolB.displayName} for ${overlapping}`,
        };
      case 'CONTEXT_DEPENDENT':
      default:
        // Default to preferring the one with lower complexity or cost
        const preferA =
          pair.toolA.complexity <= pair.toolB.complexity ||
          (pair.toolA.estimatedCostPerUser ?? 0) < (pair.toolB.estimatedCostPerUser ?? 0);

        if (preferA) {
          return {
            displace: pair.toolB,
            keepOrReplace: pair.toolA,
            reason: `${pair.toolB.displayName} overlaps with ${pair.toolA.displayName} for ${overlapping}`,
          };
        } else {
          return {
            displace: pair.toolA,
            keepOrReplace: pair.toolB,
            reason: `${pair.toolA.displayName} overlaps with ${pair.toolB.displayName} for ${overlapping}`,
          };
        }
    }
  }

  /**
   * Get full redundancy strength between two specific tools
   */
  async getRedundancyBetween(
    toolAId: string,
    toolBId: string
  ): Promise<ToolRedundancy | null> {
    return prisma.toolRedundancy.findFirst({
      where: {
        OR: [
          { toolAId, toolBId },
          { toolAId: toolBId, toolBId: toolAId },
        ],
      },
    });
  }

  /**
   * Get all redundancy records
   */
  async getAllRedundancies(): Promise<RedundancyPair[]> {
    const redundancies = await prisma.toolRedundancy.findMany({
      include: {
        toolA: true,
        toolB: true,
      },
    });

    return redundancies.map(r => ({
      toolA: r.toolA,
      toolB: r.toolB,
      overlappingUseCases: r.overlappingUseCases,
      overlappingFeatures: r.overlappingFeatures,
      redundancyStrength: r.redundancyStrength,
      recommendationHint: r.recommendationHint,
      notes: r.notes,
    }));
  }
}

// Singleton instance
let redundancyServiceInstance: RedundancyService | null = null;

export function getRedundancyService(): RedundancyService {
  if (!redundancyServiceInstance) {
    redundancyServiceInstance = new RedundancyService();
  }
  return redundancyServiceInstance;
}

export default getRedundancyService;
