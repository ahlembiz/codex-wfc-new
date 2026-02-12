import { prisma } from '../db';
import { generateText } from '../providers/aiProvider';
import { WORKFLOW_PHASES_V2, PHASE_DISPLAY_NAMES } from '../constants';
import type {
  Tool,
  WorkflowPhase,
  ToolPhaseCapability,
  AutomationRecipe,
  WorkflowBucket,
} from '@prisma/client';

// ============================================
// Types
// ============================================

export interface IntelligentWorkflowStep {
  phase: string;
  tool: string;
  aiAgentRole: string;
  humanRole: string;
  outcome: string;
  subSteps?: WorkflowSubStep[];
  automations?: WorkflowAutomationInfo[];
  secondaryTools?: string[];
}

export interface WorkflowSubStep {
  bucket: string;
  tool: string;
  featureName: string;
  aiAction: string;
  humanAction: string;
  artifact: string;
  automationLevel: string;
}

export interface WorkflowAutomationInfo {
  name: string;
  triggerTool: string;
  triggerEvent: string;
  actionTool: string;
  actionResult: string;
  connectorType: string;
  setupDifficulty: string;
  timeSaved: number;
}

export interface AutomationChain {
  name: string;
  steps: WorkflowAutomationInfo[];
  totalTimeSaved: number;
  phases: string[];
}

export type CapabilityWithBucket = ToolPhaseCapability & { bucket: WorkflowBucket };
export type RecipeWithTools = AutomationRecipe & { triggerTool: Tool; actionTool: Tool };

// ============================================
// Service
// ============================================

export class WorkflowIntelligenceService {
  /**
   * Build an intelligent workflow with tool-specific sub-steps and automation recipes.
   * Uses 3-tier fallback: Rich data → Category-generic → AI-generated
   */
  async buildIntelligentWorkflow(
    tools: Tool[],
    philosophy: string,
    techSavviness: string,
    findToolForPhase: (tools: Tool[], phase: string) => Tool | null,
    getFallbackRoles: (phase: string, isAutomatic: boolean, isHybrid: boolean) => { aiRole: string; humanRole: string; outcome: string },
  ): Promise<IntelligentWorkflowStep[]> {
    const isAutomatic = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';
    const toolIds = tools.map(t => t.id);
    const phases = ['Discover', 'Decide', 'Design', 'Build', 'Launch', 'Review', 'Iterate'];

    // Fetch capabilities, recipes, and buckets in parallel
    const [capabilitiesMap, recipes, allBuckets] = await Promise.all([
      this.getCapabilitiesByPhase(toolIds, philosophy, techSavviness),
      this.findApplicableRecipes(toolIds, philosophy, techSavviness),
      this.getBucketsByPhase(),
    ]);

    const workflow: IntelligentWorkflowStep[] = [];

    for (const phase of phases) {
      const phaseEnum = phase.toUpperCase() as WorkflowPhase;
      const phaseTool = findToolForPhase(tools, phase);
      const phaseCapabilities = capabilitiesMap.get(phaseEnum) || [];
      const phaseRecipes = recipes.filter(r => r.phases.includes(phaseEnum));

      // Determine which tools appear as secondary in this phase
      const secondaryToolNames = this.getSecondaryTools(phaseCapabilities, phaseTool, tools);

      // Tier 1: Rich data (capabilities exist)
      if (phaseCapabilities.length > 0) {
        const { aiRole, humanRole, outcome } = this.synthesizeRolesFromCapabilities(
          phaseCapabilities,
          phaseTool,
          philosophy,
        );

        const subSteps = phaseCapabilities.map(cap => ({
          bucket: cap.bucket.name,
          tool: tools.find(t => t.id === cap.toolId)?.displayName || 'Unknown',
          featureName: cap.featureName,
          aiAction: cap.aiAction,
          humanAction: cap.humanAction,
          artifact: cap.artifact,
          automationLevel: cap.automationLevel,
        }));

        const automations = phaseRecipes.map(r => ({
          name: `${r.triggerTool.displayName} → ${r.actionTool.displayName}`,
          triggerTool: r.triggerTool.displayName,
          triggerEvent: r.triggerEvent,
          actionTool: r.actionTool.displayName,
          actionResult: r.actionDetail,
          connectorType: r.connectorType,
          setupDifficulty: r.setupDifficulty,
          timeSaved: r.timeSavedPerWeek,
        }));

        workflow.push({
          phase,
          tool: phaseTool?.displayName || this.getFallbackToolName(phase),
          aiAgentRole: aiRole,
          humanRole,
          outcome,
          subSteps: subSteps.length > 0 ? subSteps : undefined,
          automations: automations.length > 0 ? automations : undefined,
          secondaryTools: secondaryToolNames.length > 0 ? secondaryToolNames : undefined,
        });
      } else {
        // Tier 2: Category-generic fallback with bucket-derived sub-steps
        const roles = getFallbackRoles(phase, isAutomatic, isHybrid);
        const toolName = phaseTool?.displayName || this.getFallbackToolName(phase);

        // Build sub-steps from workflow buckets so every phase is collapsible
        const phaseBuckets = allBuckets.get(phaseEnum) || [];
        const bucketSubSteps = phaseBuckets.map(bucket => ({
          bucket: bucket.name,
          tool: toolName,
          featureName: bucket.name,
          aiAction: bucket.description,
          humanAction: `Lead ${bucket.name.toLowerCase()}`,
          artifact: bucket.outputs.join(', '),
          automationLevel: 'ASSISTED',
        }));

        const automations = phaseRecipes.map(r => ({
          name: `${r.triggerTool.displayName} → ${r.actionTool.displayName}`,
          triggerTool: r.triggerTool.displayName,
          triggerEvent: r.triggerEvent,
          actionTool: r.actionTool.displayName,
          actionResult: r.actionDetail,
          connectorType: r.connectorType,
          setupDifficulty: r.setupDifficulty,
          timeSaved: r.timeSavedPerWeek,
        }));

        workflow.push({
          phase,
          tool: toolName,
          aiAgentRole: roles.aiRole,
          humanRole: roles.humanRole,
          outcome: roles.outcome,
          subSteps: bucketSubSteps.length > 0 ? bucketSubSteps : undefined,
          automations: automations.length > 0 ? automations : undefined,
          secondaryTools: secondaryToolNames.length > 0 ? secondaryToolNames : undefined,
        });
      }
    }

    return workflow;
  }

