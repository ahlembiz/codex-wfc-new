# Reverse-Engineering the Engine to Redesign the Intake Form

## Overview

This document analyzes the complete signal flow from the intake form through the recommendation engine to identify gaps, dead signals, and opportunities for improvement. The goal is to redesign the intake form so every field has a traceable wire to a scoring function, filter, or scenario builder decision.

---

## The Complete Signal Map: What Feeds What

### Signal Audit Table

| Form Field | Engine Stage(s) That Consume It | How It's Used | Signal Strength |
|------------|--------------------------------|---------------|-----------------|
| `company` | narrativeService only | Inserted into Claude prompt as "PATIENT: {company}" | **Cosmetic** — zero engine impact |
| `stage` | `filterByFit`, `scoreAndRankTools` (fitScore), `narrativeService`, `costCalculator` (via teamSize bucket) | Binary 50pt match in fitScore, narrative prompt color | **Medium** — but only binary (match/no-match) |
| `teamSize` | `filterByFit`, `scoreAndRankTools` (fitScore), `costCalculator`, `replacementService` | Binary 50pt match in fitScore, cost multiplier, replacement context | **Medium** — same binary problem |
| `currentTools` | `matchToolNames` → `userToolIds` → integration scoring, redundancy analysis, displacement list, cost baseline | Drives the entire "what you have vs. what you should have" analysis | **Critical** — highest-impact field |
| `philosophy` | `scoreAndRankTools` (aiScore), `workflowGenerator` (role assignment), `scenarioBuilder` (Agentic Lean filtering), `replacementService` (`preferAiNative`), `narrativeService` | AI score: 100 vs 60 vs 10, workflow text, scenario tool filtering | **High** — but only 15% of total score weight |
| `techSavviness` | `filterByTechSavviness` (hard filter), `replacementService` | Newbie: removes ADVANCED+EXPERT tools entirely, Ninja: no filtering | **High** — hard filter = dramatic impact |
| `budgetPerUser` | `filterByBudget` (hard filter), `scoreAndRankTools` (costScore) | Hard budget ceiling (modulated by costSensitivity), 20% of score weight | **High** |
| `costSensitivity` | `filterByBudget` (filter strictness), `replacementService` (COST_SAVINGS scoring) | Price-First: strict, Balanced: 1.5x flex, Value-First: barely filters | **High** — modulates budget filter behavior |
| `sensitivity` | `filterByCompliance` (gate) | Only activates compliance filter if "High-Stakes" | **Binary gate** |
| `highStakesRequirements` | `filterByCompliance` (hard filter), `replacementService` | Hard filter: tool must satisfy ALL requirements | **Critical when active** — removes tools entirely |
| `anchorType` | `resolveAnchor` | Finds anchor from user's current tools; anchor is protected from displacement and prioritized in all 3 scenarios | **High** — shapes all 3 scenario skeletons |
| `painPoints` | `narrativeService` only (line 67) | String interpolation into Claude prompt: `Pain points: ${assessment.painPoints.join(', ')}` | **Cosmetic** — zero engine impact |
| `isSoloFounder` | Not used anywhere in engine | Only mapped to team size in the form itself | **Dead signal** |
| `agentReadiness` | Not used anywhere in engine | Collected, stored, never read | **Dead signal** |
| `otherAnchorText` | `resolveAnchor` (fuzzy match against user tools) | Only used if `anchorType === 'Other'` | **Conditional** |

---

## The Three Categories of Problem

### 1. Dead Signals: Fields Collected But Never Used

These are the most wasteful — they add friction to the form for zero recommendation quality.

#### `painPoints` — The Biggest Miss

The form collects 5 pain points that map perfectly to engine behaviors, but the engine ignores them:

**Current Pain Points:**
- "We use too many tools"
- "I don't have time to deep dive"
- "Context switching kills our flow"
- "We pay too much and don't optimize enough"
- "I have a small budget"

**What Each Should Influence:**

| Pain Point | What It *Should* Influence | Current Engine Lever |
|------------|---------------------------|---------------------|
| "We use too many tools" | Boost MONO_STACK scenario, weight integration score higher, prefer multi-phase tools | `scoreAndRankTools` weights are fixed at `0.25/0.25/0.20/0.15/0.15` |
| "Context switching kills our flow" | Boost integration score weight from 0.15 → 0.30, prefer NATIVE quality integrations | Integration weight hardcoded to 0.15 |
| "We pay too much" | Boost cost score weight from 0.20 → 0.35, activate aggressive replacement by COST_SAVINGS | Cost weight hardcoded to 0.20 |
| "I have a small budget" | Should behave like Price-First even if they selected Balanced, or at least floor the budget filter | No interaction with `costSensitivity` |
| "No time to deep dive" | Prefer SIMPLE complexity, boost tools with low onboarding friction | Only `techSavviness` gates complexity, but "no time" is different from "not technical" |

