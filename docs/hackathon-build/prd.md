# Product Requirements Document

## Product Summary

EventReady helps a non-professional event owner determine whether an event is operationally ready. It gathers the event brief, evaluates structured capabilities and obligations exposed by provider websites through WebMCP, shows what is covered and missing, lets the human resolve or assign outstanding work, and produces a chronological run-of-show.

The product is not a marketplace or autonomous booking agent. It is the verification and responsibility layer between individual bookings and a successful event.

## Target User

### Primary persona: accidental event operator

A person accountable for a workplace, community, school, nonprofit, or milestone event who does not plan events professionally. They may be an office manager, executive assistant, operations coordinator, volunteer organizer, venue manager, or host.

They are comfortable buying services online but lack a reliable way to know whether the services form a complete plan. Their success criterion is not “orders placed”; it is “the event can run without a preventable surprise.”

### Qualifying event

- Approximately 30–150 guests.
- A fixed date, start time, venue, and budget.
- At least three meaningful constraints across guest needs, infrastructure, timing, transport, equipment, staffing, setup, service, or cleanup.
- No professional event planner owning the complete outcome.

### Below the threshold

- A simple meal where one delivery and no setup is sufficient.
- A large professionally managed production with an established vendor-management system.
- An event requiring domains outside the implemented scope, such as ticketing or travel.

## Experience Principles

- **Outcome first:** lead with readiness and next decisions, not tool diagnostics.
- **Evidence over confidence theater:** distinguish confirmed, provider-reported, inferred, and assumed information.
- **Human-controlled resolution:** never silently dismiss a blocker or overwrite a confirmed choice.
- **Simplest viable plan:** do not introduce additional providers unless they resolve a real requirement.
- **Progressive disclosure:** keep WebMCP internals available in Judge Mode without making ordinary users interpret them.
- **No dead end:** every unresolved item must have at least one clear next action.

## Core User Journey

1. The user lands on a concise EventReady introduction and sees a prefilled example they can run immediately.
2. The user supplies or edits an event brief: occasion, date, start/end time, location context, headcount, budget, dietary/accessibility needs, venue infrastructure, available helpers, and constraints.
3. EventReady displays the structured interpretation, visibly identifying assumptions.
4. The agent evaluates catering, venue, and rental/staffing providers through WebMCP tools and produces a recommended plan plus meaningful alternatives.
5. The readiness workspace displays overall status, coverage by domain, blockers, risks, and unowned responsibilities.
6. The user selects a plan and resolves at least one blocker by upgrading a service level, confirming a value, or assigning an owner.
7. The product recalculates and explains only what changed.
8. When no blocking item remains, EventReady marks the plan ready and produces a chronological run-of-show.
9. The user can copy or print the final artifact.
10. A judge can open Judge Mode to inspect registered tools, source evidence, trust protections, test instructions, and the source-gradient demonstration.

## Epics And User Stories

### Epic 1: Create an event brief

- As an event owner, I want to describe my event naturally so that I can begin without learning a planning system.
- As a careful organizer, I want to inspect and edit the structured brief so that the plan is based on correct facts.
- As a first-time visitor, I want a runnable sample so that I understand the product within seconds.

Acceptance criteria:

- The landing experience communicates the outcome in one headline and one short explanation.
- The default fundraiser scenario can be launched with one primary action.
- The brief captures event type, guest count, budget, date, service time, duration, dietary counts, kitchen/infrastructure status, and helper capacity.
- Every brief value is labeled as supplied, parsed, assumed, provider-reported, or user-confirmed.
- Invalid or contradictory values display a specific correction prompt and do not crash planning.
- Editing a confirmed value causes dependent plan outputs to recalculate while preserving unrelated confirmations.

### Epic 2: Evaluate provider capabilities

- As an event owner, I want EventReady to understand what each provider includes and requires so that I do not have to reconcile every package manually.
- As a user, I want the simplest viable provider combination so that the agent does not create unnecessary coordination.
- As a judge, I want to see that provider information came through working WebMCP contracts.

Acceptance criteria:

- The application evaluates at least one provider in each implemented domain: catering, venue, and rental/staffing.
- Each provider exposes structured availability/capability and requirements/obligations behavior through WebMCP.
- Provider outputs carry source, timestamp, and confidence/provenance metadata.
- An unavailable provider is excluded and named with the reason.
- A single capable provider is preferred over a multi-provider combination when coverage and constraints are otherwise equivalent.
- Every additional provider in a recommended plan has an explicit justification.
- Hostile or agent-directed provider text is quarantined and cannot change ranking or recommendations.

### Epic 3: Understand readiness

- As an event owner, I want one view of what is ready, risky, blocked, and unowned so that I know where to focus.
- As an organizer, I want coverage grouped by operational domain so that missing work is easier to understand than a flat warning list.

Acceptance criteria:

- The workspace shows an overall readiness status using plain language: Not assessed, Needs decisions, Blocked, or Ready.
- A numeric or proportional readiness indicator is accompanied by the underlying counts; color is not the only signal.
- Coverage is grouped into at least food/guest needs, venue/infrastructure, equipment, people/ownership, and timing.
- Every blocker names the unmet requirement, why it matters, its evidence, and at least one next action.
- Risks are visually distinct from blockers and do not prevent a Ready state unless policy says they are blocking.
- Unowned responsibilities are counted and listed with the relevant provider or event domain.
- Unknown information remains unknown; the system does not silently invent coverage.

