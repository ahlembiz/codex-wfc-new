import type { VercelResponse } from '@vercel/node';
import { ValidationError } from './validation';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string>;
  statusCode: number;
}

/**
 * Handle errors and send appropriate response
 */
export function handleError(error: unknown, res: VercelResponse): void {
  console.error('API Error:', error);

  // Validation errors
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      error: 'ValidationError',
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    } satisfies ErrorResponse);
    return;
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message: string };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        error: 'ConflictError',
        message: 'A record with this identifier already exists',
        statusCode: 409,
      } satisfies ErrorResponse);
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        error: 'NotFoundError',
        message: 'The requested resource was not found',
        statusCode: 404,
      } satisfies ErrorResponse);
      return;
    }
  }

  // Redis errors
  if (error && typeof error === 'object' && 'name' in error) {
    const namedError = error as { name: string; message: string };

    if (namedError.name === 'UpstashError') {
      res.status(503).json({
        error: 'CacheError',
        message: 'Cache service temporarily unavailable',
        statusCode: 503,
      } satisfies ErrorResponse);
      return;
    }
  }

  // API/Network errors
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'A required service is temporarily unavailable',
        statusCode: 503,
      } satisfies ErrorResponse);
      return;
    }

    if (error.message.includes('ANTHROPIC_API_KEY') || error.message.includes('API key')) {
      res.status(500).json({
        error: 'ConfigurationError',
        message: 'Server configuration error',
        statusCode: 500,
      } satisfies ErrorResponse);
      return;
    }
  }

  // Generic error
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  } satisfies ErrorResponse);
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  res: VercelResponse
): Promise<T | void> {
  return handler().catch(error => handleError(error, res));
}

/**
 * CORS headers for API responses
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptions(res: VercelResponse): void {
  setCorsHeaders(res);
  res.status(200).end();
}

/**
 * Check if request method is allowed
 */
export function checkMethod(
  method: string | undefined,
  allowed: string[],
  res: VercelResponse
): boolean {
  if (!method || !allowed.includes(method)) {
    res.status(405).json({
      error: 'MethodNotAllowed',
      message: `Method ${method} not allowed. Use: ${allowed.join(', ')}`,
      statusCode: 405,
    } satisfies ErrorResponse);
    return false;
  }
  return true;
}
