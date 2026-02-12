import { createApiHandler } from '../../lib/middleware/apiHandler';
import { getResearchService } from '../../lib/services/researchService';

export default createApiHandler({
  methods: ['GET'],
  async handler(_req, res) {
    const service = getResearchService();
    const checks = await service.runBiasAudit();
    return res.status(200).json({ checks });
  },
});
