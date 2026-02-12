import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';

export default createApiHandler({
  methods: ['GET'],
  async handler(req, res) {
    const service = getResearchService();
    const { research_status, confidence_min, connector_type, page, limit } = req.query as Record<string, string>;

    const result = await service.getResearchRecipes({
      researchStatus: research_status,
      confidenceMin: confidence_min ? Number(confidence_min) : undefined,
      connectorType: connector_type,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json(result);
  },
});
