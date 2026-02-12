/**
 * ToolPhaseResolver - Data-driven tool-to-phase mapping using DB models
 * (ToolPhaseCapability, WorkflowBucket, PhaseToolRecommendation).
 * Falls back to hardcoded DEFAULT_PHASE_CATEGORY_MAP when no DB data exists.
 */

import { prisma } from '../db';
import { getPhaseRecommendationService } from '../services/phaseRecommendationService';
import type { Tool, WorkflowPhase } from '@prisma/client';

// Hardcoded fallback — preserves explicit ordering from the original scenarioBuilder
export const DEFAULT_PHASE_CATEGORY_MAP: Record<string, string[]> = {
  'Discover': ['DOCUMENTATION', 'AI_ASSISTANTS', 'GROWTH'],
  'Decide':   ['PROJECT_MANAGEMENT', 'DOCUMENTATION', 'AI_ASSISTANTS'],
  'Design':   ['DESIGN', 'AI_BUILDERS'],
  'Build':    ['DEVELOPMENT', 'AI_BUILDERS', 'AI_ASSISTANTS', 'PROJECT_MANAGEMENT'],
  'Launch':   ['DEVELOPMENT', 'AUTOMATION', 'ANALYTICS'],
  'Review':   ['MEETINGS', 'COMMUNICATION', 'ANALYTICS'],
  'Iterate':  ['ANALYTICS', 'GROWTH', 'PROJECT_MANAGEMENT', 'DOCUMENTATION'],
};

// Known multi-phase tools — fallback for when DB has no ToolPhaseCapability data
const DEFAULT_MULTI_PHASE_TOOLS = ['notion', 'clickup', 'linear', 'asana', 'monday'];

// Map DB phase enum (UPPERCASE) to display name (Title case)
const PHASE_ENUM_TO_DISPLAY: Record<string, string> = {
  DISCOVER: 'Discover', DECIDE: 'Decide', DESIGN: 'Design', BUILD: 'Build',
  LAUNCH: 'Launch', REVIEW: 'Review', ITERATE: 'Iterate',
};

export class ToolPhaseResolver {
  private phaseRecommendationService = getPhaseRecommendationService();

  /**
   * Find tools from the allowed set that cover at least `minPhases` phases.
   * Uses ToolPhaseCapability data, falling back to PhaseToolRecommendation,
   * then to the hardcoded list.
   */
  async findMultiPhaseTools(allowedToolIds: string[], minPhases = 3): Promise<Tool[]> {
    try {
      // Try ToolPhaseCapability first (richest data)
      const capabilities = await prisma.toolPhaseCapability.findMany({
        where: { toolId: { in: allowedToolIds } },
        include: { tool: true, bucket: { select: { phase: true } } },
      });

      if (capabilities.length > 0) {
        const toolPhaseMap = new Map<string, { tool: Tool; phases: Set<string> }>();
        for (const cap of capabilities) {
          const existing = toolPhaseMap.get(cap.toolId);
          if (existing) {
            existing.phases.add(cap.bucket.phase);
          } else {
            toolPhaseMap.set(cap.toolId, { tool: cap.tool, phases: new Set([cap.bucket.phase]) });
          }
        }
        const result: Tool[] = [];
        for (const { tool, phases } of toolPhaseMap.values()) {
          if (phases.size >= minPhases) result.push(tool);
        }
        if (result.length > 0) return result;
      }

      // Fallback to PhaseToolRecommendation
      const allPhases: WorkflowPhase[] = ['DISCOVER', 'DECIDE', 'DESIGN', 'BUILD', 'LAUNCH', 'REVIEW', 'ITERATE'];
      const multiPhaseTools = await this.phaseRecommendationService.findMultiPhaseTool(
        allPhases.slice(0, minPhases)
      );
      const allowedSet = new Set(allowedToolIds);
      const fromRecs = multiPhaseTools.filter(t => allowedSet.has(t.id));
      if (fromRecs.length > 0) return fromRecs;
    } catch (error) {
      console.error('ToolPhaseResolver: DB query failed, using fallback:', error);
    }

    // Final fallback: return nothing, let caller use DEFAULT_MULTI_PHASE_TOOLS
    return [];
  }

