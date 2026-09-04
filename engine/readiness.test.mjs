import test from 'node:test';
import assert from 'node:assert/strict';
import { assignResponsibility, buildResponsibilities, deriveReadiness, domainFor } from './readiness.js';

const rows = [
  { job: 'food', who: 'Green Fork', source: 'vendor', when: 'that morning' },
  { job: 'transport', who: 'You', source: 'left to you', for: 'Green Fork', when: '2pm' },
  { job: 'cleanup', who: 'You', source: 'left to you', when: 'after 9pm' }
];

test('left-to-you work is unresolved until a human assigns it', () => {
  const responsibilities = buildResponsibilities(rows);
  assert.equal(responsibilities.filter(r => r.status === 'unresolved').length, 2);
  assert.equal(responsibilities.find(r => r.resource === 'food').status, 'covered');
});

test('assignments overlay ownership without mutating the source rows', () => {
  const id = buildResponsibilities(rows).find(r => r.resource === 'transport').id;
  const assignments = assignResponsibility({}, id, 'volunteer', 'Maya');
  const responsibilities = buildResponsibilities(rows, assignments);
  assert.equal(responsibilities.find(r => r.id === id).ownerLabel, 'Maya');
  assert.equal(rows[1].who, 'You');
});

test('ready is impossible while a blocker remains', () => {
  const report = deriveReadiness({
    findings: [{ check: 'timing', severity: 'blocker', message: 'Too early' }],
    ownershipRows: [{ job: 'food', who: 'Caterer', source: 'vendor' }]
  });
  assert.equal(report.state, 'blocked');
  assert.equal(report.counts.blockers, 1);
});

test('ready is impossible while required work is unowned', () => {
  const report = deriveReadiness({ findings: [], ownershipRows: rows });
  assert.equal(report.state, 'needs_decisions');
  assert.equal(report.counts.unowned, 2);
});

test('explicitly assigning every seam produces a ready report', () => {
  const unresolved = buildResponsibilities(rows).filter(r => r.status === 'unresolved');
  let assignments = {};
  for (const r of unresolved) assignments = assignResponsibility(assignments, r.id, 'organizer', 'Roy');
  const report = deriveReadiness({ findings: [], ownershipRows: rows, assignments });
  assert.equal(report.state, 'ready');
  assert.equal(report.score, 100);
});

test('domains are stable and human-readable coverage never depends on color', () => {
  assert.equal(domainFor('warming_trays'), 'equipment');
  assert.equal(domainFor('transport'), 'people');
  assert.equal(domainFor('hold_temperature'), 'timing');
});

test('an unassessed event is never presented as ready', () => {
  const report = deriveReadiness({ assessed: false });
  assert.equal(report.state, 'not_assessed');
  assert.equal(report.score, 0);
});

test('setting a responsibility aside keeps it on the record with its reason', () => {
  const id = buildResponsibilities(rows).find(r => r.resource === 'cleanup').id;
  const assignments = assignResponsibility({}, id, 'not_applicable', 'Not needed', 'Venue handles it');
  const responsibilities = buildResponsibilities(rows, assignments);
  const row = responsibilities.find(r => r.id === id);
  // Set aside is a status, never a deletion: the row and the reason both survive
  // so the screen that recorded the decision can still show it.
  assert.equal(responsibilities.length, rows.length);
  assert.equal(row.status, 'not_applicable');
  assert.equal(row.reason, 'Venue handles it');
});

test('a set-aside responsibility stops counting as unowned', () => {
  const built = buildResponsibilities(rows);
  const id = built.find(r => r.resource === 'cleanup').id;
  const before = deriveReadiness({ ownershipRows: rows });
  const after = deriveReadiness({
    ownershipRows: rows,
    assignments: assignResponsibility({}, id, 'not_applicable', 'Not needed', 'Venue handles it')
  });
  assert.equal(before.counts.unowned, 2);
  assert.equal(after.counts.unowned, 1);
});

test('putting a set-aside responsibility back makes it unowned again', () => {
  const id = buildResponsibilities(rows).find(r => r.resource === 'cleanup').id;
  const aside = assignResponsibility({}, id, 'not_applicable', 'Not needed', 'Venue handles it');
  const restored = assignResponsibility(aside, id, 'unassigned');
  assert.deepEqual(restored, {});
  assert.equal(buildResponsibilities(rows, restored).find(r => r.id === id).status, 'unresolved');
});
