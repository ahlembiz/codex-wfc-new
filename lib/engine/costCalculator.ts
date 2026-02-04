import type { Tool } from '@prisma/client';
import type { BuiltScenario } from './scenarioBuilder';

export interface CostProjection {
  year: number;
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercentage: number;
}

export interface CostAnalysis {
  currentMonthlyCostPerUser: number;
  projectedMonthlyCostPerUser: number;
  monthlyPerUserSavings: number;

  currentYearlyCosts: number[]; // 5-year projection
  projectedYearlyCosts: number[]; // 5-year projection

  fiveYearProjection: CostProjection[];

  costProjectionLatex: string;

  breakEvenMonths: number | null;
  totalFiveYearSavings: number;
}

/**
 * Cost Calculator - Calculate and project costs for scenarios
 */
export class CostCalculator {
  // Annual growth rate assumptions
  private readonly teamGrowthRate = 0.2; // 20% YoY team growth for startups
  private readonly toolInflationRate = 0.05; // 5% annual price increases

  /**
   * Calculate full cost analysis for a scenario
   */
  calculateCostAnalysis(
    scenario: BuiltScenario,
    currentTools: Tool[],
    teamSize: number
  ): CostAnalysis {
    // Calculate current costs
    const currentMonthlyCostPerUser = this.calculateMonthlyPerUser(currentTools);
    const projectedMonthlyCostPerUser = scenario.estimatedMonthlyCostPerUser;

    // Calculate monthly savings
    const monthlyPerUserSavings = currentMonthlyCostPerUser - projectedMonthlyCostPerUser;

    // Generate 5-year projections
    const currentYearlyCosts: number[] = [];
    const projectedYearlyCosts: number[] = [];
    const fiveYearProjection: CostProjection[] = [];

    let currentTeamSize = teamSize;
    let currentToolCost = currentMonthlyCostPerUser;
    let projectedToolCost = projectedMonthlyCostPerUser;

    for (let year = 1; year <= 5; year++) {
      // Apply growth and inflation
      if (year > 1) {
        currentTeamSize = Math.ceil(currentTeamSize * (1 + this.teamGrowthRate));
        currentToolCost *= (1 + this.toolInflationRate);
        projectedToolCost *= (1 + this.toolInflationRate);
      }

      const currentYearlyCost = Math.round(currentToolCost * currentTeamSize * 12);
      const projectedYearlyCost = Math.round(projectedToolCost * currentTeamSize * 12);
      const savings = currentYearlyCost - projectedYearlyCost;

      currentYearlyCosts.push(currentYearlyCost);
      projectedYearlyCosts.push(projectedYearlyCost);

      fiveYearProjection.push({
        year,
        currentCost: currentYearlyCost,
        projectedCost: projectedYearlyCost,
        savings,
        savingsPercentage: currentYearlyCost > 0
          ? Math.round((savings / currentYearlyCost) * 100)
          : 0,
      });
    }

    // Calculate break-even (if there's migration cost, which we'll assume is 0 for now)
    const breakEvenMonths = monthlyPerUserSavings > 0 ? null : null;

    // Calculate total 5-year savings
    const totalFiveYearSavings = fiveYearProjection.reduce((sum, p) => sum + p.savings, 0);

    // Generate LaTeX formula
    const costProjectionLatex = this.generateLatexFormula(
      currentMonthlyCostPerUser,
      projectedMonthlyCostPerUser,
      teamSize
    );

    return {
      currentMonthlyCostPerUser,
      projectedMonthlyCostPerUser,
      monthlyPerUserSavings,
      currentYearlyCosts,
      projectedYearlyCosts,
      fiveYearProjection,
      costProjectionLatex,
      breakEvenMonths,
      totalFiveYearSavings,
    };
  }

  /**
   * Calculate monthly cost per user for a set of tools
   */
  calculateMonthlyPerUser(tools: Tool[]): number {
    let total = 0;
    for (const tool of tools) {
      if (tool.estimatedCostPerUser !== null) {
        total += tool.estimatedCostPerUser;
      }
    }
    return total;
  }

