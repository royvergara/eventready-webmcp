import { assemblePlan, buildOptions, ownershipTable, parseOccasion, replan } from './plan.js';
import { assignResponsibility, deriveReadiness } from '../engine/readiness.js';

const clone = value => JSON.parse(JSON.stringify(value));

function occasionFromBrief(brief) {
  return parseOccasion(brief.description || '', {
    headcount: Number(brief.headcount),
    budget: Number(brief.budget),
    dietary: clone(brief.dietary || {}),
    venueHasKitchen: !!brief.venue_has_kitchen,
    durationHours: Number(brief.duration_hours || 3),
    serveAt: brief.serve_at
  });
}

function venueRows(venue) {
  const contract = venue?.requirements?.space_only || { requires: [], provides: [] };
  return [
    ...(contract.provides || []).map(job => ({ job, who: venue.name, source: 'venue', when: job === 'access_30min_before' ? 'by 5:30pm' : 'confirmed' })),
    ...(contract.requires || []).map(job => ({ job, who: 'You', source: 'left to you', when: job === 'cleanup' ? 'after 9pm' : 'by 5:15pm' }))
  ];
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = `${row.job}|${row.for || ''}|${row.who === 'You' ? 'host' : row.who}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function briefSummary(brief) {
  return {
    title: brief.title,
    eventType: brief.event_type,
    venueName: brief.venue_name,
    headcount: Number(brief.headcount),
    budget: Number(brief.budget),
    serveAt: brief.serve_at,
    durationHours: Number(brief.duration_hours),
    dietary: clone(brief.dietary || {}),
    venueHasKitchen: !!brief.venue_has_kitchen,
    helpersAvailable: Number(brief.helpers_available || 0),
    provenance: clone(brief.provenance || {})
  };
}

export class EventSession {
  constructor({ vendors, venue, demo }) {
    this.vendors = clone(vendors);
    this.venue = clone(venue);
    this.demo = clone(demo);
    this.listeners = new Set();
    this.reset(false);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
    return snapshot;
  }

  reset(notify = true) {
    this.brief = clone(this.demo);
    this.serviceLevel = 'pickup';
    this.assignments = {};
    this.selectedOptionId = null;
    this.delta = null;
    this.assessed = false;
    this.options = [];
    this.plan = null;
    this.readiness = deriveReadiness({ assessed: false });
    return notify ? this.emit() : this.snapshot();
  }

  assess(patch = {}) {
    this.brief = { ...this.brief, ...clone(patch) };
    const occasion = occasionFromBrief(this.brief);
    this.options = buildOptions(occasion, this.vendors, this.serviceLevel);
    const selected = this.options.find(o => o.id === this.selectedOptionId) || this.options[0];
    this.selectedOptionId = selected?.id || null;
    this.plan = selected?.plan || assemblePlan(occasion, this.vendors, this.serviceLevel);
    this.assessed = true;
    this.recalculateReadiness();
    return this.emit();
  }

  selectPlan(optionId) {
    const option = this.options.find(o => o.id === optionId);
    if (!option) throw new Error(`unknown option: ${optionId}`);
    this.selectedOptionId = optionId;
    this.plan = option.plan;
    this.delta = { lines: [`Selected ${option.label || optionId}.`] };
    this.recalculateReadiness();
    return this.emit();
  }

  changeServiceLevel(serviceLevel) {
    if (!['pickup', 'delivery', 'dropoff_setup', 'staffed'].includes(serviceLevel)) {
      throw new Error('unsupported service level');
    }
    const before = this.plan;
    this.serviceLevel = serviceLevel;
    if (!before) return this.assess();
    const changed = replan(before, this.vendors, { serviceLevel });
    this.plan = changed.plan;
    this.delta = changed.delta;
    this.options = buildOptions(this.plan.baseOccasion || this.plan.occasion, this.vendors, serviceLevel);
    this.recalculateReadiness();
    return this.emit();
  }

  confirmAssumption(assumptionId, value) {
    if (!this.plan) throw new Error('assess the event first');
    const changed = replan(this.plan, this.vendors, { assumption: assumptionId, value });
    this.plan = changed.plan;
    this.delta = changed.delta;
    this.recalculateReadiness();
    return this.emit();
  }

  assign(responsibilityId, owner, ownerLabel = '') {
    this.assignments = assignResponsibility(this.assignments, responsibilityId, owner, ownerLabel);
    this.delta = { lines: [`Assigned ${ownerLabel || owner} to a previously unowned responsibility.`] };
    this.recalculateReadiness();
    return this.emit();
  }

  assignAll(owner = 'organizer', ownerLabel = 'Event organizer') {
    for (const responsibility of this.readiness.responsibilities.filter(r => r.status === 'unresolved')) {
      this.assignments = assignResponsibility(this.assignments, responsibility.id, owner, ownerLabel);
    }
    this.delta = { lines: [`Assigned ${ownerLabel} to every remaining organizer-owned responsibility.`] };
    this.recalculateReadiness();
    return this.emit();
  }

  ownershipRows() {
    if (!this.plan) return venueRows(this.venue);
    return uniqueRows([...ownershipTable(this.plan, this.vendors), ...venueRows(this.venue)]);
  }

  recalculateReadiness() {
    this.readiness = deriveReadiness({
      findings: this.plan?.findings || [],
      ownershipRows: this.ownershipRows(),
      assignments: this.assignments,
      assessed: this.assessed
    });
  }

  runOfShow() {
    const responsibilities = [...this.readiness.responsibilities]
      .sort((a, b) => String(a.when).localeCompare(String(b.when)));
    return {
      status: this.readiness.state === 'ready' ? 'ready' : 'draft',
      event: briefSummary(this.brief),
      rows: responsibilities.map(r => ({
        at: r.when || 'time not set',
        action: r.provider ? `${r.resource.replaceAll('_', ' ')} — ${r.provider}` : r.resource.replaceAll('_', ' '),
        owner: r.ownerLabel,
        evidence: r.evidence,
        status: r.status
      })),
      assumptions: clone(this.plan?.assumptions || []),
      remainingRisks: clone(this.readiness.risks),
      generatedAt: new Date().toISOString()
    };
  }

  snapshot() {
    return {
      brief: briefSummary(this.brief),
      rawBrief: clone(this.brief),
      serviceLevel: this.serviceLevel,
      options: this.options.map(o => ({
        id: o.id, label: o.label, summary: o.summary, recommended: o.recommended,
        subtotal: o.subtotal, vendorCount: o.vendorCount, blockers: o.blockers
      })),
      selectedOptionId: this.selectedOptionId,
      plan: this.plan,
      readiness: this.readiness,
      delta: this.delta,
      runOfShow: this.runOfShow()
    };
  }
}

export function buildEventReadyTools(session, onChange = () => {}) {
  const mutate = fn => input => {
    const result = fn(input || {});
    onChange(result);
    return result;
  };
  return [
    {
      name: 'get_event_brief',
      description: 'Return the current EventReady brief and the provenance of its important values.',
      inputSchema: { type: 'object', properties: {} },
      run: () => session.snapshot().brief
    },
    {
      name: 'assess_event_readiness',
      description: 'Assess provider coverage, timing, ownership and open blockers for the current or supplied event brief.',
      inputSchema: {
        type: 'object',
        properties: {
          headcount: { type: 'number' }, budget: { type: 'number' }, serve_at: { type: 'string' },
          duration_hours: { type: 'number' }, venue_has_kitchen: { type: 'boolean' },
          dietary: { type: 'object', additionalProperties: { type: 'number' } }
        }
      },
      run: mutate(input => session.assess(input))
    },
    {
      name: 'get_readiness_report',
      description: 'Return readiness state, score, domains, blockers, risks and responsibility ownership.',
      inputSchema: { type: 'object', properties: {} },
      run: () => session.snapshot().readiness
    },
    {
      name: 'select_event_plan',
      description: 'Select one of the alternatives currently visible in EventReady.',
      inputSchema: { type: 'object', properties: { option_id: { type: 'string' } }, required: ['option_id'] },
      run: mutate(({ option_id }) => session.selectPlan(option_id))
    },
    {
      name: 'assign_responsibility',
      description: 'Explicitly assign one visible unresolved responsibility to the organizer, a volunteer, or a provider.',
      inputSchema: {
        type: 'object',
        properties: {
          responsibility_id: { type: 'string' },
          owner: { type: 'string', enum: ['organizer', 'volunteer', 'provider', 'unassigned'] },
          owner_label: { type: 'string' }
        },
        required: ['responsibility_id', 'owner']
      },
      run: mutate(({ responsibility_id, owner, owner_label }) => session.assign(responsibility_id, owner, owner_label))
    },
    {
      name: 'change_service_level',
      description: 'Change the service level and recalculate which responsibilities providers cover.',
      inputSchema: {
        type: 'object', properties: { service_level: { type: 'string', enum: ['pickup', 'delivery', 'dropoff_setup', 'staffed'] } },
        required: ['service_level']
      },
      run: mutate(({ service_level }) => session.changeServiceLevel(service_level))
    },
    {
      name: 'confirm_event_assumption',
      description: 'Confirm or correct one visible assumption and recalculate only what depends on it.',
      inputSchema: {
        type: 'object', properties: { assumption_id: { type: 'string' }, value: {} }, required: ['assumption_id', 'value']
      },
      run: mutate(({ assumption_id, value }) => session.confirmAssumption(assumption_id, value))
    },
    {
      name: 'get_run_of_show',
      description: 'Return the current chronological event plan, labelled Draft until all blockers and required ownership gaps are resolved.',
      inputSchema: { type: 'object', properties: {} },
      run: () => session.runOfShow()
    },
    {
      name: 'reset_demo_event',
      description: 'Reset EventReady to the canonical 75-person fundraiser scenario.',
      inputSchema: { type: 'object', properties: {} },
      run: mutate(() => session.reset())
    }
  ];
}

