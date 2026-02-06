import { prisma } from '../db';
import { getCacheService } from './cacheService';
import { computePopularityScore, type PopularitySubScores, POPULARITY_SUB_SCORE_FIELDS } from '../utils/popularityCalculator';
import type {
  Tool,
  ToolCategory,
  ToolIntegration,
  IntegrationQuality,
  Complexity,
  PricingTier,
  TeamSize,
  Stage,
  TechSavviness,
  Prisma,
} from '@prisma/client';
import type { CreateToolInput, UpdateToolInput } from '../../types';

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

// Types for fuzzy matching
export interface ToolMatch {
  tool: Tool;
  confidence: number; // 0-1, 1 = exact match
  matchedOn: 'name' | 'alias' | 'fuzzy';
}

export interface ToolFilters {
  category?: ToolCategory;
  complexity?: Complexity;
  pricingTier?: PricingTier;
  maxCostPerUser?: number;
  teamSize?: TeamSize;
  stage?: Stage;
  techSavviness?: TechSavviness;
  // Compliance filters
  requireSoc2?: boolean;
  requireHipaa?: boolean;
  requireGdpr?: boolean;
  requireEuDataResidency?: boolean;
  requireSelfHosted?: boolean;
  requireAirGapped?: boolean;
  // AI features
  hasAiFeatures?: boolean;
}

/**
 * ToolService - CRUD and fuzzy matching for tools
 */
export class ToolService {
  private cache = getCacheService();

  // ============================================
  // CRUD Operations
  // ============================================

  async getAllTools(useCache = true): Promise<Tool[]> {
    if (useCache) {
      const cached = await this.cache.getAllTools();
      if (cached) return cached;
    }

    const tools = await prisma.tool.findMany({
      orderBy: { displayName: 'asc' },
    });

    if (useCache) {
      await this.cache.setAllTools(tools);
    }

    return tools;
  }

  async getToolById(id: string, useCache = true): Promise<Tool | null> {
    if (useCache) {
      const cached = await this.cache.getToolById(id);
      if (cached) return cached;
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
    });

    if (tool && useCache) {
      await this.cache.setToolById(tool);
    }