  /**
   * Get capabilities grouped by phase for a set of tools.
   * Filters by philosophy and tech savviness.
   */
  async getCapabilitiesByPhase(
    toolIds: string[],
    philosophy: string,
    techSavviness: string,
  ): Promise<Map<WorkflowPhase, CapabilityWithBucket[]>> {
    if (toolIds.length === 0) return new Map();

    const techLevel = techSavviness.toUpperCase();

    const capabilities = await prisma.toolPhaseCapability.findMany({
      where: {
        toolId: { in: toolIds },
        philosophyFit: { has: philosophy },
        techSavviness: { has: techLevel as any },
      },
      include: { bucket: true },
      orderBy: { displayOrder: 'asc' },
    });

    const grouped = new Map<WorkflowPhase, CapabilityWithBucket[]>();
    for (const cap of capabilities) {
      const phase = cap.bucket.phase;
      const existing = grouped.get(phase) || [];
      existing.push(cap);
      grouped.set(phase, existing);
    }

    return grouped;
  }

  /**
   * Find automation recipes applicable to a set of tools.
   */
  async findApplicableRecipes(
    toolIds: string[],
    philosophy: string,
    techSavviness: string,
  ): Promise<RecipeWithTools[]> {
    if (toolIds.length === 0) return [];

    const techLevel = techSavviness.toUpperCase();

    // Find recipes where both trigger and action tools are in the stack
    const recipes = await prisma.automationRecipe.findMany({
      where: {
        triggerToolId: { in: toolIds },
        actionToolId: { in: toolIds },
        philosophyFit: { has: philosophy },
        techSavviness: { in: [techLevel as any, 'NEWBIE'] },
      },
      include: {
        triggerTool: true,
        actionTool: true,
      },
    });

    // Also include recipes accessible to lower tech levels
    // NEWBIE can access NEWBIE recipes, DECENT can access NEWBIE+DECENT, NINJA can access all
    const accessibleLevels = this.getAccessibleTechLevels(techLevel);
    return recipes.filter(r => accessibleLevels.includes(r.techSavviness));
  }

