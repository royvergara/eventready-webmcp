# Title

EventReady

## One-line Summary

EventReady is an AI-native workspace for planning, coordinating, and running an event end to end—with WebMCP continuously checking that the whole plan will work together.

## Problem

Community organizers, office managers, nonprofit staff, and other “accidental event operators” can book every vendor and still discover too late that nobody owns delivery access, setup, hot holding, refills, equipment, or cleanup. Today's process lives across vendor pages, email threads, spreadsheets, and mental checklists. Each provider knows its own commitment, but nobody can answer the cross-provider question: is the event actually ready?

## Solution

EventReady is the shared home for an event from first plan to final cleanup. It unifies the plan, guests, vendors, budget, team, responsibilities, and day-of schedule in a consumer workspace that a person and agent can edit together. Underneath, it composes provider and venue commitments into six readiness domains, exposes every job left to the organizer, and requires explicit ownership before labeling the event Ready. The final output is a chronological, evidence-backed run-of-show.

## Why This Matters

Event failure usually happens in the seams between otherwise valid purchases. EventReady makes those seams legible early enough to resolve them. Catering is the intentionally deep wedge because it combines dietary coverage, quantity, temperature, transport, setup, staffing, and cleanup; the same readiness model can extend to venues, rentals, AV, security, and other event providers. WebMCP makes this credible now because provider pages can expose both what they offer and what they require from the customer as structured, callable capabilities.

## How We Used AI

The product is designed for agent-human collaboration. An agent can read the brief, assess multiple provider contracts, retrieve the readiness report, select a plan, change a service level, confirm an assumption, and generate the run-of-show. The human retains the decisions that create commitments: selecting tradeoffs, confirming inferred values, and assigning responsibility. Tool calls update the same EventSession rendered on screen, so the user can see and verify every state change. Provider content remains untrusted data: injection-like instructions are quarantined, unknown fields do not influence ranking, and external text is escaped before rendering.

## How We Used Codex

Codex was used to audit the original catering prototype against the judging criteria, challenge the target audience and market story, narrow the product to event readiness, create the scope/PRD/spec/checklist, implement the new readiness domain and EventSession, write contract tests, rebuild the consumer experience, add Judge Mode, diagnose native WebMCP registration in a real browser, and deploy the independent Vercel project. Claude Code was used on the earlier catering technical baseline. The original repository remains separate; this repository documents inherited versus newly built work explicitly.

## Key Features

- Six-domain readiness score and deterministic Blocked / Needs decisions / Ready state.
- Explicit ownership for every provider-to-human operational seam.
- Multiple plan alternatives with concrete cost and coverage tradeoffs.
- Changed-only feedback when service level, plan, assumptions, or ownership changes.
- Draft/Ready run-of-show with time, action, owner, and evidence on every row.
- Nine narrow application-level WebMCP tools backed by the visible EventSession.
- Source-gradient proof across WebMCP, schema.org, price-table, document, and unpublished tiers.
- Injection quarantine, field allowlists, escaped provider output, and non-binding holds.
- Judge Mode and a browser-independent manual tool harness.

## Architecture

EventReady is a dependency-free static application. Pure planning and trust modules produce alternatives and findings. `engine/readiness.js` maps findings and responsibility contracts into readiness domains and state. `shared/eventready.js` owns the in-memory EventSession, deltas, human decisions, run-of-show, and nine tool contracts. `shared/eventready-ui.js` renders that same state and adapts each tool to native `document.modelContext.registerTool({ execute })`. A local registry provides an identical manual harness when native WebMCP is unavailable.

## Testing Instructions

1. Open https://eventready-webmcp.vercel.app/ in ChatGPT's in-app browser or WebMCP-enabled desktop Chrome.
2. Explore the active fundraiser across Overview, Plan, Guests, Vendors, Budget, Team, and Day-of.
3. In the EventReady assistant, click **Review my plan**.
4. Review and apply the proposed service and responsibility changes.
5. Confirm the event becomes **Ready** and the 17-row day-of plan has no unassigned owner.
6. Open `/developers.html` for the product's WebMCP explanation or `/judge.html` for the direct verification path.
7. Locally, run `npm test` for 196 deterministic tests and `npm run dev` for the static site.

Tested with the Codex/ChatGPT in-app browser's native WebMCP support. Production verification found all nine tools, completed the canonical flow, loaded Judge Mode, and produced no console errors.

## Public Demo Link

https://eventready-webmcp.vercel.app/

## Public Repository Link

https://github.com/royvergara/eventready-webmcp

## Demo Video

**TODO: record and add a public YouTube URL (required, under 3 minutes, with audio).**

Suggested 2:30 outline:

- 0:00–0:20 — “Booked is not ready”: introduce the accidental event operator and hidden seams.
- 0:20–0:50 — Show the fundraiser brief and initial assessment across six domains.
- 0:50–1:25 — Show blockers and unowned work; change Pickup to Delivery.
- 1:25–1:50 — Assign remaining jobs; reveal Ready and the run-of-show.
- 1:50–2:15 — Use the WebMCP tool inventory/harness and explain shared visible state.
- 2:15–2:30 — Show Judge Mode, security proof, repo, and close on broader event-readiness impact.

## Screenshot Shot List

1. Hero plus prefilled event brief and readiness card before assessment.
2. Assessed Blocked state with six domains and explicit unowned work.
3. Service/ownership resolution with changed-only feedback.
4. Ready state and the evidence-backed run-of-show.
5. Judge Mode or tool harness showing the nine EventReady tools.

## Submission Readiness Notes

- Live app: deployed and verified on production.
- Public repo: pushed with source, setup instructions, and MIT license.
- Tests: 196/196 passing.
- Native WebMCP: nine tools discovered in the in-app browser.
- Devpost account: authenticated and registered for The WebMCP Challenge.
- Remaining hard requirement: public narrated YouTube demo under three minutes.

## Known Limitations

- Providers and venue are fictional reference contracts; EventReady does not transact with real businesses.
- State is in memory and is not shared across devices or collaborators.
- The canonical experience is deepest in catering; adjacent AV, security, and venue workflows are a modeled expansion rather than fully populated providers.
- Native tool discovery depends on a WebMCP-capable browser; the manual harness is the fallback.

## TODO Official Form Fields

- **28249 Submitter Type:** confirm `Individual`.
- **28250 Country of residence:** confirm the exact country value; do not infer it.
- **28251 Organization name:** leave blank unless applicable.
- **28252 App Status:** `Existing` (the catering engine baseline predates the entry; EventReady product work is new during the submission period).
- **28253 Existing-project update:** use the disclosure in README and “How We Used Codex” above.
- **28254 Live URL:** https://eventready-webmcp.vercel.app/
- **28255 Testing instructions:** use the numbered instructions above; no credentials required.
- **28256 Public repo:** https://github.com/royvergara/eventready-webmcp
- **28257 Tested clients:** Codex/ChatGPT in-app browser with native WebMCP; manual fallback harness in a standard browser.
- **28258 AI tools used:** Codex for product definition, implementation, tests, browser verification, and deployment; Claude Code for the inherited catering baseline.
- **28259 Learning level:** confirm `Significant` or choose another official option.
- **28260 Career AI value:** confirm `Yes` or `No`.
- **Required demo video:** add public YouTube URL.
