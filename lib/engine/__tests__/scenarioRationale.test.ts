import { describe, it, expect } from 'vitest';
import { buildScenarioRationale } from '../scenarioRationale';
import type { AssessmentInput } from '../decisionPipeline';
import { TeamSizeBucket } from '../../../types';

function createBaseAssessment(overrides: Partial<AssessmentInput> = {}): AssessmentInput {
  return {
    company: 'Test Co',
    stage: 'Pre-Seed',
    teamSize: TeamSizeBucket.Small,
    currentTools: '',
    philosophy: 'Hybrid',
    techSavviness: 'Decent',
    budgetPerUser: 50,
    costSensitivity: 'Balanced',
    sensitivity: 'Low-Stakes',
    highStakesRequirements: [],
    anchorType: "We're just starting! (no Anchor tool yet)",
    painPoints: [],
    otherAnchorText: '',
    ...overrides,
  };
}

describe('buildScenarioRationale', () => {
  it('returns correct static fields for MONO_STACK', () => {
    const rationale = buildScenarioRationale('MONO_STACK', createBaseAssessment());

    expect(rationale.goal).toContain('context-switching');
    expect(rationale.keyPrinciple).toContain('workflow phases');
    expect(rationale.bestForGeneric).toHaveLength(3);
    expect(rationale.decisionFraming).toContain('simplicity');
    expect(rationale.complexityNote).toContain('Lowest');
  });

  it('returns correct static fields for NATIVE_INTEGRATOR', () => {
    const rationale = buildScenarioRationale('NATIVE_INTEGRATOR', createBaseAssessment());

    expect(rationale.goal).toContain('Best-of-breed');
    expect(rationale.keyPrinciple).toContain('specialized');
    expect(rationale.bestForGeneric).toHaveLength(3);
    expect(rationale.decisionFraming).toContain('best tool');
    expect(rationale.complexityNote).toContain('Moderate');
  });

  it('returns correct static fields for AGENTIC_LEAN', () => {
    const rationale = buildScenarioRationale('AGENTIC_LEAN', createBaseAssessment());

    expect(rationale.goal).toContain('AI automation');
    expect(rationale.keyPrinciple).toContain('AI capabilities');
    expect(rationale.bestForGeneric).toHaveLength(3);
    expect(rationale.decisionFraming).toContain('AI');
    expect(rationale.complexityNote).toContain('capability complexity');
  });

  it('returns correct static fields for STARTER_PACK', () => {
    const rationale = buildScenarioRationale('STARTER_PACK', createBaseAssessment());

    expect(rationale.goal).toContain('essential tools');
    expect(rationale.keyPrinciple).toContain('basics');
  });

  it('includes personalized message when TOO_MANY_TOOLS + MONO_STACK', () => {
    const rationale = buildScenarioRationale(
      'MONO_STACK',
      createBaseAssessment({ painPoints: ['TOO_MANY_TOOLS'] })
    );

    expect(rationale.bestForUser.length).toBeGreaterThan(0);
    expect(rationale.bestForUser[0]).toContain('consolidation');
  });

  it('includes personalized message when TOOLS_DONT_TALK + NATIVE_INTEGRATOR', () => {
    const rationale = buildScenarioRationale(
      'NATIVE_INTEGRATOR',
      createBaseAssessment({ painPoints: ['TOOLS_DONT_TALK'] })
    );

    expect(rationale.bestForUser.length).toBeGreaterThan(0);
    expect(rationale.bestForUser[0]).toContain('native integration');
  });

  it('includes personalized message when TOO_MUCH_MANUAL_WORK + AGENTIC_LEAN', () => {
    const rationale = buildScenarioRationale(
      'AGENTIC_LEAN',
      createBaseAssessment({ painPoints: ['TOO_MUCH_MANUAL_WORK'] })
    );

    expect(rationale.bestForUser.length).toBeGreaterThan(0);
    expect(rationale.bestForUser[0]).toContain('AI agents');
  });

  it('returns empty bestForUser when no pain points match', () => {
    const rationale = buildScenarioRationale(
      'MONO_STACK',
      createBaseAssessment({ painPoints: [] })
    );

    expect(rationale.bestForUser).toEqual([]);
  });

  it('returns multiple bestForUser messages for multiple matching pain points', () => {
    const rationale = buildScenarioRationale(
      'MONO_STACK',
      createBaseAssessment({ painPoints: ['TOO_MANY_TOOLS', 'OVERPAYING', 'DISORGANIZED'] })
    );

    expect(rationale.bestForUser.length).toBe(3);
  });

  it('returns empty bestForUser when pain points exist but dont match scenario', () => {
    // NO_VISIBILITY has no rule for MONO_STACK
    const rationale = buildScenarioRationale(
      'MONO_STACK',
      createBaseAssessment({ painPoints: ['NO_VISIBILITY'] })
    );

    expect(rationale.bestForUser).toEqual([]);
  });
});
