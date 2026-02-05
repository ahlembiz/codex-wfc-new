import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleError, setCorsHeaders, handleOptions } from '../../lib/middleware/errorHandler';
import { getToolService } from '../../lib/services/toolService';
import { validateSubScore, POPULARITY_SUB_SCORE_FIELDS } from '../../lib/utils/popularityCalculator';
import type { PopularitySubScores } from '../../lib/utils/popularityCalculator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({
      error: 'MethodNotAllowed',
      message: 'Only PATCH is allowed on this endpoint',
      statusCode: 405,
    });
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

    const body = req.body || {};
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

    const toolService = getToolService();
    const updated = await toolService.updateToolPopularity(id, subScores);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    handleError(error, res);
  }
}
