import { prisma } from '../db';
import { getCacheService } from './cacheService';
import type { Tool, ToolBundle, ScenarioType, TeamSize, Stage, TechSavviness } from '@prisma/client';
import type { BundleFilters } from '../../types';

export interface BundleWithTools extends ToolBundle {
  tools: Array<{
    tool: Tool;
    role: string | null;
  }>;
  anchorTool: Tool | null;
}

/**
 * BundleService - Manage pre-configured tool bundles/stacks
 */
export class BundleService {
  private cache = getCacheService();

  /**
   * Get all bundles
   */
  async getAllBundles(useCache = true): Promise<BundleWithTools[]> {
    if (useCache) {
      const cached = await this.cache.getAllBundles();
      if (cached) return cached as BundleWithTools[];
    }

    const bundles = await prisma.toolBundle.findMany({
      include: {
        tools: {
          include: { tool: true },
        },
        anchorTool: true,
      },
      orderBy: { name: 'asc' },
    });

    const result = bundles.map(b => ({
      ...b,
      tools: b.tools.map(bt => ({
        tool: bt.tool,
        role: bt.role,
      })),
    }));

    if (useCache) {
      await this.cache.setAllBundles(result);
    }

    return result;
  }

  /**
   * Get bundle by ID
   */
  async getBundleById(id: string): Promise<BundleWithTools | null> {
    const bundle = await prisma.toolBundle.findUnique({
      where: { id },
      include: {
        tools: {
          include: { tool: true },
        },
        anchorTool: true,
      },
    });

    if (!bundle) return null;

    return {
      ...bundle,
      tools: bundle.tools.map(bt => ({
        tool: bt.tool,
        role: bt.role,
      })),
    };
  }

  /**
   * Get bundles by scenario type
   */
  async getBundlesByScenarioType(scenarioType: ScenarioType): Promise<BundleWithTools[]> {
    const bundles = await prisma.toolBundle.findMany({
      where: { scenarioType },
      include: {
        tools: {
          include: { tool: true },
        },
        anchorTool: true,
      },
      orderBy: { name: 'asc' },
    });

    return bundles.map(b => ({
      ...b,
      tools: b.tools.map(bt => ({
        tool: bt.tool,
        role: bt.role,
      })),
    }));
  }

  /**
   * Get bundles filtered by criteria
   */
  async getFilteredBundles(filters: BundleFilters): Promise<BundleWithTools[]> {
    const where: Record<string, unknown> = {};

    if (filters.scenarioType) {
      where.scenarioType = filters.scenarioType;
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

    if (filters.anchorToolId) {
      where.anchorToolId = filters.anchorToolId;
    }

    if (filters.useCases && filters.useCases.length > 0) {
      where.primaryUseCasesCovered = { hasSome: filters.useCases };
    }

    const bundles = await prisma.toolBundle.findMany({
      where,
      include: {
        tools: {
          include: { tool: true },
        },
        anchorTool: true,
      },
      orderBy: { name: 'asc' },
    });

    return bundles.map(b => ({
      ...b,
      tools: b.tools.map(bt => ({
        tool: bt.tool,
        role: bt.role,
      })),
    }));
  }

  /**
   * Find the best bundle for a given context
   */
  async findBestBundle(
    scenarioType: ScenarioType,
    teamSize: TeamSize,
    stage: Stage,
    techSavviness: TechSavviness,
    anchorToolId?: string
  ): Promise<BundleWithTools | null> {
    // First try to find an exact match with anchor
    if (anchorToolId) {
      const withAnchor = await this.getFilteredBundles({
        scenarioType,
        teamSize,
        stage,
        techSavviness,
        anchorToolId,
      });

      if (withAnchor.length > 0) {
        return withAnchor[0];
      }
    }

    // Try without anchor
    const matches = await this.getFilteredBundles({
      scenarioType,
      teamSize,
      stage,
      techSavviness,
    });

    if (matches.length > 0) {
      return matches[0];
    }

    // Fallback: just scenario type
    const fallback = await this.getBundlesByScenarioType(scenarioType);
    return fallback[0] || null;
  }

  /**
   * Get bundles that include a specific tool
   */
  async getBundlesContainingTool(toolId: string): Promise<BundleWithTools[]> {
    const bundles = await prisma.toolBundle.findMany({
      where: {
        tools: {
          some: { toolId },
        },
      },
      include: {
        tools: {
          include: { tool: true },
        },
        anchorTool: true,
      },
    });

    return bundles.map(b => ({
      ...b,
      tools: b.tools.map(bt => ({
        tool: bt.tool,
        role: bt.role,
      })),
    }));
  }

  /**
   * Calculate total monthly cost for a bundle
   */
  calculateBundleCost(bundle: BundleWithTools, teamSize: number): number {
    let total = 0;

    for (const { tool } of bundle.tools) {
      if (tool.estimatedCostPerUser) {
        total += tool.estimatedCostPerUser * teamSize;
      }
    }

    return total;
  }

  /**
   * Get tool roles from bundle
   */
  getToolRoles(bundle: BundleWithTools): Map<string, string> {
    const roles = new Map<string, string>();

    // From toolRoles JSON
    if (bundle.toolRoles && typeof bundle.toolRoles === 'object') {
      const rolesObj = bundle.toolRoles as Record<string, string>;
      for (const [toolId, role] of Object.entries(rolesObj)) {
        roles.set(toolId, role);
      }
    }

    // From BundleTool entries
    for (const { tool, role } of bundle.tools) {
      if (role && !roles.has(tool.id)) {
        roles.set(tool.id, role);
      }
    }

    return roles;
  }
}

// Singleton instance
let bundleServiceInstance: BundleService | null = null;

export function getBundleService(): BundleService {
  if (!bundleServiceInstance) {
    bundleServiceInstance = new BundleService();
  }
  return bundleServiceInstance;
}

export type { BundleFilters } from '../../types';

export default getBundleService;
