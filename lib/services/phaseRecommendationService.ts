import { prisma } from '../db';
import type { Tool, WorkflowPhase, TechSavviness, PhaseToolRecommendation } from '@prisma/client';

export interface PhaseRecommendation {
  phase: WorkflowPhase;
  tool: Tool;
  role: string;
  techSavviness: TechSavviness[];
  note: string | null;
  displayOrder: number;
}

export interface PhaseToolMatrix {
  [phase: string]: PhaseRecommendation[];
}

/**
 * PhaseRecommendationService - Get tool recommendations for each workflow phase
 */
export class PhaseRecommendationService {
  /**
   * Get all phase recommendations
   */
  async getAllRecommendations(): Promise<PhaseRecommendation[]> {
    const recommendations = await prisma.phaseToolRecommendation.findMany({
      include: { tool: true },
      orderBy: [{ phase: 'asc' }, { displayOrder: 'asc' }],
    });

    return recommendations.map(r => ({
      phase: r.phase,
      tool: r.tool,
      role: r.role,
      techSavviness: r.techSavviness,
      note: r.note,
      displayOrder: r.displayOrder,
    }));
  }

  /**
   * Get recommendations for a specific phase
   */
  async getRecommendationsForPhase(
    phase: WorkflowPhase,
    techSavviness?: TechSavviness
  ): Promise<PhaseRecommendation[]> {
    const where: Record<string, unknown> = { phase };

    if (techSavviness) {
      where.techSavviness = { has: techSavviness };
    }

    const recommendations = await prisma.phaseToolRecommendation.findMany({
      where,
      include: { tool: true },
      orderBy: { displayOrder: 'asc' },
    });

    return recommendations.map(r => ({
      phase: r.phase,
      tool: r.tool,
      role: r.role,
      techSavviness: r.techSavviness,
      note: r.note,
      displayOrder: r.displayOrder,
    }));
  }

  /**
   * Get the full phase-tool matrix for a given tech savviness level
   */
  async getPhaseMatrix(techSavviness?: TechSavviness): Promise<PhaseToolMatrix> {
    const allPhases: WorkflowPhase[] = [
      'IDEATION',
      'PLANNING',
      'EXECUTION',
      'REVIEW',
      'ITERATE',
    ];

    const matrix: PhaseToolMatrix = {};

    for (const phase of allPhases) {
      const recommendations = await this.getRecommendationsForPhase(phase, techSavviness);
      matrix[phase] = recommendations;
    }

    return matrix;
  }

  /**
   * Get all recommendations for a specific tool
   */
  async getRecommendationsForTool(toolId: string): Promise<PhaseRecommendation[]> {
    const recommendations = await prisma.phaseToolRecommendation.findMany({
      where: { toolId },
      include: { tool: true },
      orderBy: { displayOrder: 'asc' },
    });

    return recommendations.map(r => ({
      phase: r.phase,
      tool: r.tool,
      role: r.role,
      techSavviness: r.techSavviness,
      note: r.note,
      displayOrder: r.displayOrder,
    }));
  }

  /**
   * Build a recommended workflow using phase recommendations
   * Filters by available tools and tech savviness
   */
  async buildRecommendedWorkflow(
    allowedToolIds: string[],
    techSavviness: TechSavviness
  ): Promise<Map<WorkflowPhase, PhaseRecommendation | null>> {
    const workflow = new Map<WorkflowPhase, PhaseRecommendation | null>();
    const phases: WorkflowPhase[] = [
      'IDEATION',
      'PLANNING',
      'EXECUTION',
      'REVIEW',
      'ITERATE',
    ];

    for (const phase of phases) {
      const recommendations = await prisma.phaseToolRecommendation.findMany({
        where: {
          phase,
          techSavviness: { has: techSavviness },
          toolId: { in: allowedToolIds },
        },
        include: { tool: true },
        orderBy: { displayOrder: 'asc' },
        take: 1,
      });

      if (recommendations.length > 0) {
        const r = recommendations[0];
        workflow.set(phase, {
          phase: r.phase,
          tool: r.tool,
          role: r.role,
          techSavviness: r.techSavviness,
          note: r.note,
          displayOrder: r.displayOrder,
        });
      } else {
        workflow.set(phase, null);
      }
    }

    return workflow;
  }

  /**
   * Get a quick summary of which phases a tool can serve
   */
  async getToolPhases(toolId: string): Promise<WorkflowPhase[]> {
    const recommendations = await prisma.phaseToolRecommendation.findMany({
      where: { toolId },
      select: { phase: true },
    });

    return [...new Set(recommendations.map(r => r.phase))];
  }

  /**
   * Find tools that can cover multiple phases (good for mono-stack scenarios)
   */
  async findMultiPhaseTool(
    phases: WorkflowPhase[],
    techSavviness?: TechSavviness
  ): Promise<Tool[]> {
    // Find tools that appear in all specified phases
    const toolPhaseCounts = new Map<string, { tool: Tool; count: number }>();

    for (const phase of phases) {
      const recs = await this.getRecommendationsForPhase(phase, techSavviness);
      for (const rec of recs) {
        const existing = toolPhaseCounts.get(rec.tool.id);
        if (existing) {
          existing.count++;
        } else {
          toolPhaseCounts.set(rec.tool.id, { tool: rec.tool, count: 1 });
        }
      }
    }

    // Return tools that cover all requested phases
    const result: Tool[] = [];
    for (const { tool, count } of toolPhaseCounts.values()) {
      if (count === phases.length) {
        result.push(tool);
      }
    }

    return result;
  }
}

// Singleton instance
let phaseRecommendationServiceInstance: PhaseRecommendationService | null = null;

export function getPhaseRecommendationService(): PhaseRecommendationService {
  if (!phaseRecommendationServiceInstance) {
    phaseRecommendationServiceInstance = new PhaseRecommendationService();
  }
  return phaseRecommendationServiceInstance;
}

export default getPhaseRecommendationService;
