// Fund story page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

// Plan carried over from earlier steps through the shared demo state.
const saved = DemoStore.load();

const PLAN = {
  size: saved.size * 1e6,
  minCheck: saved.minCheck * 1e3,
  firstCheck: saved.firstCheck * 1e3,
  companies: saved.companies,
  listed: (saved.people || []).length,
  gp: saved.name
};
const FIRST_CLOSE = 0.30;

const STAGES = ['Pre-seed', 'Seed', 'Pre-seed and seed', 'Series A'];
// label shown on the chip, s used inside the thesis sentence
const SECTORS = [
  { label: 'AI', s: 'AI' },
  { label: 'Fintech', s: 'fintech' },
  { label: 'Climate', s: 'climate' },
  { label: 'Health', s: 'health' },
  { label: 'Enterprise software', s: 'enterprise software' },
  { label: 'Consumer', s: 'consumer' },
  { label: 'Deep tech', s: 'deep tech' },
  { label: 'Other', s: null }
];
const GEOS = ['North America', 'Europe', 'Latin America', 'Africa', 'Middle East', 'South Asia', 'Southeast Asia', 'Global'];
const MAX_SECTORS = 3, MAX_GEOS = 2, MAX_HIGHLIGHTS = 3;

const EXAMPLES = [
  { text: 'Eight years building ML infrastructure at a major cloud provider. I know the engineers who will start the next wave of these companies.', why: 'Insider knowledge' },
  { text: 'I’ve angel invested in 22 companies and helped 30 founders raise their first round. Founders call me before they call anyone else.', why: 'Proven access' },
  { text: 'I ran growth at two fintechs in Lagos. I see the best deals in West Africa months before they reach other investors.', why: 'Unfair network' }
];

const SAMPLE = {
  fundName: 'Northbound Ventures',
  stage: 'Pre-seed',
  sectors: ['AI', 'Enterprise software'],
  other: '',
  geos: ['North America'],
  thesisLine: 'The next generation of AI companies will be built by infrastructure engineers, and they need a first check from someone who speaks their language.',
  why: 'Eight years building ML infrastructure at a major cloud provider. I know the engineers who will start the next wave of these companies, and they already ask me for advice.',
  highlights: ['Early angel in Vectorly (acquired 2024)', 'Led ML platform team of 40 at a major cloud provider', 'Advisor to 12 seed-stage AI startups']
};

const blank = () => ({ fundName: '', stage: null, sectors: [], other: '', geos: [], thesisLine: '', why: '', highlights: [''] });
let state = blank();

const $ = id => document.getElementById(id);
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(d) {
  if (d >= 1e6) return '$' + String(+(d / 1e6).toFixed(d >= 1e7 ? 1 : 2)) + 'M';
  return '$' + Math.round(d / 1e3) + 'K';
}
function joinList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items.join(' and ');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/* ---------- Chips ---------- */
function buildChips(wrapId, items, key, opts) {
  const wrap = $(wrapId);
  wrap.innerHTML = '';
  items.forEach(item => {
    const label = typeof item === 'string' ? item : item.label;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.value = label;
    b.textContent = label;
    b.setAttribute(opts.single ? 'aria-checked' : 'aria-pressed', 'false');
    if (opts.single) b.setAttribute('role', 'radio');
    b.addEventListener('click', () => {
      if (opts.single) {
        state[key] = state[key] === label ? null : label;
      } else {
        const list = state[key];
        const i = list.indexOf(label);
        if (i >= 0) list.splice(i, 1);
        else if (list.length < opts.max) list.push(label);
        // "Global" doesn't combine with specific regions.
        if (key === 'geos' && label === 'Global' && list.includes('Global')) state.geos = ['Global'];
        if (key === 'geos' && label !== 'Global') state.geos = state.geos.filter(g => g !== 'Global' || label === 'Global');
      }
      renderChips();
      renderPager();
      if (key === 'sectors' && label === 'Other' && state.sectors.includes('Other')) $('sectorOther').focus();
    });
    wrap.appendChild(b);
  });
}

