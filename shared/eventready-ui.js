import { esc, label } from './ui.js';
import { toolHost } from './webmcp.js';
import { EventSession, buildEventReadyTools, chronologicalOrder } from './eventready.js';
import { admitVendors } from '../engine/trust.js';
import { addBasketItem, basketMetrics, basketSubtotal, catalogFromVendors, recommendedBasket, setBasketQuantity, swapBasketItem } from './basket.js';

const $ = id => document.getElementById(id);
const slugs = ['cedar-and-salt','green-fork','masa-y-mas','sweet-bench','casa-vieja','prime-platters','loop-rentals','handoff-staffing'];
const [vendors,demo,venue] = await Promise.all([
  Promise.all(slugs.map(slug => fetch(`/data/vendors/${slug}.json`).then(response => response.json()))),
  fetch('/data/event/demo-wedding.json').then(response => response.json()),
  fetch('/data/venues/cedar-house.json').then(response => response.json())
]);

const session = new EventSession({ vendors, demo, venue });
const admittedVendors = admitVendors(vendors).vendors;
const catalog = catalogFromVendors(admittedVendors);
const STATE_KEY = 'eventready:v6:application';
const BOOKING_KEY = 'eventready:v6:test-booking';
const EVENTS_KEY = 'eventready:v7:events';
const PHASES = ['shape','source','coordinate','prepare','run'];
let booking = parseStored(BOOKING_KEY);
let eventStore = parseStored(EVENTS_KEY) || { version:1, events:{} };
let currentEventId = null;
// One set of line icons, drawn inline. Nothing is fetched, each scales with the
// text around it and inherits its colour. They replace the ✓ ○ ● ! → × characters
// the interface used to set as type: those render differently on every platform,
// sit off the baseline, and at these sizes read as punctuation rather than state.
const ICON_PATHS = {
  check:    '<polyline points="3.5 8.4 6.6 11.5 12.5 4.8"/>',
  circle:   '<circle cx="8" cy="8" r="4.6"/>',
  dot:      '<circle cx="8" cy="8" r="3.2" fill="currentColor" stroke="none"/>',
  alert:    '<path d="M8 4.1v4.3"/><circle cx="8" cy="11.4" r=".95" fill="currentColor" stroke="none"/>',
  arrow:    '<path d="M3.2 8h9"/><polyline points="8.6 4.4 12.2 8 8.6 11.6"/>',
  back:     '<path d="M12.8 8h-9"/><polyline points="7.4 4.4 3.8 8 7.4 11.6"/>',
  chevron:  '<polyline points="4.4 6.4 8 10 11.6 6.4"/>',
  up:       '<path d="M8 12.8v-9"/><polyline points="4.4 7.4 8 3.8 11.6 7.4"/>',
  info:     '<circle cx="8" cy="8" r="5.6"/><path d="M8 7.4v3.4"/><circle cx="8" cy="5.1" r=".75" fill="currentColor" stroke="none"/>',
  close:    '<path d="M4.6 4.6 11.4 11.4"/><path d="M11.4 4.6 4.6 11.4"/>'
};
const icon = (name, extra='') => `<svg class="icon${extra?' '+extra:''}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]||''}</svg>`;

let appState = { route:'start', activePhase:'shape', shapeStep:0, proposal:null, packageOptionId:null, catalogMode:null, replaceBasketKey:null, pendingBrief:null, runSheetExpanded:false };
let eventOps = createEventOps();
let toastTimer;
let overlayReturnFocus=null;
restoreBookingRefinement();

function createEventOps() {
  return {
    team:[
      { id:'roy', name:'Roy', role:'Organizer', contact:'roy@example.com' },
      { id:'maya', name:'Maya', role:'Day-of lead', contact:'(512) 555-0142' },
      { id:'jordan', name:'Jordan', role:'Host', contact:'jordan@example.com' }
    ],
    assignmentPeople:{},
    commitmentStatus:'draft',
    commitmentUpdatedAt:null,
    lastImpact:null,
    confirmation:{provider:false,terms:false,deposit:false,finalCount:false,venueAccess:false},
    ledger:{venue:0,taxRate:8.25,gratuityRate:18,depositRate:30,depositPaid:false},
    packageRefinement:{serviceLevel:'pickup',guestCount:null,notes:'',addCleanup:false,baskets:{}},
    completedRows:{}, customTasks:[]
    ,activity:[]
  };
}

function restoreBookingRefinement() {
  if (!booking?.refinement) return;
  eventOps.packageRefinement={...eventOps.packageRefinement,...booking.refinement,baskets:{...(booking.refinement.baskets||{})}};
  if (booking.refinement.basket?.length && booking.optionId) {
    eventOps.packageRefinement.baskets[booking.optionId]={lines:JSON.parse(JSON.stringify(booking.refinement.basket)),customized:true,updatedAt:booking.createdAt};
  }
}

const stored = parseStored(STATE_KEY);
if (stored?.version === 1 && stored.brief) session.brief = { ...session.brief, ...stored.brief };