#### `agentReadiness` — Collected But Unused

Collected as "MD Guide Uploaded" checkbox. Never read by any engine file. This should either:
- Influence the workflow generator (more specific agent instructions if guides exist)
- Be removed entirely to reduce form friction
- Be reframed as "Do you already have documented SOPs/workflows?" which would inform how much migration support to recommend

#### `isSoloFounder` — Redundant Signal

Only self-references to auto-set teamSize to Solo. The engine only sees `teamSize: SOLO`. But solo founders have distinct needs beyond team size: they need consolidation (one tool for everything), they can't afford context switching, and free tiers matter disproportionately. This should be a first-class signal, not a checkbox that maps to a dropdown.

### 2. Underweighted Signals: Fields That Exist But Barely Matter

#### `stage` — Binary Match Only

Currently contributes a binary 50/0 to `fitScore`, which is 25% of the total score. So stage contributes at most `50 * 0.25 = 12.5 points` out of 100. But stage is profoundly important:

- **Bootstrapping** teams need free tools, minimal complexity, fast setup
- **Growth** teams need scalability, integrations, analytics
- **Established** teams need compliance, enterprise features, advanced security

Stage should influence *weight profiles*, not just a binary match score. A Bootstrapping company should have cost weighted at 35%, while an Established company should have integration and compliance weighted higher.

#### `company` — Pure Decoration

Currently pure decoration in the narrative prompt. If this were structured (e.g., "What does your company do?" with a dropdown or keyword tags), it could unlock vertical-specific recommendations. A healthcare startup vs. a developer tools company vs. a content agency need fundamentally different stacks.

### 3. Missing Signals: What the Engine Could Use But Doesn't Ask

These are fields that would feed *existing* engine capabilities that are currently under-utilized or defaulting to neutral values.

#### a) Workflow Phase Priorities

The engine has a 5-phase workflow model (Ideation → Planning → Execution → Review → Iterate), but it never asks the user which phases matter most.

**Proposed Question:**
> "Where does your team spend the most time?"
> - [ ] Ideation & brainstorming
> - [ ] Planning & specs
> - [ ] Building & execution
> - [ ] Reviews & meetings
> - [ ] Iteration & analytics

This directly informs which categories to prioritize in `PHASE_CATEGORY_MAP`. If a team says "we spend 60% of time in Execution," the engine should weight DEVELOPMENT and AI_BUILDERS tools much higher.

#### b) Tool Satisfaction Ratings

The form collects `currentTools` as a flat string, but doesn't ask *how the user feels about each tool*. This is critical because the anchor resolution assumes the user *wants* to keep their anchor. But what if they selected "Doc-Centric" but they hate Notion?

**Proposed Enhancement:**
After tool matching, show matched tools with satisfaction toggles:
- **Keep** (treat as anchor-like)
- **Open to replacing** (include in replacement analysis)
- **Definitely replacing** (add to displacement candidates)

#### c) Category Gaps the User *Wants* to Fill

The engine selects tools per category, but it doesn't know if the user even needs an analytics tool. A team that doesn't do data-driven iteration shouldn't be prescribed PostHog.

**Proposed Question:**
> "Which capabilities do you need?"
> - [x] Project management
> - [x] Documentation
> - [x] Development
> - [ ] Design
> - [x] Communication
> - [ ] Analytics
> - [ ] Automation

This would prevent the scenario builder from filling categories the user doesn't care about.

#### d) Integration Priority

The form never asks "How important is it that your tools talk to each other?" Integration score is weighted at 15% for everyone. For some teams, seamless data flow is everything. For others (solo founders using disconnected tools), it's irrelevant.

**Proposed Question:**
> "How important are tool integrations?"
> - Low (tools can be disconnected)
> - Medium (some integration helpful)
> - High (seamless data flow critical)

This would dynamically adjust the integration weight in scoring.

#### e) Migration Willingness

The engine has `estimateTransitionCost()` that calculates migration hours, but it's never used in the main analysis because there's no signal about how willing the user is to switch.

