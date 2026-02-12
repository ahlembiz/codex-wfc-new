import { PrismaClient, Prisma } from '@prisma/client';
import { computePopularityScore, type PopularitySubScores } from '../utils/popularityCalculator';
import { tools, redundancyPairs, replacementRules, bundles, phaseRecommendations } from './seedData';
import { workflowBuckets, toolCapabilities, automationRecipes } from './seedWorkflowData';
import { seedClusters } from './seedResearchData';
import { seedDataPoints } from './seedResearchDataPoints';

const prisma = new PrismaClient();

/**
 * Derive 5 sub-scores from the original hardcoded popularityScore,
 * using category-specific heuristics and age-based adjustments.
 */
function deriveSubScores(
  originalScore: number,
  category: string,
  foundedYear?: number | null,
): PopularitySubScores & { popularityScore: number } {
  const base = originalScore;
  let adoption = base;
  let sentiment = base;
  let momentum = base;
  let ecosystem = base;
  let reliability = base;

  // Category-specific offsets
  switch (category) {
    case 'AI_ASSISTANTS':
    case 'AI_BUILDERS':
      momentum += 10;
      sentiment += 5;
      reliability -= 10;
      break;
    case 'PROJECT_MANAGEMENT':
    case 'COMMUNICATION':
      adoption += 8;
      reliability += 10;
      ecosystem += 8;
      momentum -= 5;
      break;
    case 'DEVELOPMENT':
      ecosystem += 12;
      reliability += 5;
      break;
    case 'DESIGN':
    case 'MEETINGS':
      sentiment += 8;
      break;
    case 'AUTOMATION':
      ecosystem += 10;
      momentum += 5;
      break;
    case 'ANALYTICS':
    case 'GROWTH':
      adoption += 5;
      ecosystem += 5;
      break;
  }

  // Age-based adjustments
  if (foundedYear) {
    const age = 2026 - foundedYear;
    if (age >= 10) {
      reliability += 8;
      momentum -= 5;
    } else if (age <= 3) {
      momentum += 8;
      reliability -= 5;
    }
  }

  // Clamp all to 0-100
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const subScores: PopularitySubScores = {
    popularityAdoption: clamp(adoption),
    popularitySentiment: clamp(sentiment),
    popularityMomentum: clamp(momentum),
    popularityEcosystem: clamp(ecosystem),
    popularityReliability: clamp(reliability),
  };

  return {
    ...subScores,
    popularityScore: computePopularityScore(subScores),
  };
}

