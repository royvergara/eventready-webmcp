# EventReady

**[eventready-webmcp.vercel.app](https://eventready-webmcp.vercel.app/)** — an AI-native event workspace for planning, coordinating, and running an event end to end.

EventReady brings the plan, guests, vendors, budget, team, responsibilities, and day-of schedule into one shared workspace. Its readiness layer answers the question ordinary planning checklists miss: **will everything actually work together?**

The product uses a “Coordinated Confidence” brand system: editorial event identity, operationally precise planning surfaces, event-specific accents, and a connecting event-thread motif from brief through run-of-show.

Anonymous events are saved independently on the current device and can be resumed from the application home. Production accounts and cross-device collaboration are intentionally not represented as implemented.

## Two-minute demo

1. Open [EventReady](https://eventready-webmcp.vercel.app/) and choose the 120-person wedding sample.
2. Compare service plans in Source and review the recommended test commitment.
3. Apply the commitment, assign the remaining work in Coordinate, and resolve the delivery blocker in Prepare.
4. The same event moves from Needs attention to Ready and produces a shareable run-of-show in Run.

The sample workspace also includes a tested agent prompt and two stress tests. Increasing attendance or tightening the budget recalculates the plan and records the resulting cost, coverage, and readiness effects in Decision history.

[Developer details](https://eventready-webmcp.vercel.app/developers.html) explains WebMCP separately from the consumer product. [Judge Mode](https://eventready-webmcp.vercel.app/judge.html) provides the fast verification path.

## Why WebMCP

No single vendor can determine whether a multi-party event is ready. EventReady uses structured capabilities and requirements from each participating page, then coordinates them in a human-controlled application layer. The browser exposes eight narrow outcome tools plus one demo-reset utility:

- `get_event_brief`, `assess_event_readiness`, `get_readiness_report`
- `select_event_plan`, `change_service_level`, `assign_responsibility`
- `confirm_event_assumption`, `get_run_of_show`, `reset_demo_event`

Mutating tool calls update the same `EventSession` the visible interface renders. Structured decision receipts show before/after cost, coverage, ownership, and readiness effects. Tools advise and recalculate; they do not transact or silently accept responsibility.

The supporting source-gradient demo proves the implementation can distinguish WebMCP tools from schema.org, a price table, a document transcript, and no published data. Provider text crosses a strict trust boundary: fixed fields only, injection-like instructions quarantined, output escaped, and ranking unaffected.

## What is real

- The planning, readiness state machine, ownership overlay, deltas, tools, trust boundary, and run-of-show are working code.
- The eight providers and Cedar House are fictional reference contracts, not real businesses.
- No payments, bookings, messages, or holds are placed.
- Provider confirmation and payment are explicit handoffs: the app can copy the required request/checklist but never marks an external action complete.
- Recommendations expose their coverage, coordination burden, price tradeoff, and evidence source; planners can copy a current operating brief or run-of-show.
- Every asset is local to the deployment; no framework or third-party runtime is required.

## Verify locally

```bash
npm test      # deterministic tests
npm run smoke # product, WebMCP, production, and submission-readiness checks
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
data/event + data/venues   canonical wedding and venue contracts
data/vendors               eight provider reference contracts
harness / gradient / smoke technical WebMCP evidence
engine/*.test.mjs          209 tests
```

## What changed for this entry

This repository started from the author's earlier `catering-webmcp` technical baseline: vendor fixtures, source-gradient adapters, pure catering checks, a planner, harness, and trust-boundary tests. EventReady adds the broader product thesis and all submission-specific work: event/venue contracts, six-domain readiness model, explicit responsibility ownership, `EventSession`, eight outcome tools plus one demo utility, consumer workflow, shared-plan activity receipts, service deltas, Ready/Draft run-of-show, Judge Mode, new tests, documentation, and independent deployment. The original repository remains unchanged.

## License

MIT — see [LICENSE](LICENSE).