  /**
   * Derive the phase→category map from ToolPhaseCapability + WorkflowBucket data.
   * Categories are ordered by frequency of capability entries per category.
   * Falls back to DEFAULT_PHASE_CATEGORY_MAP for phases with no data.
   */
  async getPhaseCategoryMap(): Promise<Record<string, string[]>> {
    try {
      const capabilities = await prisma.toolPhaseCapability.findMany({
        include: {
          tool: { select: { category: true } },
          bucket: { select: { phase: true } },
        },
      });

      if (capabilities.length === 0) return { ...DEFAULT_PHASE_CATEGORY_MAP };

      // Count categories per phase
      const phaseCategoryCounts = new Map<string, Map<string, number>>();
      for (const cap of capabilities) {
        const displayPhase = PHASE_ENUM_TO_DISPLAY[cap.bucket.phase] || cap.bucket.phase;
        if (!phaseCategoryCounts.has(displayPhase)) {
          phaseCategoryCounts.set(displayPhase, new Map());
        }
        const counts = phaseCategoryCounts.get(displayPhase)!;
        counts.set(cap.tool.category, (counts.get(cap.tool.category) || 0) + 1);
      }

      // Build map: sort categories by frequency, use DEFAULT as tiebreaker
      const result: Record<string, string[]> = {};
      for (const [phase, defaultCategories] of Object.entries(DEFAULT_PHASE_CATEGORY_MAP)) {
        const counts = phaseCategoryCounts.get(phase);
        if (!counts || counts.size === 0) {
          result[phase] = defaultCategories;
          continue;
        }

        // Merge: DB categories sorted by frequency + default categories as tiebreaker
        const defaultOrder = new Map(defaultCategories.map((c, i) => [c, i]));
        const allCategories = new Set([...counts.keys(), ...defaultCategories]);
        const sorted = [...allCategories].sort((a, b) => {
          const countDiff = (counts.get(b) || 0) - (counts.get(a) || 0);
          if (countDiff !== 0) return countDiff;
          return (defaultOrder.get(a) ?? 99) - (defaultOrder.get(b) ?? 99);
        });
        result[phase] = sorted;
      }

      return result;
    } catch (error) {
      console.error('ToolPhaseResolver: getPhaseCategoryMap failed, using fallback:', error);
      return { ...DEFAULT_PHASE_CATEGORY_MAP };
    }
  }

  /**
   * Get the phases a specific tool covers, based on ToolPhaseCapability data.
   * Falls back to PhaseToolRecommendation, then to DEFAULT_MULTI_PHASE_TOOLS check.
   */
  async getToolPhaseCoverage(toolId: string): Promise<string[]> {
    try {
      const capabilities = await prisma.toolPhaseCapability.findMany({
        where: { toolId },
        include: { bucket: { select: { phase: true } } },
      });

      if (capabilities.length > 0) {
        const phases = new Set(capabilities.map(c => PHASE_ENUM_TO_DISPLAY[c.bucket.phase] || c.bucket.phase));
        return [...phases];
      }

      // Fallback to PhaseToolRecommendation
      const recPhases = await this.phaseRecommendationService.getToolPhases(toolId);
      if (recPhases.length > 0) {
        return recPhases.map(p => PHASE_ENUM_TO_DISPLAY[p] || p);
      }
    } catch (error) {
      console.error('ToolPhaseResolver: getToolPhaseCoverage failed:', error);
    }

    return [];
  }
}

// Singleton
let resolverInstance: ToolPhaseResolver | null = null;

export function getToolPhaseResolver(): ToolPhaseResolver {
  if (!resolverInstance) {
    resolverInstance = new ToolPhaseResolver();
  }
  return resolverInstance;
}
