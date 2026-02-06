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
