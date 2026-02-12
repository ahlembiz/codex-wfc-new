import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';

export default createApiHandler({
  methods: ['GET'],
  async handler(_req, res) {
    const service = getResearchService();
    const stats = await service.getClusterFuckStats();
    return res.status(200).json(stats);
  },
});
