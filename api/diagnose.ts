import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDecisionPipeline } from '../lib/engine/decisionPipeline';
import { getScenarioBuilder } from '../lib/engine/scenarioBuilder';
import { getCostCalculator } from '../lib/engine/costCalculator';
import { getNarrativeService } from '../lib/engine/narrativeService';
import { getCacheService } from '../lib/services/cacheService';
import { createApiHandler } from '../lib/middleware/apiHandler';
import {
  validateAssessmentData,
  checkRateLimit,
  getClientIdentifier,
} from '../lib/middleware/validation';
import { TeamSizeBucket } from '../types';

// Response type matching frontend expectations
interface DiagnosisResponse {
  scenarios: Array<{
    title: string;
    description: string;
    complexityReductionScore: number;
    displacementList: string[];
    workflow: Array<{
      phase: string;
      tool: string;
      aiAgentRole: string;
      humanRole: string;
      outcome: string;
      subSteps?: Array<{
        bucket: string;
        tool: string;
        featureName: string;
        aiAction: string;
        humanAction: string;
        artifact: string;
        automationLevel: string;
      }>;
      automations?: Array<{
        name: string;
        triggerTool: string;
        triggerEvent: string;
        actionTool: string;
        actionResult: string;
        connectorType: string;
        setupDifficulty: string;
        timeSaved: number;
      }>;
      secondaryTools?: string[];
    }>;
    costProjectionLatex: string;
    currentCostYearly: number[];
    projectedCostYearly: number[];
    rationale?: {
      goal: string;
      keyPrinciple: string;
      bestForGeneric: string[];
      bestForUser: string[];
      decisionFraming: string;
      complexityNote: string;
    };
  }>;
}

export default createApiHandler({
  methods: ['POST'],
  async handler(req: VercelRequest, res: VercelResponse) {
    // Rate limiting
    const clientId = getClientIdentifier(req);
    if (!checkRateLimit(clientId, 10, 60000)) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      });
      return;
    }

    // Validate request body
    const assessmentData = validateAssessmentData(req.body);

    // Check cache
    const cacheService = getCacheService();
    const cached = await cacheService.getDiagnosis<DiagnosisResponse>(assessmentData);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    // Run decision pipeline
    const pipeline = getDecisionPipeline();
    const context = await pipeline.run(assessmentData);

    // Build scenarios
    const scenarioBuilder = getScenarioBuilder();
    const builtScenarios = await scenarioBuilder.buildAllScenarios(context);

    // Calculate costs
    const costCalculator = getCostCalculator();
    const teamSize = getTeamSizeCount(assessmentData.teamSize, assessmentData.teamSizeRaw);
    const costAnalyses = new Map<string, ReturnType<typeof costCalculator.calculateCostAnalysis>>();

    for (const scenario of builtScenarios) {
      const analysis = costCalculator.calculateCostAnalysis(
        scenario,
        context.userTools,
        teamSize
      );
      costAnalyses.set(scenario.title, analysis);
    }

    // Generate narratives (optional - can be disabled for speed)
    const narrativeService = getNarrativeService();
    let scenariosWithNarratives = builtScenarios;

    try {
      scenariosWithNarratives = await narrativeService.generateNarratives(
        builtScenarios,
        context,
        costAnalyses
      );
    } catch (narrativeError) {
      console.error('Narrative generation failed, using fallback:', narrativeError);
    }

    // Format response to match frontend expectations
    const response: DiagnosisResponse = {
      scenarios: scenariosWithNarratives.map(scenario => {
        const costAnalysis = costAnalyses.get(scenario.title);

        return {
          title: scenario.title,
          description: scenario.description || `Recommended stack: ${scenario.tools.map(t => t.displayName).join(', ')}`,
          complexityReductionScore: scenario.complexityReductionScore,
          displacementList: scenario.displacementList,
          workflow: scenario.workflow,
          costProjectionLatex: costAnalysis?.costProjectionLatex || '',
          currentCostYearly: costAnalysis?.currentYearlyCosts || [0, 0, 0, 0, 0],
          projectedCostYearly: costAnalysis?.projectedYearlyCosts || [0, 0, 0, 0, 0],
          rationale: scenario.rationale,
        };
      }),
    };

    // Cache the result
    await cacheService.setDiagnosis(assessmentData, response);

    res.status(200).json(response);
  },
});

/**
 * Convert canonical TeamSizeBucket to representative number for cost calculations.
 * Uses midpoint of each bucket range.
 */
function getTeamSizeCount(teamSize: TeamSizeBucket, rawTeamSize?: string): number {
  // If raw team size is available with specific numbers, use first number
  if (rawTeamSize) {
    const match = rawTeamSize.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }

  // Map canonical bucket to representative midpoint value
  switch (teamSize) {
    case TeamSizeBucket.Solo: return 1;
    case TeamSizeBucket.Small: return 3;     // midpoint of 2-5
    case TeamSizeBucket.Medium: return 12;   // midpoint of 6-20
    case TeamSizeBucket.Large: return 50;    // midpoint of 21-100
    case TeamSizeBucket.Enterprise: return 150; // representative for 100+
    default: return 5; // fallback
  }
}
