import assert from 'node:assert';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// shared/tailwind.css is generated and committed, so it can fall out of step with the
// markup: add a utility class to a page, forget to regenerate, and the class silently
// does nothing. That is how the option buttons ended up centred — `text-left` was in
// the markup and not in the stylesheet, so the browser's own button default won.
//
// This lives under engine/ because that is where `npm test` looks. It needs no tailwind
// install: it only checks that every class the pages use resolves to something we ship.

const pages = readdirSync('.').filter(f => f.endsWith('.html'));
const tailwind = readFileSync('shared/tailwind.css', 'utf8');
const components = readFileSync('shared/ui.css', 'utf8');
const componentSelectors = readdirSync('shared')
  .filter(file => file.endsWith('.css') && file !== 'tailwind.css')
  .map(file => readFileSync(`shared/${file}`, 'utf8'))
  .join('\n');

// Every page that loads docs.css is a documentation page and is built from one
// template. There used to be four, grown one page at a time: three shell classes,
// three body classes, three content classes, two sidebars and two names for the
// same header. They drifted exactly where you would expect — the reading column
// was 780px on the overview and 970px on the reference pages, the title dropped a
// size between them, and the five pages that happened to link ui.css wore a 2px
// carbon rule across the masthead that the other two never had.
const docPages = pages.filter(page => readFileSync(page, 'utf8').includes('/shared/docs.css'));

// The retired names. Any one of them reappearing means a page has started a
// fifth template rather than using the one that exists.
const RETIRED = ['harness-shell', 'docs-reference-shell', 'harness-body', 'technical-body',
                 'harness-main', 'technical-main', 'docs-reference-nav', 'mountHeader'];

