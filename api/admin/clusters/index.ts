import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';
import { validateClusterCreate } from '../../../lib/middleware/researchValidation';

export default createApiHandler({
  methods: ['GET', 'POST'],
  async handler(req, res) {
    const service = getResearchService();

    if (req.method === 'GET') {
      const { status, confidence_min, synergy_type, page, limit } = req.query as Record<string, string>;
      const result = await service.getClusters({
        status,
        confidenceMin: confidence_min ? Number(confidence_min) : undefined,
        synergyType: synergy_type,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.status(200).json(result);
    }

    // POST: create cluster
    const validated = validateClusterCreate(req.body);
    const cluster = await service.createCluster(validated as any);
    return res.status(201).json(cluster);
  },
});
