# Build Checklist — Product Experience Rebuild

## Build Preferences

- **Build mode:** Autonomous
- **Comprehension checks:** N/A
- **Git:** Commit after foundation, core experience, and verified handoff tranches
- **Verification:** Automated after every item; visual checkpoints after items 3, 6, and 9
- **Check-in cadence:** Speed-run with concise commentary updates
- **Scope lock:** No framework migration, backend, authentication, real payments, or real-provider claims
- **Wow moment:** A natural-language brief becomes a visible plan; a reviewed WebMCP action closes the final responsibility and unlocks the evidence-backed run-of-show

## Checklist

- [x] **1. Lock the state and truth boundaries**
  Spec ref: `spec.md > Application State Model`
  What to build: Inventory every visible value, remove unexplained hard-coded state, introduce the new versioned application schema, and guarantee reset/UI/WebMCP parity before changing layout.
  Acceptance: Every visible event fact is calculated or labeled sample content; incompatible stored state cannot merge into the canonical event; reset clears UI and engine state together.
  Verify: Add state migration/parity tests, run `npm test`, reload/reset through the browser, and compare `get_event_brief` with visible values.

- [x] **2. Establish product tokens and the responsive shell**
  Spec ref: `spec.md > Responsive Layout Contract` and `Visual System`
  What to build: Consolidate tokens, typography, spacing, surfaces, phase navigation, primary canvas, contextual drawer behavior, and breakpoints before adding feature views.
  Acceptance: The shell follows the desktop/tablet/mobile contracts, has no persistent width-crushing rail, and has no horizontal page overflow.
  Verify: Browser screenshots at 1440px, 1024px, 768px, and 390px; keyboard/focus check; `npm test`.

- [x] **3. Rebuild the start experience around one job**
  Spec ref: `spec.md > Product Architecture > Experience state 1: Start`
  What to build: Create the outcome-led event brief entry, four starting cases, output preview, and secondary existing/sample event continuation paths.
  Acceptance: A first-time user can explain the product and start the wedding sample within 15 seconds; the page does not resemble marketing or an event-detail dashboard.
  Verify: Fresh-browser walkthrough, empty/invalid/custom/sample states, responsive screenshots, and no console errors.

- [x] **4. Build the guided Shape canvas**
  Spec ref: `spec.md > Product Architecture > Experience state 2: Shape`
  What to build: Implement five grouped decision steps, live structured-plan preview, provenance labels, inline correction, progress, and minimum-brief validation.
  Acceptance: The sample and a custom brief visibly update facts, assumptions, needed services, budget, and milestones; unrelated confirmations survive edits.
  Verify: Browser-test sample/custom descriptions, contradiction and missing-field cases, WebMCP brief parity, and `npm test`.

- [x] **5. Build the living event-plan workspace**
  Spec ref: `spec.md > Product Architecture > Experience state 3: Event command center`
  What to build: Replace noun-based top tabs with Shape/Source/Coordinate/Prepare/Run phases, connected completion conditions, first-incomplete routing, and next-decision emphasis.
  Acceptance: The workspace communicates current phase, completed work, blocked work, and the next useful action without requiring users to inspect every section.
  Verify: Exercise incomplete, partially committed, and ready snapshots; confirm phase derivation tests and responsive behavior.

- [x] **6. Productize Source and test commitment**
  Spec ref: `spec.md > Data Flow` steps 6–8 and `Data Contracts > TestBooking`
  What to build: Present requirements first, then ranked provider alternatives with coverage, burden, blockers, evidence, price, and an explicit review-to-test-commit path.
  Acceptance: A single capable provider is preferred; tradeoffs are understandable; a test commitment updates budget/ownership and states no contact or payment occurred.
  Verify: Compare all options, commit/remove/reload, test an uncovered requirement, run provider/ranking tests and `npm test`.

- [x] **7. Build Coordinate and dependency ownership**
  Spec ref: `spec.md > Product Architecture > Experience state 3: Event command center`
  What to build: Combine provider obligations, host/team assignments, budget commitments, and dependencies into operational groups with owners and due moments.
  Acceptance: Every unowned required job has a next action; assigning it changes readiness; provider/venue evidence remains visible without technical jargon.
  Verify: Assign individual/all eligible responsibilities, change the brief after assignment, validate invalidated ownership behavior, and run `npm test`.

- [x] **8. Build contextual proposal actions**
  Spec ref: `spec.md > Contextual action layer` and `Data Contracts > ChangeProposal`
  What to build: Replace generic assistant UI with contextual actions and a proposal sheet previewing cost, blockers, ownership, deltas, and risks before Apply.
  Acceptance: No mutating action silently applies; cancel is lossless; applied UI actions and equivalent WebMCP calls produce matching visible state.
  Verify: Test service-level, headcount, assumption, and ownership proposals through UI/WebMCP; stale-proposal case; `npm test`.

