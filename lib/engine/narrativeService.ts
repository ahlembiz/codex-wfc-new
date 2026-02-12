import { getAnthropicClient, generateText, AI_MODELS } from '../providers/aiProvider';
import type { BuiltScenario } from './scenarioBuilder';
import type { PipelineContext } from './decisionPipeline';
import type { CostAnalysis } from './costCalculator';

/**
 * Narrative Service - Generate human-readable descriptions using Claude API
 */
export class NarrativeService {

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
    const prompt = this.buildNarrativePrompt(scenario, context, costAnalysis);

    try {
      const text = await generateText({ prompt, maxTokens: 500, temperature: 0.7 });
      return text || this.generateFallbackNarrative(scenario, context);
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

    // Enrich with workflow intelligence data (sub-steps and automations)
    const workflowDetails = scenario.workflow
      .filter((step: any) => step.subSteps?.length > 0 || step.automations?.length > 0)
      .map((step: any) => {
        const parts = [`${step.phase}:`];
        if (step.subSteps?.length > 0) {
          const features = step.subSteps.map((s: any) => s.featureName).join(', ');
          parts.push(`  Features: ${features}`);
        }
        if (step.automations?.length > 0) {
          const autos = step.automations.map((a: any) => `${a.triggerTool}→${a.actionTool}`).join(', ');
          parts.push(`  Automations: ${autos}`);
        }
        return parts.join('\n');
      })
      .join('\n');

    const capabilitySection = workflowDetails
      ? `\nKEY CAPABILITIES:\n${workflowDetails}\n`
      : '';

    const rationaleSection = scenario.rationale
      ? `\nSCENARIO RATIONALE:
- Goal: ${scenario.rationale.goal}
- Key Principle: ${scenario.rationale.keyPrinciple}
- Decision Framing: ${scenario.rationale.decisionFraming}
- Why it fits this user: ${scenario.rationale.bestForUser.join('; ') || 'General recommendation'}
`
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
${rationaleSection}${capabilitySection}
Write a confident, direct prescription in clinical style. Start with "Rx:" and explain why this stack fits their needs. Reference specific tool features (like "Linear Asks" or "Cursor Composer") when available. Do not use markdown formatting.`;
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
      const text = await generateText({ prompt, maxTokens: 200, temperature: 0.7 });
      return text || 'Review each scenario to find the best fit for your team\'s needs and automation philosophy.';
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
