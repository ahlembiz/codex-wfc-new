import { prisma } from '../db';
import type {
  Tool,
  ToolCategory,
  IntegrationQuality,
} from '@prisma/client';

// Integration quality weights for scoring (higher = better integration)
const INTEGRATION_QUALITY_WEIGHTS: Record<IntegrationQuality, number> = {
  NATIVE: 100,
  DEEP: 80,
  BASIC: 50,
  WEBHOOK_ONLY: 30,
  ZAPIER_ONLY: 15,
};

export interface IntegrationWithQuality {
  tool: Tool;
  quality: IntegrationQuality;
  qualityScore: number;
  description: string | null;
}

export interface ToolIntegrationScore {
  tool: Tool;
  integrationScore: number; // 0-100 composite score
  integratingToolCount: number;
  averageQuality: number;
  bestIntegrations: IntegrationWithQuality[];
}

/**
 * ToolIntegrationService - Integration scoring and well-integrated tool queries
 */
export class ToolIntegrationService {

  /**
   * Get integrations for a tool with quality scores
   */
  async getIntegrationsWithQuality(toolId: string): Promise<IntegrationWithQuality[]> {
    const integrations = await prisma.toolIntegration.findMany({
      where: { toolId },
      include: { integratesWith: true },
    });

    return integrations.map(i => ({
      tool: i.integratesWith,
      quality: i.integrationQuality,
      qualityScore: INTEGRATION_QUALITY_WEIGHTS[i.integrationQuality],
      description: i.description,
    }));
  }

  /**
   * Get all integrations involving a tool (both directions)
   */
  async getAllIntegrationsForTool(toolId: string): Promise<IntegrationWithQuality[]> {
    const [outgoing, incoming] = await Promise.all([
      prisma.toolIntegration.findMany({
        where: { toolId },
        include: { integratesWith: true },
      }),
      prisma.toolIntegration.findMany({
        where: { integratesWithId: toolId },
        include: { tool: true },
      }),
    ]);

    const results: IntegrationWithQuality[] = [];

    for (const i of outgoing) {
      results.push({
        tool: i.integratesWith,
        quality: i.integrationQuality,
        qualityScore: INTEGRATION_QUALITY_WEIGHTS[i.integrationQuality],
        description: i.description,
      });
    }

    for (const i of incoming) {
      // Avoid duplicates if bidirectional
      if (!results.some(r => r.tool.id === i.tool.id)) {
        results.push({
          tool: i.tool,
          quality: i.integrationQuality,
          qualityScore: INTEGRATION_QUALITY_WEIGHTS[i.integrationQuality],
          description: i.description,
        });
      }
    }

    return results;
  }

  /**
   * Calculate how well a candidate tool integrates with a set of selected tools.
   * Returns a score from 0-100 based on integration quality and coverage.
   *
   * @param candidateToolId - The tool to evaluate
   * @param selectedToolIds - The set of tools already selected
   * @returns Integration score (0-100)
   */
  async calculateIntegrationScore(
    candidateToolId: string,
    selectedToolIds: string[]
  ): Promise<number> {
    if (selectedToolIds.length === 0) return 50; // Neutral score if no tools selected

    // Get all integrations for the candidate tool
    const integrations = await this.getAllIntegrationsForTool(candidateToolId);

    // Find which selected tools the candidate integrates with
    const matchingIntegrations = integrations.filter(i =>
      selectedToolIds.includes(i.tool.id)
    );

    if (matchingIntegrations.length === 0) return 0;

    // Calculate coverage: what % of selected tools does this integrate with?
    const coverage = matchingIntegrations.length / selectedToolIds.length;

    // Calculate average quality of integrations
    const totalQuality = matchingIntegrations.reduce(
      (sum, i) => sum + i.qualityScore,
      0
    );
    const avgQuality = totalQuality / matchingIntegrations.length;

    // Composite score: 60% coverage, 40% average quality
    const score = coverage * 60 + (avgQuality / 100) * 40;

    return Math.round(Math.min(100, score));
  }

