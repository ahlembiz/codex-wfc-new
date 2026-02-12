import type { ConfidenceFactors } from '../types';

/**
 * Calculate a confidence score (0-100) for a research entity (cluster or recipe).
 * Multi-factor formula with bias penalties.
 */
export function calculateConfidence(params: {
  sourceTypes: string[];
  sampleSize: number;
  crossReferenceCount: number;
  segmentsRepresented: number;
  totalSegments: number;
  newestDataAgeInDays: number;
  sponsoredRatio: number;      // 0-1: what % of data points are sponsored
  affiliateRatio: number;      // 0-1: what % of data points have affiliates
  singleSourceDominance: number; // 0-1: max % of data from one source type
}): { score: number; factors: ConfidenceFactors } {
  const {
    sourceTypes, sampleSize, crossReferenceCount,
    segmentsRepresented, totalSegments,
    newestDataAgeInDays, sponsoredRatio, affiliateRatio,
    singleSourceDominance,
  } = params;

  // Source diversity (0-25): more source types = higher score
  const sourceDiversity = Math.min(25, sourceTypes.length * 5);

  // Sample size (0-25): diminishing returns
  const sampleSize25 = Math.min(25, Math.round(25 * (1 - Math.exp(-sampleSize / 10))));

  // Cross-reference (0-20): corroboration across sources
  const crossReference = Math.min(20, crossReferenceCount * 4);

  // Segment coverage (0-15): what % of segments are represented
  const segmentRatio = totalSegments > 0 ? segmentsRepresented / totalSegments : 0;
  const segmentCoverage = Math.round(15 * segmentRatio);

  // Recency (0-15): fresher data = higher score
  let recency = 15;
  if (newestDataAgeInDays > 365) recency = 0;
  else if (newestDataAgeInDays > 180) recency = 5;
  else if (newestDataAgeInDays > 90) recency = 10;
  else if (newestDataAgeInDays > 30) recency = 12;

  // Penalties (0 to -30)
  let penalties = 0;
  if (sponsoredRatio > 0.5) penalties -= 15;
  else if (sponsoredRatio > 0.2) penalties -= 8;
  else if (sponsoredRatio > 0) penalties -= 3;

  if (affiliateRatio > 0.5) penalties -= 10;
  else if (affiliateRatio > 0.2) penalties -= 5;

  if (singleSourceDominance > 0.8) penalties -= 10;
  else if (singleSourceDominance > 0.6) penalties -= 5;

  const factors: ConfidenceFactors = {
    sourceDiversity,
    sampleSize: sampleSize25,
    crossReference,
    segmentCoverage,
    recency,
    penalties,
  };

  const raw = sourceDiversity + sampleSize25 + crossReference + segmentCoverage + recency + penalties;
  const score = Math.max(0, Math.min(100, raw));

  return { score, factors };
}

/**
 * Quick confidence estimate when full data isn't available.
 * Uses simple heuristics based on source count and types.
 */
export function quickConfidenceEstimate(sourceCount: number, sourceTypes: string[]): number {
  const base = Math.min(50, sourceCount * 5);
  const diversity = Math.min(30, sourceTypes.length * 10);
  const bonus = sourceCount >= 5 && sourceTypes.length >= 2 ? 20 : 0;
  return Math.min(100, base + diversity + bonus);
}
