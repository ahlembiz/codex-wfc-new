import { getToolService } from '../services/toolService';
import { getRedundancyService } from '../services/redundancyService';
import { getReplacementService, type ReplacementContext } from '../services/replacementService';
import type { Tool, TeamSize, Stage, TechSavviness, PricingTier } from '@prisma/client';
import { ComplianceRequirement, TeamSizeBucket } from '../../types';

export interface ScoredTool {
  tool: Tool;
  score: number;
  breakdown: {
    fitScore: number;
    popularityScore: number;
    costScore: number;
    aiScore: number;
  };
}

// Assessment data from frontend - uses canonical enum types
export interface AssessmentInput {
  company: string;
  stage: string; // "Bootstrapping" | "Pre-Seed" | "Early-Seed" | "Growth" | "Established"
  teamSize: TeamSizeBucket; // Canonical enum value
  teamSizeRaw?: string; // Optional raw value for backward compatibility
  currentTools: string; // comma-separated tool names
  philosophy: string; // "Co-Pilot" | "Hybrid" | "Auto-Pilot"
  techSavviness: string; // "Newbie" | "Decent" | "Ninja"
  budgetPerUser: number;
  costSensitivity: string; // "Price-First" | "Balanced" | "Value-First"
  sensitivity: string; // "Low-Stakes" | "High-Stakes"
  highStakesRequirements: ComplianceRequirement[]; // Canonical enum values
  agentReadiness: boolean;
  anchorType: string;
  painPoints: string[];
  isSoloFounder: boolean;
  otherAnchorText: string;
}

export interface PipelineContext {
  assessment: AssessmentInput;
  userTools: Tool[];
  userToolIds: string[];
  allowedTools: Tool[];
  anchorToolId: string | null;
  anchorTool: Tool | null;
  displacementList: string[];
  teamSizeEnum: TeamSize;
  stageEnum: Stage;
  techSavvinessEnum: TechSavviness;
  replacementContext: ReplacementContext;
}

/**
 * Decision Pipeline - Applies filters in order:
 * Compliance → Anchor → Budget → Pain → Savviness → Philosophy
 */
export class DecisionPipeline {
  private toolService = getToolService();
  private redundancyService = getRedundancyService();
  private replacementService = getReplacementService();

  /**
   * Run the full decision pipeline
   */
  async run(assessment: AssessmentInput): Promise<PipelineContext> {
    // 1. Parse user tools
    const toolNames = this.parseToolNames(assessment.currentTools);
    const matchResults = await this.toolService.matchToolNames(toolNames);

    const userTools: Tool[] = [];
    const userToolIds: string[] = [];

    for (const [, match] of matchResults) {
      if (match) {
        userTools.push(match.tool);
        userToolIds.push(match.tool.id);
      }
    }

    // 2. Convert enums - teamSize is already canonical, just map to Prisma enum
    const teamSizeEnum = this.mapTeamSizeToPrisma(assessment.teamSize);
    const stageEnum = this.parseStage(assessment.stage);
    const techSavvinessEnum = this.parseTechSavviness(assessment.techSavviness);

    // 3. Get all tools and apply filters
    let allowedTools = await this.toolService.getAllTools();

    // Filter by compliance requirements
    allowedTools = this.filterByCompliance(allowedTools, assessment);

    // Filter by budget
    allowedTools = this.filterByBudget(allowedTools, assessment);

    // Filter by tech savviness
    allowedTools = this.filterByTechSavviness(allowedTools, techSavvinessEnum);

    // Filter by team size and stage
    allowedTools = this.filterByFit(allowedTools, teamSizeEnum, stageEnum);

    // Multi-factor scoring: fit 30%, popularity 30%, cost 20%, AI readiness 20%
    const scoredTools = this.scoreAndRankTools(allowedTools, {
      teamSize: teamSizeEnum,
      stage: stageEnum,
      philosophy: assessment.philosophy,
      budgetPerUser: assessment.budgetPerUser,
    });
    allowedTools = scoredTools.map(st => st.tool);

    // 4. Resolve anchor tool
    const { anchorToolId, anchorTool } = this.resolveAnchor(assessment, userTools);

    // 5. Analyze redundancies to build displacement list
    const redundancyAnalysis = await this.redundancyService.analyzeRedundancies(
      userToolIds,
      anchorToolId || undefined
    );

    const displacementList = redundancyAnalysis.displacementSuggestions.map(
      s => s.displace.displayName
    );

    // 6. Build replacement context
    const replacementContext: ReplacementContext = {
      costSensitivity: this.mapCostSensitivity(assessment.costSensitivity),
      techSavviness: techSavvinessEnum,
      teamSize: teamSizeEnum,
      requiresCompliance: assessment.highStakesRequirements,
      preferAiNative: assessment.philosophy === 'Auto-Pilot',
    };

    return {
      assessment,
      userTools,
      userToolIds,
      allowedTools,
      anchorToolId,
      anchorTool,
      displacementList,
      teamSizeEnum,
      stageEnum,
      techSavvinessEnum,
      replacementContext,
    };
  }

