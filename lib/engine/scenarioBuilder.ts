import { getBundleService, type BundleWithTools } from '../services/bundleService';
import { getRedundancyService } from '../services/redundancyService';
import { getReplacementService } from '../services/replacementService';
import { getToolService } from '../services/toolService';
import type { Tool, ScenarioType, WorkflowPhase, ToolCategory } from '@prisma/client';
import type { PipelineContext } from './decisionPipeline';
import type { WorkflowStep } from '../../types';

export type { WorkflowStep } from '../../types';

export interface BuiltScenario {
  title: string;
  scenarioType: ScenarioType;
  tools: Tool[];
  displacementList: string[];
  workflow: WorkflowStep[];
  estimatedMonthlyCostPerUser: number;
  complexityReductionScore: number;
  description?: string;
}

// Phase to category mapping - CORRECT mapping based on actual tool purposes
const PHASE_CATEGORY_MAP: Record<string, string[]> = {
  'Ideation': ['DOCUMENTATION', 'DESIGN', 'AI_ASSISTANTS'],           // Notion, Miro, FigJam, Claude
  'Planning': ['PROJECT_MANAGEMENT', 'DOCUMENTATION'],                 // Linear, Jira, Asana, Notion
  'Execution': ['DEVELOPMENT', 'AI_BUILDERS', 'AI_ASSISTANTS'],       // GitHub, Cursor, Copilot, Bolt, Lovable
  'Review': ['MEETINGS', 'COMMUNICATION'],                             // Fireflies, Loom, Slack, Zoom
  'Iterate': ['ANALYTICS', 'GROWTH', 'PROJECT_MANAGEMENT'],           // PostHog, Amplitude, Intercom, Linear
};

// Tools that can cover multiple phases (good for mono-stack)
const MULTI_PHASE_TOOLS = ['notion', 'clickup', 'linear', 'asana', 'monday'];

// Category priorities for each scenario type
const SCENARIO_CATEGORY_PRIORITIES: Record<string, string[]> = {
  'MONO_STACK': ['DOCUMENTATION', 'COMMUNICATION', 'DEVELOPMENT'],
  'NATIVE_INTEGRATOR': ['PROJECT_MANAGEMENT', 'DOCUMENTATION', 'DEVELOPMENT', 'COMMUNICATION', 'DESIGN', 'ANALYTICS', 'GROWTH'],
  'AGENTIC_LEAN': ['AI_ASSISTANTS', 'AI_BUILDERS', 'AUTOMATION', 'DEVELOPMENT', 'MEETINGS', 'DOCUMENTATION'],
};

/**
 * Scenario Builder - Builds 3 scenario types with integration-aware tool selection
 */
export class ScenarioBuilder {
  private bundleService = getBundleService();
  private redundancyService = getRedundancyService();
  private replacementService = getReplacementService();
  private toolService = getToolService();