// ============================================
// SEED FUNCTION
// ============================================
async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Clear existing data (order matters for foreign keys)
  console.log('  Clearing existing data...');
  await prisma.clusterTool.deleteMany();
  await prisma.toolCluster.deleteMany();
  await prisma.researchDataPoint.deleteMany();
  await prisma.automationRecipe.deleteMany();
  await prisma.toolPhaseCapability.deleteMany();
  await prisma.workflowBucket.deleteMany();
  await prisma.bundleTool.deleteMany();
  await prisma.toolBundle.deleteMany();
  await prisma.phaseToolRecommendation.deleteMany();
  await prisma.toolReplacement.deleteMany();
  await prisma.toolRedundancy.deleteMany();
  await prisma.toolIntegration.deleteMany();
  await prisma.tool.deleteMany();

  // 2. Create tools
  console.log(`  Creating ${tools.length} tools...`);
  const toolMap = new Map<string, string>(); // name -> id

  for (const tool of tools) {
    const derived = deriveSubScores(tool.popularityScore, tool.category, tool.foundedYear);
    const toolData = {
      displayName: tool.displayName,
      category: tool.category as any,
      aliases: tool.aliases,
      primaryUseCases: tool.primaryUseCases,
      keyFeatures: tool.keyFeatures,
      complexity: tool.complexity as any,
      typicalPricingTier: tool.typicalPricingTier as any,
      estimatedCostPerUser: tool.estimatedCostPerUser,
      hasFreeForever: tool.hasFreeForever,
      bestForTeamSize: tool.bestForTeamSize as any[],
      bestForStage: tool.bestForStage as any[],
      bestForTechSavviness: tool.bestForTechSavviness as any[],
      soc2: tool.soc2,
      hipaa: tool.hipaa,
      gdpr: tool.gdpr,
      euDataResidency: tool.euDataResidency,
      selfHosted: tool.selfHosted,
      airGapped: tool.airGapped,
      hasAiFeatures: tool.hasAiFeatures,
      aiFeatureDescription: (tool as any).aiFeatureDescription || null,
      websiteUrl: tool.websiteUrl,
      popularityScore: derived.popularityScore,
      popularityAdoption: derived.popularityAdoption,
      popularitySentiment: derived.popularitySentiment,
      popularityMomentum: derived.popularityMomentum,
      popularityEcosystem: derived.popularityEcosystem,
      popularityReliability: derived.popularityReliability,
      lastVerified: new Date(tool.lastVerified),
      fundingStage: tool.fundingStage,
      foundedYear: tool.foundedYear,
    };
    const created = await prisma.tool.upsert({
      where: { name: tool.name },
      update: toolData,
      create: { name: tool.name, ...toolData },
    });
    toolMap.set(tool.name, created.id);
  }
  console.log(`  ✓ Created ${toolMap.size} tools`);

  // 3. Create redundancy pairs
  console.log(`  Creating ${redundancyPairs.length} redundancy pairs...`);
  let redundancyCount = 0;
  for (const pair of redundancyPairs) {
    const toolAId = toolMap.get(pair.toolA);
    const toolBId = toolMap.get(pair.toolB);
    if (!toolAId || !toolBId) {
      console.warn(`  ⚠ Skipping redundancy: ${pair.toolA} or ${pair.toolB} not found`);
      continue;
    }

    const strength = pair.overlapPercent >= 75 ? 'FULL' : pair.overlapPercent >= 50 ? 'PARTIAL' : 'NICHE';
    const hint = pair.keepPreference === 'A' ? 'PREFER_A'
      : pair.keepPreference === 'B' ? 'PREFER_B'
      : 'CONTEXT_DEPENDENT';

    await prisma.toolRedundancy.create({
      data: {
        toolAId,
        toolBId,
        redundancyStrength: strength as any,
        recommendationHint: hint as any,
        notes: pair.reason,
      },
    });
    redundancyCount++;
  }
  console.log(`  ✓ Created ${redundancyCount} redundancy pairs`);

  // 4. Create replacement rules
  console.log(`  Creating ${replacementRules.length} replacement rules...`);
  let replacementCount = 0;
  for (const rule of replacementRules) {
    const fromToolId = toolMap.get(rule.replaceTool);
    const toToolId = toolMap.get(rule.withTool);
    if (!fromToolId || !toToolId) {
      console.warn(`  ⚠ Skipping replacement: ${rule.replaceTool} or ${rule.withTool} not found`);
      continue;
    }

    // Map context to reason type
    let reasonType: string;
    switch (rule.context) {
      case 'PRICE_FIRST': reasonType = 'COST_SAVINGS'; break;
      case 'OPEN_SOURCE': reasonType = 'COST_SAVINGS'; break;
      case 'AI_NATIVE': reasonType = 'AI_NATIVE'; break;
      case 'CONSOLIDATED': reasonType = 'CONSOLIDATION'; break;
      case 'SELF_HOSTED': reasonType = 'COMPLIANCE'; break;
      case 'SIMPLICITY': reasonType = 'SIMPLER_UX'; break;
      default: reasonType = 'FEATURE_SUPERSET'; break;
    }

    await prisma.toolReplacement.create({
      data: {
        fromToolId,
        toToolId,
        reasonType: reasonType as any,
        reasonText: rule.reason,
        context: rule.context,
      },
    });
    replacementCount++;
  }
  console.log(`  ✓ Created ${replacementCount} replacement rules`);

  // 5. Create bundles
  console.log(`  Creating ${bundles.length} bundles...`);
  for (const bundle of bundles) {
    // Find anchor tool id
    const anchorEntry = bundle.tools.find(t => t.role === 'anchor');
    const anchorToolId = anchorEntry ? toolMap.get(anchorEntry.toolName) : null;

    // Build toolRoles JSON
    const toolRoles: Record<string, string> = {};
    for (const bt of bundle.tools) {
      const tid = toolMap.get(bt.toolName);
      if (tid) {
        toolRoles[tid] = bt.role;
      }
    }

    const createdBundle = await prisma.toolBundle.create({
      data: {
        name: bundle.name,
        description: bundle.description,
        scenarioType: bundle.scenarioType as any,
        toolRoles,
        anchorToolId: anchorToolId || null,
        estimatedMonthlyCost: bundle.estimatedMonthlyCost,
        primaryUseCasesCovered: [],
        bestForTeamSize: [],
        bestForStage: [],
        bestForTechSavviness: [],
      },
    });

    // Create BundleTool entries
    for (const bt of bundle.tools) {
      const toolId = toolMap.get(bt.toolName);
      if (!toolId) {
        console.warn(`  ⚠ Skipping bundle tool: ${bt.toolName} not found`);
        continue;
      }
      await prisma.bundleTool.create({
        data: {
          bundleId: createdBundle.id,
          toolId,
          role: bt.role,
        },
      });
    }
  }
  console.log(`  ✓ Created ${bundles.length} bundles`);

  // 6. Create phase recommendations
  console.log(`  Creating ${phaseRecommendations.length} phase recommendations...`);
  let phaseCount = 0;
  for (const rec of phaseRecommendations) {
    const toolId = toolMap.get(rec.toolName);
    if (!toolId) {
      console.warn(`  ⚠ Skipping phase recommendation: ${rec.toolName} not found`);
      continue;
    }

    await prisma.phaseToolRecommendation.create({
      data: {
        phase: rec.phase as any,
        toolId,
        role: rec.role,
        displayOrder: rec.priority,
        techSavviness: ['NEWBIE', 'DECENT', 'NINJA'] as any[],
      },
    });
    phaseCount++;
  }
  console.log(`  ✓ Created ${phaseCount} phase recommendations`);

  // 7. Create workflow buckets
  console.log(`  Creating ${workflowBuckets.length} workflow buckets...`);
  const bucketMap = new Map<string, string>(); // slug -> id
  for (const bucket of workflowBuckets) {
    const created = await prisma.workflowBucket.create({
      data: {
        phase: bucket.phase as any,
        name: bucket.name,
        slug: bucket.slug,
        description: bucket.description,
        displayOrder: bucket.displayOrder,
        inputs: bucket.inputs,
        outputs: bucket.outputs,
      },
    });
    bucketMap.set(bucket.slug, created.id);
  }
  console.log(`  ✓ Created ${bucketMap.size} workflow buckets`);

  // 8. Create tool phase capabilities
  console.log(`  Creating ${toolCapabilities.length} tool phase capabilities...`);
  let capabilityCount = 0;
  for (const cap of toolCapabilities) {
    const toolId = toolMap.get(cap.toolName);
    const bucketId = bucketMap.get(cap.bucketSlug);
    if (!toolId) {
      console.warn(`  ⚠ Skipping capability: tool "${cap.toolName}" not found`);
      continue;
    }
    if (!bucketId) {
      console.warn(`  ⚠ Skipping capability: bucket "${cap.bucketSlug}" not found`);
      continue;
    }

    await prisma.toolPhaseCapability.create({
      data: {
        toolId,
        bucketId,
        featureName: cap.featureName,
        aiAction: cap.aiAction,
        humanAction: cap.humanAction,
        artifact: cap.artifact,
        automationLevel: cap.automationLevel as any,
        philosophyFit: cap.philosophyFit,
        techSavviness: cap.techSavviness as any[],
        displayOrder: cap.displayOrder,
      },
    });
    capabilityCount++;
  }
  console.log(`  ✓ Created ${capabilityCount} tool phase capabilities`);

  // 9. Create automation recipes
  console.log(`  Creating ${automationRecipes.length} automation recipes...`);
  let recipeCount = 0;
  for (const recipe of automationRecipes) {
    const triggerToolId = toolMap.get(recipe.triggerToolName);
    const actionToolId = toolMap.get(recipe.actionToolName);
    if (!triggerToolId) {
      console.warn(`  ⚠ Skipping recipe: trigger tool "${recipe.triggerToolName}" not found`);
      continue;
    }
    if (!actionToolId) {
      console.warn(`  ⚠ Skipping recipe: action tool "${recipe.actionToolName}" not found`);
      continue;
    }

    await prisma.automationRecipe.create({
      data: {
        triggerToolId,
        triggerEvent: recipe.triggerEvent,
        triggerDetail: recipe.triggerDetail,
        actionToolId,
        actionType: recipe.actionType,
        actionDetail: recipe.actionDetail,
        connectorType: recipe.connectorType as any,
        connectorDetail: recipe.connectorDetail || null,
        phases: recipe.phases as any[],
        philosophyFit: recipe.philosophyFit,
        setupDifficulty: recipe.setupDifficulty as any,
        techSavviness: recipe.techSavviness as any,
        timeSavedPerWeek: recipe.timeSavedPerWeek,
        humanBehaviorChange: recipe.humanBehaviorChange || null,
        confidence: recipe.confidence ?? null,
        sourceCount: recipe.sourceCount ?? null,
        sourceTypes: recipe.sourceTypes ?? [],
        researchStatus: recipe.researchStatus ?? null,
        segmentCoverage: recipe.segmentCoverage as Prisma.InputJsonValue ?? undefined,
      },
    });
    recipeCount++;
  }
  console.log(`  ✓ Created ${recipeCount} automation recipes`);

  // 10. Create tool clusters (research intelligence)
  console.log(`  Creating ${seedClusters.length} tool clusters...`);
  let clusterCount = 0;
  for (const cluster of seedClusters) {
    // Resolve tool names to IDs
    const clusterToolIds: Array<{ toolId: string; role: string }> = [];
    for (const ct of cluster.tools) {
      const toolId = toolMap.get(ct.toolName);
      if (!toolId) {
        console.warn(`  ⚠ Skipping cluster tool: "${ct.toolName}" not found`);
        continue;
      }
      clusterToolIds.push({ toolId, role: ct.role });
    }

    if (clusterToolIds.length < 2) {
      console.warn(`  ⚠ Skipping cluster "${cluster.name}": fewer than 2 tools resolved`);
      continue;
    }

    await prisma.toolCluster.create({
      data: {
        name: cluster.name,
        description: cluster.description,
        synergyStrength: cluster.synergyStrength,
        synergyType: cluster.synergyType,
        bestForStage: cluster.bestForStage as any[],
        bestForTeamSize: cluster.bestForTeamSize as any[],
        bestForTechSavviness: cluster.bestForTechSavviness as any[],
        confidence: cluster.confidence,
        sourceCount: cluster.sourceCount,
        sourceTypes: cluster.sourceTypes,
        biasFlags: cluster.biasFlags,
        status: cluster.status,
        tools: {
          create: clusterToolIds.map(ct => ({
            toolId: ct.toolId,
            role: ct.role,
          })),
        },
      },
    });
    clusterCount++;
  }
  console.log(`  ✓ Created ${clusterCount} tool clusters`);

  // 11. Create research data points
  console.log(`  Creating ${seedDataPoints.length} research data points...`);
  let dataPointCount = 0;
  for (const dp of seedDataPoints) {
    await prisma.researchDataPoint.create({
      data: {
        sourceType: dp.sourceType,
        sourceUrl: dp.sourceUrl ?? null,
        sourceDate: dp.sourceDate ? new Date(dp.sourceDate) : null,
        extractionDate: new Date(dp.extractionDate),
        tools: dp.tools,
        toolCombination: dp.toolCombination,
        automations: dp.automations ?? undefined,
        workflow: dp.workflow ?? null,
        abandonment: dp.abandonment ?? undefined,
        segmentTeamSize: dp.segmentTeamSize ?? null,
        segmentStage: dp.segmentStage ?? null,
        segmentSavviness: dp.segmentSavviness ?? null,
        segmentRole: dp.segmentRole ?? null,
        confidence: dp.confidence,
        isSponsored: dp.isSponsored,
        sponsoredTools: dp.sponsoredTools ?? [],
        hasAffiliate: dp.hasAffiliate,
        affiliateTools: dp.affiliateTools ?? [],
        crossReferences: dp.crossReferences ?? [],
        contradictions: dp.contradictions ?? [],
        status: dp.status,
      },
    });
    dataPointCount++;
  }
  console.log(`  ✓ Created ${dataPointCount} research data points`);

  console.log('✅ Seed complete!');
  console.log(`  Tools: ${toolMap.size}`);
  console.log(`  Redundancy pairs: ${redundancyCount}`);
  console.log(`  Replacement rules: ${replacementCount}`);
  console.log(`  Bundles: ${bundles.length}`);
  console.log(`  Phase recommendations: ${phaseCount}`);
  console.log(`  Workflow buckets: ${bucketMap.size}`);
  console.log(`  Tool capabilities: ${capabilityCount}`);
  console.log(`  Automation recipes: ${recipeCount}`);
  console.log(`  Tool clusters: ${clusterCount}`);
  console.log(`  Research data points: ${dataPointCount}`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
