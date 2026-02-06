import type { CreateToolInput, UpdateToolInput } from '../../types';
import { ValidationError } from './validation';
import {
  VALID_TOOL_CATEGORIES,
  VALID_COMPLEXITIES,
  VALID_PRICING_TIERS,
  VALID_TOOL_TEAM_SIZES,
  VALID_TOOL_STAGES,
  VALID_TOOL_TECH_SAVVINESS,
} from '../constants';

/**
 * Validate a tool creation request
 */
export function validateToolCreate(body: unknown): CreateToolInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required and must be a non-empty string';
  }

  if (!data.displayName || typeof data.displayName !== 'string' || data.displayName.trim() === '') {
    errors.displayName = 'Display name is required and must be a non-empty string';
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.category = 'Category is required';
  } else if (!VALID_TOOL_CATEGORIES.includes(data.category)) {
    errors.category = `Category must be one of: ${VALID_TOOL_CATEGORIES.join(', ')}`;
  }

  // Optional enum fields
  if (data.complexity !== undefined) {
    if (typeof data.complexity !== 'string' || !VALID_COMPLEXITIES.includes(data.complexity)) {
      errors.complexity = `Complexity must be one of: ${VALID_COMPLEXITIES.join(', ')}`;
    }
  }

  if (data.typicalPricingTier !== undefined) {
    if (typeof data.typicalPricingTier !== 'string' || !VALID_PRICING_TIERS.includes(data.typicalPricingTier)) {
      errors.typicalPricingTier = `Pricing tier must be one of: ${VALID_PRICING_TIERS.join(', ')}`;
    }
  }

  // Optional array fields with enum values
  if (data.bestForTeamSize !== undefined) {
    if (!Array.isArray(data.bestForTeamSize)) {
      errors.bestForTeamSize = 'bestForTeamSize must be an array';
    } else {
      const invalid = (data.bestForTeamSize as string[]).filter(v => !VALID_TOOL_TEAM_SIZES.includes(v));
      if (invalid.length > 0) {
        errors.bestForTeamSize = `Invalid team sizes: ${invalid.join(', ')}. Valid: ${VALID_TOOL_TEAM_SIZES.join(', ')}`;
      }
    }
  }

  if (data.bestForStage !== undefined) {
    if (!Array.isArray(data.bestForStage)) {
      errors.bestForStage = 'bestForStage must be an array';
    } else {
      const invalid = (data.bestForStage as string[]).filter(v => !VALID_TOOL_STAGES.includes(v));
      if (invalid.length > 0) {
        errors.bestForStage = `Invalid stages: ${invalid.join(', ')}. Valid: ${VALID_TOOL_STAGES.join(', ')}`;
      }
    }
  }

  if (data.bestForTechSavviness !== undefined) {
    if (!Array.isArray(data.bestForTechSavviness)) {
      errors.bestForTechSavviness = 'bestForTechSavviness must be an array';
    } else {
      const invalid = (data.bestForTechSavviness as string[]).filter(v => !VALID_TOOL_TECH_SAVVINESS.includes(v));
      if (invalid.length > 0) {
        errors.bestForTechSavviness = `Invalid tech savviness: ${invalid.join(', ')}. Valid: ${VALID_TOOL_TECH_SAVVINESS.join(', ')}`;
      }
    }
  }

  // Optional string arrays
  if (data.aliases !== undefined && !Array.isArray(data.aliases)) {
    errors.aliases = 'Aliases must be an array of strings';
  }
  if (data.primaryUseCases !== undefined && !Array.isArray(data.primaryUseCases)) {
    errors.primaryUseCases = 'Primary use cases must be an array of strings';
  }
  if (data.keyFeatures !== undefined && !Array.isArray(data.keyFeatures)) {
    errors.keyFeatures = 'Key features must be an array of strings';
  }

  // Optional number fields
  if (data.estimatedCostPerUser !== undefined && data.estimatedCostPerUser !== null) {
    if (typeof data.estimatedCostPerUser !== 'number' || data.estimatedCostPerUser < 0) {
      errors.estimatedCostPerUser = 'Estimated cost per user must be a non-negative number';
    }
  }

  if (data.foundedYear !== undefined && data.foundedYear !== null) {
    if (typeof data.foundedYear !== 'number' || data.foundedYear < 1900 || data.foundedYear > new Date().getFullYear() + 1) {
      errors.foundedYear = 'Founded year must be a valid year';
    }
  }

  // Popularity sub-scores (0-100)
  const popularityFields = ['popularityAdoption', 'popularitySentiment', 'popularityMomentum', 'popularityEcosystem', 'popularityReliability'];
  for (const field of popularityFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'number' || data[field] < 0 || data[field] > 100) {
        errors[field] = `${field} must be a number between 0 and 100`;
      }
    }
  }

  // Optional boolean fields (just type check)
  const booleanFields = ['hasFreeForever', 'soc2', 'hipaa', 'gdpr', 'euDataResidency', 'selfHosted', 'airGapped', 'hasAiFeatures'];
  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors[field] = `${field} must be a boolean`;
    }
  }

  // Optional string fields (just type check)
  const stringFields = ['aiFeatureDescription', 'websiteUrl', 'logoUrl', 'fundingStage'];
  for (const field of stringFields) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'string') {
      errors[field] = `${field} must be a string`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // Return validated and typed input
  return {
    name: (data.name as string).toLowerCase().trim(),
    displayName: (data.displayName as string).trim(),
    category: data.category as string,
    aliases: data.aliases as string[] | undefined,
    primaryUseCases: data.primaryUseCases as string[] | undefined,
    keyFeatures: data.keyFeatures as string[] | undefined,
    complexity: data.complexity as string | undefined,
    typicalPricingTier: data.typicalPricingTier as string | undefined,
    estimatedCostPerUser: data.estimatedCostPerUser as number | null | undefined,
    hasFreeForever: data.hasFreeForever as boolean | undefined,
    bestForTeamSize: data.bestForTeamSize as string[] | undefined,
    bestForStage: data.bestForStage as string[] | undefined,
    bestForTechSavviness: data.bestForTechSavviness as string[] | undefined,
    soc2: data.soc2 as boolean | undefined,
    hipaa: data.hipaa as boolean | undefined,
    gdpr: data.gdpr as boolean | undefined,
    euDataResidency: data.euDataResidency as boolean | undefined,
    selfHosted: data.selfHosted as boolean | undefined,
    airGapped: data.airGapped as boolean | undefined,
    hasAiFeatures: data.hasAiFeatures as boolean | undefined,
    aiFeatureDescription: data.aiFeatureDescription as string | null | undefined,
    websiteUrl: data.websiteUrl as string | null | undefined,
    logoUrl: data.logoUrl as string | null | undefined,
    fundingStage: data.fundingStage as string | null | undefined,
    foundedYear: data.foundedYear as number | null | undefined,
    popularityAdoption: data.popularityAdoption as number | undefined,
    popularitySentiment: data.popularitySentiment as number | undefined,
    popularityMomentum: data.popularityMomentum as number | undefined,
    popularityEcosystem: data.popularityEcosystem as number | undefined,
    popularityReliability: data.popularityReliability as number | undefined,
  };
}

