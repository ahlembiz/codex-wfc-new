import { prisma } from '../db';
import { getCacheService } from './cacheService';
import type {
  Tool,
  ToolCategory,
  Complexity,
  PricingTier,
  TeamSize,
  Stage,
  TechSavviness,
  Prisma,
} from '@prisma/client';

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
