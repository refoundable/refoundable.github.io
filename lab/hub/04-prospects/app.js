// First LPs page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

const saved = DemoStore.load();

const FIRST_GOAL = 10;           // names needed to claim the catalytic investment
const PACT_PER_NAME = 1;         // $K unlocked by each name, up to the goal
const PACT_TOTAL = FIRST_GOAL * PACT_PER_NAME;

const PROMPTS = [
  'Successful friends & family',
  'Angels & investors',
  'Former bosses & mentors',
  'Former colleagues',
  'Founders you’ve helped',
  'Executives & operators',
  'Family offices & advisors',
];

const SAMPLE = [
  ['Julia Ortiz', 0], ['Marcus Feld', 1], ['Dana Okafor', 2], ['Tom Becker', 3],
  ['Sofia Marin', 4], ['Ben Asher', 5], ['Rachel Kim', 6], ['Brad Avery', 3],
  ['Lexie Scott', 5], ['Justin Darcy', 0]
];

// Everyone starts with Decile's CEO on the list, as an example and a head start.
const EXAMPLE = { name: 'Adeo Ressi', prompt: 1, decile: true };

// The list is saved in the shared demo state, so it survives going back and forth.
// Everyone starts at the minimum check (tier 0); check guesses come later, on the dashboard.
const state = {
  prompt: 0,
  people: (saved.people || []).map(p => ({ id: p.id, name: p.name, prompt: p.prompt, tier: p.tier || 0, decile: !!p.decile, fresh: false })),
  signed: !!saved.pactSigned
};
let nextId = state.people.reduce((m, p) => Math.max(m, p.id), 0) + 1;

// Add the example on the first visit only, so removing it keeps it removed.
function addExample() {
  state.people.push({ id: nextId++, ...EXAMPLE, tier: 0, fresh: false });
}
if (!saved.exampleAdded) {
  addExample();
  DemoStore.save({ exampleAdded: true });
}

function persist() {
  DemoStore.save({ people: state.people.map(({ id, name, prompt, tier, decile }) => ({ id, name, prompt, tier, decile })) });
}

const $ = id => document.getElementById(id);
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Number tween so values roll instead of snapping.
const tweens = {};
function tween(el, to, fmt) {
  const from = tweens[el.id] ?? to;
  const t0 = performance.now(), dur = 300;
  cancelAnimationFrame(el._raf);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    const v = from + (to - from) * e;
    el.textContent = fmt(v);
    tweens[el.id] = v;
    if (k < 1) el._raf = requestAnimationFrame(step); else tweens[el.id] = to;
  };
  el._raf = requestAnimationFrame(step);
}

