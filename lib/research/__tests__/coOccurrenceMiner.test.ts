import { describe, it, expect } from 'vitest';
import { buildCoOccurrenceGraph, detectClusters } from '../analyzers/coOccurrenceMiner';

describe('buildCoOccurrenceGraph', () => {
  it('should build edges from tool pairs', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['notion', 'linear'], sourceType: 'reddit' },
      { tools: ['notion', 'linear'], sourceType: 'youtube' },
      { tools: ['notion', 'slack'], sourceType: 'reddit' },
    ]);

    expect(edges).toHaveLength(2);
    const notionLinear = edges.find(e => e.toolA === 'linear' && e.toolB === 'notion');
    expect(notionLinear?.weight).toBe(2);
    expect(notionLinear?.sources).toContain('reddit');
    expect(notionLinear?.sources).toContain('youtube');
  });

  it('should sort edges by weight descending', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['a', 'b'], sourceType: 'reddit' },
      { tools: ['c', 'd'], sourceType: 'reddit' },
      { tools: ['c', 'd'], sourceType: 'youtube' },
      { tools: ['c', 'd'], sourceType: 'hackernews' },
    ]);

    expect(edges[0].weight).toBeGreaterThanOrEqual(edges[1].weight);
  });

  it('should skip single-tool data points', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['notion'], sourceType: 'reddit' },
    ]);
    expect(edges).toHaveLength(0);
  });

  it('should handle 3+ tools by generating all pairs', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['a', 'b', 'c'], sourceType: 'reddit' },
    ]);
    // 3 choose 2 = 3 pairs
    expect(edges).toHaveLength(3);
  });

  it('should return empty for empty input', () => {
    expect(buildCoOccurrenceGraph([])).toHaveLength(0);
  });
});

describe('detectClusters', () => {
  it('should detect a cluster from strong co-occurrences', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['notion', 'linear', 'github'], sourceType: 'reddit' },
      { tools: ['notion', 'linear', 'github'], sourceType: 'youtube' },
      { tools: ['notion', 'linear'], sourceType: 'hackernews' },
    ]);

    const clusters = detectClusters(edges, 2);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters[0].tools).toContain('notion');
    expect(clusters[0].tools).toContain('linear');
  });

  it('should not cluster tools below minWeight', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['a', 'b'], sourceType: 'reddit' },
    ]);

    const clusters = detectClusters(edges, 2);
    expect(clusters).toHaveLength(0);
  });

  it('should respect maxClusterSize', () => {
    const dataPoints = [];
    const tools = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let i = 0; i < 10; i++) {
      dataPoints.push({ tools, sourceType: 'reddit' });
    }

    const edges = buildCoOccurrenceGraph(dataPoints);
    const clusters = detectClusters(edges, 2, 4);

    for (const cluster of clusters) {
      expect(cluster.tools.length).toBeLessThanOrEqual(4);
    }
  });

  it('should include source types in cluster metadata', () => {
    const edges = buildCoOccurrenceGraph([
      { tools: ['notion', 'linear'], sourceType: 'reddit' },
      { tools: ['notion', 'linear'], sourceType: 'youtube' },
    ]);

    const clusters = detectClusters(edges, 2);
    if (clusters.length > 0) {
      expect(clusters[0].sourceTypes).toContain('reddit');
      expect(clusters[0].sourceTypes).toContain('youtube');
    }
  });

  it('should return empty for empty edges', () => {
    expect(detectClusters([], 2)).toHaveLength(0);
  });
});