test('every documentation page is built from the one template', () => {
  assert.ok(docPages.length >= 7, `expected the documentation set, found ${docPages.length}`);
  for (const page of docPages) {
    const html = readFileSync(page, 'utf8');
    const sheets = [...html.matchAll(/<link rel="stylesheet" href="\/shared\/([a-z.]+\.css)/g)].map(m => m[1]);
    assert.deepEqual(sheets, ['fonts.css', 'tailwind.css', 'ui.css', 'docs.css'],
      `${page} loads a different set of stylesheets, so a component rule applies here and not there`);
    assert.match(html, /<body class="docs-body">/, `${page} does not use the one body class`);
    assert.match(html, /mountDocsHeader\(/, `${page} does not mount the shared masthead`);
  }
});

// Comments are where the retired names belong: the reason a rule exists is often
// the thing it replaced. Strip them, so this reads code and not prose.
const withoutComments = source => source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('no page has started a template of its own', () => {
  for (const page of [...docPages, 'shared/docs.css', 'shared/ui.js']) {
    const source = withoutComments(readFileSync(page, 'utf8'));
    const found = RETIRED.filter(name => source.includes(name));
    assert.deepEqual(found, [], `${page} still refers to ${found.join(', ')}`);
  }
});

test('the retired-template guard would actually catch a relapse', () => {
  // stripping comments must not strip the code with them
  assert.ok(withoutComments('/* .harness-shell was here */\n.docs-shell{color:red}')
    .includes('.docs-shell{color:red}'));
  for (const name of RETIRED) {
    assert.ok(withoutComments(`.${name}{color:red}`).includes(name), `${name} would slip through`);
  }
});

test('the documentation shell reserves the same three columns everywhere', () => {
  // The third column carries a table of contents on the overview and nothing on
  // the rest. Reserved either way: that is what keeps the sidebar and the reading
  // column on identical pixels, so moving between pages shifts nothing.
  const shell = readFileSync('shared/docs.css', 'utf8')
    .match(/\.docs-shell\{([^}]*)\}/)?.[1] ?? '';
  assert.match(shell, /grid-template-columns:var\(--docs-sidebar-width\) minmax\(0,var\(--docs-content-width\)\) var\(--docs-toc-width\)/,
    'the shell no longer declares all three columns');

  for (const page of docPages.filter(p => readFileSync(p, 'utf8').includes('class="docs-shell"'))) {
    const html = readFileSync(page, 'utf8');
    assert.match(html, /<(aside|main)[^>]*class="docs-sidebar"|id="docsSidebar"/,
      `${page} is missing the shared sidebar`);
    assert.match(html, /<main class="docs-content">/, `${page} is missing the shared content column`);
  }
});

test('product.css is imported unlayered', () => {
  // A cascade layer here is a trap worth a test of its own: tailwind's preflight
  // is unlayered, an unlayered rule beats a layered one at any specificity, and
  // the whole design system would silently lose its borders and margins on every
  // page that loads this file while index.html — which links product.css directly —
  // kept them. One stylesheet must not behave two ways.
  const docs = readFileSync('shared/docs.css', 'utf8');
  assert.match(docs, /@import url\('\/shared\/product\.css[^']*'\);/,
    'product.css is imported into a cascade layer again');
});

test('the create-another-event action only appears inside a workspace', () => {
  const html = readFileSync('index.html', 'utf8');
  const ui = readFileSync('shared/eventready-ui.js', 'utf8');
  assert.match(html, /id="newEventButton"[^>]*hidden[^>]*>Create another event/);
  assert.match(ui, /newEventButton'\)\.hidden = route !== 'workspace'/);
  assert.match(html, /id="planActivity"[^>]*aria-labelledby="planActivityTitle"/);
  assert.match(ui, /recordImpact\(message, actor='You', channel='Interface', details=\[\]\)/);
  assert.match(ui, /'EventReady agent',tool\.name/);
  assert.match(ui, /tool\.name === 'select_event_plan'[\s\S]*booking=\{/,
    'an agent plan selection must create the same visible working-plan record as the interface');
  assert.match(ui, /tool\.name === 'reset_demo_event'[\s\S]*eventOps = createEventOps\(\)/,
    'the demo reset must clear both engine and visible operational state');
  assert.match(ui, /!\['get_event_brief','get_readiness_report','get_run_of_show'\]\.includes\(tool\.name\)/,
    'read-only WebMCP calls must not create mutation receipts');
});

// Class names our own stylesheet defines: .chit, .btn, .row-name, .tape …
const OWN = new Set([...componentSelectors.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));

// Tailwind escapes anything outside [A-Za-z0-9-] in a selector, and uses the CSS
// numeric escape for a comma: text-[clamp(1rem,2vw,3rem)] becomes
// .text-\[clamp\(1rem\2c 2vw\2c 3rem\)\], and hover:x becomes .hover\:x:hover.
const selectorFor = token =>
  '.' + token.replace(/[^\w-]/g, ch => (ch === ',' ? '\\2c ' : '\\' + ch));

// Remove ${ … } expressions, matching braces so a nested template literal does not
// end the scan early. What is left is the literal class text.
function stripExpressions(value) {
  let out = '', depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (!depth && value[i] === '$' && value[i + 1] === '{') { depth = 1; i++; continue; }
    if (depth) {
      if (value[i] === '{') depth++;
      else if (value[i] === '}') depth--;
      continue;
    }
    out += value[i];
  }
  return out;
}

// Inside a class attribute, a ternary picks between quoted sets of classes. Those are
// real classes too, so read them — but only tokens shaped like a utility, to avoid
// mistaking a piece of copy such as 'You' for one.
function classesInExpressions(value) {
  const out = [];
  for (const expr of value.match(/\$\{[\s\S]*?\}/g) || []) {
    for (const quoted of expr.match(/'([^']*)'|"([^"]*)"/g) || []) {
      for (const token of quoted.slice(1, -1).split(/\s+/)) {
        if (/^[a-z][a-z0-9]*[-:][\w:./[\]-]*$/.test(token)) out.push(token);
      }
    }
  }
  return out;
}

function classesUsedIn(html) {
  const found = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const token of stripExpressions(m[1]).split(/\s+/)) if (token) found.add(token);
    for (const token of classesInExpressions(m[1])) found.add(token);
  }
  return found;
}

test('every class the pages use exists in a stylesheet we ship', () => {
  const missing = [];
  for (const page of pages) {
    for (const token of classesUsedIn(readFileSync(page, 'utf8'))) {
      if (OWN.has(token)) continue;
      if (token.startsWith('js-')) continue;   // a hook for querySelector, not a style
      if (tailwind.includes(selectorFor(token))) continue;
      missing.push(`${page}: ${token}`);
    }
  }
  assert.deepEqual(missing, [],
    'these classes do nothing — regenerate shared/tailwind.css (see tailwind.config.js)');
});

test('the guard would actually catch a stale stylesheet', () => {
  // a class nobody uses is absent from the generated CSS, which is what staleness
  // looks like; if this ever passes, the check above has stopped checking anything
  assert.ok(!tailwind.includes(selectorFor('text-right')), 'unused classes are not generated');
  assert.ok(tailwind.includes(selectorFor('text-left')), 'used ones are');
});

test('the generated stylesheet carries the design tokens, not just stock utilities', () => {
  // if the config were ignored these would silently fall back to nothing. One per
  // category the config extends — colours, radius, shadow, family — and every one has
  // to be a class the pages still use, because tailwind only generates what it finds.
  for (const token of ['text-ink-mute', 'bg-paper-card', 'bg-paper-sunk', 'border-rule',
                       'text-carbon', 'rounded-chit', 'hover:shadow-chit', 'font-mono']) {
    assert.ok(tailwind.includes(selectorFor(token)), `${token} is missing from the stylesheet`);
  }
});

