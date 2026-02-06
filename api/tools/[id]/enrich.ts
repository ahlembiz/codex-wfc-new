import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnrichmentService } from '../../../lib/services/enrichmentService';
import { createApiHandler } from '../../../lib/middleware/apiHandler';

export default createApiHandler({
  methods: ['POST'],
  async handler(req: VercelRequest, res: VercelResponse) {
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
  },
});
