export interface PopularitySubScores {
  popularityAdoption?: number;
  popularitySentiment?: number;
  popularityMomentum?: number;
  popularityEcosystem?: number;
  popularityReliability?: number;
}

export const POPULARITY_WEIGHTS = {
  adoption: 0.30,
  sentiment: 0.20,
  momentum: 0.20,
  ecosystem: 0.15,
  reliability: 0.15,
} as const;

/**
 * Validate a single sub-score value (integer 0-100).
 * Returns the clamped integer or throws if not a valid number.
 */
export function validateSubScore(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${field} must be a finite number`);
  }
  const int = Math.round(num);
  if (int < 0 || int > 100) {
    throw new Error(`${field} must be between 0 and 100`);
  }
  return int;
}

/**
 * Compute the weighted composite popularity score from sub-scores.
 * All inputs default to 50 if not provided. Result is clamped 0-100.
 */
export function computePopularityScore(scores: PopularitySubScores): number {
  const adoption = scores.popularityAdoption ?? 50;
  const sentiment = scores.popularitySentiment ?? 50;
  const momentum = scores.popularityMomentum ?? 50;
  const ecosystem = scores.popularityEcosystem ?? 50;
  const reliability = scores.popularityReliability ?? 50;

  const composite = Math.round(
    adoption * POPULARITY_WEIGHTS.adoption +
    sentiment * POPULARITY_WEIGHTS.sentiment +
    momentum * POPULARITY_WEIGHTS.momentum +
    ecosystem * POPULARITY_WEIGHTS.ecosystem +
    reliability * POPULARITY_WEIGHTS.reliability
  );

  return Math.max(0, Math.min(100, composite));
}

/** The 5 sub-score field names on the Tool model. */
export const POPULARITY_SUB_SCORE_FIELDS = [
  'popularityAdoption',
  'popularitySentiment',
  'popularityMomentum',
  'popularityEcosystem',
  'popularityReliability',
] as const;