### Epic 4: Resolve blockers with the human

- As an event owner, I want to compare resolution options so that I can choose based on budget and effort.
- As a user, I want to assign work to myself or another role so that every responsibility has an owner.
- As an organizer, I want to see exactly what changed after a decision so that I trust the recalculation.

Acceptance criteria:

- At least one demo blocker can be resolved by changing a provider or service level.
- At least one demo blocker can be resolved by assigning an owner.
- At least one assumption can be explicitly confirmed or corrected.
- Findings never mark themselves resolved without a traceable user action or provider change.
- Recalculation returns a concise delta: resolved, newly introduced, worsened, improved, cost change, and unchanged checks.
- User-confirmed values survive subsequent recalculations.
- A resolution that creates a new timing, budget, or coverage problem surfaces that new problem immediately.

### Epic 5: Produce the ready-to-run artifact

- As an event owner, I want a chronological run-of-show so that the plan can guide the actual day.
- As a coordinator, I want every line to include an owner and source so that there are no ambiguous handoffs.
- As a user, I want to copy or print the plan so that I can share it outside EventReady.

Acceptance criteria:

- The run-of-show is ordered in event-local time and handles tasks that fall on the prior day or after midnight.
- Every row includes time, responsibility/action, owner, and evidence/status.
- Provider deliveries and per-provider pickups remain distinct.
- Setup, holding/service, replenishment where applicable, and cleanup appear when required.
- The artifact includes the event summary, readiness status, unresolved risks, assumptions, and last-calculated time.
- Copy and print actions work without an account or backend.
- If blockers remain, the artifact is labeled Draft and does not claim the event is Ready.

### Epic 6: Explain and verify the WebMCP implementation

- As a judge, I want a clear testing path so that I can verify the WebMCP implementation quickly.
- As a technical reviewer, I want to inspect the tool contracts and source trust boundary without cluttering the consumer flow.

Acceptance criteria:

- Judge Mode is reachable from every primary product page but is visually secondary.
- Judge Mode names every page that registers WebMCP tools and provides direct links.
- The smoke test exposes a minimal discoverable tool and on-page call log.
- The harness can run all registered tools without requiring native WebMCP support.
- The source-gradient page demonstrates what structured WebMCP provides that markup, tables, documents, and unpublished information cannot.
- Security evidence shows field allowlisting, injection quarantine, escaping, and deterministic ranking.
- The README provides a two-minute judge path and clearly distinguishes the inherited catering baseline from EventReady work.

## Edge Cases

### Incomplete brief

The product should identify missing required fields and provide defaults only when they are safe, visible, and editable. Planning may proceed with assumptions, but readiness cannot be Ready when a critical unknown remains.

### One provider covers everything

EventReady should recommend the one-provider plan and still verify venue compatibility, ownership, and timing. It must not fabricate a reason to add providers.

### No provider covers a requirement

The gap remains blocked. The product offers assignment, inquiry, or plan-change actions; it does not claim marketplace inventory it cannot access.

### Provider unavailable or contradictory

Unavailable providers are excluded with evidence. Contradictions between a user-confirmed value and new provider output are surfaced for human resolution rather than silently overwritten.

### Provider output contains instructions to the agent

The instruction is quarantined, legitimate structured fields remain usable, and the product records what was ignored.

### User changes the brief after resolving work

Confirmed values and explicit owners persist when still relevant. Invalidated assignments or decisions return to unresolved with a concise explanation.

### Very small or very large event

The product can calculate a result but should state when the event appears below or above the intended service range. It does not imply professional safety or regulatory advice.

### Print/copy failure

The run-of-show remains readable on screen and offers clear retry guidance. No final plan depends on server-side persistence.

## What We Are Building

- Anonymous, single-session EventReady experience.
- One high-quality fundraiser demo plus editable inputs.
- Catering, venue, and rentals/staffing provider capabilities.
- Readiness coverage, findings, responsibility resolution, and run-of-show.
- Judge Mode and preserved technical verification surfaces.
- Responsive desktop and mobile layouts.

## What We Would Add With More Time

- Saved events, authentication, collaboration, and role invitations.
- Real provider integrations and inquiry/booking handoffs.
- Calendar export and notifications.
- Accessibility logistics, permits, insurance, beverage service, and safety templates as deeper domains.
- Multiple event templates and recurring workplace programs.
- Vendor-side tooling that helps businesses publish WebMCP obligations.
- Evaluation datasets covering a broad range of event types and provider combinations.

## Submission Proof Points

- **WebMCP Leverage:** non-trivial cross-page capability composition, operational requirement tools, provenance, source degradation, real tool discovery, and injection defense.
- **Execution:** a clear first-run path that ends in a usable run-of-show rather than diagnostics.
- **Potential Impact:** a defined audience between simple ordering and professional event management, with a recognizable responsibility gap.
- **Creativity & Ambition:** machine-readable provider obligations and cross-site readiness verification establish a new role for WebMCP beyond search and cart actions.
- **Wow moment:** the user resolves the final hidden responsibility and watches the plan move from Blocked to Ready, producing a chronological artifact backed by provider evidence.