    return tool;
  }

  async getToolByName(name: string): Promise<Tool | null> {
    return prisma.tool.findUnique({
      where: { name: name.toLowerCase() },
    });
  }

  async getToolsByCategory(category: ToolCategory): Promise<Tool[]> {
    return prisma.tool.findMany({
      where: { category },
      orderBy: { displayName: 'asc' },
    });
  }

  /**
   * Create a new tool
   */
  async createTool(data: CreateToolInput): Promise<Tool> {
    // Normalize name to lowercase
    const name = data.name.toLowerCase();

    // Compute popularity score from sub-scores (default to 50 each)
    const popularityScore = computePopularityScore({
      popularityAdoption: data.popularityAdoption ?? 50,
      popularitySentiment: data.popularitySentiment ?? 50,
      popularityMomentum: data.popularityMomentum ?? 50,
      popularityEcosystem: data.popularityEcosystem ?? 50,
      popularityReliability: data.popularityReliability ?? 50,
    });

    const tool = await prisma.tool.create({
      data: {
        name,
        displayName: data.displayName,
        category: data.category as ToolCategory,
        aliases: data.aliases || [],
        primaryUseCases: data.primaryUseCases || [],
        keyFeatures: data.keyFeatures || [],
        complexity: (data.complexity as Complexity) || 'MODERATE',
        typicalPricingTier: (data.typicalPricingTier as PricingTier) || 'FREEMIUM',
        estimatedCostPerUser: data.estimatedCostPerUser ?? null,
        hasFreeForever: data.hasFreeForever ?? false,
        bestForTeamSize: (data.bestForTeamSize as TeamSize[]) || [],
        bestForStage: (data.bestForStage as Stage[]) || [],
        bestForTechSavviness: (data.bestForTechSavviness as TechSavviness[]) || [],
        soc2: data.soc2 ?? false,
        hipaa: data.hipaa ?? false,
        gdpr: data.gdpr ?? false,
        euDataResidency: data.euDataResidency ?? false,
        selfHosted: data.selfHosted ?? false,
        airGapped: data.airGapped ?? false,
        hasAiFeatures: data.hasAiFeatures ?? false,
        aiFeatureDescription: data.aiFeatureDescription ?? null,
        websiteUrl: data.websiteUrl ?? null,
        logoUrl: data.logoUrl ?? null,
        fundingStage: data.fundingStage ?? null,
        foundedYear: data.foundedYear ?? null,
        popularityScore,
        popularityAdoption: data.popularityAdoption ?? 50,
        popularitySentiment: data.popularitySentiment ?? 50,
        popularityMomentum: data.popularityMomentum ?? 50,
        popularityEcosystem: data.popularityEcosystem ?? 50,
        popularityReliability: data.popularityReliability ?? 50,
        lastVerified: new Date(),
      },
    });

    // Invalidate tools cache
    await this.cache.invalidateToolCache();

    return tool;
  }

  /**
   * Update an existing tool
   */
  async updateTool(id: string, data: UpdateToolInput): Promise<Tool> {
    // Build update data with only present fields
    const updateData: Prisma.ToolUpdateInput = {};

    // Handle simple fields
    if (data.name !== undefined) updateData.name = data.name.toLowerCase();
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.category !== undefined) updateData.category = data.category as ToolCategory;
    if (data.aliases !== undefined) updateData.aliases = data.aliases;
    if (data.primaryUseCases !== undefined) updateData.primaryUseCases = data.primaryUseCases;
    if (data.keyFeatures !== undefined) updateData.keyFeatures = data.keyFeatures;
    if (data.complexity !== undefined) updateData.complexity = data.complexity as Complexity;
    if (data.typicalPricingTier !== undefined) updateData.typicalPricingTier = data.typicalPricingTier as PricingTier;
    if (data.estimatedCostPerUser !== undefined) updateData.estimatedCostPerUser = data.estimatedCostPerUser;
    if (data.hasFreeForever !== undefined) updateData.hasFreeForever = data.hasFreeForever;
    if (data.bestForTeamSize !== undefined) updateData.bestForTeamSize = data.bestForTeamSize as TeamSize[];
    if (data.bestForStage !== undefined) updateData.bestForStage = data.bestForStage as Stage[];
    if (data.bestForTechSavviness !== undefined) updateData.bestForTechSavviness = data.bestForTechSavviness as TechSavviness[];
    if (data.soc2 !== undefined) updateData.soc2 = data.soc2;
    if (data.hipaa !== undefined) updateData.hipaa = data.hipaa;
    if (data.gdpr !== undefined) updateData.gdpr = data.gdpr;
    if (data.euDataResidency !== undefined) updateData.euDataResidency = data.euDataResidency;
    if (data.selfHosted !== undefined) updateData.selfHosted = data.selfHosted;
    if (data.airGapped !== undefined) updateData.airGapped = data.airGapped;
    if (data.hasAiFeatures !== undefined) updateData.hasAiFeatures = data.hasAiFeatures;
    if (data.aiFeatureDescription !== undefined) updateData.aiFeatureDescription = data.aiFeatureDescription;
    if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.fundingStage !== undefined) updateData.fundingStage = data.fundingStage;
    if (data.foundedYear !== undefined) updateData.foundedYear = data.foundedYear;

    // Handle popularity sub-scores - if any changed, recompute composite
    const hasPopularityChange = data.popularityAdoption !== undefined ||
      data.popularitySentiment !== undefined ||
      data.popularityMomentum !== undefined ||
      data.popularityEcosystem !== undefined ||
      data.popularityReliability !== undefined;

    if (hasPopularityChange) {
      // Fetch existing tool to merge sub-scores
      const existing = await prisma.tool.findUniqueOrThrow({ where: { id } });

      const mergedScores: PopularitySubScores = {
        popularityAdoption: data.popularityAdoption ?? existing.popularityAdoption,
        popularitySentiment: data.popularitySentiment ?? existing.popularitySentiment,
        popularityMomentum: data.popularityMomentum ?? existing.popularityMomentum,
        popularityEcosystem: data.popularityEcosystem ?? existing.popularityEcosystem,
        popularityReliability: data.popularityReliability ?? existing.popularityReliability,
      };

      updateData.popularityAdoption = mergedScores.popularityAdoption;
      updateData.popularitySentiment = mergedScores.popularitySentiment;
      updateData.popularityMomentum = mergedScores.popularityMomentum;
      updateData.popularityEcosystem = mergedScores.popularityEcosystem;
      updateData.popularityReliability = mergedScores.popularityReliability;
      updateData.popularityScore = computePopularityScore(mergedScores);
    }

    const tool = await prisma.tool.update({
      where: { id },
      data: updateData,
    });

    // Invalidate caches
    await Promise.all([
      this.cache.invalidateToolById(id),
      this.cache.invalidateToolCache(),
    ]);

    return tool;
  }

  /**
   * Delete a tool by ID
   * Note: Must clear ToolBundle.anchorToolId references first (no cascade on that FK)
   */
  async deleteTool(id: string): Promise<Tool> {
    // Clear anchor tool references in bundles (no cascade on this FK)
    await prisma.toolBundle.updateMany({
      where: { anchorToolId: id },
      data: { anchorToolId: null },
    });

    // Delete the tool (other relations cascade automatically)
    const tool = await prisma.tool.delete({
      where: { id },
    });

    // Invalidate caches
    await Promise.all([
      this.cache.invalidateToolById(id),
      this.cache.invalidateToolCache(),
    ]);

    return tool;
  }

  // ============================================
  // Filtered Queries
  // ============================================

  async getFilteredTools(filters: ToolFilters): Promise<Tool[]> {
    const where: Prisma.ToolWhereInput = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.complexity) {
      where.complexity = filters.complexity;
    }

    if (filters.pricingTier) {
      where.typicalPricingTier = filters.pricingTier;
    }

    if (filters.maxCostPerUser !== undefined) {
      where.OR = [
        { estimatedCostPerUser: { lte: filters.maxCostPerUser } },
        { estimatedCostPerUser: null },
        { hasFreeForever: true },
      ];
    }

    if (filters.teamSize) {
      where.bestForTeamSize = { has: filters.teamSize };
    }

    if (filters.stage) {
      where.bestForStage = { has: filters.stage };
    }

    if (filters.techSavviness) {
      where.bestForTechSavviness = { has: filters.techSavviness };
    }

    // Compliance filters
    if (filters.requireSoc2) where.soc2 = true;
    if (filters.requireHipaa) where.hipaa = true;
    if (filters.requireGdpr) where.gdpr = true;
    if (filters.requireEuDataResidency) where.euDataResidency = true;
    if (filters.requireSelfHosted) where.selfHosted = true;
    if (filters.requireAirGapped) where.airGapped = true;

    if (filters.hasAiFeatures !== undefined) {
      where.hasAiFeatures = filters.hasAiFeatures;
    }

    return prisma.tool.findMany({
      where,
      orderBy: { displayName: 'asc' },
    });
  }

  // ============================================
  // Fuzzy Matching
  // ============================================

  /**
   * Match user-provided tool names to canonical tool IDs
   * Uses exact match, alias match, then fuzzy match
   */
  async matchToolNames(names: string[]): Promise<Map<string, ToolMatch | null>> {
    const results = new Map<string, ToolMatch | null>();
    const allTools = await this.getAllTools();

    for (const name of names) {
      const normalized = name.toLowerCase().trim();

      // Check cache first
      const cachedId = await this.cache.getToolMatch(normalized);
      if (cachedId) {
        const tool = allTools.find(t => t.id === cachedId);
        if (tool) {
          results.set(name, { tool, confidence: 1, matchedOn: 'name' });
          continue;
        }
      }

      // Try exact name match
      const exactMatch = allTools.find(t => t.name === normalized);
      if (exactMatch) {
        results.set(name, { tool: exactMatch, confidence: 1, matchedOn: 'name' });
        await this.cache.setToolMatch(normalized, exactMatch.id);
        continue;
      }

      // Try alias match
      const aliasMatch = allTools.find(t =>
        t.aliases.some(alias => alias.toLowerCase() === normalized)
      );
      if (aliasMatch) {
        results.set(name, { tool: aliasMatch, confidence: 0.95, matchedOn: 'alias' });
        await this.cache.setToolMatch(normalized, aliasMatch.id);
        continue;
      }

      // Fuzzy match using Levenshtein distance
      const fuzzyMatch = this.findFuzzyMatch(normalized, allTools);
      if (fuzzyMatch) {
        results.set(name, fuzzyMatch);
        await this.cache.setToolMatch(normalized, fuzzyMatch.tool.id);
      } else {
        results.set(name, null);
      }
    }

    return results;
  }

  /**
   * Find best fuzzy match for a tool name
   */
  private findFuzzyMatch(name: string, tools: Tool[]): ToolMatch | null {
    let bestMatch: ToolMatch | null = null;
    let bestDistance = Infinity;
    const maxDistance = Math.max(2, Math.floor(name.length * 0.3)); // Allow 30% difference

    for (const tool of tools) {
      // Check against canonical name
      const nameDistance = this.levenshteinDistance(name, tool.name);
      if (nameDistance < bestDistance && nameDistance <= maxDistance) {
        bestDistance = nameDistance;
        bestMatch = {
          tool,
          confidence: 1 - (nameDistance / Math.max(name.length, tool.name.length)),
          matchedOn: 'fuzzy',
        };
      }

      // Check against display name
      const displayDistance = this.levenshteinDistance(name, tool.displayName.toLowerCase());
      if (displayDistance < bestDistance && displayDistance <= maxDistance) {
        bestDistance = displayDistance;
        bestMatch = {
          tool,
          confidence: 1 - (displayDistance / Math.max(name.length, tool.displayName.length)),
          matchedOn: 'fuzzy',
        };
      }

      // Check against aliases
      for (const alias of tool.aliases) {
        const aliasDistance = this.levenshteinDistance(name, alias.toLowerCase());
        if (aliasDistance < bestDistance && aliasDistance <= maxDistance) {
          bestDistance = aliasDistance;
          bestMatch = {
            tool,
            confidence: 1 - (aliasDistance / Math.max(name.length, alias.length)),
            matchedOn: 'fuzzy',
          };
        }
      }
    }

    // Only return matches with confidence > 0.6
    if (bestMatch && bestMatch.confidence > 0.6) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Levenshtein distance algorithm for fuzzy matching
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // ============================================
  // Popularity Updates
  // ============================================

  /**
   * Update tool sub-scores and recompute composite popularity.
   * Accepts a partial set of sub-scores; merges with existing values.
   */
  async updateToolPopularity(toolId: string, subScores: PopularitySubScores): Promise<Tool> {
    const existing = await prisma.tool.findUniqueOrThrow({ where: { id: toolId } });

    const merged: PopularitySubScores = {
      popularityAdoption: subScores.popularityAdoption ?? existing.popularityAdoption,
      popularitySentiment: subScores.popularitySentiment ?? existing.popularitySentiment,
      popularityMomentum: subScores.popularityMomentum ?? existing.popularityMomentum,
      popularityEcosystem: subScores.popularityEcosystem ?? existing.popularityEcosystem,
      popularityReliability: subScores.popularityReliability ?? existing.popularityReliability,
    };

    const composite = computePopularityScore(merged);

    const updated = await prisma.tool.update({
      where: { id: toolId },
      data: {
        ...merged,
        popularityScore: composite,
      },
    });

    // Invalidate caches
    await Promise.all([
      this.cache.invalidateToolById(toolId),
      this.cache.invalidateToolCache(),
    ]);

    return updated;
  }

  // ============================================
  // Integration Queries
  // ============================================

  async getToolIntegrations(toolId: string): Promise<Tool[]> {
    const integrations = await prisma.toolIntegration.findMany({
      where: { toolId },
      include: { integratesWith: true },
    });

    return integrations.map(i => i.integratesWith);
  }

  async getToolsWithNativeIntegration(anchorToolId: string): Promise<Tool[]> {
    const integrations = await prisma.toolIntegration.findMany({
      where: {
        toolId: anchorToolId,
        integrationQuality: { in: ['NATIVE', 'DEEP'] },
      },
      include: { integratesWith: true },
    });

    return integrations.map(i => i.integratesWith);
  }

  // ============================================
  // Integration Scoring
  // ============================================

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
    // Coverage is scaled: integrating with all = 60pts
    // Quality is already 0-100, scaled to 40pts
    const score = coverage * 60 + (avgQuality / 100) * 40;

    return Math.round(Math.min(100, score));
  }

  /**
   * Find tools that integrate well with a given set of tools.
   * Useful for building scenarios around an anchor tool.
   *
   * @param selectedToolIds - Tools already in the stack
   * @param options - Filtering options
   * @returns Sorted list of tools with integration scores
   */
  async getWellIntegratedTools(
    selectedToolIds: string[],
    options: {
      minQuality?: IntegrationQuality;
      category?: ToolCategory;
      excludeToolIds?: string[];
      limit?: number;
    } = {}
  ): Promise<ToolIntegrationScore[]> {
    const { minQuality, category, excludeToolIds = [], limit = 20 } = options;

    // Get all candidate tools
    let candidates = await this.getAllTools();

    // Exclude already selected tools and explicitly excluded ones
    const excludeSet = new Set([...selectedToolIds, ...excludeToolIds]);
    candidates = candidates.filter(t => !excludeSet.has(t.id));

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
   * @param selectedToolIds - Tools already selected
   * @param weights - Scoring weights (default: 50% integration, 50% popularity)
   */
  async findBestIntegratingToolForCategory(
    category: ToolCategory,
    selectedToolIds: string[],
    weights = { integration: 0.5, popularity: 0.5 }
  ): Promise<Tool | null> {
    const categoryTools = await this.getToolsByCategory(category);

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
}

// Singleton instance
let toolServiceInstance: ToolService | null = null;

export function getToolService(): ToolService {
  if (!toolServiceInstance) {
    toolServiceInstance = new ToolService();
  }
  return toolServiceInstance;
}

export default getToolService;
