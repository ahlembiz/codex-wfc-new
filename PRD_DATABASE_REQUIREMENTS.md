# Product Requirements Document: Database Requirements  
**AI Workflow Clinic**

---

## 1. Purpose of this document

This document defines how the database is expected to support the AI Workflow Clinic. It describes the project's logic, what the database must store, how that data is used in recommendations, and how the database fits into the product flow. It does not specify technology, implementation, or architecture.

---

## 2. Project context and role of the database

### 2.1 What the product does

The AI Workflow Clinic helps teams optimize their product development and project management workflows by:

- Reducing the number of tools they use (consolidation and replacement).
- Surfacing features in tools they already have that can replace other tools (e.g. using Notion for call transcripts instead of Fireflies).
- Recommending simpler or better-fitting stacks (e.g. Linear + Slack instead of Jira + Teams for small teams).
- For solo founders or teams "just starting," recommending a minimal set of tools by phase and tech savviness.

The product always returns exactly three scenarios (Mono-Stack, Native Integrator, Agentic Lean), each tailored to the user's context. Recommendations follow a fixed decision order: compliance → anchor → budget → pain-point emphasis → savviness → philosophy.

### 2.2 Why a database is needed

Recommendations must be:

- **Consistent** – Same user context and tool set should lead to the same allowed tools and displacement options.
- **Explainable** – Every "drop this tool" or "replace with that tool" must be backed by clear, reusable reasons (e.g. feature overlap, simpler alternative, cost).
- **Efficient** – Heavy analysis (redundancy, replacements, best-fit bundles) must not be recomputed for every request.

So the product uses a **pre-computed analysis database**: tool profiles, redundancy, replacements, bundles, and phase–tool recommendations are computed and stored once, then **queried** at recommendation time. The database is the single source of truth for "which tools exist," "how they overlap," "what can replace what," and "what to recommend for whom."

---

## 3. Goals of the database

The database is expected to:

1. **Store a curated set of tools** (~100) with enough structure to match user input, filter by context (compliance, budget, savviness), and justify recommendations.
2. **Store pre-computed redundancy** between tools (which pairs overlap on use cases or features, and how strongly) so the product can suggest dropping redundant tools and cite specific overlaps.
3. **Store pre-computed replacement relationships** (which tool can replace which, under what conditions, and why) so the product can suggest "drop X, use Y's feature" or "replace X with Y" with a clear reason.
4. **Store recommended bundles** (small sets of tools that work well together for given team size, stage, and savviness) so the product can suggest entire stacks (e.g. "Linear + Slack for small startups") and compare them to the user's current stack.
5. **Store phase–tool recommendations** (which tools to recommend for each phase of the product cycle, by tech savviness) so the product can recommend a "Starter pack" for solo founders or teams just starting.
6. **Support the decision order** by allowing queries that respect compliance first, then anchor, then budget, then pain-point emphasis, then savviness, then philosophy, without storing recommendation logic itself in the database.
7. **Support traceability** so every displacement or replacement in a scenario can be tied back to a defined tool, redundancy, or replacement record.

---

## 4. What the database must store

### 4.1 Tool profiles

**Purpose:** Represent each tool in the curated set so the product can match user-stated tools, filter by context, and explain why a tool is recommended or displaced.

**Expected content per tool:**

- **Identity** – A stable, canonical identifier and display name used everywhere (in redundancy, replacements, bundles, and phase–tool data).
- **Category** – The type of tool (e.g. project management, communication, documentation, calls and meetings, development, design). Used to scope redundancy and to filter by "same category" or "complementary categories."
- **Primary use cases** – The main jobs the tool supports (e.g. task management, sprint planning, call recording, transcripts, async communication). Used to compute and query overlap with other tools and to explain "this tool covers that use case."
- **Key features** – Notable capabilities (e.g. transcripts, summarization, integrations with Slack or Linear, API). Used to justify "feature X in tool A replaces tool B."
- **Integrations** – Which other tools (from the same curated set) it connects to. Used for Native Integrator scenarios and bundle validity.
- **Complexity** – A simple classification (e.g. low, medium, high) indicating how much setup or skill is required. Used to filter by tech savviness.
- **Typical pricing tier** – A simple classification (e.g. free, freemium, paid mid, paid enterprise) so the product can filter by budget band (Price-First, Balanced, Value-First).
- **Best for** – For whom the tool is a good fit: team size (e.g. solo, small, medium, large), stage (e.g. idea, early, growth, established), and tech savviness (e.g. newbie, decent, ninja). Used to filter recommendations and to build bundles and phase–tool matrix.
- **Compliance** – When relevant, whether the tool meets specific requirements (e.g. SOC 2, HIPAA, EU data residency, self-hosted, air-gapped). Used to apply the compliance filter first in the decision order.

