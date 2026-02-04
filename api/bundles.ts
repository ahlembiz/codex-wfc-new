import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getBundleService } from '../lib/services/bundleService';
import { setCorsHeaders, handleOptions, handleError, checkMethod } from '../lib/middleware/errorHandler';
import { validateQueryParams } from '../lib/middleware/validation';
import type { ScenarioType, TechSavviness, TeamSize, Stage } from '@prisma/client';

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
    const bundleService = getBundleService();

    // Parse query parameters
    const query = validateQueryParams(req.query as Record<string, string | string[] | undefined>, [
      'scenarioType',
      'techSavviness',
      'teamSize',
      'stage',
      'anchorToolId',
    ]);

    // Build filters
    const filters: Record<string, unknown> = {};

    if (query.scenarioType) {
      filters.scenarioType = query.scenarioType as ScenarioType;
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

    if (query.anchorToolId) {
      filters.anchorToolId = query.anchorToolId;
    }

    // Get bundles
    const hasFilters = Object.keys(filters).length > 0;
    const bundles = hasFilters
      ? await bundleService.getFilteredBundles(filters)
      : await bundleService.getAllBundles();

    // Format response
    const formattedBundles = bundles.map(bundle => ({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      scenarioType: bundle.scenarioType,
      tools: bundle.tools.map(t => ({
        id: t.tool.id,
        name: t.tool.name,
        displayName: t.tool.displayName,
        category: t.tool.category,
        role: t.role,
      })),
      anchorTool: bundle.anchorTool
        ? {
            id: bundle.anchorTool.id,
            name: bundle.anchorTool.name,
            displayName: bundle.anchorTool.displayName,
          }
        : null,
      bestForTeamSize: bundle.bestForTeamSize,
      bestForStage: bundle.bestForStage,
      bestForTechSavviness: bundle.bestForTechSavviness,
      primaryUseCasesCovered: bundle.primaryUseCasesCovered,
      estimatedMonthlyCost: bundle.estimatedMonthlyCost,
    }));

    res.status(200).json({
      data: formattedBundles,
      count: formattedBundles.length,
    });
  } catch (error) {
    handleError(error, res);
  }
}
