import { getBundleService, type BundleWithTools } from '../services/bundleService';
import { getRedundancyService } from '../services/redundancyService';
import { getReplacementService } from '../services/replacementService';
import { getToolService } from '../services/toolService';
import { getToolIntegrationService } from '../services/toolIntegrationService';
import { getWorkflowIntelligenceService } from '../services/workflowIntelligenceService';
import { getClusterService, type ClusterMatch } from '../services/clusterService';
import { buildScenarioRationale } from './scenarioRationale';
import {
  buildScenarioWeights,
  scoreToolForScenario,
  calculateTargetToolRange,
  calculateQualityFloor,
} from './scenarioScoring';
import { getToolPhaseResolver, DEFAULT_PHASE_CATEGORY_MAP } from './toolPhaseResolver';
import type { ScenarioRationale } from './scenarioRationale';
import type { Tool, ScenarioType, WorkflowPhase, ToolCategory } from '@prisma/client';
import type { PipelineContext } from './decisionPipeline';
import type { WorkflowStep, WeightProfile } from '../../types';

export type { WorkflowStep } from '../../types';
export type { ScenarioRationale } from './scenarioRationale';

export interface ClusterMetadata {
  name: string;
  description: string;
  synergyType: string;
  matchScore: number;
}

export interface BuiltScenario {
  title: string;
  scenarioType: ScenarioType;
  tools: Tool[];
  displacementList: string[];
  workflow: WorkflowStep[];
  estimatedMonthlyCostPerUser: number;
  complexityReductionScore: number;
  description?: string;
  rationale?: ScenarioRationale;
  matchedClusters?: ClusterMetadata[];
}

// Hardcoded multi-phase tool names — used as fallback when DB has no ToolPhaseCapability data
const FALLBACK_MULTI_PHASE_TOOLS = ['notion', 'clickup', 'linear', 'asana', 'monday'];

/**
 * Scenario Builder - Builds 3 scenario types with integration-aware tool selection
 */
export class ScenarioBuilder {
  private bundleService = getBundleService();
  private redundancyService = getRedundancyService();
  private replacementService = getReplacementService();
  private toolService = getToolService();
  private toolIntegrationService = getToolIntegrationService();
  private workflowIntelligenceService = getWorkflowIntelligenceService();
  private clusterService = getClusterService();
  private toolPhaseResolver = getToolPhaseResolver();

  // Cached phase category map (populated once per buildAllScenarios call)
  private phaseCategoryMap: Record<string, string[]> | null = null;

  async buildAllScenarios(context: PipelineContext): Promise<BuiltScenario[]> {
    // Pre-load data-driven phase category map (cached for this build)
    this.phaseCategoryMap = await this.toolPhaseResolver.getPhaseCategoryMap();

    const [monoStack, nativeIntegrator, agenticLean] = await Promise.all([
      this.buildMonoStackScenario(context),
      this.buildNativeIntegratorScenario(context),
      this.buildAgenticLeanScenario(context),
    ]);

    return [monoStack, nativeIntegrator, agenticLean];
  }

