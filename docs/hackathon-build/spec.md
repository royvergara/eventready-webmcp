# Technical Spec — Product Experience Rebuild

## Overview

EventReady will be rebuilt around an **event command center** rather than a conventional tabbed dashboard. The product journey is:

`Describe → Shape → Source → Coordinate → Prepare → Run`

The existing deterministic planning, trust, provider-ranking, readiness, responsibility, scheduling, and WebMCP layers remain the technical foundation. The rebuild changes the interaction model and presentation architecture so a visitor can see information being interpreted, understand why each decision matters, and reach a credible operational artifact without learning the software first.

This is a structural product pass, not a framework migration and not another CSS-only pass.

## Stack

- Semantic HTML5 and accessible native controls.
- Existing CSS token and component layers, reorganized around the new application shell.
- Browser-native JavaScript ES modules.
- Existing JSON event, venue, and fictional provider fixtures.
- Existing `EventSession`, deterministic engine, and nine application-level WebMCP tools.
- Versioned `localStorage` for anonymous prototype persistence.
- Node built-in test runner and static Vercel deployment.

Why: the engine already passes 196 tests and has no runtime dependency risk. Browserbase and Liftoff are interaction references, not reasons to introduce Next.js. A migration would not improve judging criteria within the remaining time.

References:

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Browserbase Next.js template](https://browserbase-nextjs-template.vercel.app/)
- [Liftoff guided demo](https://demo.useliftoff.com/demo)
- [Vercel Workflow Builder](https://vercel.com/templates/next.js/workflow-builder)

## Product Architecture

### Experience state 1: Start

Implements: `prd.md > Epic 1: Create an event brief`

The start screen has one dominant job: describe the event. It contains one concise outcome promise, one large event brief input, four recognizable starting cases, a concrete preview of the output, and existing/sample plans as secondary paths. It must not resemble a marketing landing page or a populated event-detail screen.

### Experience state 2: Shape

Implements: `prd.md > Epic 1`, `Epic 3`

After the initial description, a split-screen planning canvas makes interpretation visible.

**Decision pane (40–44%):** one grouped question at a time:

1. Occasion and intent.
2. Date, time, venue, and infrastructure.
3. Guests and accessibility/dietary requirements.
4. Budget and service priorities.
5. What is already booked or owned.

**Live-plan pane (56–60%):** continuously shows the structured event identity, known facts, assumptions, required service domains, budget envelope, and milestone path.

Every inferred or assumed value is editable and labeled. “Build my plan” is enabled once the minimum viable brief is valid. The sample event can complete this flow without external services.

### Experience state 3: Event command center

Implements: `prd.md > Epic 2`, `Epic 3`, `Epic 4`, `Epic 5`

The workspace is organized by outcomes:

1. **Shape** — brief, assumptions, constraints, and priorities.
2. **Source** — needed services, ranked provider options, tradeoffs, and test commitments.
3. **Coordinate** — people, provider obligations, owners, money, and dependencies.
4. **Prepare** — blocker closure, readiness evidence, and final confirmations.
5. **Run** — chronological operating plan and sharing actions.

The default workspace view is the living event plan. It shows phases as a connected sequence with completion conditions. The next unresolved decision receives visual priority; summary metrics are supporting evidence.

### Contextual action layer

Implements: `prd.md > Epic 4: Resolve blockers with the human`

AI/WebMCP capability appears where a decision is being made, never as an empty chat rail. Examples include finding options that cover dietary needs, showing the impact of 150 guests, changing service level, assigning responsibilities, reducing cost, and preparing the run sheet.

Mutating actions open a proposal sheet with the requested change, affected requirements, cost/readiness delta, new risks, and explicit Apply and Cancel actions.

### Developer and judge surface

Implements: `prd.md > Epic 6: Explain and verify the WebMCP implementation`

Consumer screens contain only a restrained technical link. `/developers.html` and Judge Mode remain separate and show tool contracts, live state, provenance, source-gradient behavior, trust defenses, harness links, and the two-minute verification path.

## Responsive Layout Contract

### Wide desktop — 1280px and above

- Maximum application width: 1440px.
- Persistent 216–232px phase rail.
- Fluid primary canvas with a 680px minimum useful content measure.
- Optional 288–320px contextual inspector only when an active proposal or selected object requires it.
- The inspector never permanently narrows every view.

### Standard desktop/tablet — 768px to 1279px

- Phase rail becomes a horizontal progress stepper.
- One primary content column.
- Contextual inspector becomes a drawer or inline expansion.
- Comparison tables may scroll only inside their own container.

### Mobile — below 768px

- Single column with no page-level horizontal overflow.
- Compact phase stepper showing current phase and completion count.
- Sticky bottom primary action only when a clear next action exists.
- Provider comparisons become stacked cards with the same data hierarchy.

## Visual System

- Neutral ink, white, and cool-gray shell.
- One event-specific accent from a restrained accessible palette.
- Editorial event identity in the header; operational density in the workspace.
- Sans-serif interface typography with a clear four-level hierarchy.
- 8px spacing system and three radii: control, surface, overlay.
- Prefer dividers, aligned columns, and grouped rows before adding cards.
- Icons indicate categories or actions, never decoration.
- Every major view defines loading, empty, blocked, proposed, committed, and completed states.

## Application State Model

```js
{
  route: "start" | "shape" | "workspace",
  activePhase: "shape" | "source" | "coordinate" | "prepare" | "run",
  activeStep: number,
  brief: EventBrief,
  selectedOptionId: string | null,
  booking: TestBooking | null,
  assignments: Record<string, ResponsibilityAssignment>,
  proposal: ChangeProposal | null,
  readiness: ReadinessReport,
  runOfShow: RunOfShow
}
```

`EventSession` remains the source of derived planning truth. A new UI controller owns route, phase, selection, and proposal state. UI state never duplicates calculated readiness or provider outputs.

Persistence uses a new versioned key. On schema mismatch the app loads the canonical sample instead of merging incompatible state. Reset clears current UI and engine state together.

## Data Contracts

Existing `EventBrief`, `ProviderCapability`, `ResponsibilityAssignment`, `ReadinessReport`, and `RunOfShow` contracts remain.

### ChangeProposal

```js
{
  id: string,
  label: string,
  action: { tool: string, input: object },
  before: { cost: number, blockers: number, unowned: number },
  after: { cost: number, blockers: number, unowned: number },
  deltaLines: string[],
  newRisks: Finding[],
  requiresConfirmation: true
}
```

### TestBooking

```js
{
  optionId: string,
  eventId: string,
  providerLabels: string[],
  subtotal: number,
  status: "test_committed",
  createdAt: ISO8601
}
```

The UI always states that fictional providers are not contacted and no payment is taken.

## File Structure

```text
index.html                         Application entry and accessible shell
developers.html                    Technical/WebMCP reference surface

shared/
  eventready.js                    Existing engine-facing EventSession
  eventready-ui.js                 Thin bootstrap and event wiring
  product/
    state.js                       Route, phase, selection, and proposal UI state
    start-view.js                  Brief-first start experience
    shape-view.js                  Guided questions and live-plan preview
    workspace-view.js              Command-center phase shell
    plan-view.js                   Connected event-plan phases and next decisions
    source-view.js                 Provider comparison and test commitment
    coordinate-view.js             Ownership, dependencies, and budget
    prepare-view.js                Readiness evidence and resolution proposals
    run-view.js                    Operational run-of-show
    proposal-sheet.js              Review/apply/cancel action proposals
    format.js                      Shared display formatting and safe rendering
  product.css                      Shell, layout, responsive, and state styling
  tokens.css                       Consolidated product tokens

engine/                            Existing deterministic engine and tests
data/                              Existing event, venue, and provider fixtures
docs/hackathon-build/              Product planning and handoff documentation
```

Modules may be consolidated if a file would contain less than one coherent component; responsibility boundaries remain explicit.

## Data Flow

1. A description enters `start-view.js`.
2. `EventSession` parses it into a structured brief with provenance.
3. `shape-view.js` renders questions from missing or assumed fields and a live snapshot.
4. Each edit updates the session and refreshes only affected preview sections.
5. “Build my plan” runs assessment and enters the first incomplete phase.
6. The plan view derives phase status from requirements, provider selection, ownership, and readiness.
7. Source renders ranked engine options; selecting one creates a reviewable local test commitment.
8. Coordinate and Prepare construct `ChangeProposal` previews before mutation.
9. Applying a proposal invokes the corresponding narrow EventSession/WebMCP action and rerenders the same state returned to agents.
10. Run becomes Ready only when deterministic readiness allows it.
11. Copy/print serializes the current run-of-show; developer surfaces expose parallel WebMCP evidence.

## WebMCP Mapping

- Start/Shape: `get_event_brief`, `assess_event_readiness`, `confirm_event_assumption`.
- Source: `select_event_plan`, `change_service_level`.
- Coordinate: `assign_responsibility`.
- Prepare: `get_readiness_report` plus applicable mutating tools.
- Run: `get_run_of_show`.
- Recovery: `reset_demo_event`.

The consumer UI and tool callers continue to use one session. Tool results update the visible active phase and persist compatible state.

## Error Strategy

- Invalid brief: preserve entered text, identify the exact issue, and keep Build disabled.
- Provider unavailable: render the service Unknown/Blocked and continue with other providers.
- No viable option: explain the uncovered requirement and offer a plan or ownership change.
- Stale proposal: invalidate and recalculate before Apply.
- Version mismatch: load the canonical sample and show a nonblocking notice.
- Native WebMCP absent: preserve the full human UI and link to the harness.
- Copy failure: show selectable text and retain print.
- Rendering error: show a contained recovery panel and retain the last valid snapshot.

## Verification Strategy

1. Preserve the 196-test baseline.
2. Add tests for migrations, phase completion, proposal deltas, and UI/engine synchronization.
3. Browser-test custom brief → Shape → Build → Source → Commit → Coordinate → Prepare → Run.
4. Run equivalent mutations through WebMCP and verify visible state parity.
5. Validate 1440px, 1024px, 768px, and 390px layouts with no page overflow.
6. Check keyboard order, focus visibility, landmarks, labels, status text, and reduced motion.
7. Verify every visible number/status is calculated or explicitly labeled sample content.

## Demo And Submission Flow

### First 15 seconds

The judge starts “Alex & Jordan’s Wedding.” The split canvas visibly turns the description into requirements, assumptions, services, and milestones.

### Product proof

The judge sees the first incomplete phase, compares provider options, and understands operational burden—not just price.

### WebMCP wow moment

An agent changes service level and assigns a responsibility through narrow tools. The proposal shows cost/readiness impact; after approval, the plan moves from Needs decisions to Ready.

### Useful outcome

Run produces a compact chronological plan with time, action, owner, provider evidence, assumptions, and remaining risks.

### Technical proof

The developer surface demonstrates nine tools, source gradient, shared UI/tool state, deterministic ranking, and hostile-provider quarantine.

## Plan Assessment

### What this plan fixes

- Replaces the generic dashboard with an event-specific journey.
- Makes processing visible during Shape instead of showing unexplained populated state.
- Gives WebMCP a product role through contextual proposals and state changes.
- Prevents arbitrary column widths and permanent side-rail compression.
- Preserves the strongest technical work and 196-test baseline.

### Scope controls

- No Next.js migration.
- No authentication, database, real marketplace, messaging, or Stripe.
- No attempt to support every event domain.
- No decorative AI chat.
- No claim that a test commitment is a real booking.

### Principal risks

1. **Shape could become a long form.** Limit it to five grouped decisions and keep the live plan visible.
2. **The command center could relapse into tabs.** Phase status and next decision remain the navigation model.
3. **Visual polish could consume the build.** Establish the shell and tokens once, then reuse primitives.
4. **Sample data could undermine credibility.** Label fixtures and demonstrate live recalculation through UI and WebMCP.
5. **The rebuild could damage proven behavior.** Treat the engine as immutable except for a surfaced contract bug.

### Go/no-go verdict

**Go, with the scope controls above.** This is a credible product rebuild because it changes presentation and UI orchestration while retaining the tested engine. It should materially improve Execution and Potential Impact without weakening WebMCP Leverage. Adding real accounts, payments, or providers now would change the verdict to no-go because infrastructure would displace the judged experience.
