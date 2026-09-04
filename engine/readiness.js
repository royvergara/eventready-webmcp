// Pure event-readiness adapter. It turns planning findings and ownership rows into
// a product-level answer: what is covered, what is blocked, and who owns the seams.

const DOMAIN_BY_RESOURCE = {
  food: 'food',
  dietary_coverage: 'food',
  quantity: 'food',
  coverage: 'food',
  venue: 'venue',
  access_30min_before: 'venue',
  parking: 'venue',
  someone_on_site_at_delivery: 'venue',
  warming_trays: 'equipment',
  fuel: 'equipment',
  serving_utensils: 'equipment',
  plates: 'equipment',
  return_by_monday: 'equipment',
  setup: 'people',
  refills: 'people',
  fuel_monitoring: 'people',
  cleanup: 'people',
  transport: 'people',
  hold_temperature: 'timing',
  timing: 'timing',
  availability: 'timing',
  budget: 'budget'
};

export const READINESS_DOMAINS = [
  { id: 'food', label: 'Food & guest needs' },
  { id: 'venue', label: 'Venue & access' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'people', label: 'People & ownership' },
  { id: 'timing', label: 'Timing' },
  { id: 'budget', label: 'Budget' }
];

export const domainFor = resource => DOMAIN_BY_RESOURCE[resource] || 'people';

const slug = value => String(value || 'responsibility')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function responsibilityId(row) {
  return [row.job, row.for || '', row.source || ''].map(slug).filter(Boolean).join('--');
}

export function buildResponsibilities(rows = [], assignments = {}) {
  return rows.map(row => {
    const id = responsibilityId(row);
    const explicit = assignments[id];
    const leftToHost = row.source === 'left to you' || row.who === 'You';
    const owner = explicit?.owner || (leftToHost ? 'unassigned' : 'provider');
    const ownerLabel = explicit?.ownerLabel || (leftToHost ? 'Unassigned' : row.who);
    return {
      id,
      resource: row.job,
      domain: domainFor(row.job),
      provider: row.for || null,
      when: row.when || null,
      owner,
      ownerLabel,
      // 'not_applicable' is how a derived obligation is set aside. It is never
      // deleted — the plan still lists it, with the reason it does not apply —
      // so nothing the engine derived can silently disappear from the record.
      status: owner === 'unassigned' ? 'unresolved'
        : owner === 'not_applicable' ? 'not_applicable'
        : (explicit ? 'assigned' : 'covered'),
      reason: explicit?.reason || null,
      evidence: row.source || 'plan'
    };
  });
}

export const RESPONSIBILITY_OWNERS = ['organizer', 'volunteer', 'provider', 'not_applicable', 'unassigned'];

export function assignResponsibility(assignments = {}, id, owner, ownerLabel = '', reason = '') {
  if (!id) throw new Error('responsibility id is required');
  if (!RESPONSIBILITY_OWNERS.includes(owner)) {
    throw new Error(`owner must be one of ${RESPONSIBILITY_OWNERS.join(', ')}`);
  }
  const next = { ...assignments };
  if (owner === 'unassigned') delete next[id];
  else next[id] = { owner, ownerLabel: ownerLabel || owner, ...(reason ? { reason } : {}) };
  return next;
}

function findingDomain(finding) {
  if (finding.check === 'unclaimed') return 'people';
  return domainFor(finding.check);
}

export function deriveReadiness({ findings = [], ownershipRows = [], assignments = {}, assessed = true, updatedAt } = {}) {
  const responsibilities = buildResponsibilities(ownershipRows, assignments);
  const unowned = responsibilities.filter(r => r.status === 'unresolved');
  // The engine's unclaimed finding is a roll-up of the very responsibility rows
  // shown here. Once a human explicitly assigns every seam, that roll-up is resolved.
  const effectiveFindings = unowned.length ? findings : findings.filter(f => f.check !== 'unclaimed');
  const blockers = effectiveFindings.filter(f => f.severity === 'blocker');
  const risks = effectiveFindings.filter(f => f.severity === 'risk');

  const domainRows = READINESS_DOMAINS.map(domain => {
    const relatedResponsibilities = responsibilities.filter(r => r.domain === domain.id);
    const relatedFindings = effectiveFindings.filter(f => findingDomain(f) === domain.id);
    const domainBlockers = relatedFindings.filter(f => f.severity === 'blocker').length;
    const unresolved = relatedResponsibilities.filter(r => r.status === 'unresolved').length;
    const total = relatedResponsibilities.length + relatedFindings.length;
    const covered = relatedResponsibilities.filter(r => r.status !== 'unresolved').length
      + relatedFindings.filter(f => f.severity !== 'blocker').length;
    const status = domainBlockers || unresolved ? 'blocked'
      : relatedFindings.some(f => f.severity === 'risk') ? 'risk'
      : total ? 'covered' : 'not_applicable';
    return { ...domain, status, covered, total, blockers: domainBlockers, unowned: unresolved };
  });

  const total = Math.max(1, responsibilities.length + effectiveFindings.length);
  const covered = responsibilities.filter(r => r.status !== 'unresolved').length
    + effectiveFindings.filter(f => f.severity !== 'blocker').length;
  const score = assessed ? Math.max(0, Math.min(100, Math.round(covered / total * 100))) : 0;
  const state = !assessed ? 'not_assessed'
    : blockers.length ? 'blocked'
    : unowned.length ? 'needs_decisions'
    : 'ready';

  return {
    state,
    score,
    counts: { covered, total, blockers: blockers.length, risks: risks.length, unowned: unowned.length },
    domains: domainRows,
    blockers,
    risks,
    responsibilities,
    updatedAt: updatedAt || new Date().toISOString()
  };
}
