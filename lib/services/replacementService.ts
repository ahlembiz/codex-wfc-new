import { prisma } from '../db';
import type { Tool, ToolReplacement, ReplacementReasonType } from '@prisma/client';

export interface ReplacementSuggestion {
  fromTool: Tool;
  toTool: Tool;
  reasonType: ReplacementReasonType;
  reasonText: string;
  context: string | null;
  conditions: Record<string, unknown> | null;
}

export interface ReplacementContext {
  costSensitivity?: 'PRICE_FIRST' | 'BALANCED' | 'VALUE_FIRST';
  techSavviness?: 'NEWBIE' | 'DECENT' | 'NINJA';
  teamSize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  requiresCompliance?: string[];
  preferAiNative?: boolean;
}

/**
 * ReplacementService - Suggest tool replacements based on rules and context
 */
export class ReplacementService {
  /**
   * Find all replacement rules for a given tool
   */
  async findReplacementsFor(toolId: string): Promise<ReplacementSuggestion[]> {
    const replacements = await prisma.toolReplacement.findMany({
      where: { fromToolId: toolId },
      include: {
        fromTool: true,
        toTool: true,
      },
    });

    return replacements.map(r => ({
      fromTool: r.fromTool,
      toTool: r.toTool,
      reasonType: r.reasonType,
      reasonText: r.reasonText,
      context: r.context,
      conditions: r.conditions as Record<string, unknown> | null,
    }));
  }

  /**
   * Find the best replacement for a tool given context
   */
  async findBestReplacement(
    toolId: string,
    context: ReplacementContext
  ): Promise<ReplacementSuggestion | null> {
    const replacements = await this.findReplacementsFor(toolId);

    if (replacements.length === 0) return null;

    // Score each replacement based on context match
    const scored = replacements.map(r => ({
      replacement: r,
      score: this.scoreReplacement(r, context),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return the best match if it passes minimum threshold
    const best = scored[0];
    if (best.score > 0) {
      return best.replacement;
    }

    // Return the first one as default if no context match
    return replacements[0];
  }

  /**
   * Find all applicable replacements for a set of tools
   */
  async findReplacementsForSet(
    toolIds: string[],
    context: ReplacementContext
  ): Promise<Map<string, ReplacementSuggestion[]>> {
    const result = new Map<string, ReplacementSuggestion[]>();

    const allReplacements = await prisma.toolReplacement.findMany({
      where: { fromToolId: { in: toolIds } },
      include: {
        fromTool: true,
        toTool: true,
      },
    });

    for (const toolId of toolIds) {
      const toolReplacements = allReplacements
        .filter(r => r.fromToolId === toolId)
        .map(r => ({
          fromTool: r.fromTool,
          toTool: r.toTool,
          reasonType: r.reasonType,
          reasonText: r.reasonText,
          context: r.context,
          conditions: r.conditions as Record<string, unknown> | null,
        }))
        .filter(r => this.matchesContext(r, context));

      if (toolReplacements.length > 0) {
        result.set(toolId, toolReplacements);
      }
    }

    return result;
  }

  /**
   * Check if a replacement matches the given context
   */
  private matchesContext(
    replacement: ReplacementSuggestion,
    context: ReplacementContext
  ): boolean {
    if (!replacement.conditions) return true;

    const conditions = replacement.conditions;

    // Check cost sensitivity
    if (conditions.costSensitivity && context.costSensitivity) {
      const required = conditions.costSensitivity as string[];
      if (Array.isArray(required) && !required.includes(context.costSensitivity)) {
        return false;
      }
    }

    // Check tech savviness
    if (conditions.techSavviness && context.techSavviness) {
      const required = conditions.techSavviness as string[];
      if (Array.isArray(required) && !required.includes(context.techSavviness)) {
        return false;
      }
    }

    // Check team size
    if (conditions.teamSize && context.teamSize) {
      const required = conditions.teamSize as string[];
      if (Array.isArray(required) && !required.includes(context.teamSize)) {
        return false;
      }
    }

    // Check compliance requirements
    if (conditions.requiresCompliance && context.requiresCompliance) {
      const required = conditions.requiresCompliance as string[];
      const hasAll = required.every(c => context.requiresCompliance?.includes(c));
      if (!hasAll) return false;
    }

    // Check AI-native preference
    if (conditions.preferAiNative !== undefined && context.preferAiNative !== undefined) {
      if (conditions.preferAiNative !== context.preferAiNative) {
        return false;
      }
    }

    return true;
  }

  /**
   * Score a replacement based on how well it matches context
   */
  private scoreReplacement(
    replacement: ReplacementSuggestion,
    context: ReplacementContext
  ): number {
    let score = 0;

    // Base score for reason type matching context
    switch (replacement.reasonType) {
      case 'COST_SAVINGS':
        if (context.costSensitivity === 'PRICE_FIRST') score += 3;
        else if (context.costSensitivity === 'BALANCED') score += 1;
        break;
      case 'SIMPLER_UX':
        if (context.techSavviness === 'NEWBIE') score += 3;
        else if (context.techSavviness === 'DECENT') score += 1;
        break;
      case 'AI_NATIVE':
        if (context.preferAiNative) score += 3;
        break;
      case 'FEATURE_SUPERSET':
        if (context.costSensitivity === 'VALUE_FIRST') score += 2;
        break;
      case 'CONSOLIDATION':
        score += 2; // Always good for reducing tool count
        break;
      case 'COMPLIANCE':
        if (context.requiresCompliance && context.requiresCompliance.length > 0) {
          score += 3;
        }
        break;
      case 'BETTER_INTEGRATION':
        score += 1; // Mild preference
        break;
    }

    // Check if conditions match
    if (this.matchesContext(replacement, context)) {
      score += 2;
    }

    return score;
  }

  /**
   * Get all replacement rules by reason type
   */
  async getReplacementsByType(
    reasonType: ReplacementReasonType
  ): Promise<ReplacementSuggestion[]> {
    const replacements = await prisma.toolReplacement.findMany({
      where: { reasonType },
      include: {
        fromTool: true,
        toTool: true,
      },
    });

    return replacements.map(r => ({
      fromTool: r.fromTool,
      toTool: r.toTool,
      reasonType: r.reasonType,
      reasonText: r.reasonText,
      context: r.context,
      conditions: r.conditions as Record<string, unknown> | null,
    }));
  }

  /**
   * Get all replacements
   */
  async getAllReplacements(): Promise<ReplacementSuggestion[]> {
    const replacements = await prisma.toolReplacement.findMany({
      include: {
        fromTool: true,
        toTool: true,
      },
    });

    return replacements.map(r => ({
      fromTool: r.fromTool,
      toTool: r.toTool,
      reasonType: r.reasonType,
      reasonText: r.reasonText,
      context: r.context,
      conditions: r.conditions as Record<string, unknown> | null,
    }));
  }
}

// Singleton instance
let replacementServiceInstance: ReplacementService | null = null;

export function getReplacementService(): ReplacementService {
  if (!replacementServiceInstance) {
    replacementServiceInstance = new ReplacementService();
  }
  return replacementServiceInstance;
}

export default getReplacementService;
