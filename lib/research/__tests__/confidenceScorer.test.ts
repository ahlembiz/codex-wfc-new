import { describe, it, expect } from 'vitest';
import { calculateConfidence, quickConfidenceEstimate } from '../analyzers/confidenceScorer';

describe('calculateConfidence', () => {
  it('should return a score between 0 and 100', () => {
    const { score } = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit'],
      sampleSize: 5,
      crossReferenceCount: 2,
      segmentsRepresented: 3,
      totalSegments: 8,
      newestDataAgeInDays: 30,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.5,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give high scores for diverse, large, recent, unbiased data', () => {
    const { score } = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit', 'hackernews', 'zapier_templates', 'g2_reviews'],
      sampleSize: 30,
      crossReferenceCount: 5,
      segmentsRepresented: 8,
      totalSegments: 8,
      newestDataAgeInDays: 7,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.3,
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('should give low scores for sparse, biased data', () => {
    const { score } = calculateConfidence({
      sourceTypes: ['youtube_transcript'],
      sampleSize: 1,
      crossReferenceCount: 0,
      segmentsRepresented: 1,
      totalSegments: 8,
      newestDataAgeInDays: 200,
      sponsoredRatio: 0.8,
      affiliateRatio: 0.6,
      singleSourceDominance: 1.0,
    });
    expect(score).toBeLessThan(30);
  });

  it('should apply sponsorship penalties', () => {
    const baseline = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit'],
      sampleSize: 10,
      crossReferenceCount: 3,
      segmentsRepresented: 4,
      totalSegments: 8,
      newestDataAgeInDays: 30,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.5,
    });

    const sponsored = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit'],
      sampleSize: 10,
      crossReferenceCount: 3,
      segmentsRepresented: 4,
      totalSegments: 8,
      newestDataAgeInDays: 30,
      sponsoredRatio: 0.6,
      affiliateRatio: 0,
      singleSourceDominance: 0.5,
    });

    expect(sponsored.score).toBeLessThan(baseline.score);
    expect(sponsored.factors.penalties).toBeLessThan(0);
  });

  it('should apply single-source dominance penalty', () => {
    const diverse = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit', 'hackernews'],
      sampleSize: 10,
      crossReferenceCount: 3,
      segmentsRepresented: 4,
      totalSegments: 8,
      newestDataAgeInDays: 30,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.3,
    });

    const dominated = calculateConfidence({
      sourceTypes: ['youtube_transcript', 'reddit', 'hackernews'],
      sampleSize: 10,
      crossReferenceCount: 3,
      segmentsRepresented: 4,
      totalSegments: 8,
      newestDataAgeInDays: 30,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.9,
    });

    expect(dominated.score).toBeLessThan(diverse.score);
  });

  it('should penalize old data', () => {
    const recent = calculateConfidence({
      sourceTypes: ['youtube_transcript'],
      sampleSize: 5,
      crossReferenceCount: 1,
      segmentsRepresented: 2,
      totalSegments: 8,
      newestDataAgeInDays: 10,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.5,
    });

    const old = calculateConfidence({
      sourceTypes: ['youtube_transcript'],
      sampleSize: 5,
      crossReferenceCount: 1,
      segmentsRepresented: 2,
      totalSegments: 8,
      newestDataAgeInDays: 400,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.5,
    });

    expect(old.factors.recency).toBeLessThan(recent.factors.recency);
  });

  it('should never exceed 100 even with perfect inputs', () => {
    const { score } = calculateConfidence({
      sourceTypes: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      sampleSize: 100,
      crossReferenceCount: 10,
      segmentsRepresented: 8,
      totalSegments: 8,
      newestDataAgeInDays: 1,
      sponsoredRatio: 0,
      affiliateRatio: 0,
      singleSourceDominance: 0.1,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should clamp to 0 with worst-case inputs', () => {
    const { score } = calculateConfidence({
      sourceTypes: [],
      sampleSize: 0,
      crossReferenceCount: 0,
      segmentsRepresented: 0,
      totalSegments: 0,
      newestDataAgeInDays: 500,
      sponsoredRatio: 1,
      affiliateRatio: 1,
      singleSourceDominance: 1,
    });
    expect(score).toBe(0);
  });
});

describe('quickConfidenceEstimate', () => {
  it('should return 0 for no sources', () => {
    expect(quickConfidenceEstimate(0, [])).toBe(0);
  });

  it('should give bonus for sufficient data and diversity', () => {
    const withBonus = quickConfidenceEstimate(5, ['youtube', 'reddit']);
    const withoutBonus = quickConfidenceEstimate(3, ['youtube']);
    expect(withBonus).toBeGreaterThan(withoutBonus);
  });

  it('should cap at 100', () => {
    const result = quickConfidenceEstimate(100, ['a', 'b', 'c', 'd', 'e']);
    expect(result).toBeLessThanOrEqual(100);
  });
});
