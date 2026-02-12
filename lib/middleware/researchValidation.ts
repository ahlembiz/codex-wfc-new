import { ValidationError } from './validation';
import { VALID_SYNERGY_TYPES, VALID_RESEARCH_STATUSES, VALID_DATA_POINT_STATUSES, VALID_SOURCE_TYPES } from '../constants';

export function validateClusterCreate(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'Name is required';
  }
  if (!data.description || typeof data.description !== 'string') {
    errors.description = 'Description is required';
  }
  if (!data.synergyType || typeof data.synergyType !== 'string') {
    errors.synergyType = 'Synergy type is required';
  } else if (!VALID_SYNERGY_TYPES.includes(data.synergyType as any)) {
    errors.synergyType = `Must be one of: ${VALID_SYNERGY_TYPES.join(', ')}`;
  }

  if (data.synergyStrength !== undefined) {
    if (typeof data.synergyStrength !== 'number' || data.synergyStrength < 0 || data.synergyStrength > 100) {
      errors.synergyStrength = 'Must be a number between 0 and 100';
    }
  }
  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100) {
      errors.confidence = 'Must be a number between 0 and 100';
    }
  }

  if (data.toolIds !== undefined) {
    if (!Array.isArray(data.toolIds)) {
      errors.toolIds = 'Must be an array of { toolId, role? } objects';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data;
}

export function validateClusterUpdate(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (data.status !== undefined) {
    if (typeof data.status !== 'string' || !VALID_RESEARCH_STATUSES.includes(data.status as any)) {
      errors.status = `Must be one of: ${VALID_RESEARCH_STATUSES.join(', ')}`;
    }
  }
  if (data.confidence !== undefined) {
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 100) {
      errors.confidence = 'Must be a number between 0 and 100';
    }
  }
  if (data.synergyStrength !== undefined) {
    if (typeof data.synergyStrength !== 'number' || data.synergyStrength < 0 || data.synergyStrength > 100) {
      errors.synergyStrength = 'Must be a number between 0 and 100';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data;
}

export function validateBulkAction(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.action || typeof data.action !== 'string') {
    errors.action = 'Action is required';
  } else if (!['approve', 'reject', 'flag'].includes(data.action)) {
    errors.action = 'Must be one of: approve, reject, flag';
  }

  if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    errors.ids = 'ids must be a non-empty array of strings';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data as { action: string; ids: string[]; notes?: string };
}

export function validateDataPointCreate(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.sourceType || typeof data.sourceType !== 'string') {
    errors.sourceType = 'Source type is required';
  } else if (!VALID_SOURCE_TYPES.includes(data.sourceType as any)) {
    errors.sourceType = `Must be one of: ${VALID_SOURCE_TYPES.join(', ')}`;
  }

  if (!data.tools || !Array.isArray(data.tools) || data.tools.length === 0) {
    errors.tools = 'Tools must be a non-empty array of strings';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return data;
}