  // ============================================
  // Filter Methods
  // ============================================

  private filterByCompliance(tools: Tool[], assessment: AssessmentInput): Tool[] {
    if (assessment.sensitivity !== 'High-Stakes' || assessment.highStakesRequirements.length === 0) {
      return tools;
    }

    return tools.filter(tool => {
      for (const req of assessment.highStakesRequirements) {
        // Use canonical ComplianceRequirement enum values
        switch (req) {
          case ComplianceRequirement.SOC2:
            if (!tool.soc2) return false;
            break;
          case ComplianceRequirement.HIPAA:
            if (!tool.hipaa) return false;
            break;
          case ComplianceRequirement.EUDataResidency:
            if (!tool.gdpr && !tool.euDataResidency) return false;
            break;
          case ComplianceRequirement.SelfHosted:
            if (!tool.selfHosted) return false;
            break;
          case ComplianceRequirement.AirGapped:
            if (!tool.airGapped) return false;
            break;
        }
      }
      return true;
    });
  }

  private filterByBudget(tools: Tool[], assessment: AssessmentInput): Tool[] {
    const maxBudget = assessment.budgetPerUser;

    // For Price-First, be strict about budget
    if (assessment.costSensitivity === 'Price-First') {
      return tools.filter(tool => {
        if (tool.hasFreeForever) return true;
        if (tool.estimatedCostPerUser === null) return true;
        return tool.estimatedCostPerUser <= maxBudget;
      });
    }

    // For Balanced, allow some flexibility (1.5x budget)
    if (assessment.costSensitivity === 'Balanced') {
      return tools.filter(tool => {
        if (tool.hasFreeForever) return true;
        if (tool.estimatedCostPerUser === null) return true;
        return tool.estimatedCostPerUser <= maxBudget * 1.5;
      });
    }

    // For Value-First, only filter out enterprise-tier tools if budget is low
    if (assessment.costSensitivity === 'Value-First') {
      if (maxBudget < 20) {
        return tools.filter(tool => tool.typicalPricingTier !== 'ENTERPRISE');
      }
    }

    return tools;
  }

  private filterByTechSavviness(tools: Tool[], savviness: TechSavviness): Tool[] {
    // Ninjas can use anything
    if (savviness === 'NINJA') return tools;

    // Newbies need simpler tools
    if (savviness === 'NEWBIE') {
      return tools.filter(tool =>
        tool.complexity === 'SIMPLE' || tool.complexity === 'MODERATE'
      );
    }

    // Decent users can use up to advanced
    return tools.filter(tool => tool.complexity !== 'EXPERT');
  }

  private filterByFit(tools: Tool[], teamSize: TeamSize, stage: Stage): Tool[] {
    return tools.filter(tool => {
      // If tool has specific fits, check them
      const sizeOk = tool.bestForTeamSize.length === 0 || tool.bestForTeamSize.includes(teamSize);
      const stageOk = tool.bestForStage.length === 0 || tool.bestForStage.includes(stage);
      return sizeOk && stageOk;
    });
  }

