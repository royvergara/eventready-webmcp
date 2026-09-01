import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '/Users/royvergara/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.VISUAL_URL || 'http://localhost:8080';
const out = new URL('../screenshots/release/', import.meta.url);
await mkdir(out, { recursive:true });

const cases = [
  { name:'home-desktop', path:'/', width:1440, height:1000 },
  { name:'home-mobile', path:'/', width:390, height:844 },
  { name:'workspace-mobile', path:'/?view=event', width:390, height:844, exerciseActivity:true },
  { name:'judge-desktop', path:'/judge.html', width:1440, height:1000 },
  { name:'judge-mobile', path:'/judge.html', width:390, height:844 },
  { name:'about-desktop', path:'/developers.html', width:1440, height:1000 },
  { name:'about-mobile', path:'/developers.html', width:390, height:844 }
];

const cachedChromium=join(homedir(),'Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cachedChromium)?cachedChromium:undefined);
const browser = await chromium.launch({ headless:true,executablePath });
let failed = false;
for (const item of cases) {
  const page = await browser.newPage({ viewport:{ width:item.width,height:item.height }, deviceScaleFactor:1 });
  const errors = [];
  page.on('console',message => { if (message.type()==='error') errors.push(message.text()); });
  page.on('pageerror',error => errors.push(error.message));
  const response = await page.goto(`${base}${item.path}`, { waitUntil:'networkidle' });
  if (item.exerciseActivity) {
    await page.locator('[data-open-package]').first().click();
    await page.locator('#reviewPackage').click();
    await page.locator('#applyProposal').click();
  }
  const health = await page.evaluate(() => ({
    title:document.title,
    content:document.body.innerText.trim().length,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    overlay:!!document.querySelector('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay'),
    activity:document.querySelectorAll('#planActivity li').length
  }));
  await page.screenshot({ path:new URL(`${item.name}.png`,out).pathname, fullPage:true });
  const ok=!!response?.ok() && health.content>100 && health.overflow<=1 && !health.overlay && errors.length===0 && (!item.exerciseActivity || health.activity>0);
  console.log(`${ok?'PASS':'FAIL'} ${item.name} · ${response?.status()||'no response'} · overflow ${health.overflow}px · ${errors.length} errors${item.exerciseActivity?` · ${health.activity} receipt${health.activity===1?'':'s'}`:''}`);
  if (!ok) { failed=true; if(errors.length) console.log(errors.join('\n')); }
  await page.close();
}
await browser.close();
if (failed) process.exitCode=1;
