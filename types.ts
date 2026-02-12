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

// Engine-actionable pain points (map directly to weight modifiers)
export enum PainPoint {
  TooManyTools = "TOO_MANY_TOOLS",
  ToolsDontTalk = "TOOLS_DONT_TALK",
  Overpaying = "OVERPAYING",
  TooMuchManualWork = "TOO_MUCH_MANUAL_WORK",
  Disorganized = "DISORGANIZED",
  SlowApprovals = "SLOW_APPROVALS",
  NoVisibility = "NO_VISIBILITY",
}

export const PAIN_POINT_UI_LABELS: Record<PainPoint, string> = {
  [PainPoint.TooManyTools]: "We use too many tools — need to consolidate",
  [PainPoint.ToolsDontTalk]: "Our tools don't talk to each other",
  [PainPoint.Overpaying]: "We're overpaying for unused features",
  [PainPoint.TooMuchManualWork]: "Too much manual / repetitive work",
  [PainPoint.Disorganized]: "Can't find things — everything is disorganized",
  [PainPoint.SlowApprovals]: "Slow review / approval process",
  [PainPoint.NoVisibility]: "No visibility into what's working",
};

// Weight profile for dynamic scoring
export interface WeightProfile {
  fit: number;
  popularity: number;
  cost: number;
  ai: number;
  integration: number;
}

// Canonical compliance requirements
export enum ComplianceRequirement {
  SelfHosted = "SELF_HOSTED",
  SOC2 = "SOC2",
  HIPAA = "HIPAA",
  EUDataResidency = "EU_DATA_RESIDENCY",
  AirGapped = "AIR_GAPPED"
}

// UI labels for compliance requirements (for display/mapping)
export const COMPLIANCE_UI_LABELS: Record<ComplianceRequirement, string> = {
  [ComplianceRequirement.SelfHosted]: "Self-hosted required",
  [ComplianceRequirement.SOC2]: "SOC 2 compliance",
  [ComplianceRequirement.HIPAA]: "HIPAA compliance",
  [ComplianceRequirement.EUDataResidency]: "EU data residency",
  [ComplianceRequirement.AirGapped]: "Air-gapped environment"
};

// Canonical team size buckets
export enum TeamSizeBucket {
  Solo = "SOLO",
  Small = "SMALL",       // 2-5
  Medium = "MEDIUM",     // 6-20
  Large = "LARGE",       // 21-100
  Enterprise = "ENTERPRISE" // 100+
}

// UI labels for team size buckets (for display)
export const TEAM_SIZE_UI_LABELS: Record<TeamSizeBucket, string> = {
  [TeamSizeBucket.Solo]: "Solo (1 person)",
  [TeamSizeBucket.Small]: "Small (2-5)",
  [TeamSizeBucket.Medium]: "Medium (6-20)",
  [TeamSizeBucket.Large]: "Large (21-100)",
  [TeamSizeBucket.Enterprise]: "Enterprise (100+)"
};

