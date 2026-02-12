// Barrel export for middleware
export { createApiHandler } from './apiHandler';
export { setCorsHeaders, handleOptions, checkMethod, handleError } from './errorHandler';
export {
  ValidationError,
  validateAssessmentData,
  validateToolMatchRequest,
  validateQueryParams,
  checkRateLimit,
  getClientIdentifier,
  validateToolCreate,
  validateToolUpdate,
} from './validation';
export type { ValidatedAssessmentData, ValidatedToolMatchRequest } from './validation';
export {
  validateClusterCreate,
  validateClusterUpdate,
  validateBulkAction,
  validateDataPointCreate,
} from './researchValidation';
