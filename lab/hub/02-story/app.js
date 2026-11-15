// Fund focus page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

// Plan carried over from step 1 through the shared demo state.
const saved = DemoStore.load();

const PLAN = {
  size: saved.size * 1e6,
  firstCheck: saved.firstCheck * 1e3,
  companies: saved.companies,
  gp: saved.name
};
const FIRST_CLOSE = 0.30;
const INVEST_YEARS = 2;          // same window for new investments as step 1

// label shown on the chip, s used inside the summary sentences
const STAGES = [
  { label: 'Pre-seed', s: 'pre-seed' },
  { label: 'Seed', s: 'seed' },
  { label: 'Pre-seed and seed', s: 'pre-seed and seed' },
  { label: 'Series A', s: 'Series A' },
  { label: 'Series B and later', s: 'later-stage' }
];
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
const SOURCES = [
  { label: 'Founder referrals', s: 'founder referrals' },
  { label: 'Accelerators', s: 'accelerators' },
  { label: 'Incubators and studios', s: 'incubators and studios' },
  { label: 'Friends and personal network', s: 'friends and personal network' },
  { label: 'Former colleagues', s: 'former colleagues' },
  { label: 'Angel groups and syndicates', s: 'angel groups and syndicates' },
  { label: 'Private communities', s: 'private communities' },
  { label: 'University and alumni networks', s: 'university and alumni networks' },
  { label: 'Other investors', s: 'other investors' },
  { label: 'Events and demo days', s: 'events and demo days' },
  { label: 'Inbound', s: 'inbound' },
  { label: 'Other', s: null }
];
// mid is a rough midpoint, used to estimate how selective the fund can be.
// s is the wording used inside sentences.
const DEALS = [
  { label: 'Under 50', s: 'fewer than 50', mid: 35 },
  { label: '50–150', s: '50–150', mid: 100 },
  { label: '150–300', s: '150–300', mid: 225 },
  { label: '300–600', s: '300–600', mid: 450 },
  { label: '600+', s: 'more than 600', mid: 750 }
];
const LEAD = [
  { label: 'Lead the round', s: 'Leading most rounds' },
  { label: 'Co-lead', s: 'Co-leading most rounds' },
  { label: 'Follow other investors', s: 'Following other investors' }
];
const HELP = ['Hiring', 'Go-to-market', 'Fundraising', 'Product', 'Customer intros', 'Industry expertise'];
const EXPERIENCE = [
  { label: 'None yet', s: 'No angel investments yet' },
  { label: '1–5', s: '1–5 angel investments so far' },
  { label: '6–20', s: '6–20 angel investments so far' },
  { label: '20+', s: '20+ angel investments so far' }
];
const TIME = [
  { label: 'Full time', s: 'Full time on the fund' },
  { label: 'Part time to start', s: 'Part time on the fund to start' }
];

// Every question on the page. All of them need an answer before moving on.
const QUESTIONS = [
  { key: 'stage', wrap: 'stageChips', items: STAGES, single: true, todo: 'Pick a stage' },
  { key: 'sectors', wrap: 'sectorChips', items: SECTORS, max: 3, other: 'sectorOther', todo: 'Pick your sectors' },
  { key: 'geos', wrap: 'geoChips', items: GEOS, max: 2, todo: 'Pick where you invest' },
  { key: 'sources', wrap: 'sourceChips', items: SOURCES, max: 3, other: 'sourceOther', todo: 'Pick your deal sources' },
  { key: 'deals', wrap: 'dealChips', items: DEALS, single: true, todo: 'Pick how many deals you see' },
  { key: 'lead', wrap: 'leadChips', items: LEAD, single: true, todo: 'Pick lead or follow' },
  { key: 'help', wrap: 'helpChips', items: HELP, max: 3, todo: 'Pick how you help founders' },
  { key: 'experience', wrap: 'expChips', items: EXPERIENCE, single: true, todo: 'Pick your investing experience' },
  { key: 'time', wrap: 'timeChips', items: TIME, single: true, todo: 'Pick your time on the fund' }
];

const SAMPLE = {
  fundName: 'Northbound Ventures',
  stage: 'Pre-seed',
  sectors: ['AI', 'Enterprise software'],
  sectorOther: '',
  geos: ['North America'],
  sources: ['Founder referrals', 'Former colleagues', 'Private communities'],
  sourceOther: '',
  deals: '150–300',
  lead: 'Lead the round',
  help: ['Hiring', 'Go-to-market', 'Product'],
  experience: '6–20',
  time: 'Full time'
};

const blank = () => ({
  fundName: '', stage: null, sectors: [], sectorOther: '', geos: [],
  sources: [], sourceOther: '', deals: null, lead: null, help: [], experience: null, time: null
});
let state = blank();

