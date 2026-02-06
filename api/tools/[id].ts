import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleError, setCorsHeaders, handleOptions, checkMethod } from '../../lib/middleware/errorHandler';
import { getToolService } from '../../lib/services/toolService';
import { validateToolUpdate } from '../../lib/middleware/validation';
import { validateSubScore, POPULARITY_SUB_SCORE_FIELDS } from '../../lib/utils/popularityCalculator';
import type { PopularitySubScores } from '../../lib/utils/popularityCalculator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (!checkMethod(req.method, ['GET', 'PUT', 'PATCH', 'DELETE'], res)) {
    return;
  }

  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing tool ID',
        statusCode: 400,
      });
    }

    const toolService = getToolService();

    // GET - Fetch a single tool by ID
    if (req.method === 'GET') {
      const tool = await toolService.getToolById(id);
      if (!tool) {
        return res.status(404).json({
          error: 'NotFoundError',
          message: 'Tool not found',
          statusCode: 404,
        });
      }
      return res.status(200).json({
        success: true,
        data: tool,
      });
    }

    // PUT - Full update of a tool
    if (req.method === 'PUT') {
      const validated = validateToolUpdate(req.body);
      const updated = await toolService.updateTool(id, validated);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    }

    // PATCH - Partial update (backward compatible with popularity-only updates)
    if (req.method === 'PATCH') {
      const body = req.body || {};

      // Check if this is a popularity-only update (backward compatibility)
      const bodyKeys = Object.keys(body);
      const isPopularityOnly = bodyKeys.length > 0 && bodyKeys.every(k => POPULARITY_SUB_SCORE_FIELDS.includes(k as any));

      if (isPopularityOnly) {
        // Use existing popularity update method for backward compatibility
        const subScores: PopularitySubScores = {};
        const errors: string[] = [];

        for (const field of POPULARITY_SUB_SCORE_FIELDS) {
          if (field in body) {
            try {
              (subScores as any)[field] = validateSubScore(body[field], field);
            } catch (err) {
              errors.push((err as Error).message);
            }
          }
        }

        if (errors.length > 0) {
          return res.status(400).json({
            error: 'ValidationError',
            message: errors.join('; '),
            statusCode: 400,
          });
        }

        if (Object.keys(subScores).length === 0) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'At least one sub-score field is required',
            statusCode: 400,
          });
        }

        const updated = await toolService.updateToolPopularity(id, subScores);
        return res.status(200).json({
          success: true,
          data: updated,
        });
      }

      // General partial update
      const validated = validateToolUpdate(body);
      const updated = await toolService.updateTool(id, validated);
      return res.status(200).json({
        success: true,
        data: updated,
      });
    }

    // DELETE - Delete a tool
    if (req.method === 'DELETE') {
      const deleted = await toolService.deleteTool(id);
      return res.status(200).json({
        success: true,
        data: deleted,
        message: 'Tool deleted successfully',
      });
    }
  } catch (error) {
    handleError(error, res);
  }
}
