import { assemblePlan, buildOptions, ownershipTable, parseOccasion, planPickups, replan } from './plan.js';
import { assignResponsibility, deriveReadiness } from '../engine/readiness.js';
import { deriveDemand, normalizeItem, runChecks } from '../engine/engine.js';
import { admitVendors } from '../engine/trust.js';
import { materializeBasket } from './basket.js';

const clone = value => JSON.parse(JSON.stringify(value));

function chronologicalOrder(value) {
  const when = String(value || '').toLowerCase();
  if (when === 'confirmed') return -1;
  if (when === 'that morning') return 8 * 60;
  if (when.includes('next business day')) return 3 * 1440;
  const match = when.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!match) return 2 * 1440;
  let hour = Number(match[1]) % 12;
  if (match[3] === 'pm') hour += 12;
  const minutes = hour * 60 + Number(match[2] || 0);
  return when.startsWith('after ') ? minutes + 1 : minutes;
}

function occasionFromBrief(brief) {
  return parseOccasion(brief.description || '', {
    headcount: Number(brief.headcount),
    budget: Number(brief.budget),
    dietary: clone(brief.dietary || {}),
    venueHasKitchen: !!brief.venue_has_kitchen,
    durationHours: Number(brief.duration_hours || 3),
    serveAt: brief.serve_at,
    hostProvides: clone(brief.host_provides || [])
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
    priority: brief.priority || 'coverage',
    cateringAlreadyBooked: !!brief.catering_already_booked,
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
    if (before.customized) return this.customizeBasket(before.basket.items);
    this.recalculateReadiness();
    return this.emit();
  }

  customizeBasket(lines = []) {
    if (!this.plan) throw new Error('assess the event first');
    const admitted = admitVendors(this.vendors).vendors;
    const useOccasion = this.plan.occasion;
    const items = materializeBasket(lines).map(item => {
      const normalized = normalizeItem(item).normalized;
      return { ...item, oz:item.oz ?? normalized.protein_oz, confidence:item.confidence ?? normalized.confidence };
    });
    const vendorsUsed = [...new Set(items.map(item => item.vendor).filter(Boolean))];
    const demand = this.plan.basket?.demand || deriveDemand(useOccasion);
    const uncovered = Object.entries(useOccasion.dietary || {}).flatMap(([group,needed]) => {
      const served = items.filter(item => item.category === 'main' && (item.dietary || []).includes(group))
        .reduce((sum,item) => sum + Number(item.claimed_serves || 0), 0);
      return served < needed ? [{ group, needed, served, short:needed-served }] : [];
    });
    const basket = {
      ...this.plan.basket,
      items,
      subtotal:items.reduce((sum,item) => sum + Number(item.price || 0), 0),
      vendorsUsed,
      demand,
      uncovered,
      shortOz:Math.max(0,demand.proteinOz-items.filter(item=>item.category==='main').reduce((sum,item)=>sum+Number(item.oz||0),0))
    };
    basket.pickups = planPickups(basket,useOccasion,this.serviceLevel);
    const requirementsByVendor = {};
    for (const slug of vendorsUsed) {
      const vendor = admitted.find(item => item.slug === slug);
      if (!vendor) continue;
      const level = vendor.service_levels.includes(this.serviceLevel) ? this.serviceLevel : vendor.service_levels[0];
      const contract = vendor.requirements?.[level] || { requires:[], provides:[] };
      const selectedResources = items.filter(item=>item.vendor===slug).map(item=>item.provides_resource).filter(Boolean);
      requirementsByVendor[slug] = {
        ...contract,
        provides:vendor.kind === 'caterer' || vendor.kind === 'bakery' ? [...(contract.provides || [])] : [...new Set(selectedResources)],
        service_level:level,
        assumed:!!contract.assumed
      };
    }
    const vendorsBySlug = Object.fromEntries(admitted.map(vendor => [vendor.slug,vendor]));
    const { findings } = runChecks({ basket,occasion:useOccasion,requirementsByVendor,vendorsBySlug });
    this.plan = { ...this.plan,basket,requirementsByVendor,findings,customized:true };
    this.delta = { lines:[`Customized the working basket to ${lines.length} catalog line${lines.length===1?'':'s'}.`] };
    this.recalculateReadiness();
    return this.emit();
  }

  confirmAssumption(assumptionId, value) {
    if (!this.plan) throw new Error('assess the event first');
    const before = this.plan;
    const changed = replan(this.plan, this.vendors, { assumption: assumptionId, value });
    this.plan = changed.plan;
    this.delta = changed.delta;
    if (before.customized) return this.customizeBasket(before.basket.items);
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
      .sort((a, b) => chronologicalOrder(a.when) - chronologicalOrder(b.when));
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
        subtotal: o.subtotal, vendorCount: o.vendorCount, blockers: o.blockers,
        uncovered: clone(o.uncovered || []), shortOz: o.shortOz || 0,
        collections: o.collections || 0, itemCount: o.itemCount || 0,
        items: clone(o.plan?.basket?.items || []),
        pickups: clone(o.plan?.basket?.pickups || []),
        findings: clone(o.plan?.findings || []),
        requirementsByVendor: clone(o.plan?.requirementsByVendor || {})
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
      description: 'Reset EventReady to the canonical 120-person wedding scenario.',
      inputSchema: { type: 'object', properties: {} },
      run: mutate(() => session.reset())
    }
  ];
}