const $ = id => document.getElementById(id);
const labelOf = item => (typeof item === 'string' ? item : item.label);
const find = (items, label) => items.find(i => labelOf(i) === label);
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
const ph = s => `<span class="ph">${s}</span>`;

/* ---------- Chips ---------- */
function buildChips(q) {
  const wrap = $(q.wrap);
  wrap.innerHTML = '';
  q.items.forEach(item => {
    const label = labelOf(item);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.value = label;
    b.textContent = label;
    if (q.single) b.setAttribute('role', 'radio');
    b.addEventListener('click', () => {
      if (q.single) {
        state[q.key] = state[q.key] === label ? null : label;
      } else {
        const list = state[q.key];
        const i = list.indexOf(label);
        if (i >= 0) list.splice(i, 1);
        else if (list.length < q.max) list.push(label);
        // "Global" doesn't combine with specific regions.
        if (q.key === 'geos') {
          if (label === 'Global' && list.includes('Global')) state.geos = ['Global'];
          else if (label !== 'Global') state.geos = state.geos.filter(g => g !== 'Global');
        }
      }
      $(q.wrap).closest('.field').classList.remove('need');
      render();
      if (q.other && label === 'Other' && state[q.key].includes('Other')) $(q.other).focus();
    });
    wrap.appendChild(b);
  });
}

function renderChips() {
  QUESTIONS.forEach(q => {
    const v = state[q.key];
    const sel = Array.isArray(v) ? v : v ? [v] : [];
    [...$(q.wrap).children].forEach(b => {
      const on = sel.includes(b.dataset.value);
      b.classList.toggle('on', on);
      b.setAttribute(q.single ? 'aria-checked' : 'aria-pressed', on);
      b.disabled = !!q.max && !on && sel.length >= q.max;
    });
    if (q.other) $(q.other + 'Wrap').hidden = !sel.includes('Other');
  });
}

/* ---------- Answers ---------- */
function answered(q) {
  const v = state[q.key];
  if (!Array.isArray(v)) return !!v;
  if (!v.length) return false;
  return !(q.other && v.includes('Other') && !state[q.other].trim());
}
const missing = () => QUESTIONS.filter(q => !answered(q));

// Words for a multi-pick answer, with "Other" replaced by what they typed.
function picked(key, items, otherKey) {
  return state[key]
    .map(l => (l === 'Other' ? state[otherKey].trim() : (find(items, l).s || l)))
    .filter(Boolean);
}

/* ---------- Deal flow ratio ---------- */
// How many of the deals they see the fund would back, given the portfolio from step 1.
function selectivity() {
  const d = find(DEALS, state.deals);
  const perYear = PLAN.companies / INVEST_YEARS;
  if (!d || !perYear) return null;
  return { perYear: Math.max(1, Math.round(perYear)), r: Math.max(1, Math.round(d.mid / perYear)), label: d.s };
}

function renderRatio() {
  const el = $('ratio');
  const s = selectivity();
  el.hidden = !s;
  if (!s) return;
  const base = `You plan about ${s.perYear} new investments a year. At ${s.label} deals a year, you’d back about <b>1 in ${s.r}</b>`;
  let tone, rest;
  if (s.r < 5) { tone = 'tight'; rest = '. That leaves little room to be choosy, so LPs may ask how you’ll keep quality high.'; }
  else if (s.r <= 25) { tone = 'good'; rest = '. That’s a healthy level of selectivity for a first fund.'; }
  else { tone = 'wide'; rest = '. Very selective, as long as you have time to look at that many deals.'; }
  el.className = 'ratio ' + tone;
  el.innerHTML = base + rest;
}

/* ---------- Summary ---------- */
function focusSentence() {
  const sectors = picked('sectors', SECTORS, 'sectorOther');
  const stage = find(STAGES, state.stage);
  const stagePart = stage ? esc(stage.s) : ph('your stage');
  const sectorPart = sectors.length ? esc(joinList(sectors)) : ph('your sector');
  let geoPart;
  if (state.geos.includes('Global')) geoPart = 'around the world';
  else if (state.geos.length) geoPart = 'in ' + esc(joinList(state.geos));
  else geoPart = 'in ' + ph('your region');
  return `Backing ${stagePart} ${sectorPart} companies ${geoPart}.`;
}

function dealsSentence() {
  const sources = picked('sources', SOURCES, 'sourceOther');
  const from = sources.length ? `Mostly from ${esc(joinList(sources))}.` : ph('Your top deal sources.');
  const s = selectivity();
  const seen = s ? ` Seeing ${esc(s.label)} deals a year, backing about 1 in ${s.r}.` : ' ' + ph('How many deals you see a year.');
  return from + seen;
}