  /**
   * Multi-factor scoring: ranks tools by fit (30%), popularity (30%),
   * cost efficiency (20%), and AI readiness (20%).
   */
  private scoreAndRankTools(
    tools: Tool[],
    params: { teamSize: TeamSize; stage: Stage; philosophy: string; budgetPerUser: number },
  ): ScoredTool[] {
    return tools
      .map(tool => {
        // Fit score: 50pts teamSize match + 50pts stage match
        const sizeMatch = tool.bestForTeamSize.length === 0 || tool.bestForTeamSize.includes(params.teamSize) ? 50 : 0;
        const stageMatch = tool.bestForStage.length === 0 || tool.bestForStage.includes(params.stage) ? 50 : 0;
        const fitScore = sizeMatch + stageMatch;

        // Popularity score: stored composite 0-100
        const popularityScore = tool.popularityScore ?? 50;

        // Cost score: free = 90, within budget = 70, over = lower
        let costScore: number;
        if (tool.hasFreeForever && (tool.estimatedCostPerUser === null || tool.estimatedCostPerUser === 0)) {
          costScore = 90;
        } else if (tool.estimatedCostPerUser === null) {
          costScore = 60;
        } else if (tool.estimatedCostPerUser <= params.budgetPerUser) {
          costScore = 70 + 20 * (1 - tool.estimatedCostPerUser / Math.max(params.budgetPerUser, 1));
        } else {
          costScore = Math.max(10, 50 - (tool.estimatedCostPerUser - params.budgetPerUser));
        }

        // AI readiness: features x philosophy alignment
        let aiScore = 0;
        if (tool.hasAiFeatures) {
          switch (params.philosophy) {
            case 'Auto-Pilot': aiScore = 100; break;
            case 'Hybrid': aiScore = 80; break;
            case 'Co-Pilot': aiScore = 60; break;
            default: aiScore = 50;
          }
        } else {
          aiScore = params.philosophy === 'Auto-Pilot' ? 10 : 30;
        }

        const score =
          fitScore * 0.30 +
          popularityScore * 0.30 +
          costScore * 0.20 +
          aiScore * 0.20;

        return { tool, score, breakdown: { fitScore, popularityScore, costScore, aiScore } };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ============================================
  // Anchor Resolution
  // ============================================

  private resolveAnchor(
    assessment: AssessmentInput,
    userTools: Tool[]
  ): { anchorToolId: string | null; anchorTool: Tool | null } {
    let anchorTool: Tool | null = null;

    switch (assessment.anchorType) {
      case 'The Doc-Centric Team (Notion)':
        anchorTool = userTools.find(t =>
          t.name === 'notion' || t.category === 'DOCUMENTATION'
        ) || null;
        break;

      case 'The Dev-Centric Team (GitHub/Cursor)':
        anchorTool = userTools.find(t =>
          t.name === 'github' || t.name === 'gitlab' || t.name === 'cursor' || t.category === 'DEVELOPMENT' || t.category === 'AI_BUILDERS'
        ) || null;
        break;

      case 'The Communication-Centric Team (Slack)':
        anchorTool = userTools.find(t =>
          t.name === 'slack' || t.name === 'discord' || t.name === 'teams' || t.category === 'COMMUNICATION'
        ) || null;
        break;

      case 'Other':
        // Try to find the tool they mentioned
        if (assessment.otherAnchorText) {
          const otherName = assessment.otherAnchorText.toLowerCase().trim();
          anchorTool = userTools.find(t =>
            t.name === otherName ||
            t.displayName.toLowerCase() === otherName ||
            t.aliases.some(a => a.toLowerCase() === otherName)
          ) || null;
        }
        break;

      case "We're just starting! (no Anchor tool yet)":
      default:
        // No anchor
        break;
    }

    return {
      anchorToolId: anchorTool?.id || null,
      anchorTool,
    };
  }

  // ============================================
  // Parse Helpers
  // ============================================

  private parseToolNames(toolsString: string): string[] {
    if (!toolsString.trim()) return [];

    return toolsString
      .split(/[,;]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  /**
   * Map canonical TeamSizeBucket to Prisma TeamSize enum.
   * The validation layer already normalized the input.
   */
  private mapTeamSizeToPrisma(teamSize: TeamSizeBucket): TeamSize {
    // Direct mapping from canonical enum to Prisma enum
    switch (teamSize) {
      case TeamSizeBucket.Solo: return 'SOLO';
      case TeamSizeBucket.Small: return 'SMALL';
      case TeamSizeBucket.Medium: return 'MEDIUM';
      case TeamSizeBucket.Large: return 'LARGE';
      case TeamSizeBucket.Enterprise: return 'ENTERPRISE';
      default: return 'SMALL'; // fallback
    }
  }

  /**
   * @deprecated Use mapTeamSizeToPrisma with canonical TeamSizeBucket instead.
   * Kept for backward compatibility with legacy free-text input.
   */
  private parseTeamSizeLegacy(teamSize: string): TeamSize {
    const size = teamSize.toLowerCase();
    if (size === '1' || size === 'solo') return 'SOLO';
    if (size.includes('2') || size.includes('3') || size.includes('4') || size.includes('5')) return 'SMALL';
    if (size.includes('6') || size.includes('10') || size.includes('20')) return 'MEDIUM';
    if (size.includes('21') || size.includes('50') || size.includes('100')) return 'LARGE';
    if (size.includes('enterprise') || size.includes('100+')) return 'ENTERPRISE';
    return 'SMALL'; // default
  }

  private parseStage(stage: string): Stage {
    switch (stage) {
      case 'Bootstrapping': return 'BOOTSTRAPPING';
      case 'Pre-Seed': return 'PRE_SEED';
      case 'Early-Seed': return 'EARLY_SEED';
      case 'Growth': return 'GROWTH';
      case 'Established': return 'ESTABLISHED';
      default: return 'PRE_SEED';
    }
  }

  private parseTechSavviness(savviness: string): TechSavviness {
    switch (savviness) {
      case 'Newbie': return 'NEWBIE';
      case 'Decent': return 'DECENT';
      case 'Ninja': return 'NINJA';
      default: return 'DECENT';
    }
  }

  private mapCostSensitivity(sensitivity: string): ReplacementContext['costSensitivity'] {
    switch (sensitivity) {
      case 'Price-First': return 'PRICE_FIRST';
      case 'Balanced': return 'BALANCED';
      case 'Value-First': return 'VALUE_FIRST';
      default: return 'BALANCED';
    }
  }
}

// Singleton
let pipelineInstance: DecisionPipeline | null = null;

export function getDecisionPipeline(): DecisionPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new DecisionPipeline();
  }
  return pipelineInstance;
}

export default getDecisionPipeline;