  /**
   * Find tools that integrate well with a given set of tools.
   * Useful for building scenarios around an anchor tool.
   *
   * @param selectedToolIds - Tools already in the stack
   * @param allTools - All available tools
   * @param options - Filtering options
   * @returns Sorted list of tools with integration scores
   */
  async getWellIntegratedTools(
    selectedToolIds: string[],
    allTools: Tool[],
    options: {
      minQuality?: IntegrationQuality;
      category?: ToolCategory;
      excludeToolIds?: string[];
      limit?: number;
    } = {}
  ): Promise<ToolIntegrationScore[]> {
    const { minQuality, category, excludeToolIds = [], limit = 20 } = options;

    // Exclude already selected tools and explicitly excluded ones
    const excludeSet = new Set([...selectedToolIds, ...excludeToolIds]);
    let candidates = allTools.filter(t => !excludeSet.has(t.id));

    // Filter by category if specified
    if (category) {
      candidates = candidates.filter(t => t.category === category);
    }

    // Calculate integration scores for each candidate
    const scored: ToolIntegrationScore[] = [];

    for (const candidate of candidates) {
      const integrations = await this.getAllIntegrationsForTool(candidate.id);

      // Filter to only integrations with selected tools
      let matchingIntegrations = integrations.filter(i =>
        selectedToolIds.includes(i.tool.id)
      );

      // Filter by minimum quality if specified
      if (minQuality) {
        const minQualityScore = INTEGRATION_QUALITY_WEIGHTS[minQuality];
        matchingIntegrations = matchingIntegrations.filter(
          i => i.qualityScore >= minQualityScore
        );
      }

      if (matchingIntegrations.length === 0) continue;

      const totalQuality = matchingIntegrations.reduce(
        (sum, i) => sum + i.qualityScore,
        0
      );
      const avgQuality = totalQuality / matchingIntegrations.length;

      // Coverage-weighted score
      const coverage = matchingIntegrations.length / selectedToolIds.length;
      const integrationScore = Math.round(coverage * 60 + (avgQuality / 100) * 40);

      scored.push({
        tool: candidate,
        integrationScore,
        integratingToolCount: matchingIntegrations.length,
        averageQuality: Math.round(avgQuality),
        bestIntegrations: matchingIntegrations
          .sort((a, b) => b.qualityScore - a.qualityScore)
          .slice(0, 3),
      });
    }

    // Sort by integration score descending
    scored.sort((a, b) => b.integrationScore - a.integrationScore);

    return scored.slice(0, limit);
  }

  /**
   * Find the best tool for a category that integrates well with selected tools.
   * Combines integration score with popularity for ranking.
   *
   * @param category - The category to find a tool for
   * @param categoryTools - Pre-filtered tools for this category
   * @param selectedToolIds - Tools already selected
   * @param weights - Scoring weights (default: 50% integration, 50% popularity)
   */
  async findBestIntegratingToolForCategory(
    category: ToolCategory,
    categoryTools: Tool[],
    selectedToolIds: string[],
    weights = { integration: 0.5, popularity: 0.5 }
  ): Promise<Tool | null> {
    if (categoryTools.length === 0) return null;

    // Exclude already selected tools
    const selectedSet = new Set(selectedToolIds);
    const candidates = categoryTools.filter(t => !selectedSet.has(t.id));

    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = await Promise.all(
      candidates.map(async tool => {
        const integrationScore = await this.calculateIntegrationScore(
          tool.id,
          selectedToolIds
        );
        const popularityScore = tool.popularityScore ?? 50;

        const compositeScore =
          integrationScore * weights.integration +
          popularityScore * weights.popularity;

        return { tool, compositeScore, integrationScore, popularityScore };
      })
    );

    // Sort by composite score
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    return scored[0]?.tool ?? null;
  }

  /**
   * Calculate a synergy bonus for a candidate tool based on how many
   * AutomationRecipe chains it participates in with the existing stack.
   *
   * 3-tool chain: +5, 4-tool chain: +10, 5+ tool chain: +15 (capped)
   */
  async calculateStackSynergyBonus(
    candidateToolId: string,
    existingStackToolIds: string[]
  ): Promise<number> {
    if (existingStackToolIds.length === 0) return 0;

    try {
      // Find automation recipes where the candidate is trigger or action
      const recipes = await prisma.automationRecipe.findMany({
        where: {
          OR: [
            { triggerToolId: candidateToolId },
            { actionToolId: candidateToolId },
          ],
        },
        select: {
          triggerToolId: true,
          actionToolId: true,
        },
      });

      if (recipes.length === 0) return 0;

      // Count how many stack tools are connected via recipes
      const stackSet = new Set(existingStackToolIds);
      const connectedStackTools = new Set<string>();

      for (const recipe of recipes) {
        if (stackSet.has(recipe.triggerToolId)) {
          connectedStackTools.add(recipe.triggerToolId);
        }
        if (stackSet.has(recipe.actionToolId)) {
          connectedStackTools.add(recipe.actionToolId);
        }
      }

      // Chain length = connected stack tools + 1 (the candidate itself)
      const chainLength = connectedStackTools.size + 1;

      if (chainLength >= 5) return 15;
      if (chainLength >= 4) return 10;
      if (chainLength >= 3) return 5;

      return 0;
    } catch (error) {
      console.error('calculateStackSynergyBonus failed:', error);
      return 0;
    }
  }
}

// Singleton instance
let integrationServiceInstance: ToolIntegrationService | null = null;

export function getToolIntegrationService(): ToolIntegrationService {
  if (!integrationServiceInstance) {
    integrationServiceInstance = new ToolIntegrationService();
  }
  return integrationServiceInstance;
}