  async buildAllScenarios(context: PipelineContext): Promise<BuiltScenario[]> {
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
    const { allowedTools, anchorTool, userTools, displacementList } = context;

    let tools: Tool[] = [];

    // Start with anchor tool (this covers Ideation + Planning + Iterate)
    if (anchorTool) {
      tools.push(anchorTool);
    } else {
      // Find the best multi-phase tool as anchor
      const multiPhaseTool = allowedTools.find(t =>
        MULTI_PHASE_TOOLS.includes(t.name) && t.category === 'DOCUMENTATION'
      ) || allowedTools.find(t => t.name === 'notion');

      if (multiPhaseTool) tools.push(multiPhaseTool);
    }

    // Add communication tool (for Review phase) - prefer tools that integrate with anchor
    if (!this.hasToolCategory(tools, 'COMMUNICATION')) {
      const commTool = await this.findBestToolForCategoryAsync(
        allowedTools,
        'COMMUNICATION',
        tools
      );
      if (commTool) {
        tools.push(commTool);
      }
    }

    // Add development tool (for Execution phase) - prefer tools that integrate with the stack
    if (!this.hasToolCategory(tools, 'DEVELOPMENT')) {
      const devTool = await this.findBestToolForCategoryAsync(
        allowedTools,
        'DEVELOPMENT',
        tools
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

    const workflow = this.buildWorkflow(tools, context);

    return {
      title: 'The Mono-Stack',
      scenarioType: 'MONO_STACK',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
    };
  }

  /**
   * Native Integrator: Best-of-breed tools that integrate well (5-6 tools)
   * Key principle: One tool per major function, optimized for integration quality
   */
  async buildNativeIntegratorScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList, replacementContext } = context;

    let tools: Tool[] = [];

    // Start with anchor if provided
    if (anchorTool) {
      tools.push(anchorTool);
    }

    // Add one tool per essential category, using integration-aware selection
    const essentialCategories = [
      'PROJECT_MANAGEMENT',  // Linear, Jira, Asana - for Planning
      'DOCUMENTATION',       // Notion, Confluence - for Ideation/Docs
      'DEVELOPMENT',         // GitHub, GitLab - for Execution
      'COMMUNICATION',       // Slack - for async
      'MEETINGS',            // Fireflies, Zoom - for Review
    ];

    // Build the stack incrementally, each new tool selection considers
    // integration with already-selected tools
    for (const category of essentialCategories) {
      // Skip if anchor already covers this category
      if (anchorTool?.category === category) continue;

      // Skip if we already have a tool in this category
      if (this.hasToolCategory(tools, category)) continue;

      // Find best tool for this category using integration-aware selection
      const categoryTool = await this.findBestToolForCategoryAsync(
        allowedTools,
        category,
        tools
      );
      if (categoryTool) {
        tools.push(categoryTool);
      }
    }

    // Check for replacements that would improve the stack
    tools = await this.applyReplacements(tools, allowedTools, replacementContext);

    // Remove any redundant tools
    tools = await this.removeRedundantTools(tools, anchorTool?.id);

    const additionalDisplacements = userTools
      .filter(ut => !tools.some(t => t.id === ut.id))
      .map(ut => ut.displayName);

    const workflow = this.buildWorkflow(tools, context);

    return {
      title: 'The Native Integrator',
      scenarioType: 'NATIVE_INTEGRATOR',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
    };
  }

