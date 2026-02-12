/**
 * Co-occurrence mining — pure TypeScript, no AI calls.
 * Builds a weighted graph of tool co-occurrences from research data points
 * and detects clusters using a simple greedy community detection algorithm.
 */

interface CoOccurrenceEdge {
  toolA: string;
  toolB: string;
  weight: number;
  sources: string[];
}

interface DetectedCluster {
  tools: string[];
  totalWeight: number;
  avgWeight: number;
  sourceTypes: string[];
}

/**
 * Build a weighted co-occurrence graph from tool combination data.
 */
export function buildCoOccurrenceGraph(
  dataPoints: Array<{ tools: string[]; sourceType: string }>,
): CoOccurrenceEdge[] {
  const edgeMap = new Map<string, CoOccurrenceEdge>();

  for (const dp of dataPoints) {
    if (dp.tools.length < 2) continue;

    // Generate all pairs
    for (let i = 0; i < dp.tools.length; i++) {
      for (let j = i + 1; j < dp.tools.length; j++) {
        const [a, b] = [dp.tools[i], dp.tools[j]].sort();
        const key = `${a}::${b}`;

        const existing = edgeMap.get(key);
        if (existing) {
          existing.weight++;
          if (!existing.sources.includes(dp.sourceType)) {
            existing.sources.push(dp.sourceType);
          }
        } else {
          edgeMap.set(key, {
            toolA: a,
            toolB: b,
            weight: 1,
            sources: [dp.sourceType],
          });
        }
      }
    }
  }

  return Array.from(edgeMap.values()).sort((a, b) => b.weight - a.weight);
}

/**
 * Detect clusters from a co-occurrence graph using greedy expansion.
 * Starts from highest-weight edges and expands clusters greedily.
 */
export function detectClusters(
  edges: CoOccurrenceEdge[],
  minWeight: number = 2,
  maxClusterSize: number = 6,
): DetectedCluster[] {
  const clusters: DetectedCluster[] = [];
  const assigned = new Set<string>();

  // Build adjacency list for quick lookup
  const adjacency = new Map<string, Map<string, CoOccurrenceEdge>>();
  for (const edge of edges) {
    if (edge.weight < minWeight) continue;

    if (!adjacency.has(edge.toolA)) adjacency.set(edge.toolA, new Map());
    if (!adjacency.has(edge.toolB)) adjacency.set(edge.toolB, new Map());
    adjacency.get(edge.toolA)!.set(edge.toolB, edge);
    adjacency.get(edge.toolB)!.set(edge.toolA, edge);
  }

  // Process edges by weight (highest first)
  for (const edge of edges) {
    if (edge.weight < minWeight) continue;
    if (assigned.has(edge.toolA) && assigned.has(edge.toolB)) continue;

    // Start a new cluster from this edge
    const clusterTools = new Set([edge.toolA, edge.toolB]);
    const clusterEdges = [edge];
    const allSources = new Set(edge.sources);

    // Try to expand the cluster
    let expanded = true;
    while (expanded && clusterTools.size < maxClusterSize) {
      expanded = false;
      let bestCandidate: string | null = null;
      let bestScore = 0;

      for (const tool of clusterTools) {
        const neighbors = adjacency.get(tool);
        if (!neighbors) continue;

        for (const [neighbor, neighborEdge] of neighbors) {
          if (clusterTools.has(neighbor) || assigned.has(neighbor)) continue;

          // Score: how many existing cluster members is this neighbor connected to?
          let connectionsToCluster = 0;
          for (const existing of clusterTools) {
            if (adjacency.get(neighbor)?.has(existing)) {
              connectionsToCluster++;
            }
          }

          const score = connectionsToCluster * neighborEdge.weight;
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = neighbor;
          }
        }
      }

      if (bestCandidate && bestScore >= minWeight) {
        clusterTools.add(bestCandidate);
        expanded = true;

        // Add edges from this new member to existing cluster members
        for (const existing of clusterTools) {
          const e = adjacency.get(bestCandidate)?.get(existing);
          if (e) {
            clusterEdges.push(e);
            e.sources.forEach(s => allSources.add(s));
          }
        }
      }
    }

    // Only keep clusters with 2+ tools
    if (clusterTools.size >= 2) {
      const totalWeight = clusterEdges.reduce((sum, e) => sum + e.weight, 0);
      clusters.push({
        tools: Array.from(clusterTools).sort(),
        totalWeight,
        avgWeight: totalWeight / clusterEdges.length,
        sourceTypes: Array.from(allSources),
      });

      clusterTools.forEach(t => assigned.add(t));
    }
  }

  return clusters.sort((a, b) => b.totalWeight - a.totalWeight);
}
