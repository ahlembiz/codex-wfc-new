// ============================================
// Research Intelligence Types
// ============================================

export interface ToolMention {
  name: string;
  context: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  isRecommended: boolean;
  isPrimary: boolean;
}

export interface AutomationPattern {
  triggerTool: string;
  triggerEvent: string;
  actionTool: string;
  actionResult: string;
  connectorType: string;
  frequency: number; // how often this pattern appears
}

export interface TranscriptExtraction {
  tools: ToolMention[];
  toolCombinations: string[][];
  automations: AutomationPattern[];
  workflowDescription: string | null;
  abandonmentSignals: AbandonmentSignal[];
  segmentHints: SegmentHints;
  sponsorshipDetected: boolean;
  sponsoredTools: string[];
}

export interface CommentExtraction {
  tools: ToolMention[];
  toolCombinations: string[][];
  sentiment: Record<string, number>; // tool name → sentiment score -1 to 1
  alternativesProposed: AlternativeProposal[];
}

export interface AlternativeProposal {
  original: string;
  alternative: string;
  reason: string;
}

export interface AbandonmentSignal {
  tool: string;
  reason: string;
  replacedWith: string | null;
}

export interface SegmentHints {
  teamSize: string | null;
  stage: string | null;
  techSavviness: string | null;
  role: string | null;
}

export interface ThreadExtraction {
  tools: ToolMention[];
  toolCombinations: string[][];
  automations: AutomationPattern[];
  segmentHints: SegmentHints;
  isSponsored: boolean;
  hasAffiliate: boolean;
  affiliateTools: string[];
}

export interface MarketplaceExtraction {
  triggerTool: string;
  actionTool: string;
  connectorType: string;
  useCase: string;
  installCount: number | null;
  rating: number | null;
}

export interface ClusterAnalysis {
  name: string;
  description: string;
  synergyType: string;
  synergyStrength: number;
  bestFor: SegmentHints;
  reasoning: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  supportingEvidence: string[];
  contradictions: string[];
  adjustments: Record<string, unknown>;
}

export interface ConfidenceFactors {
  sourceDiversity: number;   // 0-25: variety of source types
  sampleSize: number;        // 0-25: number of data points
  crossReference: number;    // 0-20: corroboration across sources
  segmentCoverage: number;   // 0-15: how many segments represented
  recency: number;           // 0-15: how recent the data is
  penalties: number;         // 0 to -30: bias/sponsorship penalties
}