/**
 * Validate a tool update request (all fields optional)
 */
export function validateToolUpdate(body: unknown): UpdateToolInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // If name is provided, validate it
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.name = 'Name must be a non-empty string';
    }
  }

  // If displayName is provided, validate it
  if (data.displayName !== undefined) {
    if (typeof data.displayName !== 'string' || data.displayName.trim() === '') {
      errors.displayName = 'Display name must be a non-empty string';
    }
  }

  // Optional enum fields
  if (data.category !== undefined) {
    if (typeof data.category !== 'string' || !VALID_TOOL_CATEGORIES.includes(data.category)) {
      errors.category = `Category must be one of: ${VALID_TOOL_CATEGORIES.join(', ')}`;
    }
  }

  if (data.complexity !== undefined) {
    if (typeof data.complexity !== 'string' || !VALID_COMPLEXITIES.includes(data.complexity)) {
      errors.complexity = `Complexity must be one of: ${VALID_COMPLEXITIES.join(', ')}`;
    }
  }

  if (data.typicalPricingTier !== undefined) {
    if (typeof data.typicalPricingTier !== 'string' || !VALID_PRICING_TIERS.includes(data.typicalPricingTier)) {
      errors.typicalPricingTier = `Pricing tier must be one of: ${VALID_PRICING_TIERS.join(', ')}`;
    }
  }

  // Optional array fields with enum values
  if (data.bestForTeamSize !== undefined) {
    if (!Array.isArray(data.bestForTeamSize)) {
      errors.bestForTeamSize = 'bestForTeamSize must be an array';
    } else {
      const invalid = (data.bestForTeamSize as string[]).filter(v => !VALID_TOOL_TEAM_SIZES.includes(v));
      if (invalid.length > 0) {
        errors.bestForTeamSize = `Invalid team sizes: ${invalid.join(', ')}. Valid: ${VALID_TOOL_TEAM_SIZES.join(', ')}`;
      }
    }
  }

  if (data.bestForStage !== undefined) {
    if (!Array.isArray(data.bestForStage)) {
      errors.bestForStage = 'bestForStage must be an array';
    } else {
      const invalid = (data.bestForStage as string[]).filter(v => !VALID_TOOL_STAGES.includes(v));
      if (invalid.length > 0) {
        errors.bestForStage = `Invalid stages: ${invalid.join(', ')}. Valid: ${VALID_TOOL_STAGES.join(', ')}`;
      }
    }
  }

  if (data.bestForTechSavviness !== undefined) {
    if (!Array.isArray(data.bestForTechSavviness)) {
      errors.bestForTechSavviness = 'bestForTechSavviness must be an array';
    } else {
      const invalid = (data.bestForTechSavviness as string[]).filter(v => !VALID_TOOL_TECH_SAVVINESS.includes(v));
      if (invalid.length > 0) {
        errors.bestForTechSavviness = `Invalid tech savviness: ${invalid.join(', ')}. Valid: ${VALID_TOOL_TECH_SAVVINESS.join(', ')}`;
      }
    }
  }

  // Optional string arrays
  if (data.aliases !== undefined && !Array.isArray(data.aliases)) {
    errors.aliases = 'Aliases must be an array of strings';
  }
  if (data.primaryUseCases !== undefined && !Array.isArray(data.primaryUseCases)) {
    errors.primaryUseCases = 'Primary use cases must be an array of strings';
  }
  if (data.keyFeatures !== undefined && !Array.isArray(data.keyFeatures)) {
    errors.keyFeatures = 'Key features must be an array of strings';
  }

  // Optional number fields
  if (data.estimatedCostPerUser !== undefined && data.estimatedCostPerUser !== null) {
    if (typeof data.estimatedCostPerUser !== 'number' || data.estimatedCostPerUser < 0) {
      errors.estimatedCostPerUser = 'Estimated cost per user must be a non-negative number';
    }
  }

  if (data.foundedYear !== undefined && data.foundedYear !== null) {
    if (typeof data.foundedYear !== 'number' || data.foundedYear < 1900 || data.foundedYear > new Date().getFullYear() + 1) {
      errors.foundedYear = 'Founded year must be a valid year';
    }
  }

  // Popularity sub-scores (0-100)
  const popularityFields = ['popularityAdoption', 'popularitySentiment', 'popularityMomentum', 'popularityEcosystem', 'popularityReliability'];
  for (const field of popularityFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'number' || data[field] < 0 || data[field] > 100) {
        errors[field] = `${field} must be a number between 0 and 100`;
      }
    }
  }

  // Optional boolean fields
  const booleanFields = ['hasFreeForever', 'soc2', 'hipaa', 'gdpr', 'euDataResidency', 'selfHosted', 'airGapped', 'hasAiFeatures'];
  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      errors[field] = `${field} must be a boolean`;
    }
  }

  // Optional string fields
  const stringFields = ['aiFeatureDescription', 'websiteUrl', 'logoUrl', 'fundingStage'];
  for (const field of stringFields) {
    if (data[field] !== undefined && data[field] !== null && typeof data[field] !== 'string') {
      errors[field] = `${field} must be a string`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // Build the result object with only defined fields
  const result: UpdateToolInput = {};

  if (data.name !== undefined) result.name = (data.name as string).toLowerCase().trim();
  if (data.displayName !== undefined) result.displayName = (data.displayName as string).trim();
  if (data.category !== undefined) result.category = data.category as string;
  if (data.aliases !== undefined) result.aliases = data.aliases as string[];
  if (data.primaryUseCases !== undefined) result.primaryUseCases = data.primaryUseCases as string[];
  if (data.keyFeatures !== undefined) result.keyFeatures = data.keyFeatures as string[];
  if (data.complexity !== undefined) result.complexity = data.complexity as string;
  if (data.typicalPricingTier !== undefined) result.typicalPricingTier = data.typicalPricingTier as string;
  if (data.estimatedCostPerUser !== undefined) result.estimatedCostPerUser = data.estimatedCostPerUser as number | null;
  if (data.hasFreeForever !== undefined) result.hasFreeForever = data.hasFreeForever as boolean;
  if (data.bestForTeamSize !== undefined) result.bestForTeamSize = data.bestForTeamSize as string[];
  if (data.bestForStage !== undefined) result.bestForStage = data.bestForStage as string[];
  if (data.bestForTechSavviness !== undefined) result.bestForTechSavviness = data.bestForTechSavviness as string[];
  if (data.soc2 !== undefined) result.soc2 = data.soc2 as boolean;
  if (data.hipaa !== undefined) result.hipaa = data.hipaa as boolean;
  if (data.gdpr !== undefined) result.gdpr = data.gdpr as boolean;
  if (data.euDataResidency !== undefined) result.euDataResidency = data.euDataResidency as boolean;
  if (data.selfHosted !== undefined) result.selfHosted = data.selfHosted as boolean;
  if (data.airGapped !== undefined) result.airGapped = data.airGapped as boolean;
  if (data.hasAiFeatures !== undefined) result.hasAiFeatures = data.hasAiFeatures as boolean;
  if (data.aiFeatureDescription !== undefined) result.aiFeatureDescription = data.aiFeatureDescription as string | null;
  if (data.websiteUrl !== undefined) result.websiteUrl = data.websiteUrl as string | null;
  if (data.logoUrl !== undefined) result.logoUrl = data.logoUrl as string | null;
  if (data.fundingStage !== undefined) result.fundingStage = data.fundingStage as string | null;
  if (data.foundedYear !== undefined) result.foundedYear = data.foundedYear as number | null;
  if (data.popularityAdoption !== undefined) result.popularityAdoption = data.popularityAdoption as number;
  if (data.popularitySentiment !== undefined) result.popularitySentiment = data.popularitySentiment as number;
  if (data.popularityMomentum !== undefined) result.popularityMomentum = data.popularityMomentum as number;
  if (data.popularityEcosystem !== undefined) result.popularityEcosystem = data.popularityEcosystem as number;
  if (data.popularityReliability !== undefined) result.popularityReliability = data.popularityReliability as number;

  return result;
}
