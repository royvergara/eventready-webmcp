import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { EventSession, buildEventReadyTools } from '../shared/eventready.js';

const root = new URL('../', import.meta.url);
const target = process.env.SMOKE_URL || 'https://eventready-webmcp.vercel.app';
const results = [];
const check = (name, ok, detail='') => results.push({ name, ok, detail });
const warn = (name, detail) => results.push({ name, ok:null, detail });
const load = path => readFile(new URL(path, root), 'utf8');

const requiredFiles = ['index.html','developers.html','judge.html','harness.html','README.md','devpost-submission.md','LICENSE'];
for (const file of requiredFiles) {
  try { await access(new URL(file, root)); check(`artifact:${file}`, true); }
  catch { check(`artifact:${file}`, false, 'missing'); }
}

const [index, readme, submission, developers, judge, demo, fundraiser, venue] = await Promise.all([
  load('index.html'), load('README.md'), load('devpost-submission.md'), load('developers.html'), load('judge.html'),
  load('data/event/demo-wedding.json').then(JSON.parse),
  load('data/event/demo-fundraiser.json').then(JSON.parse),
  load('data/venues/cedar-house.json').then(JSON.parse)
]);
const vendorNames = ['cedar-and-salt','green-fork','masa-y-mas','sweet-bench','casa-vieja','prime-platters','loop-rentals','handoff-staffing'];
const vendors = await Promise.all(vendorNames.map(name => load(`data/vendors/${name}.json`).then(JSON.parse)));

check('consumer entry has brief review', index.includes('briefReviewOverlay'));
check('consumer entry has mobile run mode', (await load('shared/eventready-ui.js')).includes('run-mobile-mode'));
check('README names production URL', readme.includes('https://eventready-webmcp.vercel.app/'));
check('submission names public repository', submission.includes('https://github.com/royvergara/eventready-webmcp'));
check('prototype boundaries disclosed', /fictional reference contracts/i.test(submission) && /does not transact/i.test(submission));

// Pin the reporter. Node's default changed to `spec`, and the count below is read
// out of TAP, so on a newer runtime this reported "0 passing" and failed three
// checks that were actually fine — a false red that would hide a true one.
const testRun = spawnSync(process.execPath, ['--test','--test-reporter=tap','engine/*.test.mjs'], { cwd:new URL('.', root), shell:true, encoding:'utf8' });
const testTotal = Number(testRun.stdout.match(/# tests (\d+)/)?.[1] || 0);
check('deterministic test suite', testRun.status===0 && testTotal>=200, `${testTotal} passing`);
check('README test count current', readme.includes(`${testTotal} tests`), `expected ${testTotal}`);
check('submission test count current', submission.includes(`${testTotal}/${testTotal} passing`) && submission.includes(`for ${testTotal} deterministic tests`), `expected ${testTotal}`);
check('technical pages test count current', developers.includes(`${testTotal} tests`) && judge.includes(`${testTotal} deterministic tests`), `expected ${testTotal}`);

const tools = buildEventReadyTools(new EventSession({vendors,demo,venue}),()=>{});
check('nine WebMCP contracts', tools.length===9 && new Set(tools.map(tool=>tool.name)).size===9, tools.map(tool=>tool.name).join(', '));
for (const [name,event] of [['wedding',demo],['fundraiser',fundraiser]]) {
  try {
    const session = new EventSession({vendors,demo:event,venue});
    session.assess();
    const state=session.snapshot();
    check(`scenario:${name}`, state.options.length>1 && state.readiness.responsibilities.length>0, `${state.options.length} plans · ${state.readiness.responsibilities.length} responsibilities`);
  } catch (error) { check(`scenario:${name}`, false, error.message); }
}

for (const path of ['/','/developers.html','/judge.html','/harness.html']) {
  try {
    const response=await fetch(`${target}${path}`, { redirect:'follow', signal:AbortSignal.timeout(8000) });
    const html=await response.text();
    check(`url:${path}`, response.ok && html.length>500, `${response.status} · ${html.length} bytes`);
  } catch (error) { check(`url:${path}`, false, error.message); }
}

const videoMatch=submission.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/\S+/i);
if (videoMatch) check('public demo video', true, videoMatch[0]);
else warn('public demo video', 'required: add a narrated public YouTube URL under three minutes');

const screenshotFiles=['screenshots/01-entry.png','screenshots/02-source.png','screenshots/03-commitment.png','screenshots/04-run.png','screenshots/05-webmcp.png'];
let screenshotCount=0;
for (const file of screenshotFiles) { try { await access(new URL(file,root)); screenshotCount++; } catch {} }
if (screenshotCount===screenshotFiles.length) check('submission screenshots',true,`${screenshotCount} present`);
else warn('submission screenshots',`${screenshotCount}/${screenshotFiles.length} present; capture the listed judge-facing states`);

for (const result of results) console.log(`${result.ok===true?'PASS':result.ok===false?'FAIL':'WARN'}  ${result.name}${result.detail?` — ${result.detail}`:''}`);
const failures=results.filter(result=>result.ok===false);
const warnings=results.filter(result=>result.ok===null);
console.log(`\n${results.length} checks · ${failures.length} failed · ${warnings.length} pending`);
process.exitCode=failures.length?1:0;
