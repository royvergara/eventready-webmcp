const landing = document.getElementById('landingExperience');
const brief = document.getElementById('eventBrief');
const view = new URLSearchParams(location.search).get('view');

function openSample(description = '') {
  const url = new URL(location.href);
  url.searchParams.set('view', 'event');
  history.pushState({}, '', url);
  document.body.classList.remove('landing-mode');
  landing.hidden = true;
  document.title = 'Event plan · EventReady';
  window.scrollTo({ top: 0, behavior: 'instant' });
  window.dispatchEvent(new CustomEvent('eventready:create', { detail: { description } }));
}

if (view === 'event') openSample();

document.querySelectorAll('[data-brief]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.classList.contains('event-row')) {
      openSample(button.dataset.brief);
      return;
    }
    brief.value = button.dataset.brief;
    brief.focus();
  });
});

document.getElementById('planningStarter').addEventListener('submit', event => {
  event.preventDefault();
  if (!brief.value.trim()) {
    brief.focus();
    brief.closest('.planning-starter').classList.add('needs-brief');
    return;
  }
  openSample(brief.value.trim());
});

brief.addEventListener('input', () => brief.closest('.planning-starter').classList.remove('needs-brief'));
document.getElementById('exploreSample').addEventListener('click', () => openSample('120 guests, wedding reception, $35000 budget, 14 vegetarians, 6 vegan, 8 gluten free, no kitchen at the venue'));
window.addEventListener('popstate', () => location.reload());