function howSentence() {
  const lead = find(LEAD, state.lead);
  const help = state.help.map(h => h.toLowerCase());
  const exp = find(EXPERIENCE, state.experience);
  const time = find(TIME, state.time);
  const parts = [
    lead ? esc(lead.s) + '.' : ph('Lead or follow.'),
    help.length ? `Helping founders with ${esc(joinList(help))}.` : ph('How you help founders.'),
    exp ? esc(exp.s) + '.' : ph('Investing experience.'),
    time ? esc(time.s) + '.' : ph('Time on the fund.')
  ];
  return parts.join(' ');
}

let lastSig = '';
function renderSummary() {
  const name = state.fundName.trim();
  $('fundName').closest('.pg-name-row').classList.toggle('named', !!name);
  fitName();
  $('pgKicker').textContent = `${name ? 'Fund I' : 'Your first fund'} · ${money(PLAN.size)}`;
  $('pgGP').textContent = PLAN.gp;

  $('pgThesis').innerHTML = focusSentence();
  $('pgDeals').innerHTML = dealsSentence();
  $('pgHow').innerHTML = howSentence();

  const rows = [
    ['Target fund size', money(PLAN.size)],
    ['First close target', money(PLAN.size * FIRST_CLOSE)],
    ['Typical first check', money(PLAN.firstCheck)],
    ['Target Portfolio', `${PLAN.companies} Investments`]
  ];
  $('pgNumbers').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const left = missing();
  const done = QUESTIONS.length - left.length;
  const ready = $('readiness');
  ready.classList.toggle('ready', left.length === 0);
  ready.textContent = left.length === 0 ? '✓ All set' : `${done} of ${QUESTIONS.length} answered`;
  document.body.classList.toggle('incomplete', left.length > 0);

  // Brief highlight on the summary when an answer changes.
  const sig = JSON.stringify(state);
  if (lastSig && sig !== lastSig) {
    const p = $('pager');
    p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash');
  }
  lastSig = sig;
}

function render() {
  renderChips();
  renderRatio();
  renderSummary();
  persist();
}

// Short version for the dashboard: investing style and how they help founders only.
function styleSentence() {
  const lead = find(LEAD, state.lead);
  const help = state.help.map(h => h.toLowerCase());
  if (!lead || !help.length) return '';
  return `${lead.s}. Helping founders with ${joinList(help)}.`;
}

// Save the answers, plus plain-text summary lines for the dashboard.
function persist() {
  const text = html => { const t = document.createElement('div'); t.innerHTML = html; return t.querySelector('.ph') ? '' : t.textContent; };
  DemoStore.save({
    story: Object.assign(JSON.parse(JSON.stringify(state)), {
      thesisText: text(focusSentence()),
      dealsText: text(dealsSentence()),
      styleText: styleSentence(),
      complete: missing().length === 0
    })
  });
}

function fitName() {
  const input = $('fundName');
  const len = (input.value || input.placeholder).length;
  input.style.width = Math.min(len + 1, 30) + 'ch';
}

// Point to the first unanswered question.
function showMissing() {
  const q = missing()[0];
  if (!q) return;
  const field = $(q.wrap).closest('.field');
  field.classList.remove('need'); void field.offsetWidth; field.classList.add('need');
  field.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------- Fill / clear (prototype helpers) ---------- */
function loadState(next) {
  state = next;
  $('fundName').value = state.fundName;
  $('sectorOther').value = state.sectorOther;
  $('sourceOther').value = state.sourceOther;
  document.querySelectorAll('.field.need').forEach(f => f.classList.remove('need'));
  lastSig = '';
  render();
}

/* ---------- Init ---------- */
function init() {
  QUESTIONS.forEach(buildChips);

  $('sectorOther').addEventListener('input', e => { state.sectorOther = e.target.value; render(); });
  $('sourceOther').addEventListener('input', e => { state.sourceOther = e.target.value; render(); });
  $('fundName').addEventListener('input', e => { state.fundName = e.target.value; render(); });
  $('fundName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  $('demoFill').addEventListener('click', () => loadState(JSON.parse(JSON.stringify(SAMPLE))));
  $('demoClear').addEventListener('click', () => loadState(blank()));

  // Every question needs an answer before moving on.
  $('cta').addEventListener('click', () => {
    if (missing().length) { showMissing(); return; }
    persist();
    DemoNav.go(3);
  });

  // Earlier versions of this page saved the custom sector as "other".
  const story = saved.story || {};
  const next = blank();
  Object.keys(next).forEach(k => { if (story[k] !== undefined) next[k] = story[k]; });
  if (!next.sectorOther && story.other) next.sectorOther = story.other;
  loadState(next);
}

init();