/* ---------- Prompts ---------- */
function buildPrompts() {
  const wrap = $('prompts');
  PROMPTS.forEach((name, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'prompt';
    b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="p-name">${name}</span><span class="p-count"></span>`;
    b.addEventListener('click', () => {
      state.prompt = i;
      renderPrompts();
      $('nameInput').focus();
    });
    wrap.appendChild(b);
  });
}

function renderPrompts() {
  [...$('prompts').children].forEach((b, i) => {
    const n = state.people.filter(p => p.prompt === i).length;
    b.classList.toggle('on', i === state.prompt);
    b.classList.toggle('has', n > 0);
    b.setAttribute('aria-checked', i === state.prompt);
    b.querySelector('.p-count').textContent = n;
  });
}

/* ---------- List ---------- */
function addPerson(name, prompt, fresh = true) {
  state.people.unshift({ id: nextId++, name, prompt, tier: 0, fresh });
}

function personRow(p) {
  const row = document.createElement('div');
  row.className = 'row' + (p.fresh ? ' fresh' : '');
  p.fresh = false;
  row.innerHTML = `<span class="av">${esc(initials(p.name))}</span>
    <span class="r-text"><span class="r-name">${esc(p.name)}${p.decile ? '<span class="r-tag">Decile</span>' : ''}</span><span class="r-rel">${PROMPTS[p.prompt]}</span></span>`;

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'r-x';
  x.setAttribute('aria-label', `Remove ${p.name}`);
  x.textContent = '×';
  x.addEventListener('click', () => { state.people = state.people.filter(q => q.id !== p.id); render(); });
  row.appendChild(x);
  return row;
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';
  state.people.forEach(p => list.appendChild(personRow(p)));

  const n = state.people.length;
  $('empty').hidden = n > 0;
  $('listHead').textContent = `${n} ${n === 1 ? 'name' : 'names'}`;
}

/* ---------- Progress ---------- */
const thousands = v => Math.round(v) ? `$${Math.round(v)}K` : '$0';
const BURST_COLORS = ['#6E5DAA', '#A99BD3', '#3F3168', '#8CBFA4', '#D9D1EE'];
let shown = null;                // names counted at the last render, null before the first

// Card fill color by share of the list done: [share, fill].
// Lilac at the start, deeper violet as it fills, sage once all 10 are in.
const FILL_STOPS = [
  [0,   [239, 235, 248]],
  [0.5, [226, 219, 245]],
  [0.9, [214, 204, 239]],
  [1,   [220, 239, 228]]
];
function fillColor(p) {
  let i = FILL_STOPS.findIndex(s => s[0] >= p);
  if (i <= 0) i = 1;
  const [p0, f0] = FILL_STOPS[i - 1], [p1, f1] = FILL_STOPS[i];
  const k = p1 === p0 ? 1 : (p - p0) / (p1 - p0);
  return `rgb(${f0.map((v, j) => Math.round(v + (f1[j] - v) * k)).join(',')})`;
}

// Restart a CSS animation on an element by toggling its class.
function replay(el, cls) {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}

function floatPlus() {
  const p = document.createElement('span');
  p.className = 'plus';
  p.textContent = `+$${PACT_PER_NAME}K`;
  $('docFx').appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

function burst() {
  const fx = $('docFx');
  for (let i = 0; i < 26; i++) {
    const d = document.createElement('span');
    const a = (i / 26) * Math.PI * 2 + Math.random() * .3;
    const dist = 95 + Math.random() * 55;
    d.className = 'dot' + (i % 3 === 0 ? ' sq' : '');
    d.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    d.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    d.style.setProperty('--r', `${Math.random() * 360}deg`);
    d.style.setProperty('--s', `${5 + Math.random() * 5}px`);
    d.style.setProperty('--c', BURST_COLORS[i % BURST_COLORS.length]);
    d.style.animationDelay = `${Math.random() * 80}ms`;
    fx.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
}

// Each name unlocks $1K, but the $10K can only be claimed once all 10 are in, by
// signing the PACT from the button in this card.
// Once signed, the PACT stays signed even if names are removed later.
function renderProgress() {
  const n = state.people.length;
  const done = n >= FIRST_GOAL || state.signed;
  const left = FIRST_GOAL - n;
  const filled = done ? FIRST_GOAL : n;
  const unlocked = filled * PACT_PER_NAME;

  $('goalLabel').textContent = state.signed ? 'Your PACT is signed'
    : done ? `Your $${PACT_TOTAL}K is unlocked`
    : n === 0 ? `Add ${FIRST_GOAL} names to unlock $${PACT_TOTAL}K`
    : `Add ${left} more name${left === 1 ? '' : 's'} to unlock $${PACT_TOTAL}K`;

  // The card fills left to right, one tenth per name, and shifts color as it goes.
  const card = $('cardFill');
  card.style.width = (filled / FIRST_GOAL * 100) + '%';
  card.style.setProperty('--fill', fillColor(filled / FIRST_GOAL));
  $('progressCard').classList.toggle('full', done);

  // Only a new name animates: the lock nudges, the amount bumps and a "+$1K" floats
  // up. The tenth opens the lock and sets off a burst.
  const doc = $('doc');
  doc.classList.toggle('open', done);
  doc.classList.toggle('signed', state.signed);
  if (shown !== null && filled > shown) {
    replay($('docNum'), 'bump');
    floatPlus();
    if (done) { replay(doc, 'win'); burst(); } else replay($('lock'), 'nudge');
  }
  shown = filled;
  tween($('docNum'), unlocked, thousands);

  $('progNote').hidden = n === 0 || done;
  $('progNote').innerHTML = `<b>$${unlocked}K unlocked so far.</b> Finish the list to claim it. A partial list can’t be claimed.`;
  $('progSub').textContent = state.signed
    ? `Your $${PACT_TOTAL}K catalytic investment is reserved. We’ve emailed you a copy of your PACT. You can keep adding names any time.`
    : done ? `All ${FIRST_GOAL} names are in. Sign your PACT, Decile’s short letter of intent, to claim it. It takes a minute.`
    : `Decile backs new funds with a $${PACT_TOTAL}K catalytic investment. Every name you add unlocks $${PACT_PER_NAME}K. The full $${PACT_TOTAL}K is yours to claim once all ${FIRST_GOAL} are in.`;
  $('pactAct').hidden = !done;
  $('pactBtn').hidden = state.signed;
  $('signedChip').hidden = !state.signed;

  // The main button only ever moves on. Signing lives in the card above, and a prompt
  // on the way out catches anything left undone.
  $('ctaText').textContent = done ? 'Finish setting up' : `Continue without my $${PACT_TOTAL}K`;
}

function render() {
  renderPrompts();
  renderList();
  renderProgress();
  persist();
}

/* ---------- Quick add ---------- */
function submitName() {
  const input = $('nameInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  addPerson(name, state.prompt);
  input.value = '';
  render();
  input.focus();
}

/* ---------- PACT ---------- */
// A short pop-up to sign the PACT. It reuses the shared panel styles from demo.css.
// `leaving` is true when it was opened on the way out, so signing then moves on.
let leaving = false;
function openPact(fromNudge = false) {
  leaving = fromNudge;
  const fund = (saved.story && saved.story.fundName || '').trim() || 'Your fund';
  const size = saved.size >= 1 ? `$${(+saved.size).toFixed(saved.size % 1 ? 1 : 0)}M` : `$${Math.round(saved.size * 1e3)}K`;
  $('pactTerms').innerHTML = [
    ['Fund', fund], ['General partner', saved.name || 'You'], ['Target size', size],
    ['Catalytic investment', `$${PACT_TOTAL}K from Decile`]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('pactName').placeholder = saved.name || 'Your full name';
  $('pactDoneBtn').textContent = leaving ? 'Finish setting up' : 'Back to my list';
  $('pactForm').hidden = false;
  $('pactDone').hidden = true;
  $('pact').hidden = false;
  $('pactName').focus();
  checkPact();
}

function closePact() { $('pact').hidden = true; }

function checkPact() {
  $('pactSign').disabled = !($('pactName').value.trim().length > 1 && $('pactAgree').checked);
}

function signPact() {
  state.signed = true;
  DemoStore.save({ pactSigned: true, pactName: $('pactName').value.trim() });
  $('pactForm').hidden = true;
  $('pactDone').hidden = false;
  render();
}

// One prompt on the way out covers both cases: an unfinished list ('list') or an
// unsigned PACT ('pact'). They can stay and finish, or leave it as a dashboard reminder.
let nudgeKind = null;
function openNudge(kind) {
  nudgeKind = kind;
  const n = state.people.length, left = FIRST_GOAL - n;
  const s = k => k === 1 ? '' : 's';
  if (kind === 'list') {
    $('nudgeTitle').textContent = `You’re ${left} name${s(left)} away`;
    $('nudgeSub').textContent = (n
      ? `You’re ${n} name${s(n)} in, with $${n * PACT_PER_NAME}K unlocked. Add ${left} more to claim your $${PACT_TOTAL}K.`
      : `Add ${FIRST_GOAL} names to claim a $${PACT_TOTAL}K catalytic investment from Decile.`)
      + ' If you go now, your $' + PACT_TOTAL + 'K stays open and we’ll remind you on your dashboard.';
    $('nudgeMain').textContent = 'Finish my list';
    $('nudgeLater').textContent = 'Remind me later';
  } else {
    $('nudgeTitle').textContent = `Your $${PACT_TOTAL}K is waiting`;
    $('nudgeSub').textContent = `You’ve unlocked a $${PACT_TOTAL}K catalytic investment from Decile. Sign your PACT now to claim it, or we’ll keep it ready on your dashboard.`;
    $('nudgeMain').textContent = 'Sign my PACT now';
    $('nudgeLater').textContent = 'Sign later';
  }
  $('nudge').hidden = false;
  $('nudgeMain').focus();
}
function closeNudge() { $('nudge').hidden = true; }

function initPact() {
  $('pactName').addEventListener('input', checkPact);
  $('pactAgree').addEventListener('change', checkPact);
  $('pactSign').addEventListener('click', signPact);
  $('pactName').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('pactSign').disabled) signPact(); });
  $('pactClose').addEventListener('click', closePact);
  $('pactDoneBtn').addEventListener('click', () => leaving ? finish() : closePact());
  $('pact').addEventListener('click', e => { if (e.target === $('pact')) closePact(); });
  $('pactTermsLink').addEventListener('click', e => e.preventDefault());

  // Stay: back to the name field for a short list, or straight to signing for the PACT.
  $('nudgeMain').addEventListener('click', () => {
    closeNudge();
    if (nudgeKind === 'list') $('nameInput').focus();
    else openPact(true);
  });
  $('nudgeLater').addEventListener('click', () => { closeNudge(); finish(); });
  $('nudgeClose').addEventListener('click', closeNudge);
  $('nudge').addEventListener('click', e => { if (e.target === $('nudge')) closeNudge(); });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('pact').hidden) closePact();
    else if (!$('nudge').hidden) closeNudge();
  });
}

/* ---------- Leaving ---------- */
// Save the list and the reminders the dashboard should show, then go there.
function finish() {
  const done = state.people.length >= FIRST_GOAL || state.signed;
  persist();
  DemoStore.save({
    pactSigned: state.signed,
    listTodo: !done,
    pactTodo: done && !state.signed
  });
  DemoNav.go(5);
}

/* ---------- Init ---------- */
function init() {
  buildPrompts();
  initPact();

  $('addBtn').addEventListener('click', submitName);
  $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  // Fills the list up to 10, on top of whoever is already there.
  $('demoFill').addEventListener('click', () => {
    SAMPLE.slice(0, Math.max(0, FIRST_GOAL - state.people.length)).forEach(([name, prompt]) => addPerson(name, prompt));
    render();
  });
  $('demoClear').addEventListener('click', () => {
    state.people = [];
    addExample();
    state.signed = false;
    DemoStore.save({ pactSigned: false, listTodo: false, pactTodo: false });
    render();
  });

  $('pactBtn').addEventListener('click', () => openPact());

  // The main button moves on to the dashboard once the PACT is signed. Otherwise it
  // asks first: finish the list, or sign the PACT that's ready. Choosing later leaves
  // a dashboard reminder (listTodo or pactTodo).
  $('cta').addEventListener('click', () => {
    if (state.signed) finish();
    else openNudge(state.people.length >= FIRST_GOAL ? 'pact' : 'list');
  });

  render();
  // A small nudge on arrival, so the lock reads as something to open.
  if (!state.signed && state.people.length && state.people.length < FIRST_GOAL) {
    setTimeout(() => replay($('lock'), 'nudge'), 700);
  }
}

init();