- [x] **9. Finish Prepare and Run as the payoff**
  Spec ref: `spec.md > Demo And Submission Flow`
  What to build: Create blocker closure, readiness evidence, final confirmations, compact run-of-show, Draft/Ready policy, copy/print, assumptions, and remaining risks.
  Acceptance: Ready is impossible with blockers/unowned work; the artifact is chronological, compact, externally useful, and every row has time/action/owner/evidence.
  Verify: Full Blocked → Ready flow, boundary-time ordering, copy fallback, print/mobile views, WebMCP `get_run_of_show`, and `npm test`.

- [x] **10. Reconcile developer proof and product story**
  Spec ref: `spec.md > Developer and judge surface`
  What to build: Update developer/Judge Mode navigation, tool-state demonstrations, source-gradient explanation, security proof, README, and product copy.
  Acceptance: Claims are accurate; inherited/new work is clear; a judge can verify nine tools and shared state in two minutes.
  Verify: Check every technical link, run harness/native discovery, compare README to app, and run `npm test`.

- [x] **11. Cross-criteria quality audit and Devpost handoff**
  Spec ref: `spec.md > Plan Assessment` and `prd.md > Submission Proof Points`
  What to build: Run functional, responsive, accessibility, state-truth, and criteria audits; capture final screenshots/demo sequence; assemble accurate handoff materials.
  Acceptance: No broken/deceptive simulation remains; the demo proves product value before technical detail; handoff covers all four judging criteria.
  Verify: `npm test`, `git diff --check`, clean browser logs, four viewport walkthroughs, native WebMCP chain, production verification when authorized, and final submission review.

- [x] **12. Clarify entry, help, and workspace transitions**
  What to build: Remove dead-end navigation, replace developer-first help with a consumer explanation, remove false account chrome, and add a meaningful Shape-to-workspace confirmation.
  Acceptance: Every header action has a distinct result; a first-time user can explain the four-stage workflow and prototype boundary.
  Verify: Browser-test home, Shape confirmation, Help, workspace, and create-another-event states; `npm test`.

- [x] **13. Add durable multi-event continuity**
  What to build: Store independent event briefs, commitments, service levels, assignments, readiness, and timestamps in a versioned on-device collection with a resumable home list.
  Acceptance: Creating another event does not overwrite an existing plan; reloading and resuming restores its operational state.
  Verify: Create two events, mutate each, reload, resume both, and compare readiness; `npm test`.

- [x] **14. Strengthen decision guidance and provider trust**
  What to build: Add one dominant next action per phase, clarify requirements/capabilities/availability, and expose honest provider-confirmation and payment handoffs.
  Acceptance: Users always know the next useful action and cannot confuse a test commitment with availability, booking, or payment.
  Verify: Walk Source through Run, copy both handoffs, inspect mobile, and confirm no transactional claim is false.

- [x] **15. Verify and redeploy the commercial-experience pass**
  What to build: Run full automated, responsive, persistence, browser, WebMCP, and production checks; update product documentation and deployment.
  Acceptance: The canonical flow and a custom saved event both work without errors; all nine tools remain discoverable.
  Verify: `npm test`, `git diff --check`, local and production browser walkthroughs, and clean console logs.

- [x] **16. Establish the Coordinated Confidence brand system**
  What to build: Apply the hospitality-led palette, editorial typography, event-specific accents, branded mark, and connecting-thread motif across Start, Shape, and the workspace.
  Acceptance: EventReady is visually recognizable without becoming wedding-specific or obscuring operational information.
  Verify: Desktop/mobile screenshots across wedding and work-event states, contrast/focus checks, and `npm test`.

- [x] **17. Give the core product moments a distinctive composition**
  What to build: Turn provider results into fit-based dossiers, Coordinate into ownership lanes, Prepare into preflight, and Run into a premium event artifact with human product language.
  Acceptance: The interface expresses EventReady’s value through layout and copy rather than generic cards and dashboard labels.
  Verify: Source → Coordinate → Prepare → Run browser walkthrough, print view inspection, and `npm test`.

- [x] **18. Verify and publish the branded experience**
  What to build: Run the complete functional, responsive, WebMCP, and visual audit; update documentation; publish and smoke-test production.
  Acceptance: Branding does not regress the canonical flow, saved events, accessibility, or nine tool contracts.
  Verify: `npm test`, `git diff --check`, clean local/production browser logs, and WebMCP discovery.

- [x] **19. Build a catalog-agnostic editable event basket**
  What to build: Replace fixed generated packages with item-level quantity, add, swap, remove, and restore controls backed by a normalized provider catalog and persisted basket state.
  Acceptance: Every edit recalculates price, guest and dietary coverage, provider capabilities, operational handoffs, and the exact committed configuration; custom baskets survive reload and service-level changes.
  Verify: Exercise mixed-provider customization and commitment at 390px, reload and reopen the exact basket, inspect coverage warnings and handoffs, run `npm test`, and confirm clean browser logs and no page overflow.