**Proposed Question:**
> "How disruptive would switching tools be?"
> - Low (we're flexible, can migrate easily)
> - Medium (some disruption acceptable)
> - High (minimize changes, prefer incremental improvements)

This would let the engine:
- Temper displacement recommendations for change-averse teams
- Factor transition costs into ROI calculations
- Prefer incremental improvements over wholesale stack replacement

---

## Redesigned Pain Points: From Cosmetic to Computational

The current pain points are vague human sentiments. Reframe them as engine-actionable signals:

### Current (Cosmetic):
```
"We use too many tools"
"I don't have time to deep dive"
"Context switching kills our flow"
"We pay too much and don't optimize enough"
"I have a small budget"
```

### Proposed (Engine-Mapped):

| Reframed Question | What It Maps To | Engine Impact |
|-------------------|----------------|---------------|
| "We juggle too many tools and want to consolidate" | `weightOverride.integration += 0.15`, prefer MONO_STACK, boost multi-phase tools | Shifts scoring to prefer fewer, broader tools |
| "Our tools don't talk to each other" | `weightOverride.integration += 0.15`, only recommend NATIVE/DEEP integration quality | Hard-filters integration quality, changes scenario builder selection |
| "We're overpaying for features we don't use" | `weightOverride.cost += 0.15`, activate COST_SAVINGS replacements aggressively | Shifts scoring toward cheaper alternatives, triggers replacement analysis |
| "We're spending too much time on manual/repetitive tasks" | `weightOverride.ai += 0.15`, boost tools with `hasAiFeatures === true`, prefer Agentic Lean | Shifts scoring toward AI-native tools |
| "We can't find things or stay organized" | Boost DOCUMENTATION category priority, prefer tools with strong search/knowledge features | Informs which `primaryUseCases` to match against |
| "Our review/approval process is slow" | Boost MEETINGS and COMMUNICATION category priority, prefer async-first tools | Informs phase weighting |
| "We need better visibility into what's working" | Boost ANALYTICS and GROWTH category priority | Adds categories the engine should prioritize |

Each selected pain point should produce a concrete `WeightModifier` object that adjusts the `0.25/0.25/0.20/0.15/0.15` formula dynamically.

---

## The Proposed Intake Restructure

### Section 01: Vitals (Keep, Enhance)
- **Company** — keep as-is
- **What does your team do?** — **NEW**: dropdown (Engineering, Product, Marketing, Design, Operations, Mixed/Cross-functional). Maps to category weight adjustments
- **Growth Stage** — keep as-is, but make it influence weight profiles
- **Team Size** — keep, absorb solo founder logic (remove separate checkbox)

### Section 02: Current Stack (Major Redesign)
- **Current Tools** — Replace text input with **autocomplete multi-select** from your 250-tool database. Show matched logo pills
- **For each matched tool**: show a quick "Keep / Open to replacing / Definitely replacing" toggle. This feeds anchor resolution and displacement willingness
- **What's missing?** — **NEW**: "Which capabilities do you wish you had?" (category checklist). Tells the engine which gaps to fill

### Section 03: How You Work (Reframed Triage)
- **Anchor Tool** — Auto-detect from the tool with "Keep" rating, or ask "Which tool is your team's home base?"
- **Automation Tolerance** — keep the slider
- **Tech Savviness** — keep the slider
- **Where does your team spend the most time?** — **NEW**: Phase priority ranking or multi-select (Ideation, Planning, Execution, Review, Iteration)

### Section 04: What Hurts (Reframed Pain Points)
- Redesigned pain points from the table above — each one engine-mapped
- Allow ranking or intensity: "A little" / "A lot" (binary weight modifier: +0.05 vs +0.15)

### Section 05: Budget & Compliance (Consolidated)
- **Budget Per User** — keep slider
- **Cost Sensitivity** — keep toggle
- **How disruptive would switching tools be?** — **NEW**: Low/Medium/High (migration willingness)
- **Compliance** — keep conditional high-stakes section

### Remove Entirely:
- `isSoloFounder` checkbox (redundant with team size = Solo)
- `agentReadiness` checkbox (unclear signal, unused by engine)

---

## The Technical Wiring

For each new/redesigned field, here's where it would plug into the existing codebase:

| New Field | Touches | Mechanism |
|-----------|---------|-----------|
| Team function/vertical | `scoreAndRankTools` | Category weight boost map: `{ Engineering: { DEVELOPMENT: +0.10 }, Marketing: { GROWTH: +0.10, ANALYTICS: +0.05 } }` |
| Tool satisfaction ratings | `resolveAnchor`, `redundancyService.analyzeRedundancies` | "Definitely replacing" → add to displacement candidates; "Keep" → treat as anchor-like |
| Capability gaps wanted | `scenarioBuilder.buildNativeIntegratorScenario` | Override `essentialCategories` with user-selected categories only |
| Phase priorities | `workflowGenerator`, `scenarioBuilder` | Weighted phase-category mapping; top phases get 2 tool candidates instead of 1 |
| Engine-mapped pain points | `scoreAndRankTools` | `WeightModifier` object adjusts the 5 scoring weights dynamically |
| Pain intensity | `scoreAndRankTools` | Modifier magnitude: "A little" = +0.05, "A lot" = +0.15 |
| Migration willingness | `costCalculator.estimateTransitionCost`, displacement list | Low willingness → fewer displacements, show incremental migration path; High → aggressive replacement |

The key architectural change is that `scoreAndRankTools` needs to accept a `WeightProfile` parameter instead of hardcoded constants. The weight profile is constructed from the assessment signals before scoring begins. This is a small code change (the function already takes a `params` object) with massive impact on personalization.

---

## Priority Order for Implementation

1. **Wire `painPoints` into `scoreAndRankTools` as weight modifiers** — Highest ROI. The data is already collected; it just needs to flow into the engine. Reframe the options to be engine-actionable.

2. **Replace current tools text input with autocomplete** — The quality of `currentTools` matching determines integration scoring, redundancy detection, and cost baseline. Better input = better everything downstream.

3. **Add tool satisfaction ratings** — Small UI addition (3 radio buttons per matched tool), huge signal gain for anchor resolution and displacement.

4. **Add "capabilities you need" category checklist** — Prevents the scenario builder from recommending categories the user doesn't want.

5. **Add phase priority question** — Differentiates workflow generation between teams that are execution-heavy vs. planning-heavy.

6. **Add team function/vertical** — Unlocks an entirely new scoring dimension with a single dropdown.

7. **Remove dead signals** — Drop `agentReadiness` and `isSoloFounder` to reduce form friction.

---

## Key Principle

**Every form field should have a traceable wire to a scoring function, a filter, or a scenario builder decision. If it doesn't, it's either missing its wire (pain points) or shouldn't exist (agentReadiness).**

---

## Files That Need Changes

| File | Changes Required |
|------|-----------------|
| `components/IntakeForm.tsx` | Major redesign: autocomplete for tools, satisfaction ratings, new fields, reframed pain points |
| `lib/engine/decisionPipeline.ts` | Add `WeightProfile` parameter to `scoreAndRankTools`, construct from assessment signals |
| `lib/engine/scenarioBuilder.ts` | Use capability gaps to filter categories, use phase priorities to weight tool selection |
| `lib/middleware/validation.ts` | Add validation for new fields (team function, phase priorities, etc.) |
| `types.ts` | Extend `AssessmentData` interface with new fields |
| `lib/services/toolMatchingService.ts` | Enhance to support autocomplete UI (return partial matches, confidence scores) |
| `lib/engine/costCalculator.ts` | Use migration willingness to temper displacement recommendations |

---

## Implementation Checklist

- [ ] **Phase 1**: Wire `painPoints` into `scoreAndRankTools` as weight modifiers. Reframe pain point options to be engine-actionable.
- [ ] **Phase 2**: Replace current tools text input with autocomplete multi-select from tool database. Show matched logo pills.
- [ ] **Phase 3**: Add tool satisfaction ratings (Keep/Open to replacing/Definitely replacing) for each matched tool.
- [ ] **Phase 4**: Add "capabilities you need" category checklist to prevent recommending unwanted categories.
- [ ] **Phase 5**: Add phase priority question to differentiate workflow generation.
- [ ] **Phase 6**: Add team function/vertical dropdown to unlock vertical-specific scoring.
- [ ] **Phase 7**: Remove dead signals (`agentReadiness`, `isSoloFounder` checkbox).
- [ ] **Phase 8**: Update `scoreAndRankTools` to accept `WeightProfile` parameter constructed from assessment signals.
- [ ] **Phase 9**: Update `scenarioBuilder` to use capability gaps and phase priorities.
- [ ] **Phase 10**: Update validation middleware for new fields.
