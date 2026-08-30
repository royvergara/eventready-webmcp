# Project Scope

## Project Name Candidates

- **EventReady** — confirmed by the participant; direct, outcome-oriented, and broad enough to support the event-readiness category.

## One-Line Summary

EventReady is a WebMCP-powered execution agent that verifies whether the providers, responsibilities, constraints, and timing behind a small event actually work together, then produces a ready-to-run plan.

## Target User

The primary user is an **accidental event operator**: an office manager, executive assistant, operations coordinator, nonprofit or community organizer, school or church coordinator, small venue manager, or family host who owns an event outcome but does not plan events professionally.

The initial sweet spot is a 30–150 person workplace, community, school, nonprofit, or milestone gathering with at least three meaningful operational constraints such as dietary coverage, a venue without full infrastructure, delivery or pickup, rentals, volunteers, staffing, setup, cleanup, or a fixed program schedule.

## Problem

Booking each part of an event does not prove that the event will work. Vendor sites describe what they sell but rarely expose everything they require from the customer. Checklists and spreadsheets record tasks, but do not verify provider capabilities or reconcile conflicts across independent sites. Professional planners solve this at a price many smaller events cannot justify.

The gap is event readiness: knowing that every requirement is covered, every responsibility has an owner, timing is feasible, and unresolved risk is explicit.

## Core Workflow

1. The user describes an event in plain language or edits a structured brief.
2. EventReady converts the brief into requirements and shows which values were supplied, inferred, or assumed.
3. The agent evaluates provider capabilities, availability, inclusions, exclusions, and obligations through WebMCP tools.
4. The product presents the simplest viable plan and useful alternatives, with evidence and tradeoffs.
5. A readiness engine identifies coverage gaps, timing conflicts, missing resources, ambiguous ownership, and unsupported claims.
6. The user resolves a blocker by changing a provider/service level, confirming an assumption, or assigning the responsibility.
7. EventReady generates a readiness summary, ownership map, and chronological run-of-show.

## What We Are Building

- A product-first event brief and demo scenario.
- Three provider domains with deep enough behavior to prove composition: catering, venue, and rentals/staffing.
- A generalized provider-obligation and responsibility model built from the current catering engine.
- A readiness dashboard with confirmed, unresolved, and blocked states.
- Human-controlled resolution: findings never auto-resolve and confirmed choices persist.
- A chronological, shareable run-of-show.
- Judge Mode containing WebMCP tool evidence, provenance, source-gradient details, test harness, and security behavior.
- A responsive, dependency-light deployment that works without authentication.

## What We Are Not Building

- A generic full-service event planner.
- Venue discovery, invitations, ticketing, seating charts, entertainment, décor, photography, travel, or payments.
- Real marketplace transactions or claims that fictional providers are real businesses.
- Accounts, collaboration backends, persistent cloud storage, or calendar integrations.
- Open-ended chat as the primary interface.
- Arbitrary web scraping; the submission demonstrates structured provider capabilities and explicitly graded fallback sources.

These cuts protect the coherent end-to-end demo and keep the strongest technical work visible within the remaining submission window.

## Inspiration And References

- Operations checklists and professional run-of-show documents: valuable because they make ownership and timing explicit, but EventReady adds live provider evidence.
- Travel itinerary products: demonstrate how many independent bookings can become one coherent operational artifact.
- Dependency/risk dashboards: inspire the readiness states and blocker-first presentation.
- Official WebMCP Showcase: establishes the expected consumer-ready baseline and reinforces that the human-visible UI and agent tool surface should reinforce each other.

## Time Budget

- Submission deadline: September 3, 2026 at 1:00 PM Pacific.
- Working assumption: approximately four calendar days remaining, so implementation must reuse the validated static architecture and prioritize the demo path over platform breadth.

## Demo Path

The judge opens EventReady and starts with a prefilled 75-person community fundraiser at a rented venue. The brief includes a fixed start time, budget, vegan and gluten-free guests, no commercial kitchen, and limited volunteers.

The agent evaluates a primary caterer, venue, and rental/staffing capabilities. It shows that food ordering alone leaves warming equipment, setup, one pickup, and cleanup unowned. The user upgrades one service level and assigns a volunteer to the remaining pickup. The readiness score improves, blockers clear, and EventReady produces a chronological run-of-show with each responsibility and its source evidence. Judge Mode then reveals the WebMCP calls, trust boundary, and comparison with weaker source tiers.

## Submission Story

**The order is only half the plan.** WebMCP sites can publish not only what they offer, but what they require from the customer. EventReady composes those machine-readable obligations across independent providers into a verified operating plan. Humans remain in control of tradeoffs and confirmations; agents handle the cross-site reconciliation that is difficult, brittle, or impossible with ordinary webpages and checklists.

