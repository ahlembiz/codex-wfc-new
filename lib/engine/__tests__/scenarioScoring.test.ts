import { describe, it, expect } from 'vitest';
import {
  buildScenarioWeights,
  scoreToolForScenario,
  getFamiliarityBonus,
  calculateTargetToolRange,
  calculateQualityFloor,
  SCENARIO_BASE_WEIGHTS,
} from '../scenarioScoring';
import { createMockTool } from '../../test/factories';

describe('SCENARIO_BASE_WEIGHTS', () => {
  it('each scenario type sums to 1.0', () => {
    for (const [type, weights] of Object.entries(SCENARIO_BASE_WEIGHTS)) {
      const sum = weights.fit + weights.popularity + weights.cost + weights.ai + weights.integration;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });
});

describe('buildScenarioWeights', () => {
  const baseAssessment = {
    painPoints: [] as string[],
    stage: 'Pre-Seed',
    costSensitivity: 'Balanced',
    philosophy: 'Hybrid',
  };

  it('returns base weights with no modifiers, normalized to 1.0', () => {
    const weights = buildScenarioWeights('MONO_STACK', baseAssessment);
    const sum = weights.fit + weights.popularity + weights.cost + weights.ai + weights.integration;
    expect(sum).toBeCloseTo(1.0, 5);
    // Should match MONO_STACK base weights since no modifiers
    expect(weights.integration).toBeCloseTo(SCENARIO_BASE_WEIGHTS.MONO_STACK.integration, 2);
  });

  it('with costSensitivity=Price-First increases cost weight', () => {
    const base = buildScenarioWeights('NATIVE_INTEGRATOR', baseAssessment);
    const priceFirst = buildScenarioWeights('NATIVE_INTEGRATOR', {
      ...baseAssessment,
      costSensitivity: 'Price-First',
    });
    expect(priceFirst.cost).toBeGreaterThan(base.cost);
  });

  it('with costSensitivity=Value-First decreases cost and increases fit', () => {
    const base = buildScenarioWeights('NATIVE_INTEGRATOR', baseAssessment);
    const valueFocused = buildScenarioWeights('NATIVE_INTEGRATOR', {
      ...baseAssessment,
      costSensitivity: 'Value-First',
    });
    expect(valueFocused.fit).toBeGreaterThan(base.fit);
  });

  it('with philosophy=Auto-Pilot increases ai weight', () => {
    const base = buildScenarioWeights('NATIVE_INTEGRATOR', baseAssessment);
    const autoPilot = buildScenarioWeights('NATIVE_INTEGRATOR', {
      ...baseAssessment,
      philosophy: 'Auto-Pilot',
    });
    expect(autoPilot.ai).toBeGreaterThan(base.ai);
  });

  it('with philosophy=Co-Pilot decreases ai and increases popularity', () => {
    const base = buildScenarioWeights('NATIVE_INTEGRATOR', baseAssessment);
    const coPilot = buildScenarioWeights('NATIVE_INTEGRATOR', {
      ...baseAssessment,
      philosophy: 'Co-Pilot',
    });
    // Co-Pilot: ai: -0.10, popularity: +0.10
    expect(coPilot.popularity).toBeGreaterThan(base.popularity);
  });

  it('always normalizes to sum = 1.0 even with many modifiers', () => {
    const weights = buildScenarioWeights('AGENTIC_LEAN', {
      painPoints: ['TOO_MANY_TOOLS', 'TOOLS_DONT_TALK', 'OVERPAYING', 'TOO_MUCH_MANUAL_WORK'],
      stage: 'Bootstrapping',
      costSensitivity: 'Price-First',
      philosophy: 'Auto-Pilot',
    });
    const sum = weights.fit + weights.popularity + weights.cost + weights.ai + weights.integration;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('clamps negative weights to 0', () => {
    // Co-Pilot has ai: -0.10. MONO_STACK has ai: 0.05. After modifier = -0.05 → clamped to 0
    const weights = buildScenarioWeights('MONO_STACK', {
      ...baseAssessment,
      philosophy: 'Co-Pilot',
    });
    expect(weights.ai).toBeGreaterThanOrEqual(0);
    const sum = weights.fit + weights.popularity + weights.cost + weights.ai + weights.integration;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe('scoreToolForScenario', () => {
  const baseContext = {
    budgetPerUser: 50,
    teamSizeEnum: 'SMALL',
    stageEnum: 'PRE_SEED',
    philosophy: 'Hybrid',
    userToolIds: [] as string[],
    integrationScore: 50,
    synergyBonus: 0,
  };

  it('favors cheaper tools when cost weight is high', () => {
    const costWeights = { fit: 0.10, popularity: 0.10, cost: 0.60, ai: 0.10, integration: 0.10 };

    const cheapTool = createMockTool({ id: 'cheap', estimatedCostPerUser: 5, hasFreeForever: false });
    const expensiveTool = createMockTool({ id: 'expensive', estimatedCostPerUser: 100, hasFreeForever: false });

    const cheapScore = scoreToolForScenario(cheapTool, costWeights, baseContext);
    const expensiveScore = scoreToolForScenario(expensiveTool, costWeights, baseContext);

    expect(cheapScore.compositeScore).toBeGreaterThan(expensiveScore.compositeScore);
  });

  it('favors AI tools when ai weight is high', () => {
    const aiWeights = { fit: 0.10, popularity: 0.10, cost: 0.10, ai: 0.60, integration: 0.10 };

    const aiTool = createMockTool({ id: 'ai-tool', hasAiFeatures: true });
    const noAiTool = createMockTool({ id: 'no-ai-tool', hasAiFeatures: false });

    const aiScore = scoreToolForScenario(aiTool, aiWeights, {
      ...baseContext,
      philosophy: 'Auto-Pilot',
    });
    const noAiScore = scoreToolForScenario(noAiTool, aiWeights, {
      ...baseContext,
      philosophy: 'Auto-Pilot',
    });

    expect(aiScore.compositeScore).toBeGreaterThan(noAiScore.compositeScore);
  });

  it('includes synergy bonus in composite score', () => {
    const weights = { fit: 0.20, popularity: 0.20, cost: 0.20, ai: 0.20, integration: 0.20 };
    const tool = createMockTool({ id: 'tool-1' });

    const withoutSynergy = scoreToolForScenario(tool, weights, { ...baseContext, synergyBonus: 0 });
    const withSynergy = scoreToolForScenario(tool, weights, { ...baseContext, synergyBonus: 10 });

    expect(withSynergy.compositeScore).toBe(withoutSynergy.compositeScore + 10);
  });

  it('includes familiarity bonus for user tools', () => {
    const weights = { fit: 0.20, popularity: 0.20, cost: 0.20, ai: 0.20, integration: 0.20 };
    const tool = createMockTool({ id: 'user-tool' });

    const notFamiliar = scoreToolForScenario(tool, weights, { ...baseContext, userToolIds: [] });
    const familiar = scoreToolForScenario(tool, weights, { ...baseContext, userToolIds: ['user-tool'] });

    expect(familiar.compositeScore).toBe(notFamiliar.compositeScore + 8);
  });

  it('breakdown includes all scoring components', () => {
    const weights = { fit: 0.20, popularity: 0.20, cost: 0.20, ai: 0.20, integration: 0.20 };
    const tool = createMockTool({ id: 'tool-1' });
    const result = scoreToolForScenario(tool, weights, baseContext);

    expect(result.breakdown).toHaveProperty('fitScore');
    expect(result.breakdown).toHaveProperty('popularityScore');
    expect(result.breakdown).toHaveProperty('costScore');
    expect(result.breakdown).toHaveProperty('aiScore');
    expect(result.breakdown).toHaveProperty('integrationScore');
    expect(result.breakdown).toHaveProperty('synergyBonus');
    expect(result.breakdown).toHaveProperty('familiarityBonus');
  });
});

describe('getFamiliarityBonus', () => {
  it('returns 8 for user tool', () => {
    expect(getFamiliarityBonus('tool-1', ['tool-1', 'tool-2'])).toBe(8);
  });

  it('returns 0 for non-user tool', () => {
    expect(getFamiliarityBonus('tool-3', ['tool-1', 'tool-2'])).toBe(0);
  });

  it('returns 0 for empty user tools', () => {
    expect(getFamiliarityBonus('tool-1', [])).toBe(0);
  });
});

describe('calculateTargetToolRange', () => {
  it('returns correct range for SOLO + MONO_STACK', () => {
    const range = calculateTargetToolRange('SOLO', 'MONO_STACK', []);
    expect(range.min).toBe(2);
    expect(range.max).toBeLessThanOrEqual(4);
    expect(range.max).toBeGreaterThanOrEqual(range.min);
  });

  it('returns correct range for MEDIUM + NATIVE_INTEGRATOR', () => {
    const range = calculateTargetToolRange('MEDIUM', 'NATIVE_INTEGRATOR', []);
    expect(range.min).toBe(4);
    expect(range.max).toBe(7);
  });

  it('returns larger range for ENTERPRISE + AGENTIC_LEAN', () => {
    const range = calculateTargetToolRange('ENTERPRISE', 'AGENTIC_LEAN', []);
    expect(range.min).toBeGreaterThanOrEqual(6);
    expect(range.max).toBeLessThanOrEqual(10);
  });

  it('reduces max by 1 when TOO_MANY_TOOLS pain point', () => {
    const base = calculateTargetToolRange('MEDIUM', 'NATIVE_INTEGRATOR', []);
    const reduced = calculateTargetToolRange('MEDIUM', 'NATIVE_INTEGRATOR', ['TOO_MANY_TOOLS']);
    expect(reduced.max).toBe(base.max - 1);
  });

  it('reduces max by 1 when OVERPAYING pain point', () => {
    const base = calculateTargetToolRange('MEDIUM', 'NATIVE_INTEGRATOR', []);
    const reduced = calculateTargetToolRange('MEDIUM', 'NATIVE_INTEGRATOR', ['OVERPAYING']);
    expect(reduced.max).toBe(base.max - 1);
  });

  it('stacks both pain point reductions', () => {
    const base = calculateTargetToolRange('LARGE', 'NATIVE_INTEGRATOR', []);
    const reduced = calculateTargetToolRange('LARGE', 'NATIVE_INTEGRATOR', ['TOO_MANY_TOOLS', 'OVERPAYING']);
    expect(reduced.max).toBe(base.max - 2);
  });

  it('never lets max go below min', () => {
    const range = calculateTargetToolRange('SOLO', 'MONO_STACK', ['TOO_MANY_TOOLS', 'OVERPAYING']);
    expect(range.max).toBeGreaterThanOrEqual(range.min);
  });
});

describe('calculateQualityFloor', () => {
  it('returns 0 for empty array', () => {
    expect(calculateQualityFloor([])).toBe(0);
  });

  it('returns 70% of single score', () => {
    expect(calculateQualityFloor([100])).toBeCloseTo(70, 0);
  });

  it('returns mean - 1 stddev for multiple scores', () => {
    // scores: [60, 80] → mean=70, var=100, stddev=10 → floor=60
    const floor = calculateQualityFloor([60, 80]);
    expect(floor).toBeCloseTo(60, 0);
  });

  it('returns mean - 1 stddev for uniform scores', () => {
    // All same score → stddev=0 → floor=mean
    const floor = calculateQualityFloor([50, 50, 50]);
    expect(floor).toBeCloseTo(50, 0);
  });

  it('returns reasonable floor for varied scores', () => {
    // scores: [40, 60, 80] → mean=60, var=266.67, stddev≈16.33 → floor≈43.67
    const floor = calculateQualityFloor([40, 60, 80]);
    expect(floor).toBeGreaterThan(40);
    expect(floor).toBeLessThan(60);
  });
});
