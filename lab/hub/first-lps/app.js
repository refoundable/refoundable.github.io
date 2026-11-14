// First LPs page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

// Plan carried over from earlier steps through the shared demo state.
const saved = DemoStore.load();

const PLAN = {
  size: saved.size * 1e6,
  minCheck: saved.minCheck * 1e3,
  preset: saved.preset,
  lps: saved.plan.lps,
  prospects: saved.plan.prospects,
  known: saved.known
};
const GP_COMMIT = 0.01;
const MAX_LP_SHARE = 0.20;
const TO_RAISE = PLAN.size * (1 - GP_COMMIT);

// Same commitment mixes as step 2 (multiple of the minimum per tier).
const PRESET_MULTS = {
  small: [1, 2, 4],
  balanced: [1, 2.5, 6],
  anchors: [1, 2, 20]
};
const PRESET_LABELS = { small: 'Mostly small checks', balanced: 'Balanced', anchors: 'A few anchors' };
const mults = PRESET_MULTS[PLAN.preset] || PRESET_MULTS.balanced;
// Use the exact tier checks from step 2 when available, so the numbers match.
const TIERS = ['Minimum', 'Larger', 'Largest'].map((label, i) => ({
  label,
  check: saved.plan.tierChecks && saved.plan.tierChecks[i]
    ? saved.plan.tierChecks[i] * 1e3
    : Math.min(PLAN.minCheck * mults[i], PLAN.size * MAX_LP_SHARE)
}));

const FIRST_GOAL = 10;
const OUTREACH_GOAL = 25;

const PROMPTS = [
  { icon: '🧭', name: 'Former bosses and mentors', hint: 'People who’ve seen your work up close.' },
  { icon: '🚀', name: 'Founders you’ve helped', hint: 'They know your value firsthand.' },
  { icon: '💼', name: 'Angels and investors', hint: 'People who already write checks.' },
  { icon: '🤝', name: 'Successful friends and family', hint: 'People who already trust you.' },
  { icon: '🏢', name: 'Executives and operators', hint: 'Senior people at companies you know.' },
  { icon: '🏛️', name: 'Family offices and advisors', hint: 'Wealth managers and family office contacts.' }
];

const SAMPLE = [
  ['Priya Raman', 0, 1], ['Marcus Feld', 1, 2], ['Dana Okafor', 5, 1], ['Tom Becker', 0, 0],
  ['Sofia Marin', 2, 1], ['Ben Asher', 2, 0], ['Rachel Kim', 5, 0], ['Omar Shah', 3, 0],
  ['Leila Haddad', 4, 0], ['Julia Ortiz', 1, 0]
];

// The list is saved in the shared demo state, so it survives going back and forth.
const state = {
  prompt: 0,
  tier: 0,
  people: (saved.people || []).map(p => ({ id: p.id, name: p.name, prompt: p.prompt, tier: p.tier, fresh: false }))
};
let nextId = state.people.reduce((m, p) => Math.max(m, p.id), 0) + 1;

function persist() {
  DemoStore.save({ people: state.people.map(({ id, name, prompt, tier }) => ({ id, name, prompt, tier })) });
}

const $ = id => document.getElementById(id);

function money(d) {
  if (d >= 1e6) return '$' + String(+(d / 1e6).toFixed(d >= 1e7 ? 1 : 2)) + 'M';
  return '$' + Math.round(d / 1e3) + 'K';
}
const int = v => Math.round(v).toLocaleString('en-US');
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

/* ---------- Plan summary ---------- */
function renderPlan() {
  $('chipSize').textContent = money(PLAN.size);
  $('chipLPs').textContent = `${int(PLAN.lps)} LPs to find`;
  $('chipKnown').textContent = `You know about ${int(PLAN.known)} people`;
  $('ledeKnown').textContent = int(PLAN.known);
  $('moneyOf').textContent = ` of ${money(TO_RAISE)}`;
  $('noteProspects').textContent = int(PLAN.prospects);
  $('fine').textContent = `Check sizes come from your plan: a ${money(PLAN.minCheck)} minimum with the ${PRESET_LABELS[PLAN.preset] || 'Balanced'} mix of larger checks. You can change any guess later.`;
}

