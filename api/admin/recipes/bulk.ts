import { createApiHandler } from '../../../lib/middleware/apiHandler';
import { getResearchService } from '../../../lib/services/researchService';
import { validateBulkAction } from '../../../lib/middleware/researchValidation';

export default createApiHandler({
  methods: ['POST'],
  async handler(req, res) {
    const { action, ids, notes } = validateBulkAction(req.body);
    const service = getResearchService();
    const result = await service.bulkUpdateRecipes(ids, action, notes);
    return res.status(200).json(result);
  },
});
