# Scenario Recommendation Rationale — Improvement Plan

> **Status**: Planning  
> **Scope**: `lib/engine/scenarioBuilder.ts`, `lib/engine/decisionPipeline.ts`, `lib/services/toolIntegrationService.ts`, `lib/engine/narrativeService.ts`, `types.ts`, `api/diagnose.ts`  
> **Goal**: Replace hardcoded assumptions with data-driven, context-adaptive logic using existing DB models that are seeded but underutilized.

---

## Table of Contents

1. [Scenario Definitions](#1-scenario-definitions)
2. [Decision Factors](#2-decision-factors)
3. [Current Problems](#3-current-problems)
4. [Existing DB Models (Underutilized)](#4-existing-db-models-underutilized)
5. [Proposed Changes](#5-proposed-changes)
   - [Part A: Data-Driven Tool Resolution](#part-a-data-driven-tool-resolution)
   - [Part B: Context-Adaptive Tool Counts](#part-b-context-adaptive-tool-counts)
   - [Part C: Scenario-Specific Weight Profiles](#part-c-scenario-specific-weight-profiles)
   - [Part D: Multi-Tool Synergy Bonus](#part-d-multi-tool-synergy-bonus)
   - [Part E: Scenario Rationale Metadata](#part-e-scenario-rationale-metadata)
   - [Part F: Anchor Challenge for Native Integrator](#part-f-anchor-challenge-for-native-integrator)
   - [Part G: User-Stack Familiarity Bonus](#part-g-user-stack-familiarity-bonus)
6. [Architecture Diagram](#6-architecture-diagram)
7. [Files Changed](#7-files-changed)
8. [Implementation Order](#8-implementation-order)

---

## 1. Scenario Definitions

The engine always generates **all three scenarios**, allowing users to compare trade-offs between consolidation, specialization, and automation.

### 1.1 The Mono-Stack (`MONO_STACK`)

**Goal**: Minimal tool count that revolves around leveraging and optimizing what the user currently uses (anchor tool) and cutting tools that may be redundant.

**Key Principle**: The same minimum number of tools cover multiple phases; prefer native integrations.

**How It Works**:
- Starts with anchor tool
- Adds communication tool (Review phase) if missing, preferring integration with anchor
- Adds development tool (Execution phase) if missing, preferring integration
- Removes redundancies

**Best For**:
- Solo founders or small teams
- Teams wanting to reduce context switching
- Budget-conscious users
- Users who selected "We use too many tools" as a pain point

**Tool Selection**: Favors multi-phase tools (notion, clickup, linear, asana, monday) that can handle Ideation + Planning + Iterate phases.

**Complexity Reduction**: Highest — typically reduces from 8+ tools to 5-6.

### 1.2 The Native Integrator (`NATIVE_INTEGRATOR`)

**Goal**: Best-of-breed tools that integrate well (5-6 tools).

**Key Principle**: One tool per major function, optimized for integration quality.

**How It Works**:
- Starts with anchor if provided, but suggests alternatives if other tools do a better job
- Adds one tool per essential category:
  - `PROJECT_MANAGEMENT` (Planning)
  - `DOCUMENTATION` (Ideation/Docs)
  - `DEVELOPMENT` (Execution)
  - `DESIGN` (Design phase)
  - `COMMUNICATION` (async)
  - `MEETINGS` (Review)
  - `ANALYTICS` (Iterate/Launch)
- Each selection uses best use cases
- Applies replacements
- Removes redundancies

**Best For**:
- Growth-stage teams needing specialized capabilities
- Teams that value best-in-class tools per function
- Teams prioritizing seamless data flow between tools
- Users who want flexibility without integration headaches

**Tool Selection**: Scores tools by how well they integrate with already-selected tools (integration score 50% + popularity 50%).

**Complexity Reduction**: Moderate — reduces tool count while maintaining specialization.

### 1.3 The Agentic Lean (`AGENTIC_LEAN`)

**Goal**: AI-first tools for maximum automation (5-7 tools).

**Key Principle**: Every tool should have AI capabilities, optimized for integration.

**How It Works**:
- Filters to only `hasAiFeatures === true` tools
- Starts with anchor if AI-enabled, else finds AI alternative in same category
- Adds AI tools by category: `AI_ASSISTANTS`, `AI_BUILDERS`, `DEVELOPMENT`, `MEETINGS`, `DOCUMENTATION`, `PROJECT_MANAGEMENT`, `AUTOMATION`, `GROWTH`
- Removes redundancies

**Best For**:
- Teams with Auto-Pilot or Hybrid philosophy
- Teams wanting maximum automation
- Teams spending too much time on manual/repetitive tasks
- Tech-savvy teams comfortable with AI tools

**Tool Selection**: Only considers tools with `hasAiFeatures === true`, prioritizing those that integrate well with the stack.

**Complexity Reduction**: Moderate — similar tool count but higher automation potential.

---

## 2. Decision Factors

The engine always presents three scenarios with a clear narrative arc:

| Scenario | Framing | Trade-off |
|---|---|---|
| **Mono-Stack** | What you can optimize **today** | Consolidation — fewer tools, less context switching |
| **Native Integrator** | How you can **improve** | Specialization — best-in-class per function, seamless data flow |
| **Agentic Lean** | How you can further **automate** | Automation — AI handles the heavy lifting |

All three scenarios are always generated so users can compare these trade-offs directly.

---

## 3. Current Problems

### 3.1 Hardcoded Assumptions Become Stale

**Problem**: Fixed lists and mappings don't evolve.

| Hardcoded Constant | Location | Issue |
|---|---|---|
| `MULTI_PHASE_TOOLS` | `scenarioBuilder.ts:35` | Hardcodes 5 tools (`notion`, `clickup`, `linear`, `asana`, `monday`); new multi-phase tools are ignored |
| `PHASE_CATEGORY_MAP` | `scenarioBuilder.ts:24-32` | Assumes fixed category→phase mapping; market changes aren't reflected |
| `SCENARIO_CATEGORY_PRIORITIES` | `scenarioBuilder.ts:38-42` | Fixed priority order per scenario type |
| Scoring weights (50/50) | `findBestToolForCategoryAsync()` | Optimal weights may vary by user segment |

**Impact**: Recommendations become outdated as the tool landscape changes.

**Example**: A new tool like Cursor (multi-phase: docs + code + project management) isn't in the hardcoded list, so it's undervalued in Mono-Stack scenarios.

### 3.2 Misses Edge Cases & Nuance

**Problem**: Binary rules miss context-dependent trade-offs.

- "This team needs Jira despite its complexity because they're enterprise" — but the tech savviness filter removes it
- Tool synergies beyond pairwise integration (e.g., the Notion + Linear + GitHub 3-way chain) aren't recognized
- User-specific preferences not fully captured in the assessment form

**Impact**: Suboptimal recommendations for non-standard cases.

**Example**: A team with strong Notion + Linear integration might benefit from adding GitHub to create a `Linear→GitHub→Slack` automation chain, but the engine doesn't recognize this 3-way synergy.

### 3.3 Fixed Tool Counts Ignore Context

**Problem**: Tool count targets (3-4, 5-6, 5-7) are arbitrary.

| Scenario | Current Target | Reality |
|---|---|---|
| Mono-Stack | 3-4 tools | A 50-person team might need 8 tools even for "consolidation" |
| Native Integrator | 5-6 tools | A solo founder might only need 2-3 specialized tools |
| Agentic Lean | 5-7 tools | Tool count doesn't correlate with complexity (one powerful tool vs three simple ones) |

**Impact**: Forced into artificial constraints that don't match reality.

**Example**: Mono-Stack forces 3-4 tools, but a team might genuinely need 5 tools that all integrate seamlessly — this scenario would be penalized.

### 3.4 Scoring Formula Limitations

**Problem**: Fixed formulas (50/50, 60/40) assume integration and popularity are equally important for everyone.

| Formula | Location | Assumption |
|---|---|---|
| `integrationScore * 0.5 + popularityScore * 0.5` | Agentic Lean category scoring | Integration = popularity importance |
| `popularityScore * 0.6 + momentumScore * 0.4` | Fallback scoring | Momentum is always 40% of popularity |
| Dynamic weight profile | `findBestToolForCategoryAsync()` | Same profile for all scenarios |

**Impact**: Suboptimal tool selection for users with different priorities.

**Example**: A team prioritizing cost over integration gets the same 50/50 formula as a team prioritizing integration over cost.

---

## 4. Existing DB Models (Underutilized)

The database already has rich relational models that were seeded but are barely used by the scenario builder.

### 4.1 `ToolPhaseCapability` — 35 entries for 10 tools

Links a Tool to a WorkflowBucket (which belongs to a phase). Each entry specifies:
- `featureName` — the specific feature (e.g., "Linear Asks", "Cursor Composer")
- `aiAction` / `humanAction` — what AI and humans do with this feature
- `artifact` — what gets produced
- `automationLevel` — FULL, SUPERVISED, ASSISTED, MANUAL
- `philosophyFit[]` — which automation philosophies it suits
- `techSavviness[]` — which skill levels can use it

**Current coverage**:

| Tool | Phases Covered |
|---|---|
| Notion | Discover, Decide, Iterate (5 buckets) |
| Linear | Discover, Decide, Build, Iterate (5 buckets) |
| Cursor | Build (3 buckets) |
| GitHub | Discover, Build (3 buckets) |
| Slack | Discover, Review (3 buckets) |
| Figma | Design, Review (3 buckets) |
| PostHog | Discover, Iterate (3 buckets) |
| Zapier | Build, Review (2 buckets) |
| Claude | Discover, Decide, Review (3 buckets) |
| Fireflies | Review (2 buckets) |

**What it replaces**: `MULTI_PHASE_TOOLS` hardcoded list — instead of checking if a tool's name is in `['notion', 'clickup', 'linear', 'asana', 'monday']`, query which tools have capabilities across 3+ phases.

### 4.2 `WorkflowBucket` — 18 buckets across 7 phases

| Phase | Buckets |
|---|---|
| DISCOVER | Problem Discovery, Market Research, Bug Triage |
| DECIDE | Prioritization, Spec Writing |
| DESIGN | Solution Discovery, Prototyping, Spec Handoff |
| BUILD | Delivery Planning, Implementation, Code Review |
| LAUNCH | Release & Deploy, Announcement, Instrumentation |
| REVIEW | Feedback Collection, Retrospective |
| ITERATE | Metrics Analysis, Documentation, Backlog Grooming |

**What it replaces**: `PHASE_CATEGORY_MAP` — instead of hardcoding which categories map to which phases, derive it from which tool categories have `ToolPhaseCapability` entries in each bucket/phase.

### 4.3 `AutomationRecipe` — 17 entries

Cross-tool automation chains (e.g., `Linear→GitHub`, `GitHub→Slack`, `Slack→Linear`). Each recipe specifies:
- Trigger tool + event
- Action tool + result
- `connectorType` (NATIVE, ZAPIER, API, WEBHOOK)
- `phases[]` — which workflow phases it applies to
- `timeSavedPerWeek` — estimated time savings

**What it enables**: Multi-tool synergy scoring. If adding GitHub to a stack that already has Linear + Slack creates a 3-step chain (`Linear→GitHub→Slack`), that should be a scoring bonus.

### 4.4 `PhaseToolRecommendation` — phase-to-tool mappings

Maps tools to phases with roles and tech savviness filters. The service already has a `findMultiPhaseTool()` method that is **written but never called**.

### 4.5 Tool Fields Available but Underused

Every tool in the DB has:
- `primaryUseCases[]` — descriptive tags (e.g., `['issue tracking', 'sprint planning', 'product roadmaps']`)
- `keyFeatures[]` — specific features (e.g., `['keyboard shortcuts', 'cycles', 'roadmaps', 'github sync']`)

These are not phase-names but could be used for inference when `ToolPhaseCapability` data is missing (e.g., "issue tracking" → likely serves Discover/Decide phases).

---

## 5. Proposed Changes

### Part A: Data-Driven Tool Resolution

**New file: `lib/engine/toolPhaseResolver.ts`** (~120 lines)

Replaces the three hardcoded constants with DB-driven queries.

#### Methods

**`findMultiPhaseTools(allowedToolIds: string[], minPhases = 3): Promise<Tool[]>`**

Queries `ToolPhaseCapability` grouped by `toolId`, counts distinct phases per tool, returns tools covering >= `minPhases` phases. Falls back to `phaseRecommendationService.findMultiPhaseTool()` for broader coverage. This replaces `MULTI_PHASE_TOOLS`.

```
-- Pseudocode
SELECT toolId, COUNT(DISTINCT bucket.phase) as phaseCount
FROM ToolPhaseCapability
JOIN WorkflowBucket ON bucket.id = ToolPhaseCapability.bucketId
WHERE toolId IN (allowedToolIds)
GROUP BY toolId
HAVING phaseCount >= minPhases
```

**`getPhaseCategoryMap(): Promise<Record<string, string[]>>`**

Queries `ToolPhaseCapability` + `WorkflowBucket` to derive which tool categories serve which phases. Falls back to the current hardcoded map when no data exists for a phase. This replaces `PHASE_CATEGORY_MAP`.

**`getToolPhaseCoverage(toolId: string): Promise<string[]>`**

Returns which phases a specific tool covers. Used to decide if a tool genuinely serves a phase in Mono-Stack (instead of the current `MULTI_PHASE_TOOLS.includes(t.name)` check).

#### Fallback Strategy

Only 10 out of ~80 tools have `ToolPhaseCapability` entries. When data is missing:
1. Check `PhaseToolRecommendation` for the tool (broader coverage)
2. Fall back to category-based inference using the current `PHASE_CATEGORY_MAP` as a default
3. This ensures zero regression while allowing richer data to take over as more capabilities are seeded

### Part B: Context-Adaptive Tool Counts

**New function in `scenarioBuilder.ts`: `calculateTargetToolRange()`**

Derives min/max tool count from context instead of fixed targets.

#### Team Size Base Ranges

| Team Size | Base Range | Rationale |
|---|---|---|
| SOLO | 2–4 | One person can only manage so many tools |
| SMALL (2-5) | 3–5 | Small teams benefit from consolidation |
| MEDIUM (6-20) | 4–7 | Enough people to justify specialization |
| LARGE (21-100) | 5–8 | Need specialized tools across functions |
| ENTERPRISE (100+) | 6–10 | Complex org needs more coverage |

#### Scenario Type Modifier

| Scenario | Modifier | Effect |
|---|---|---|
| MONO_STACK | Bias toward **min** | Consolidation: aim for fewer tools |
| NATIVE_INTEGRATOR | Use **mid-range** | Specialization: one per function |
| AGENTIC_LEAN | Bias toward **max** | Automation: cover more with AI tools |

#### Pain Point Modifiers

| Pain Point | Modifier |
|---|---|
| `TOO_MANY_TOOLS` | Reduce max by 1 |
| `TOOLS_DONT_TALK` | No change (integration quality matters more than count) |
| `OVERPAYING` | Reduce max by 1 (fewer tools = lower cost) |
| `TOO_MUCH_MANUAL_WORK` | No change (automation, not count) |

#### Quality Threshold

Each scenario builder iterates categories until reaching `targetMax`, but **stops adding tools if candidate quality (composite score) drops below a threshold** — preventing forced-fit tools that don't genuinely help. The threshold is the average score of already-selected tools minus one standard deviation.

### Part C: Scenario-Specific Weight Profiles

**New function in `scenarioBuilder.ts`: `buildScenarioWeights()`**

Each scenario gets its own weight profile derived from assessment context, replacing the one-size-fits-all approach.

#### Base Weights Per Scenario

| Weight | Mono-Stack | Native Integrator | Agentic Lean |
|---|---|---|---|
| `integration` | **0.35** | **0.30** | **0.30** |
| `cost` | **0.25** | 0.10 | 0.10 |
| `fit` | **0.25** | 0.20 | 0.10 |
| `popularity` | 0.10 | **0.30** | 0.15 |
| `ai` | 0.05 | 0.10 | **0.35** |

#### Contextual Modulation

These base weights are then adjusted by the same modifiers already in `lib/constants.ts`:

- **Pain Points** → `PAIN_POINT_MODIFIERS` (e.g., "OVERPAYING" boosts `cost` weight)
- **Stage** → `STAGE_WEIGHT_MODIFIERS` (e.g., "Bootstrapping" boosts `cost`, reduces `ai`)
- **Cost Sensitivity** → New modifier:
  - `Price-First` → `cost += 0.10`
  - `Value-First` → `cost -= 0.05, fit += 0.05`
- **Philosophy** → New modifier (Agentic Lean only):
  - `Auto-Pilot` → `ai += 0.05`
  - `Co-Pilot` → `ai -= 0.10, popularity += 0.10`

After modulation, weights are normalized to sum to 1.0 using the existing `buildWeightProfile()` normalization logic.

### Part D: Multi-Tool Synergy Bonus

**New method on `lib/services/toolIntegrationService.ts`: `calculateStackSynergyBonus()`**

When evaluating a candidate tool, check if adding it creates `AutomationRecipe` chains across 3+ tools.

#### Logic

```
Input: candidateToolId, existingStackToolIds
1. Query AutomationRecipe where:
     (triggerToolId = candidate AND actionToolId IN existingStack)
     OR (triggerToolId IN existingStack AND actionToolId = candidate)
2. For each matching recipe, check if it extends into a chain:
     Does another recipe exist where the first recipe's action tool
     is the second recipe's trigger tool (or vice versa)?
3. Score:
     - 2-tool connection (pairwise): 0 bonus (already captured by integration score)
     - 3-tool chain: +5 bonus
     - 4+ tool chain: +10 bonus (capped at +15)
```

#### Example

Stack contains: `[Linear, Slack]`. Candidate: `GitHub`.

- Recipe exists: `Linear → GitHub` (trigger: issue assigned, action: create branch)
- Recipe exists: `GitHub → Slack` (trigger: PR merged, action: notify channel)
- Chain: `Linear → GitHub → Slack` (3-tool chain) → **+5 bonus**

This bonus is added to the composite score in `findBestToolForCategoryAsync()`.

### Part E: Scenario Rationale Metadata

**New types in `scenarioBuilder.ts` and `types.ts`**

```typescript
interface ScenarioRationale {
  goal: string;           // "Minimal tool count leveraging the anchor tool"
  keyPrinciple: string;   // "Same tools cover multiple phases; prefer native integrations"
  bestFor: string[];      // ["Solo founders", "Budget-conscious users", ...]
  decisionFraming: string; // "What you can optimize today"
  complexityNote: string;  // "Highest reduction — typically reduces from 8+ to 5-6"
}
```

#### Populated Per Scenario

| Field | Mono-Stack | Native Integrator | Agentic Lean |
|---|---|---|---|
| `goal` | Minimal tool count leveraging the anchor tool, cutting redundancy | Best-of-breed tools, one per function, optimized for integration | AI-first tools for maximum automation |
| `keyPrinciple` | Same tools cover multiple phases; prefer native integrations | One tool per essential category, optimized for integration quality | Every tool has AI capabilities, optimized for integration |
| `bestFor` | Solo/small teams, budget-conscious, reduce context switching, "too many tools" pain point | Growth-stage teams, best-in-class preference, seamless data flow, flexibility | Auto-Pilot/Hybrid philosophy, maximum automation, manual work pain point, tech-savvy |
| `decisionFraming` | What you can optimize today — consolidate around what works | How you can improve — specialized tools that talk to each other | How you can further automate — let AI handle the heavy lifting |
| `complexityNote` | Highest reduction | Moderate reduction | Moderate reduction, higher automation potential |

#### Integration Points

1. **`BuiltScenario`** — new `rationale` field
2. **`api/diagnose.ts`** — pass `rationale` through API response
3. **`types.ts`** — add `ScenarioRationale` to frontend `Scenario` type
4. **`narrativeService.ts`** — inject rationale into the Claude prompt so AI-generated descriptions reference the scenario's purpose and framing

#### Narrative Prompt Enhancement

The current prompt just says "Write a prescription for this scenario." The improved prompt includes:

```
SCENARIO RATIONALE:
- Goal: {rationale.goal}
- Key principle: {rationale.keyPrinciple}
- Best for: {rationale.bestFor.join('; ')}
- Framing: {rationale.decisionFraming}

Write a prescription that explains why this specific scenario type fits their needs —
reference the scenario's goal and framing (e.g. "optimize today" vs "improve" vs "automate").
```

### Part F: Anchor Challenge for Native Integrator

**New method in `scenarioBuilder.ts`: `challengeAnchor()`**

The Native Integrator is "best-of-breed" — it should be willing to replace the anchor if a better tool exists for its category.

#### Logic

1. After building the full stack (anchor + one tool per category), evaluate the anchor:
   - Score the anchor against the rest of the stack (integration + popularity using Native Integrator weights)
   - Find the best alternative in the anchor's category (same scoring)
2. If the alternative scores **>20% better**, swap it in
3. **Only applies to Native Integrator**:
   - Mono-Stack always keeps the anchor (consolidation = build around what you have)
   - Agentic Lean already has its own anchor-replacement logic (find AI alternative)

#### Why 20% Margin?

A small difference isn't worth the switching cost. The 20% threshold means the alternative must be substantially better — not just marginally — to justify displacing a tool the user already knows and uses.

### Part G: User-Stack Familiarity Bonus

**Small scoring bonus in `findBestToolForCategoryAsync()`**

When comparing candidates, tools the user already has in their stack get a **+8 point bonus** (out of 100-point scale). 

#### Rationale

- Switching cost is real — learning a new tool takes time
- If two tools score similarly (e.g., 72 vs 75), the one the user already knows is probably the better choice
- The bonus is small enough that a significantly better tool still wins (a 72+8=80 beats a 75)

#### Implementation

```typescript
// In findBestToolForCategoryAsync, after computing compositeScore:
if (context.userToolIds.includes(tool.id)) {
  compositeScore += 8; // familiarity bonus
}
```

---

## 6. Architecture Diagram

### Current Flow (Hardcoded)

```
Assessment → DecisionPipeline (filter + score) → ScenarioBuilder
                                                    ├── MULTI_PHASE_TOOLS (hardcoded 5 names)
                                                    ├── PHASE_CATEGORY_MAP (hardcoded)
                                                    ├── Fixed 50/50 scoring
                                                    ├── Fixed tool count targets
                                                    └── No rationale metadata
```

### Proposed Flow (Data-Driven)

```
Assessment → DecisionPipeline (filter + score) → ScenarioBuilder
                                                    ├── ToolPhaseResolver (DB queries)
                                                    │     ├── ToolPhaseCapability
                                                    │     ├── WorkflowBucket
                                                    │     └── PhaseToolRecommendation
                                                    ├── buildScenarioWeights() (context-adaptive)
                                                    ├── calculateTargetToolRange() (team-size-adaptive)
                                                    ├── calculateStackSynergyBonus() (AutomationRecipe chains)
                                                    ├── challengeAnchor() (Native Integrator only)
                                                    ├── Familiarity bonus (user's existing tools)
                                                    └── ScenarioRationale metadata → NarrativeService → API
```

### Data Flow for Tool Selection

```
                    ┌─────────────────────────────────┐
                    │   Per-Scenario Weight Profile    │
                    │  (Mono/Native/Agentic-specific)  │
                    │  + pain point modifiers          │
                    │  + stage modifiers               │
                    │  + cost sensitivity modifier     │
                    └──────────────┬──────────────────┘
                                   │
┌──────────────┐    ┌──────────────▼──────────────┐    ┌──────────────────┐
│  Candidate   │───▶│  Composite Scoring          │───▶│  Selected Tool   │
│  Tools       │    │  ┌─ integration × weight     │    │  (if score >     │
│  (by category)│   │  ├─ popularity × weight      │    │   quality floor) │
│              │    │  ├─ cost × weight             │    └──────────────────┘
│              │    │  ├─ fit × weight              │
│              │    │  ├─ AI × weight               │
│              │    │  ├─ synergy bonus (+0-15)     │
│              │    │  └─ familiarity bonus (+0-8)  │
│              │    └─────────────────────────────────┘
└──────────────┘
```

---

## 7. Files Changed

| File | Change Type | Description |
|---|---|---|
| `lib/engine/toolPhaseResolver.ts` | **New** | ~120 lines. DB-driven replacement for `MULTI_PHASE_TOOLS`, `PHASE_CATEGORY_MAP`, with fallback to category heuristics |
| `lib/engine/scenarioBuilder.ts` | **Major edit** | Replace hardcoded consts with resolver calls; add `calculateTargetToolRange()`, `buildScenarioWeights()`, `challengeAnchor()`, familiarity bonus; attach `ScenarioRationale` to each scenario |
| `lib/services/toolIntegrationService.ts` | **Minor edit** | Add `calculateStackSynergyBonus()` method using `AutomationRecipe` chains |
| `lib/engine/narrativeService.ts` | **Minor edit** | Include `ScenarioRationale` in Claude prompt; update fallback narratives to use decision framing |
| `types.ts` | **Minor edit** | Add `ScenarioRationale` interface; add `rationale?` field to `Scenario` type |
| `api/diagnose.ts` | **Minor edit** | Pass `rationale` through API response type and response body |
| `lib/constants.ts` | **Minor edit** | Add `COST_SENSITIVITY_MODIFIERS` and `PHILOSOPHY_MODIFIERS` for scenario weight modulation |
| `lib/engine/__tests__/decisionPipeline.test.ts` | **Update** | Cover new weight profiles, adaptive counts, synergy scoring |

---

## 8. Implementation Order

The changes are designed to be implemented incrementally. Each step is independently deployable and testable.

| Step | Part | Description | Risk | Dependencies |
|---|---|---|---|---|
| 1 | **E** | Scenario Rationale Metadata | Low | None — additive, no logic changes |
| 2 | **C** | Scenario-Specific Weight Profiles | Low | None — replaces weights but uses same scoring infrastructure |
| 3 | **B** | Context-Adaptive Tool Counts | Low | None — replaces fixed targets with calculated ranges |
| 4 | **F** | Anchor Challenge | Low | Part C (uses scenario weights) |
| 5 | **G** | User-Stack Familiarity Bonus | Low | None — small addition to scoring |
| 6 | **A** | Data-Driven Tool Resolution | Medium | Requires DB data; has fallback so safe to deploy |
| 7 | **D** | Multi-Tool Synergy Bonus | Medium | Requires `AutomationRecipe` data in DB |

Steps 1-5 are pure logic changes with no DB dependency. Steps 6-7 leverage existing DB data but include fallbacks so they work even if the data is sparse.
