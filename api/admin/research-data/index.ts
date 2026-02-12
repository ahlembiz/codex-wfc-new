import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';
import { validateDataPointCreate } from '../../../lib/middleware/researchValidation';

export default createApiHandler({
  methods: ['GET', 'POST'],
  async handler(req, res) {
    const service = getResearchService();

    if (req.method === 'GET') {
      const { source_type, status, confidence_min, page, limit } = req.query as Record<string, string>;
      const result = await service.getDataPoints({
        sourceType: source_type,
        status,
        confidenceMin: confidence_min ? Number(confidence_min) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.status(200).json(result);
    }

    // POST: create data point
    const validated = validateDataPointCreate(req.body);
    const dataPoint = await service.createDataPoint(validated as any);
    return res.status(201).json(dataPoint);
  },
});
