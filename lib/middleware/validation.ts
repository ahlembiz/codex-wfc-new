import type { VercelRequest } from '@vercel/node';
import {
  ComplianceRequirement,
  TeamSizeBucket,
  COMPLIANCE_UI_LABELS,
  TEAM_SIZE_UI_LABELS
} from '../../types';
import {
  VALID_STAGES,
  VALID_PHILOSOPHIES,
  VALID_TECH_SAVVINESS,
  VALID_COST_SENSITIVITY,
  VALID_SENSITIVITY,
  VALID_ANCHOR_TYPES,
  VALID_PAIN_POINTS,
  VALID_TOOL_CATEGORIES,
  WORKFLOW_PHASES_V2,
} from '../constants';

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
  anchorType: string;
  painPoints: string[];
  otherAnchorText: string;
  phasePriorities?: string[];
  desiredCapabilities?: string[];
}

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

  if (!data.anchorType || !VALID_ANCHOR_TYPES.includes(data.anchorType as string)) {
    errors.anchorType = `Anchor type must be one of: ${VALID_ANCHOR_TYPES.join(', ')}`;
  }

  if (!Array.isArray(data.painPoints)) {
    errors.painPoints = 'Pain points must be an array';
  } else {
    // Validate pain point values are engine-actionable enums
    const invalidPainPoints = (data.painPoints as string[]).filter(
      p => !VALID_PAIN_POINTS.includes(p as any)
    );
    if (invalidPainPoints.length > 0) {
      errors.painPoints = `Invalid pain points: ${invalidPainPoints.join(', ')}. Valid: ${VALID_PAIN_POINTS.join(', ')}`;
    }
  }

  if (typeof data.otherAnchorText !== 'string') {
    errors.otherAnchorText = 'Other anchor text must be a string';
  }

  // Optional: phasePriorities
  if (data.phasePriorities !== undefined) {
    if (!Array.isArray(data.phasePriorities)) {
      errors.phasePriorities = 'Phase priorities must be an array';
    } else {
      const validPhases = WORKFLOW_PHASES_V2 as readonly string[];
      const invalidPhases = (data.phasePriorities as string[]).filter(p => !validPhases.includes(p));
      if (invalidPhases.length > 0) {
        errors.phasePriorities = `Invalid phases: ${invalidPhases.join(', ')}. Valid: ${validPhases.join(', ')}`;
      }
    }
  }

  // Optional: desiredCapabilities
  if (data.desiredCapabilities !== undefined) {
    if (!Array.isArray(data.desiredCapabilities)) {
      errors.desiredCapabilities = 'Desired capabilities must be an array';
    } else {
      const invalidCaps = (data.desiredCapabilities as string[]).filter(
        c => !VALID_TOOL_CATEGORIES.includes(c)
      );
      if (invalidCaps.length > 0) {
        errors.desiredCapabilities = `Invalid capabilities: ${invalidCaps.join(', ')}. Valid: ${VALID_TOOL_CATEGORIES.join(', ')}`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  // Normalize values before returning
  const normalizedTeamSize = normalizeTeamSize(rawTeamSize as string, isSoloFounder);
  const normalizedCompliance = normalizeComplianceRequirements(data.highStakesRequirements as unknown[]);

  const result: ValidatedAssessmentData = {
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
    anchorType: data.anchorType as string,
    painPoints: data.painPoints as string[],
    otherAnchorText: (data.otherAnchorText as string) || '',
  };

  if (Array.isArray(data.phasePriorities) && data.phasePriorities.length > 0) {
    result.phasePriorities = data.phasePriorities as string[];
  }
  if (Array.isArray(data.desiredCapabilities) && data.desiredCapabilities.length > 0) {
    result.desiredCapabilities = data.desiredCapabilities as string[];
  }

  return result;
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

// Re-export tool CRUD validation from toolValidation.ts for backward compatibility
export { validateToolCreate, validateToolUpdate } from './toolValidation';

// Re-export enum constants for backward compatibility
export {
  VALID_TOOL_CATEGORIES,
  VALID_COMPLEXITIES,
  VALID_PRICING_TIERS,
  VALID_TOOL_TEAM_SIZES,
  VALID_TOOL_STAGES,
  VALID_TOOL_TECH_SAVVINESS,
} from '../constants';
