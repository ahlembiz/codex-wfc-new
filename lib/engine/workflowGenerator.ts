/**
 * @deprecated This module is not used by the main diagnosis pipeline.
 * Workflow generation is handled inline by scenarioBuilder.ts → workflowIntelligenceService.ts.
 * Kept for reference only. Will be removed in a future cleanup.
 */
import type { Tool, WorkflowPhase } from '@prisma/client';
import type { PipelineContext } from './decisionPipeline';

export interface DetailedWorkflowStep {
  phase: WorkflowPhase;
  phaseName: string;
  tool: Tool;
  toolDisplayName: string;
  aiAgentRole: string;
  humanRole: string;
  outcome: string;
  integrations: string[];
  estimatedTimePerWeek: string;
}

export interface GeneratedWorkflow {
  steps: DetailedWorkflowStep[];
  weeklyHumanHours: number;
  weeklyAiHours: number;
  automationPercentage: number;
}

/**
 * Workflow Generator - Creates detailed workflow steps for scenarios
 */
export class WorkflowGenerator {
  /**
   * Generate a detailed workflow for a set of tools
   */
  generateWorkflow(
    tools: Tool[],
    context: PipelineContext
  ): GeneratedWorkflow {
    const steps: DetailedWorkflowStep[] = [];
    const phases: Array<{ enum: WorkflowPhase; name: string }> = [
      { enum: 'DISCOVER', name: 'Discover' },
      { enum: 'DECIDE', name: 'Decide' },
      { enum: 'DESIGN', name: 'Design' },
      { enum: 'BUILD', name: 'Build' },
      { enum: 'LAUNCH', name: 'Launch' },
      { enum: 'REVIEW', name: 'Review' },
      { enum: 'ITERATE', name: 'Iterate' },
    ];

    const philosophy = context.assessment.philosophy;
    let totalHumanHours = 0;
    let totalAiHours = 0;

    for (const phase of phases) {
      const tool = this.selectToolForPhase(tools, phase.enum);
      const step = this.generateStep(tool, phase, context);
      steps.push(step);

      // Estimate time allocation
      const { humanHours, aiHours } = this.estimateTimeAllocation(phase.enum, philosophy);
      totalHumanHours += humanHours;
      totalAiHours += aiHours;
    }

    const automationPercentage = Math.round(
      (totalAiHours / (totalHumanHours + totalAiHours)) * 100
    );

    return {
      steps,
      weeklyHumanHours: totalHumanHours,
      weeklyAiHours: totalAiHours,
      automationPercentage,
    };
  }

  private selectToolForPhase(tools: Tool[], phase: WorkflowPhase): Tool {
    // Map phases to preferred categories
    const phasePreferences: Partial<Record<WorkflowPhase, string[]>> = {
      DISCOVER: ['DOCUMENTATION', 'AI_ASSISTANTS', 'COMMUNICATION', 'GROWTH'],
      DECIDE: ['PROJECT_MANAGEMENT', 'DOCUMENTATION', 'AI_ASSISTANTS'],
      DESIGN: ['DESIGN', 'AI_BUILDERS'],
      BUILD: ['DEVELOPMENT', 'AI_BUILDERS', 'AI_ASSISTANTS', 'PROJECT_MANAGEMENT'],
      LAUNCH: ['DEVELOPMENT', 'AUTOMATION', 'COMMUNICATION', 'ANALYTICS'],
      REVIEW: ['MEETINGS', 'COMMUNICATION', 'ANALYTICS'],
      ITERATE: ['ANALYTICS', 'GROWTH', 'PROJECT_MANAGEMENT', 'DOCUMENTATION'],
    };

    const preferred = phasePreferences[phase] || [];

    for (const category of preferred) {
      const match = tools.find(t => t.category === category);
      if (match) return match;
    }

    // Fallback to first tool
    return tools[0];
  }

  private generateStep(
    tool: Tool,
    phase: { enum: WorkflowPhase; name: string },
    context: PipelineContext
  ): DetailedWorkflowStep {
    const philosophy = context.assessment.philosophy;
    const { aiRole, humanRole, outcome } = this.getRolesForPhase(phase.enum, philosophy);

    // Find integrations with other tools in the stack
    const integrations = this.findIntegrations(tool, context.allowedTools);

    // Estimate time
    const timeEstimate = this.getTimeEstimate(phase.enum, philosophy);

    return {
      phase: phase.enum,
      phaseName: phase.name,
      tool,
      toolDisplayName: tool.displayName,
      aiAgentRole: aiRole,
      humanRole,
      outcome,
      integrations,
      estimatedTimePerWeek: timeEstimate,
    };
  }

