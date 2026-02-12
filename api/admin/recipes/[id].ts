import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';

export default createApiHandler({
  methods: ['PATCH'],
  async handler(req, res) {
    const service = getResearchService();
    const id = req.query.id as string;

    if (!id) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    const recipe = await service.updateRecipeResearch(id, req.body);
    return res.status(200).json(recipe);
  },
});