// Everything a page fetches on its own, without the reader asking for it: a script,
// a frame, an image, a stylesheet, an icon, a preloaded font.
const subresources = html => [
  ...[...html.matchAll(/\ssrc(?:set)?="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/<link\b[^>]*\shref="(https?:\/\/[^"]+)"/g)].map(m => m[1])
];

test('the pages ask for nothing from a third party', () => {
  // the whole point of vendoring: a conference network cannot break the demo.
  //
  // What breaks a demo is what the page LOADS. This used to match every absolute
  // URL in the markup, which meant the documentation could not link to the
  // repository or the licence without failing — an <a href> fetches nothing until
  // a reader clicks it, and by then they have left. So the guard reads the
  // attributes that actually issue a request, and a plain link is left alone.
  for (const page of pages) {
    assert.deepEqual(subresources(readFileSync(page, 'utf8')), [],
      `${page} loads something from off-origin`);
  }
});

test('the third-party guard would actually catch a third party', () => {
  // narrowing it to the loading attributes is only safe while it still fires on
  // every one of them; if this ever fails, the check above has stopped checking
  for (const markup of ['<script src="https://cdn.example.com/x.js"></script>',
                        '<img src="https://cdn.example.com/x.png">',
                        '<iframe src="https://cdn.example.com/x.html"></iframe>',
                        '<link rel="stylesheet" href="https://fonts.example.com/x.css">']) {
    assert.equal(subresources(markup).length, 1, `not caught: ${markup}`);
  }
  // and stays quiet on a link the reader has to choose to follow
  assert.deepEqual(subresources('<a href="https://github.com/royvergara/eventready-webmcp">repo</a>'), []);
});

test('the stylesheet the pages link to is the one that is committed', () => {
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    assert.ok(html.includes('/shared/tailwind.css'), `${page} does not link the generated stylesheet`);
    assert.ok(!html.includes('cdn.tailwindcss.com'), `${page} still loads Tailwind from a CDN`);
  }
});

test('every vendored font file the stylesheet asks for is actually committed', () => {
  // the fonts are served from this origin so a conference network cannot break the
  // demo. A @font-face pointing at a file we deleted fails silently — the browser
  // just falls back — so check the paths resolve, and that none of them is remote.
  const fonts = readFileSync('shared/fonts.css', 'utf8');
  const urls = [...fonts.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/['"]/g, ''));
  assert.ok(urls.length > 0, 'no @font-face src found at all');
  for (const url of urls) {
    assert.ok(!/^https?:/.test(url), `${url} is loaded from a third party`);
    assert.ok(existsSync('.' + url), `${url} is referenced but not committed`);
  }
});

test('every face the design system names is one we actually ship', () => {
  // A stale family name renders in a system fallback and looks like a bug nobody
  // can explain. The stacks live in tailwind.config.js now, so that is what to
  // read — ui.css only ever says var(--font-…).
  const shipped = new Set([...readFileSync('shared/fonts.css', 'utf8')
    .matchAll(/font-family:\s*'([^']+)'/g)].map(m => m[1]));
  // read the emitted --font-* stacks rather than the config's source: this is what
  // the browser actually resolves, and it does not depend on how the config is
  // written. A first version scraped every quoted string in the config and flagged
  // "DEFAULT", which is a palette key, not a typeface.
  const generic = /^(inherit|monospace|serif|sans-serif|system-ui|ui-monospace|ui-sans-serif|Georgia)$/;
  const named = new Set([...tailwind.matchAll(/--font-[\w-]*\s*:\s*([^;}]+)/g)]
    .flatMap(m => m[1].split(',').map(f => f.trim().replace(/^["']|["']$/g, '')))
    .filter(f => f && !generic.test(f)));
  assert.ok(named.size >= 3, 'the generated stylesheet no longer names any face');
  for (const family of named) {
    assert.ok(shipped.has(family), `the design system names ${family}, which fonts.css does not ship`);
  }
});

// A component class and a utility class have the same specificity, so whichever
// stylesheet is linked last wins — and ui.css is linked last. That means a bare
// `.field { padding: … }` silently beats `py-1` in the markup. It is invisible:
// the class is present, the rule is real, the page just ignores it. It cost the
// assumption inputs their width, padding and font size all at once.
const PROPERTY_OF = [
  [/^w-/, 'width'], [/^max-w-/, 'max-width'], [/^h-/, 'height'],
  [/^p-/, 'padding'], [/^px-/, 'padding'], [/^py-/, 'padding'],
  [/^text-(\[|xs$|sm$|base$|lg$|xl$|\dxl$)/, 'font-size'],
  [/^font-(mono|sans|serif)$/, 'font-family'],
  [/^font-(thin|light|normal|medium|semibold|bold|extrabold|black)$/, 'font-weight'],
  [/^leading-/, 'line-height'], [/^tracking-/, 'letter-spacing'],
  [/^m-/, 'margin'], [/^mx-/, 'margin'], [/^my-/, 'margin'],
];
const propertyFor = token => (PROPERTY_OF.find(([re]) => re.test(token)) || [])[1];

// every rule in ui.css written as one bare class, and the properties it sets.
// Comments are stripped first: an earlier version anchored on the previous `}`
// and so skipped any rule that had a comment above it, which is most of them —
// including the one this test exists to catch.
function bareClassRules(css) {
  const rules = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const cls = selector.trim().match(/^\.([A-Za-z][\w-]*)$/);
    if (!cls) continue;                       // qualified or compound: it can lose safely
    const props = new Set([...body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)]
      .map(d => d[1].replace(/^(padding|margin|font)-.*/, '$1')));
    rules.set(cls[1], new Set([...(rules.get(cls[1]) || []), ...props]));
  }
  return rules;
}

test('no component rule silently overrides a utility used beside it', () => {
  const rules = bareClassRules(components);
  const clashes = [];
  for (const page of pages) {
    for (const m of readFileSync(page, 'utf8').matchAll(/class="([^"]*)"/g)) {
      const tokens = [...stripExpressions(m[1]).split(/\s+/), ...classesInExpressions(m[1])].filter(Boolean);
      for (const component of tokens.filter(t => rules.has(t))) {
        for (const token of tokens) {
          const prop = propertyFor(token);
          if (prop && rules.get(component).has(prop)) {
            clashes.push(`${page}: .${component} sets ${prop}, so ${token} does nothing`);
          }
        }
      }
    }
  }
  assert.deepEqual([...new Set(clashes)], [],
    'give the component rule lower specificity, e.g. input:where(.field) { … }');
});

test('every page turns off scroll restoration before it parses', () => {
  // This has to be an inline script in <head>. A module script is deferred, so
  // setting it from shared/ui.js runs after the document is parsed — after the
  // browser has already decided what to restore. That is the bug this replaced:
  // it looked fine in Chromium and dropped an iPhone partway down the page.
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /<script>[^<]*scrollRestoration\s*=\s*'manual'/,
      `${page} does not set scrollRestoration inline in <head>`);
  }
});

test('the header reserves its space before the script that fills it runs', () => {
  // Every page mounts the masthead into #siteHeader from a module script, and module
  // scripts are deferred — so the page is laid out once without the header and again
  // with it. Without a reserved height the content sits 55px too high in between,
  // which is a jump on every load and, on a slow connection, a window in which the
  // browser positions the viewport against a layout that is about to change.
  const rule = components.match(/#siteHeader\s*\{([^}]*)\}/);
  assert.ok(rule, 'ui.css no longer styles #siteHeader at all');
  assert.match(rule[1], /min-height:/, '#siteHeader must hold the header\'s height in advance');
  assert.match(rule[1], /position:\s*sticky/,
    'the sticky belongs on the wrapper: on the inner header it depends on display:contents');
  assert.doesNotMatch(rule[1], /display:\s*contents/,
    'display:contents gives the wrapper no box, so it can reserve no height');
});

test('the component layer restates no token value', () => {
  // The palette used to be written down twice — here as tailwind tokens, and again
  // as custom properties in ui.css. They drifted: darkening --ink-mute for contrast
  // fixed the components and left every `text-ink-mute` utility on the old value,
  // so the pages looked half-fixed and only measuring caught it.
  //
  // tailwind.config.js now emits the custom properties itself, so ui.css consumes
  // them and never restates one. This test keeps it that way: a raw hex or a
  // literal font stack in the component layer means a value has been copied, and
  // a copy is a drift waiting to happen.
  const hex = [...components.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map(m => m[0]);
  assert.deepEqual(hex, [], 'ui.css hard-codes a colour; add it to tailwind.config.js and use var()');

  const stacks = [...components.matchAll(/font-family:\s*([^;]+);/g)]
    .map(m => m[1].trim()).filter(v => !v.startsWith('var('));
  assert.deepEqual(stacks, [], 'ui.css hard-codes a font stack; use var(--font-…)');

  // and the properties it reaches for must be ones the config actually emits
  const emitted = new Set([...readFileSync('shared/tailwind.css', 'utf8')
    .matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const wanted = new Set([...components.matchAll(/var\((--[\w-]+)\)/g)].map(m => m[1]));
  const missing = [...wanted].filter(v => !emitted.has(v) && !components.includes(`${v}:`));
  assert.deepEqual(missing, [], 'ui.css reads a custom property nothing declares');
});