  private getRolesForPhase(
    phase: WorkflowPhase,
    philosophy: string
  ): { aiRole: string; humanRole: string; outcome: string } {
    const isAutoPilot = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';

    const roles: Partial<Record<WorkflowPhase, { auto: any; hybrid: any; copilot: any }>> = {
      DISCOVER: {
        auto: {
          aiRole: 'Autonomous idea generation from market data, user feedback, and competitor analysis',
          humanRole: 'Strategic prioritization and approval of AI-generated concepts',
          outcome: 'AI-curated feature backlog with market validation scores',
        },
        hybrid: {
          aiRole: 'Generate initial ideas, draft PRDs, suggest user stories',
          humanRole: 'Brainstorm with team, refine AI drafts, set vision',
          outcome: 'Collaborative feature backlog with team input',
        },
        copilot: {
          aiRole: 'Provide templates, surface relevant examples',
          humanRole: 'Lead ideation sessions, create initial concepts',
          outcome: 'Human-driven feature backlog',
        },
      },
      DECIDE: {
        auto: {
          aiRole: 'Auto-generate specs, create and assign tickets, estimate complexity',
          humanRole: 'Approve generated artifacts, adjust edge cases',
          outcome: 'Sprint-ready backlog with auto-assigned tasks',
        },
        hybrid: {
          aiRole: 'Draft specifications, suggest task breakdowns, flag risks',
          humanRole: 'Review and refine specs, make architectural decisions',
          outcome: 'Detailed project plan with human oversight',
        },
        copilot: {
          aiRole: 'Assist with documentation, format templates',
          humanRole: 'Create specifications, plan sprints, assign work',
          outcome: 'Human-authored project plan',
        },
      },
      DESIGN: {
        auto: {
          aiRole: 'Generate UI mockups from specs, create design variations, build prototypes',
          humanRole: 'Review designs, ensure brand consistency, approve specs',
          outcome: 'AI-generated design specs with human approval',
        },
        hybrid: {
          aiRole: 'Suggest layouts, auto-generate component variants, assist with prototyping',
          humanRole: 'Create wireframes, refine AI-generated designs, build interactions',
          outcome: 'Collaborative design with AI-assisted prototypes',
        },
        copilot: {
          aiRole: 'Provide design templates, auto-layout assistance',
          humanRole: 'Lead design process, create all wireframes and prototypes',
          outcome: 'Human-designed prototypes with AI assist',
        },
      },
      BUILD: {
        auto: {
          aiRole: 'Generate code implementations, create designs from specs, run tests',
          humanRole: 'Code review, quality gates, complex problem-solving',
          outcome: 'AI-generated implementation with human QA',
        },
        hybrid: {
          aiRole: 'Pair programming, suggest implementations, automate boilerplate',
          humanRole: 'Write core logic, make design decisions, debug',
          outcome: 'Human-AI collaborative codebase',
        },
        copilot: {
          aiRole: 'Code completion, syntax suggestions, linting',
          humanRole: 'Write all code, make all technical decisions',
          outcome: 'Human-written implementation with AI assist',
        },
      },
      LAUNCH: {
        auto: {
          aiRole: 'Auto-deploy to staging/production, run smoke tests, notify channels',
          humanRole: 'Approve production deploys, monitor rollout health',
          outcome: 'Automated deployment with monitoring',
        },
        hybrid: {
          aiRole: 'Prepare deployment configs, run pre-flight checks, draft announcements',
          humanRole: 'Trigger deploys, verify health checks, coordinate launch',
          outcome: 'Semi-automated deployment with human oversight',
        },
        copilot: {
          aiRole: 'Assist with deployment scripts, surface deployment checklists',
          humanRole: 'Manage full deployment process, coordinate launch',
          outcome: 'Human-managed deployment with AI tooling',
        },
      },
      REVIEW: {
        auto: {
          aiRole: 'Auto-summarize meetings, generate stakeholder reports, track feedback',
          humanRole: 'Present to stakeholders, make strategic decisions',
          outcome: 'Auto-generated review documentation',
        },
        hybrid: {
          aiRole: 'Transcribe meetings, draft summaries, organize feedback',
          humanRole: 'Conduct reviews, gather qualitative feedback',
          outcome: 'Comprehensive review with AI organization',
        },
        copilot: {
          aiRole: 'Record and transcribe meetings',
          humanRole: 'Run demos, collect and synthesize feedback',
          outcome: 'Human-led review process',
        },
      },
      ITERATE: {
        auto: {
          aiRole: 'Analyze metrics, identify patterns, auto-create improvement tickets',
          humanRole: 'Strategic prioritization, long-term planning',
          outcome: 'Data-driven iteration roadmap',
        },
        hybrid: {
          aiRole: 'Generate analytics reports, suggest improvements',
          humanRole: 'Interpret data, decide on next iterations',
          outcome: 'Informed iteration plan',
        },
        copilot: {
          aiRole: 'Surface relevant metrics and data',
          humanRole: 'Analyze data, plan all iterations',
          outcome: 'Human-analyzed iteration plan',
        },
      },
    };

    const phaseRoles = roles[phase];
    if (!phaseRoles) return { aiRole: '', humanRole: '', outcome: '' };
    if (isAutoPilot) return phaseRoles.auto;
    if (isHybrid) return phaseRoles.hybrid;
    return phaseRoles.copilot;
  }

