// Shared UI helpers so every page uses the same patterns.
// Open at the top. The real work is done by the inline script in every page's
// <head>: scroll restoration has to be switched off before the browser decides to
// restore, and a module script is deferred, so doing it from here was always too
// late — Chromium happened to forgive it and iOS Safari did not. This is only the
// belt: if a page still arrives scrolled, put it back once. A fragment in the URL
// means the reader asked to land somewhere, so leave it alone.
function openAtTop() {
  if (!location.hash && window.scrollY) window.scrollTo(0, 0);
}

export function mountHeader(active) {
  openAtTop();

  const el = document.getElementById('siteHeader');
  if (!el) return;

  el.innerHTML = docsHeader(active);

  // Sit flush on the sheet until there is something underneath to lift off. The
  // shadow goes on the wrapper, which is the element that actually sticks.
}

const docsDestinations = [
  { label: 'Overview', href: '/developers.html', pages: ['Overview', 'Documentation'] },
  { label: 'Tool reference', href: '/harness.html', pages: ['Tool harness', 'Technical planner'] },
  { label: 'Source quality', href: '/gradient.html', pages: ['Source gradient', 'Vendor site'] },
  { label: 'Verification', href: '/judge.html', pages: ['Judge Mode', 'Discovery check'] }
];

function docsHeader(active) {
  const links = docsDestinations.map(item => {
    const current = item.pages.includes(active);
    return `<a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('');

  return `
    <header class="docs-site-header">
      <div class="docs-site-topline">
        <a class="site-brand" href="/developers.html" aria-label="EventReady WebMCP documentation home">
          <strong><span>Event</span>Ready</strong><i aria-hidden="true"></i><small>WebMCP docs</small>
        </a>
        <a class="docs-product-link" href="/">EventReady app <span aria-hidden="true">↗</span></a>
      </div>
      <nav class="docs-site-nav" aria-label="WebMCP documentation">
        ${links}
      </nav>
    </header>`;
}

export function mountDocsHeader(active) {
  openAtTop();
  const el = document.getElementById('siteHeader');
  if (el) el.innerHTML = docsHeader(active);
}

const referenceDestinations = [
  { label: 'Tool contracts', href: '/developers.html#tool-contracts', pages: ['Tool contracts'] },
  { label: 'Tool harness', href: '/harness.html', pages: ['Tool harness'] },
  { label: 'Discovery check', href: '/smoke.html', pages: ['Discovery check'] },
  { label: 'Source quality', href: '/gradient.html', pages: ['Source gradient'] },
  { label: 'Technical planner', href: '/plan.html', pages: ['Technical planner'] }
];

export function mountDocsSidebar(active) {
  const el = document.getElementById('docsSidebar');
  if (!el) return;
  const links = referenceDestinations.map(item => {
    const current = item.pages.includes(active);
    return `<a href="${item.href}"${current ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('');
  el.className = 'docs-reference-nav';
  el.setAttribute('aria-label', 'WebMCP reference');
  el.innerHTML = `<nav><span>WebMCP reference</span>${links}</nav>
    <div><span>Environment</span><strong><i></i> Production demo</strong><small>No credentials required</small></div>`;
}

export const badge = (kind, text) => `<span class="badge badge-${kind}">${text}</span>`;
export const tierBadge = tier => `<span class="badge badge-tier ${tier}">${tier}</span>`;
export const money = n => (n < 0 ? '\u2212$' : '$') + Math.abs(n);
export const label = s => String(s).replace(/_/g, ' ');

// Vendor text is third-party input and is rendered as text, never as markup.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
