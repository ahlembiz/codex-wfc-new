import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getToolService } from '../../lib/services/toolService';
import { setCorsHeaders, handleOptions, handleError, checkMethod } from '../../lib/middleware/errorHandler';
import { validateQueryParams } from '../../lib/middleware/validation';
import type { ToolCategory, TechSavviness, TeamSize, Stage } from '@prisma/client';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (!checkMethod(req.method, ['GET'], res)) {
    return;
  }

  try {
    const toolService = getToolService();

    // Parse query parameters
    const query = validateQueryParams(req.query as Record<string, string | string[] | undefined>, [
      'category',
      'techSavviness',
      'teamSize',
      'stage',
      'maxCostPerUser',
      'hasAiFeatures',
      'requireSoc2',
      'requireHipaa',
      'requireGdpr',
    ]);

    // Build filters
    const filters: Record<string, unknown> = {};

    if (query.category) {
      filters.category = query.category as ToolCategory;
    }

    if (query.techSavviness) {
      filters.techSavviness = query.techSavviness as TechSavviness;
    }

    if (query.teamSize) {
      filters.teamSize = query.teamSize as TeamSize;
    }

    if (query.stage) {
      filters.stage = query.stage as Stage;
    }

    if (query.maxCostPerUser) {
      filters.maxCostPerUser = parseFloat(query.maxCostPerUser);
    }

    if (query.hasAiFeatures === 'true') {
      filters.hasAiFeatures = true;
    }

    if (query.requireSoc2 === 'true') {
      filters.requireSoc2 = true;
    }

    if (query.requireHipaa === 'true') {
      filters.requireHipaa = true;
    }

    if (query.requireGdpr === 'true') {
      filters.requireGdpr = true;
    }

    // Get tools
    const hasFilters = Object.keys(filters).length > 0;
    const tools = hasFilters
      ? await toolService.getFilteredTools(filters)
      : await toolService.getAllTools();

    res.status(200).json({
      data: tools,
      count: tools.length,
    });
  } catch (error) {
    handleError(error, res);
  }
}
