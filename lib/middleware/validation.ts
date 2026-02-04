import type { VercelRequest } from '@vercel/node';

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

// Assessment data validation
export interface ValidatedAssessmentData {
  company: string;
  stage: string;
  teamSize: string;
  currentTools: string;
  philosophy: string;
  techSavviness: string;
  budgetPerUser: number;
  costSensitivity: string;
  sensitivity: string;
  highStakesRequirements: string[];
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

  if (!data.teamSize || typeof data.teamSize !== 'string') {
    errors.teamSize = 'Team size is required';
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

  return {
    company: data.company as string,
    stage: data.stage as string,
    teamSize: data.teamSize as string,
    currentTools: (data.currentTools as string) || '',
    philosophy: data.philosophy as string,
    techSavviness: data.techSavviness as string,
    budgetPerUser: data.budgetPerUser as number,
    costSensitivity: data.costSensitivity as string,
    sensitivity: data.sensitivity as string,
    highStakesRequirements: data.highStakesRequirements as string[],
    agentReadiness: data.agentReadiness as boolean,
    anchorType: data.anchorType as string,
    painPoints: data.painPoints as string[],
    isSoloFounder: data.isSoloFounder as boolean,
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
