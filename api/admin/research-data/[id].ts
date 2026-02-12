import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';

export default createApiHandler({
  methods: ['PATCH'],
  async handler(req, res) {
    const service = getResearchService();
    const id = req.query.id as string;

    if (!id) {
      return res.status(400).json({ error: 'Data point ID is required' });
    }

    if (!req.body.status || typeof req.body.status !== 'string') {
      return res.status(400).json({ error: 'status field is required' });
    }

    const dataPoint = await service.updateDataPointStatus(id, req.body.status);
    return res.status(200).json(dataPoint);
  },
});
