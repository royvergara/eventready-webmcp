import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '/Users/royvergara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base=process.env.CAPTURE_URL || 'http://localhost:8080';
const out=new URL('../screenshots/',import.meta.url);
await mkdir(out,{recursive:true});
const cached=join(homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cached)?cached:undefined);
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('pageerror',error=>errors.push(error.message));

async function shot(name,{fullPage=true}={}) {
  await page.screenshot({path:new URL(name,out).pathname,fullPage});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if (overflow>1) throw new Error(`${name}: ${overflow}px horizontal overflow`);
  console.log(`PASS ${name} · overflow ${overflow}px`);
}

async function callTool(name,input={}) {
  return page.evaluate(async({name,input})=>{
    const tool=document.modelContext?.tools?.find(item=>item.name===name);
    if(!tool) throw new Error(`tool not registered: ${name}`);
    const result=await tool.execute(input);
    return JSON.parse(result.content[0].text);
  },{name,input});
}

await page.goto(`${base}/`,{waitUntil:'networkidle'});
await shot('01-entry.png');

await page.locator('#sampleWedding').click();
await page.locator('[data-phase="source"]').click();
await shot('02-source.png');

const assessed=await callTool('assess_event_readiness');
const recommended=assessed.options.find(option=>option.recommended) || assessed.options[0];
await callTool('select_event_plan',{option_id:recommended.id});
await page.locator('[data-phase="source"]').click();
await shot('03-commitment.png');

await callTool('change_service_level',{service_level:'staffed'});
let report=await callTool('get_readiness_report');
for (const row of report.responsibilities.filter(item=>item.status==='unresolved')) {
  await callTool('assign_responsibility',{responsibility_id:row.id,owner:'organizer',owner_label:'Roy · Organizer'});
}
report=await callTool('get_readiness_report');
if(report.state!=='ready') throw new Error(`expected ready report, got ${report.state}`);
await page.locator('[data-phase="prepare"]').click();
for (const confirmation of await page.locator('[data-confirmation]').all()) await confirmation.check();
await page.locator('[data-phase="run"]').click();
if((await page.locator('#eventHealth').textContent())!=='Ready to run') throw new Error('visible workspace did not reach Ready to run');
await shot('04-run.png');

await page.goto(`${base}/developers.html`,{waitUntil:'networkidle'});
await shot('05-webmcp.png');

await browser.close();
if(errors.length) {
  console.error(errors.join('\n'));
  process.exitCode=1;
} else {
  console.log('5 submission screenshots captured with no browser errors.');
}