  private findIntegrations(tool: Tool, allTools: Tool[]): string[] {
    // In a real implementation, this would query the integrations table
    // For now, return common integrations based on category
    const commonIntegrations: Record<string, string[]> = {
      PROJECT_MANAGEMENT: ['Slack', 'GitHub', 'Notion'],
      DOCUMENTATION: ['Slack', 'Linear', 'GitHub'],
      COMMUNICATION: ['Notion', 'Linear', 'Google Calendar'],
      DEVELOPMENT: ['Slack', 'Linear', 'Vercel'],
      DESIGN: ['Slack', 'Notion', 'Linear'],
      MEETINGS: ['Slack', 'Notion', 'Google Calendar'],
      AUTOMATION: ['All major tools via API'],
      AI_ASSISTANTS: ['VS Code', 'Slack', 'Notion'],
      AI_BUILDERS: ['GitHub', 'Vercel', 'Supabase'],
      ANALYTICS: ['Slack', 'Notion', 'Google Sheets'],
      GROWTH: ['Slack', 'Zapier', 'Segment'],
    };

    const category = tool.category as string;
    return commonIntegrations[category] || [];
  }

  private getTimeEstimate(phase: WorkflowPhase, philosophy: string): string {
    const isAutoPilot = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';

    const estimates: Partial<Record<WorkflowPhase, { auto: string; hybrid: string; copilot: string }>> = {
      DISCOVER: { auto: '1-2 hrs', hybrid: '3-4 hrs', copilot: '5-6 hrs' },
      DECIDE: { auto: '1-2 hrs', hybrid: '2-3 hrs', copilot: '4-5 hrs' },
      DESIGN: { auto: '2-3 hrs', hybrid: '4-6 hrs', copilot: '8-10 hrs' },
      BUILD: { auto: '10-15 hrs', hybrid: '20-25 hrs', copilot: '30-40 hrs' },
      LAUNCH: { auto: '1-2 hrs', hybrid: '2-3 hrs', copilot: '3-4 hrs' },
      REVIEW: { auto: '1-2 hrs', hybrid: '2-3 hrs', copilot: '3-4 hrs' },
      ITERATE: { auto: '1-2 hrs', hybrid: '2-3 hrs', copilot: '4-5 hrs' },
    };

    const phaseEstimates = estimates[phase];
    if (!phaseEstimates) return '0 hrs';
    if (isAutoPilot) return phaseEstimates.auto;
    if (isHybrid) return phaseEstimates.hybrid;
    return phaseEstimates.copilot;
  }

  private estimateTimeAllocation(
    phase: WorkflowPhase,
    philosophy: string
  ): { humanHours: number; aiHours: number } {
    const isAutoPilot = philosophy === 'Auto-Pilot';
    const isHybrid = philosophy === 'Hybrid';

    // Weekly hours per phase
    const baseHours: Partial<Record<WorkflowPhase, number>> = {
      DISCOVER: 3,
      DECIDE: 3,
      DESIGN: 5,
      BUILD: 20,
      LAUNCH: 3,
      REVIEW: 3,
      ITERATE: 2,
    };

    const base = baseHours[phase] || 0;

    if (isAutoPilot) {
      return { humanHours: base * 0.2, aiHours: base * 0.8 };
    }
    if (isHybrid) {
      return { humanHours: base * 0.5, aiHours: base * 0.5 };
    }
    return { humanHours: base * 0.8, aiHours: base * 0.2 };
  }
}

// Singleton
let workflowGeneratorInstance: WorkflowGenerator | null = null;

export function getWorkflowGenerator(): WorkflowGenerator {
  if (!workflowGeneratorInstance) {
    workflowGeneratorInstance = new WorkflowGenerator();
  }
  return workflowGeneratorInstance;
}

export default getWorkflowGenerator;
