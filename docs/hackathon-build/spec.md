# Technical Spec

## Overview

EventReady will be implemented as a product layer over the existing dependency-free Catering WebMCP engine. The validated planning, assumptions, source-adapter, scheduling, trust, option-ranking, and WebMCP registration modules remain intact. New modules generalize their outputs into event domains, readiness states, responsibility assignments, and a shareable run-of-show.

The primary experience moves to `/`, with a brief-first workflow and a prefilled fundraiser demo. Existing diagnostic pages remain available through `/judge.html` and direct routes. The deployment stays static on Vercel; no account, server, database, secret, or paid API is required.

## Stack

- HTML5 pages and accessible native form controls.
- CSS through the existing committed Tailwind output plus component CSS.
- JavaScript ES modules in the browser.
- JSON provider fixtures representing fictional reference implementations.
- `document.modelContext.registerTool()` through the existing `shared/webmcp.js` compatibility layer.
- Node 24-compatible built-in test runner.
- Static Vercel hosting configured by `vercel.json`.

Why: the current stack has no runtime dependencies, deploys reliably, loads offline, and already passes 184 tests. Introducing a framework would spend the remaining time on plumbing rather than the judged product experience.

References:

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Secure WebMCP tools](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Vercel static deployments](https://vercel.com/docs/deployments)

## Architecture

### Layer 1: Provider sites and contracts

Fictional provider JSON is rendered by provider pages and exposed through WebMCP tools. The existing caterer, rental, and staffing fixtures remain. A venue fixture and generalized provider capability fields are added without allowing arbitrary provider text to influence ranking.

Implements: `prd.md > Epic 2: Evaluate provider capabilities`

### Layer 2: Pure planning and trust engine

Existing pure modules continue to parse the occasion, normalize quantities, create options, preserve confirmations, compute deltas, schedule jobs, and quarantine hostile data. A new readiness module maps findings and ownership rows into stable operational domains and states.

Implements: `prd.md > Epic 2`, `Epic 3`, `Epic 4`

### Layer 3: Event application controller

`shared/eventready.js` orchestrates the existing plan engine plus the new readiness module. It maintains one in-memory `EventSession`, handles explicit assignments/resolutions, and derives all display models. It exposes application-level WebMCP tools whose outputs match the visible UI state.

Implements: `prd.md > Epic 1`, `Epic 3`, `Epic 4`, `Epic 5`

### Layer 4: Product UI

`index.html` becomes the EventReady landing and workspace. It uses progressive sections: brief, provider plan, readiness, resolve, and run-of-show. Technical evidence is linked through Judge Mode rather than displayed throughout the default path.

Implements: all user-facing PRD epics.

### Layer 5: Judge Mode

`judge.html` provides a concise two-minute verification route and links the existing smoke, harness, gradient, vendor, legacy planner, tests, repository, and security evidence.

Implements: `prd.md > Epic 6: Explain and verify the WebMCP implementation`

## Data Contracts

### EventBrief

```js
{
  title: string,
  eventType: string,
  venueName: string,
  headcount: number,
  budget: number,
  serveAt: ISO8601,
  durationHours: number,
  dietary: { vegetarian?: number, vegan?: number, gluten_free?: number },
  venueHasKitchen: boolean,
  helpersAvailable: number,
  hostProvides: string[],
  provenance: Record<string, "given" | "parsed" | "assumed" | "confirmed">
}
```

### ProviderCapability

```js
{
  provider: string,
  domain: "food" | "venue" | "equipment" | "staffing",
  serviceLevel: string,
  available: boolean,
  provides: string[],
  requires: string[],
  constraints: Array<{ type: string, value: unknown, source: string }>,
  source: { tier: string, fetchedAt: string, confidence: number }
}
```

### ResponsibilityAssignment

```js
{
  id: string,
  resource: string,
  domain: string,
  provider?: string,
  owner: "provider" | "organizer" | "volunteer" | "unassigned",
  ownerLabel: string,
  status: "covered" | "assigned" | "unresolved",
  evidence: string
}
```

### ReadinessReport

```js
{
  state: "not_assessed" | "needs_decisions" | "blocked" | "ready",
  score: number,
  counts: { covered: number, total: number, blockers: number, risks: number, unowned: number },
  domains: Array<{ id: string, label: string, status: string, covered: number, total: number }>,
  blockers: Finding[],
  risks: Finding[],
  responsibilities: ResponsibilityAssignment[],
  updatedAt: string
}
```

### RunOfShow

```js
{
  status: "draft" | "ready",
  event: EventBrief,
  rows: Array<{ at: string, action: string, owner: string, evidence: string, status: string }>,
  assumptions: Assumption[],
  remainingRisks: Finding[],
  generatedAt: string
}
```

## File Structure

```text
index.html                         EventReady product experience and app-level WebMCP tools
judge.html                         Judge Mode and two-minute verification path
plan.html                          Preserved legacy catering planner, linked from Judge Mode
vendor.html                        Provider reference site and provider WebMCP tools
smoke.html                         Minimal native discovery/call verification
harness.html                       Manual runner for every registered tool
gradient.html                      T0–T4 source comparison

data/
  event/demo-fundraiser.json       Canonical end-to-end demo brief
  vendors/*.json                   Existing catering/rental/staffing fixtures
  venues/riverside-hall.json       Venue capability/obligation fixture

engine/
  engine.js                        Existing quantity, coverage, obligation, timing checks
  assumptions.js                   Existing provenance and confirmation behavior
  options.js                       Existing alternative generation/ranking
  replan.js                        Existing delta calculation
  schedule.js                      Existing local-time job schedule
  trust.js                         Existing allowlist and injection quarantine
  readiness.js                     NEW domain mapping, assignment overlay, readiness state
  readiness.test.mjs              NEW readiness and assignment tests
  event-contracts.test.mjs         NEW app/provider/run-of-show contract tests

shared/
  plan.js                          Existing catering composition and plan assembly
  eventready.js                    NEW EventSession orchestration and run-of-show derivation
  eventready-ui.js                 NEW product renderers and interactions
  vendor-tools.js                  Extended provider capability/requirements contracts
  webmcp.js                        Existing native/fallback registration bridge
  ui.js                            Shared escaping, formatting, and header behavior
  ui.css                           Product components and print styles

docs/hackathon-build/              Scope, PRD, spec, checklist, notes
README.md                          Product story, quick judge path, architecture, provenance
vercel.json                        Static hosting/cache headers
```

## Data Flow

1. `demo-fundraiser.json` or user form input enters `shared/eventready.js` as an `EventBrief`.
2. `parseOccasion` and the assumption engine normalize values and record provenance.
3. Provider fixtures are admitted through `engine/trust.js`; unknown fields and agent-directed text are removed/quarantined.
4. Existing composition logic creates and ranks food-service options.
5. Provider requirements plus venue/equipment/staffing capabilities become responsibility rows.
6. `engine/readiness.js` overlays explicit human assignments, groups coverage into domains, and derives blockers, risks, counts, score, and state.
7. `shared/eventready-ui.js` renders the same report returned by app-level WebMCP tools.
8. A user decision updates the in-memory `EventSession`, recalculates the plan, and produces a delta.
9. `buildRunOfShow()` merges the existing schedule with responsibility assignments, sorts in event-local time, and labels the output Draft or Ready.
10. Copy/print serializes the current derived artifact; no backend write occurs.

## Components And Responsibilities

### Event brief form

Implements: `prd.md > Epic 1: Create an event brief`

- Prefilled canonical scenario.
- Structured fields plus optional prose.
- Visible provenance and validation.
- One primary “Assess readiness” action.

### Provider plan

Implements: `prd.md > Epic 2: Evaluate provider capabilities`

- Recommended option and two alternatives.
- Simple-provider preference and split justification.
- Provider availability/exclusion evidence.
- Service-level changes.

### Readiness engine

Implements: `prd.md > Epic 3: Understand readiness`

- Stable domain classification.
- Deterministic score derived from coverage counts, never opaque AI scoring.
- Blocker/risk/unowned counts.
- State machine with Ready requiring zero blockers and zero unowned required responsibilities.

### Resolution controls

Implements: `prd.md > Epic 4: Resolve blockers with the human`

- Owner assignment for obligation rows.
- Service-level change.
- Assumption confirmation/correction.
- Delta output and preserved confirmations.

### Run-of-show renderer

Implements: `prd.md > Epic 5: Produce the ready-to-run artifact`

- Event-local chronological table.
- Time, action, owner, evidence/status columns.
- Draft/Ready label, remaining risks, and assumptions.
- Browser copy and print actions.

### Judge Mode

Implements: `prd.md > Epic 6: Explain and verify the WebMCP implementation`

- Two-minute test sequence.
- Direct links to native smoke, harness, gradient, legacy planner, repository, and live deployment.
- Tool inventory and security summary.
- Clear statement that provider businesses are fictional reference implementations.

## Application-Level WebMCP Tools

The primary page registers tools that operate on and visibly update the same `EventSession` as the human UI:

- `get_event_brief()` — returns the current structured brief and provenance.
- `assess_event_readiness({ ...brief fields })` — calculates options and readiness.
- `get_readiness_report()` — returns domains, blockers, risks, and responsibility counts.
- `select_event_plan({ option_id })` — human/agent selects a displayed option.
- `assign_responsibility({ responsibility_id, owner, owner_label })` — records an explicit assignment.
- `change_service_level({ provider, service_level })` — recalculates provider obligations.
- `confirm_event_assumption({ assumption_id, value })` — confirms/corrects a visible assumption.
- `get_run_of_show()` — returns the current Draft or Ready artifact.
- `reset_demo_event()` — restores the canonical scenario.

Mutating tools require explicit, narrow arguments and update visible page state. They never place orders, make payments, or claim a real-world booking.

## External APIs And Dependencies

- No runtime third-party API.
- No client secrets or environment variables.
- Vercel serves static files.
- GitHub hosts the public MIT-licensed source.
- Browser WebMCP is used when available; the local registry supports deterministic manual testing elsewhere.

## AI Usage

Codex and Claude Code are development tools, not runtime dependencies. At runtime the browser agent calls deterministic WebMCP tools; calculation, ranking, trust filtering, readiness, and scheduling remain inspectable code. This keeps the project’s WebMCP value clear: the model interprets intent and orchestrates tools while the application owns domain rules and visible state.

## Error Strategy

- **Provider fixture fails to load:** identify the provider as unavailable, continue with remaining providers, and keep critical coverage unknown/blocked.
- **Invalid brief:** show field-level guidance and do not replace the last valid assessment.
- **Native WebMCP absent:** product remains usable; Judge Mode directs users to the harness and explains the local registry.
- **Clipboard unavailable:** leave the artifact visible and offer print.
- **Unexpected exception:** show an accessible error panel with a reset action; retain the canonical demo path.

## Risks And Verification

### Risk: generalization breaks validated catering behavior

Mitigation: add readiness as an adapter over existing plan outputs instead of rewriting the core. Run all 184 baseline tests after every checklist item.

### Risk: UI claims readiness while required work is unresolved

Mitigation: centralize the state machine in a pure module; tests assert Ready is impossible with blockers or unowned responsibilities.

### Risk: product page and WebMCP tools diverge

Mitigation: both use the same `EventSession`; contract tests call tools and compare returned state with renderer inputs.

### Risk: demo remains technically dense

Mitigation: product-first page, one action per stage, plain-language outcomes, and technical evidence behind Judge Mode.

### Verification layers

1. `npm test` for pure engine, contracts, security, and static-asset guards.
2. Local HTTP server and browser smoke for product interaction, console errors, copy/print, responsive layout, and accessibility basics.
3. Harness for every registered tool.
4. ChatGPT in-app browser for native discovery and cross-tool chaining.
5. Production HTTP and visual checks after Vercel deployment.

## Demo And Submission Flow

### First 15 seconds

Open the fundraiser scenario and click “Assess readiness.” Show the result: food booked, event still Blocked because operational responsibilities are missing.

### Human-agent collaboration

Ask the agent to explain the blockers and recommend the simplest resolution. Change one provider service level and assign the remaining pickup to a volunteer. The visible UI and tool outputs update together.

### Wow moment

The final blocker clears, the readiness state changes to Ready, and the chronological run-of-show becomes available.

### Technical proof

Open Judge Mode briefly: show native tools, the source-gradient insight that requirements exist only at T0, and the hostile provider whose instructions were quarantined.

### Handoff

End on the shareable run-of-show and the claim: individual sites complete transactions; EventReady verifies the event outcome.