  /**
   * Agentic Lean: AI-first tools for maximum automation (5-7 tools)
   * Key principle: Every tool should have AI capabilities, optimized for integration
   */
  async buildAgenticLeanScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList } = context;

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
    const aiCategories: ToolCategory[] = [
      'AI_ASSISTANTS',
      'AI_BUILDERS',
      'DEVELOPMENT',
      'MEETINGS',
      'DOCUMENTATION',
      'PROJECT_MANAGEMENT',
      'AUTOMATION',
      'GROWTH',
    ];

    for (const category of aiCategories) {
      if (this.hasToolCategory(tools, category)) continue;

      // Use integration-aware selection, but only among AI-enabled tools
      const aiCandidates = aiTools.filter(
        t => t.category === category && !tools.some(e => e.id === t.id)
      );

      if (aiCandidates.length === 0) continue;

      // If we have tools already, score by integration; otherwise by popularity
      if (tools.length > 0) {
        const toolIds = tools.map(t => t.id);
        const scored = await Promise.all(
          aiCandidates.map(async t => {
            const integrationScore = await this.toolService.calculateIntegrationScore(
              t.id,
              toolIds
            );
            const popularityScore = t.popularityScore ?? 50;
            return { tool: t, score: integrationScore * 0.5 + popularityScore * 0.5 };
          })
        );
        scored.sort((a, b) => b.score - a.score);
        if (scored[0]) {
          tools.push(scored[0].tool);
        }
      } else {
        // No tools yet, fall back to popularity + momentum
        aiCandidates.sort((a, b) => {
          const scoreA = (a.popularityScore ?? 50) * 0.6 + (a.popularityMomentum ?? 50) * 0.4;
          const scoreB = (b.popularityScore ?? 50) * 0.6 + (b.popularityMomentum ?? 50) * 0.4;
          return scoreB - scoreA;
        });
        tools.push(aiCandidates[0]);
      }
    }

    // Add communication tool (even if not AI-native, it's essential)
    // Use integration-aware selection
    if (!this.hasToolCategory(tools, 'COMMUNICATION')) {
      const commTool = await this.findBestToolForCategoryAsync(
        allowedTools,
        'COMMUNICATION',
        tools
      );
      if (commTool) tools.push(commTool);
    }

    // Remove redundant tools
    tools = await this.removeRedundantTools(tools);

    const additionalDisplacements = userTools
      .filter(ut => !tools.some(t => t.id === ut.id))
      .map(ut => ut.displayName);

    const workflow = this.buildWorkflow(tools, context);

    return {
      title: 'The Agentic Lean',
      scenarioType: 'AGENTIC_LEAN',
      tools,
      displacementList: [...new Set([...displacementList, ...additionalDisplacements])],
      workflow,
      estimatedMonthlyCostPerUser: this.calculateCost(tools),
      complexityReductionScore: this.calculateComplexityReduction(userTools.length, tools.length),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private hasToolCategory(tools: Tool[], category: string): boolean {
    return tools.some(t => t.category === category);
  }

  /**
   * Find best tool for a category using integration-aware selection.
   * Combines integration quality (50%) with popularity (50%) for ranking.
   */
  private async findBestToolForCategoryAsync(
    allowedTools: Tool[],
    category: string,
    existingTools: Tool[]
  ): Promise<Tool | null> {
    const existingToolIds = existingTools.map(t => t.id);
    const existingSet = new Set(existingToolIds);

    // Filter candidates by category and not already selected
    const candidates = allowedTools.filter(
      t => t.category === category && !existingSet.has(t.id)
    );

    if (candidates.length === 0) return null;

    // If no existing tools to integrate with, fall back to popularity
    if (existingTools.length === 0) {
      const sorted = candidates.sort((a, b) => {
        const scoreA = (a.popularityScore ?? 50) * 0.6 + (a.popularityMomentum ?? 50) * 0.4;
        const scoreB = (b.popularityScore ?? 50) * 0.6 + (b.popularityMomentum ?? 50) * 0.4;
        return scoreB - scoreA;
      });
      return sorted[0] || null;
    }

    // Score each candidate by integration + popularity
    const scored = await Promise.all(
      candidates.map(async tool => {
        const integrationScore = await this.toolService.calculateIntegrationScore(
          tool.id,
          existingToolIds
        );
        const popularityScore = tool.popularityScore ?? 50;

        // 50% integration, 50% popularity
        const compositeScore = integrationScore * 0.5 + popularityScore * 0.5;

        return { tool, compositeScore, integrationScore };
      })
    );

    // Sort by composite score descending
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

  private buildWorkflow(tools: Tool[], context: PipelineContext): WorkflowStep[] {
    const phases = ['Ideation', 'Planning', 'Execution', 'Review', 'Iterate'];
    const workflow: WorkflowStep[] = [];

    const philosophy = context.assessment.philosophy;
    const isAutomatic = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';

    for (const phase of phases) {
      const phaseTool = this.findToolForPhase(tools, phase);
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
    const preferredCategories = PHASE_CATEGORY_MAP[phase] || [];

    for (const category of preferredCategories) {
      const match = tools.find(t => t.category === category);
      if (match) return match;
    }

    // Fallback: for Mono-stack, the anchor tool often covers multiple phases
    // Check if we have a multi-phase tool
    const multiPhaseTool = tools.find(t => MULTI_PHASE_TOOLS.includes(t.name));
    if (multiPhaseTool && ['Ideation', 'Planning', 'Iterate'].includes(phase)) {
      return multiPhaseTool;
    }

    return tools[0] || null;
  }

  private getFallbackToolName(phase: string): string {
    const fallbacks: Record<string, string> = {
      'Ideation': 'Documentation Tool',
      'Planning': 'Project Management Tool',
      'Execution': 'Development Tool',
      'Review': 'Meeting Tool',
      'Iterate': 'Analytics Tool',
    };
    return fallbacks[phase] || 'TBD';
  }

  private getRolesForPhase(phase: string, isAutomatic: boolean, isHybrid: boolean) {
    const roles: Record<string, { aiRole: string; humanRole: string; outcome: string }> = {
      'Ideation': {
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
      'Planning': {
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
      'Execution': {
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
