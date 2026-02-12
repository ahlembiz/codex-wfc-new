// Seed data for ResearchDataPoint records
// ~90 records distributed to pass all 12 bias audit checks
// Source type distribution, status mix, and segment spread per plan spec

export interface SeedDataPoint {
  sourceType: string;
  sourceUrl?: string;
  sourceDate?: string;
  extractionDate: string;
  tools: string[];
  toolCombination: boolean;
  automations?: Array<{ triggerTool: string; triggerEvent: string; actionTool: string; actionResult: string }>;
  workflow?: string;
  abandonment?: { tool: string; reason: string; replacedWith?: string };
  segmentTeamSize?: string;
  segmentStage?: string;
  segmentSavviness?: string;
  segmentRole?: string;
  confidence: number;
  isSponsored: boolean;
  sponsoredTools?: string[];
  hasAffiliate: boolean;
  affiliateTools?: string[];
  crossReferences?: string[];
  contradictions?: string[];
  status: string;
}

export const seedDataPoints: SeedDataPoint[] = [
  // ============================================
  // YOUTUBE TRANSCRIPTS (18 records)
  // ============================================
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt001', sourceDate: '2025-12-15',
    extractionDate: '2026-01-10', tools: ['notion', 'slack', 'linear'], toolCombination: true,
    workflow: 'Product team uses Notion for specs, Slack for async comms, Linear for sprint planning',
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 78, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt002', 'dp-rd003'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt002', sourceDate: '2025-11-20',
    extractionDate: '2026-01-10', tools: ['cursor', 'github', 'vercel'], toolCombination: true,
    workflow: 'Solo dev builds with Cursor, pushes to GitHub, deploys via Vercel',
    automations: [{ triggerTool: 'github', triggerEvent: 'PR merged', actionTool: 'vercel', actionResult: 'Auto-deploy to production' }],
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'founder',
    confidence: 85, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd005'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt003', sourceDate: '2026-01-05',
    extractionDate: '2026-01-12', tools: ['figma', 'linear', 'slack'], toolCombination: true,
    workflow: 'Design team uses Figma for prototyping, Linear for tracking, Slack for feedback',
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT', segmentRole: 'designer',
    confidence: 72, isSponsored: true, sponsoredTools: ['figma'], hasAffiliate: false,
    crossReferences: ['dp-hn002'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt004', sourceDate: '2025-10-12',
    extractionDate: '2025-12-01', tools: ['zapier', 'notion', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'zapier', triggerEvent: 'Any tool event', actionTool: 'slack', actionResult: 'Route notifications to channels' }],
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 70, isSponsored: false, hasAffiliate: false, status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt005', sourceDate: '2025-09-22',
    extractionDate: '2025-11-15', tools: ['claude', 'notion'], toolCombination: true,
    workflow: 'Uses Claude to draft PRDs, pastes into Notion for team review',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'founder',
    confidence: 65, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt006'], status: 'processed',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt006', sourceDate: '2026-01-28',
    extractionDate: '2026-02-01', tools: ['claude', 'cursor', 'github'], toolCombination: true,
    workflow: 'Claude for architecture, Cursor for implementation, GitHub for version control',
    segmentTeamSize: 'SOLO', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 82, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt005', 'dp-rd001'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt007', sourceDate: '2025-08-10',
    extractionDate: '2025-10-20', tools: ['jira', 'confluence', 'slack'], toolCombination: true,
    workflow: 'Enterprise team uses Jira for tracking, Confluence for docs, Slack for comms',
    segmentTeamSize: 'ENTERPRISE', segmentStage: 'ESTABLISHED', segmentSavviness: 'DECENT', segmentRole: 'engineering-manager',
    confidence: 75, isSponsored: true, sponsoredTools: ['jira'], hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt008', sourceDate: '2025-12-01',
    extractionDate: '2026-01-05', tools: ['posthog', 'notion'], toolCombination: true,
    workflow: 'PostHog for metrics, insights documented in Notion',
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 68, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-ph001'], status: 'processed',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt009', sourceDate: '2026-02-02',
    extractionDate: '2026-02-05', tools: ['n8n', 'github', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'github', triggerEvent: 'PR review requested', actionTool: 'slack', actionResult: 'DM reviewer' }],
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 80, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd010'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt010', sourceDate: '2025-07-18',
    extractionDate: '2025-09-20', tools: ['canva', 'notion'], toolCombination: true,
    workflow: 'Canva for social assets, Notion as content calendar',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'marketer',
    confidence: 55, isSponsored: false, hasAffiliate: true, affiliateTools: ['canva'], status: 'raw',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt011', sourceDate: '2025-11-10',
    extractionDate: '2025-12-15', tools: ['fireflies', 'notion', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'fireflies', triggerEvent: 'Meeting transcription complete', actionTool: 'notion', actionResult: 'Create meeting notes page' }],
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 76, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd008'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt012', sourceDate: '2025-10-25',
    extractionDate: '2025-12-10', tools: ['supabase', 'vercel', 'cursor'], toolCombination: true,
    workflow: 'Full-stack with Supabase backend, Vercel hosting, Cursor for AI-assisted coding',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 83, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt002'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt013', sourceDate: '2025-06-15',
    extractionDate: '2025-08-20', tools: ['intercom', 'posthog', 'slack'], toolCombination: true,
    workflow: 'Intercom for support, PostHog for user behavior, Slack for team alerts',
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT', segmentRole: 'customer-success',
    confidence: 71, isSponsored: true, sponsoredTools: ['intercom'], hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt014', sourceDate: '2025-09-05',
    extractionDate: '2025-11-01', tools: ['airtable', 'zapier', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'airtable', triggerEvent: 'Record created', actionTool: 'slack', actionResult: 'Notify team channel' }],
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'NEWBIE', segmentRole: 'operations',
    confidence: 60, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt015', sourceDate: '2026-01-20',
    extractionDate: '2026-01-25', tools: ['linear', 'github'], toolCombination: true,
    automations: [{ triggerTool: 'linear', triggerEvent: 'Issue moved to In Progress', actionTool: 'github', actionResult: 'Create branch' }],
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 88, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd002', 'dp-hn004'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt016', sourceDate: '2025-08-30',
    extractionDate: '2025-10-15', tools: ['loom', 'slack', 'notion'], toolCombination: true,
    workflow: 'Record async updates with Loom, share in Slack, archive in Notion',
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'NEWBIE', segmentRole: 'product-manager',
    confidence: 66, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-ih001'], status: 'processed',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt017', sourceDate: '2025-11-28',
    extractionDate: '2026-01-02', tools: ['notion', 'linear', 'cursor'], toolCombination: true,
    abandonment: { tool: 'jira', reason: 'Too complex for small team', replacedWith: 'linear' },
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 74, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd004'], status: 'validated',
  },
  {
    sourceType: 'youtube_transcript', sourceUrl: 'https://youtube.com/watch?v=yt018', sourceDate: '2025-05-10',
    extractionDate: '2025-07-20', tools: ['figma', 'cursor'], toolCombination: true,
    workflow: 'Export Figma specs, paste into Cursor for component generation',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 62, isSponsored: false, hasAffiliate: false, status: 'raw',
  },

  // ============================================
  // YOUTUBE COMMENTS (10 records)
  // ============================================
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc001', sourceDate: '2026-01-18',
    extractionDate: '2026-01-20', tools: ['notion', 'linear'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 45, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt001'], status: 'processed',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc002', sourceDate: '2025-12-22',
    extractionDate: '2026-01-02', tools: ['cursor', 'claude'], toolCombination: true,
    segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 40, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc003', sourceDate: '2025-11-05',
    extractionDate: '2025-12-10', tools: ['slack', 'zapier'], toolCombination: true,
    abandonment: { tool: 'slack', reason: 'Notification overload' },
    segmentTeamSize: 'MEDIUM', segmentSavviness: 'DECENT',
    confidence: 35, isSponsored: false, hasAffiliate: false, status: 'rejected',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc004', sourceDate: '2026-02-05',
    extractionDate: '2026-02-07', tools: ['github', 'vercel', 'supabase'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 50, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt012'], status: 'processed',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc005', sourceDate: '2025-10-10',
    extractionDate: '2025-11-15', tools: ['figma', 'canva'], toolCombination: false,
    segmentTeamSize: 'SOLO', segmentSavviness: 'NEWBIE', segmentRole: 'designer',
    confidence: 30, isSponsored: false, hasAffiliate: false, status: 'rejected',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc006', sourceDate: '2026-01-30',
    extractionDate: '2026-02-02', tools: ['posthog', 'notion'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT',
    confidence: 48, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt008'], status: 'processed',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc007', sourceDate: '2025-09-12',
    extractionDate: '2025-10-20', tools: ['linear'], toolCombination: false,
    abandonment: { tool: 'asana', reason: 'Slow and bloated', replacedWith: 'linear' },
    segmentTeamSize: 'SMALL', segmentSavviness: 'DECENT',
    confidence: 42, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc008', sourceDate: '2025-12-18',
    extractionDate: '2026-01-05', tools: ['n8n', 'github'], toolCombination: true,
    segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 52, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt009'], status: 'processed',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc009', sourceDate: '2025-07-25',
    extractionDate: '2025-09-10', tools: ['intercom', 'slack'], toolCombination: true,
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT',
    confidence: 38, isSponsored: false, hasAffiliate: false, status: 'rejected',
  },
  {
    sourceType: 'youtube_comments', sourceUrl: 'https://youtube.com/watch?v=yc010', sourceDate: '2026-01-10',
    extractionDate: '2026-01-15', tools: ['fireflies', 'slack'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NEWBIE',
    confidence: 44, isSponsored: false, hasAffiliate: false, status: 'processed',
  },

  // ============================================
  // REDDIT (15 records)
  // ============================================
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/startups/rd001', sourceDate: '2026-01-22',
    extractionDate: '2026-01-25', tools: ['claude', 'cursor', 'github', 'vercel'], toolCombination: true,
    workflow: 'AI-first dev stack: Claude for planning, Cursor for coding, GitHub+Vercel for deploy',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'founder',
    confidence: 80, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt006', 'dp-hn001'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/SaaS/rd002', sourceDate: '2026-01-15',
    extractionDate: '2026-01-18', tools: ['linear', 'github', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'github', triggerEvent: 'PR merged', actionTool: 'linear', actionResult: 'Close issue' }],
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 82, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt015', 'dp-hn004'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/notion/rd003', sourceDate: '2025-12-28',
    extractionDate: '2026-01-05', tools: ['notion', 'slack', 'zapier'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 68, isSponsored: false, hasAffiliate: true, affiliateTools: ['notion'],
    crossReferences: ['dp-yt001'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/devops/rd004', sourceDate: '2025-11-18',
    extractionDate: '2025-12-20', tools: ['linear', 'notion'], toolCombination: true,
    abandonment: { tool: 'jira', reason: 'Too enterprise-heavy for startup', replacedWith: 'linear' },
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 75, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt017'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/webdev/rd005', sourceDate: '2026-02-01',
    extractionDate: '2026-02-03', tools: ['cursor', 'vercel', 'supabase'], toolCombination: true,
    workflow: 'Cursor for rapid prototyping, Supabase for backend, Vercel for hosting',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 78, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt002'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/ProductManagement/rd006', sourceDate: '2025-10-05',
    extractionDate: '2025-11-10', tools: ['notion', 'figma', 'linear'], toolCombination: true,
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 65, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/Entrepreneur/rd007', sourceDate: '2025-09-15',
    extractionDate: '2025-10-20', tools: ['zapier', 'airtable', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'airtable', triggerEvent: 'New form submission', actionTool: 'slack', actionResult: 'Post to channel' }],
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'founder',
    confidence: 58, isSponsored: false, hasAffiliate: true, affiliateTools: ['zapier'], status: 'processed',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/analytics/rd008', sourceDate: '2026-01-08',
    extractionDate: '2026-01-12', tools: ['posthog', 'slack', 'notion'], toolCombination: true,
    automations: [{ triggerTool: 'posthog', triggerEvent: 'Metric threshold breached', actionTool: 'slack', actionResult: 'Alert channel' }],
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 73, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt011', 'dp-yt013'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/selfhosted/rd009', sourceDate: '2025-08-20',
    extractionDate: '2025-10-01', tools: ['n8n', 'supabase'], toolCombination: true,
    workflow: 'Self-hosted n8n for automations, Supabase for database and auth',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 70, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/remotework/rd010', sourceDate: '2026-01-25',
    extractionDate: '2026-01-28', tools: ['loom', 'notion', 'slack'], toolCombination: true,
    workflow: 'Loom for async standups, Notion for team wiki, Slack for quick questions',
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'NEWBIE', segmentRole: 'team-lead',
    confidence: 72, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt016'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/nocode/rd011', sourceDate: '2025-07-12',
    extractionDate: '2025-09-15', tools: ['airtable', 'zapier'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'founder',
    confidence: 50, isSponsored: true, sponsoredTools: ['airtable'], hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/ExperiencedDevs/rd012', sourceDate: '2025-12-10',
    extractionDate: '2025-12-20', tools: ['github', 'linear', 'cursor'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 77, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt002'], status: 'validated',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/marketing/rd013', sourceDate: '2025-06-20',
    extractionDate: '2025-08-25', tools: ['canva', 'notion'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'marketer',
    confidence: 45, isSponsored: false, hasAffiliate: true, affiliateTools: ['canva'], status: 'raw',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/CTO/rd014', sourceDate: '2025-11-02',
    extractionDate: '2025-12-05', tools: ['jira', 'confluence', 'github'], toolCombination: true,
    segmentTeamSize: 'LARGE', segmentStage: 'ESTABLISHED', segmentSavviness: 'DECENT', segmentRole: 'cto',
    confidence: 70, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'reddit', sourceUrl: 'https://reddit.com/r/indiehackers/rd015', sourceDate: '2025-10-28',
    extractionDate: '2025-12-01', tools: ['vercel', 'supabase', 'claude'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 64, isSponsored: false, hasAffiliate: false, status: 'processed',
  },

  // ============================================
  // HACKER NEWS (8 records)
  // ============================================
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn001', sourceDate: '2026-01-10',
    extractionDate: '2026-01-15', tools: ['cursor', 'claude', 'github'], toolCombination: true,
    workflow: 'AI-pair programming with Cursor+Claude, code review via GitHub PRs',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 85, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd001', 'dp-yt006'], status: 'validated',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn002', sourceDate: '2025-12-15',
    extractionDate: '2025-12-28', tools: ['figma', 'linear'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'designer',
    confidence: 62, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt003'], status: 'processed',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn003', sourceDate: '2025-09-28',
    extractionDate: '2025-11-05', tools: ['supabase', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 72, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn004', sourceDate: '2026-02-08',
    extractionDate: '2026-02-10', tools: ['linear', 'github'], toolCombination: true,
    automations: [{ triggerTool: 'github', triggerEvent: 'PR merged', actionTool: 'linear', actionResult: 'Auto-close issue' }],
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 80, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt015', 'dp-rd002'], status: 'validated',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn005', sourceDate: '2025-08-05',
    extractionDate: '2025-10-10', tools: ['n8n', 'github'], toolCombination: true,
    abandonment: { tool: 'zapier', reason: 'Too expensive at scale', replacedWith: 'n8n' },
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 68, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn006', sourceDate: '2025-11-22',
    extractionDate: '2025-12-25', tools: ['posthog', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 60, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn007', sourceDate: '2025-07-15',
    extractionDate: '2025-09-20', tools: ['jira', 'slack'], toolCombination: true,
    abandonment: { tool: 'jira', reason: 'Overly complex for small teams' },
    segmentTeamSize: 'ENTERPRISE', segmentStage: 'ESTABLISHED', segmentSavviness: 'DECENT',
    confidence: 55, isSponsored: false, hasAffiliate: false, status: 'rejected',
  },
  {
    sourceType: 'hackernews', sourceUrl: 'https://news.ycombinator.com/item?id=hn008', sourceDate: '2026-01-30',
    extractionDate: '2026-02-02', tools: ['claude', 'notion'], toolCombination: true,
    workflow: 'Claude for research synthesis, Notion for knowledge management',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'DECENT', segmentRole: 'researcher',
    confidence: 70, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt005'], status: 'validated',
  },

  // ============================================
  // INDIE HACKERS (8 records)
  // ============================================
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih001', sourceDate: '2026-01-05',
    extractionDate: '2026-01-10', tools: ['notion', 'loom', 'linear'], toolCombination: true,
    workflow: 'Async-first: Loom for demos, Notion for docs, Linear for tasks',
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 72, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt016'], status: 'validated',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih002', sourceDate: '2025-11-28',
    extractionDate: '2025-12-15', tools: ['vercel', 'supabase', 'claude'], toolCombination: true,
    workflow: 'Ship fast: Claude for code generation, Supabase for backend, Vercel for deploy',
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 75, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd015'], status: 'validated',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih003', sourceDate: '2025-10-15',
    extractionDate: '2025-11-20', tools: ['canva', 'notion', 'zapier'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NEWBIE', segmentRole: 'founder',
    confidence: 55, isSponsored: true, sponsoredTools: ['canva'], hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih004', sourceDate: '2025-08-22',
    extractionDate: '2025-10-01', tools: ['airtable', 'zapier', 'intercom'], toolCombination: true,
    automations: [{ triggerTool: 'intercom', triggerEvent: 'New conversation', actionTool: 'airtable', actionResult: 'Log support ticket' }],
    segmentTeamSize: 'SOLO', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 60, isSponsored: false, hasAffiliate: true, affiliateTools: ['intercom'], status: 'raw',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih005', sourceDate: '2026-02-03',
    extractionDate: '2026-02-06', tools: ['cursor', 'supabase', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 78, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd005'], status: 'validated',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih006', sourceDate: '2025-09-10',
    extractionDate: '2025-10-15', tools: ['notion', 'slack'], toolCombination: true,
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NEWBIE', segmentRole: 'founder',
    confidence: 50, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih007', sourceDate: '2025-12-05',
    extractionDate: '2025-12-20', tools: ['posthog', 'notion', 'intercom'], toolCombination: true,
    workflow: 'PostHog for analytics, Intercom for user comms, Notion for insights',
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 67, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt013'], status: 'processed',
  },
  {
    sourceType: 'indie_hackers', sourceUrl: 'https://indiehackers.com/post/ih008', sourceDate: '2025-07-30',
    extractionDate: '2025-09-10', tools: ['github', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 58, isSponsored: false, hasAffiliate: false, status: 'processed',
  },

  // ============================================
  // ZAPIER TEMPLATES (10 records)
  // ============================================
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/linear/integrations/github', sourceDate: '2025-12-01',
    extractionDate: '2026-01-05', tools: ['linear', 'github'], toolCombination: true,
    automations: [{ triggerTool: 'linear', triggerEvent: 'Issue moved to In Progress', actionTool: 'github', actionResult: 'Create branch' }],
    confidence: 90, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt015'], status: 'validated',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/slack/integrations/linear', sourceDate: '2025-11-15',
    extractionDate: '2026-01-05', tools: ['slack', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'linear', triggerEvent: 'Issue created with high priority', actionTool: 'slack', actionResult: 'Post notification' }],
    confidence: 88, isSponsored: false, hasAffiliate: false, status: 'validated',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/notion/integrations/fireflies', sourceDate: '2025-10-20',
    extractionDate: '2025-12-15', tools: ['fireflies', 'notion'], toolCombination: true,
    automations: [{ triggerTool: 'fireflies', triggerEvent: 'Meeting transcription complete', actionTool: 'notion', actionResult: 'Create page' }],
    confidence: 85, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt011'], status: 'validated',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/figma/integrations/linear', sourceDate: '2025-09-05',
    extractionDate: '2025-11-10', tools: ['figma', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'figma', triggerEvent: 'Design approved', actionTool: 'linear', actionResult: 'Update issue status' }],
    confidence: 82, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/posthog/integrations/slack', sourceDate: '2025-08-12',
    extractionDate: '2025-10-20', tools: ['posthog', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'posthog', triggerEvent: 'Metric threshold breached', actionTool: 'slack', actionResult: 'Send alert' }],
    confidence: 80, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-rd008'], status: 'validated',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/github/integrations/notion', sourceDate: '2025-07-20',
    extractionDate: '2025-09-25', tools: ['github', 'notion'], toolCombination: true,
    automations: [{ triggerTool: 'github', triggerEvent: 'Release published', actionTool: 'notion', actionResult: 'Update changelog' }],
    confidence: 78, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/airtable/integrations/slack', sourceDate: '2025-06-15',
    extractionDate: '2025-08-20', tools: ['airtable', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'airtable', triggerEvent: 'Record created', actionTool: 'slack', actionResult: 'Notify team' }],
    confidence: 75, isSponsored: true, sponsoredTools: ['airtable'], hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/notion/integrations/linear', sourceDate: '2026-01-10',
    extractionDate: '2026-01-15', tools: ['notion', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'notion', triggerEvent: 'PRD status changed to Approved', actionTool: 'linear', actionResult: 'Create project' }],
    confidence: 84, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt001'], status: 'validated',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/intercom/integrations/posthog', sourceDate: '2025-12-20',
    extractionDate: '2026-01-02', tools: ['intercom', 'posthog'], toolCombination: true,
    confidence: 70, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'zapier_templates', sourceUrl: 'https://zapier.com/apps/github/integrations/slack', sourceDate: '2025-10-01',
    extractionDate: '2025-12-05', tools: ['github', 'slack'], toolCombination: true,
    automations: [{ triggerTool: 'github', triggerEvent: 'PR review requested', actionTool: 'slack', actionResult: 'DM reviewer' }],
    confidence: 86, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt009'], status: 'validated',
  },

  // ============================================
  // MAKE TEMPLATES (5 records)
  // ============================================
  {
    sourceType: 'make_templates', sourceUrl: 'https://make.com/en/templates/linear-github', sourceDate: '2025-11-10',
    extractionDate: '2025-12-20', tools: ['linear', 'github'], toolCombination: true,
    automations: [{ triggerTool: 'linear', triggerEvent: 'Issue created', actionTool: 'github', actionResult: 'Create issue' }],
    confidence: 80, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'make_templates', sourceUrl: 'https://make.com/en/templates/slack-notion', sourceDate: '2025-09-25',
    extractionDate: '2025-11-15', tools: ['slack', 'notion'], toolCombination: true,
    automations: [{ triggerTool: 'slack', triggerEvent: 'Message saved', actionTool: 'notion', actionResult: 'Add to database' }],
    confidence: 72, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'make_templates', sourceUrl: 'https://make.com/en/templates/posthog-linear', sourceDate: '2025-08-18',
    extractionDate: '2025-10-25', tools: ['posthog', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'posthog', triggerEvent: 'Error spike detected', actionTool: 'linear', actionResult: 'Create bug issue' }],
    confidence: 76, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'make_templates', sourceUrl: 'https://make.com/en/templates/fireflies-linear', sourceDate: '2026-01-15',
    extractionDate: '2026-01-20', tools: ['fireflies', 'linear'], toolCombination: true,
    automations: [{ triggerTool: 'fireflies', triggerEvent: 'Action items detected', actionTool: 'linear', actionResult: 'Create issues' }],
    confidence: 78, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt011'], status: 'validated',
  },
  {
    sourceType: 'make_templates', sourceUrl: 'https://make.com/en/templates/canva-slack', sourceDate: '2025-07-05',
    extractionDate: '2025-09-10', tools: ['canva', 'slack'], toolCombination: true,
    confidence: 55, isSponsored: true, sponsoredTools: ['canva'], hasAffiliate: false, status: 'rejected',
  },

  // ============================================
  // G2 REVIEWS (8 records)
  // ============================================
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/linear/reviews/g2001', sourceDate: '2026-01-20',
    extractionDate: '2026-01-25', tools: ['linear'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'engineering-manager',
    confidence: 65, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/notion/reviews/g2002', sourceDate: '2025-12-05',
    extractionDate: '2026-01-02', tools: ['notion'], toolCombination: false,
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'NEWBIE', segmentRole: 'product-manager',
    confidence: 60, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt001'], status: 'processed',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/cursor/reviews/g2003', sourceDate: '2026-02-01',
    extractionDate: '2026-02-05', tools: ['cursor'], toolCombination: false,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 70, isSponsored: false, hasAffiliate: false, status: 'validated',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/slack/reviews/g2004', sourceDate: '2025-11-18',
    extractionDate: '2025-12-20', tools: ['slack'], toolCombination: false,
    segmentTeamSize: 'LARGE', segmentStage: 'ESTABLISHED', segmentSavviness: 'NEWBIE', segmentRole: 'operations',
    confidence: 58, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/figma/reviews/g2005', sourceDate: '2025-10-08',
    extractionDate: '2025-11-15', tools: ['figma'], toolCombination: false,
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'DECENT', segmentRole: 'designer',
    confidence: 62, isSponsored: false, hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/zapier/reviews/g2006', sourceDate: '2025-09-15',
    extractionDate: '2025-10-20', tools: ['zapier'], toolCombination: false,
    abandonment: { tool: 'zapier', reason: 'Too expensive for simple automations', replacedWith: 'n8n' },
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 55, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/posthog/reviews/g2007', sourceDate: '2026-01-12',
    extractionDate: '2026-01-18', tools: ['posthog'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT', segmentRole: 'product-manager',
    confidence: 68, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt008'], status: 'validated',
  },
  {
    sourceType: 'g2_reviews', sourceUrl: 'https://g2.com/products/jira/reviews/g2008', sourceDate: '2025-08-25',
    extractionDate: '2025-10-01', tools: ['jira'], toolCombination: false,
    abandonment: { tool: 'jira', reason: 'Sluggish and over-configured' },
    segmentTeamSize: 'ENTERPRISE', segmentStage: 'ESTABLISHED', segmentSavviness: 'DECENT', segmentRole: 'engineering-manager',
    confidence: 52, isSponsored: false, hasAffiliate: false, status: 'rejected',
  },

  // ============================================
  // PRODUCT HUNT (8 records)
  // ============================================
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph001', sourceDate: '2026-01-18',
    extractionDate: '2026-01-22', tools: ['cursor', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'NINJA', segmentRole: 'developer',
    confidence: 72, isSponsored: true, sponsoredTools: ['cursor'], hasAffiliate: false,
    crossReferences: ['dp-yt002'], status: 'validated',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph002', sourceDate: '2025-12-10',
    extractionDate: '2025-12-28', tools: ['supabase', 'vercel'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'PRE_SEED', segmentSavviness: 'DECENT', segmentRole: 'developer',
    confidence: 68, isSponsored: true, sponsoredTools: ['supabase'], hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph003', sourceDate: '2025-11-05',
    extractionDate: '2025-12-10', tools: ['linear'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT',
    confidence: 65, isSponsored: true, sponsoredTools: ['linear'], hasAffiliate: false, status: 'processed',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph004', sourceDate: '2025-09-20',
    extractionDate: '2025-11-01', tools: ['posthog'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'DECENT',
    confidence: 62, isSponsored: true, sponsoredTools: ['posthog'], hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph005', sourceDate: '2026-02-05',
    extractionDate: '2026-02-08', tools: ['claude', 'notion'], toolCombination: true,
    segmentTeamSize: 'SOLO', segmentStage: 'BOOTSTRAPPING', segmentSavviness: 'DECENT', segmentRole: 'founder',
    confidence: 70, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-hn008'], status: 'validated',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph006', sourceDate: '2025-10-28',
    extractionDate: '2025-12-05', tools: ['n8n'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'PRE_SEED', segmentSavviness: 'NINJA',
    confidence: 60, isSponsored: false, hasAffiliate: false, status: 'raw',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph007', sourceDate: '2025-08-15',
    extractionDate: '2025-10-20', tools: ['fireflies'], toolCombination: false,
    segmentTeamSize: 'SMALL', segmentStage: 'EARLY_SEED', segmentSavviness: 'NEWBIE',
    confidence: 55, isSponsored: false, hasAffiliate: true, affiliateTools: ['fireflies'], status: 'rejected',
  },
  {
    sourceType: 'product_hunt', sourceUrl: 'https://producthunt.com/posts/ph008', sourceDate: '2025-12-22',
    extractionDate: '2026-01-05', tools: ['loom', 'slack'], toolCombination: true,
    segmentTeamSize: 'MEDIUM', segmentStage: 'GROWTH', segmentSavviness: 'NEWBIE',
    confidence: 58, isSponsored: false, hasAffiliate: false,
    crossReferences: ['dp-yt016'], status: 'processed',
  },
];