export interface AssessmentData {
  company: string;
  stage: Stage;
  teamSize: TeamSizeBucket;
  teamSizeRaw?: string; // Optional free-text for backward compatibility
  currentTools: string;
  philosophy: AutomationPhilosophy;
  techSavviness: TechSavviness;
  budgetPerUser: number;
  costSensitivity: CostSensitivity;
  sensitivity: ProductSensitivity;
  highStakesRequirements: ComplianceRequirement[];
  anchorType: AnchorType;
  painPoints: PainPoint[];
  otherAnchorText: string;
  phasePriorities?: string[];   // Optional: workflow phases the team spends the most time on
  desiredCapabilities?: string[]; // Optional: tool categories the user wants (filters scenario builder)
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

export interface WorkflowAutomation {
  name: string;
  triggerTool: string;
  triggerEvent: string;
  actionTool: string;
  actionResult: string;
  connectorType: string;
  setupDifficulty: string;
  timeSaved: number;
}

export interface WorkflowStep {
  phase: string;
  tool: string;
  aiAgentRole: string;
  humanRole: string;
  outcome: string;
  subSteps?: WorkflowSubStep[];
  automations?: WorkflowAutomation[];
  secondaryTools?: string[];
}

export interface ScenarioRationale {
  goal: string;
  keyPrinciple: string;
  bestForGeneric: string[];
  bestForUser: string[];
  decisionFraming: string;
  complexityNote: string;
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
  rationale?: ScenarioRationale;
}

export interface DiagnosisResult {
  scenarios: Scenario[];
}

export type ViewState = 'LANDING' | 'INTAKE' | 'ANALYZING' | 'DIAGNOSIS' | 'SCRUBS' | 'ERROR' | 'ADMIN' | 'ADMIN_CLUSTER_FUCK';

// Full tool data for Admin Dashboard (all Prisma Tool fields)
export interface AdminToolData {
  id: string;
  name: string;
  displayName: string;
  category: string;
  aliases: string[];
  primaryUseCases: string[];
  keyFeatures: string[];
  complexity: 'SIMPLE' | 'MODERATE' | 'ADVANCED' | 'EXPERT';
  typicalPricingTier: 'FREE' | 'FREEMIUM' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  estimatedCostPerUser: number | null;
  hasFreeForever: boolean;
  bestForTeamSize: string[];
  bestForStage: string[];
  bestForTechSavviness: string[];
  soc2: boolean;
  hipaa: boolean;
  gdpr: boolean;
  euDataResidency: boolean;
  selfHosted: boolean;
  airGapped: boolean;
  hasAiFeatures: boolean;
  aiFeatureDescription: string | null;
  websiteUrl: string | null;
  popularityScore?: number;
  popularityAdoption?: number;
  popularitySentiment?: number;
  popularityMomentum?: number;
  popularityEcosystem?: number;
  popularityReliability?: number;
  lastVerified?: string;
  fundingStage?: string | null;
  foundedYear?: number | null;
  logoUrl?: string | null;
}

// Input interfaces for tool CRUD operations
export interface CreateToolInput {
  name: string;           // required, unique lowercase slug
  displayName: string;    // required
  category: string;       // required, must match ToolCategory enum
  aliases?: string[];
  primaryUseCases?: string[];
  keyFeatures?: string[];
  complexity?: string;
  typicalPricingTier?: string;
  estimatedCostPerUser?: number | null;
  hasFreeForever?: boolean;
  bestForTeamSize?: string[];
  bestForStage?: string[];
  bestForTechSavviness?: string[];
  soc2?: boolean;
  hipaa?: boolean;
  gdpr?: boolean;
  euDataResidency?: boolean;
  selfHosted?: boolean;
  airGapped?: boolean;
  hasAiFeatures?: boolean;
  aiFeatureDescription?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  fundingStage?: string | null;
  foundedYear?: number | null;
  popularityAdoption?: number;
  popularitySentiment?: number;
  popularityMomentum?: number;
  popularityEcosystem?: number;
  popularityReliability?: number;
}

export interface UpdateToolInput extends Partial<CreateToolInput> {}

export interface EnrichmentResult {
  fieldsUpdated: string[];
  summary: string;
  confidence: number;
}

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
  popularityScore: number;
  lastVerified: string;
  fundingStage?: string;
  foundedYear?: number;
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

// Lightweight tool summary for frontend API responses (distinct from Prisma Tool)
export interface ToolSummary {
  id: string;
  name: string;
  displayName: string;
  category: string;
  primaryUseCases: string[];
  keyFeatures: string[];
  complexity: string;
  typicalPricingTier: string;
  estimatedCostPerUser: number | null;
  hasAiFeatures: boolean;
}

// Backend tool filters (Prisma enum types)
export interface ToolFilters {
  category?: string;
  complexity?: string;
  pricingTier?: string;
  maxCostPerUser?: number;
  teamSize?: string;
  stage?: string;
  techSavviness?: string;
  requireSoc2?: boolean;
  requireHipaa?: boolean;
  requireGdpr?: boolean;
  requireEuDataResidency?: boolean;
  requireSelfHosted?: boolean;
  requireAirGapped?: boolean;
  hasAiFeatures?: boolean;
}

// ============================================
// RESEARCH INTELLIGENCE TYPES
// ============================================

export interface ClusterToolData {
  id: string;
  toolId: string;
  toolName: string;
  toolDisplayName: string;
  role: string | null;
}

export interface ToolClusterData {
  id: string;
  name: string;
  description: string;
  synergyStrength: number;
  synergyType: string;
  bestForStage: string[];
  bestForTeamSize: string[];
  bestForTechSavviness: string[];
  confidence: number;
  sourceCount: number;
  sourceTypes: string[];
  segmentCoverage: Record<string, unknown> | null;
  adoptionCount: number | null;
  biasFlags: string[];
  researchDate: string;
  lastValidated: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  tools: ClusterToolData[];
}

export interface ResearchDataPointData {
  id: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceDate: string | null;
  extractionDate: string;
  tools: string[];
  toolCombination: boolean;
  automations: Record<string, unknown> | null;
  workflow: string | null;
  abandonment: Record<string, unknown> | null;
  segmentTeamSize: string | null;
  segmentStage: string | null;
  segmentSavviness: string | null;
  segmentRole: string | null;
  confidence: number;
  isSponsored: boolean;
  sponsoredTools: string[];
  hasAffiliate: boolean;
  affiliateTools: string[];
  crossReferences: string[];
  contradictions: string[];
  status: string;
}

export interface BiasAuditCheck {
  id: string;
  name: string;
  description: string;
  threshold: number;
  currentValue: number;
  passing: boolean;
}

export interface ClusterFuckStats {
  totalClusters: number;
  approvedClusters: number;
  pendingClusters: number;
  totalRecipesWithResearch: number;
  totalDataPoints: number;
  avgClusterConfidence: number;
  avgRecipeConfidence: number;
  biasAuditPassCount: number;
  biasAuditTotalChecks: number;
  sourceTypeDistribution: Record<string, number>;
}

export interface ClusterFilters {
  status?: string;
  confidenceMin?: number;
  synergyType?: string;
  page?: number;
  limit?: number;
}

export interface RecipeResearchFilters {
  researchStatus?: string;
  confidenceMin?: number;
  connectorType?: string;
  page?: number;
  limit?: number;
}

export interface ResearchDataFilters {
  sourceType?: string;
  status?: string;
  confidenceMin?: number;
  page?: number;
  limit?: number;
}

// Bundle filters
export interface BundleFilters {
  scenarioType?: string;
  teamSize?: string;
  stage?: string;
  techSavviness?: string;
  anchorToolId?: string;
  useCases?: string[];
}