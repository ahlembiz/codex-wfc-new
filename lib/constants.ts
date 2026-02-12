// ============================================
// Shared Constants - Single source of truth for enum arrays
// ============================================

// Assessment-facing constants (UI values)
export const VALID_STAGES = ['Bootstrapping', 'Pre-Seed', 'Early-Seed', 'Growth', 'Established'];
export const VALID_PHILOSOPHIES = ['Co-Pilot', 'Hybrid', 'Auto-Pilot'];
export const VALID_TECH_SAVVINESS = ['Newbie', 'Decent', 'Ninja'];
export const VALID_COST_SENSITIVITY = ['Price-First', 'Balanced', 'Value-First'];
export const VALID_SENSITIVITY = ['Low-Stakes', 'High-Stakes'];
export const VALID_ANCHOR_TYPES = [
  'The Doc-Centric Team (Notion)',
  'The Dev-Centric Team (GitHub/Cursor)',
  'The Communication-Centric Team (Slack)',
  'Other',
  "We're just starting! (no Anchor tool yet)",
];

// Prisma enum values for tool fields (DB-facing, UPPER_CASE)
export const VALID_TOOL_CATEGORIES = [
  'PROJECT_MANAGEMENT', 'DOCUMENTATION', 'COMMUNICATION', 'DEVELOPMENT',
  'DESIGN', 'MEETINGS', 'AUTOMATION', 'AI_ASSISTANTS', 'AI_BUILDERS',
  'ANALYTICS', 'GROWTH', 'OTHER',
];
export const VALID_COMPLEXITIES = ['SIMPLE', 'MODERATE', 'ADVANCED', 'EXPERT'];
export const VALID_PRICING_TIERS = ['FREE', 'FREEMIUM', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
export const VALID_TOOL_TEAM_SIZES = ['SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];
export const VALID_TOOL_STAGES = ['BOOTSTRAPPING', 'PRE_SEED', 'EARLY_SEED', 'GROWTH', 'ESTABLISHED'];
export const VALID_TOOL_TECH_SAVVINESS = ['NEWBIE', 'DECENT', 'NINJA'];

// Workflow V2: 7 phases used for workflow intelligence
export const WORKFLOW_PHASES_V2 = ['DISCOVER', 'DECIDE', 'DESIGN', 'BUILD', 'LAUNCH', 'REVIEW', 'ITERATE'] as const;

// V2 display names
export const PHASE_DISPLAY_NAMES: Record<string, string> = {
  DISCOVER: 'Discover',
  DECIDE: 'Decide',
  DESIGN: 'Design',
  BUILD: 'Build',
  LAUNCH: 'Launch',
  REVIEW: 'Review',
  ITERATE: 'Iterate',
};

// Engine-actionable pain point values
export const VALID_PAIN_POINTS = [
  'TOO_MANY_TOOLS',
  'TOOLS_DONT_TALK',
  'OVERPAYING',
  'TOO_MUCH_MANUAL_WORK',
  'DISORGANIZED',
  'SLOW_APPROVALS',
  'NO_VISIBILITY',
] as const;

// Default scoring weights (sum = 1.0)
export const DEFAULT_WEIGHTS = {
  fit: 0.25,
  popularity: 0.25,
  cost: 0.20,
  ai: 0.15,
  integration: 0.15,
} as const;

// Pain point → weight modifier mapping (additive, applied before normalization)
export const PAIN_POINT_MODIFIERS: Record<string, Partial<Record<string, number>>> = {
  TOO_MANY_TOOLS:      { integration: 0.10, fit: 0.05 },
  TOOLS_DONT_TALK:     { integration: 0.15 },
  OVERPAYING:          { cost: 0.15 },
  TOO_MUCH_MANUAL_WORK:{ ai: 0.15 },
  DISORGANIZED:        { fit: 0.10 },
  SLOW_APPROVALS:      { integration: 0.05, ai: 0.05 },
  NO_VISIBILITY:       { popularity: 0.10 },
};

// Stage → weight modifier mapping (additive, applied before normalization)
export const STAGE_WEIGHT_MODIFIERS: Record<string, Partial<Record<string, number>>> = {
  Bootstrapping: { cost: 0.10, ai: -0.05 },
  Growth:        { integration: 0.05, popularity: 0.05 },
  Established:   { fit: 0.05, integration: 0.05 },
};

// Cost sensitivity → weight modifiers (additive, applied before normalization)
export const COST_SENSITIVITY_MODIFIERS: Record<string, Partial<Record<string, number>>> = {
  'Price-First': { cost: 0.10 },
  'Value-First': { cost: -0.05, fit: 0.05 },
};

// Automation philosophy → weight modifiers (additive, applied before normalization)
export const PHILOSOPHY_MODIFIERS: Record<string, Partial<Record<string, number>>> = {
  'Auto-Pilot': { ai: 0.05 },
  'Co-Pilot':   { ai: -0.10, popularity: 0.10 },
};

export const VALID_CONNECTOR_TYPES = ['NATIVE', 'ZAPIER', 'API', 'WEBHOOK', 'BROWSER_EXT', 'MANUAL', 'GITHUB_ACTIONS', 'MAKE', 'MCP', 'SLACK_WORKFLOW'];
export const VALID_AUTOMATION_LEVELS = ['FULL', 'SUPERVISED', 'ASSISTED', 'MANUAL'];
export const VALID_SETUP_DIFFICULTIES = ['PLUG_AND_PLAY', 'GUIDED', 'TECHNICAL', 'CUSTOM_DEV'];

// Research Intelligence constants
export const VALID_SYNERGY_TYPES = ['complementary', 'sequential', 'hub-spoke', 'parallel', 'layered'] as const;
export const VALID_RESEARCH_STATUSES = ['pending', 'approved', 'rejected', 'needs_research'] as const;
export const VALID_DATA_POINT_STATUSES = ['raw', 'processed', 'validated', 'rejected'] as const;
export const VALID_SOURCE_TYPES = [
  'youtube_transcript', 'youtube_comments', 'reddit', 'hackernews',
  'indie_hackers', 'zapier_templates', 'make_templates', 'n8n_templates',
  'product_hunt', 'g2_reviews', 'capterra_reviews', 'manual',
] as const;
export const VALID_SEGMENT_ROLES = [
  'founder', 'developer', 'designer', 'marketer', 'product_manager',
  'operations', 'freelancer', 'agency',
] as const;