**How it supports the product:** Matching user input to canonical tools, filtering by compliance and budget, filtering by savviness and "best for," and providing the vocabulary for redundancy and replacement reasons (use cases, features).

---

### 4.2 Tool redundancy (overlap between tools)

**Purpose:** Pre-compute which tools overlap in purpose or features so the product can recommend "drop one of these" and explain why (e.g. "Notion and Fireflies both cover call transcripts; keep Notion, drop Fireflies").

**Expected content per redundancy record:**

- **The pair** – Two tools from the curated set (ordered or unordered, depending on how the product queries).
- **Overlapping use cases** – Which primary use cases both tools serve (e.g. call recording, transcripts).
- **Overlapping features** – Which key features both tools have (e.g. transcripts, summaries).
- **Strength of redundancy** – How much they overlap (e.g. full, partial, niche). Used to decide when it's safe to recommend dropping one.
- **Recommendation hint** – When one tool is generally preferred over the other (e.g. prefer A, prefer B, or context-dependent). Used to suggest which tool to keep when the user has both and anchor/budget allow.

**How it supports the product:** Mono-Stack and Native Integrator scenarios use this to build displacement lists and to write copy like "eliminate the metabolic waste of context switching between Jira, Asana, and Fireflies." The product queries redundancy among the user's current tools to decide what to amputate and how to explain it.

---

### 4.3 Tool replacements

**Purpose:** Pre-compute "tool A can replace tool B" (or "B is often replaced by A") with a reason and optional conditions, so the product can suggest dropping or swapping tools with a clear, repeatable justification.

**Expected content per replacement record:**

- **From-tool and to-tool** – The tool being replaced and the tool that replaces it (or that the user should use instead).
- **Reason type** – Why this replacement is suggested (e.g. feature overlap, simpler alternative, cost savings, better integration with the rest of the stack).
- **Reason text** – A short, human-readable explanation (e.g. "Notion has built-in transcripts and summaries; user can drop Fireflies if they have Notion Pro"). This is the kind of copy that can be used in scenario blurbs or tool-specific notes.
- **Context** – When this replacement applies (e.g. "when user already has Notion Pro," "for small teams"). Used to filter which replacements to show for a given user.
- **Conditions** – Optional, structured conditions (e.g. team size, stage, "already has tool X") so the product can show the replacement only when the user context matches.

**How it supports the product:** All three scenarios use replacements to justify displacement and to suggest "use X's feature instead of Y." The product queries replacements where the from-tool is in the user's current set and conditions match (compliance, anchor, budget, savviness). Replacement reasons feed into scenario blurbs and amputation explanations.

---

### 4.4 Tool bundles

**Purpose:** Pre-define small sets of tools that work well together for given contexts, so the product can recommend a full stack (e.g. "Linear + Slack for small startups") and compare it to the user's current stack.

**Expected content per bundle:**

- **Identity** – A stable identifier and a short display name (e.g. "Linear + Slack for small startups").
- **Description** – A short narrative of what the bundle is and why it's recommended (e.g. "Simpler than Jira + Teams for small teams; Slack emojis and Linear–Slack integration for tickets and bugs"). This aligns with the scenario blurb style.
- **Tools in the bundle** – The list of tools (by canonical identifier) and optionally their role (e.g. hub vs supporting).
- **Use cases covered** – Which primary use cases the bundle addresses (e.g. task management, async communication, notifications). Used to explain "this bundle covers what you do."
- **Best for** – Team size, stage, and tech savviness for which this bundle is recommended. Used to filter bundles in the decision order (after compliance, anchor, budget).
- **Comparison note** – Optional text comparing the bundle to a common alternative (e.g. "Simpler than Jira + Teams for small teams"). Used in scenario copy.

