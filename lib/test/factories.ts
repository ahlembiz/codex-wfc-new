import type { Tool, ToolCluster } from '@prisma/client';

/**
 * Create a mock Tool with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function createMockTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'tool-1',
    name: 'test-tool',
    displayName: 'Test Tool',
    category: 'DEVELOPMENT',
    aliases: [],
    primaryUseCases: [],
    keyFeatures: [],
    complexity: 'MODERATE',
    typicalPricingTier: 'FREEMIUM',
    estimatedCostPerUser: 10,
    hasFreeForever: false,
    bestForTeamSize: ['SMALL', 'MEDIUM'],
    bestForStage: ['PRE_SEED', 'EARLY_SEED'],
    bestForTechSavviness: ['DECENT'],
    soc2: false,
    hipaa: false,
    gdpr: false,
    euDataResidency: false,
    selfHosted: false,
    airGapped: false,
    hasAiFeatures: false,
    aiFeatureDescription: null,
    websiteUrl: null,
    logoUrl: null,
    popularityScore: 70,
    popularityAdoption: 70,
    popularitySentiment: 70,
    popularityMomentum: 70,
    popularityEcosystem: 70,
    popularityReliability: 70,
    lastVerified: new Date(),
    fundingStage: null,
    foundedYear: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock ToolCluster with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function createMockCluster(overrides: Partial<ToolCluster> = {}): ToolCluster {
  return {
    id: 'cluster-1',
    name: 'Test Cluster',
    description: 'A test cluster for testing',
    synergyStrength: 75,
    synergyType: 'complementary',
    bestForStage: ['PRE_SEED', 'EARLY_SEED'],
    bestForTeamSize: ['SMALL', 'MEDIUM'],
    bestForTechSavviness: ['DECENT'],
    confidence: 70,
    sourceCount: 5,
    sourceTypes: ['reddit', 'youtube_transcript'],
    segmentCoverage: null,
    adoptionCount: null,
    biasFlags: [],
    researchDate: new Date(),
    lastValidated: null,
    status: 'approved',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ToolCluster;
}
