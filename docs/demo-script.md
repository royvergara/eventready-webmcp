# EventReady recording runbook

Target: **2:35–2:45**, one continuous take, public or unlisted YouTube, narration on.

The shortest credible story is: describe the event → compare a complete plan → let an agent coordinate it → verify it is ready → show the technical proof.

## Set up before recording

1. Use the ChatGPT in-app browser at `https://eventready-webmcp.vercel.app/` so the WebMCP tools are available.
2. Set the browser to about 1440 × 900 and zoom to 100%. Close unrelated tabs and notification banners.
3. Start from the EventReady home page. If a saved event appears, that is fine; do not open it.
4. In ChatGPT, keep this prompt copied and ready:

   > Reset the EventReady demo. Select the recommended event plan, change it to staffed service, assign every unresolved responsibility to Roy as organizer, then give me the readiness report and run-of-show. Briefly summarize what changed after each action.

5. Keep these backup links ready in separate tabs:
   - `https://eventready-webmcp.vercel.app/judge.html`
   - `https://eventready-webmcp.vercel.app/developers.html`
6. Do one silent rehearsal. After the agent finishes, record the five demo confirmations in Prepare. Confirm the final workspace says **Ready to run**, Source is complete, and Shared plan activity contains agent receipts.

## Timed walkthrough and narration

### 0:00–0:18 — Establish the customer problem

**On screen:** EventReady home and hero. Keep the event description card visible.

**Say:**

“An event can have every vendor booked and still fail in the handoffs—delivery, setup, equipment, dietary coverage, payment, and who owns what. EventReady turns those disconnected decisions into one plan you can actually run.”

### 0:18–0:38 — Show the consumer starting point

**On screen:** Click the wedding example, briefly show the understood brief, then continue into the workspace.

**Say:**

“A planner starts in ordinary language. EventReady turns that description into visible requirements and assumptions, so the person can correct the facts before the system recommends anything.”

### 0:38–1:03 — Show requirements-first discovery

**On screen:** Open Source. Scroll just enough to show the ranked plans, then open the recommended package. Show the included items and one quantity control or Swap action; do not complete a long edit.

**Say:**

“Source compares complete service plans instead of ranking vendors by price alone. Each option shows coverage, cost, package contents, and the work it leaves behind. The basket is a starting point: quantities, items, providers, and service level can all be refined.”

### 1:03–1:38 — Demonstrate WebMCP doing real work

**On screen:** Return to ChatGPT and send the prepared prompt. Keep the tool calls visible as they run. Then return to EventReady.

**Say:**

“The same application state is exposed through WebMCP. I’m asking the agent to select the plan, move it to staffed service, assign the unresolved work, and check readiness. These are narrow, inspectable actions—not screen scraping—and every mutation updates the same workspace.”

If the agent pauses for confirmation, approve only the proposed in-app planning changes. EventReady never contacts a provider or processes a payment.

### 1:38–2:07 — Prove the human-agent handoff

**On screen:** In EventReady, show the agent receipts and the planning report with no blockers or unowned work. Open Prepare and check the five critical confirmations, explaining that these represent verified demo facts. Show **Ready to run**.

**Say:**

“The interface now reflects the agent’s work: selected plan, service change, named ownership, readiness result, and agent receipts. The agent cannot invent external facts, so the person explicitly records provider, terms, deposit, guest-count, and venue confirmations before EventReady says Ready to run.”

### 2:07–2:25 — Show the operational output

**On screen:** Open Run and show the chronological run-of-show with time, action, owner, and evidence.

**Say:**

“Once coverage and ownership agree, that same plan becomes a chronological run-of-show. The team can see what happens when, who owns it, and the evidence behind every handoff.”

### 2:25–2:43 — Show implementation proof and close

**On screen:** Open About, jump to WebMCP implementation or use Judge Mode. Show the nine-tool inventory and trust/verification summary. End on the EventReady wordmark.

**Say:**

“EventReady exposes eight outcome tools plus one reset utility, backed by the visible EventSession and protected by a strict provider-data trust boundary. It makes the whole event—not just each purchase—ready.”

## One-take click sheet

Keep this beside the recording window:

1. Home → wedding example.
2. Confirm brief → open workspace.
3. Source → recommended package → show basket controls → close.
4. ChatGPT → paste the prepared prompt → wait for completion.
5. EventReady → show activity receipts → Prepare → check five demo confirmations.
6. Show Ready → Run → chronological plan.
7. About or Judge Mode → show tool inventory → close on brand.

## If the agent is slow during recording

- Wait no more than five seconds without narration; use that time to explain that the tools mutate the visible EventSession.
- If a call fails, stop the take, reload EventReady, and start again. Do not edit around an unexplained failure.
- The manual fallback at `/harness.html` invokes the identical page-owned tool registry, but use it only if native WebMCP is unavailable and say that clearly.

## Claims and capture checklist

- Say “fictional sample providers” once.
- Say that no provider is contacted and no payment is processed.
- Do not claim live availability, real pricing, cross-device persistence, or a completed transaction.
- Keep the URL visible at least once.
- Record at 1080p or higher; use a legible cursor and system zoom.
- Export under three minutes with audible narration and no copyrighted music.
- Upload as public or unlisted YouTube, verify it plays while signed out, then paste its URL into `devpost-submission.md` and the Devpost video field.
