// Seed data for Workflow Intelligence: buckets, capabilities, and recipes
// Used by seed.ts to populate WorkflowBucket, ToolPhaseCapability, AutomationRecipe

// ============================================
// WORKFLOW BUCKETS (sub-phases)
// ============================================

export interface BucketDef {
  phase: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  inputs: string[];
  outputs: string[];
}

export const workflowBuckets: BucketDef[] = [
  // IDEATION
  { phase: 'IDEATION', name: 'Problem Discovery', slug: 'ideation-problem-discovery', description: 'Identify user pain points, market gaps, and opportunities through research and data analysis', displayOrder: 1, inputs: ['user feedback', 'market data', 'support tickets'], outputs: ['problem statements', 'opportunity briefs'] },
  { phase: 'IDEATION', name: 'Market Research', slug: 'ideation-market-research', description: 'Analyze competitors, trends, and market positioning to validate ideas', displayOrder: 2, inputs: ['problem statements', 'industry reports'], outputs: ['competitive analysis', 'trend reports', 'validation signals'] },
  { phase: 'IDEATION', name: 'Bug Triage', slug: 'ideation-bug-triage', description: 'Categorize, prioritize, and route incoming bugs and feature requests', displayOrder: 3, inputs: ['bug reports', 'feature requests', 'crash logs'], outputs: ['triaged backlog', 'severity rankings'] },

  // PLANNING
  { phase: 'PLANNING', name: 'Prioritization', slug: 'planning-prioritization', description: 'Rank features and tasks by impact, effort, and strategic alignment', displayOrder: 1, inputs: ['triaged backlog', 'business goals'], outputs: ['prioritized roadmap', 'sprint candidates'] },
  { phase: 'PLANNING', name: 'Spec Writing', slug: 'planning-spec-writing', description: 'Create detailed specifications, user stories, and acceptance criteria', displayOrder: 2, inputs: ['prioritized features', 'design inputs'], outputs: ['PRDs', 'user stories', 'acceptance criteria'] },
  { phase: 'PLANNING', name: 'Prototyping', slug: 'planning-prototyping', description: 'Build quick prototypes or wireframes to validate approach before building', displayOrder: 3, inputs: ['PRDs', 'design system'], outputs: ['clickable prototypes', 'wireframes', 'design specs'] },

  // EXECUTION
  { phase: 'EXECUTION', name: 'Delivery Planning', slug: 'execution-delivery-planning', description: 'Break specs into tasks, assign work, estimate timelines', displayOrder: 1, inputs: ['PRDs', 'team capacity'], outputs: ['sprint plan', 'task assignments'] },
  { phase: 'EXECUTION', name: 'Implementation', slug: 'execution-implementation', description: 'Write code, build features, create assets according to specs', displayOrder: 2, inputs: ['task assignments', 'design specs', 'codebase'], outputs: ['working code', 'pull requests', 'assets'] },
  { phase: 'EXECUTION', name: 'Code Review', slug: 'execution-code-review', description: 'Review pull requests, ensure quality, catch bugs before merge', displayOrder: 3, inputs: ['pull requests', 'coding standards'], outputs: ['reviewed code', 'merged PRs', 'review feedback'] },

  // REVIEW
  { phase: 'REVIEW', name: 'Feedback Collection', slug: 'review-feedback-collection', description: 'Gather stakeholder and user feedback through demos, surveys, and meetings', displayOrder: 1, inputs: ['working features', 'stakeholder list'], outputs: ['feedback notes', 'approval/rejection decisions'] },
  { phase: 'REVIEW', name: 'Retrospective', slug: 'review-retrospective', description: 'Reflect on process, identify improvements, document learnings', displayOrder: 2, inputs: ['sprint outcomes', 'team feedback'], outputs: ['retro action items', 'process improvements'] },

  // ITERATE
  { phase: 'ITERATE', name: 'Metrics Analysis', slug: 'iterate-metrics-analysis', description: 'Analyze product metrics, user behavior, and performance data', displayOrder: 1, inputs: ['analytics data', 'user sessions', 'conversion funnels'], outputs: ['insights report', 'metric dashboards'] },
  { phase: 'ITERATE', name: 'Documentation', slug: 'iterate-documentation', description: 'Update docs, changelogs, and knowledge base with latest changes', displayOrder: 2, inputs: ['merged features', 'API changes'], outputs: ['updated docs', 'changelogs', 'help articles'] },
  { phase: 'ITERATE', name: 'Backlog Grooming', slug: 'iterate-backlog-grooming', description: 'Refine backlog based on learnings, reprioritize, create new items', displayOrder: 3, inputs: ['insights report', 'feedback notes', 'existing backlog'], outputs: ['groomed backlog', 'next sprint candidates'] },
];

