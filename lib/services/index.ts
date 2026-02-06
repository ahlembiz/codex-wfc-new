// Export all services
export { getToolService, ToolService } from './toolService';
export type { ToolMatch, ToolFilters } from './toolService';

export { getToolMatchingService, ToolMatchingService } from './toolMatchingService';
export { getToolIntegrationService, ToolIntegrationService } from './toolIntegrationService';
export type { IntegrationWithQuality, ToolIntegrationScore } from './toolIntegrationService';

export { getRedundancyService, RedundancyService } from './redundancyService';
export type { RedundancyPair, RedundancyAnalysis } from './redundancyService';

export { getReplacementService, ReplacementService } from './replacementService';
export type { ReplacementSuggestion, ReplacementContext } from './replacementService';

export { getBundleService, BundleService } from './bundleService';
export type { BundleWithTools, BundleFilters } from './bundleService';

export { getPhaseRecommendationService, PhaseRecommendationService } from './phaseRecommendationService';
export type { PhaseRecommendation, PhaseToolMatrix } from './phaseRecommendationService';

export { getCacheService, CacheService } from './cacheService';