function parseStored(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function persist() {
  localStorage.setItem(STATE_KEY, JSON.stringify({ version:1, brief:session.snapshot().rawBrief }));
  if (booking) localStorage.setItem(BOOKING_KEY, JSON.stringify(booking));
  else localStorage.removeItem(BOOKING_KEY);
  if (currentEventId) {
    const state = session.snapshot();
    eventStore.events[currentEventId] = {
      id:currentEventId,
      brief:state.rawBrief,
      booking:booking ? {...booking} : null,
      selectedOptionId:state.selectedOptionId,
      serviceLevel:state.serviceLevel,
      assignments:{...session.assignments},
      ops:JSON.parse(JSON.stringify(eventOps)),
      readiness:state.readiness.state,
      open:state.readiness.blockers.length + state.readiness.responsibilities.filter(row=>row.status==='unresolved').length,
      updatedAt:new Date().toISOString()
    };
    localStorage.setItem(EVENTS_KEY,JSON.stringify(eventStore));
  }
  renderSavedEvents();
  if (currentEventId && $('saveStatus')) {
    $('saveStatus').hidden=false;
    $('saveStatus').textContent='Saved just now';
  }
}

function showToast(message) {
  const toast=$('appToast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent=message;
  toast.hidden=false;
  requestAnimationFrame(()=>toast.classList.add('visible'));
  toastTimer=setTimeout(()=>{toast.classList.remove('visible');setTimeout(()=>toast.hidden=true,180);},3200);
}

function recordImpact(message, actor='You', channel='Interface', details=[]) {
  const at=new Date().toISOString();
  eventOps.lastImpact={message,at,details};
  eventOps.activity=[{message,actor,channel,at,details},...(eventOps.activity||[])].slice(0,12);
  showToast(message);
}

function planMetrics(state) {
  const option=state.options?.find(row=>row.id===state.selectedOptionId) || state.options?.[0];
  const unresolved=state.readiness.responsibilities.filter(row=>row.status==='unresolved');
  return {
    cost:Number(option?.subtotal||0),
    blockers:state.readiness.blockers.length,
    unowned:unresolved.length,
    covered:state.readiness.counts?.covered ?? state.readiness.responsibilities.length-unresolved.length,
    total:state.readiness.responsibilities.length,
    serviceLevel:state.serviceLevel,
    headcount:state.brief.headcount,
    budget:state.brief.budget,
    dietary:{...(state.brief.dietary||{})},
    state:state.readiness.state
  };
}

function impactDetails(beforeState,afterState) {
  const before=planMetrics(beforeState),after=planMetrics(afterState);
  const details=[];
  if(before.cost!==after.cost) details.push(`${after.cost>before.cost?'+':'−'}$${Math.abs(after.cost-before.cost).toLocaleString()} estimated package`);
  if(before.unowned!==after.unowned) details.push(`${Math.abs(after.unowned-before.unowned)} ${after.unowned<before.unowned?'fewer':'more'} unowned responsibilities`);
  if(before.blockers!==after.blockers) details.push(`${Math.abs(after.blockers-before.blockers)} ${after.blockers<before.blockers?'fewer':'more'} blockers`);
  if(before.covered!==after.covered) details.push(`${after.covered}/${after.total} responsibilities covered`);
  if(before.headcount!==after.headcount) details.push(`Guest count ${before.headcount} → ${after.headcount}`);
  if(before.budget!==after.budget) details.push(`Budget $${Number(before.budget).toLocaleString()} → $${Number(after.budget).toLocaleString()}`);
  const changedNeeds=Object.keys({...before.dietary,...after.dietary}).filter(key=>before.dietary[key]!==after.dietary[key]);
  if(changedNeeds.length) details.push(changedNeeds.map(key=>`${label(key)} ${before.dietary[key]||0} → ${after.dietary[key]||0}`).join(' · '));
  if(before.state!==after.state) details.push(`Planning status ${label(before.state)} → ${label(after.state)}`);
  return details.slice(0,4);
}

function openOverlay(id, opener=document.activeElement) {
  const overlay=$(id);
  if (!overlay) return;
  if (opener instanceof HTMLElement && !opener.closest('.overlay')) overlayReturnFocus=opener;
  overlay.hidden=false;
  document.body.classList.add('has-overlay');
  requestAnimationFrame(()=>overlay.querySelector('[role="dialog"]')?.focus());
}

function closeOverlay(id, { restoreFocus=true }={}) {
  const overlay=$(id);
  if (!overlay) return;
  overlay.hidden=true;
  if (!document.querySelector('.overlay:not([hidden])')) document.body.classList.remove('has-overlay');
  if (restoreFocus) {
    if (overlayReturnFocus?.isConnected) overlayReturnFocus.focus();
    overlayReturnFocus=null;
  }
}

document.addEventListener('keydown',event=>{
  const overlay=document.querySelector('.overlay:not([hidden])');
  if (!overlay) return;
  if (event.key==='Escape') {
    event.preventDefault();
    overlay.querySelector('button[aria-label="Close"], footer .secondary-button, footer .primary-button')?.click();
    return;
  }
  if (event.key!=='Tab') return;
  const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.getClientRects().length);
  if (!focusable.length) return;
  const first=focusable[0],last=focusable.at(-1);
  if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
});

function eventIdFor(brief) {
  return `${String(brief.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}-${Date.now().toString(36)}`;
}

function restoreEvent(id) {
  const saved = eventStore.events[id];
  if (!saved) return;
  currentEventId = id;
  booking = saved.booking ? {...saved.booking} : null;
  session.brief = {...saved.brief};
  eventOps = {...createEventOps(), ...(saved.ops || {}), confirmation:{...createEventOps().confirmation,...(saved.ops?.confirmation||{})}, ledger:{...createEventOps().ledger,...(saved.ops?.ledger||{})}, packageRefinement:{...createEventOps().packageRefinement,...(saved.ops?.packageRefinement||{}),baskets:{...(saved.ops?.packageRefinement?.baskets||{})}}};
  session.assess();
  if (saved.selectedOptionId && session.snapshot().options.some(option=>option.id===saved.selectedOptionId)) session.selectPlan(saved.selectedOptionId);
  if (saved.serviceLevel && saved.serviceLevel !== 'pickup') session.changeServiceLevel(saved.serviceLevel);
  if (saved.booking?.refinement?.basket?.length) session.customizeBasket(saved.booking.refinement.basket);
  for (const [id,assignment] of Object.entries(saved.assignments || {})) session.assign(id,assignment.owner,assignment.ownerLabel);
  appState.activePhase=firstIncompletePhase(session.snapshot());
  renderWorkspace(session.snapshot());
  showRoute('workspace');
}

function renderSavedEvents() {
  if (!$('savedEventsList')) return;
  const events = Object.values(eventStore.events).filter(item=>item.id!=='sample-wedding').sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  $('savedEventsSection').hidden = events.length === 0;
  $('savedEventsList').innerHTML = events.map(item=>`<button class="saved-event" type="button" data-open-event="${esc(item.id)}"><span class="event-mark ${item.brief.event_type==='work event'?'work':'wedding'}">${esc(eventMark(item.brief.title))}</span><span><strong>${esc(item.brief.title)}</strong><small>${esc(formatDate(item.brief.serve_at))} · ${esc(item.brief.venue_name || 'Venue to confirm')}</small></span><span class="saved-event-status">${item.readiness==='ready'?'Ready to run':`${item.open} decisions open`}</span><span class="card-go" aria-hidden="true">${icon('arrow')}</span></button>`).join('');
  document.querySelectorAll('[data-open-event]').forEach(button=>button.onclick=()=>restoreEvent(button.dataset.openEvent));
}


// An event you can open but never rename or remove is a list that only grows.
// Renaming edits the brief in place — the title is a label, not a planning
// input, so nothing downstream needs recomputing. Deleting is the one
// destructive action here, so it names what goes and asks first.
let pendingDeleteId = null;

function eventTitleOf(id) {
  return id === currentEventId ? session.brief.title : (eventStore.events[id]?.brief?.title || 'this event');
}

function applyEventRename(id, title) {
  const next = title.trim();
  if (!next) return false;
  if (eventStore.events[id]) {
    eventStore.events[id].brief = { ...eventStore.events[id].brief, title: next };
    localStorage.setItem(EVENTS_KEY, JSON.stringify(eventStore));
  }
  if (id === currentEventId) {
    session.brief = { ...session.brief, title: next };
    persist();
    renderWorkspace(session.snapshot());
  }
  renderSavedEvents();
  showToast(`Renamed to ${next}.`);
  return true;
}

function startRenameCurrentEvent() {
  $('renameEventInput').value = session.brief.title;
  $('eventTitle').hidden = true;
  $('renameEventForm').hidden = false;
  $('renameEventInput').focus();
  $('renameEventInput').select();
}

function endRenameCurrentEvent() {
  $('renameEventForm').hidden = true;
  $('eventTitle').hidden = false;
  $('renameEventButton').focus();
}

function askDeleteEvent(id) {
  pendingDeleteId = id;
  $('deleteEventSummary').textContent =
    `“${eventTitleOf(id)}” will be removed from this device. Its plan, assignments, and confirmations go with it.`;
  openOverlay('deleteEventOverlay');
}

function deleteEvent(id) {
  delete eventStore.events[id];
  localStorage.setItem(EVENTS_KEY, JSON.stringify(eventStore));
  const wasOpen = id === currentEventId;
  renderSavedEvents();
  if (wasOpen) { currentEventId = null; booking = null; eventOps = createEventOps(); session.reset(false); session.assess(); showRoute('start'); }
  showToast('Event deleted.');
}

function currentBooking(state = session.snapshot()) {
  return booking?.eventId === currentEventId || (!booking?.eventId && booking?.eventTitle === state.brief.title) ? booking : null;
}

function syncUrl() {
  const url = new URL(location.href);
  if (appState.route === 'workspace') {
    url.searchParams.set('view', 'event');
    if (currentEventId) url.searchParams.set('event', currentEventId);
    else url.searchParams.delete('event');
    url.searchParams.set('phase', appState.activePhase);
  } else {
    for (const key of ['view', 'event', 'phase']) url.searchParams.delete(key);
  }
  history.replaceState(null, '', url);
}

function showRoute(route) {
  appState.route = route;
  $('startView').hidden = route !== 'start';
  $('shapeView').hidden = route !== 'shape';
  $('workspaceView').hidden = route !== 'workspace';
  $('newEventButton').hidden = route !== 'workspace';
  if (route === 'start') renderSavedEvents();
  document.body.dataset.route = route;
  syncUrl();
  document.body.dataset.eventType = route === 'start' ? 'default' : String(session.brief.event_type || 'event').replaceAll(' ','-');
  document.title = route === 'start' ? 'EventReady · The whole event, held together' : `${session.snapshot().brief.title} · EventReady`;
  window.scrollTo({ top:0, behavior:'instant' });
}

function eventFromDescription(description) {
  const lower = description.toLowerCase();
  const wedding = lower.includes('wedding');
  const work = lower.includes('off-site') || lower.includes('work event') || lower.includes('company');
  const community = lower.includes('fundraiser') || lower.includes('community');
  const celebration = lower.includes('birthday') || lower.includes('celebration');
  const headcountMatch=description.match(/(\d[\d,]*)\s*(?:guests|people|attendees)/i);
  const budgetMatch=description.match(/\$\s?(\d[\d,]*)/);
  const headcount = Number(headcountMatch?.[1]?.replaceAll(',','')) || 75;
  const budget = Number(budgetMatch?.[1]?.replaceAll(',','')) || 15000;
  const dietary = {
    vegetarian:Number(description.match(/(\d+)\s*vegetarian/i)?.[1]) || 0,
    vegan:Number(description.match(/(\d+)\s*vegan/i)?.[1]) || 0,
    gluten_free:Number(description.match(/(\d+)\s*gluten[- ]free/i)?.[1]) || 0
  };
  return {
    ...demo,
    title:wedding ? 'Wedding Reception' : work ? 'Team Gathering' : community ? 'Community Fundraiser' : celebration ? 'Milestone Celebration' : 'My Event',
    event_type:wedding ? 'wedding' : work ? 'work event' : community ? 'community event' : celebration ? 'celebration' : 'event',
    description, headcount, budget,
    dietary,
    venue_name:'Venue to confirm',
    priority:'coverage',
    catering_already_booked:/cater(?:ing|er).*(?:booked|confirmed)/i.test(description),
    host_provides:[],
    provenance:{title:'inferred',headcount:headcountMatch?'given':'assumed',budget:budgetMatch?'given':'assumed',serveAt:'assumed',durationHours:'assumed',dietary:Object.values(dietary).some(Boolean)?'given':'needed',venueHasKitchen:'needed',venueName:'needed'}
  };
}

function startShaping(description) {
  session.brief = appState.pendingBrief || eventFromDescription(description);
  appState.pendingBrief=null;
  currentEventId = eventIdFor(session.brief);
  booking = null;
  eventOps = createEventOps();
  appState.shapeStep = 0;
  hydrateShapeFields();
  renderShape();
  showRoute('shape');
}

function openBriefReview(description) {
  const brief=eventFromDescription(description);
  appState.pendingBrief=brief;
  $('reviewTitle').value=brief.title;
  $('reviewType').value=['wedding','work event','celebration','community event'].includes(brief.event_type)?brief.event_type:'celebration';
  $('reviewGuests').value=brief.headcount;
  $('reviewBudget').value=brief.budget;
  $('reviewGuestsSource').textContent=brief.provenance.headcount==='given'?'From your description':'Assumed — confirm';
  $('reviewBudgetSource').textContent=brief.provenance.budget==='given'?'From your description':'Assumed — confirm';
  const needs=Object.entries(brief.dietary).filter(([,count])=>count>0);
  $('briefReviewNeeds').innerHTML=`<strong>Dietary needs detected</strong><div>${needs.length?needs.map(([kind,count])=>`<span>${count} ${esc(label(kind))}</span>`).join(''):'<span>None mentioned yet</span>'}</div>`;
  openOverlay('briefReviewOverlay');
}

function confirmBriefReview() {
  if (!appState.pendingBrief) return;
  appState.pendingBrief={...appState.pendingBrief,title:$('reviewTitle').value.trim()||'My Event',event_type:$('reviewType').value,headcount:Math.max(1,Number($('reviewGuests').value)||1),budget:Math.max(0,Number($('reviewBudget').value)||0)};
  closeOverlay('briefReviewOverlay',{restoreFocus:false});
  startShaping(appState.pendingBrief.description);
}

function hydrateShapeFields() {
  const brief = session.brief;
  $('fieldTitle').value = brief.title;
  $('fieldType').value = ['wedding','work event','celebration','community event'].includes(brief.event_type) ? brief.event_type : 'celebration';
  $('fieldVenue').value = brief.venue_name === 'Venue to confirm' ? '' : (brief.venue_name || '');
  $('fieldKitchen').checked = !!brief.venue_has_kitchen;
  $('fieldGuests').value = brief.headcount || 1;
  $('fieldVegetarian').value = brief.dietary?.vegetarian || 0;
  $('fieldVegan').value = brief.dietary?.vegan || 0;
  $('fieldGlutenFree').value = brief.dietary?.gluten_free || 0;
  $('fieldBudget').value = brief.budget || 0;
  $('fieldPriority').value = brief.priority || 'coverage';
  $('fieldHelpers').value = brief.helpers_available || 0;
  $('fieldFoodBooked').checked = !!currentBooking();
  $('fieldEquipmentHandled').checked = (brief.host_provides || []).includes('warming_trays');
  const date = String(brief.serve_at || demo.serve_at).slice(0,10);
  const time = String(brief.serve_at || demo.serve_at).slice(11,16);
  $('fieldDate').value = date;
  $('fieldTime').value = time;
}

function updateBriefFromFields() {
  const date = $('fieldDate').value || String(demo.serve_at).slice(0,10);
  const time = $('fieldTime').value || '18:00';
  const headcount = Math.max(1, Number($('fieldGuests').value) || 1);
  const dietary = {
    vegetarian:Math.max(0,Number($('fieldVegetarian').value)||0),
    vegan:Math.max(0,Number($('fieldVegan').value)||0),
    gluten_free:Math.max(0,Number($('fieldGlutenFree').value)||0)
  };
  session.brief = {
    ...session.brief,
    title:$('fieldTitle').value.trim() || 'My Event',
    event_type:$('fieldType').value,
    venue_name:$('fieldVenue').value.trim() || 'Venue to confirm',
    venue_has_kitchen:$('fieldKitchen').checked,
    headcount,
    dietary,
    budget:Math.max(0,Number($('fieldBudget').value)||0),
    priority:$('fieldPriority').value,
    helpers_available:Math.max(0,Number($('fieldHelpers').value)||0),
    catering_already_booked:$('fieldFoodBooked').checked,
    host_provides:$('fieldEquipmentHandled').checked ? ['warming_trays','fuel','serving_utensils'] : [],
    serve_at:`${date}T${time}:00-05:00`,
    description:`${headcount} guests, ${$('fieldType').value}, $${Math.max(0,Number($('fieldBudget').value)||0)} budget, ${dietary.vegetarian} vegetarians, ${dietary.vegan} vegan, ${dietary.gluten_free} gluten free${$('fieldKitchen').checked?'':' , no kitchen at the venue'}`
  };
}

function renderShape() {
  updateBriefFromFields();
  const brief = session.brief;
  document.querySelectorAll('.shape-step').forEach((step,index) => step.classList.toggle('active', index === appState.shapeStep));
  $('shapeProgressText').textContent = `Step ${appState.shapeStep + 1} of 5`;
  $('shapeProgressBar').style.width = `${(appState.shapeStep + 1) * 20}%`;
  $('shapeProgressTrack').setAttribute('aria-valuenow',String(appState.shapeStep+1));
  $('shapePrevious').hidden = appState.shapeStep === 0;
  $('shapeNext').hidden = appState.shapeStep === 4;
  $('buildPlan').hidden = appState.shapeStep !== 4;
  $('previewType').textContent = label(brief.event_type);
  $('previewTitle').textContent = brief.title;
  const date = new Date(brief.serve_at);
  $('previewMeta').textContent = `${date.toLocaleDateString('en-US',{month:'long',day:'numeric'})} · ${brief.venue_name}`;
  $('previewGuests').textContent = Number(brief.headcount).toLocaleString();
  $('previewBudget').textContent = `$${Number(brief.budget).toLocaleString()}`;
  const needs = Object.entries(brief.dietary || {}).filter(([,count]) => count > 0);
  $('previewNeeds').textContent = needs.length;
  const requirements = [
    `${brief.headcount} guest capacity`,
    brief.venue_has_kitchen ? 'Venue kitchen available' : 'No venue kitchen',
    ...needs.map(([kind,count]) => `${count} ${label(kind)}`),
    `${brief.helpers_available || 0} available helpers`,
    `$${Number(brief.budget).toLocaleString()} ceiling`,
    `${label(brief.priority || 'coverage')} priority`,
    brief.catering_already_booked ? 'Catering already handled' : 'Catering still to source',
    (brief.host_provides || []).includes('warming_trays') ? 'Serving equipment handled' : 'Serving equipment still needed'
  ];
  $('previewRequirements').innerHTML = requirements.map(item => `<span>${esc(item)}</span>`).join('');
}


// The plan really is composed from eight provider contracts and five checks; it
// just happens in under a frame, so it read as a canned result rather than work.
// These are the engine's own stages, paced so you can see them happen.
const GENERATING_STEPS = [
  'Reading your brief',
  'Reading eight provider contracts',
  'Composing service plans',
  'Checking coverage, timing and ownership',
  'Building the run of show'
];

function runGenerating(done) {
  const list = $('generatingSteps'), bar = $('generatingBar');
  const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  list.innerHTML = GENERATING_STEPS.map((step, i) =>
    `<li data-step="${i}"><span>${icon('circle')}</span>${esc(step)}</li>`).join('');
  bar.style.width = '0%';
  openOverlay('generatingOverlay');
  let index = 0;
  const advance = () => {
    if (index > 0) {
      const previous = list.querySelector(`[data-step="${index - 1}"]`);
      previous.classList.remove('active');
      previous.classList.add('done');
      previous.querySelector('span').innerHTML = icon('check');
    }
    if (index === GENERATING_STEPS.length) {
      closeOverlay('generatingOverlay', { restoreFocus: false });
      done();
      return;
    }
    list.querySelector(`[data-step="${index}"]`).classList.add('active');
    bar.style.width = `${Math.round(((index + 1) / GENERATING_STEPS.length) * 100)}%`;
    index += 1;
    setTimeout(advance, instant ? 0 : 380);
  };
  advance();
}

function buildPlan() {
  updateBriefFromFields();
  session.assess();
  if (session.brief.catering_already_booked && !booking) {
    const selected=session.snapshot().options.find(option=>option.id===session.snapshot().selectedOptionId);
    booking={optionId:selected?.id,subtotal:selected?.subtotal||0,total:selected?.subtotal||0,label:'Existing catering provider',eventId:currentEventId,eventTitle:session.brief.title,status:'existing',createdAt:new Date().toISOString()};
    eventOps.commitmentStatus='confirmed';
    eventOps.confirmation.provider=true;
  }
  persist();
  appState.activePhase = firstIncompletePhase(session.snapshot());
  renderWorkspace(session.snapshot());
  $('planReadySummary').textContent = `${session.brief.title} now has a structured brief and ${session.snapshot().readiness.responsibilities.length} operational responsibilities to coordinate.`;
  runGenerating(() => openOverlay('planReadyOverlay'));
}

function phaseState(state) {
  const unresolved = state.readiness.responsibilities.filter(row => row.status === 'unresolved').length;
  const committed = !!currentBooking(state);
  return {
    shape:true,
    source:committed,
    coordinate:committed && unresolved === 0,
    prepare:operationalState(state).status === 'ready',
    run:operationalState(state).status === 'ready'
  };
}

function firstIncompletePhase(state) {
  const status = phaseState(state);
  return PHASES.find(phase => !status[phase]) || 'run';
}

function formatDate(iso) {
  const date = new Date(iso);
  return `${date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · ${date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;
}

function eventMark(title) {
  const words = title.replaceAll('&',' ').split(/\s+/).filter(Boolean);
  return words.slice(0,2).map(word => word[0]).join('').toUpperCase();
}

function renderEventBriefing(state) {
  const operating=operationalState(state);
  const unresolved=state.readiness.responsibilities.filter(row=>row.status==='unresolved').length;
  const committed=currentBooking(state);
  const confirmations=Object.values(eventOps.confirmation).filter(Boolean).length;
  const nextRisk=state.readiness.blockers[0]?.message || (unresolved?`${unresolved} responsibilities still need an owner`:operating.status==='confirmations'?`${5-confirmations} external confirmations remain`:'No critical risks remain');
  $('eventBriefing').innerHTML=`<div class="briefing-main"><span>AT A GLANCE</span><strong>${operating.status==='ready'?'This event is ready to run':state.readiness.state==='ready'?'The operating plan is complete':'The plan still needs decisions'}</strong><p>${state.readiness.counts?.covered ?? state.readiness.responsibilities.length-unresolved}/${state.readiness.responsibilities.length} responsibilities covered · ${state.readiness.blockers.length} blockers · ${unresolved} unowned</p></div><dl><div><dt>Working plan</dt><dd>${committed?`$${Number(committed.total||committed.subtotal).toLocaleString()} selected`:'Not selected'}</dd></div><div><dt>External checks</dt><dd>${confirmations}/5 recorded</dd></div><div><dt>Highest priority</dt><dd>${esc(nextRisk)}</dd></div></dl><div class="briefing-actions"><button class="quiet-button" data-copy-brief>Copy event brief</button>${currentEventId==='sample-wedding'?'<button class="quiet-button" data-toggle-agent-guide>Try with an agent</button>':''}</div>`;
  const guide=$('sampleAgentGuide');
  guide.hidden=currentEventId!=='sample-wedding' || guide.dataset.open!=='true';
  if(currentEventId==='sample-wedding') guide.innerHTML=`<div><strong>Try the shared plan with an agent</strong><p>Copy the tested prompt, send it in ChatGPT, and watch every WebMCP change appear here with a visible receipt.</p></div><pre>Reset the EventReady demo. Select the recommended event plan, change it to staffed service, assign every unresolved responsibility to Roy as organizer, then give me the readiness report and run-of-show.</pre><div class="agent-guide-actions"><button class="primary-button" data-copy-agent-prompt>Copy demo prompt</button><button class="quiet-button" data-reset-sample>Reset sample</button></div><div class="scenario-lab"><span>STRESS-TEST THE PLAN</span><p>See how a real change recalculates cost, coverage, and readiness.</p><div><button class="quiet-button" data-scenario="guests">Increase to 220 guests</button><button class="quiet-button" data-scenario="budget">Reduce budget to $5,000</button></div></div>`;
}

function renderWorkspace(state = session.snapshot()) {
  resetOwnerHues();
  const status = phaseState(state);
  const unresolved = state.readiness.responsibilities.filter(row => row.status === 'unresolved');
  const days = Math.max(0, Math.ceil((new Date(state.brief.serveAt) - new Date()) / 86400000));
  $('eventTitle').textContent = state.brief.title;
  $('eventMeta').textContent = `${formatDate(state.brief.serveAt)} · ${state.brief.venueName}`;
  $('eventAccent').textContent = eventMark(state.brief.title);
  $('eventKindLabel').textContent = currentEventId === 'sample-wedding' ? 'SAMPLE PLAN' : 'SAVED EVENT';
  $('deleteEventButton').hidden = !currentEventId || currentEventId === 'sample-wedding';
  const openCount = unresolved.length + state.readiness.blockers.length;
  const operating=operationalState(state);
  $('eventHealth').textContent = operating.status === 'ready' ? 'Ready to run' : operating.status === 'confirmations' ? 'Confirmations pending' : `${openCount} decision${openCount===1?'':'s'} remaining`;
  $('eventCountdown').textContent = `${days} days to go`;
  renderEventBriefing(state);
  document.querySelectorAll('[data-phase]').forEach(button => {
    const phase = button.dataset.phase;
    const active=phase === appState.activePhase;
    button.classList.toggle('active', active);
    button.classList.toggle('done', status[phase]);
    const marker = button.querySelector('span');
    if (marker) {
      if (!button.dataset.step) button.dataset.step = marker.textContent.trim();
      // A finished phase carries a check. The numeral only ever means "ahead of you".
      marker.innerHTML = status[phase] ? icon('check') : button.dataset.step;
    }
    const cue = button.querySelector('i');
    if (cue && !cue.childElementCount) cue.innerHTML = icon('arrow');
    if (active) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
    button.setAttribute('aria-label',`${button.querySelector('strong')?.textContent || label(phase)} phase, ${active?'current':status[phase]?'complete':'not complete'}`);
  });
  renderShapePhase(state);
  renderSourcePhase(state);
  renderCoordinatePhase(state);
  renderPreparePhase(state);
  renderRunPhase(state);
  renderActivity();
  activatePhase(appState.activePhase, false);
  bindDynamicActions();
}

function renderActivity() {
  const target=$('planActivity');
  if (!target) return;
  const entries=eventOps.activity||[];
  target.innerHTML=`<header><div><h2 id="planActivityTitle">Decision history</h2><p>Every human and agent change explains its effect on the same plan.</p></div><span>${entries.length} recorded</span></header>${entries.length?`<ol>${entries.slice(0,8).map(entry=>`<li><div><strong>${esc(entry.message)}</strong>${entry.details?.length?`<div class="activity-impact">${entry.details.map(detail=>`<b>${esc(detail)}</b>`).join('')}</div>`:''}<span>${esc(entry.actor)} · ${esc(entry.channel)}</span></div><time datetime="${esc(entry.at)}">${new Date(entry.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</time></li>`).join('')}</ol>`:'<p class="activity-empty">Changes made in the interface or through a WebMCP Action will appear here.</p>'}`;
}

function phaseHeader(kicker,title,description,done,labelText='Complete') {
  return `<header class="phase-head"><div><span class="kicker">${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="phase-status ${done?'done':''}">${esc(done?labelText:'In progress')}</span></header>`;
}

function nextAction(title,button,attribute) {
  return `<aside class="next-action"><div><span>NEXT BEST ACTION</span><strong>${esc(title)}</strong></div><button class="primary-button" ${attribute}>${esc(button)} ${icon('arrow')}</button></aside>${impactBanner()}`;
}

function impactBanner() {
  if (!eventOps.lastImpact) return '';
  return `<aside class="impact-banner"><span>${icon('check')}</span><div><strong>Plan updated</strong><small>${esc(eventOps.lastImpact.message)}</small></div><button data-dismiss-impact type="button" aria-label="Dismiss update">×</button></aside>`;
}

function renderShapePhase(state) {
  const open = state.readiness.responsibilities.filter(row => row.status === 'unresolved').length + state.readiness.blockers.length;
  const needs = Object.entries(state.brief.dietary).filter(([,count]) => count > 0).map(([kind,count]) => `${count} ${label(kind)}`).join(', ') || 'None recorded';
  document.querySelector('[data-phase-view="shape"]').innerHTML = `${phaseHeader('PHASE 1','The event, clearly defined','Keep the brief, constraints, and priorities visible before making commitments.',true)}${nextAction('Compare services against this brief','Continue to Source','data-phase-jump="source"')}
    <article class="plan-banner"><div><h3>${esc(state.brief.title)}</h3><p>EventReady is accounting for venue requirements, service coverage, timing, ownership, and budget together.</p></div><div class="decision-count"><strong>${open}</strong><span>open decisions</span></div></article>
    <section class="section-block"><header><h3>Working facts</h3><button class="quiet-button" data-edit-shape>Edit brief</button></header><div class="fact-grid"><div><span>Date & time · ${esc(state.brief.provenance?.serveAt||'given')}</span><strong>${esc(formatDate(state.brief.serveAt))}</strong></div><div><span>Venue · ${esc(state.brief.provenance?.venueName||'given')}</span><strong>${esc(state.brief.venueName)}</strong></div><div><span>Guests · ${esc(state.brief.provenance?.headcount||'given')}</span><strong>${state.brief.headcount}</strong></div><div><span>Budget · ${esc(state.brief.provenance?.budget||'given')}</span><strong>$${Number(state.brief.budget).toLocaleString()}</strong></div></div></section>
    <section class="section-block"><header><h3>Requirements being carried forward</h3><p>Calculated from the current brief</p></header><div class="plan-phases"><article class="plan-phase-row done"><span>${icon('check')}</span><div><h4>Venue foundation</h4><p>${esc(state.brief.venueName)} · ${state.brief.venueHasKitchen?'Kitchen available':'No working kitchen recorded'}</p></div><button data-phase-jump="source">Continue →</button></article><article class="plan-phase-row"><span>2</span><div><h4>Guest needs</h4><p>${esc(needs)}</p></div><button data-edit-shape>Review</button></article><article class="plan-phase-row"><span>3</span><div><h4>Operational ownership</h4><p>${state.readiness.responsibilities.filter(row=>row.status==='unresolved').length} required jobs still need an explicit owner</p></div><button data-phase-jump="coordinate">Open →</button></article></div></section>`;
}

function renderSourcePhase(state) {
  const committed = currentBooking(state);
  const priority=state.rawBrief?.priority || 'coverage';
  const orderedOptions=[...state.options].sort((a,b)=>priority==='budget'?a.subtotal-b.subtotal:priority==='coordination'?(a.blockers-b.blockers||a.vendorCount-b.vendorCount):priority==='experience'?(Number(b.recommended)-Number(a.recommended)||b.subtotal-a.subtotal):(a.blockers-b.blockers||Number(b.recommended)-Number(a.recommended)));
  const options = orderedOptions.map((option,index) => {
    const providerNames=[...new Set((option.items||[]).map(item=>item.vendorName).filter(Boolean))];
    const coverage=option.uncovered?.length ? `${option.uncovered.length} guest need${option.uncovered.length===1?'':'s'} uncovered` : 'All recorded guest needs covered';
    const cheapest=option.subtotal===Math.min(...state.options.map(row=>row.subtotal));
    const fit=option.recommended?'Best operational fit':cheapest?'Lowest estimated cost':option.blockers===Math.min(...state.options.map(row=>row.blockers))?'Lowest coordination burden':'Alternative approach';
    const cheapestCost=Math.min(...state.options.map(row=>row.subtotal));
    const premium=option.subtotal-cheapestCost;
    return `<article class="provider-card ${option.recommended?'recommended':''}"><span class="provider-rank">${String(index+1).padStart(2,'0')}</span><div><span class="fit-label">${fit}</span><h3>${esc(providerNames.join(' + ') || option.label || `Service plan ${index+1}`)}</h3><p>${esc(option.summary || 'Provider plan')}</p><div class="provider-facts"><span>${esc(coverage)}</span><span>${option.itemCount || option.items?.length || 0} package lines</span><span>${option.blockers || 0} blockers remain</span><span>${esc(state.serviceLevel.replaceAll('_',' '))}</span></div>${option.recommended?`<details class="recommendation-proof"><summary>Why this plan ranks first</summary><dl><div><dt>Coverage</dt><dd>${esc(coverage)}</dd></div><div><dt>Coordination</dt><dd>${option.blockers||0} blockers and ${option.vendorCount||providerNames.length} provider handoff${(option.vendorCount||providerNames.length)===1?'':'s'}</dd></div><div><dt>Tradeoff</dt><dd>${premium>0?`$${premium.toLocaleString()} above the lowest-cost option`:'Lowest estimated cost'}</dd></div><div><dt>Evidence</dt><dd>Structured sample provider capabilities; availability and final terms remain unverified</dd></div></dl></details>`:''}</div><aside><small>ESTIMATED PACKAGE</small><strong>$${Number(option.subtotal).toLocaleString()}</strong><button class="primary-button" data-open-package="${esc(option.id)}">${committed?.optionId===option.id?'View working package':'Explore package'}</button></aside></article>`;
  }).join('');
  document.querySelector('[data-phase-view="source"]').innerHTML = `${phaseHeader('PHASE 2','Find the services that complete the plan',`Ranked for ${label(priority)}. Compare coverage, cost, and the operational work each option leaves behind.`,!!committed)}${nextAction(committed?'Coordinate the work this plan leaves behind':'Review the strongest operational fit',committed?'Continue to Coordinate':'Review best fit',committed?'data-phase-jump="coordinate"':`data-open-package="${esc(orderedOptions[0]?.id || '')}"`)}
    <article class="service-brief"><div><span class="kicker">CURRENT REQUIREMENT</span><h3>Reception service for ${state.brief.headcount} guests</h3><p>Must cover recorded dietary needs and fit ${esc(state.brief.venueName)}’s operating requirements.</p></div><span class="sample-label">FICTIONAL SAMPLE PROVIDERS</span></article>
    <section class="provider-legend" aria-label="How to read provider results"><div><strong>Requirements</strong><span>Generated from your brief and venue constraints.</span></div><div><strong>Capabilities</strong><span>Structured sample records read through the same planning contracts used by WebMCP.</span></div><div><strong>Availability</strong><span>Not live. Confirm dates and pricing directly before relying on a provider.</span></div></section>
    <div class="provider-list">${options}</div>
    ${committed?`<article class="commitment commitment-lifecycle"><header><div><span class="kicker">WORKING COMMITMENT</span><h3>${esc(committed.label)}</h3></div><strong>$${Number(committed.total||committed.subtotal).toLocaleString()}</strong></header><div class="lifecycle">${[['selected','Selected'],['requested','Quote requested'],['received','Quote received'],['confirmed','Provider confirmed']].map(([key,text])=>`<button class="${eventOps.commitmentStatus===key?'active':''}" data-commitment-status="${key}"><span>${icon(eventOps.commitmentStatus===key?'dot':'circle')}</span>${text}</button>`).join('')}</div><div class="commitment-evidence"><span>${eventOps.commitmentStatus==='selected'?'WORKING PLAN':eventOps.commitmentStatus==='requested'?'SAMPLE REQUEST':eventOps.commitmentStatus==='received'?'SAMPLE QUOTE':'CONFIRMATION ER-1048'}</span><strong>${eventOps.commitmentStatus==='selected'?'Package saved for review':eventOps.commitmentStatus==='requested'?'Availability request prepared':eventOps.commitmentStatus==='received'?'Quote received · 30% deposit proposed':'Provider terms recorded'}</strong><small>${eventOps.commitmentStatus==='received'?'Sample quote expires in 14 days.':eventOps.commitmentStatus==='confirmed'?'Availability and terms marked verified for this demo.':'Advance the status only when the real-world handoff occurs.'}</small></div><p class="prototype-note">Statuses are simulated locally. No provider was contacted and no payment was taken.</p><div class="handoff-panel"><strong>${eventOps.commitmentStatus==='confirmed'?'Confirmation recorded for this demo':'Provider confirmation required'}</strong><span>Availability, final pricing, contract terms, and deposit must still be verified directly.</span><button class="quiet-button" data-copy-provider-request>Copy confirmation request</button></div><div class="commitment-actions"><button class="quiet-button" data-open-package="${esc(committed.optionId)}">Review package</button><button class="quiet-button danger" data-remove-booking>Remove commitment</button></div></article>`:''}`;
}

function basketState(option) {
  const saved=eventOps.packageRefinement.baskets?.[option.id];
  if (saved?.lines) return saved.lines;
  const guestCount=eventOps.packageRefinement.guestCount || session.snapshot().brief.headcount;
  const ratio=Math.max(.1,guestCount/Math.max(1,session.snapshot().brief.headcount));
  const enriched=(option?.items||[]).map(item=>({...catalog.find(row=>row.catalogKey===`${item.vendor||''}:${item.id}`),...item}));
  return recommendedBasket(enriched,ratio);
}

function saveBasket(option,lines,customized=true) {
  eventOps.packageRefinement.baskets ||= {};
  eventOps.packageRefinement.baskets[option.id]={lines,customized,updatedAt:new Date().toISOString()};
}

function packageTotals(option) {
  const lines=basketState(option);
  const subtotal=lines.length ? basketSubtotal(lines) : 0;
  const delivery=['delivery','dropoff_setup','staffed'].includes(eventOps.packageRefinement.serviceLevel) ? Math.round(subtotal*.06) : 0;
  const cleanup=eventOps.packageRefinement.addCleanup ? 450 : 0;
  const tax=Math.round((subtotal+delivery+cleanup)*(eventOps.ledger.taxRate/100));
  const gratuity=eventOps.packageRefinement.serviceLevel==='staffed' ? Math.round(subtotal*(eventOps.ledger.gratuityRate/100)) : 0;
  return {subtotal,delivery,cleanup,tax,gratuity,total:subtotal+delivery+cleanup+tax+gratuity};
}

function coverageMarkup(metrics) {
  const chips=[];
  chips.push(metrics.servingShort
    ? `<span class="coverage-chip warning">! ${metrics.servingShort} guest servings short</span>`
    : `<span class="coverage-chip good">${icon('check')} ${metrics.servings} guest servings</span>`);
  for (const [kind,result] of Object.entries(metrics.dietary)) {
    if (!result.needed) continue;
    chips.push(result.short
      ? `<span class="coverage-chip warning">! ${result.short} ${esc(label(kind))} short</span>`
      : `<span class="coverage-chip good">${icon('check')} ${result.needed} ${esc(label(kind))}</span>`);
  }
  return chips.join('');
}

function itemUnit(item) {
  if (item.category==='labor') return 'hour';
  if (item.category==='equipment') return 'set';
  return 'package';
}

function catalogMarkup(lines) {
  if (!appState.catalogMode) return '';
  const replacing=lines.find(row=>row.catalogKey===appState.replaceBasketKey);
  const candidates=catalog.filter(item=>{
    if (lines.some(row=>row.catalogKey===item.catalogKey) && item.catalogKey!==replacing?.catalogKey) return false;
    return !replacing || item.category===replacing.category;
  });
  const groups=[...new Set(candidates.map(item=>item.vendorKind))];
  return `<aside class="catalog-drawer" aria-label="Event service catalog"><header><div><span class="kicker">${replacing?'COMPATIBLE SWAPS':'EVENT CATALOG'}</span><h3>${replacing?`Replace ${esc(replacing.name)}`:'Add to this basket'}</h3><p>${replacing?'Alternatives preserve the current quantity.':'Food, equipment, and staffing share the same catalog contract.'}</p></div><button class="quiet-button" data-close-catalog type="button">Done</button></header>${groups.map(kind=>`<section><h4>${esc(label(kind))}</h4><div class="catalog-list">${candidates.filter(item=>item.vendorKind===kind).map(item=>`<article><div><strong>${esc(item.name)}</strong><small>${esc(item.vendorName)} · ${esc(label(item.category))}${item.claimed_serves?` · capacity ${item.claimed_serves}`:''}</small><span>${(item.dietary||[]).map(label).join(' · ')||esc(label(item.provides_resource||itemUnit(item)))}</span></div><div><strong>$${Number(item.price).toLocaleString()}</strong><button class="quiet-button" data-catalog-item="${esc(item.catalogKey)}" type="button">${replacing?'Swap':'Add'}</button></div></article>`).join('')}</div></section>`).join('')||'<p class="empty-basket">No compatible catalog alternatives are available.</p>'}</aside>`;
}

function openPackage(optionId) {
  const state=session.snapshot(); const option=state.options.find(item=>item.id===optionId);
  if (!option) return;
  appState.packageOptionId=optionId;
  const items=basketState(option);
  const totals=packageTotals(option);
  const selectedVendors=[...new Set(items.map(item=>item.vendor).filter(Boolean))].map(slug=>admittedVendors.find(vendor=>vendor.slug===slug)).filter(Boolean);
  const requirements=[...new Set(selectedVendors.flatMap(vendor=>{const level=vendor.service_levels.includes(eventOps.packageRefinement.serviceLevel)?eventOps.packageRefinement.serviceLevel:vendor.service_levels[0];return vendor.requirements?.[level]?.requires||[];}))];
  const providerOwned=new Set([
    ...items.filter(item=>['caterer','bakery'].includes(item.vendorKind)).map(()=>'food'),
    ...items.map(item=>item.provides_resource).filter(Boolean),
    ...(['delivery','dropoff_setup','staffed'].includes(eventOps.packageRefinement.serviceLevel)?['transport']:[]),
    ...(eventOps.packageRefinement.serviceLevel==='staffed'?['setup','service','cleanup']:[])
  ]);
  const teamRequirements=requirements.filter(resource=>!providerOwned.has(resource));
  const requestedGuests=eventOps.packageRefinement.guestCount || state.brief.headcount;
  const metrics=basketMetrics(items,state.brief.dietary,requestedGuests);
  const customized=!!eventOps.packageRefinement.baskets?.[option.id]?.customized;
  $('packageTitle').textContent='Build your event basket';
  $('packageBody').innerHTML=`<div class="package-summary"><div><span class="kicker">${customized?'CUSTOM EVENT BASKET':'RECOMMENDED STARTING BASKET'}</span><h3>${requestedGuests} guests · ${esc(label(state.brief.eventType))}</h3><div class="coverage-strip">${coverageMarkup(metrics)}</div></div><div class="package-total"><span>Working total</span><strong>$${totals.total.toLocaleString()}</strong><small>${metrics.providers} provider${metrics.providers===1?'':'s'} · including estimated fees</small></div></div>
    <section class="package-section"><header class="basket-section-head"><div><span class="section-number">01</span><div><h3>Build the basket</h3><p>Adjust quantities, swap alternatives, or combine services from the catalog.</p></div></div><div class="basket-head-actions"><button class="quiet-button" data-open-catalog="add" type="button">+ Add item</button>${customized?'<button class="quiet-button" data-reset-basket type="button">Restore recommendation</button>':''}</div></header><div class="line-items editable-lines">${items.length?items.map(item=>`<article data-basket-line="${esc(item.catalogKey)}"><div class="line-item-copy"><span class="item-kind">${esc(label(item.vendorKind||item.category))}</span><strong>${esc(item.name)}</strong><small>${esc(item.vendorName||'Sample provider')} · ${item.claimed_serves?`${Number(item.claimed_serves)*item.quantity} capacity`:`${esc(label(item.provides_resource||itemUnit(item)))}`}</small><span>${(item.dietary||[]).map(label).join(', ')||esc(label(item.category||'service'))}</span></div><div class="line-item-controls"><strong>$${Number(item.price*item.quantity).toLocaleString()}</strong><div class="quantity-control" aria-label="Quantity for ${esc(item.name)}"><button data-quantity-delta="-1" data-basket-key="${esc(item.catalogKey)}" type="button" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-quantity-delta="1" data-basket-key="${esc(item.catalogKey)}" type="button" aria-label="Increase quantity">+</button></div><div class="line-actions"><button data-swap-item="${esc(item.catalogKey)}" type="button">Swap</button><button data-remove-item="${esc(item.catalogKey)}" type="button">Remove</button></div></div></article>`).join(''):'<div class="empty-basket"><strong>Your basket is empty</strong><span>Add a catalog item to rebuild coverage.</span></div>'}</div>${catalogMarkup(items)}</section>
    <section class="package-section"><header><div><span class="section-number">02</span><div><h3>Refine the service</h3><p>Changes update cost and the work left to your team.</p></div></div></header><div class="refine-grid"><label>Service level<select id="packageService"><option value="pickup">Pickup</option><option value="delivery">Delivery</option><option value="dropoff_setup">Delivery + setup</option><option value="staffed">Staffed service</option></select></label><label>Guest count<input id="packageGuests" type="number" min="1" value="${requestedGuests}"></label><label class="check-row"><input id="packageCleanup" type="checkbox" ${eventOps.packageRefinement.addCleanup?'checked':''}> Add cleanup crew (+$450)</label><label>Package notes<textarea id="packageNotes" rows="2" placeholder="Menu swaps, service notes, questions…">${esc(eventOps.packageRefinement.notes||'')}</textarea></label></div></section>
    <section class="package-section terms-grid"><div><span class="section-number">03</span><h3>Coverage & handoffs</h3><p><strong>Providers own:</strong> ${providerOwned.size?[...providerOwned].map(label).join(', '):'No capabilities selected'}.</p><p><strong>Your team still owns:</strong> ${teamRequirements.length?teamRequirements.map(label).join(', '):'No package-specific handoffs recorded'}.</p></div><div class="cost-breakdown"><h3>Estimate</h3><p><span>Package</span><strong>$${totals.subtotal.toLocaleString()}</strong></p><p><span>Delivery/service</span><strong>$${totals.delivery.toLocaleString()}</strong></p><p><span>Cleanup add-on</span><strong>$${totals.cleanup.toLocaleString()}</strong></p><p><span>Estimated tax</span><strong>$${totals.tax.toLocaleString()}</strong></p><p><span>Estimated gratuity</span><strong>$${totals.gratuity.toLocaleString()}</strong></p><p class="total"><span>Working total</span><strong>$${totals.total.toLocaleString()}</strong></p><small>Fictional sample pricing. Availability, terms, and final price require provider confirmation.</small></div></section>`;
  $('packageService').value=eventOps.packageRefinement.serviceLevel || state.serviceLevel;
  openOverlay('packageOverlay');
}

function capturePackageControls() {
  if (!$('packageService')) return;
  eventOps.packageRefinement={...eventOps.packageRefinement,serviceLevel:$('packageService').value,guestCount:Number($('packageGuests').value)||session.brief.headcount,addCleanup:$('packageCleanup').checked,notes:$('packageNotes').value.trim(),baskets:eventOps.packageRefinement.baskets||{}};
}

function updatePackageRefinement() {
  capturePackageControls();
  const id=appState.packageOptionId; openPackage(id);
}

function activePackageOption() {
  return session.snapshot().options.find(option=>option.id===appState.packageOptionId);
}

function mutateActiveBasket(change) {
  const option=activePackageOption();
  if (!option) return;
  capturePackageControls();
  saveBasket(option,change(basketState(option)),true);
  openPackage(option.id);
}

function ownerOptions(selected, { setAside = true, unassign = false } = {}) {
  const parts = [];
  if (!selected) parts.push('<option value="" selected>Assign to\u2026</option>');
  for (const person of eventOps.team) {
    parts.push(`<option value="${esc(person.id)}"${person.id === selected ? ' selected' : ''}>${esc(person.name)} \u00b7 ${esc(person.role)}</option>`);
  }
  if (setAside) parts.push(`<option value="not_applicable"${selected === 'not_applicable' ? ' selected' : ''}>Not needed for this event</option>`);
  // Unassign is an option in the owner control rather than a separate button:
  // one card, one place where who-owns-this is decided, including nobody.
  if (unassign) parts.push('<option value="unassigned">Unassign</option>');
  return parts.join('');
}

function ownershipCard(parts) {
  const { id, name, meta, kind, control } = parts;
  return `<article class="ownership-card ${kind}" data-card="${esc(id)}"><div class="ownership-what"><strong>${esc(name)}</strong><small>${esc(meta)}</small></div>${control}</article>`;
}

function renderCoordinatePhase(state) {
  const current = currentBooking(state);
  const rows = state.readiness.responsibilities;
  const domainLabel = Object.fromEntries(state.readiness.domains.map(domain => [domain.id, domain.label]));
  const open = [];
  const settled = [];

  // Two columns, and the crossing between them is the whole point: work starts
  // on the left with no owner and lands on the right once it has one. Rows move
  // here because the move is the progress, unlike grouping by owner, where a
  // row changed column for no reason the eye could use.
  for (const row of rows) {
    const name = label(row.resource);
    const meta = `${row.when || 'Timing to confirm'} \u00b7 ${domainLabel[row.domain] || row.domain}`;
    if (row.owner === 'provider') {
      settled.push(ownershipCard({ id: row.id, name, meta, kind: 'provider',
        control: `<div class="ownership-who"><span class="owner-pill" style="--owner-h:${ownerHue(row.ownerLabel)}">${esc(row.ownerLabel)}</span><small class="owner-note">Provider commitment</small></div>` }));
      continue;
    }
    if (row.status === 'not_applicable') {
      const back = `<select class="assignment-select" data-assign-person="${esc(row.id)}" aria-label="Owner for ${esc(name)}">${ownerOptions('not_applicable', { unassign: true })}</select>`;
      settled.push(ownershipCard({ id: row.id, name, meta, kind: 'set-aside',
        control: `<div class="ownership-who">${back}<small class="owner-note">${esc(row.reason || 'Not needed for this event')}</small></div>` }));
      continue;
    }
    const owned = row.status !== 'unresolved';
    const select = `<select class="assignment-select" data-assign-person="${esc(row.id)}" aria-label="${owned ? 'Owner for' : 'Assign'} ${esc(name)}">${ownerOptions(eventOps.assignmentPeople[row.id], { unassign: owned })}</select>`;
    const control = `<div class="ownership-who">${select}</div>`;
    if (owned) settled.push(ownershipCard({ id: row.id, name, meta, kind: 'owned', control }));
    else open.push(ownershipCard({ id: row.id, name, meta, kind: 'open', control }));
  }

  eventOps.customTasks.forEach((task, index) => {
    const select = `<select class="assignment-select" data-assign-custom="${index}" aria-label="Owner for ${esc(task.name)}">${ownerOptions(task.ownerId, { setAside: false, unassign: !!task.ownerId })}</select>`;
    const card = { id: `custom-${index}`, name: task.name, meta: `${task.when || 'Timing to confirm'} \u00b7 added by you`, control: `<div class="ownership-who">${select}</div>` };
    if (task.ownerId) settled.push(ownershipCard({ ...card, kind: 'owned' }));
    else open.push(ownershipCard({ ...card, kind: 'open' }));
  });

  const emptyOpen = '<p class="column-empty">Every responsibility has an owner.</p>';
  const emptySettled = '<p class="column-empty">Assign something on the left and it lands here.</p>';
  const board = `<div class="ownership-board">
      <section class="ownership-column needs"><header><h3>${icon('alert')} Needs an owner</h3><span>${open.length}</span></header><div class="ownership-stack">${open.length ? open.join('') : emptyOpen}</div></section>
      <section class="ownership-column done"><header><h3>${icon('check')} Assigned</h3><span>${settled.length}</span></header><div class="ownership-stack">${settled.length ? settled.join('') : emptySettled}</div></section>
    </div>`;

  const roster = eventOps.team.map(person => {
    const count = Object.values(eventOps.assignmentPeople).filter(id => id === person.id).length
      + eventOps.customTasks.filter(task => task.ownerId === person.id).length;
    const tally = count ? `${count} responsibilit${count === 1 ? 'y' : 'ies'}` : 'No tasks';
    return `<article><span style="--owner-h:${ownerHue(person.name)}">${esc(eventMark(person.name))}</span><div><strong>${esc(person.name)}</strong><small>${esc(person.role)} \u00b7 ${esc(person.contact || 'No contact added')}</small></div><b>${tally}</b></article>`;
  }).join('');

  const budget = Number(state.brief.budget) || 0;
  const committed = current?.total || current?.subtotal || 0;
  const percent = budget ? Math.min(100, Math.round(committed / budget * 100)) : 0;
  const remaining = rows.filter(row => row.status === 'unresolved').length;
  const deposit = Math.round(committed * (eventOps.ledger.depositRate / 100));
  const organizer = eventOps.team.find(person => person.id === 'roy');
  const assignLabel = `Assign all ${remaining} to ${organizer ? esc(organizer.name) : 'the organizer'}`;

  document.querySelector('[data-phase-view="coordinate"]').innerHTML = `${phaseHeader('PHASE 3','Put an owner on every moving part','Build a small event team, distribute the work, and keep the financial handoffs visible.',!!current && remaining===0)}${nextAction(remaining?`Put an owner on ${remaining} remaining responsibilities`:'Check final readiness',remaining?assignLabel:'Continue to Prepare',remaining?'data-review-assign-all':'data-phase-jump="prepare"')}
    <section class="team-roster" id="teamRoster"><header><div><span class="kicker">YOUR EVENT TEAM</span><h3>${eventOps.team.length} people coordinating this event</h3></div><button class="quiet-button" data-toggle-add-person>+ Add person</button></header><div class="people-list">${roster}</div><form id="addPersonForm" class="add-person-form" hidden><label>Name<input id="newPersonName" required></label><label>Role<input id="newPersonRole" placeholder="Host, coordinator, helper\u2026" required></label><label>Contact<input id="newPersonContact" placeholder="Email or phone"></label><button class="primary-button" type="submit">Add to team</button></form></section>
    ${board}
    <div class="coordinate-grid"><section class="custom-task"><header><div><h3>Something else to coordinate?</h3><p>Add d\u00e9cor, music, photography, permits, transport, or any event-specific handoff. It joins the board on the left until you give it an owner.</p></div></header><form id="customTaskForm"><input id="customTaskName" placeholder="Add a responsibility" required><input id="customTaskWhen" placeholder="Due time or moment"><select id="customTaskOwner">${ownerOptions('', { setAside: false })}</select><button class="quiet-button" type="submit">Add task</button></form></section><aside><div class="budget-panel"><span>Unallocated budget</span><strong>$${Math.max(0,budget-committed-eventOps.ledger.venue).toLocaleString()}</strong><small>of $${budget.toLocaleString()} working budget</small><div class="budget-bar"><i style="width:${percent}%"></i></div><div class="budget-lines"><div><span>Service package</span><strong>$${committed.toLocaleString()}</strong></div><label><span>Venue estimate</span><input id="venueCost" type="number" min="0" value="${eventOps.ledger.venue||''}" placeholder="Not entered"></label><div><span>Deposit (${eventOps.ledger.depositRate}%)</span><strong>$${deposit.toLocaleString()}</strong></div><label class="payment-check"><span>Deposit status</span><span><input id="depositPaid" type="checkbox" ${eventOps.ledger.depositPaid?'checked':''}> Mark paid for demo</span></label><div><span>Contingency target</span><strong>$${Math.round(budget*.1).toLocaleString()}</strong></div></div><div class="handoff-panel"><strong>Payment handoff not connected</strong><span>Demo statuses never represent a processed payment.</span><button class="quiet-button" data-copy-payment-checklist>Copy payment checklist</button></div></div></aside></div>`;
}

function renderPreparePhase(state) {
  const unresolved = state.readiness.responsibilities.filter(row => row.status === 'unresolved');
  const operating=operationalState(state);
  const open = [...state.readiness.blockers.map(item=>({type:'Blocker',title:item.message||item.kind||'Coverage issue',detail:item.detail||'Requires a plan change',route:BLOCKER_ROUTE[item.check]||BLOCKER_ROUTE.coverage})),...unresolved.map(row=>({type:'Unowned',title:label(row.resource).replace(/^./,ch=>ch.toUpperCase()),detail:`${row.when||'Timing to confirm'} · ${row.evidence}`,route:BLOCKER_ROUTE.unclaimed}))];
  const confirmations=Object.values(eventOps.confirmation).filter(Boolean).length;
  document.querySelector('[data-phase-view="prepare"]').innerHTML = `${phaseHeader('EVENT PREFLIGHT',operating.status==='ready'?'Cleared for event day':operating.status==='confirmations'?'The plan is complete. Confirm the real-world handoffs.':'Close the gaps before they become surprises','A plan is only ready when its coverage, people, provider, timing, and critical confirmations agree.',operating.status==='ready','Cleared')}${nextAction(open.length?'Resolve the highest-impact blocker':operating.status==='confirmations'?'Complete the critical confirmations':'Open the operational run plan',open.length?(state.serviceLevel==='pickup'?'Review delivery':'Open Coordinate'):operating.status==='confirmations'?'Review confirmations':'Open Run',open.length?(state.serviceLevel==='pickup'?'data-review-delivery':'data-phase-jump="coordinate"'):operating.status==='confirmations'?'data-scroll-confirmations':'data-phase-jump="run"')}
    <section class="readiness-transition ${operating.status}"><div><span>${state.readiness.state==='ready'?icon('check'):'1'}</span><strong>Operating plan</strong><small>${state.readiness.counts?.covered ?? state.readiness.responsibilities.length-unresolved.length}/${state.readiness.responsibilities.length} covered · ${state.readiness.blockers.length} blockers · ${unresolved.length} unowned</small></div><i></i><div><span>${operating.status==='ready'?icon('check'):'2'}</span><strong>External verification</strong><small>${confirmations}/5 critical facts recorded</small></div><i></i><div><span>${operating.status==='ready'?icon('check'):'3'}</span><strong>Ready to run</strong><small>${operating.status==='ready'?'Shareable operating plan':'Unlocks when both stages agree'}</small></div></section>
    <div class="readiness-matrix" id="readinessAreas">${operating.areas.map(area=>`<article class="${area.status}"><span>${icon(area.status==='ready'?'check':area.status==='blocked'?'alert':'circle')}</span><div><strong>${esc(area.label)}</strong><small>${esc(area.detail)}</small>${(area.confirms||[]).length?`<div class="area-confirms">${area.confirms.map(key=>`<label><input type="checkbox" data-confirmation="${key}" ${eventOps.confirmation[key]?'checked':''}><span><strong>${esc(CONFIRMATION_LABELS[key])}</strong><small>${eventOps.confirmation[key]?'Recorded for this demo plan':'Still needs confirmation'}</small></span></label>`).join('')}</div>`:''}</div><div class="area-action"><b>${esc(area.status==='ready'?'Ready':area.status==='blocked'?'Blocked':'Confirm')}</b>${area.action?`<button class="quiet-button" data-phase-jump="${area.action.phase}">${esc(area.action.label)}</button>`:''}</div></article>`).join('')}</div>
    <p class="readiness-note">${icon('info')}<span>These confirmations record verification for the demo. Nothing here contacts a provider or processes payment.</span></p>
    <div class="readiness-grid"><article class="readiness-card"><span>Coverage</span><strong>${state.readiness.counts?.covered ?? state.readiness.responsibilities.filter(row=>row.status!=='unresolved').length}</strong></article><article class="readiness-card"><span>Blockers</span><strong>${state.readiness.blockers.length}</strong></article><article class="readiness-card"><span>Unowned work</span><strong>${unresolved.length}</strong></article></div>
    <section class="section-block"><header><h3>${open.length?'What still needs attention':operating.status==='ready'?'Every critical need has a clear path':'The operating plan is complete; external confirmations remain'}</h3>${state.serviceLevel==='pickup'&&open.length?'<button class="primary-button" data-review-delivery>Review delivery option</button>':''}</header><div class="blocker-list">${open.length?open.slice(0,12).map(item=>`<article class="blocker-row"><span>${icon('alert')}</span><div><h4>${esc(item.title)}</h4><p>${esc(item.type)} · ${esc(item.detail)}</p></div><button class="quiet-button" data-phase-jump="${item.route.phase}">${esc(item.route.label)}</button></article>`).join(''):operating.status==='ready'?`<article class="commitment"><h3>Ready to run</h3><p>Coverage, timing, ownership, and critical confirmations are satisfied. Open the run plan to share the operating sequence.</p><button class="primary-button" data-phase-jump="run">Open run plan ${icon('arrow')}</button></article>`:`<article class="commitment pending"><h3>Confirm before relying on this plan</h3><p>The operational structure is complete, but provider, deposit, final-count, or venue checks are still outstanding.</p><button class="primary-button" data-scroll-confirmations>Review confirmations ${icon('up')}</button></article>`}</div></section>`;
}

function renderRunPhase(state) {
  const run = state.runOfShow;
  const ready = operationalState(state).status === 'ready';
  const combinedRows=[...run.rows.map((row,index)=>({...row,key:String(index)})),...eventOps.customTasks.map((task,index)=>({at:task.when||'Time TBD',action:task.name,evidence:'Custom responsibility',owner:eventOps.team.find(person=>person.id===task.ownerId)?.name||'Unassigned',key:`custom-${index}`}))];
  const activeIndex=Math.max(0,combinedRows.findIndex(row=>!eventOps.completedRows[row.key]));
  const activeRow=combinedRows[activeIndex]||{at:'—',action:'All scheduled work is complete',evidence:'No open run tasks',owner:'Event team',key:'none'};
  const nextRow=combinedRows[activeIndex+1];
  document.querySelector('[data-phase-view="run"]').innerHTML = `${phaseHeader('EVENT DAY',ready?'The plan everyone can follow':'Your working run-of-show',ready?'Every moment has an owner and evidence from the current plan.':'This remains a draft until critical gaps and ownership are resolved.',ready,ready?'Ready':'Draft')}
    <header class="run-print-head">
      <p class="run-print-kicker">Run of show</p>
      <h1>${esc(state.brief.title)}</h1>
      <p class="run-print-meta">${esc(formatDate(state.brief.serveAt))} · ${esc(state.brief.venueName)}</p>
      <p class="run-print-status">${ready?'Ready to run — every moment has an owner and evidence from the current plan.':'Working draft — resolve the remaining decisions before relying on this plan.'}</p>
    </header>
    <section class="run-mobile-mode"><span class="kicker">NOW IN THE PLAN</span><div class="run-now"><time>${esc(activeRow.at)}</time><div><h3>${esc(activeRow.action)}</h3><p>${esc(activeRow.owner)} · ${esc(activeRow.evidence)}</p></div></div>${activeRow.key!=='none'?`<button class="primary-button" data-complete-row="${esc(activeRow.key)}">Mark complete</button>`:''}${nextRow?`<div class="run-next"><span>UP NEXT · ${esc(nextRow.at)}</span><strong>${esc(nextRow.action)}</strong></div>`:''}<div class="run-mobile-actions"><button class="quiet-button" data-toggle-run-sheet>${appState.runSheetExpanded?'Hide full run sheet':'View full run sheet'}</button><button class="quiet-button" data-report-issue>Report an issue</button></div></section>
    <section class="run-cover"><div><span>${esc(label(state.brief.eventType))}</span><h3>${esc(state.brief.title)}</h3><p>${esc(formatDate(state.brief.serveAt))} · ${esc(state.brief.venueName)}</p></div><aside><span>EVENTREADY</span><strong>${ready?'Ready to share':'Working draft'}</strong></aside></section>
    <div class="run-banner ${ready?'ready':''}"><strong>${ready?'READY TO SHARE':'DRAFT PLAN'}</strong><span>${ready?'Use this sequence with providers and the event team.':'Resolve remaining decisions before relying on this plan.'}</span><div class="run-actions"><details class="share-menu"><summary class="quiet-button">Share ${icon('chevron')}</summary><div><button type="button" data-copy-run>Copy plan</button><button type="button" data-email-run>Email plan</button></div></details><button class="quiet-button" data-print-run>Print</button></div></div>
    <div class="run-contacts"><span class="kicker">EVENT TEAM</span>${eventOps.team.map(person=>`<article><span style="--owner-h:${ownerHue(person.name)}">${esc(eventMark(person.name))}</span><div><strong>${esc(person.name)}</strong><small>${esc(person.role)}</small></div><a href="${person.contact?.includes('@')?'mailto:':'tel:'}${esc(person.contact||'')}">${esc(person.contact||'No contact')}</a></article>`).join('')}</div>
    <div class="run-table run-sheet ${appState.runSheetExpanded?'expanded':''}">${runSegments(run,state).map(segment=>`<section class="run-segment"><header><span class="kicker">${esc(segment.label)}</span><small>${segment.items.length} item${segment.items.length===1?'':'s'}${segment.window?` · ${esc(segment.window)}`:''}</small></header>${segment.items.map(item=>`<article class="run-row ${eventOps.completedRows[item.key]?'complete':''}"><button class="run-check" data-complete-row="${esc(item.key)}" aria-label="Mark ${esc(item.action)} complete">${eventOps.completedRows[item.key]?icon('check'):''}</button><time>${esc(item.at)}</time><div><h4>${esc(item.action)}</h4><p>${esc(item.meta)}</p></div><span class="run-owner${item.owner==='Unassigned'?' unassigned':''}"${item.owner==='Unassigned'?'':` style="--owner-h:${ownerHue(item.owner)}"`}>${item.owner==='Unassigned'?icon('alert'):''}${esc(item.owner)}</span></article>`).join('')}</section>`).join('')}</div>`;
}

// Where a blocker is actually resolved. The engine already tags every finding
// with a check; Prepare used to throw that away and send every "Resolve" button
// to Coordinate, which is the right place for exactly one of these six.
const BLOCKER_ROUTE = {
  coverage:     { phase:'source',     label:'Review packages' },
  quantity:     { phase:'source',     label:'Review packages' },
  availability: { phase:'source',     label:'Review packages' },
  timing:       { phase:'source',     label:'Review service level' },
  unclaimed:    { phase:'coordinate', label:'Assign owners' },
  budget:       { phase:'shape',      label:'Adjust the brief' }
};

const CONFIRMATION_LABELS = {
  provider:'Provider confirms availability',
  terms:'Final price and contract terms reviewed',
  deposit:'Required deposit recorded',
  finalCount:'Final guest count confirmed',
  venueAccess:'Venue access and on-site contact confirmed'
};

function operationalState(state) {
  const engineReady=state.readiness.state==='ready';
  const customUnowned=eventOps.customTasks.filter(task=>!task.ownerId).length;
  const committed=!!currentBooking(state);
  const confirmed=Object.values(eventOps.confirmation).every(Boolean);
  const unowned=state.readiness.counts.unowned||customUnowned;
  const coverageBlockers=state.readiness.blockers.filter(item=>item.check!=='unclaimed');
  const blocker=coverageBlockers[0];
  const choosePackage={phase:'source',label:'Choose a package'};
  const areas=[
    {label:'Requirements coverage',status:coverageBlockers.length?'blocked':'ready',detail:blocker?blocker.message:'Recorded needs have a covered path',
     action:blocker?(BLOCKER_ROUTE[blocker.check]||BLOCKER_ROUTE.coverage):null},
    {label:'Provider commitment',status:!committed?'blocked':eventOps.confirmation.provider&&eventOps.confirmation.terms?'ready':'confirm',detail:!committed?'No working package selected':eventOps.confirmation.provider?'Availability and terms recorded':'Availability or terms not confirmed',
     action:committed?null:choosePackage,confirms:committed?['provider','terms']:[]},
    {label:'People & ownership',status:unowned?'blocked':'ready',detail:unowned?`${unowned} responsibilities unassigned`:'Every required responsibility has a named owner',
     action:unowned?{phase:'coordinate',label:'Assign owners'}:null},
    {label:'Budget & deposit',status:!committed?'blocked':eventOps.confirmation.deposit?'ready':'confirm',detail:!committed?'No working package selected':eventOps.confirmation.deposit?'Deposit status recorded':'Deposit still needs verification',
     action:committed?null:choosePackage,confirms:committed?['deposit']:[]},
    {label:'Final event checks',status:eventOps.confirmation.finalCount&&eventOps.confirmation.venueAccess?'ready':'confirm',detail:eventOps.confirmation.finalCount&&eventOps.confirmation.venueAccess?'Guest count and venue access confirmed':'Final count or venue access still open',
     confirms:['finalCount','venueAccess']}
  ];
  return {status:!engineReady||customUnowned||!committed?'incomplete':confirmed?'ready':'confirmations',areas};
}

function activatePhase(phase, scroll=true) {
  appState.activePhase = PHASES.includes(phase) ? phase : 'shape';
  syncUrl();
  document.querySelectorAll('[data-phase]').forEach(button => {
    const active=button.dataset.phase===appState.activePhase;
    button.classList.toggle('active',active);
    if (active) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-phase-view]').forEach(view => view.classList.toggle('active',view.dataset.phaseView===appState.activePhase));
  if (scroll) window.scrollTo({top:0,behavior:'smooth'});
}

function proposalFor(kind,payload={}) {
  const state = session.snapshot();
  const unresolved = state.readiness.responsibilities.filter(row => row.status === 'unresolved').length;
  if (kind === 'booking') {
    const option = state.options.find(item => item.id === payload.optionId);
    const totals=packageTotals(option);
    const lines=basketState(option); const metrics=basketMetrics(lines,state.brief.dietary,eventOps.packageRefinement.guestCount||state.brief.headcount);
    const dietaryGaps=Object.entries(metrics.dietary).filter(([,result])=>result.short>0);
    const gapCount=(metrics.servingShort?1:0)+dietaryGaps.length;
    const gapText=[metrics.servingShort?`${metrics.servingShort} guest servings`:null,...dietaryGaps.map(([kind,result])=>`${result.short} ${label(kind)} servings`)].filter(Boolean).join(', ');
    return { kind,payload,title:'Add this basket to the working plan?',summary:`Record ${lines.length} customized catalog lines from ${metrics.providers} provider${metrics.providers===1?'':'s'} with ${eventOps.packageRefinement.serviceLevel.replaceAll('_',' ')} service. This starts a commitment record; it does not book or pay a provider.`,before:{cost:currentBooking(state)?.total||0,open:unresolved+state.readiness.blockers.length},after:{cost:totals.total,open:unresolved+state.readiness.blockers.length+gapCount},risk:gapCount?`Coverage is still short by ${gapText}. Availability, final pricing, and contract terms also remain unconfirmed.`:'Availability, final pricing, contract terms, menu changes, and deposit remain unconfirmed.' };
  }
  if (kind === 'delivery') {
    const temp = new EventSession({vendors,demo:{...session.snapshot().rawBrief},venue}); temp.assess(); temp.changeServiceLevel('delivery');
    const after = temp.snapshot();
    return { kind,payload,title:'Switch service from pickup to delivery?',summary:'Recalculate the plan so providers own delivery while your team retains only the obligations not included in that service level.',before:{cost:state.options.find(o=>o.id===state.selectedOptionId)?.subtotal||0,open:unresolved+state.readiness.blockers.length},after:{cost:after.options[0]?.subtotal||0,open:after.readiness.responsibilities.filter(row=>row.status==='unresolved').length+after.readiness.blockers.length},risk:'Delivery can reduce collection work but may still leave setup, equipment, or cleanup unowned.' };
  }
  return { kind:'assignAll',payload,title:'Assign the remaining host work to Roy?',summary:'Give every currently unowned organizer responsibility an explicit owner. Provider commitments are unchanged.',before:{cost:currentBooking(state)?.subtotal||0,open:unresolved+state.readiness.blockers.length},after:{cost:currentBooking(state)?.subtotal||0,open:state.readiness.blockers.length},risk:'Assignment records ownership; it does not prove the person has accepted or can safely perform the work.' };
}

function openProposal(proposal) {
  appState.proposal = proposal;
  $('proposalTitle').textContent = proposal.title;
  $('proposalSummary').textContent = proposal.summary;
  $('proposalDelta').innerHTML = `<div><span>Before</span><strong>${proposal.before.open} open</strong><small>$${Number(proposal.before.cost).toLocaleString()}</small></div><span>${icon('arrow')}</span><div><span>After</span><strong>${proposal.after.open} open</strong><small>$${Number(proposal.after.cost).toLocaleString()}</small></div>`;
  $('proposalRisks').innerHTML = `<strong>Keep in mind</strong><p>${esc(proposal.risk)}</p>`;
  openOverlay('proposalOverlay');
}

function closeProposal() { closeOverlay('proposalOverlay'); appState.proposal = null; }

function applyProposal() {
  const proposal = appState.proposal;
  if (!proposal) return;
  if (proposal.kind === 'booking') {
    const state = session.snapshot(); const option = state.options.find(item => item.id === proposal.payload.optionId);
    if (eventOps.packageRefinement.serviceLevel !== session.serviceLevel) session.changeServiceLevel(eventOps.packageRefinement.serviceLevel);
    session.selectPlan(option.id);
    const basket=basketState(option);
    session.customizeBasket(basket);
    const totals=packageTotals(option);
    const providers=[...new Set(basket.map(item=>item.vendorName).filter(Boolean))];
    booking = { optionId:option.id, subtotal:totals.subtotal, total:totals.total, label:providers.join(' + ') || option.label || 'Selected event basket', eventId:currentEventId, eventTitle:state.brief.title, status:'selected', refinement:{...eventOps.packageRefinement,basket:JSON.parse(JSON.stringify(basket))}, createdAt:new Date().toISOString() };
    eventOps.commitmentStatus='selected';
    eventOps.commitmentUpdatedAt=new Date().toISOString();
    recordImpact(`Package added · $${totals.total.toLocaleString()} now tracked in the working budget.`);
    appState.activePhase = 'coordinate';
  } else if (proposal.kind === 'delivery') {
    session.changeServiceLevel('delivery');
    recordImpact('Delivery moved collection work from your team to the provider plan.');
  } else {
    const openIds=session.snapshot().readiness.responsibilities.filter(row=>row.status==='unresolved').map(row=>row.id);
    session.assignAll('organizer','Roy · Organizer');
    openIds.forEach(id=>{eventOps.assignmentPeople[id]='roy';});
    recordImpact(`${openIds.length} responsibilities assigned to Roy.`);
  }
  closeProposal(); persist(); renderWorkspace(session.snapshot());
}

function bindDynamicActions() {
  [['customTaskName','Responsibility'],['customTaskWhen','Due time or moment'],['customTaskOwner','Task owner']].forEach(([id,name])=>$(id)?.setAttribute('aria-label',name));
  document.querySelectorAll('[data-commitment-status]').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('active'))));
  document.querySelectorAll('.run-check:not([aria-label])').forEach(button=>button.setAttribute('aria-label',`Mark ${button.closest('.run-row')?.querySelector('h4')?.textContent || 'run item'} complete`));
  document.querySelectorAll('[data-phase-jump]').forEach(button => button.onclick = () => activatePhase(button.dataset.phaseJump));
  document.querySelectorAll('[data-edit-shape]').forEach(button => button.onclick = () => { hydrateShapeFields(); renderShape(); showRoute('shape'); });
  document.querySelectorAll('[data-review-option]').forEach(button => button.onclick = () => openProposal(proposalFor('booking',{optionId:button.dataset.reviewOption})));
  document.querySelectorAll('[data-open-package]').forEach(button => button.onclick = () => openPackage(button.dataset.openPackage));
  document.querySelectorAll('[data-assign-person]').forEach(select => select.onchange = () => {
    const id=select.dataset.assignPerson;
    const name=()=>label(session.snapshot().readiness.responsibilities.find(row=>row.id===id)?.resource||'Responsibility');
    if(select.value==='unassigned'){const was=name();delete eventOps.assignmentPeople[id];session.assign(id,'unassigned');
      recordImpact(`${was} unassigned \u2014 it needs an owner again.`);persist();renderWorkspace(session.snapshot());return;}
    if(select.value==='not_applicable'){delete eventOps.assignmentPeople[id];
      session.assign(id,'not_applicable','Not needed','Set aside \u2014 not needed for this event');
      recordImpact(`${name()} set aside \u2014 not needed for this event.`);persist();renderWorkspace(session.snapshot());return;}
    const person=eventOps.team.find(item=>item.id===select.value); if(!person)return;
    eventOps.assignmentPeople[id]=person.id;session.assign(id,'organizer',`${person.name} \u00b7 ${person.role}`);
    recordImpact(`${name()} assigned to ${person.name}.`);persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-assign-custom]').forEach(select=>select.onchange=()=>{
    const task=eventOps.customTasks[Number(select.dataset.assignCustom)];if(!task)return;
    const person=select.value==='unassigned'?null:eventOps.team.find(item=>item.id===select.value);
    task.ownerId=person?person.id:'';
    recordImpact(person?`${task.name} assigned to ${person.name}.`:`${task.name} unassigned \u2014 it needs an owner again.`);
    persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-review-assign-all]').forEach(button => button.onclick = () => openProposal(proposalFor('assignAll')));
  document.querySelectorAll('[data-review-delivery]').forEach(button => button.onclick = () => openProposal(proposalFor('delivery')));
  document.querySelectorAll('[data-remove-booking]').forEach(button => button.onclick = () => { booking=null; eventOps.commitmentStatus='draft'; eventOps.confirmation={...createEventOps().confirmation}; session.assess(); persist(); renderWorkspace(session.snapshot()); });
  document.querySelectorAll('[data-confirmation]').forEach(input => input.onchange=()=>{eventOps.confirmation[input.dataset.confirmation]=input.checked;if(input.dataset.confirmation==='deposit')eventOps.ledger.depositPaid=input.checked;recordImpact(`${input.closest('label')?.querySelector('strong')?.textContent||'Confirmation'} ${input.checked?'recorded':'reopened'}.`);persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-commitment-status]').forEach(button=>button.onclick=()=>{eventOps.commitmentStatus=button.dataset.commitmentStatus;eventOps.commitmentUpdatedAt=new Date().toISOString();if(eventOps.commitmentStatus==='confirmed'){eventOps.confirmation.provider=true;eventOps.confirmation.terms=true;}recordImpact(`${label(button.dataset.commitmentStatus)} added to the commitment history.`);persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-complete-row]').forEach(button=>button.onclick=()=>{const key=button.dataset.completeRow;eventOps.completedRows[key]=!eventOps.completedRows[key];showToast(eventOps.completedRows[key]?'Run item marked complete.':'Run item reopened.');persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-dismiss-impact]').forEach(button=>button.onclick=()=>{eventOps.lastImpact=null;persist();renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-toggle-run-sheet]').forEach(button=>button.onclick=()=>{appState.runSheetExpanded=!appState.runSheetExpanded;renderWorkspace(session.snapshot());});
  document.querySelectorAll('[data-report-issue]').forEach(button=>button.onclick=()=>showToast('Issue noted for the event lead in this demo.'));
  document.querySelectorAll('[data-toggle-add-person]').forEach(button=>button.onclick=()=>{$('addPersonForm').hidden=!$('addPersonForm').hidden;if(!$('addPersonForm').hidden)$('newPersonName').focus();});
  document.querySelectorAll('[data-scroll-team]').forEach(button=>button.onclick=()=>document.getElementById('teamRoster')?.scrollIntoView({behavior:'smooth'}));
  document.querySelectorAll('[data-scroll-confirmations]').forEach(button=>button.onclick=()=>document.getElementById('readinessAreas')?.scrollIntoView({behavior:'smooth',block:'center'}));
  $('addPersonForm')?.addEventListener('submit',event=>{event.preventDefault();const name=$('newPersonName').value.trim();const role=$('newPersonRole').value.trim();if(!name||!role)return;eventOps.team.push({id:`person-${Date.now().toString(36)}`,name,role,contact:$('newPersonContact').value.trim()});persist();renderWorkspace(session.snapshot());});
  $('customTaskForm')?.addEventListener('submit',event=>{event.preventDefault();const name=$('customTaskName').value.trim();if(!name)return;eventOps.customTasks.push({name,when:$('customTaskWhen').value.trim(),ownerId:$('customTaskOwner').value});persist();renderWorkspace(session.snapshot());});
  if ($('venueCost')) $('venueCost').onchange=()=>{eventOps.ledger.venue=Math.max(0,Number($('venueCost').value)||0);persist();renderWorkspace(session.snapshot());};
  if ($('depositPaid')) $('depositPaid').onchange=()=>{eventOps.ledger.depositPaid=$('depositPaid').checked;eventOps.confirmation.deposit=$('depositPaid').checked;persist();renderWorkspace(session.snapshot());};
  const closeShare = button => button.closest('details')?.removeAttribute('open');
  document.querySelectorAll('[data-copy-run]').forEach(button => button.onclick = () => { closeShare(button); copyRun(); });
  document.querySelectorAll('[data-email-run]').forEach(button => button.onclick = () => { closeShare(button); emailRun(); });
  document.querySelectorAll('[data-copy-brief]').forEach(button => button.onclick = copyEventBrief);
  document.querySelectorAll('[data-print-run]').forEach(button => button.onclick = () => window.print());
  document.querySelectorAll('[data-toggle-agent-guide]').forEach(button=>button.onclick=()=>{const guide=$('sampleAgentGuide');guide.dataset.open=guide.dataset.open==='true'?'false':'true';renderWorkspace(session.snapshot());if(guide.dataset.open==='true')guide.scrollIntoView({behavior:'smooth',block:'center'});});
  document.querySelectorAll('[data-copy-agent-prompt]').forEach(button=>button.onclick=()=>copyText('Reset the EventReady demo. Select the recommended event plan, change it to staffed service, assign every unresolved responsibility to Roy as organizer, then give me the readiness report and run-of-show.','Copy the EventReady demo prompt:'));
  document.querySelectorAll('[data-reset-sample]').forEach(button=>button.onclick=resetSample);
  document.querySelectorAll('[data-scenario]').forEach(button=>button.onclick=()=>applyScenario(button.dataset.scenario));
  document.querySelectorAll('[data-copy-provider-request]').forEach(button => button.onclick = () => copyText(`Hello — I’m planning ${session.brief.title} for ${session.brief.headcount} guests on ${formatDate(session.brief.serve_at)}. Please confirm availability, final pricing, inclusions, contract terms, and deposit requirements.`,'Copy this provider request:'));
  document.querySelectorAll('[data-copy-payment-checklist]').forEach(button => button.onclick = () => copyText(`Payment checklist for ${session.brief.title}\n• Confirm final provider price and cancellation terms\n• Verify payee and secure checkout URL\n• Record deposit amount and due date\n• Save receipt and remaining balance date\n• Do not mark paid until the provider confirms`,'Copy this payment checklist:'));
}

async function copyText(text,promptLabel='Copy this text:') {
  try { await navigator.clipboard.writeText(text); } catch { window.prompt(promptLabel,text); }
}

function runPlanText() {
  const run = session.runOfShow();
  return [`${run.event.title} — ${run.status.toUpperCase()}`,...run.rows.map(row=>`${row.at} | ${row.action} | ${row.owner} | ${row.evidence}`)].join('\n');
}

// A run of show is read in segments, not as one flat list. The boundaries come
// from the event's own service time, so a lunch and a late dinner both group
// sensibly rather than against a hardcoded evening.
// A stable colour per owner, so Roy, Maya and Cedar House are told apart at a
// glance instead of all reading as the same purple. Hues are a curated set
// rather than a raw hash, so two owners never land on near-identical colours,
// and the pair is a light background with dark text of the same hue, which
// clears AA at every hue on the wheel.
const OWNER_HUES = [262, 199, 150, 28, 340, 96, 176, 312];
let ownerHues = new Map();

// Seeded from the team in order, then handing the next free hue to each new
// owner as it appears. A hash was doing this and collided twice — Maya with
// Jordan, then Cedar House with Cedar & Salt Events — which defeats the point.
// A registry cannot collide until there are more owners than hues.
function resetOwnerHues() {
  ownerHues = new Map();
  eventOps.team.forEach((person, index) => ownerHues.set(person.name, OWNER_HUES[index % OWNER_HUES.length]));
}

function ownerHue(name) {
  const key = String(name || '').split(' · ')[0].trim();
  if (!key) return OWNER_HUES[0];
  if (!ownerHues.has(key)) ownerHues.set(key, OWNER_HUES[ownerHues.size % OWNER_HUES.length]);
  return ownerHues.get(key);
}


function runSegments(run, state) {
  const clock = value => { const [h,m] = String(value).slice(11,16).split(':').map(Number);
    return Number.isFinite(h) ? h*60+m : 18*60; };
  const serve = clock(state.brief.serveAt);
  const finish = serve + Math.round((Number(state.brief.durationHours)||3)*60);
  const definitions = [
    { id:'confirmed', label:'Confirmed in advance', within:value => value < 0 },
    { id:'earlier',   label:'Earlier that day',     within:value => value < serve - 240 },
    { id:'setup',     label:'Setup',                within:value => value < serve },
    { id:'service',   label:'Service',              within:value => value <= finish },
    { id:'after',     label:'After service',        within:value => value < 2*1440 },
    { id:'later',     label:'Following days',       within:() => true }
  ];
  const items = [
    ...run.rows.map((row,index)=>({key:String(index),at:row.at,action:row.action,owner:row.owner,
      meta:`${row.evidence} · ${state.brief.venueName}`})),
    ...eventOps.customTasks.map((task,index)=>({key:`custom-${index}`,at:task.when||'Time TBD',action:task.name,
      owner:eventOps.team.find(person=>person.id===task.ownerId)?.name||'Unassigned',
      meta:`Custom responsibility · ${state.brief.venueName}`}))
  ];
  return definitions.map(definition => {
    const mine = items.filter(item => {
      const value = chronologicalOrder(item.at);
      return definitions.find(candidate => candidate.within(value)).id === definition.id;
    }).sort((a,b)=>chronologicalOrder(a.at)-chronologicalOrder(b.at));
    // the window a reader scans for: when this part of the day starts and ends
    const timed = mine.map(item=>item.at).filter(at=>/\d/.test(at));
    const window = timed.length>1 && timed[0]!==timed[timed.length-1] ? `${timed[0]} – ${timed[timed.length-1]}` : timed[0]||'';
    return { ...definition, items:mine, window };
  }).filter(segment => segment.items.length);
}

async function copyRun() {
  await copyText(runPlanText(),'Copy the run plan:');
}

// Opens a draft in whatever mail client the reader uses. Nothing is sent from
// here — the same handoff rule the rest of the app follows.
function emailRun() {
  const run = session.runOfShow();
  const subject = `${run.event.title} — run of show (${run.status})`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(runPlanText())}`;
}

async function copyEventBrief() {
  const state=session.snapshot();
  const operating=operationalState(state);
  const committed=currentBooking(state);
  const unresolved=state.readiness.responsibilities.filter(row=>row.status==='unresolved');
  const text=[
    `${state.brief.title} — EVENTREADY BRIEF`,
    `${formatDate(state.brief.serveAt)} · ${state.brief.venueName}`,
    `${state.brief.headcount} guests · $${Number(state.brief.budget).toLocaleString()} working budget`,
    `Status: ${operating.status==='ready'?'Ready to run':operating.status==='confirmations'?'Operating plan complete; external confirmations pending':'Needs decisions'}`,
    `Working plan: ${committed?`${committed.label} · $${Number(committed.total||committed.subtotal).toLocaleString()}`:'Not selected'}`,
    `Coverage: ${state.readiness.counts?.covered ?? state.readiness.responsibilities.length-unresolved.length}/${state.readiness.responsibilities.length} responsibilities · ${state.readiness.blockers.length} blockers · ${unresolved.length} unowned`,
    `External confirmations: ${Object.values(eventOps.confirmation).filter(Boolean).length}/5`,
    '',
    'Open work:',
    ...(unresolved.length?unresolved.map(row=>`• ${label(row.resource)} — ${row.when||'Timing to confirm'}`):['• None'])
  ].join('\n');
  await copyText(text,'Copy the event brief:');
  showToast('Event brief copied.');
}

function resetSample() {
  currentEventId='sample-wedding';
  booking=null;
  eventOps=createEventOps();
  session.reset(false);
  session.assess();
  persist();
  appState.activePhase=firstIncompletePhase(session.snapshot());
  renderWorkspace(session.snapshot());
  showToast('Sample restored to its starting state.');
}

function applyScenario(kind) {
  const before=session.snapshot();
  const patch=kind==='guests'?{headcount:220}:{budget:5000};
  session.assess(patch);
  const after=session.snapshot();
  if(booking) {
    const option=after.options.find(row=>row.id===after.selectedOptionId)||after.options[0];
    booking={...booking,optionId:option?.id||booking.optionId,subtotal:option?.subtotal||booking.subtotal,total:option?.subtotal||booking.total};
  }
  if(kind==='guests') eventOps.confirmation.finalCount=false;
  const message=kind==='guests'?`Guest count increased to ${after.brief.headcount}.`:`Working budget reduced to $${Number(after.brief.budget).toLocaleString()}.`;
  recordImpact(message,'You','Scenario check',impactDetails(before,after));
  persist();
  renderWorkspace(after);
}

function resetApplication() {
  currentEventId=null; session.reset(false); session.assess(); booking=null; eventOps=createEventOps();
  localStorage.removeItem(STATE_KEY); localStorage.removeItem(BOOKING_KEY);
  $('startBrief').value=''; appState={route:'start',activePhase:'shape',shapeStep:0,proposal:null,packageOptionId:null,catalogMode:null,replaceBasketKey:null,pendingBrief:null,runSheetExpanded:false}; showRoute('start');
}

$('startForm').addEventListener('submit',event => { event.preventDefault(); const description=$('startBrief').value.trim(); if(!description){$('startError').hidden=false;$('startBrief').focus();return;} $('startError').hidden=true; openBriefReview(description); });
$('closeBriefReview').onclick=$('editBriefDescription').onclick=()=>{closeOverlay('briefReviewOverlay',{restoreFocus:false});appState.pendingBrief=null;$('startBrief').focus();};
$('confirmBriefReview').onclick=confirmBriefReview;
document.querySelectorAll('[data-start-brief]').forEach(button => button.onclick=()=>{ document.querySelectorAll('[data-start-brief]').forEach(item=>item.setAttribute('aria-pressed','false')); button.setAttribute('aria-pressed','true'); $('startBrief').value=button.dataset.startBrief; $('startBrief').focus(); });
$('sampleWedding').onclick=()=>{resetSample();runGenerating(()=>showRoute('workspace'));};
$('renameEventButton').onclick=startRenameCurrentEvent;
$('cancelRenameEvent').onclick=endRenameCurrentEvent;
$('renameEventForm').onsubmit=event=>{event.preventDefault();if(applyEventRename(currentEventId,$('renameEventInput').value))endRenameCurrentEvent();};
$('deleteEventButton').onclick=()=>askDeleteEvent(currentEventId);
$('cancelDeleteEvent').onclick=()=>closeOverlay('deleteEventOverlay');
$('confirmDeleteEvent').onclick=()=>{closeOverlay('deleteEventOverlay',{restoreFocus:false});if(pendingDeleteId)deleteEvent(pendingDeleteId);pendingDeleteId=null;};
$('newEventButton').onclick=resetApplication; $('backToEvents').onclick=()=>showRoute('start'); $('backToStart').onclick=()=>showRoute('start');
$('shapePrevious').onclick=()=>{appState.shapeStep=Math.max(0,appState.shapeStep-1);renderShape();};
$('shapeNext').onclick=()=>{updateBriefFromFields();appState.shapeStep=Math.min(4,appState.shapeStep+1);renderShape();};
$('buildPlan').onclick=buildPlan;
document.querySelectorAll('#shapeView input,#shapeView select').forEach(input => input.addEventListener('input',renderShape));
document.querySelectorAll('[data-phase]').forEach(button => button.onclick=()=>activatePhase(button.dataset.phase));
$('closeProposal').onclick=$('cancelProposal').onclick=closeProposal; $('applyProposal').onclick=applyProposal;
$('closePackage').onclick=$('cancelPackage').onclick=()=>{closeOverlay('packageOverlay');appState.packageOptionId=null;appState.catalogMode=null;appState.replaceBasketKey=null;};
$('reviewPackage').onclick=()=>{const id=appState.packageOptionId;updatePackageRefinement();closeOverlay('packageOverlay',{restoreFocus:false});openProposal(proposalFor('booking',{optionId:id}));};
$('packageBody').addEventListener('change',event=>{if(['packageService','packageGuests','packageCleanup'].includes(event.target.id))updatePackageRefinement();});
$('packageBody').addEventListener('click',event=>{
  const button=event.target.closest('button');
  if (!button) return;
  if (button.dataset.quantityDelta) {
    mutateActiveBasket(lines=>{const row=lines.find(item=>item.catalogKey===button.dataset.basketKey);return setBasketQuantity(lines,button.dataset.basketKey,Number(row?.quantity||0)+Number(button.dataset.quantityDelta));});
  } else if (button.dataset.removeItem) {
    mutateActiveBasket(lines=>setBasketQuantity(lines,button.dataset.removeItem,0));
  } else if (button.dataset.swapItem) {
    capturePackageControls(); appState.catalogMode='swap'; appState.replaceBasketKey=button.dataset.swapItem; openPackage(appState.packageOptionId);
  } else if (button.dataset.openCatalog) {
    capturePackageControls(); appState.catalogMode='add'; appState.replaceBasketKey=null; openPackage(appState.packageOptionId);
  } else if (button.hasAttribute('data-close-catalog')) {
    appState.catalogMode=null; appState.replaceBasketKey=null; openPackage(appState.packageOptionId);
  } else if (button.hasAttribute('data-reset-basket')) {
    capturePackageControls(); delete eventOps.packageRefinement.baskets[appState.packageOptionId]; appState.catalogMode=null; appState.replaceBasketKey=null; openPackage(appState.packageOptionId);
  } else if (button.dataset.catalogItem) {
    const item=catalog.find(row=>row.catalogKey===button.dataset.catalogItem);
    if (!item) return;
    if (appState.catalogMode==='swap') mutateActiveBasket(lines=>swapBasketItem(lines,appState.replaceBasketKey,item));
    else mutateActiveBasket(lines=>addBasketItem(lines,item,Number(item.minimum||1)));
    if (appState.catalogMode==='swap') { appState.catalogMode=null; appState.replaceBasketKey=null; openPackage(appState.packageOptionId); }
  }
});
$('openWorkspace').onclick=()=>{closeOverlay('planReadyOverlay',{restoreFocus:false});showRoute('workspace');};
$('editReadyBrief').onclick=()=>closeOverlay('planReadyOverlay');

session.subscribe(snapshot => { if(appState.route==='workspace') renderWorkspace(snapshot); });

for (const tool of buildEventReadyTools(session,() => {})) {
  toolHost().registerTool({ ...tool, execute:async input => {
    const before=session.snapshot();
    const result = tool.run(input || {});
    if (tool.name === 'reset_demo_event') {
      booking = null;
      eventOps = createEventOps();
    }
    if (tool.name === 'select_event_plan') {
      const state=session.snapshot();
      const option=state.options.find(item=>item.id===state.selectedOptionId);
      if (option) {
        const providers=[...new Set((option.items||[]).map(item=>item.vendorName).filter(Boolean))];
        booking={
          optionId:option.id,
          subtotal:option.subtotal,
          total:option.subtotal,
          label:providers.join(' + ') || option.label || 'Selected event plan',
          eventId:currentEventId,
          eventTitle:state.brief.title,
          status:'selected',
          refinement:{...eventOps.packageRefinement},
          createdAt:new Date().toISOString()
        };
        eventOps.commitmentStatus='selected';
        eventOps.commitmentUpdatedAt=new Date().toISOString();
      }
    }
    if (tool.name === 'change_service_level' && booking) {
      const state=session.snapshot();
      const option=state.options.find(item=>item.id===state.selectedOptionId) || state.options[0];
      if (option) {
        booking={...booking,optionId:option.id,subtotal:option.subtotal,total:option.subtotal,refinement:{...booking.refinement,serviceLevel:state.serviceLevel}};
        eventOps.packageRefinement.serviceLevel=state.serviceLevel;
      }
    }
    if (!['get_event_brief','get_readiness_report','get_run_of_show'].includes(tool.name)) {
      const summary=session.snapshot().delta?.lines?.[0] || `${label(tool.name)} updated the plan.`;
      recordImpact(summary,'EventReady agent',tool.name,impactDetails(before,session.snapshot()));
    }
    persist();
    if (appState.route !== 'workspace') showRoute('workspace');
    appState.activePhase = firstIncompletePhase(session.snapshot());
    renderWorkspace(session.snapshot());
    return { content:[{type:'text',text:JSON.stringify(result)}] };
  }});
}

document.addEventListener('keydown',event=>{
  if (event.key!=='Escape') return;
  const open=document.querySelector('.overlay:not([hidden])');
  if (open) closeOverlay(open.id);
});

session.assess();
if (booking?.refinement && (!booking.eventId || booking.eventTitle===session.brief.title)) {
  if (booking.refinement.serviceLevel && booking.refinement.serviceLevel!==session.serviceLevel) session.changeServiceLevel(booking.refinement.serviceLevel);
  if (booking.optionId && session.snapshot().options.some(option=>option.id===booking.optionId)) session.selectPlan(booking.optionId);
  if (booking.refinement.basket?.length) session.customizeBasket(booking.refinement.basket);
}
const bootParams = new URLSearchParams(location.search);
if (bootParams.get('view') === 'event') {
  const wantedEvent = bootParams.get('event');
  if (wantedEvent === 'sample-wedding') resetSample();
  else if (wantedEvent && eventStore.events[wantedEvent]) restoreEvent(wantedEvent);
  const wantedPhase = bootParams.get('phase');
  appState.activePhase = PHASES.includes(wantedPhase) ? wantedPhase : firstIncompletePhase(session.snapshot());
  renderWorkspace(session.snapshot());
  showRoute('workspace');
  activatePhase(appState.activePhase, false);
} else showRoute('start');