**How it supports the product:** Mono-Stack and Native Integrator scenarios can suggest a bundle as the target stack; the product queries bundles by compliance, anchor (e.g. bundle includes user's anchor), budget (tools in bundle within budget band), and savviness. Bundle description and comparison note feed into scenario blurbs and positioning.

---

### 4.5 Phase–tool recommendations

**Purpose:** Pre-define which tools to recommend for each phase of the product cycle (e.g. ideation, planning, development, ship, iterate) by tech savviness, so the product can recommend a "Starter pack" for solo founders or teams with no anchor.

**Expected content per phase–tool record:**

- **Phase** – The stage of the product cycle (e.g. ideation, planning, development, ship, iterate).
- **Tool** – The recommended tool (by canonical identifier).
- **Role** – Whether this tool is primary or secondary for that phase.
- **Tech savviness** – For which savviness level(s) this recommendation applies (e.g. newbie, decent, ninja).
- **Note** – Optional short explanation (e.g. "tasks and roadmap," "docs and specs"). Used to explain why this tool in this phase.

**How it supports the product:** When the user has no anchor or is "just starting," one scenario is the Starter pack: the product queries phase–tool data by phase and user's savviness to get a minimal set of tools per phase. The list is ordered by phase and role so the product can present a clear "phase → tools" view.

---

## 5. How the database supports the project's decision logic

The product applies decisions in this order: **compliance → anchor → budget → pain-point emphasis → savviness → philosophy.** The database does not implement this logic; it provides the data so that the product can apply it.

### 5.1 Compliance first

The product must only recommend tools (and bundles) that meet the user's high-stakes requirements (e.g. SOC 2, HIPAA, EU data residency, self-hosted, air-gapped).  
**Database expectation:** Tool profiles (and, if needed, bundle-level flags) must allow the product to filter to "compliant tools only" before any other filter. Replacement and bundle data should reference only tools from the curated set, so compliance filtering on tools automatically restricts which replacements and bundles are eligible.

### 5.2 Anchor second

The user's anchor (e.g. Notion, GitHub/Cursor, Slack, or "none") defines the hub. All three scenarios are built around that hub (or, if "none," the phase–tool matrix).  
**Database expectation:** Tool profiles and bundles must be queryable by "includes this tool as hub" or "compatible with this anchor." Phase–tool data does not depend on anchor; it is used when anchor is "none."

### 5.3 Budget third

The user's budget band (Price-First, Balanced, Value-First) and per-user budget restrict which tools (and thus which bundles and replacements) are allowed.  
**Database expectation:** Each tool has a typical pricing tier (and optionally a rough cost range) so the product can filter tools—and hence bundles and replacement suggestions—by budget band. No scenario may recommend tools outside the allowed set except when compliance forces a more expensive compliant option (product logic).

### 5.4 Pain-point emphasis fourth

Pain points determine which scenario is primary (Mono-Stack vs Native Integrator vs Agentic Lean) and what to optimize (consolidation vs integration vs automation).  
**Database expectation:** Redundancy data supports consolidation (Mono-Stack); replacements and integrations support integration and automation (Native Integrator, Agentic Lean). The database does not store "pain point → scenario"; it stores the relationships (redundancy, replacement, integration, bundle) that the product uses when emphasizing a given scenario.

### 5.5 Savviness fifth

Tech savviness filters which tools (and thus bundles and phase–tool recommendations) are appropriate.  
**Database expectation:** Each tool has "best for" savviness; bundles and phase–tool records have savviness. The product filters to "tools/bundles/phase–tool rows that match the user's savviness" after compliance, anchor, and budget.

### 5.6 Philosophy sixth

Automation philosophy (Co-Pilot, Hybrid, Auto-Pilot) shapes AI vs human roles in the prescribed protocol and how "agentic" the Agentic Lean scenario is.  
**Database expectation:** The database does not need to store philosophy. It stores tools and replacements (e.g. automation-friendly tools, "replaced by AI workflow"); the product uses that data plus philosophy to generate workflow steps and role copy.

---

## 6. Data lifecycle and usage

### 6.1 Build phase ("analyze once")

- **Tool profiles** – Filled (or updated) for the full curated set (~100 tools). Source: curation, research, or external analysis; the product does not define how this is done, only that each tool has the fields described above.
- **Redundancy** – Computed for pairs of tools (e.g. same category or shared use cases). Each record stores the pair, overlapping use cases/features, strength, and recommendation hint. Updated when the tool set or tool profiles change.
- **Replacements** – Computed from redundancy and product/business rules (e.g. "Notion transcripts replace Fireflies when user has Notion Pro"). Each record has from-tool, to-tool, reason type, reason text, context, and optional conditions. Updated when tools or positioning change.
- **Bundles** – Defined and updated by product/curation. Each bundle has its tools, use cases covered, best for, description, and comparison note.
- **Phase–tool** – Defined and updated by product/curation. Each record has phase, tool, role, savviness, and optional note.

The database is the single source of truth for this pre-computed analysis. No ad hoc "live" analysis is required at request time for redundancy or replacement derivation; the product queries what is already stored.

### 6.2 Recommendation phase ("recommend many times")

- **User input** – Current tools (free text), team size, stage, anchor, budget, cost sensitivity, pain points, savviness, automation philosophy, compliance requirements. Not stored in this database; used only to query it.
- **Matching** – User-stated tools are matched to canonical tool identifiers using tool profiles (name, aliases if present). Only canonical IDs are used in subsequent queries.
- **Queries** – The product queries (conceptually):
  - Tools: by compliance, pricing tier, best for (team size, stage, savviness), and optionally anchor.
  - Redundancy: pairs where both tools are in the user's current set (and both in allowed set).
  - Replacements: from-tool in user's set, to-tool in allowed set, conditions met.
  - Bundles: allowed set, anchor, best for; optionally "bundle that covers user's use cases and is simpler than current stack."
  - Phase–tool: by phase and savviness when anchor is "none."
- **Output** – The product builds three scenarios (Mono-Stack, Native Integrator, Agentic Lean, or one as Starter pack), displacement lists, prescribed protocol (phases, tools, AI/human roles, outcomes), cost projections, and complexity scores. Tool names, displacement reasons, and replacement reasons come from the database; narrative copy (blurbs, role text, outcomes) is generated or assembled using the language guidelines, but is grounded in database entities (tools, redundancy, replacements, bundles).

The database is read-heavy at recommendation time; it does not need to store user sessions, recommendation history, or A/B tests unless otherwise specified in a separate requirements document.

---

## 7. Quality and consistency expectations

### 7.1 Referential integrity

- Every redundancy record references two tools that exist in the tool set.
- Every replacement record references a from-tool and a to-tool that exist in the tool set.
- Every bundle references only tools that exist in the tool set.
- Every phase–tool record references a tool that exists in the tool set.

So the product can always resolve "this tool," "this pair," "this replacement," "this bundle" to a full tool profile or list of tools.

### 7.2 Canonical identifiers and names

- Each tool has one canonical identifier and one primary display name used in redundancy, replacements, bundles, and phase–tool data. User-facing copy (e.g. "Amputation List") uses these names so that "Jira," "Asana," "Fireflies," "Manual Linear Interface" match what is in the database.

### 7.3 Taxonomy

- Primary use cases and key features should use a consistent, finite taxonomy (e.g. a controlled list) so that redundancy ("overlapping use cases") and replacement reasons ("feature overlap") are queryable and comparable. The product may define or adopt this taxonomy; the database is expected to store values that conform to it.

### 7.4 Consistency with decision order

- Data should be structured so that filtering by compliance, then anchor, then budget, then savviness can be done without re-scanning the full set each time. The exact query pattern is an implementation concern; the requirement is that the database can support the decision order described in this document.

---

## 8. Scope and out-of-scope

### 8.1 In scope

- Storing and querying the curated tool set (~100 tools) with the attributes described above.
- Storing and querying pre-computed redundancy between tools.
- Storing and querying pre-computed replacement relationships with reasons and conditions.
- Storing and querying bundles with tools, use cases covered, best for, and narrative fields.
- Storing and querying phase–tool recommendations by phase and savviness.
- Supporting the product's decision order (compliance → anchor → budget → pain-point emphasis → savviness → philosophy) via queryable attributes and relationships.
- Enabling traceability from every displacement and replacement in a scenario back to a tool, redundancy, or replacement record.

### 8.2 Out of scope for this PRD

- User accounts, authentication, or authorization.
- Storing individual recommendation requests or results (unless specified elsewhere).
- Storing feedback, ratings, or A/B test variants.
- Real-time pricing or availability of tools (only "typical" or static pricing tier is in scope).
- How tool profiles, redundancy, or replacements are initially built (e.g. manual curation vs automated analysis); only that they are stored and queryable is required.
- Technology, schema design, indexing, or deployment; this document describes what the database must support from a product and logic perspective only.

---

## 9. Summary

The database is the **pre-computed analysis layer** for the AI Workflow Clinic. It stores:

- **Tool profiles** – So the product can match, filter, and explain recommendations.
- **Redundancy** – So the product can suggest dropping overlapping tools and explain why.
- **Replacements** – So the product can suggest "drop X, use Y" or "replace X with Y" with a clear reason and conditions.
- **Bundles** – So the product can recommend full stacks and compare them to the current stack.
- **Phase–tool** – So the product can recommend a Starter pack by phase and savviness when there is no anchor.

The database does not implement the decision order or the scenario logic; it provides the entities and relationships so that the product can apply **compliance → anchor → budget → pain-point emphasis → savviness → philosophy** and generate three consistent, explainable, and traceable scenarios (Mono-Stack, Native Integrator, Agentic Lean) that match the project's logic and language guidelines.