function syncChips(wrapId, selected, max) {
  const sel = Array.isArray(selected) ? selected : selected ? [selected] : [];
  [...$(wrapId).children].forEach(b => {
    const on = sel.includes(b.dataset.value);
    b.classList.toggle('on', on);
    b.setAttribute(b.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', on);
    b.disabled = !!max && !on && sel.length >= max;
  });
}

function renderChips() {
  syncChips('stageChips', state.stage);
  syncChips('sectorChips', state.sectors, MAX_SECTORS);
  syncChips('geoChips', state.geos, MAX_GEOS);
  $('sectorOtherWrap').hidden = !state.sectors.includes('Other');
}

/* ---------- Highlights ---------- */
function renderHighlights() {
  const wrap = $('highlights');
  wrap.innerHTML = '';
  state.highlights.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'hl';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 80;
    input.value = h;
    input.placeholder = ['e.g. Early angel in Acme (acquired 2024)', 'e.g. Helped 30 founders raise their first round', 'e.g. Former VP Product at a public fintech'][i];
    input.setAttribute('aria-label', `Highlight ${i + 1}`);
    input.addEventListener('input', () => { state.highlights[i] = input.value; renderPager(); });
    row.appendChild(input);
    if (state.highlights.length > 1) {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'hl-x';
      x.setAttribute('aria-label', `Remove highlight ${i + 1}`);
      x.textContent = '×';
      x.addEventListener('click', () => { state.highlights.splice(i, 1); renderHighlights(); renderPager(); });
      row.appendChild(x);
    }
    wrap.appendChild(row);
  });
  $('addHighlight').hidden = state.highlights.length >= MAX_HIGHLIGHTS;
}

/* ---------- Counters ---------- */
function setCount(id, value, max) {
  const el = $(id);
  el.textContent = `${value.length} / ${max}`;
  el.classList.toggle('near', value.length > max * 0.9);
}

/* ---------- One-pager ---------- */
function thesisSentence() {
  const sectors = state.sectors
    .map(l => l === 'Other' ? state.other.trim() : SECTORS.find(s => s.label === l).s)
    .filter(Boolean);
  const stage = state.stage ? state.stage.toLowerCase() : null;
  const hasAny = stage || sectors.length || state.geos.length;
  if (!hasAny) return null;

  const stagePart = stage ? esc(stage) : '<span class="ph">your stage</span>';
  const sectorPart = sectors.length ? esc(joinList(sectors)) : '<span class="ph">your sector</span>';
  let geoPart;
  if (state.geos.includes('Global')) geoPart = 'around the world';
  else if (state.geos.length) geoPart = 'in ' + esc(joinList(state.geos));
  else geoPart = 'in <span class="ph">your region</span>';
  return `Backing ${stagePart} ${sectorPart} companies ${geoPart}.`;
}

const READY_CHECKS = [
  { ok: () => state.stage && state.sectors.length && state.geos.length, todo: 'Pick your stage, sectors and region' },
  { ok: () => state.why.trim().length >= 20, todo: 'Add why you' }
];

let lastPager = '';
function renderPager() {
  const name = state.fundName.trim();
  $('fundName').closest('.pg-name-row').classList.toggle('named', !!name);
  fitName();

  $('pgKicker').textContent = `${name ? 'Fund I' : 'Your first fund'} · First close target ${money(PLAN.size * FIRST_CLOSE)}`;
  $('pgGP').textContent = PLAN.gp;

  const t = thesisSentence();
  $('pgThesis').innerHTML = t || '<span class="ph">Backing your stage and sector companies in your region.</span>';
  $('pgThesisLine').textContent = state.thesisLine.trim();

  const why = state.why.trim();
  $('pgWhy').innerHTML = why ? esc(why) : '<span class="ph">This is where your edge goes: what you know, or who you know, that others don’t.</span>';

  const hl = state.highlights.map(h => h.trim()).filter(Boolean);
  $('pgHighlightsWrap').hidden = hl.length === 0;
  $('pgHighlights').innerHTML = hl.map(h => `<li>${esc(h)}</li>`).join('');

  const rows = [
    ['Target fund size', money(PLAN.size)],
    ['First close target', money(PLAN.size * FIRST_CLOSE)],
    ['Minimum LP check', money(PLAN.minCheck)],
    ['Typical first check', money(PLAN.firstCheck)],
    ['Portfolio', `About ${PLAN.companies} companies`]
  ];
  $('pgNumbers').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const missing = READY_CHECKS.filter(c => !c.ok());
  const ready = $('readiness');
  ready.classList.toggle('ready', missing.length === 0);
  ready.textContent = missing.length === 0 ? '✓ Ready for your first 10' : 'Next: ' + missing[0].todo.toLowerCase();

  // Brief highlight on the one-pager when it changes in a meaningful way.
  const sig = [t, why.length > 0, hl.length, name].join('|');
  if (lastPager && sig !== lastPager) {
    const p = $('pager');
    p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash');
  }
  lastPager = sig;
  persist(t);
}

// Save the story, plus a plain-text thesis for the dashboard once every part is filled in.
function persist(thesisHtml) {
  let thesisText = '';
  if (thesisHtml && !thesisHtml.includes('class="ph"')) {
    const tmp = document.createElement('div');
    tmp.innerHTML = thesisHtml;
    thesisText = tmp.textContent;
  }
  DemoStore.save({ story: Object.assign(JSON.parse(JSON.stringify(state)), { thesisText }) });
}

