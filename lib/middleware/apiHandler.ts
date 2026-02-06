import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, checkMethod, handleError } from './errorHandler';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiHandlerOptions {
  methods: HttpMethod[];
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;
}

/**
 * Creates a Vercel API handler with standard CORS, OPTIONS, method checking, and error handling.
 * Eliminates the 5-7 line boilerplate repeated in every API route.
 */
export function createApiHandler({ methods, handler }: ApiHandlerOptions) {
  return async function (req: VercelRequest, res: VercelResponse): Promise<void> {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      handleOptions(res);
      return;
    }

    if (!checkMethod(req.method, methods, res)) {
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, res);
    }
  };
}
