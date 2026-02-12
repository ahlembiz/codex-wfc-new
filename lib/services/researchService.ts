import { prisma } from '../db';
import { runBiasAudit } from '../research/validators/biasAuditor';
import type { ClusterFuckStats, ClusterFilters, RecipeResearchFilters, ResearchDataFilters } from '../../types';
import type { Prisma } from '@prisma/client';

/**
 * Research Service — CRUD for ToolCluster, ResearchDataPoint,
 * research-enhanced AutomationRecipe queries, stats, and bias audit.
 */
export class ResearchService {

  // ========== ToolCluster CRUD ==========

  async getClusters(filters: ClusterFilters = {}) {
    const { status, confidenceMin, synergyType, page = 1, limit = 50 } = filters;

    const where: Prisma.ToolClusterWhereInput = {};
    if (status) where.status = status;
    if (confidenceMin !== undefined) where.confidence = { gte: confidenceMin };
    if (synergyType) where.synergyType = synergyType;

    const [clusters, total] = await Promise.all([
      prisma.toolCluster.findMany({
        where,
        include: {
          tools: {
            include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
          },
        },
        orderBy: [{ confidence: 'desc' }, { synergyStrength: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.toolCluster.count({ where }),
    ]);

    return { clusters, total, page, limit };
  }

  async getClusterById(id: string) {
    return prisma.toolCluster.findUnique({
      where: { id },
      include: {
        tools: {
          include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
        },
      },
    });
  }

  async createCluster(data: {
    name: string;
    description: string;
    synergyStrength?: number;
    synergyType: string;
    bestForStage?: string[];
    bestForTeamSize?: string[];
    bestForTechSavviness?: string[];
    confidence?: number;
    sourceCount?: number;
    sourceTypes?: string[];
    segmentCoverage?: Prisma.InputJsonValue;
    biasFlags?: string[];
    toolIds?: Array<{ toolId: string; role?: string }>;
  }) {
    const { toolIds, ...clusterData } = data;

    return prisma.toolCluster.create({
      data: {
        ...clusterData,
        bestForStage: (clusterData.bestForStage ?? []) as any,
        bestForTeamSize: (clusterData.bestForTeamSize ?? []) as any,
        bestForTechSavviness: (clusterData.bestForTechSavviness ?? []) as any,
        sourceTypes: clusterData.sourceTypes ?? [],
        biasFlags: clusterData.biasFlags ?? [],
        tools: toolIds ? {
          create: toolIds.map(t => ({ toolId: t.toolId, role: t.role })),
        } : undefined,
      },
      include: {
        tools: {
          include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
        },
      },
    });
  }

  async updateCluster(id: string, data: Partial<{
    name: string;
    description: string;
    synergyStrength: number;
    synergyType: string;
    confidence: number;
    status: string;
    reviewedBy: string;
    reviewNotes: string;
    biasFlags: string[];
    sourceCount: number;
    sourceTypes: string[];
  }>) {
    const updateData: Record<string, unknown> = { ...data };

    if (data.status === 'approved' || data.status === 'rejected') {
      updateData.reviewedAt = new Date();
    }

    return prisma.toolCluster.update({
      where: { id },
      data: updateData,
      include: {
        tools: {
          include: { tool: { select: { id: true, name: true, displayName: true, category: true } } },
        },
      },
    });
  }

  async bulkUpdateClusters(ids: string[], action: string, notes?: string) {
    const updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.reviewedAt = new Date();
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.reviewedAt = new Date();
    } else if (action === 'flag') {
      // Add 'manual_review' to biasFlags — can't easily append in bulk, so update individually
      for (const id of ids) {
        const cluster = await prisma.toolCluster.findUnique({ where: { id }, select: { biasFlags: true } });
        if (cluster && !cluster.biasFlags.includes('manual_review')) {
          await prisma.toolCluster.update({
            where: { id },
            data: { biasFlags: [...cluster.biasFlags, 'manual_review'], reviewNotes: notes },
          });
        }
      }
      return { updated: ids.length };
    }

    if (notes) updateData.reviewNotes = notes;

    const result = await prisma.toolCluster.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return { updated: result.count };
  }

  // ========== AutomationRecipe (research-enhanced) ==========

  async getResearchRecipes(filters: RecipeResearchFilters = {}) {
    const { researchStatus, confidenceMin, connectorType, page = 1, limit = 50 } = filters;

    const where: Prisma.AutomationRecipeWhereInput = {};
    if (researchStatus) where.researchStatus = researchStatus;
    if (confidenceMin !== undefined) where.confidence = { gte: confidenceMin };
    if (connectorType) where.connectorType = connectorType as any;

    const [recipes, total] = await Promise.all([
      prisma.automationRecipe.findMany({
        where,
        include: {
          triggerTool: { select: { id: true, name: true, displayName: true } },
          actionTool: { select: { id: true, name: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.automationRecipe.count({ where }),
    ]);

    return { recipes, total, page, limit };
  }

  async updateRecipeResearch(id: string, data: Partial<{
    confidence: number;
    sourceCount: number;
    sourceTypes: string[];
    segmentCoverage: Record<string, unknown>;
    adoptionCount: number;
    biasFlags: string[];
    researchStatus: string;
    reviewedBy: string;
    reviewNotes: string;
  }>) {
    const updateData: Record<string, unknown> = { ...data };

    if (data.researchStatus === 'approved' || data.researchStatus === 'rejected') {
      updateData.reviewedAt = new Date();
    }

    return prisma.automationRecipe.update({
      where: { id },
      data: updateData,
      include: {
        triggerTool: { select: { id: true, name: true, displayName: true } },
        actionTool: { select: { id: true, name: true, displayName: true } },
      },
    });
  }

  async bulkUpdateRecipes(ids: string[], action: string, notes?: string) {
    const updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      updateData.researchStatus = 'approved';
      updateData.reviewedAt = new Date();
    } else if (action === 'reject') {
      updateData.researchStatus = 'rejected';
      updateData.reviewedAt = new Date();
    }

    if (notes) updateData.reviewNotes = notes;

    const result = await prisma.automationRecipe.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return { updated: result.count };
  }

  // ========== ResearchDataPoint CRUD ==========

  async getDataPoints(filters: ResearchDataFilters = {}) {
    const { sourceType, status, confidenceMin, page = 1, limit = 50 } = filters;

    const where: Prisma.ResearchDataPointWhereInput = {};
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;
    if (confidenceMin !== undefined) where.confidence = { gte: confidenceMin };

    const [dataPoints, total] = await Promise.all([
      prisma.researchDataPoint.findMany({
        where,
        orderBy: { extractionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.researchDataPoint.count({ where }),
    ]);

    return { dataPoints, total, page, limit };
  }

  async createDataPoint(data: {
    sourceType: string;
    sourceUrl?: string;
    sourceDate?: Date;
    tools: string[];
    toolCombination?: boolean;
    automations?: Prisma.InputJsonValue;
    workflow?: string;
    abandonment?: Prisma.InputJsonValue;
    segmentTeamSize?: string;
    segmentStage?: string;
    segmentSavviness?: string;
    segmentRole?: string;
    confidence?: number;
    isSponsored?: boolean;
    sponsoredTools?: string[];
    hasAffiliate?: boolean;
    affiliateTools?: string[];
    crossReferences?: string[];
    contradictions?: string[];
  }) {
    return prisma.researchDataPoint.create({
      data: {
        ...data,
        sponsoredTools: data.sponsoredTools ?? [],
        affiliateTools: data.affiliateTools ?? [],
        crossReferences: data.crossReferences ?? [],
        contradictions: data.contradictions ?? [],
      },
    });
  }

  async updateDataPointStatus(id: string, status: string) {
    return prisma.researchDataPoint.update({
      where: { id },
      data: { status },
    });
  }

  // ========== Stats & Audit ==========

  async getClusterFuckStats(): Promise<ClusterFuckStats> {
    const [
      totalClusters,
      approvedClusters,
      pendingClusters,
      clusterConfidence,
      totalDataPoints,
      researchedRecipes,
      recipeConfidence,
      sourceTypeCounts,
    ] = await Promise.all([
      prisma.toolCluster.count(),
      prisma.toolCluster.count({ where: { status: 'approved' } }),
      prisma.toolCluster.count({ where: { status: 'pending' } }),
      prisma.toolCluster.aggregate({ _avg: { confidence: true } }),
      prisma.researchDataPoint.count(),
      prisma.automationRecipe.count({ where: { researchStatus: { not: null } } }),
      prisma.automationRecipe.aggregate({ _avg: { confidence: true }, where: { confidence: { not: null } } }),
      prisma.researchDataPoint.groupBy({ by: ['sourceType'], _count: true }),
    ]);

    const biasChecks = await runBiasAudit();
    const biasAuditPassCount = biasChecks.filter(c => c.passing).length;

    const sourceTypeDistribution: Record<string, number> = {};
    for (const st of sourceTypeCounts) {
      sourceTypeDistribution[st.sourceType] = st._count;
    }

    return {
      totalClusters,
      approvedClusters,
      pendingClusters,
      totalRecipesWithResearch: researchedRecipes,
      totalDataPoints,
      avgClusterConfidence: Math.round(clusterConfidence._avg.confidence ?? 0),
      avgRecipeConfidence: Math.round(recipeConfidence._avg.confidence ?? 0),
      biasAuditPassCount,
      biasAuditTotalChecks: biasChecks.length,
      sourceTypeDistribution,
    };
  }

  async runBiasAudit() {
    return runBiasAudit();
  }
}

// Singleton
let researchServiceInstance: ResearchService | null = null;

export function getResearchService(): ResearchService {
  if (!researchServiceInstance) {
    researchServiceInstance = new ResearchService();
  }
  return researchServiceInstance;
}
