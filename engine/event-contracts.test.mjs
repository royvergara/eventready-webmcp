import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventSession, buildEventReadyTools } from '../shared/eventready.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const vendorFiles = fs.readdirSync(path.join(root, 'data/vendors')).filter(f => f.endsWith('.json'));
const vendors = vendorFiles.map(f => read(`data/vendors/${f}`));
const demo = read('data/event/demo-fundraiser.json');
const venue = read('data/venues/riverside-hall.json');
const session = () => new EventSession({ vendors, demo, venue });

test('canonical demo and venue carry the event fields the product promises', () => {
  assert.equal(demo.headcount, 75);
  assert.equal(demo.venue_has_kitchen, false);
  assert.ok(venue.requirements.space_only.requires.includes('cleanup'));
  assert.ok(venue.requirements.space_only.provides.includes('venue'));
});

test('assessment returns alternatives, readiness domains and a draft run-of-show', () => {
  const s = session();
  const state = s.assess();
  assert.ok(state.options.length >= 2);
  assert.equal(state.readiness.domains.length, 6);
  assert.equal(state.runOfShow.status, 'draft');
});

test('delivery removes self-collection timing blockers', () => {
  const s = session();
  s.assess();
  const state = s.changeServiceLevel('delivery');
  assert.equal(state.readiness.blockers.some(f => f.check === 'timing'), false);
});

test('assigning every remaining seam makes a blocker-free delivered plan ready', () => {
  const s = session();
  s.assess();
  s.changeServiceLevel('delivery');
  const state = s.assignAll('organizer', 'Roy');
  assert.equal(state.readiness.state, 'ready');
  assert.equal(state.runOfShow.status, 'ready');
  assert.equal(state.runOfShow.rows.some(r => r.owner === 'Unassigned'), false);
});

test('ready run-of-show is chronological rather than alphabetic', () => {
  const s = session();
  s.assess();
  s.changeServiceLevel('delivery');
  const rows = s.assignAll('organizer', 'Roy').runOfShow.rows;
  const labels = rows.map(row => row.at);
  assert.ok(labels.indexOf('3pm') < labels.indexOf('by 5pm'));
  assert.ok(labels.indexOf('by 5:30pm') < labels.indexOf('6pm–9pm'));
  assert.ok(labels.indexOf('6pm–9pm') < labels.indexOf('after 9pm'));
});

test('a customized basket replaces the recommendation and recalculates planning truth', () => {
  const s = session();
  const assessed = s.assess();
  const option = assessed.options[0];
  const oneLine = [{ ...option.items[0], catalogKey:`${option.items[0].vendor}:${option.items[0].id}`, quantity:1 }];
  const state = s.customizeBasket(oneLine);
  assert.equal(state.plan.customized, true);
  assert.equal(state.plan.basket.items.length, 1);
  assert.equal(state.plan.basket.subtotal, oneLine[0].price);
  assert.ok(state.plan.basket.shortOz > 0 || state.plan.basket.uncovered.length > 0);
  assert.ok(state.readiness.blockers.length > 0);
});

test('service changes preserve a user-customized basket', () => {
  const s=session(); const assessed=s.assess(); const item=assessed.options[0].items[0];
  s.customizeBasket([{...item,catalogKey:`${item.vendor}:${item.id}`,quantity:1}]);
  const changed=s.changeServiceLevel('delivery');
  assert.equal(changed.plan.customized,true);
  assert.equal(changed.plan.basket.items.length,1);
  assert.equal(changed.plan.basket.items[0].id,item.id);
});

test('the nine product tools are narrow, serialisable contracts', () => {
  const tools = buildEventReadyTools(session());
  assert.equal(tools.length, 9);
  assert.equal(new Set(tools.map(t => t.name)).size, 9);
  for (const definition of tools) {
    const fresh = session();
    fresh.assess();
    const tool = buildEventReadyTools(fresh).find(candidate => candidate.name === definition.name);
    assert.match(tool.name, /^[a-z][a-z0-9_]*$/);
    assert.ok(tool.description.length > 20);
    assert.equal(tool.inputSchema.type, 'object');
    assert.doesNotThrow(() => JSON.stringify(tool.run(tool.name === 'assess_event_readiness' ? {} :
      tool.name === 'change_service_level' ? { service_level: 'delivery' } :
      tool.name === 'reset_demo_event' ? {} :
      tool.name.startsWith('get_') ? {} :
      tool.name === 'select_event_plan' ? { option_id: fresh.snapshot().options[0].id } :
      tool.name === 'assign_responsibility' ? { responsibility_id: 'cleanup--left-to-you', owner: 'organizer' } :
      { assumption_id: 'occasion.headcount', value: 75 })));
  }
});

test('the session carries an assignment reason through to the readiness record', () => {
  const active = session();
  active.assess();
  const id = active.snapshot().readiness.responsibilities.find(r => r.status === 'unresolved')?.id;
  assert.ok(id, 'demo event should have at least one unowned responsibility');
  active.assign(id, 'not_applicable', 'Not needed', 'Venue provides this');
  const row = active.snapshot().readiness.responsibilities.find(r => r.id === id);
  assert.equal(row.status, 'not_applicable');
  assert.equal(row.reason, 'Venue provides this');
});
