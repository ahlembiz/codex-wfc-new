export enum Stage {
  Bootstrapping = "Bootstrapping",
  PreSeed = "Pre-Seed",
  EarlySeed = "Early-Seed",
  Growth = "Growth",
  Established = "Established"
}

export enum AutomationPhilosophy {
  CoPilot = "Co-Pilot",
  Hybrid = "Hybrid",
  AutoPilot = "Auto-Pilot"
}

export enum TechSavviness {
  Newbie = "Newbie",
  Decent = "Decent",
  Ninja = "Ninja"
}

export enum ProductSensitivity {
  LowStakes = "Low-Stakes",
  HighStakes = "High-Stakes"
}

export enum CostSensitivity {
  PriceFirst = "Price-First",
  Balanced = "Balanced",
  ValueFirst = "Value-First"
}

export enum AnchorType {
  DocCentric = "The Doc-Centric Team (Notion)",
  DevCentric = "The Dev-Centric Team (GitHub/Cursor)",
  CommCentric = "The Communication-Centric Team (Slack)",
  Other = "Other",
  None = "We're just starting! (no Anchor tool yet)"
}

export interface AssessmentData {
  company: string;
  stage: Stage;
  teamSize: string;
  currentTools: string;
  philosophy: AutomationPhilosophy;
  techSavviness: TechSavviness;
  budgetPerUser: number;
  costSensitivity: CostSensitivity;
  sensitivity: ProductSensitivity;
  highStakesRequirements: string[];
  agentReadiness: boolean;
  anchorType: AnchorType;
  painPoints: string[];
  isSoloFounder: boolean;
  otherAnchorText: string;
}

export interface WorkflowStep {
  phase: string;
  tool: string;
  aiAgentRole: string;
  humanRole: string;
  outcome: string;
}

export interface Scenario {
  title: string;
  description: string;
  complexityReductionScore: number;
  displacementList: string[];
  workflow: WorkflowStep[];
  costProjectionLatex: string;
  currentCostYearly: number[];
  projectedCostYearly: number[];
}

export interface DiagnosisResult {
  scenarios: Scenario[];
}

export type ViewState = 'LANDING' | 'INTAKE' | 'ANALYZING' | 'DIAGNOSIS' | 'SCRUBS' | 'ERROR';

// Tool matching metadata types (for API responses)
export interface ToolMatchMetadata {
  matched: boolean;
  tool: {
    id: string;
    name: string;
    displayName: string;
    category: string;
  } | null;
  confidence: number;
  matchedOn: 'name' | 'alias' | 'fuzzy' | null;
}

export interface ToolMatchResult {
  input: string;
  result: ToolMatchMetadata;
}

// Tool data types
export interface ToolData {
  id: string;
  name: string;
  displayName: string;
  category: string;
  primaryUseCases: string[];
  keyFeatures: string[];
  complexity: 'SIMPLE' | 'MODERATE' | 'ADVANCED' | 'EXPERT';
  typicalPricingTier: 'FREE' | 'FREEMIUM' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  estimatedCostPerUser: number | null;
  hasAiFeatures: boolean;
  aiFeatureDescription?: string;
}

// Bundle data types
export interface BundleData {
  id: string;
  name: string;
  description: string;
  scenarioType: 'MONO_STACK' | 'NATIVE_INTEGRATOR' | 'AGENTIC_LEAN' | 'STARTER_PACK';
  tools: Array<{
    tool: ToolData;
    role: string | null;
  }>;
  estimatedMonthlyCost: number | null;
}