function fitName() {
  const input = $('fundName');
  const len = (input.value || input.placeholder).length;
  input.style.width = Math.min(len + 1, 30) + 'ch';
}

/* ---------- Fill / clear (prototype helpers) ---------- */
function loadState(next) {
  state = next;
  $('fundName').value = state.fundName;
  $('sectorOther').value = state.other;
  $('thesisLine').value = state.thesisLine;
  $('whyYou').value = state.why;
  setCount('thesisCount', state.thesisLine, 160);
  setCount('whyCount', state.why, 280);
  renderChips();
  renderHighlights();
  lastPager = '';
  renderPager();
}

/* ---------- Help: book a call (prototype, no real scheduling) ---------- */
const START = new Date(2026, 10, 14);
const SLOT_TIMES = ['10:00 AM', '1:30 PM', '4:00 PM'];
const booking = { day: null, time: null };

function nextWeekdays(n) {
  const out = [], d = new Date(START);
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
  }
  return out;
}

function renderBooking() {
  [...$('days').children].forEach((b, i) => b.classList.toggle('on', i === booking.day));
  const slots = $('slots');
  slots.innerHTML = '';
  if (booking.day !== null) {
    SLOT_TIMES.forEach(t => {
      const b = document.createElement('button');
      b.textContent = t;
      b.classList.toggle('on', t === booking.time);
      b.addEventListener('click', () => { booking.time = t; renderBooking(); });
      slots.appendChild(b);
    });
  }
  $('bookConfirm').disabled = booking.day === null || !booking.time;
}

function initBooking() {
  const days = nextWeekdays(4);
  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${d.toLocaleString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b>${d.toLocaleString('en-US', { month: 'short' })}`;
    b.addEventListener('click', () => { booking.day = i; booking.time = null; renderBooking(); });
    $('days').appendChild(b);
  });

  const panel = $('book');
  const open = () => {
    booking.day = 0; booking.time = null;
    $('bookPick').hidden = false; $('bookDone').hidden = true;
    renderBooking();
    panel.hidden = false;
  };
  const close = () => { panel.hidden = true; };

  $('helpBtn').addEventListener('click', open);
  $('bookClose').addEventListener('click', close);
  $('bookDoneBtn').addEventListener('click', close);
  panel.addEventListener('click', e => { if (e.target === panel) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  $('bookConfirm').addEventListener('click', () => {
    const d = days[booking.day];
    $('bookWhen').textContent = `${d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${booking.time}.`;
    $('bookPick').hidden = true; $('bookDone').hidden = false;
    $('helpBtn').firstChild.textContent = 'Call booked';
  });
}

/* ---------- Init ---------- */
function init() {
  $('chipSize').textContent = money(PLAN.size);
  $('chipList').textContent = `${PLAN.listed} ${PLAN.listed === 1 ? 'name' : 'names'} on your list`;

  buildChips('stageChips', STAGES, 'stage', { single: true });
  buildChips('sectorChips', SECTORS, 'sectors', { max: MAX_SECTORS });
  buildChips('geoChips', GEOS, 'geos', { max: MAX_GEOS });

  $('examples').innerHTML = EXAMPLES.map(e => `<div class="ex"><p>${esc(e.text)}</p><span>${esc(e.why)}</span></div>`).join('');

  $('sectorOther').addEventListener('input', e => { state.other = e.target.value; renderPager(); });
  $('thesisLine').addEventListener('input', e => { state.thesisLine = e.target.value; setCount('thesisCount', state.thesisLine, 160); renderPager(); });
  $('whyYou').addEventListener('input', e => { state.why = e.target.value; setCount('whyCount', state.why, 280); renderPager(); });
  $('fundName').addEventListener('input', e => { state.fundName = e.target.value; renderPager(); });
  $('fundName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  $('addHighlight').addEventListener('click', () => {
    if (state.highlights.length >= MAX_HIGHLIGHTS) return;
    state.highlights.push('');
    renderHighlights();
    const inputs = $('highlights').querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  });

  $('demoFill').addEventListener('click', () => loadState(JSON.parse(JSON.stringify(SAMPLE))));
  $('demoClear').addEventListener('click', () => loadState(blank()));

  $('cta').addEventListener('click', () => {
    renderPager();
    DemoNav.go(5);
  });

  initBooking();
  const story = saved.story;
  loadState(story ? Object.assign(blank(), story, { highlights: story.highlights && story.highlights.length ? story.highlights : [''] }) : blank());
}

init();
