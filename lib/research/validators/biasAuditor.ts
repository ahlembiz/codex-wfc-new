import { prisma } from '../../db';
import type { BiasAuditCheck } from '../../../types';

/**
 * Run a 12-check bias audit on the research data.
 * Pure TypeScript with Prisma queries — no AI calls.
 */
export async function runBiasAudit(): Promise<BiasAuditCheck[]> {
  const checks: BiasAuditCheck[] = [];

  // 1. Sponsored content ratio
  const totalDataPoints = await prisma.researchDataPoint.count();
  const sponsoredCount = await prisma.researchDataPoint.count({ where: { isSponsored: true } });
  const sponsoredRatio = totalDataPoints > 0 ? sponsoredCount / totalDataPoints : 0;
  checks.push({
    id: 'sponsored-ratio',
    name: 'Sponsored Content Ratio',
    description: 'Percentage of data points from sponsored content should be below 30%',
    threshold: 0.3,
    currentValue: sponsoredRatio,
    passing: sponsoredRatio <= 0.3,
  });

  // 2. Affiliate link ratio
  const affiliateCount = await prisma.researchDataPoint.count({ where: { hasAffiliate: true } });
  const affiliateRatio = totalDataPoints > 0 ? affiliateCount / totalDataPoints : 0;
  checks.push({
    id: 'affiliate-ratio',
    name: 'Affiliate Link Ratio',
    description: 'Percentage of data points with affiliate links should be below 25%',
    threshold: 0.25,
    currentValue: affiliateRatio,
    passing: affiliateRatio <= 0.25,
  });

  // 3. Source diversity (at least 3 different source types)
  const sourceTypes = await prisma.researchDataPoint.groupBy({ by: ['sourceType'] });
  checks.push({
    id: 'source-diversity',
    name: 'Source Type Diversity',
    description: 'At least 3 different source types should be represented',
    threshold: 3,
    currentValue: sourceTypes.length,
    passing: sourceTypes.length >= 3,
  });

  // 4. Single-source dominance
  const sourceTypeCounts = await prisma.researchDataPoint.groupBy({
    by: ['sourceType'],
    _count: true,
  });
  const maxSourceCount = Math.max(0, ...sourceTypeCounts.map(s => s._count));
  const dominanceRatio = totalDataPoints > 0 ? maxSourceCount / totalDataPoints : 0;
  checks.push({
    id: 'source-dominance',
    name: 'Single Source Dominance',
    description: 'No single source type should exceed 60% of all data points',
    threshold: 0.6,
    currentValue: dominanceRatio,
    passing: dominanceRatio <= 0.6,
  });

  // 5. Cluster confidence average
  const clusters = await prisma.toolCluster.aggregate({ _avg: { confidence: true }, _count: true });
  const avgConfidence = clusters._avg.confidence ?? 0;
  checks.push({
    id: 'avg-cluster-confidence',
    name: 'Average Cluster Confidence',
    description: 'Average cluster confidence should be at least 40',
    threshold: 40,
    currentValue: avgConfidence,
    passing: avgConfidence >= 40,
  });

  // 6. Unreviewed clusters ratio
  const totalClusters = clusters._count;
  const pendingClusters = await prisma.toolCluster.count({ where: { status: 'pending' } });
  const pendingRatio = totalClusters > 0 ? pendingClusters / totalClusters : 0;
  checks.push({
    id: 'pending-clusters',
    name: 'Unreviewed Clusters Ratio',
    description: 'Pending clusters should be below 50% of total',
    threshold: 0.5,
    currentValue: pendingRatio,
    passing: pendingRatio <= 0.5,
  });

  // 7. Data recency (at least some data from last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentDataCount = await prisma.researchDataPoint.count({
    where: { extractionDate: { gte: ninetyDaysAgo } },
  });
  const recentRatio = totalDataPoints > 0 ? recentDataCount / totalDataPoints : 0;
  checks.push({
    id: 'data-recency',
    name: 'Recent Data Availability',
    description: 'At least 20% of data points should be from the last 90 days',
    threshold: 0.2,
    currentValue: recentRatio,
    passing: recentRatio >= 0.2 || totalDataPoints === 0, // Pass if no data yet
  });

  // 8. Tool coverage (clusters should cover multiple categories)
  const clusterToolCategories = await prisma.clusterTool.findMany({
    include: { tool: { select: { category: true } } },
  });
  const uniqueCategories = new Set(clusterToolCategories.map(ct => ct.tool.category));
  checks.push({
    id: 'category-coverage',
    name: 'Tool Category Coverage',
    description: 'Clusters should span at least 3 different tool categories',
    threshold: 3,
    currentValue: uniqueCategories.size,
    passing: uniqueCategories.size >= 3 || totalClusters === 0,
  });

  // 9. Rejected data ratio
  const rejectedCount = await prisma.researchDataPoint.count({ where: { status: 'rejected' } });
  const rejectedRatio = totalDataPoints > 0 ? rejectedCount / totalDataPoints : 0;
  checks.push({
    id: 'rejected-ratio',
    name: 'Rejected Data Ratio',
    description: 'Rejected data points should be below 40% (quality filter working)',
    threshold: 0.4,
    currentValue: rejectedRatio,
    passing: rejectedRatio <= 0.4,
  });

  // 10. Bias flag prevalence in approved clusters
  const approvedClusters = await prisma.toolCluster.findMany({
    where: { status: 'approved' },
    select: { biasFlags: true },
  });
  const approvedWithFlags = approvedClusters.filter(c => c.biasFlags.length > 0).length;
  const flaggedApprovedRatio = approvedClusters.length > 0 ? approvedWithFlags / approvedClusters.length : 0;
  checks.push({
    id: 'approved-bias-flags',
    name: 'Bias Flags in Approved Clusters',
    description: 'Less than 20% of approved clusters should have bias flags',
    threshold: 0.2,
    currentValue: flaggedApprovedRatio,
    passing: flaggedApprovedRatio <= 0.2,
  });

  // 11. Cross-reference coverage
  const validatedPoints = await prisma.researchDataPoint.count({
    where: { NOT: { crossReferences: { isEmpty: true } } },
  });
  const crossRefRatio = totalDataPoints > 0 ? validatedPoints / totalDataPoints : 0;
  checks.push({
    id: 'cross-reference-coverage',
    name: 'Cross-Reference Coverage',
    description: 'At least 30% of data points should have cross-references',
    threshold: 0.3,
    currentValue: crossRefRatio,
    passing: crossRefRatio >= 0.3 || totalDataPoints === 0,
  });

  // 12. Recipe research coverage
  const totalRecipes = await prisma.automationRecipe.count();
  const researchedRecipes = await prisma.automationRecipe.count({
    where: { researchStatus: { not: null } },
  });
  const recipeResearchRatio = totalRecipes > 0 ? researchedRecipes / totalRecipes : 0;
  checks.push({
    id: 'recipe-research-coverage',
    name: 'Recipe Research Coverage',
    description: 'At least 10% of recipes should have research metadata',
    threshold: 0.1,
    currentValue: recipeResearchRatio,
    passing: recipeResearchRatio >= 0.1 || totalRecipes === 0,
  });

  return checks;
}