  /**
   * Mono-Stack: MINIMAL tools - anchor + communication + dev (3-4 tools max)
   * Key principle: One tool should cover multiple phases, prefer native integrations
   */
  async buildMonoStackScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList, weightProfile } = context;

    let tools: Tool[] = [];

    // Start with anchor tool (this covers Discover + Decide + Iterate)
    if (anchorTool) {
      tools.push(anchorTool);
    } else {
      // Find the best multi-phase tool as anchor using DB data
      const allowedToolIds = allowedTools.map(t => t.id);
      const multiPhaseTools = await this.toolPhaseResolver.findMultiPhaseTools(allowedToolIds, 3);

      if (multiPhaseTools.length > 0) {
        // Prefer documentation tools
        const docTool = multiPhaseTools.find(t => t.category === 'DOCUMENTATION');
        tools.push(docTool || multiPhaseTools[0]);
      } else {
        // Fallback to hardcoded list
        const fallbackTool = allowedTools.find(t =>
          FALLBACK_MULTI_PHASE_TOOLS.includes(t.name) && t.category === 'DOCUMENTATION'
        ) || allowedTools.find(t => t.name === 'notion');
        if (fallbackTool) tools.push(fallbackTool);
      }
    }

    // Add communication tool (for Review phase) - prefer tools that integrate with anchor
    if (!this.hasToolCategory(tools, 'COMMUNICATION')) {
      const commTool = await this.findBestToolForCategoryAsync(
        allowedTools, 'COMMUNICATION', tools,
        weightProfile, context, 'MONO_STACK'
      );
      if (commTool) {
        tools.push(commTool);
      }
    }

    // Add development tool (for Execution phase) - prefer tools that integrate with the stack
    if (!this.hasToolCategory(tools, 'DEVELOPMENT')) {
      const devTool = await this.findBestToolForCategoryAsync(
        allowedTools, 'DEVELOPMENT', tools,
        weightProfile, context, 'MONO_STACK'
      );
      if (devTool) {
        tools.push(devTool);
      }
    }

    // Remove any redundant tools
    tools = await this.removeRedundantTools(tools, anchorTool?.id);

    // Calculate displacements
    const additionalDisplacements = userTools
      .filter(ut => !tools.some(t => t.id === ut.id))
      .map(ut => ut.displayName);

    const workflow = await this.buildWorkflowAsync(tools, context);

    return {
      title: 'The Mono-Stack',
      scenarioType: 'MONO_STACK',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
      rationale: buildScenarioRationale('MONO_STACK', context.assessment),
    };
  }

  /**
   * Native Integrator: Best-of-breed tools that integrate well (5-6 tools)
   * Key principle: One tool per major function, optimized for integration quality
   */
  async buildNativeIntegratorScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList, replacementContext, weightProfile } = context;

    let tools: Tool[] = [];

    // Start with anchor if provided
    if (anchorTool) {
      tools.push(anchorTool);
    }

    // Add one tool per essential category, using integration-aware selection
    const allEssentialCategories = [
      'PROJECT_MANAGEMENT',  // Linear, Jira, Asana - for Decide
      'DOCUMENTATION',       // Notion, Confluence - for Discover
      'DEVELOPMENT',         // GitHub, GitLab - for Build
      'DESIGN',              // Figma, Framer - for Design
      'COMMUNICATION',       // Slack - for async / Launch
      'MEETINGS',            // Fireflies, Zoom - for Review
      'ANALYTICS',           // PostHog, Amplitude - for Iterate / Launch
    ];

    // Filter by user's desired capabilities (if specified)
    const desiredCapabilities = context.assessment.desiredCapabilities;
    const essentialCategories = desiredCapabilities && desiredCapabilities.length > 0
      ? allEssentialCategories.filter(c => desiredCapabilities.includes(c))
      : allEssentialCategories;

    // Adaptive tool count range
    const targetRange = calculateTargetToolRange(
      context.teamSizeEnum, 'NATIVE_INTEGRATOR', context.assessment.painPoints
    );
    const toolScores: number[] = [];

    // Build the stack incrementally, each new tool selection considers
    // integration with already-selected tools
    for (const category of essentialCategories) {
      if (anchorTool?.category === category) continue;
      if (this.hasToolCategory(tools, category)) continue;
      if (tools.length >= targetRange.max) break;

      const categoryTool = await this.findBestToolForCategoryAsync(
        allowedTools, category, tools,
        weightProfile, context, 'NATIVE_INTEGRATOR'
      );
      if (categoryTool) {
        // Quality floor check: skip tools below threshold (once we have enough data)
        const integrationScore = await this.toolService.calculateIntegrationScore(
          categoryTool.id, tools.map(t => t.id)
        );
        const result = scoreToolForScenario(categoryTool,
          buildScenarioWeights('NATIVE_INTEGRATOR', context.assessment),
          {
            budgetPerUser: context.assessment.budgetPerUser,
            teamSizeEnum: context.teamSizeEnum,
            stageEnum: context.stageEnum,
            philosophy: context.assessment.philosophy,
            userToolIds: context.userToolIds,
            integrationScore,
            synergyBonus: 0,
          }
        );
        const floor = calculateQualityFloor(toolScores);
        if (toolScores.length >= 2 && result.compositeScore < floor) continue;

        tools.push(categoryTool);
        toolScores.push(result.compositeScore);
      }
    }

    // Anchor challenge: if a better alternative exists in the anchor's category, swap
    tools = await this.challengeAnchor(tools, allowedTools, anchorTool, context);

    // Check for replacements that would improve the stack
    tools = await this.applyReplacements(tools, allowedTools, replacementContext);

    // Remove any redundant tools
    tools = await this.removeRedundantTools(tools, anchorTool?.id);

    // Match against approved clusters for narrative enrichment
    const matchedClusters = await this.findMatchingClusters(tools);

    const additionalDisplacements = userTools
      .filter(ut => !tools.some(t => t.id === ut.id))
      .map(ut => ut.displayName);

    const workflow = await this.buildWorkflowAsync(tools, context);

    return {
      title: 'The Native Integrator',
      scenarioType: 'NATIVE_INTEGRATOR',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
      rationale: buildScenarioRationale('NATIVE_INTEGRATOR', context.assessment),
      matchedClusters,
    };
  }

  /**
   * Agentic Lean: AI-first tools for maximum automation (5-7 tools)
   * Key principle: Every tool should have AI capabilities, optimized for integration
   */
  async buildAgenticLeanScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList, weightProfile } = context;

    let tools: Tool[] = [];

    // Filter to only AI-enabled tools
    const aiTools = allowedTools.filter(t => t.hasAiFeatures);

    // Start with anchor if it has AI features, otherwise find AI alternative
    if (anchorTool?.hasAiFeatures) {
      tools.push(anchorTool);
    } else if (anchorTool) {
      // Try to find AI-enabled replacement in same category
      // Score by integration with anchor + momentum
      const aiAlternatives = aiTools.filter(t => t.category === anchorTool.category);
      if (aiAlternatives.length > 0) {
        const scored = await Promise.all(
          aiAlternatives.map(async t => {
            const integrationScore = await this.toolService.calculateIntegrationScore(
              t.id,
              [anchorTool.id]
            );
            const momentumScore = t.popularityMomentum ?? 50;
            return { tool: t, score: integrationScore * 0.4 + momentumScore * 0.6 };
          })
        );
        scored.sort((a, b) => b.score - a.score);
        if (scored[0]) {
          tools.push(scored[0].tool);
        }
      }
    }

    // Add AI tools by essential function using integration-aware selection
    const allAiCategories: ToolCategory[] = [
      'AI_ASSISTANTS',
      'AI_BUILDERS',
      'DEVELOPMENT',
      'DESIGN',
      'MEETINGS',
      'DOCUMENTATION',
      'PROJECT_MANAGEMENT',
      'AUTOMATION',
      'ANALYTICS',
      'GROWTH',
    ];

    // Filter by user's desired capabilities (if specified)
    const desiredCapabilities = context.assessment.desiredCapabilities;
    const aiCategories = desiredCapabilities && desiredCapabilities.length > 0
      ? allAiCategories.filter(c => desiredCapabilities.includes(c))
      : allAiCategories;

    // Adaptive tool count range
    const targetRange = calculateTargetToolRange(
      context.teamSizeEnum, 'AGENTIC_LEAN', context.assessment.painPoints
    );
    const toolScores: number[] = [];

    for (const category of aiCategories) {
      if (this.hasToolCategory(tools, category)) continue;
      if (tools.length >= targetRange.max) break;

      const aiCategoryTool = await this.findBestToolForCategoryAsync(
        aiTools, category, tools,
        weightProfile, context, 'AGENTIC_LEAN'
      );
      if (aiCategoryTool) {
        // Quality floor check
        const integrationScore = await this.toolService.calculateIntegrationScore(
          aiCategoryTool.id, tools.map(t => t.id)
        );
        const result = scoreToolForScenario(aiCategoryTool,
          buildScenarioWeights('AGENTIC_LEAN', context.assessment),
          {
            budgetPerUser: context.assessment.budgetPerUser,
            teamSizeEnum: context.teamSizeEnum,
            stageEnum: context.stageEnum,
            philosophy: context.assessment.philosophy,
            userToolIds: context.userToolIds,
            integrationScore,
            synergyBonus: 0,
          }
        );
        const floor = calculateQualityFloor(toolScores);
        if (toolScores.length >= 2 && result.compositeScore < floor) continue;

        tools.push(aiCategoryTool);
        toolScores.push(result.compositeScore);
      }
    }

    // Add communication tool (even if not AI-native, it's essential)
    if (!this.hasToolCategory(tools, 'COMMUNICATION')) {
      const commTool = await this.findBestToolForCategoryAsync(
        allowedTools, 'COMMUNICATION', tools,
        weightProfile, context, 'AGENTIC_LEAN'
      );
      if (commTool) tools.push(commTool);
    }

    // Remove redundant tools
    tools = await this.removeRedundantTools(tools);

    // Match against approved clusters for narrative enrichment
    const matchedClusters = await this.findMatchingClusters(tools);

    const additionalDisplacements = userTools
      .filter(ut => !tools.some(t => t.id === ut.id))
      .map(ut => ut.displayName);

    const workflow = await this.buildWorkflowAsync(tools, context);

    return {
      title: 'The Agentic Lean',
      scenarioType: 'AGENTIC_LEAN',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
      rationale: buildScenarioRationale('AGENTIC_LEAN', context.assessment),
      matchedClusters,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Find approved clusters that match the selected tools.
   * Returns cluster metadata for narrative enrichment.
   */
  private async findMatchingClusters(tools: Tool[]): Promise<ClusterMetadata[]> {
    try {
      const matches = await this.clusterService.findClustersForTools(tools, 60);
      return matches.slice(0, 3).map(m => ({
        name: m.cluster.name,
        description: m.cluster.description,
        synergyType: m.cluster.synergyType,
        matchScore: m.matchScore,
      }));
    } catch {
      // Non-critical — don't fail scenario building if cluster matching fails
      return [];
    }
  }

  private hasToolCategory(tools: Tool[], category: string): boolean {
    return tools.some(t => t.category === category);
  }

  /**
   * Find best tool for a category using full 5-dimension scoring.
   * Uses per-scenario weights when scenarioType + context are provided,
   * otherwise falls back to the pipeline's WeightProfile.
   */
  private async findBestToolForCategoryAsync(
    allowedTools: Tool[],
    category: string,
    existingTools: Tool[],
    weightProfile?: WeightProfile,
    context?: PipelineContext,
    scenarioType?: string
  ): Promise<Tool | null> {
    const existingToolIds = existingTools.map(t => t.id);
    const existingSet = new Set(existingToolIds);

    const candidates = allowedTools.filter(
      t => t.category === category && !existingSet.has(t.id)
    );

    if (candidates.length === 0) return null;

    // Build weights: prefer per-scenario weights if context is available
    const weights = (scenarioType && context)
      ? buildScenarioWeights(scenarioType, context.assessment)
      : weightProfile || { fit: 0.20, popularity: 0.25, cost: 0.20, ai: 0.15, integration: 0.20 };

    // Score each candidate using all 5 dimensions + synergy bonus
    const scored = await Promise.all(
      candidates.map(async tool => {
        const integrationScore = existingTools.length > 0
          ? await this.toolService.calculateIntegrationScore(tool.id, existingToolIds)
          : 50;

        const synergyBonus = existingToolIds.length > 0
          ? await this.toolIntegrationService.calculateStackSynergyBonus(tool.id, existingToolIds)
          : 0;

        const result = scoreToolForScenario(tool, weights, {
          budgetPerUser: context?.assessment.budgetPerUser ?? 50,
          teamSizeEnum: context?.teamSizeEnum ?? 'SMALL',
          stageEnum: context?.stageEnum ?? 'PRE_SEED',
          philosophy: context?.assessment.philosophy ?? 'Hybrid',
          userToolIds: context?.userToolIds ?? [],
          integrationScore,
          synergyBonus,
        });

        return { tool, compositeScore: result.compositeScore };
      })
    );

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    return scored[0]?.tool ?? null;
  }

  /**
   * Synchronous fallback for category selection (used in legacy paths).
   * Prefers hardcoded preferences, then falls back to popularity.
   */
  private findBestToolForCategory(allowedTools: Tool[], category: string, existingTools: Tool[]): Tool | null {
    // Preferred tools by category (ordered by preference) - kept as fallback
    const preferences: Record<string, string[]> = {
      'PROJECT_MANAGEMENT': ['linear', 'asana', 'jira', 'clickup', 'monday'],
      'DOCUMENTATION': ['notion', 'confluence', 'coda', 'slite', 'gitbook'],
      'DEVELOPMENT': ['github', 'gitlab', 'cursor', 'vscode', 'vercel'],
      'COMMUNICATION': ['slack', 'teams', 'discord'],
      'MEETINGS': ['fireflies', 'zoom', 'loom', 'otter', 'fathom'],
      'DESIGN': ['figma', 'framer', 'canva', 'miro', 'webflow'],
      'ANALYTICS': ['posthog', 'amplitude', 'mixpanel', 'hotjar', 'fullstory'],
      'AUTOMATION': ['zapier', 'make', 'n8n', 'pipedream'],
      'AI_ASSISTANTS': ['claude', 'chatgpt', 'copilot', 'cursor', 'perplexity'],
      'AI_BUILDERS': ['bolt', 'lovable', 'replit-agent', 'supabase', 'retool'],
      'GROWTH': ['intercom', 'hubspot', 'posthog', 'amplitude', 'attio'],
    };

    const preferred = preferences[category] || [];

    // Try preferred tools first
    for (const name of preferred) {
      const tool = allowedTools.find(t =>
        t.name === name &&
        t.category === category &&
        !existingTools.some(e => e.id === t.id)
      );
      if (tool) return tool;
    }

    // Fallback: 60% composite popularity + 40% momentum
    const candidates = allowedTools
      .filter(t => t.category === category && !existingTools.some(e => e.id === t.id))
      .sort((a, b) => {
        const scoreA = (a.popularityScore ?? 50) * 0.6 + (a.popularityMomentum ?? 50) * 0.4;
        const scoreB = (b.popularityScore ?? 50) * 0.6 + (b.popularityMomentum ?? 50) * 0.4;
        return scoreB - scoreA;
      });
    return candidates[0] || null;
  }

  /**
   * Challenge the anchor: if a better alternative exists in the same category
   * and scores >20% better, swap it. Only used for NATIVE_INTEGRATOR.
   */
  private async challengeAnchor(
    tools: Tool[],
    allowedTools: Tool[],
    anchorTool: Tool | null,
    context: PipelineContext
  ): Promise<Tool[]> {
    if (!anchorTool) return tools;

    const otherTools = tools.filter(t => t.id !== anchorTool.id);
    const otherToolIds = otherTools.map(t => t.id);
    const weights = buildScenarioWeights('NATIVE_INTEGRATOR', context.assessment);

    // Score the current anchor
    const anchorIntegration = otherToolIds.length > 0
      ? await this.toolService.calculateIntegrationScore(anchorTool.id, otherToolIds)
      : 50;
    const anchorResult = scoreToolForScenario(anchorTool, weights, {
      budgetPerUser: context.assessment.budgetPerUser,
      teamSizeEnum: context.teamSizeEnum,
      stageEnum: context.stageEnum,
      philosophy: context.assessment.philosophy,
      userToolIds: context.userToolIds,
      integrationScore: anchorIntegration,
      synergyBonus: 0,
    });

    // Find the best alternative in the same category
    const alternatives = allowedTools.filter(
      t => t.category === anchorTool.category && t.id !== anchorTool.id && !tools.some(e => e.id === t.id)
    );

    let bestAlt: { tool: Tool; score: number } | null = null;
    for (const alt of alternatives) {
      const altIntegration = otherToolIds.length > 0
        ? await this.toolService.calculateIntegrationScore(alt.id, otherToolIds)
        : 50;
      const altResult = scoreToolForScenario(alt, weights, {
        budgetPerUser: context.assessment.budgetPerUser,
        teamSizeEnum: context.teamSizeEnum,
        stageEnum: context.stageEnum,
        philosophy: context.assessment.philosophy,
        userToolIds: context.userToolIds,
        integrationScore: altIntegration,
        synergyBonus: 0,
      });
      if (!bestAlt || altResult.compositeScore > bestAlt.score) {
        bestAlt = { tool: alt, score: altResult.compositeScore };
      }
    }

    // Swap if alternative scores >20% better
    if (bestAlt && bestAlt.score > anchorResult.compositeScore * 1.2) {
      return tools.map(t => t.id === anchorTool.id ? bestAlt!.tool : t);
    }

    return tools;
  }

  private async removeRedundantTools(tools: Tool[], anchorId?: string): Promise<Tool[]> {
    if (tools.length < 2) return tools;

    const toolIds = tools.map(t => t.id);
    const redundancies = await this.redundancyService.findRedundanciesInSet(toolIds);

    // Build a set of tools to remove
    const toRemove = new Set<string>();

    for (const redundancy of redundancies) {
      // Never remove the anchor tool
      if (redundancy.toolA.id === anchorId) {
        toRemove.add(redundancy.toolB.id);
      } else if (redundancy.toolB.id === anchorId) {
        toRemove.add(redundancy.toolA.id);
      } else {
        // For full redundancy, remove based on hint
        if (redundancy.redundancyStrength === 'FULL') {
          if (redundancy.recommendationHint === 'PREFER_A') {
            toRemove.add(redundancy.toolB.id);
          } else if (redundancy.recommendationHint === 'PREFER_B') {
            toRemove.add(redundancy.toolA.id);
          } else {
            // Context dependent - prefer lower complexity/cost
            const costA = redundancy.toolA.estimatedCostPerUser || 0;
            const costB = redundancy.toolB.estimatedCostPerUser || 0;
            if (costA <= costB) {
              toRemove.add(redundancy.toolB.id);
            } else {
              toRemove.add(redundancy.toolA.id);
            }
          }
        }
      }
    }

    return tools.filter(t => !toRemove.has(t.id));
  }

  private async applyReplacements(
    tools: Tool[],
    allowedTools: Tool[],
    context: any
  ): Promise<Tool[]> {
    const result = [...tools];

    for (let i = 0; i < result.length; i++) {
      const tool = result[i];
      const replacement = await this.replacementService.findBestReplacement(tool.id, context);

      if (replacement) {
        const replacementTool = allowedTools.find(t => t.id === replacement.toTool.id);
        if (replacementTool && !result.some(t => t.id === replacementTool.id)) {
          result[i] = replacementTool;
        }
      }
    }

    return result;
  }

  private async buildWorkflowAsync(tools: Tool[], context: PipelineContext): Promise<WorkflowStep[]> {
    const philosophy = context.assessment.philosophy;
    const techSavviness = context.assessment.techSavviness;
    const allowedTools = context.allowedTools;

    try {
      const steps = await this.workflowIntelligenceService.buildIntelligentWorkflow(
        tools,
        philosophy,
        techSavviness,
        (t, phase) => this.findToolForPhase(t, phase) || this.findBestToolFromPool(allowedTools, phase, t),
        (phase, isAuto, isHybrid) => this.getRolesForPhase(phase, isAuto, isHybrid),
      );

      return steps;
    } catch (error) {
      console.error('Workflow intelligence service failed, falling back to basic workflow:', error);
      return this.buildWorkflowFallback(tools, context);
    }
  }

  private buildWorkflowFallback(tools: Tool[], context: PipelineContext): WorkflowStep[] {
    const phases = ['Discover', 'Decide', 'Design', 'Build', 'Launch', 'Review', 'Iterate'];
    const workflow: WorkflowStep[] = [];
    const allowedTools = context.allowedTools;

    const philosophy = context.assessment.philosophy;
    const isAutomatic = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';

    for (const phase of phases) {
      const phaseTool = this.findToolForPhase(tools, phase) || this.findBestToolFromPool(allowedTools, phase, tools);
      const roles = this.getRolesForPhase(phase, isAutomatic, isHybrid);

      workflow.push({
        phase,
        tool: phaseTool?.displayName || this.getFallbackToolName(phase),
        aiAgentRole: roles.aiRole,
        humanRole: roles.humanRole,
        outcome: roles.outcome,
      });
    }

    return workflow;
  }

  private findToolForPhase(tools: Tool[], phase: string): Tool | null {
    const phaseMap = this.phaseCategoryMap || DEFAULT_PHASE_CATEGORY_MAP;
    const preferredCategories = phaseMap[phase] || [];

    for (const category of preferredCategories) {
      const match = tools.find(t => t.category === category);
      if (match) return match;
    }

    // Fallback: for Mono-stack, the anchor tool often covers multiple phases
    const multiPhaseTool = tools.find(t => FALLBACK_MULTI_PHASE_TOOLS.includes(t.name));
    if (multiPhaseTool && ['Discover', 'Decide', 'Iterate'].includes(phase)) {
      return multiPhaseTool;
    }

    return null;
  }

  /**
   * Search the full allowed-tools pool for the best tool matching a phase's eligible categories.
   * Uses data-driven phase category map when available.
   */
  private findBestToolFromPool(allowedTools: Tool[], phase: string, existingTools: Tool[]): Tool | null {
    const phaseMap = this.phaseCategoryMap || DEFAULT_PHASE_CATEGORY_MAP;
    const preferredCategories = phaseMap[phase] || [];

    for (const category of preferredCategories) {
      const candidates = allowedTools
        .filter(t => t.category === category && !existingTools.some(e => e.id === t.id))
        .sort((a, b) => {
          const scoreA = (a.popularityScore ?? 50) * 0.6 + (a.popularityMomentum ?? 50) * 0.4;
          const scoreB = (b.popularityScore ?? 50) * 0.6 + (b.popularityMomentum ?? 50) * 0.4;
          return scoreB - scoreA;
        });

      if (candidates.length > 0) return candidates[0];
    }

    return null;
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

  private getRolesForPhase(phase: string, isAutomatic: boolean, isHybrid: boolean) {
    const roles: Record<string, { aiRole: string; humanRole: string; outcome: string }> = {
      'Discover': {
        aiRole: isAutomatic
          ? 'Generate feature ideas from market data and user feedback'
          : isHybrid
            ? 'Suggest ideas, draft initial concepts'
            : 'Provide templates and inspiration',
        humanRole: isAutomatic
          ? 'Review and prioritize AI suggestions'
          : isHybrid
            ? 'Brainstorm, refine AI suggestions'
            : 'Lead brainstorming sessions',
        outcome: 'Prioritized feature backlog',
      },
      'Decide': {
        aiRole: isAutomatic
          ? 'Auto-generate specs, create tickets, estimate effort'
          : isHybrid
            ? 'Draft specs, suggest task breakdowns'
            : 'Assist with documentation',
        humanRole: isAutomatic
          ? 'Approve specs, adjust priorities'
          : isHybrid
            ? 'Finalize specs, assign tasks'
            : 'Create specs and plans',
        outcome: 'Sprint-ready task breakdown',
      },
      'Design': {
        aiRole: isAutomatic
          ? 'Generate UI mockups, create design variations, build prototypes'
          : isHybrid
            ? 'Suggest layouts, auto-generate component variants'
            : 'Provide design templates and assets',
        humanRole: isAutomatic
          ? 'Review designs, ensure brand consistency'
          : isHybrid
            ? 'Create wireframes, refine AI-generated designs'
            : 'Lead design process, create all assets',
        outcome: 'Approved design specs and prototypes',
      },
      'Build': {
        aiRole: isAutomatic
          ? 'Generate code, automate tests, create PRs'
          : isHybrid
            ? 'Pair programming, code suggestions'
            : 'Code completion, linting',
        humanRole: isAutomatic
          ? 'Code review, quality gates'
          : isHybrid
            ? 'Implement features, make decisions'
            : 'Write code, architect solutions',
        outcome: 'Working feature implementation',
      },
      'Launch': {
        aiRole: isAutomatic
          ? 'Auto-deploy to staging/production, run smoke tests, notify channels'
          : isHybrid
            ? 'Prepare deployment configs, run pre-flight checks'
            : 'Assist with deployment scripts',
        humanRole: isAutomatic
          ? 'Approve production deploys, monitor rollout'
          : isHybrid
            ? 'Trigger deploys, verify health checks'
            : 'Manage full deployment process',
        outcome: 'Deployed feature with monitoring',
      },
      'Review': {
        aiRole: isAutomatic
          ? 'Auto-summarize meetings, generate reports'
          : isHybrid
            ? 'Transcribe meetings, draft summaries'
            : 'Meeting transcription',
        humanRole: isAutomatic
          ? 'Stakeholder presentations'
          : isHybrid
            ? 'Conduct reviews, gather feedback'
            : 'Run demos, collect feedback',
        outcome: 'Validated feature with feedback',
      },
      'Iterate': {
        aiRole: isAutomatic
          ? 'Analyze metrics, suggest improvements, create tickets'
          : isHybrid
            ? 'Generate reports, suggest iterations'
            : 'Surface relevant data',
        humanRole: isAutomatic
          ? 'Strategic decisions, prioritization'
          : isHybrid
            ? 'Decide on next steps'
            : 'Analyze and plan iterations',
        outcome: 'Next iteration plan',
      },
    };

    return roles[phase] || { aiRole: '', humanRole: '', outcome: '' };
  }

  private calculateCost(tools: Tool[]): number {
    return tools.reduce((sum, t) => sum + (t.estimatedCostPerUser || 0), 0);
  }

  private calculateComplexityReduction(originalCount: number, newCount: number): number {
    if (originalCount === 0) return 0;
    const reduction = ((originalCount - newCount) / originalCount) * 100;
    return Math.max(0, Math.min(100, Math.round(reduction)));
  }
}

// Singleton
let scenarioBuilderInstance: ScenarioBuilder | null = null;

export function getScenarioBuilder(): ScenarioBuilder {
  if (!scenarioBuilderInstance) {
    scenarioBuilderInstance = new ScenarioBuilder();
  }
  return scenarioBuilderInstance;
}

export default getScenarioBuilder;
