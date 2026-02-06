import { prisma } from '../db';
import { getCacheService } from './cacheService';
import { computePopularityScore, type PopularitySubScores, POPULARITY_SUB_SCORE_FIELDS } from '../utils/popularityCalculator';
import { getToolMatchingService } from './toolMatchingService';
import { getToolIntegrationService } from './toolIntegrationService';
import type {
  Tool,
  ToolCategory,
  IntegrationQuality,
  Complexity,
  PricingTier,
  TeamSize,
  Stage,
  TechSavviness,
  Prisma,
} from '@prisma/client';
import type { CreateToolInput, UpdateToolInput, ToolFilters } from '../../types';

// Re-export types from extracted services for backward compatibility
export type { ToolMatch } from './toolMatchingService';
export type { IntegrationWithQuality, ToolIntegrationScore } from './toolIntegrationService';

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
      where.category = filters.category as ToolCategory;
    }

    if (filters.complexity) {
      where.complexity = filters.complexity as Complexity;
    }

    if (filters.pricingTier) {
      where.typicalPricingTier = filters.pricingTier as PricingTier;
    }

    if (filters.maxCostPerUser !== undefined) {
      where.OR = [
        { estimatedCostPerUser: { lte: filters.maxCostPerUser } },
        { estimatedCostPerUser: null },
        { hasFreeForever: true },
      ];
    }

    if (filters.teamSize) {
      where.bestForTeamSize = { has: filters.teamSize as TeamSize };
    }

    if (filters.stage) {
      where.bestForStage = { has: filters.stage as Stage };
    }

    if (filters.techSavviness) {
      where.bestForTechSavviness = { has: filters.techSavviness as TechSavviness };
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
  // Fuzzy Matching (delegates to ToolMatchingService)
  // ============================================

  /**
   * Match user-provided tool names to canonical tool IDs
   */
  async matchToolNames(names: string[]) {
    const allTools = await this.getAllTools();
    return getToolMatchingService().matchToolNames(names, allTools);
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
  // Integration Queries (delegates to ToolIntegrationService)
  // ============================================

  private get integrationService() {
    return getToolIntegrationService();
  }

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

  async getIntegrationsWithQuality(toolId: string) {
    return this.integrationService.getIntegrationsWithQuality(toolId);
  }

  async getAllIntegrationsForTool(toolId: string) {
    return this.integrationService.getAllIntegrationsForTool(toolId);
  }

  async calculateIntegrationScore(candidateToolId: string, selectedToolIds: string[]) {
    return this.integrationService.calculateIntegrationScore(candidateToolId, selectedToolIds);
  }

  async getWellIntegratedTools(
    selectedToolIds: string[],
    options: {
      minQuality?: IntegrationQuality;
      category?: ToolCategory;
      excludeToolIds?: string[];
      limit?: number;
    } = {}
  ) {
    const allTools = await this.getAllTools();
    return this.integrationService.getWellIntegratedTools(selectedToolIds, allTools, options);
  }

  async findBestIntegratingToolForCategory(
    category: ToolCategory,
    selectedToolIds: string[],
    weights = { integration: 0.5, popularity: 0.5 }
  ) {
    const categoryTools = await this.getToolsByCategory(category);
    return this.integrationService.findBestIntegratingToolForCategory(
      category, categoryTools, selectedToolIds, weights
    );
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

export type { ToolFilters } from '../../types';

export default getToolService;