## Autonomous launch-quality tranche — 2026-08-31

- **Build mode:** Autonomous, straight through
- **Verification:** Automated after implementation; one bounded desktop/mobile inspection; production smoke after deployment
- **Scope lock:** Strengthen the existing demo and submission story without adding accounts, a backend, real transactions, or new event domains
- **Wow moment:** A person or agent changes the same visible event plan, the change leaves an inspectable receipt, and the final closed responsibility unlocks the run-of-show

- [x] **20. Add an inspectable shared-plan activity trail**
  Spec ref: `spec.md > Application State Model` and `spec.md > Developer and judge surface`
  What to build: Persist concise receipts for meaningful human and WebMCP mutations, including actor, channel, action, and time, and expose the recent trail in the workspace.
  Acceptance: A judge can tell whether a change came from the interface or a WebMCP tool; reload preserves the trail; no read-only call creates a false change receipt.
  Verify: Exercise one UI mutation and one WebMCP mutation, reload, inspect the trail, and add regression coverage for the receipt contract.

- [x] **21. Bring Judge Mode into the current EventReady product system**
  Spec ref: `spec.md > Developer and judge surface`
  What to build: Replace the stale technical-demo page with a concise current-brand verification route that leads with the product claim, fastest demo path, tool taxonomy, trust boundary, and evidence links.
  Acceptance: Judge Mode visually belongs to EventReady, accurately distinguishes eight product tools from the reset utility, and exposes the two-minute path without competing navigation.
  Verify: Check every link and claim against the implementation; inspect desktop and mobile layouts.

- [x] **22. Harden form, focus, and responsive behavior**
  Spec ref: `spec.md > Responsive Layout Contract` and `prd.md > Accessibility and error handling`
  What to build: Add missing autocomplete/input-mode semantics, validation relationships, dialog escape handling, safe-area spacing, and robust narrow-screen wrapping for high-risk controls.
  Acceptance: Core forms remain usable at 320–390px and keyboard-only; errors are programmatically associated; overlays do not trap scrolling or lose focus.
  Verify: Static accessibility assertions, keyboard walkthrough, 320px/390px/768px/1440px inspection, and no horizontal overflow.

- [x] **23. Tighten the WebMCP and submission narrative**
  Spec ref: `prd.md > Submission Proof Points` and `spec.md > Demo And Submission Flow`
  What to build: Align About, Judge Mode, README, submission copy, and demo script around the shared-plan receipt, eight outcome tools plus one demo utility, and the no-hidden-commitments boundary.
  Acceptance: The consumer value appears before implementation detail; every count and limitation is consistent; the recording script demonstrates the WebMCP differentiation on screen.
  Verify: Submission smoke assertions and a cross-file claim scan.

- [x] **24. Run the release audit and repair regressions**
  Spec ref: `spec.md > Plan Assessment`
  What to build: Run the Impeccable detector once, deterministic tests, smoke suite, syntax/diff checks, and bounded viewport verification; fix all release-blocking findings.
  Acceptance: No P0/P1 issue remains in the changed surfaces and the canonical flow remains coherent.
  Verify: `npm test`, `npm run smoke`, `git diff --check`, detector output, and screenshot comparison.

- [x] **25. Publish and verify production**
  Spec ref: `prd.md > Submission Proof Points`
  What to build: Deploy the verified tranche to the existing Vercel production project and rerun the submission smoke suite against the canonical URL.
  Acceptance: Production serves the unified About page, updated Judge Mode, activity receipts, and unchanged nine-tool registry.
  Verify: Production smoke suite with zero failures; record the remaining human-only submission dependency.

## Pre-build Assessment

### Sequencing quality

The order is correct: state truth and responsive shell are the highest-risk foundations, so they precede visual feature work. The core product loop is complete by item 9; developer proof and submission work cannot mask an incomplete consumer experience.

### Workload

Eleven items is appropriate if each remains a bounded product slice. Items 4, 5, 8, and 9 are the largest and must remain limited to their acceptance criteria rather than expand into infrastructure or new domains.

### Critical dependency path

`1 state boundaries → 2 shell → 3 start → 4 shape → 5 workspace → 6–9 phases → 10 proof → 11 handoff`

Source and Coordinate can share primitives but should not be built in parallel because test commitment changes ownership and budget state used by Coordinate.

### Stop conditions

- Simplify if Shape exceeds five grouped steps.
- Stop a framework migration before it starts.
- Defer any feature requiring credentials or real external side effects.
- Do not proceed to handoff while fixture data appears live.
- Do not deploy until localhost passes the complete criteria audit and Roy reviews the result.

### Completion gate

Roy approved implementation. The complete local product loop now passes automated and browser verification; production deployment remains intentionally deferred until local review.
