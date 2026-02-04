import { getBundleService, type BundleWithTools } from '../services/bundleService';
import { getRedundancyService } from '../services/redundancyService';
import { getReplacementService } from '../services/replacementService';
import type { Tool, ScenarioType, WorkflowPhase } from '@prisma/client';
import type { PipelineContext } from './decisionPipeline';

export interface WorkflowStep {
  phase: string;
  tool: string;
  aiAgentRole: string;
  humanRole: string;
  outcome: string;
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
}

// Phase to category mapping - CORRECT mapping based on actual tool purposes
const PHASE_CATEGORY_MAP: Record<string, string[]> = {
  'Ideation': ['DOCUMENTATION', 'DESIGN', 'AI_ASSISTANTS'], // Notion, Miro, FigJam, Claude
  'Planning': ['PROJECT_MANAGEMENT', 'DOCUMENTATION'],       // Linear, Jira, Asana, Notion
  'Execution': ['DEVELOPMENT', 'AI_ASSISTANTS'],             // GitHub, Cursor, Copilot - NOT Design!
  'Review': ['MEETINGS', 'COMMUNICATION'],                   // Fireflies, Loom, Slack, Zoom
  'Iterate': ['ANALYTICS', 'PROJECT_MANAGEMENT'],            // PostHog, Amplitude, Linear
};

// Tools that can cover multiple phases (good for mono-stack)
const MULTI_PHASE_TOOLS = ['notion', 'clickup', 'linear', 'asana', 'monday'];

// Category priorities for each scenario type
const SCENARIO_CATEGORY_PRIORITIES: Record<string, string[]> = {
  'MONO_STACK': ['DOCUMENTATION', 'COMMUNICATION', 'DEVELOPMENT'],
  'NATIVE_INTEGRATOR': ['PROJECT_MANAGEMENT', 'DOCUMENTATION', 'DEVELOPMENT', 'COMMUNICATION', 'DESIGN'],
  'AGENTIC_LEAN': ['AI_ASSISTANTS', 'AUTOMATION', 'DEVELOPMENT', 'MEETINGS', 'DOCUMENTATION'],
};

/**
 * Scenario Builder - Builds 3 scenario types with proper tool selection
 */
export class ScenarioBuilder {
  private bundleService = getBundleService();
  private redundancyService = getRedundancyService();
  private replacementService = getReplacementService();

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
   * Key principle: One tool should cover multiple phases
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

    // Add communication tool (for Review phase)
    const commTool = allowedTools.find(t =>
      t.category === 'COMMUNICATION' && t.name === 'slack'
    ) || allowedTools.find(t => t.category === 'COMMUNICATION');

    if (commTool && !this.hasToolCategory(tools, 'COMMUNICATION')) {
      tools.push(commTool);
    }

    // Add development tool (for Execution phase) - MUST be dev tool, not design
    const devTool = allowedTools.find(t =>
      t.category === 'DEVELOPMENT' && (t.name === 'github' || t.name === 'cursor')
    ) || allowedTools.find(t => t.category === 'DEVELOPMENT');

    if (devTool && !this.hasToolCategory(tools, 'DEVELOPMENT')) {
      tools.push(devTool);
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
   * Key principle: One tool per major function, no redundancy
   */
  async buildNativeIntegratorScenario(context: PipelineContext): Promise<BuiltScenario> {
    const { allowedTools, anchorTool, userTools, displacementList, replacementContext } = context;

    let tools: Tool[] = [];

    // Start with anchor if provided
    if (anchorTool) {
      tools.push(anchorTool);
    }

    // Add one tool per essential category, avoiding redundancy
    const essentialCategories = [
      'PROJECT_MANAGEMENT',  // Linear, Jira, Asana - for Planning
      'DOCUMENTATION',       // Notion, Confluence - for Ideation/Docs
      'DEVELOPMENT',         // GitHub, GitLab - for Execution
      'COMMUNICATION',       // Slack - for async
      'MEETINGS',            // Fireflies, Zoom - for Review
    ];

    for (const category of essentialCategories) {
      // Skip if anchor already covers this category
      if (anchorTool?.category === category) continue;

      // Skip if we already have a tool in this category
      if (this.hasToolCategory(tools, category)) continue;

      // Find best tool for this category
      const categoryTool = this.findBestToolForCategory(allowedTools, category, tools);
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
   * Key principle: Every tool should have AI capabilities
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
      const aiAlternative = aiTools.find(t => t.category === anchorTool.category);
      if (aiAlternative) {
        tools.push(aiAlternative);
      }
    }

    // Add AI tools by essential function
    const aiPriorities = [
      { category: 'AI_ASSISTANTS', preferred: ['claude', 'chatgpt', 'cursor'] },
      { category: 'DEVELOPMENT', preferred: ['cursor', 'copilot', 'codeium'] },
      { category: 'MEETINGS', preferred: ['fireflies', 'otter', 'fathom'] },
      { category: 'DOCUMENTATION', preferred: ['notion', 'coda'] },
      { category: 'PROJECT_MANAGEMENT', preferred: ['linear', 'height', 'clickup'] },
      { category: 'AUTOMATION', preferred: ['zapier', 'make', 'n8n'] },
    ];

    for (const { category, preferred } of aiPriorities) {
      if (this.hasToolCategory(tools, category)) continue;

      // Try preferred tools first
      let found = false;
      for (const name of preferred) {
        const tool = aiTools.find(t => t.name === name && t.category === category);
        if (tool) {
          tools.push(tool);
          found = true;
          break;
        }
      }

      // Fallback to any AI tool in category
      if (!found) {
        const categoryTool = aiTools.find(t =>
          t.category === category && !tools.some(existing => existing.id === t.id)
        );
        if (categoryTool) tools.push(categoryTool);
      }
    }

    // Add communication tool (even if not AI-native, it's essential)
    if (!this.hasToolCategory(tools, 'COMMUNICATION')) {
      const commTool = allowedTools.find(t => t.category === 'COMMUNICATION' && t.name === 'slack');
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

  private findBestToolForCategory(allowedTools: Tool[], category: string, existingTools: Tool[]): Tool | null {
    // Preferred tools by category (ordered by preference)
    const preferences: Record<string, string[]> = {
      'PROJECT_MANAGEMENT': ['linear', 'asana', 'jira', 'clickup', 'monday'],
      'DOCUMENTATION': ['notion', 'confluence', 'coda', 'slite'],
      'DEVELOPMENT': ['github', 'gitlab', 'cursor', 'vscode'],
      'COMMUNICATION': ['slack', 'teams', 'discord'],
      'MEETINGS': ['fireflies', 'zoom', 'loom', 'otter'],
      'DESIGN': ['figma', 'framer', 'canva'],
      'ANALYTICS': ['posthog', 'amplitude', 'mixpanel', 'hotjar'],
      'AUTOMATION': ['zapier', 'make', 'n8n'],
      'AI_ASSISTANTS': ['claude', 'chatgpt', 'copilot', 'cursor'],
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

    // Fallback to any tool in category
    return allowedTools.find(t =>
      t.category === category &&
      !existingTools.some(e => e.id === t.id)
    ) || null;
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
