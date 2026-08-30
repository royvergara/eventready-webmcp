# EventReady

**[eventready-webmcp.vercel.app](https://eventready-webmcp.vercel.app/)** — an AI-native event workspace for planning, coordinating, and running an event end to end.

EventReady brings the plan, guests, vendors, budget, team, responsibilities, and day-of schedule into one shared workspace. Its readiness layer answers the question ordinary planning checklists miss: **will everything actually work together?**

## Two-minute demo

1. Open [EventReady](https://eventready-webmcp.vercel.app/) inside the active 75-person fundraiser.
2. Explore the end-to-end Plan, Guests, Vendors, Budget, Team, and Day-of workspace.
3. Ask the embedded EventReady assistant to review its plan, then inspect the proposed provider and ownership changes.
4. Apply the changes. The shared event moves from Needs attention to Ready and produces a shareable run-of-show.

[Developer details](https://eventready-webmcp.vercel.app/developers.html) explains WebMCP separately from the consumer product. [Judge Mode](https://eventready-webmcp.vercel.app/judge.html) provides the fast verification path.

## Why WebMCP

No single vendor can determine whether a multi-party event is ready. EventReady uses structured capabilities and requirements from each participating page, then coordinates them in a human-controlled application layer. The browser exposes nine narrow product tools:

- `get_event_brief`, `assess_event_readiness`, `get_readiness_report`
- `select_event_plan`, `change_service_level`, `assign_responsibility`
- `confirm_event_assumption`, `get_run_of_show`, `reset_demo_event`

Mutating tool calls update the same `EventSession` the visible interface renders. Tools advise and recalculate; they do not transact or silently accept responsibility.

The supporting source-gradient demo proves the implementation can distinguish WebMCP tools from schema.org, a price table, a document transcript, and no published data. Provider text crosses a strict trust boundary: fixed fields only, injection-like instructions quarantined, output escaped, and ranking unaffected.

## What is real

- The planning, readiness state machine, ownership overlay, deltas, tools, trust boundary, and run-of-show are working code.
- The seven providers and Riverside Hall are fictional reference contracts, not real businesses.
- No payments, bookings, messages, or holds are placed.
- Every asset is local to the deployment; no framework or third-party runtime is required.

## Verify locally

```bash
npm test      # 196 deterministic tests
npm run dev   # http://localhost:8080
```

The manual [tool harness](https://eventready-webmcp.vercel.app/harness.html) works in an ordinary browser using the identical page-owned tool registry. Real discovery requires a WebMCP-enabled browser such as the ChatGPT in-app browser or supported desktop Chrome testing configuration.

## Architecture

```text
index.html                 consumer readiness workspace; registers 9 tools
judge.html                 two-minute verification path
shared/eventready.js       EventSession, application tools, run-of-show
engine/readiness.js        readiness domains, ownership, deterministic state
shared/plan.js             composition, checks, alternatives, replanning
engine/trust.js            provider data allowlist and injection quarantine
data/event + data/venues   canonical fundraiser and venue contracts
data/vendors               seven provider reference contracts
harness / gradient / smoke technical WebMCP evidence
engine/*.test.mjs          196 tests
```

## What changed for this entry

This repository started from the author's earlier `catering-webmcp` technical baseline: vendor fixtures, source-gradient adapters, pure catering checks, a planner, harness, and trust-boundary tests. EventReady adds the broader product thesis and all submission-specific work: event/venue contracts, six-domain readiness model, explicit responsibility ownership, `EventSession`, nine application-level tools, consumer workflow, service deltas, Ready/Draft run-of-show, Judge Mode, new tests, documentation, and independent deployment. The original repository remains unchanged.

## License

MIT — see [LICENSE](LICENSE).