/* ---------- Tier picker (shared by quick add and list rows) ---------- */
function tierPicker(selected, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'tier-pick';
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', 'Likely check size');
  TIERS.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === selected);
    b.className = i === selected ? 'on' : '';
    b.innerHTML = `${t.label}<small>${money(t.check)}</small>`;
    b.addEventListener('click', () => onPick(i));
    wrap.appendChild(b);
  });
  return wrap;
}

function renderAddPicker() {
  const holder = $('tierPick');
  const fresh = tierPicker(state.tier, i => { state.tier = i; renderAddPicker(); $('nameInput').focus(); });
  fresh.id = 'tierPick';
  holder.replaceWith(fresh);
}

/* ---------- Prompts ---------- */
function buildPrompts() {
  const wrap = $('prompts');
  PROMPTS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'prompt';
    b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="p-count"></span><span class="p-name">${p.name}</span><span class="p-hint">${p.hint}</span>`;
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
  $('addFor').textContent = PROMPTS[state.prompt].name;
  $('addHint').textContent = PROMPTS[state.prompt].hint;
}

/* ---------- List ---------- */
function addPerson(name, prompt, tier, fresh = true) {
  state.people.unshift({ id: nextId++, name, prompt, tier, fresh });
}

// Three buckets by likely check. Drag a name to move it; with a name focused,
// the left and right arrow keys move it too.
const TIER_HINTS = ['Most of your LPs', 'A step up', 'Your anchors'];
let dragId = null;

function movePerson(id, tier) {
  const p = state.people.find(q => q.id === id);
  if (!p || p.tier === tier) return;
  p.tier = tier;
  p.fresh = true;
  render();
  const moved = document.querySelector(`.row[data-id="${id}"]`);
  if (moved) moved.focus();
}

function personRow(p) {
  const row = document.createElement('div');
  row.className = 'row' + (p.fresh ? ' fresh' : '');
  p.fresh = false;
  row.dataset.id = p.id;
  row.draggable = true;
  row.tabIndex = 0;
  row.setAttribute('aria-label', `${p.name}, ${TIERS[p.tier].label} check. Use left and right arrows to move.`);
  row.innerHTML = `<span class="grip" aria-hidden="true">⋮⋮</span><span class="av">${esc(initials(p.name))}</span>
    <span class="r-text"><span class="r-name">${esc(p.name)}</span><span class="r-rel">${PROMPTS[p.prompt].name}</span></span>`;

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'r-x';
  x.setAttribute('aria-label', `Remove ${p.name}`);
  x.textContent = '×';
  x.addEventListener('click', () => { state.people = state.people.filter(q => q.id !== p.id); render(); });
  row.appendChild(x);

  row.addEventListener('dragstart', e => {
    dragId = p.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(p.id));
    requestAnimationFrame(() => row.classList.add('dragging'));
  });
  row.addEventListener('dragend', () => {
    dragId = null;
    row.classList.remove('dragging');
    document.querySelectorAll('.bucket.over').forEach(b => b.classList.remove('over'));
  });
  row.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' && p.tier < TIERS.length - 1) { e.preventDefault(); movePerson(p.id, p.tier + 1); }
    if (e.key === 'ArrowLeft' && p.tier > 0) { e.preventDefault(); movePerson(p.id, p.tier - 1); }
  });
  return row;
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';
  const n = state.people.length;

  if (n) {
    TIERS.forEach((t, i) => {
      const people = state.people.filter(p => p.tier === i);
      const bucket = document.createElement('div');
      bucket.className = 'bucket b' + i;
      bucket.innerHTML = `<div class="b-head">
          <div><p class="b-name">${t.label}</p><p class="b-check">${money(t.check)} each · ${TIER_HINTS[i]}</p></div>
          <div class="b-sum"><b>${people.length}</b><span>${money(people.length * t.check)}</span></div>
        </div>`;
      const body = document.createElement('div');
      body.className = 'b-body';
      people.forEach(p => body.appendChild(personRow(p)));
      if (!people.length) {
        const ph = document.createElement('p');
        ph.className = 'b-empty';
        ph.textContent = 'Drag names here';
        body.appendChild(ph);
      }
      bucket.appendChild(body);

      bucket.addEventListener('dragover', e => {
        if (dragId === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        bucket.classList.add('over');
      });
      bucket.addEventListener('dragleave', e => {
        if (!bucket.contains(e.relatedTarget)) bucket.classList.remove('over');
      });
      bucket.addEventListener('drop', e => {
        e.preventDefault();
        bucket.classList.remove('over');
        const id = dragId ?? +e.dataTransfer.getData('text/plain');
        movePerson(id, i);
      });
      list.appendChild(bucket);
    });
  }

  $('empty').hidden = n > 0;
  $('dragHint').hidden = n === 0;
  // Keep progress visible while adding, since the ring now sits at the bottom.
  $('listHead').textContent = n < FIRST_GOAL
    ? `${n} of ${FIRST_GOAL} names`
    : `${n} ${n === 1 ? 'name' : 'names'}`;
}

/* ---------- Progress ---------- */
const R = 68, C = 2 * Math.PI * R;
function renderProgress() {
  const n = state.people.length;
  const goal = n < FIRST_GOAL ? FIRST_GOAL : OUTREACH_GOAL;
  $('goalLabel').textContent = n < FIRST_GOAL
    ? 'Next up: your first 10 names'
    : n < OUTREACH_GOAL ? `Next up: ${OUTREACH_GOAL} names to start outreach` : 'Ready to start outreach';
  const ring = $('ringFg');
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - Math.min(1, n / goal));
  document.querySelector('.ring').classList.toggle('full', n >= goal);
  tween($('ringNum'), n, int);
  $('ringOf').textContent = `of ${goal}`;

  const miles = [
    { t: 'First 10 names', goal: FIRST_GOAL },
    { t: 'Ready for outreach', goal: OUTREACH_GOAL },
    { t: 'Your full list', goal: PLAN.prospects }
  ];
  const current = miles.findIndex(m => n < m.goal);
  $('miles').innerHTML = miles.map((m, i) => {
    const cls = n >= m.goal ? 'hit' : i === current ? 'now' : '';
    const pct = Math.min(100, n / m.goal * 100);
    return `<li class="${cls}"><span class="ml-top"><span>${m.t}</span><b>${n >= m.goal ? int(m.goal) : int(n) + ' / ' + int(m.goal)}</b></span><span class="ml-bar"><i style="width:${pct}%"></i></span></li>`;
  }).join('');

  const potential = state.people.reduce((s, p) => s + TIERS[p.tier].check, 0);
  tween($('moneyNum'), potential, money);
  $('moneyFill').style.width = Math.min(100, potential / TO_RAISE * 100) + '%';

  $('doneBanner').hidden = n < FIRST_GOAL;
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
  addPerson(name, state.prompt, state.tier);
  input.value = '';
  state.tier = 0;
  renderAddPicker();
  render();
  input.focus();
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
  renderPlan();
  buildPrompts();
  renderAddPicker();

  $('addBtn').addEventListener('click', submitName);
  $('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  $('demoFill').addEventListener('click', () => {
    SAMPLE.forEach(([name, prompt, tier]) => addPerson(name, prompt, tier));
    render();
  });
  $('demoClear').addEventListener('click', () => { state.people = []; render(); });

  $('cta').addEventListener('click', () => {
    persist();
    DemoNav.go(4);
  });

  initBooking();
  render();
}

init();
