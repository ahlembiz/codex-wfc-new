import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';
import { validateClusterUpdate } from '../../../lib/middleware/researchValidation';

export default createApiHandler({
  methods: ['GET', 'PATCH'],
  async handler(req, res) {
    const service = getResearchService();
    const id = req.query.id as string;

    if (!id) {
      return res.status(400).json({ error: 'Cluster ID is required' });
    }

    if (req.method === 'GET') {
      const cluster = await service.getClusterById(id);
      if (!cluster) {
        return res.status(404).json({ error: 'Cluster not found' });
      }
      return res.status(200).json(cluster);
    }

    // PATCH: update cluster
    const validated = validateClusterUpdate(req.body);
    const cluster = await service.updateCluster(id, validated as any);
    return res.status(200).json(cluster);
  },
});