  /**
   * Calculate total monthly cost for a team
   */
  calculateTotalMonthlyCost(tools: Tool[], teamSize: number): number {
    return this.calculateMonthlyPerUser(tools) * teamSize;
  }

  /**
   * Generate LaTeX formula for cost projection
   */
  private generateLatexFormula(
    currentCost: number,
    projectedCost: number,
    teamSize: number
  ): string {
    const savings = currentCost - projectedCost;
    const savingsPercent = currentCost > 0
      ? Math.round((savings / currentCost) * 100)
      : 0;

    // LaTeX formula showing the cost comparison
    return `\\text{Current: } \\$${currentCost.toFixed(2)} \\times ${teamSize} = \\$${(currentCost * teamSize).toFixed(2)}/\\text{mo} \\\\
\\text{Projected: } \\$${projectedCost.toFixed(2)} \\times ${teamSize} = \\$${(projectedCost * teamSize).toFixed(2)}/\\text{mo} \\\\
\\text{Savings: } ${savingsPercent}\\% \\approx \\$${(savings * teamSize * 12).toFixed(0)}/\\text{yr}`;
  }

  /**
   * Compare costs between scenarios
   */
  compareScenarios(
    scenarios: BuiltScenario[],
    currentTools: Tool[],
    teamSize: number
  ): Map<string, CostAnalysis> {
    const comparisons = new Map<string, CostAnalysis>();

    for (const scenario of scenarios) {
      const analysis = this.calculateCostAnalysis(scenario, currentTools, teamSize);
      comparisons.set(scenario.title, analysis);
    }

    return comparisons;
  }

  /**
   * Get the most cost-effective scenario
   */
  getMostCostEffective(
    scenarios: BuiltScenario[],
    currentTools: Tool[],
    teamSize: number
  ): { scenario: BuiltScenario; analysis: CostAnalysis } | null {
    if (scenarios.length === 0) return null;

    let bestScenario = scenarios[0];
    let bestAnalysis = this.calculateCostAnalysis(scenarios[0], currentTools, teamSize);
    let bestSavings = bestAnalysis.totalFiveYearSavings;

    for (let i = 1; i < scenarios.length; i++) {
      const analysis = this.calculateCostAnalysis(scenarios[i], currentTools, teamSize);
      if (analysis.totalFiveYearSavings > bestSavings) {
        bestScenario = scenarios[i];
        bestAnalysis = analysis;
        bestSavings = analysis.totalFiveYearSavings;
      }
    }

    return { scenario: bestScenario, analysis: bestAnalysis };
  }

  /**
   * Estimate transition cost (switching tools)
   */
  estimateTransitionCost(
    currentTools: Tool[],
    newTools: Tool[],
    teamSize: number,
    hourlyRate: number = 75
  ): number {
    // Count tools being replaced
    const currentIds = new Set(currentTools.map(t => t.id));
    const newIds = new Set(newTools.map(t => t.id));

    let toolsToRemove = 0;
    let toolsToAdd = 0;

    for (const id of currentIds) {
      if (!newIds.has(id)) toolsToRemove++;
    }

    for (const id of newIds) {
      if (!currentIds.has(id)) toolsToAdd++;
    }

    // Estimate hours per tool transition
    const hoursPerToolRemoval = 4; // Data export, documentation
    const hoursPerToolSetup = 8; // Setup, configuration, learning

    const totalHours = (toolsToRemove * hoursPerToolRemoval + toolsToAdd * hoursPerToolSetup) * teamSize;

    return totalHours * hourlyRate;
  }
}

// Singleton
let costCalculatorInstance: CostCalculator | null = null;

export function getCostCalculator(): CostCalculator {
  if (!costCalculatorInstance) {
    costCalculatorInstance = new CostCalculator();
  }
  return costCalculatorInstance;
}

export default getCostCalculator;
