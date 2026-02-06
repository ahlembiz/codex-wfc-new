import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleError, setCorsHeaders, handleOptions, checkMethod } from '../../../lib/middleware/errorHandler';
import { getEnrichmentService } from '../../../lib/services/enrichmentService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (!checkMethod(req.method, ['POST'], res)) {
    return;
  }

  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing tool ID',
        statusCode: 400,
      });
    }

    const enrichmentService = getEnrichmentService();
    const { tool, enrichment } = await enrichmentService.enrichTool(id);

    return res.status(200).json({
      success: true,
      data: tool,
      enrichment,
    });
  } catch (error) {
    handleError(error, res);
  }
}
