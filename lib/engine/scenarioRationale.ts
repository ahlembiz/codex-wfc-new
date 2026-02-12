import type { ScenarioType } from '@prisma/client';
import type { AssessmentInput } from './decisionPipeline';

export interface ScenarioRationale {
  goal: string;
  keyPrinciple: string;
  bestForGeneric: string[];
  bestForUser: string[];
  decisionFraming: string;
  complexityNote: string;
}

// Static rationale data per scenario type
const SCENARIO_RATIONALE_DATA: Record<string, {
  goal: string;
  keyPrinciple: string;
  bestForGeneric: string[];
  decisionFraming: string;
  complexityNote: string;
}> = {
  MONO_STACK: {
    goal: 'Minimize context-switching by consolidating into the fewest tools possible',
    keyPrinciple: 'One tool should cover multiple workflow phases; fewer integrations = less friction',
    bestForGeneric: [
      'Solo or small teams wanting simplicity',
      'Budget-conscious teams reducing per-seat costs',
      'Teams overwhelmed by tool sprawl',
    ],
    decisionFraming: 'Choose this if your top priority is simplicity and reducing the number of tools your team juggles daily',
    complexityNote: 'Lowest complexity — fewer tools mean fewer integration points to maintain',
  },
  NATIVE_INTEGRATOR: {
    goal: 'Best-of-breed tools per function, optimized for native integration quality',
    keyPrinciple: 'One specialized tool per major function, connected via native integrations — not glue code',
    bestForGeneric: [
      'Growing teams needing specialized capabilities',
      'Teams that value deep integration between tools',
      'Organizations with diverse functional needs',
    ],
    decisionFraming: 'Choose this if you want the best tool for each job, with confidence they\'ll work together seamlessly',
    complexityNote: 'Moderate complexity — more tools but each earns its place through deep integration',
  },
  AGENTIC_LEAN: {
    goal: 'Maximize AI automation across every workflow phase',
    keyPrinciple: 'Every tool must have AI capabilities; human effort reserved for high-judgment decisions',
    bestForGeneric: [
      'Tech-forward teams embracing AI-first workflows',
      'Teams wanting to automate repetitive tasks',
      'Organizations pursuing maximum efficiency',
    ],
    decisionFraming: 'Choose this if you want AI handling routine work so your team focuses on strategy and creativity',
    complexityNote: 'Higher capability complexity — AI tools are powerful but may require tuning and oversight',
  },
  STARTER_PACK: {
    goal: 'Get started with essential tools for a new team',
    keyPrinciple: 'Cover the basics with affordable, easy-to-learn tools — upgrade later as you grow',
    bestForGeneric: [
      'Brand-new teams with no existing tooling',
      'Bootstrapping teams with tight budgets',
      'Non-technical founders getting started',
    ],
    decisionFraming: 'Choose this if you\'re starting from scratch and want a solid foundation to build on',
    complexityNote: 'Minimal complexity — beginner-friendly tools with gentle learning curves',
  },
};

// Pain point + scenario type → personalized rationale message
const USER_RELEVANCE_RULES: Array<{
  painPoint: string;
  scenarioType: string;
  message: string;
}> = [
  // TOO_MANY_TOOLS
  { painPoint: 'TOO_MANY_TOOLS', scenarioType: 'MONO_STACK', message: 'Directly addresses your tool consolidation concern by reducing to 3-4 core tools' },
  { painPoint: 'TOO_MANY_TOOLS', scenarioType: 'NATIVE_INTEGRATOR', message: 'Replaces redundant tools with purpose-built alternatives that integrate natively' },
  { painPoint: 'TOO_MANY_TOOLS', scenarioType: 'AGENTIC_LEAN', message: 'AI tools often replace multiple single-purpose tools with one capable platform' },

  // TOOLS_DONT_TALK
  { painPoint: 'TOOLS_DONT_TALK', scenarioType: 'NATIVE_INTEGRATOR', message: 'Every tool is selected for native integration quality — no more data silos' },
  { painPoint: 'TOOLS_DONT_TALK', scenarioType: 'MONO_STACK', message: 'Fewer tools means fewer integration points that can break' },
  { painPoint: 'TOOLS_DONT_TALK', scenarioType: 'AGENTIC_LEAN', message: 'AI tools often act as connective tissue between your workflow phases' },

  // OVERPAYING
  { painPoint: 'OVERPAYING', scenarioType: 'MONO_STACK', message: 'Consolidation eliminates redundant subscriptions, directly cutting costs' },
  { painPoint: 'OVERPAYING', scenarioType: 'AGENTIC_LEAN', message: 'AI automation reduces headcount needs, offsetting tool costs' },

  // TOO_MUCH_MANUAL_WORK
  { painPoint: 'TOO_MUCH_MANUAL_WORK', scenarioType: 'AGENTIC_LEAN', message: 'AI agents handle repetitive tasks end-to-end, freeing your team for creative work' },
  { painPoint: 'TOO_MUCH_MANUAL_WORK', scenarioType: 'NATIVE_INTEGRATOR', message: 'Native integrations automate handoffs between tools — less copy-paste' },

  // DISORGANIZED
  { painPoint: 'DISORGANIZED', scenarioType: 'MONO_STACK', message: 'Single hub means one place to find everything — no more scattered information' },
  { painPoint: 'DISORGANIZED', scenarioType: 'NATIVE_INTEGRATOR', message: 'Specialized tools with strong integrations keep data organized and accessible' },

  // SLOW_APPROVALS
  { painPoint: 'SLOW_APPROVALS', scenarioType: 'AGENTIC_LEAN', message: 'AI can pre-review and fast-track approvals, reducing bottlenecks' },
  { painPoint: 'SLOW_APPROVALS', scenarioType: 'NATIVE_INTEGRATOR', message: 'Integrated notification workflows keep approvals moving without manual nudges' },

  // NO_VISIBILITY
  { painPoint: 'NO_VISIBILITY', scenarioType: 'NATIVE_INTEGRATOR', message: 'Best-of-breed analytics tools provide deep visibility across your workflow' },
  { painPoint: 'NO_VISIBILITY', scenarioType: 'AGENTIC_LEAN', message: 'AI-powered analytics surface insights you\'d miss with manual reporting' },
];

/**
 * Build a scenario rationale with both static and personalized content.
 */
export function buildScenarioRationale(
  scenarioType: ScenarioType,
  assessment: AssessmentInput
): ScenarioRationale {
  const data = SCENARIO_RATIONALE_DATA[scenarioType] || SCENARIO_RATIONALE_DATA.MONO_STACK;

  // Find personalized messages based on user's pain points + this scenario type
  const bestForUser: string[] = [];
  for (const rule of USER_RELEVANCE_RULES) {
    if (
      rule.scenarioType === scenarioType &&
      assessment.painPoints.includes(rule.painPoint)
    ) {
      bestForUser.push(rule.message);
    }
  }

  return {
    goal: data.goal,
    keyPrinciple: data.keyPrinciple,
    bestForGeneric: data.bestForGeneric,
    bestForUser,
    decisionFraming: data.decisionFraming,
    complexityNote: data.complexityNote,
  };
}
