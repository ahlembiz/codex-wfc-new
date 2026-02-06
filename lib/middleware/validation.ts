import type { VercelRequest } from '@vercel/node';
import {
  ComplianceRequirement,
  TeamSizeBucket,
  COMPLIANCE_UI_LABELS,
  TEAM_SIZE_UI_LABELS
} from '../../types';
import type { CreateToolInput, UpdateToolInput } from '../../types';

// Validation error
export class ValidationError extends Error {
  public statusCode: number;
  public details: Record<string, string>;

  constructor(message: string, details: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

// Assessment data validation - uses canonical enums
export interface ValidatedAssessmentData {
  company: string;
  stage: string;
  teamSize: TeamSizeBucket;
  teamSizeRaw?: string;
  currentTools: string;
  philosophy: string;
  techSavviness: string;
  budgetPerUser: number;
  costSensitivity: string;
  sensitivity: string;
  highStakesRequirements: ComplianceRequirement[];
  agentReadiness: boolean;
  anchorType: string;
  painPoints: string[];
  isSoloFounder: boolean;
  otherAnchorText: string;
}

const VALID_STAGES = ['Bootstrapping', 'Pre-Seed', 'Early-Seed', 'Growth', 'Established'];
const VALID_PHILOSOPHIES = ['Co-Pilot', 'Hybrid', 'Auto-Pilot'];
const VALID_TECH_SAVVINESS = ['Newbie', 'Decent', 'Ninja'];
const VALID_COST_SENSITIVITY = ['Price-First', 'Balanced', 'Value-First'];
const VALID_SENSITIVITY = ['Low-Stakes', 'High-Stakes'];
const VALID_ANCHOR_TYPES = [
  'The Doc-Centric Team (Notion)',
  'The Dev-Centric Team (GitHub/Cursor)',
  'The Communication-Centric Team (Slack)',
  'Other',
  "We're just starting! (no Anchor tool yet)",
];
const VALID_TEAM_SIZE_BUCKETS = Object.values(TeamSizeBucket);

// ============================================
// Normalization Layer - Maps UI labels to canonical values
// ============================================

// Map UI compliance labels to canonical enum values
const COMPLIANCE_UI_TO_CANONICAL: Record<string, ComplianceRequirement> = {
  "Self-hosted required": ComplianceRequirement.SelfHosted,
  "SOC 2 compliance": ComplianceRequirement.SOC2,
  "HIPAA compliance": ComplianceRequirement.HIPAA,
  "EU data residency": ComplianceRequirement.EUDataResidency,
  "Air-gapped environment": ComplianceRequirement.AirGapped,
  // Also accept canonical values directly
  [ComplianceRequirement.SelfHosted]: ComplianceRequirement.SelfHosted,
  [ComplianceRequirement.SOC2]: ComplianceRequirement.SOC2,
  [ComplianceRequirement.HIPAA]: ComplianceRequirement.HIPAA,
  [ComplianceRequirement.EUDataResidency]: ComplianceRequirement.EUDataResidency,
  [ComplianceRequirement.AirGapped]: ComplianceRequirement.AirGapped,
};

// Map UI team size labels to canonical enum values
const TEAM_SIZE_UI_TO_CANONICAL: Record<string, TeamSizeBucket> = {
  "Solo (1 person)": TeamSizeBucket.Solo,
  "Small (2-5)": TeamSizeBucket.Small,
  "Medium (6-20)": TeamSizeBucket.Medium,
  "Large (21-100)": TeamSizeBucket.Large,
  "Enterprise (100+)": TeamSizeBucket.Enterprise,
  // Accept canonical values directly
  [TeamSizeBucket.Solo]: TeamSizeBucket.Solo,
  [TeamSizeBucket.Small]: TeamSizeBucket.Small,
  [TeamSizeBucket.Medium]: TeamSizeBucket.Medium,
  [TeamSizeBucket.Large]: TeamSizeBucket.Large,
  [TeamSizeBucket.Enterprise]: TeamSizeBucket.Enterprise,
};

/**
 * Normalize compliance requirement from UI label or any format to canonical enum
 */
function normalizeComplianceRequirement(input: string): ComplianceRequirement | null {
  // Direct mapping
  if (COMPLIANCE_UI_TO_CANONICAL[input]) {
    return COMPLIANCE_UI_TO_CANONICAL[input];
  }
  // Case-insensitive fallback
  const lower = input.toLowerCase();
  if (lower.includes('self-host') || lower.includes('self host')) return ComplianceRequirement.SelfHosted;
  if (lower.includes('soc 2') || lower.includes('soc2')) return ComplianceRequirement.SOC2;
  if (lower.includes('hipaa')) return ComplianceRequirement.HIPAA;
  if (lower.includes('eu') || lower.includes('data residency') || lower.includes('gdpr')) return ComplianceRequirement.EUDataResidency;
  if (lower.includes('air-gap') || lower.includes('air gap') || lower.includes('airgap')) return ComplianceRequirement.AirGapped;
  return null;
}

/**
 * Normalize team size from UI label, canonical value, or free-text to canonical enum
 */
function normalizeTeamSize(input: string, isSoloFounder: boolean): TeamSizeBucket {
  // Solo founder override
  if (isSoloFounder) return TeamSizeBucket.Solo;

  // Direct mapping from UI label or canonical value
  if (TEAM_SIZE_UI_TO_CANONICAL[input]) {
    return TEAM_SIZE_UI_TO_CANONICAL[input];
  }

  // Regex fallback for backward compatibility with free-text input
  const lower = input.toLowerCase();

  // Check for explicit keywords first
  if (lower === '1' || lower === 'solo' || lower.includes('solo')) return TeamSizeBucket.Solo;
  if (lower.includes('enterprise') || lower.includes('100+')) return TeamSizeBucket.Enterprise;

  // Extract numbers for range detection
  const numbers = input.match(/\d+/g)?.map(Number) || [];
  if (numbers.length === 0) return TeamSizeBucket.Small; // default

  const maxNumber = Math.max(...numbers);

  if (maxNumber === 1) return TeamSizeBucket.Solo;
  if (maxNumber >= 2 && maxNumber <= 5) return TeamSizeBucket.Small;
  if (maxNumber >= 6 && maxNumber <= 20) return TeamSizeBucket.Medium;
  if (maxNumber >= 21 && maxNumber <= 100) return TeamSizeBucket.Large;
  if (maxNumber > 100) return TeamSizeBucket.Enterprise;

  return TeamSizeBucket.Small; // default fallback
}

/**
 * Normalize array of compliance requirements
 */
function normalizeComplianceRequirements(requirements: unknown[]): ComplianceRequirement[] {
  const normalized: ComplianceRequirement[] = [];
  for (const req of requirements) {
    if (typeof req === 'string') {
      const canonical = normalizeComplianceRequirement(req);
      if (canonical && !normalized.includes(canonical)) {
        normalized.push(canonical);
      }
    }
  }
  return normalized;
}

export function validateAssessmentData(body: unknown): ValidatedAssessmentData {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Required string fields
  if (!data.company || typeof data.company !== 'string') {
    errors.company = 'Company name is required';
  }

  if (!data.stage || !VALID_STAGES.includes(data.stage as string)) {
    errors.stage = `Stage must be one of: ${VALID_STAGES.join(', ')}`;
  }

  // Team size: accept either canonical enum or any string (will be normalized)
  const rawTeamSize = data.teamSize;
  const isSoloFounder = data.isSoloFounder === true;
  let teamSizeRaw: string | undefined;

  if (!rawTeamSize || typeof rawTeamSize !== 'string') {
    errors.teamSize = 'Team size is required';
  } else {
    // Check if it's already a canonical value
    const isCanonical = VALID_TEAM_SIZE_BUCKETS.includes(rawTeamSize as TeamSizeBucket);
    if (!isCanonical) {
      // Store raw value for potential backward compatibility needs
      teamSizeRaw = rawTeamSize;
    }
  }

  if (typeof data.currentTools !== 'string') {
    errors.currentTools = 'Current tools must be a string';
  }

  if (!data.philosophy || !VALID_PHILOSOPHIES.includes(data.philosophy as string)) {
    errors.philosophy = `Philosophy must be one of: ${VALID_PHILOSOPHIES.join(', ')}`;
  }

  if (!data.techSavviness || !VALID_TECH_SAVVINESS.includes(data.techSavviness as string)) {
    errors.techSavviness = `Tech savviness must be one of: ${VALID_TECH_SAVVINESS.join(', ')}`;
  }

  if (typeof data.budgetPerUser !== 'number' || data.budgetPerUser < 0) {
    errors.budgetPerUser = 'Budget per user must be a non-negative number';
  }

  if (!data.costSensitivity || !VALID_COST_SENSITIVITY.includes(data.costSensitivity as string)) {
    errors.costSensitivity = `Cost sensitivity must be one of: ${VALID_COST_SENSITIVITY.join(', ')}`;
  }

  if (!data.sensitivity || !VALID_SENSITIVITY.includes(data.sensitivity as string)) {
    errors.sensitivity = `Sensitivity must be one of: ${VALID_SENSITIVITY.join(', ')}`;
  }

  if (!Array.isArray(data.highStakesRequirements)) {
    errors.highStakesRequirements = 'High stakes requirements must be an array';
  }

  if (typeof data.agentReadiness !== 'boolean') {
    errors.agentReadiness = 'Agent readiness must be a boolean';
  }

  if (!data.anchorType || !VALID_ANCHOR_TYPES.includes(data.anchorType as string)) {
    errors.anchorType = `Anchor type must be one of: ${VALID_ANCHOR_TYPES.join(', ')}`;
  }

  if (!Array.isArray(data.painPoints)) {
    errors.painPoints = 'Pain points must be an array';
  }

  if (typeof data.isSoloFounder !== 'boolean') {
    errors.isSoloFounder = 'Is solo founder must be a boolean';
  }

  if (typeof data.otherAnchorText !== 'string') {
    errors.otherAnchorText = 'Other anchor text must be a string';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // Normalize values before returning
  const normalizedTeamSize = normalizeTeamSize(rawTeamSize as string, isSoloFounder);
  const normalizedCompliance = normalizeComplianceRequirements(data.highStakesRequirements as unknown[]);

  return {
    company: data.company as string,
    stage: data.stage as string,
    teamSize: normalizedTeamSize,
    teamSizeRaw,
    currentTools: (data.currentTools as string) || '',
    philosophy: data.philosophy as string,
    techSavviness: data.techSavviness as string,
    budgetPerUser: data.budgetPerUser as number,
    costSensitivity: data.costSensitivity as string,
    sensitivity: data.sensitivity as string,
    highStakesRequirements: normalizedCompliance,
    agentReadiness: data.agentReadiness as boolean,
    anchorType: data.anchorType as string,
    painPoints: data.painPoints as string[],
    isSoloFounder,
    otherAnchorText: (data.otherAnchorText as string) || '',
  };
}

// Tool match request validation
export interface ValidatedToolMatchRequest {
  names: string[];
}

export function validateToolMatchRequest(body: unknown): ValidatedToolMatchRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.names)) {
    throw new ValidationError('names must be an array of strings');
  }

