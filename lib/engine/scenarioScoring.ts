/**
 * Scenario Scoring - Per-scenario weight profiles and multi-factor tool scoring.
 * Uses all 5 weight dimensions (integration, popularity, cost, fit, ai) plus
 * additive synergy and familiarity bonuses.
 */

import type { Tool } from '@prisma/client';
import type { WeightProfile } from '../../types';
import {
  PAIN_POINT_MODIFIERS,
  STAGE_WEIGHT_MODIFIERS,
  COST_SENSITIVITY_MODIFIERS,
  PHILOSOPHY_MODIFIERS,
} from '../constants';

// Per-scenario base weights (before modulation by assessment)
export const SCENARIO_BASE_WEIGHTS: Record<string, WeightProfile> = {
  MONO_STACK:        { integration: 0.35, cost: 0.25, fit: 0.25, popularity: 0.10, ai: 0.05 },
  NATIVE_INTEGRATOR: { integration: 0.30, popularity: 0.30, fit: 0.20, cost: 0.10, ai: 0.10 },
  AGENTIC_LEAN:      { ai: 0.35, integration: 0.30, popularity: 0.15, fit: 0.10, cost: 0.10 },
  STARTER_PACK:      { fit: 0.30, cost: 0.25, popularity: 0.25, integration: 0.10, ai: 0.10 },
};

export interface ScenarioScoringContext {
  budgetPerUser: number;
  teamSizeEnum: string;
  stageEnum: string;
  philosophy: string;
  userToolIds: string[];
  integrationScore: number;
  synergyBonus: number;
}

export interface ToolScoreResult {
  compositeScore: number;
  breakdown: Record<string, number>;
}

/**
 * Build per-scenario weights by starting with SCENARIO_BASE_WEIGHTS and applying
 * modifiers from pain points, stage, cost sensitivity, and philosophy.
 * Result is normalized to sum = 1.0.
 */
export function buildScenarioWeights(
  scenarioType: string,
  assessment: {
    painPoints: string[];
    stage: string;
    costSensitivity: string;
    philosophy: string;
  }
): WeightProfile {
  const base = SCENARIO_BASE_WEIGHTS[scenarioType] || SCENARIO_BASE_WEIGHTS.NATIVE_INTEGRATOR;
  const weights: WeightProfile = { ...base };

  // Apply pain point modifiers
  for (const painPoint of assessment.painPoints) {
    const modifiers = PAIN_POINT_MODIFIERS[painPoint];
    if (modifiers) {
      for (const [key, value] of Object.entries(modifiers)) {
        if (key in weights && typeof value === 'number') {
          weights[key as keyof WeightProfile] += value;
        }
      }
    }
  }

  // Apply stage modifiers
  const stageModifiers = STAGE_WEIGHT_MODIFIERS[assessment.stage];
  if (stageModifiers) {
    for (const [key, value] of Object.entries(stageModifiers)) {
      if (key in weights && typeof value === 'number') {
        weights[key as keyof WeightProfile] += value;
      }
    }
  }

  // Apply cost sensitivity modifiers
  const costModifiers = COST_SENSITIVITY_MODIFIERS[assessment.costSensitivity];
  if (costModifiers) {
    for (const [key, value] of Object.entries(costModifiers)) {
      if (key in weights && typeof value === 'number') {
        weights[key as keyof WeightProfile] += value;
      }
    }
  }

  // Apply philosophy modifiers
  const philModifiers = PHILOSOPHY_MODIFIERS[assessment.philosophy];
  if (philModifiers) {
    for (const [key, value] of Object.entries(philModifiers)) {
      if (key in weights && typeof value === 'number') {
        weights[key as keyof WeightProfile] += value;
      }
    }
  }

  // Normalize: clamp negatives to 0, then divide by sum
  return normalizeWeights(weights);
}

/**
 * Score a tool for a specific scenario using all 5 weight dimensions
 * plus additive synergy and familiarity bonuses.
 */
export function scoreToolForScenario(
  tool: Tool,
  weights: WeightProfile,
  context: ScenarioScoringContext
): ToolScoreResult {
  // Fit score: 50pts teamSize match + 50pts stage match
  const sizeMatch = tool.bestForTeamSize.length === 0 || (tool.bestForTeamSize as string[]).includes(context.teamSizeEnum) ? 50 : 0;
  const stageMatch = tool.bestForStage.length === 0 || (tool.bestForStage as string[]).includes(context.stageEnum) ? 50 : 0;
  const fitScore = sizeMatch + stageMatch;

  // Popularity score: stored composite 0-100
  const popularityScore = tool.popularityScore ?? 50;

  // Cost score: ratio-based (reused from decisionPipeline.scoreAndRankTools)
  const costScore = computeCostScore(tool, context.budgetPerUser);

  // AI readiness: features x philosophy alignment
  const aiScore = computeAiScore(tool, context.philosophy);

  // Integration score: passed in from caller (already computed)
  const integrationScore = context.integrationScore;

  // Familiarity bonus (additive, not weighted)
  const familiarityBonus = getFamiliarityBonus(tool.id, context.userToolIds);

  // Synergy bonus (additive, not weighted)
  const synergyBonus = context.synergyBonus;

  // Weighted composite
  const weightedScore =
    fitScore * weights.fit +
    popularityScore * weights.popularity +
    costScore * weights.cost +
    aiScore * weights.ai +
    integrationScore * weights.integration;

  const compositeScore = weightedScore + synergyBonus + familiarityBonus;

  return {
    compositeScore,
    breakdown: {
      fitScore,
      popularityScore,
      costScore,
      aiScore,
      integrationScore,
      synergyBonus,
      familiarityBonus,
      weightedScore,
    },
  };
}