  /**
   * Compose individual recipes into multi-step automation chains.
   * Example: Linear→GitHub + GitHub→Slack = "Issue → Branch → Notification" chain.
   */
  composeChains(recipes: RecipeWithTools[]): AutomationChain[] {
    const chains: AutomationChain[] = [];
    const used = new Set<string>();

    for (const recipe of recipes) {
      if (used.has(recipe.id)) continue;

      // Find downstream recipes (this recipe's action tool triggers another)
      const chain: RecipeWithTools[] = [recipe];
      used.add(recipe.id);

      let current = recipe;
      while (true) {
        const next = recipes.find(
          r => !used.has(r.id) && r.triggerToolId === current.actionToolId,
        );
        if (!next) break;
        chain.push(next);
        used.add(next.id);
        current = next;
      }

      if (chain.length >= 2) {
        const allPhases = [...new Set(chain.flatMap(r => r.phases))];
        chains.push({
          name: chain.map(r => r.triggerTool.displayName).join(' → ') + ' → ' + chain[chain.length - 1].actionTool.displayName,
          steps: chain.map(r => ({
            name: `${r.triggerTool.displayName} → ${r.actionTool.displayName}`,
            triggerTool: r.triggerTool.displayName,
            triggerEvent: r.triggerEvent,
            actionTool: r.actionTool.displayName,
            actionResult: r.actionDetail,
            connectorType: r.connectorType,
            setupDifficulty: r.setupDifficulty,
            timeSaved: r.timeSavedPerWeek,
          })),
          totalTimeSaved: chain.reduce((sum, r) => sum + r.timeSavedPerWeek, 0),
          phases: allPhases,
        });
      }
    }

    return chains;
  }

  /**
   * Get all workflow buckets grouped by phase.
   */
  async getBucketsByPhase(): Promise<Map<WorkflowPhase, WorkflowBucket[]>> {
    const buckets = await prisma.workflowBucket.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const grouped = new Map<WorkflowPhase, WorkflowBucket[]>();
    for (const bucket of buckets) {
      const existing = grouped.get(bucket.phase) || [];
      existing.push(bucket);
      grouped.set(bucket.phase, existing);
    }

    return grouped;
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Synthesize a concise aiRole/humanRole/outcome from capabilities.
   * Picks the top 2-3 most relevant capabilities and combines them.
   */
  private synthesizeRolesFromCapabilities(
    capabilities: CapabilityWithBucket[],
    primaryTool: Tool | null,
    philosophy: string,
  ): { aiRole: string; humanRole: string; outcome: string } {
    // Prefer capabilities that match the primary tool
    const sorted = [...capabilities].sort((a, b) => {
      const aIsPrimary = a.toolId === primaryTool?.id ? -1 : 0;
      const bIsPrimary = b.toolId === primaryTool?.id ? -1 : 0;
      return aIsPrimary - bIsPrimary || a.displayOrder - b.displayOrder;
    });

    const top = sorted.slice(0, 3);

    // Build role strings from feature names + actions
    const aiParts = top.map(c => {
      const toolPrefix = c.toolId !== primaryTool?.id
        ? `[${capabilities.find(cap => cap.id === c.id)?.bucket.name}] `
        : '';
      return `${toolPrefix}${c.featureName}: ${c.aiAction.toLowerCase()}`;
    });

    const humanParts = top.map(c => c.humanAction.toLowerCase());
    const artifacts = [...new Set(top.map(c => c.artifact))];

    return {
      aiRole: aiParts.join('; '),
      humanRole: humanParts.join('; '),
      outcome: artifacts.join(', '),
    };
  }

  private getSecondaryTools(
    capabilities: CapabilityWithBucket[],
    primaryTool: Tool | null,
    allTools: Tool[],
  ): string[] {
    const secondaryIds = new Set<string>();
    for (const cap of capabilities) {
      if (cap.toolId !== primaryTool?.id) {
        secondaryIds.add(cap.toolId);
      }
    }
    return allTools
      .filter(t => secondaryIds.has(t.id))
      .map(t => t.displayName);
  }

  private getAccessibleTechLevels(level: string): string[] {
    switch (level) {
      case 'NINJA': return ['NEWBIE', 'DECENT', 'NINJA'];
      case 'DECENT': return ['NEWBIE', 'DECENT'];
      case 'NEWBIE': return ['NEWBIE'];
      default: return ['NEWBIE', 'DECENT'];
    }
  }

  private getFallbackToolName(phase: string): string {
    const fallbacks: Record<string, string> = {
      'Discover': 'Documentation Tool',
      'Decide': 'Project Management Tool',
      'Design': 'Design Tool',
      'Build': 'Development Tool',
      'Launch': 'Deployment Tool',
      'Review': 'Meeting Tool',
      'Iterate': 'Analytics Tool',
    };
    return fallbacks[phase] || 'TBD';
  }
}

// Singleton
let workflowIntelligenceServiceInstance: WorkflowIntelligenceService | null = null;

export function getWorkflowIntelligenceService(): WorkflowIntelligenceService {
  if (!workflowIntelligenceServiceInstance) {
    workflowIntelligenceServiceInstance = new WorkflowIntelligenceService();
  }
  return workflowIntelligenceServiceInstance;
}

export default getWorkflowIntelligenceService;
