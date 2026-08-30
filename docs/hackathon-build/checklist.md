# Build Checklist

## Build Preferences

- **Build mode:** Autonomous
- **Comprehension checks:** N/A
- **Git:** Commit after the engine/contracts tranche, product UI tranche, and final submission tranche
- **Verification:** Automated after every item; no participant look-at-it pauses, per “run all the way through”
- **Check-in cadence:** Speed-run with concise commentary updates
- **Wow moment:** Resolve the final hidden responsibility, move from Blocked to Ready, and reveal the evidence-backed run-of-show

## Checklist

- [x] **1. Add the event-readiness domain model**
  Spec ref: `spec.md > Architecture > Layer 2: Pure planning and trust engine`
  What to build: Add `engine/readiness.js` with stable domains, responsibility assignment overlay, counts, deterministic score, and readiness state machine.
  Acceptance: Ready is impossible with blockers or required unowned responsibilities; unknown coverage is not treated as covered.
  Verify: `node --test engine/readiness.test.mjs` and `npm test`.

- [x] **2. Add the fundraiser and venue/provider contracts**
  Spec ref: `spec.md > Data Contracts`
  What to build: Add the canonical fundraiser brief, venue fixture, generalized capability adapter, and contract tests while preserving existing vendor contracts.
  Acceptance: Catering, venue, equipment, and staffing capabilities carry source metadata; unavailable and hostile inputs remain correctly handled.
  Verify: `node --test engine/event-contracts.test.mjs engine/tools.test.mjs` and `npm test`.

- [x] **3. Build the EventSession orchestrator and app tools**
  Spec ref: `spec.md > Architecture > Layer 3: Event application controller`
  What to build: Add `shared/eventready.js` to combine plan assembly, readiness, assignments, service changes, assumption confirmation, deltas, and run-of-show derivation; expose narrow tool definitions.
  Acceptance: UI and tool callers receive the same state; assignments and confirmations persist across recalculation; tools never transact.
  Verify: Unit/contract tests for assess, assign, change, confirm, reset, and run-of-show plus `npm test`.

- [x] **4. Rebuild the primary page around the product journey**
  Spec ref: `spec.md > Architecture > Layer 4: Product UI`
  What to build: Replace the technical hub at `/` with the EventReady brief → plan → readiness → resolve → run-of-show workspace using the canonical scenario.
  Acceptance: The product promise is clear immediately; one primary action runs the demo; readiness and next actions lead the layout rather than diagnostics.
  Verify: Start `npm run dev`; load `/`; run the sample; confirm no console/unhandled errors and all primary sections render.

- [x] **5. Add human resolution and delta interactions**
  Spec ref: `spec.md > Components And Responsibilities > Resolution controls`
  What to build: Add owner assignment, service-level change, assumption confirmation/correction, and concise changed-only feedback.
  Acceptance: At least one provider change and one owner assignment resolve demo blockers; confirmed choices persist; new problems surface.
  Verify: Exercise the canonical resolution path in the browser and run `npm test`.

- [x] **6. Add the run-of-show artifact and responsive polish**
  Spec ref: `spec.md > Components And Responsibilities > Run-of-show renderer`
  What to build: Render chronological time/action/owner/evidence rows, Draft/Ready labeling, remaining risks, copy/print actions, mobile layout, and print CSS.
  Acceptance: The final artifact is useful outside the demo, every row has an owner, and blockers prevent a Ready label.
  Verify: Browser-check draft and ready states, clipboard fallback, print preview CSS, and mobile viewport; run `npm test`.

- [x] **7. Register product-level WebMCP tools**
  Spec ref: `spec.md > Application-Level WebMCP Tools`
  What to build: Register the nine EventReady tools on `/`, backed by the same EventSession and visible rendering path.
  Acceptance: Tool contracts are descriptive and narrow; mutating calls update visible state; harness-compatible fallback remains functional.
  Verify: Extend contract tests, run tools through the harness/local registry, and run `npm test`.

- [x] **8. Create Judge Mode and preserve technical evidence**
  Spec ref: `spec.md > Architecture > Layer 5: Judge Mode`
  What to build: Add `/judge.html` with a two-minute path, tool inventory, source-gradient, security, repository, and direct verification links; update navigation while preserving legacy pages.
  Acceptance: A judge can verify discovery, tool execution, cross-source value, and injection defense without navigating the consumer workflow blindly.
  Verify: Check every Judge Mode link returns 200 and the existing smoke/harness/gradient pages still work.

- [x] **9. Rewrite product and repository documentation**
  Spec ref: `spec.md > Demo And Submission Flow`
  What to build: Rewrite README and page metadata for EventReady, document inherited baseline vs new work, provide quick-start/judge path, and ensure GitHub detects MIT license metadata.
  Acceptance: Claims match the running build; live/repo URLs are correct; setup and testing instructions are copy-pasteable; prior/new work is explicit.
  Verify: Fresh-read README against production, run repository/license checks, and `npm test`.

- [x] **10. Production verification and Devpost handoff**
  Spec ref: `prd.md > Submission Proof Points`
  What to build: Commit/push, deploy production, verify HTTP and WebMCP paths, capture screenshot candidates, draft the demo script and submission handoff materials.
  Acceptance: Production is accessible, repo is public/clean, all tests pass, and submission prep has accurate links and a complete story.
  Verify: `npm test`, Git status, Vercel READY status, HTTP 200 checks, production browser walkthrough, and review of handoff materials.