  if (data.names.length === 0) {
    throw new ValidationError('names array cannot be empty');
  }

  if (data.names.some(n => typeof n !== 'string')) {
    throw new ValidationError('All names must be strings');
  }

  return {
    names: data.names as string[],
  };
}

// Query parameter validation
export function validateQueryParams(
  query: Record<string, string | string[] | undefined>,
  allowed: string[]
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const key of allowed) {
    const value = query[key];
    if (value !== undefined) {
      result[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  return result;
}

// Rate limiting helpers (simple in-memory, for production use Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function getClientIdentifier(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return ip || req.socket?.remoteAddress || 'unknown';
}

// ============================================
// Tool CRUD Validation
// ============================================

// Prisma enum values for tool fields
const VALID_TOOL_CATEGORIES = [
  'PROJECT_MANAGEMENT', 'DOCUMENTATION', 'COMMUNICATION', 'DEVELOPMENT',
  'DESIGN', 'MEETINGS', 'AUTOMATION', 'AI_ASSISTANTS', 'AI_BUILDERS',
  'ANALYTICS', 'GROWTH', 'OTHER'
];
const VALID_COMPLEXITIES = ['SIMPLE', 'MODERATE', 'ADVANCED', 'EXPERT'];
const VALID_PRICING_TIERS = ['FREE', 'FREEMIUM', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const VALID_TOOL_TEAM_SIZES = ['SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];
const VALID_TOOL_STAGES = ['BOOTSTRAPPING', 'PRE_SEED', 'EARLY_SEED', 'GROWTH', 'ESTABLISHED'];
const VALID_TOOL_TECH_SAVVINESS = ['NEWBIE', 'DECENT', 'NINJA'];

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

// Export enum constants for use by other modules
export {
  VALID_TOOL_CATEGORIES,
  VALID_COMPLEXITIES,
  VALID_PRICING_TIERS,
  VALID_TOOL_TEAM_SIZES,
  VALID_TOOL_STAGES,
  VALID_TOOL_TECH_SAVVINESS,
};
