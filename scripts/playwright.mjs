// Playwright is deliberately not a dependency of this repo: `npm test` has to run
// with nothing installed, which is the whole point of engine/*.test.mjs. The two
// visual scripts are the exception — they need a real browser — so they resolve
// Playwright from wherever it happens to live.
//
// They used to import it from one absolute path inside a runtime cache on one
// machine. That path no longer exists, so `npm run visual` and `npm run
// screenshots` both failed at the import with a module-not-found naming a
// directory nobody else has.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function globalRoot() {
  try {
    return execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

function candidates() {
  const roots = [globalRoot(), '/usr/local/lib/node_modules', '/opt/homebrew/lib/node_modules',
                 join(process.env.HOME || '', '.npm-global/lib/node_modules')].filter(Boolean);
  const paths = roots.map(root => join(root, 'playwright'));
  if (process.env.PLAYWRIGHT_MODULE) paths.unshift(process.env.PLAYWRIGHT_MODULE);
  return paths;
}

const HELP = `Playwright is not installed.

This repo carries no dependencies so \`npm test\` runs with nothing installed. The
visual scripts are the exception and look for Playwright globally:

  npm i -g playwright && npx playwright install chromium

Or point them at a copy you already have:

  PLAYWRIGHT_MODULE=/path/to/node_modules/playwright npm run visual
`;

export async function loadChromium() {
  // installed in the project, beside it, or on NODE_PATH
  try { return (await import('playwright')).chromium; } catch { /* keep looking */ }

  for (const candidate of candidates()) {
    const entry = ['index.mjs', 'index.js'].map(file => join(candidate, file)).find(existsSync);
    if (!entry) continue;
    try { return (await import(pathToFileURL(entry).href)).chromium; } catch { /* try the next */ }
  }

  process.stderr.write(HELP);
  process.exit(1);
}
