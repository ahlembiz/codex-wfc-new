import Anthropic from '@anthropic-ai/sdk';
import type { BuiltScenario } from './scenarioBuilder';
import type { PipelineContext } from './decisionPipeline';
import type { CostAnalysis } from './costCalculator';

/**
 * Narrative Service - Generate human-readable descriptions using Claude API
 */
export class NarrativeService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Generate narrative descriptions for all scenarios
   */
  async generateNarratives(
    scenarios: BuiltScenario[],
    context: PipelineContext,
    costAnalyses: Map<string, CostAnalysis>
  ): Promise<BuiltScenario[]> {
    const narrativePromises = scenarios.map(async (scenario) => {
      const costAnalysis = costAnalyses.get(scenario.title);
      const description = await this.generateScenarioNarrative(scenario, context, costAnalysis);
      return { ...scenario, description };
    });

    return Promise.all(narrativePromises);
  }

  /**
   * Generate a narrative description for a single scenario
   */
  async generateScenarioNarrative(
    scenario: BuiltScenario,
    context: PipelineContext,
    costAnalysis?: CostAnalysis
  ): Promise<string> {
    const client = this.getClient();

    const prompt = this.buildNarrativePrompt(scenario, context, costAnalysis);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const textBlock = response.content.find(block => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        return textBlock.text.trim();
      }

      return this.generateFallbackNarrative(scenario, context);
    } catch (error) {
      console.error('Error generating narrative:', error);
      return this.generateFallbackNarrative(scenario, context);
    }
  }

  private buildNarrativePrompt(
    scenario: BuiltScenario,
    context: PipelineContext,
    costAnalysis?: CostAnalysis
  ): string {
    const { assessment } = context;
    const tools = scenario.tools.map(t => t.displayName).join(', ');
    const displaced = scenario.displacementList.join(', ') || 'none';

    const savingsInfo = costAnalysis
      ? `Estimated savings: ${costAnalysis.monthlyPerUserSavings.toFixed(0)}/user/month (${costAnalysis.fiveYearProjection[0]?.savingsPercentage || 0}% reduction)`
      : '';

    return `You are a clinical diagnostician for product teams. Write a 2-3 sentence prescription for this workflow scenario.

PATIENT: ${assessment.company}
- Stage: ${assessment.stage}
- Team size: ${assessment.teamSize}
- Tech savviness: ${assessment.techSavviness}
- Automation philosophy: ${assessment.philosophy}
- Pain points: ${assessment.painPoints.join(', ') || 'general inefficiency'}

SCENARIO: ${scenario.title}
- Recommended tools: ${tools}
- Tools to remove: ${displaced}
- Complexity reduction: ${scenario.complexityReductionScore}%
${savingsInfo}

Write a confident, direct prescription in clinical style. Start with "Rx:" and explain why this stack fits their needs. Be specific about the benefits. Do not use markdown formatting.`;
  }

  private generateFallbackNarrative(
    scenario: BuiltScenario,
    context: PipelineContext
  ): string {
    const tools = scenario.tools.map(t => t.displayName).join(', ');
    const { assessment } = context;

    const narratives: Record<string, string> = {
      'The Mono-Stack': `Rx: Consolidate to ${tools}. This minimalist approach reduces context-switching and cognitive load for your ${assessment.teamSize} person team. With a ${scenario.complexityReductionScore}% reduction in tool complexity, your ${assessment.techSavviness.toLowerCase()}-level team can focus on building rather than managing integrations.`,

      'The Native Integrator': `Rx: Optimize with ${tools}. This best-of-breed stack maintains flexibility while ensuring seamless data flow between tools. Ideal for a ${assessment.stage} team that values specialized capabilities without the integration headaches.`,

      'The Agentic Lean': `Rx: Automate with ${tools}. This AI-first stack aligns with your ${assessment.philosophy} philosophy, letting agents handle routine tasks while your team focuses on high-value decisions. Expect significant time savings as AI handles the heavy lifting.`,
    };

    return narratives[scenario.title] || `Rx: Implement ${tools} for a streamlined workflow with ${scenario.complexityReductionScore}% complexity reduction.`;
  }

  /**
   * Generate a summary comparing all scenarios
   */
  async generateComparisonSummary(
    scenarios: BuiltScenario[],
    context: PipelineContext
  ): Promise<string> {
    const client = this.getClient();

    const scenarioSummaries = scenarios.map(s => ({
      title: s.title,
      tools: s.tools.map(t => t.displayName),
      complexity: s.complexityReductionScore,
      cost: s.estimatedMonthlyCostPerUser,
    }));

    const prompt = `Compare these 3 workflow scenarios for ${context.assessment.company}:

${JSON.stringify(scenarioSummaries, null, 2)}

Write a brief (2-3 sentence) clinical recommendation on which scenario best fits a ${context.assessment.stage} team with ${context.assessment.philosophy} automation philosophy and ${context.assessment.techSavviness} tech savviness. Be decisive.`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        return textBlock.text.trim();
      }

      return 'Review each scenario to find the best fit for your team\'s needs and automation philosophy.';
    } catch (error) {
      console.error('Error generating comparison:', error);
      return 'Review each scenario to find the best fit for your team\'s needs and automation philosophy.';
    }
  }
}

// Singleton
let narrativeServiceInstance: NarrativeService | null = null;

export function getNarrativeService(): NarrativeService {
  if (!narrativeServiceInstance) {
    narrativeServiceInstance = new NarrativeService();
  }
  return narrativeServiceInstance;
}

export default getNarrativeService;