// ============================================
// TOOL PHASE CAPABILITIES
// ============================================

export interface CapabilityDef {
  toolName: string;       // matches tool.name in seedData
  bucketSlug: string;     // matches WorkflowBucket.slug
  featureName: string;
  aiAction: string;
  humanAction: string;
  artifact: string;
  automationLevel: string;
  philosophyFit: string[];
  techSavviness: string[];
  displayOrder: number;
}

export const toolCapabilities: CapabilityDef[] = [
  // ============================================
  // NOTION
  // ============================================
  { toolName: 'notion', bucketSlug: 'ideation-problem-discovery', featureName: 'Notion AI Q&A', aiAction: 'Search workspace for related discussions, past decisions, and user feedback themes', humanAction: 'Review AI-surfaced context, formulate problem hypotheses', artifact: 'Problem statement doc with linked references', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'notion', bucketSlug: 'ideation-market-research', featureName: 'Notion Databases', aiAction: 'Auto-populate competitor database properties from web research', humanAction: 'Curate competitor list, validate data, add qualitative notes', artifact: 'Competitive analysis database with filterable views', automationLevel: 'ASSISTED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'notion', bucketSlug: 'planning-spec-writing', featureName: 'Notion AI Writer', aiAction: 'Generate PRD drafts from templates with auto-filled sections', humanAction: 'Review and refine spec, add edge cases, set acceptance criteria', artifact: 'Complete PRD with linked user stories', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'notion', bucketSlug: 'iterate-documentation', featureName: 'Notion Wiki', aiAction: 'Auto-suggest doc updates based on recent changes in linked databases', humanAction: 'Approve updates, write new sections, organize wiki structure', artifact: 'Updated product wiki and changelog', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'notion', bucketSlug: 'iterate-backlog-grooming', featureName: 'Notion Sprints', aiAction: 'Auto-tag and categorize backlog items by theme and priority', humanAction: 'Drag items into sprint, set priorities, assign owners', artifact: 'Groomed sprint backlog', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 1 },

  // ============================================
  // LINEAR
  // ============================================
  { toolName: 'linear', bucketSlug: 'ideation-bug-triage', featureName: 'Linear Triage', aiAction: 'Auto-label, auto-assign, and set priority on incoming issues using Linear AI', humanAction: 'Review triage suggestions, escalate critical bugs', artifact: 'Triaged issue queue with severity labels', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'linear', bucketSlug: 'planning-prioritization', featureName: 'Linear Projects', aiAction: 'Suggest priority order based on impact scores, dependencies, and team capacity', humanAction: 'Set strategic priorities, approve sprint scope', artifact: 'Prioritized project roadmap', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'linear', bucketSlug: 'planning-spec-writing', featureName: 'Linear Asks', aiAction: 'Generate issue descriptions from brief prompts, suggest sub-tasks', humanAction: 'Refine generated descriptions, link to specs, set estimates', artifact: 'Detailed issue with sub-tasks and estimates', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'linear', bucketSlug: 'execution-delivery-planning', featureName: 'Linear Cycles', aiAction: 'Auto-schedule issues into cycles based on estimates and capacity', humanAction: 'Adjust cycle scope, handle blockers, rebalance workload', artifact: 'Sprint cycle with assigned issues', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'linear', bucketSlug: 'iterate-backlog-grooming', featureName: 'Linear Backlog', aiAction: 'Flag stale issues, suggest duplicates, auto-close resolved items', humanAction: 'Review flagged items, merge duplicates, reprioritize', artifact: 'Clean, prioritized backlog', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },

  // ============================================
  // CURSOR
  // ============================================
  { toolName: 'cursor', bucketSlug: 'execution-implementation', featureName: 'Cursor Composer', aiAction: 'Generate multi-file implementations from natural language descriptions', humanAction: 'Review generated code, test, iterate on prompts', artifact: 'Working feature implementation across multiple files', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'cursor', bucketSlug: 'execution-implementation', featureName: 'Cursor Tab', aiAction: 'Predict and auto-complete code based on codebase context', humanAction: 'Accept or modify suggestions, write complex logic', artifact: 'Completed code with AI-assisted boilerplate', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'cursor', bucketSlug: 'execution-code-review', featureName: 'Cursor Chat', aiAction: 'Explain code changes, suggest improvements, identify potential bugs', humanAction: 'Ask targeted questions, validate AI analysis, approve changes', artifact: 'Review notes with AI-identified issues', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },

  // ============================================
  // GITHUB
  // ============================================
  { toolName: 'github', bucketSlug: 'execution-implementation', featureName: 'GitHub Actions', aiAction: 'Run CI/CD pipelines, automated tests, deployments on push', humanAction: 'Configure workflows, monitor build results, fix failures', artifact: 'Passing CI build with test results', automationLevel: 'FULL', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 3 },
  { toolName: 'github', bucketSlug: 'execution-code-review', featureName: 'GitHub Pull Requests', aiAction: 'Auto-assign reviewers, run checks, flag merge conflicts', humanAction: 'Review diffs, leave comments, approve/request changes', artifact: 'Merged pull request with review thread', automationLevel: 'SUPERVISED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'github', bucketSlug: 'ideation-bug-triage', featureName: 'GitHub Issues', aiAction: 'Auto-label issues using templates, link to related PRs', humanAction: 'Triage incoming issues, assign priorities, set milestones', artifact: 'Labeled and prioritized issue backlog', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },

  // ============================================
  // SLACK
  // ============================================
  { toolName: 'slack', bucketSlug: 'ideation-problem-discovery', featureName: 'Slack Channels', aiAction: 'Surface trending topics and recurring pain points from channel discussions', humanAction: 'Monitor channels, engage in discussions, capture insights', artifact: 'Problem themes extracted from team conversations', automationLevel: 'MANUAL', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'slack', bucketSlug: 'review-feedback-collection', featureName: 'Slack Huddles', aiAction: 'Auto-transcribe huddle conversations, generate meeting notes', humanAction: 'Run quick feedback sessions, share demos, collect reactions', artifact: 'Huddle summary with action items', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'slack', bucketSlug: 'review-retrospective', featureName: 'Slack Workflows', aiAction: 'Automate retro surveys, collect responses, compile results', humanAction: 'Facilitate retro discussion, identify action items', artifact: 'Compiled retrospective with voted action items', automationLevel: 'ASSISTED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },

  // ============================================
  // FIGMA
  // ============================================
  { toolName: 'figma', bucketSlug: 'planning-prototyping', featureName: 'Figma Prototyping', aiAction: 'Auto-layout components, suggest design patterns from design system', humanAction: 'Create wireframes, build interactive prototypes, iterate on design', artifact: 'Clickable prototype with design specs', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'figma', bucketSlug: 'planning-prototyping', featureName: 'Figma AI', aiAction: 'Generate design variations, auto-rename layers, suggest improvements', humanAction: 'Select preferred designs, refine details, ensure brand consistency', artifact: 'Polished design with annotated specs', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'figma', bucketSlug: 'review-feedback-collection', featureName: 'Figma Comments', aiAction: 'Thread and organize design feedback by component', humanAction: 'Leave targeted comments, resolve feedback, approve designs', artifact: 'Resolved design feedback thread', automationLevel: 'MANUAL', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 2 },

  // ============================================
  // POSTHOG
  // ============================================
  { toolName: 'posthog', bucketSlug: 'iterate-metrics-analysis', featureName: 'PostHog Product Analytics', aiAction: 'Auto-generate funnel analysis, identify drop-off points and trends', humanAction: 'Interpret metrics, define key funnels, set up dashboards', artifact: 'Product metrics dashboard with funnel analysis', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 1 },
  { toolName: 'posthog', bucketSlug: 'iterate-metrics-analysis', featureName: 'PostHog Session Replay', aiAction: 'Flag sessions with errors or rage clicks for review', humanAction: 'Watch key sessions, identify UX issues, prioritize fixes', artifact: 'UX issue list with session evidence', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'posthog', bucketSlug: 'ideation-problem-discovery', featureName: 'PostHog Surveys', aiAction: 'Trigger in-app surveys based on user behavior, aggregate responses', humanAction: 'Design survey questions, analyze qualitative responses', artifact: 'User feedback report with behavioral context', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 3 },

  // ============================================
  // ZAPIER
  // ============================================
  { toolName: 'zapier', bucketSlug: 'execution-delivery-planning', featureName: 'Zapier Zaps', aiAction: 'Auto-create tasks in PM tool when events trigger in other tools', humanAction: 'Define trigger conditions, map fields, monitor zap health', artifact: 'Automated cross-tool task creation workflow', automationLevel: 'FULL', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'zapier', bucketSlug: 'review-feedback-collection', featureName: 'Zapier Tables', aiAction: 'Aggregate feedback from multiple channels into a single table', humanAction: 'Review aggregated feedback, tag themes, route to owners', artifact: 'Unified feedback table from all channels', automationLevel: 'SUPERVISED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['DECENT', 'NINJA'], displayOrder: 3 },

  // ============================================
  // CLAUDE
  // ============================================
  { toolName: 'claude', bucketSlug: 'ideation-market-research', featureName: 'Claude Analysis', aiAction: 'Analyze market reports, synthesize competitor data, identify trends', humanAction: 'Provide source documents, validate conclusions, add context', artifact: 'AI-synthesized market analysis with citations', automationLevel: 'SUPERVISED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 2 },
  { toolName: 'claude', bucketSlug: 'planning-spec-writing', featureName: 'Claude Projects', aiAction: 'Generate detailed specs from high-level descriptions using project context', humanAction: 'Provide context docs, review generated specs, iterate on details', artifact: 'AI-drafted PRD with context-aware details', automationLevel: 'SUPERVISED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 3 },
  { toolName: 'claude', bucketSlug: 'review-retrospective', featureName: 'Claude Artifacts', aiAction: 'Generate retro templates, summarize discussion points, draft action items', humanAction: 'Facilitate retro, validate AI summaries, finalize commitments', artifact: 'Structured retrospective document with action items', automationLevel: 'ASSISTED', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 2 },

  // ============================================
  // FIREFLIES
  // ============================================
  { toolName: 'fireflies', bucketSlug: 'review-feedback-collection', featureName: 'Fireflies Transcription', aiAction: 'Auto-record, transcribe, and summarize meetings with action items', humanAction: 'Run the meeting, review AI summary, distribute action items', artifact: 'Meeting transcript with AI-extracted action items', automationLevel: 'FULL', philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 4 },
  { toolName: 'fireflies', bucketSlug: 'review-retrospective', featureName: 'Fireflies AskFred', aiAction: 'Answer questions about past meetings, surface decisions and blockers', humanAction: 'Query meeting history for context, find past decisions', artifact: 'Decision log from meeting history', automationLevel: 'ASSISTED', philosophyFit: ['Hybrid', 'Auto-Pilot'], techSavviness: ['NEWBIE', 'DECENT', 'NINJA'], displayOrder: 3 },
];

// ============================================
// AUTOMATION RECIPES
// ============================================

export interface RecipeDef {
  triggerToolName: string;
  triggerEvent: string;
  triggerDetail: string;
  actionToolName: string;
  actionType: string;
  actionDetail: string;
  connectorType: string;
  connectorDetail?: string;
  phases: string[];
  philosophyFit: string[];
  setupDifficulty: string;
  techSavviness: string;
  timeSavedPerWeek: number;
  humanBehaviorChange?: string;
}

export const automationRecipes: RecipeDef[] = [
  // Linear ↔ GitHub
  { triggerToolName: 'linear', triggerEvent: 'Issue moved to In Progress', triggerDetail: 'When a Linear issue status changes to "In Progress"', actionToolName: 'github', actionType: 'Create branch', actionDetail: 'Auto-create a feature branch named from the issue identifier', connectorType: 'NATIVE', phases: ['EXECUTION'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'DECENT', timeSavedPerWeek: 1.5, humanBehaviorChange: 'Start work from Linear instead of manually creating branches' },
  { triggerToolName: 'github', triggerEvent: 'PR merged', triggerDetail: 'When a pull request is merged to main', actionToolName: 'linear', actionType: 'Close issue', actionDetail: 'Auto-transition linked Linear issue to Done', connectorType: 'NATIVE', phases: ['EXECUTION'], philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'DECENT', timeSavedPerWeek: 1.0, humanBehaviorChange: 'Include Linear issue ID in branch names or PR descriptions' },

  // Linear ↔ Slack
  { triggerToolName: 'linear', triggerEvent: 'Issue created with high priority', triggerDetail: 'When a P1/P2 issue is created in Linear', actionToolName: 'slack', actionType: 'Post notification', actionDetail: 'Send alert to #engineering channel with issue details', connectorType: 'NATIVE', phases: ['IDEATION', 'EXECUTION'], philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'NEWBIE', timeSavedPerWeek: 0.5 },

  // Slack ↔ Linear
  { triggerToolName: 'slack', triggerEvent: 'Message reaction with :bug: emoji', triggerDetail: 'When someone reacts to a Slack message with the bug emoji', actionToolName: 'linear', actionType: 'Create issue', actionDetail: 'Create a new bug issue with the Slack message as description', connectorType: 'NATIVE', phases: ['IDEATION'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 1.0, humanBehaviorChange: 'Use emoji reactions to triage bugs instead of manual issue creation' },

  // Figma ↔ Linear
  { triggerToolName: 'figma', triggerEvent: 'Design approved', triggerDetail: 'When a Figma design file status is marked as approved', actionToolName: 'linear', actionType: 'Update issue status', actionDetail: 'Move related Linear issue from "Design" to "Ready for Dev"', connectorType: 'ZAPIER', connectorDetail: 'via Zapier webhook', phases: ['PLANNING', 'EXECUTION'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 0.5, humanBehaviorChange: 'Mark design status in Figma instead of updating Linear manually' },

  // Fireflies ↔ Notion
  { triggerToolName: 'fireflies', triggerEvent: 'Meeting transcription complete', triggerDetail: 'After a meeting is transcribed and summarized', actionToolName: 'notion', actionType: 'Create page', actionDetail: 'Auto-create a meeting notes page with transcript and action items', connectorType: 'NATIVE', phases: ['REVIEW'], philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'NEWBIE', timeSavedPerWeek: 2.0, humanBehaviorChange: 'Let Fireflies join all meetings instead of manually taking notes' },

  // Fireflies ↔ Linear
  { triggerToolName: 'fireflies', triggerEvent: 'Action items detected', triggerDetail: 'When AI identifies action items from meeting transcript', actionToolName: 'linear', actionType: 'Create issues', actionDetail: 'Auto-create Linear issues from detected meeting action items', connectorType: 'ZAPIER', connectorDetail: 'via Zapier', phases: ['REVIEW'], philosophyFit: ['Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 1.5, humanBehaviorChange: 'Review auto-created issues after meetings instead of manually creating them' },

  // PostHog ↔ Slack
  { triggerToolName: 'posthog', triggerEvent: 'Metric threshold breached', triggerDetail: 'When a key metric drops below defined threshold', actionToolName: 'slack', actionType: 'Send alert', actionDetail: 'Post metric alert to #product channel with dashboard link', connectorType: 'WEBHOOK', phases: ['ITERATE'], philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 1.0, humanBehaviorChange: 'Set up metric thresholds in PostHog instead of manual monitoring' },

  // PostHog ↔ Linear
  { triggerToolName: 'posthog', triggerEvent: 'Error spike detected', triggerDetail: 'When session replay shows rage click or error spike', actionToolName: 'linear', actionType: 'Create bug issue', actionDetail: 'Auto-create bug issue with session replay link and error details', connectorType: 'ZAPIER', connectorDetail: 'via Zapier', phases: ['ITERATE', 'IDEATION'], philosophyFit: ['Auto-Pilot'], setupDifficulty: 'TECHNICAL', techSavviness: 'NINJA', timeSavedPerWeek: 1.0, humanBehaviorChange: 'Review auto-created bug issues instead of manually monitoring dashboards' },

  // GitHub ↔ Slack
  { triggerToolName: 'github', triggerEvent: 'PR review requested', triggerDetail: 'When a PR is opened and reviewers are assigned', actionToolName: 'slack', actionType: 'Send DM', actionDetail: 'DM assigned reviewers with PR details and review link', connectorType: 'NATIVE', phases: ['EXECUTION'], philosophyFit: ['Co-Pilot', 'Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'NEWBIE', timeSavedPerWeek: 1.0 },

  // GitHub ↔ Notion
  { triggerToolName: 'github', triggerEvent: 'Release published', triggerDetail: 'When a new GitHub release is published', actionToolName: 'notion', actionType: 'Update changelog', actionDetail: 'Auto-append release notes to the changelog page', connectorType: 'ZAPIER', connectorDetail: 'via Zapier', phases: ['ITERATE'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 0.5, humanBehaviorChange: 'Write detailed release notes in GitHub instead of Notion' },

  // Notion ↔ Linear
  { triggerToolName: 'notion', triggerEvent: 'PRD status changed to Approved', triggerDetail: 'When a PRD document status property is set to Approved', actionToolName: 'linear', actionType: 'Create project', actionDetail: 'Auto-create a Linear project with issues derived from PRD sections', connectorType: 'ZAPIER', connectorDetail: 'via Zapier', phases: ['PLANNING'], philosophyFit: ['Auto-Pilot'], setupDifficulty: 'TECHNICAL', techSavviness: 'NINJA', timeSavedPerWeek: 2.0, humanBehaviorChange: 'Use status properties on Notion PRDs instead of manually creating Linear projects' },

  // Cursor ↔ GitHub
  { triggerToolName: 'cursor', triggerEvent: 'Code generation complete', triggerDetail: 'When Cursor completes a multi-file code generation', actionToolName: 'github', actionType: 'Create PR', actionDetail: 'Stage changes and create a draft PR with AI-generated description', connectorType: 'NATIVE', phases: ['EXECUTION'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'DECENT', timeSavedPerWeek: 2.0, humanBehaviorChange: 'Use Cursor terminal integration to push changes directly' },

  // Zapier ↔ Slack (meta-recipe for notifications)
  { triggerToolName: 'zapier', triggerEvent: 'Any tool event', triggerDetail: 'When any connected tool triggers a Zapier event', actionToolName: 'slack', actionType: 'Post to channel', actionDetail: 'Route filtered notifications to appropriate Slack channels', connectorType: 'NATIVE', phases: ['IDEATION', 'PLANNING', 'EXECUTION', 'REVIEW', 'ITERATE'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'GUIDED', techSavviness: 'DECENT', timeSavedPerWeek: 1.0, humanBehaviorChange: 'Configure channel routing rules in Zapier instead of monitoring tools individually' },

  // Claude ↔ Notion
  { triggerToolName: 'claude', triggerEvent: 'Analysis artifact created', triggerDetail: 'When Claude generates a research artifact or analysis', actionToolName: 'notion', actionType: 'Create page', actionDetail: 'Save Claude artifact as a structured Notion page in the research database', connectorType: 'MANUAL', phases: ['IDEATION', 'PLANNING'], philosophyFit: ['Co-Pilot', 'Hybrid'], setupDifficulty: 'PLUG_AND_PLAY', techSavviness: 'NEWBIE', timeSavedPerWeek: 0.5, humanBehaviorChange: 'Copy Claude artifacts to Notion instead of leaving them in chat history' },

  // Figma ↔ Cursor
  { triggerToolName: 'figma', triggerEvent: 'Design specs exported', triggerDetail: 'When design tokens or specs are exported from Figma', actionToolName: 'cursor', actionType: 'Generate components', actionDetail: 'Use exported design specs to generate React components with Cursor', connectorType: 'MANUAL', phases: ['EXECUTION'], philosophyFit: ['Hybrid', 'Auto-Pilot'], setupDifficulty: 'TECHNICAL', techSavviness: 'NINJA', timeSavedPerWeek: 3.0, humanBehaviorChange: 'Export Figma specs as code-friendly format before implementation' },
];
