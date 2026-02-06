import type { Tool } from '@prisma/client';
import { getCacheService } from './cacheService';

// Types for fuzzy matching
export interface ToolMatch {
  tool: Tool;
  confidence: number; // 0-1, 1 = exact match
  matchedOn: 'name' | 'alias' | 'fuzzy';
}

/**
 * ToolMatchingService - Fuzzy name matching and Levenshtein distance
 */
export class ToolMatchingService {
  private cache = getCacheService();

  /**
   * Match user-provided tool names to canonical tool IDs
   * Uses exact match, alias match, then fuzzy match
   */
  async matchToolNames(names: string[], allTools: Tool[]): Promise<Map<string, ToolMatch | null>> {
    const results = new Map<string, ToolMatch | null>();

    for (const name of names) {
      const normalized = name.toLowerCase().trim();

      // Check cache first
      const cachedId = await this.cache.getToolMatch(normalized);
      if (cachedId) {
        const tool = allTools.find(t => t.id === cachedId);
        if (tool) {
          results.set(name, { tool, confidence: 1, matchedOn: 'name' });
          continue;
        }
      }

      // Try exact name match
      const exactMatch = allTools.find(t => t.name === normalized);
      if (exactMatch) {
        results.set(name, { tool: exactMatch, confidence: 1, matchedOn: 'name' });
        await this.cache.setToolMatch(normalized, exactMatch.id);
        continue;
      }

      // Try alias match
      const aliasMatch = allTools.find(t =>
        t.aliases.some(alias => alias.toLowerCase() === normalized)
      );
      if (aliasMatch) {
        results.set(name, { tool: aliasMatch, confidence: 0.95, matchedOn: 'alias' });
        await this.cache.setToolMatch(normalized, aliasMatch.id);
        continue;
      }

      // Fuzzy match using Levenshtein distance
      const fuzzyMatch = this.findFuzzyMatch(normalized, allTools);
      if (fuzzyMatch) {
        results.set(name, fuzzyMatch);
        await this.cache.setToolMatch(normalized, fuzzyMatch.tool.id);
      } else {
        results.set(name, null);
      }
    }

    return results;
  }

  /**
   * Find best fuzzy match for a tool name
   */
  private findFuzzyMatch(name: string, tools: Tool[]): ToolMatch | null {
    let bestMatch: ToolMatch | null = null;
    let bestDistance = Infinity;
    const maxDistance = Math.max(2, Math.floor(name.length * 0.3)); // Allow 30% difference

    for (const tool of tools) {
      // Check against canonical name
      const nameDistance = this.levenshteinDistance(name, tool.name);
      if (nameDistance < bestDistance && nameDistance <= maxDistance) {
        bestDistance = nameDistance;
        bestMatch = {
          tool,
          confidence: 1 - (nameDistance / Math.max(name.length, tool.name.length)),
          matchedOn: 'fuzzy',
        };
      }

      // Check against display name
      const displayDistance = this.levenshteinDistance(name, tool.displayName.toLowerCase());
      if (displayDistance < bestDistance && displayDistance <= maxDistance) {
        bestDistance = displayDistance;
        bestMatch = {
          tool,
          confidence: 1 - (displayDistance / Math.max(name.length, tool.displayName.length)),
          matchedOn: 'fuzzy',
        };
      }

      // Check against aliases
      for (const alias of tool.aliases) {
        const aliasDistance = this.levenshteinDistance(name, alias.toLowerCase());
        if (aliasDistance < bestDistance && aliasDistance <= maxDistance) {
          bestDistance = aliasDistance;
          bestMatch = {
            tool,
            confidence: 1 - (aliasDistance / Math.max(name.length, alias.length)),
            matchedOn: 'fuzzy',
          };
        }
      }
    }

    // Only return matches with confidence > 0.6
    if (bestMatch && bestMatch.confidence > 0.6) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Levenshtein distance algorithm for fuzzy matching
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// Singleton instance
let matchingServiceInstance: ToolMatchingService | null = null;

export function getToolMatchingService(): ToolMatchingService {
  if (!matchingServiceInstance) {
    matchingServiceInstance = new ToolMatchingService();
  }
  return matchingServiceInstance;
}