/**
 * Returns 8 if the user already has this tool (familiarity), 0 otherwise.
 */
export function getFamiliarityBonus(toolId: string, userToolIds: string[]): number {
  return userToolIds.includes(toolId) ? 8 : 0;
}

// ============================================
// Adaptive Tool Counts
// ============================================

export interface ToolRange { min: number; max: number; }

const TEAM_SIZE_BASE_RANGES: Record<string, ToolRange> = {
  SOLO:       { min: 2, max: 4 },
  SMALL:      { min: 3, max: 5 },
  MEDIUM:     { min: 4, max: 7 },
  LARGE:      { min: 5, max: 8 },
  ENTERPRISE: { min: 6, max: 10 },
};

const SCENARIO_RANGE_BIAS: Record<string, 'min' | 'mid' | 'max'> = {
  MONO_STACK: 'min',
  NATIVE_INTEGRATOR: 'mid',
  AGENTIC_LEAN: 'max',
  STARTER_PACK: 'min',
};

/**
 * Calculate the target tool count range based on team size, scenario type,
 * and pain points.
 */
export function calculateTargetToolRange(
  teamSize: string,
  scenarioType: string,
  painPoints: string[]
): ToolRange {
  const base = TEAM_SIZE_BASE_RANGES[teamSize] || TEAM_SIZE_BASE_RANGES.SMALL;
  let { min, max } = { ...base };

  // Scenario bias
  const bias = SCENARIO_RANGE_BIAS[scenarioType] || 'mid';
  if (bias === 'min') {
    max = Math.max(min, Math.ceil(min + (max - min) * 0.4));
  } else if (bias === 'max') {
    min = Math.max(min, Math.floor(min + (max - min) * 0.6));
  }
  // 'mid' keeps the range as-is

  // Pain point modifiers
  if (painPoints.includes('TOO_MANY_TOOLS')) {
    max = Math.max(min, max - 1);
  }
  if (painPoints.includes('OVERPAYING')) {
    max = Math.max(min, max - 1);
  }

  return { min, max };
}

/**
 * Calculate a quality floor from selected tool scores.
 * Returns mean - 1 standard deviation. Tools scoring below this are skipped.
 */
export function calculateQualityFloor(selectedScores: number[]): number {
  if (selectedScores.length === 0) return 0;
  if (selectedScores.length === 1) return selectedScores[0] * 0.7;

  const mean = selectedScores.reduce((s, v) => s + v, 0) / selectedScores.length;
  const variance = selectedScores.reduce((s, v) => s + (v - mean) ** 2, 0) / selectedScores.length;
  const stddev = Math.sqrt(variance);

  return mean - stddev;
}

// ============================================
// Internal helpers
// ============================================

function computeCostScore(tool: Tool, budgetPerUser: number): number {
  if (tool.hasFreeForever && (tool.estimatedCostPerUser === null || tool.estimatedCostPerUser === 0)) {
    return 90;
  }
  if (tool.estimatedCostPerUser === null) {
    return 60;
  }
  if (tool.estimatedCostPerUser <= budgetPerUser) {
    return 70 + 20 * (1 - tool.estimatedCostPerUser / Math.max(budgetPerUser, 1));
  }
  const overageRatio = (tool.estimatedCostPerUser - budgetPerUser) / Math.max(budgetPerUser, 1);
  return Math.max(10, 50 - overageRatio * 40);
}

function computeAiScore(tool: Tool, philosophy: string): number {
  if (tool.hasAiFeatures) {
    switch (philosophy) {
      case 'Auto-Pilot': return 100;
      case 'Hybrid': return 80;
      case 'Co-Pilot': return 60;
      default: return 50;
    }
  }
  return philosophy === 'Auto-Pilot' ? 10 : 30;
}

function normalizeWeights(weights: WeightProfile): WeightProfile {
  for (const key of Object.keys(weights) as (keyof WeightProfile)[]) {
    if (weights[key] < 0) weights[key] = 0;
  }
  const sum = Object.values(weights).reduce((s, w) => s + w, 0);
  if (sum > 0) {
    for (const key of Object.keys(weights) as (keyof WeightProfile)[]) {
      weights[key] = weights[key] / sum;
    }
  }
  return weights;
}
