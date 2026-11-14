// LP prospects page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

const GP_COMMIT = 0.01;          // manager's own commitment, low end from step 1
const FIRST_CLOSE = 0.30;        // same as step 1
const MEET_RATE = 0.5;           // share of prospects who take a first meeting
const CONVERSION = 0.20;         // share of people met who commit
const MEETINGS_PER_LP = 2.5;     // meetings with each LP who commits
const MEETINGS_PER_PASS = 1;     // meetings with each person who passes
const RAMP_WEEKS = 4;            // building the list before meetings start
const LAG_WEEKS = 6;             // decision time after the last meeting
const LP_LIMIT = 99;             // warn above this many LPs
const MAX_LP_SHARE = 0.20;       // no single LP can exceed 20% of the fund
const MEETING_HOURS = 0.5;       // each meeting takes 30 minutes
const MIN_SIZE = 1, MAX_SIZE = 50;
const START = new Date(2026, 10, 14);

// Minimum LP check in $K. Smallest is $50K.
const CHECKS = [50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

// Commitment mixes. Tiers run bottom to top: share of LPs, check as a multiple of the minimum.
const PRESETS = {
  small:    { label: 'Mostly small checks', tiers: [[0.75, 1], [0.20, 2], [0.05, 4]] },
  balanced: { label: 'Balanced',            tiers: [[0.60, 1], [0.30, 2.5], [0.10, 6]] },
  anchors:  { label: 'A few anchors',       tiers: [[0.70, 1], [0.25, 2], [0.05, 20]] }
};
const TIER_NAMES = ['At the minimum', 'Larger checks', 'Largest checks'];

// Starting values come from the shared demo state: fund size from step 1,
// and this page's own choices if they've been here before.
const saved = DemoStore.load();
const state = {
  size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, saved.size)),
  checkIdx: CHECKS.includes(saved.minCheck) ? CHECKS.indexOf(saved.minCheck) : CHECKS.indexOf(100),
  preset: PRESETS[saved.preset] ? saved.preset : 'balanced',
  known: saved.known,
  pace: saved.pace
};

function persist(c) {
  DemoStore.save({
    size: state.size,
    minCheck: CHECKS[state.checkIdx],
    preset: state.preset,
    pace: state.pace,
    known: state.known,
    plan: {
      lps: c.lps,
      prospects: c.prospects,
      meetings: c.meetings,
      firstCloseWeeks: +c.firstWeeks.toFixed(1),
      finalCloseWeeks: +c.finalWeeks.toFixed(1),
      tierChecks: c.tierData.map(t => t.check / 1e3)
    }
  });
}

const $ = id => document.getElementById(id);
const checkSlider = $('checkSlider');
const paceSlider = $('paceSlider');
const sizeInput = $('sizeInput');

function money(d) {
  if (d >= 1e6) return '$' + String(+(d / 1e6).toFixed(d >= 1e7 ? 1 : 2)) + 'M';
  return '$' + Math.round(d / 1e3) + 'K';
}
const sizeLabel = m => String(+m.toFixed(1));
const int = v => Math.round(v).toLocaleString('en-US');

function calc() {
  const size = state.size * 1e6;
  const minCheck = CHECKS[state.checkIdx] * 1e3;
  const tiers = PRESETS[state.preset].tiers;
  // Every check, at every tier, is capped at 20% of the fund.
  const cap = size * MAX_LP_SHARE;
  const tierCheck = mult => Math.min(minCheck * mult, cap);
  const avgCheck = tiers.reduce((s, [share, mult]) => s + share * tierCheck(mult), 0);

  const gp = size * GP_COMMIT;
  const toRaise = size - gp;
  const raise1 = Math.max(0, size * FIRST_CLOSE - gp);   // GP commitment counts toward first close
  const lpExact = toRaise / avgCheck;

  // Whole LPs per tier. Dollars always come from count x check, so totals match the labels.
  // Top and middle tiers follow the preset mix; the minimum tier fills whatever is left.
  const tierData = tiers.map(([share, mult], i) => ({
    name: TIER_NAMES[i],
    check: tierCheck(mult),
    capped: minCheck * mult > cap,
    count: i === 0 ? 0 : Math.round(share * lpExact)
  }));
  const upper = () => tierData[1].count * tierData[1].check + tierData[2].count * tierData[2].check;
  // Never let the larger tiers alone overshoot the raise.
  while (upper() > toRaise && (tierData[1].count || tierData[2].count)) {
    if (tierData[1].count) tierData[1].count--; else tierData[2].count--;
  }
  tierData[0].count = Math.ceil(Math.max(0, toRaise - upper()) / tierData[0].check);
  if (tierData.every(t => t.count === 0)) tierData[0].count = 1;
  tierData.forEach(t => { t.dollars = t.count * t.check; });
  const committed = tierData.reduce((s, t) => s + t.dollars, 0);

  const lps = tierData.reduce((s, t) => s + t.count, 0);
  const lp1 = Math.min(lps, Math.ceil(raise1 / avgCheck));
  const lp2 = lps - lp1;

  const met = Math.ceil(lps / CONVERSION);
  const prospects = Math.ceil(met / MEET_RATE);
  const meetings = Math.round(lps * MEETINGS_PER_LP + (met - lps) * MEETINGS_PER_PASS);
  const meetWeeks = meetings / state.pace;
  const firstWeeks = RAMP_WEEKS + meetWeeks * (lp1 / lps) + LAG_WEEKS;
  const finalWeeks = RAMP_WEEKS + meetWeeks + LAG_WEEKS;

  return { size, gp, toRaise, committed, minCheck, lp1, lp2, lps, tierData, met, prospects, meetings,
    meetWeeks, firstWeeks, finalWeeks, avg: committed / lps };
}

function addWeeks(w) { return new Date(START.getTime() + w * 7 * 864e5); }
const monthYear = d => d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
const months = w => Math.max(1, Math.round(w / 4.345));

// Number tween so values roll instead of snapping.
const tweens = {};
function tween(el, to, fmt) {
  const from = tweens[el.id] ?? to;
  const t0 = performance.now(), dur = 280;
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

/* ---------- Stage rows (LPs at the top, prospects at the bottom) ---------- */
function renderStages(c) {
  const vals = [c.prospects, c.met, c.lps];
  vals.forEach((v, i) => {
    $('fill' + i).style.width = Math.max(2, v / c.prospects * 100) + '%';
    tween($('sv' + i), v, int);
  });
  $('sa2').textContent = `↓ About 1 in ${Math.round(1 / CONVERSION)} people you meet commits`;
  $('sa1').textContent = `↓ About ${MEET_RATE === 0.5 ? 'half' : Math.round(MEET_RATE * 100) + '%'} of the people you reach take a meeting`;
  $('sr1').textContent = `${Math.round(c.met / c.lps)}x your LPs`;
  $('sr0').textContent = `${Math.round(c.prospects / c.met)}x meetings`;
  renderKnown(c);
}

// Optional: how many people they could ask today. Only splits the prospect row.
function renderKnown(c) {
  const known = state.known;
  const line = $('knownLine');
  const has = known > 0;
  const ks = $('knownSlider');
  $('knownVal').textContent = int(known);
  ks.style.setProperty('--fill', (known / +ks.max * 100) + '%');
  $('fillKnown').style.width = has ? Math.min(100, known / c.prospects * 100) + '%' : '0';
  $('knownLegend').classList.toggle('on', has);
  line.classList.toggle('set', has);
  if (!has) {
    line.textContent = 'Friends, colleagues, investors you know. A rough guess is fine.';
  } else if (known >= c.prospects) {
    line.innerHTML = `You know <b>${int(known)}</b>. That covers everyone you need to reach. Start with the people most likely to invest.`;
  } else {
    line.innerHTML = `You know <b>${int(known)}</b>. About <b>${int(c.prospects - known)}</b> to find through introductions and outreach.`;
  }
}

/* ---------- Pyramid ---------- */
function buildPyramid() {
  const wrap = $('pyramid');
  // Top tier first so it reads as a pyramid.
  [2, 1, 0].forEach(i => {
    const row = document.createElement('div');
    row.className = 'tier t' + i;
    row.innerHTML =
      `<div class="tier-bar-wrap"><div class="tier-bar" id="tb${i}"></div></div>
       <div class="tier-info">
         <span><span class="ti-name" id="tn${i}"></span><span class="ti-check" id="tc${i}"></span></span>
         <span class="ti-money"><span id="tm${i}"></span><span class="ti-share" id="ts${i}"></span></span>
       </div>`;
    wrap.appendChild(row);
  });
}

function renderPyramid(c) {
  const maxCount = Math.max(1, ...c.tierData.map(t => t.count));
  c.tierData.forEach((t, i) => {
    const bar = $('tb' + i);
    bar.style.width = (t.count / maxCount * 100) + '%';
    bar.textContent = t.count;
    $('tn' + i).textContent = `${t.name} · ${t.count} LP${t.count === 1 ? '' : 's'}`;
    $('tc' + i).textContent = t.capped
      ? `${money(t.check)} each, the 20% cap per LP`
      : `${money(t.check)} each`;
    tween($('tm' + i), t.dollars, money);
    $('ts' + i).textContent = Math.round(t.dollars / c.committed * 100) + '% of the money';
  });

  $('ph1n').textContent = `${c.lp1} LP${c.lp1 === 1 ? '' : 's'}`;
  $('ph2n').textContent = `${c.lp2} more`;
}

/* ---------- Timeline ---------- */
function renderTimeline(c) {
  const total = c.finalWeeks;
  $('segRamp').style.width = (RAMP_WEEKS / total * 100) + '%';
  $('segMeet').style.width = (c.meetWeeks / total * 100) + '%';
  $('segLag').style.width = (LAG_WEEKS / total * 100) + '%';

  tween($('tFirst'), months(c.firstWeeks), v => Math.round(v) + ' mo');
  tween($('tFinal'), months(c.finalWeeks), v => Math.round(v) + ' mo');

  const pts = [
    { cls: 'start left', w: 0, t: 'Today', s: monthYear(START) },
    { cls: '', w: c.firstWeeks, t: 'First close', s: monthYear(addWeeks(c.firstWeeks)) },
    { cls: 'final right', w: c.finalWeeks, t: 'Final close', s: monthYear(addWeeks(c.finalWeeks)) }
  ];
  const marks = $('marks');
  if (!marks.children.length) {
    pts.forEach(() => {
      const d = document.createElement('div');
      d.innerHTML = '<div class="pin"></div><b></b><span></span>';
      marks.appendChild(d);
    });
  }
  [...marks.children].forEach((d, i) => {
    const p = pts[i];
    d.className = 'mark-pt ' + p.cls;
    d.style.left = (p.w / total * 100) + '%';
    d.querySelector('b').textContent = p.t;
    d.querySelector('span').textContent = p.s;
  });
}

/* ---------- Choice controls ---------- */
function buildChoices() {
  const presets = $('presets');
  Object.entries(PRESETS).forEach(([key, p]) => {
    const btn = document.createElement('button');
    btn.setAttribute('role', 'radio');
    btn.dataset.key = key;
    btn.textContent = p.label;
    btn.addEventListener('click', () => { state.preset = key; render(); });
    presets.appendChild(btn);
  });
}

function renderChoices() {
  [...$('presets').children].forEach(btn => {
    const on = btn.dataset.key === state.preset;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', on);
  });
}

/* ---------- Render ---------- */
function render() {
  const c = calc();

  $('checkVal').textContent = money(c.minCheck);
  $('paceVal').textContent = state.pace;
  checkSlider.style.setProperty('--fill', (state.checkIdx / (CHECKS.length - 1) * 100) + '%');
  paceSlider.style.setProperty('--fill', ((state.pace - 3) / 22 * 100) + '%');
  $('chipClose').textContent = 'First close at ' + money(c.size * FIRST_CLOSE);

  tween($('nProspects'), c.prospects, int);
  tween($('nLPs'), c.lps, int);
  tween($('nMeetings'), c.meetings, int);

  $('lpDesc').textContent = `To raise ${money(c.toRaise)} after your own ${money(c.gp)} commitment. About ${money(c.avg)} per LP on average.`;
  $('lpCard').classList.toggle('over', c.lps > LP_LIMIT);

  const firstShare = c.met / c.meetings;
  const firsts = Math.max(1, Math.round(state.pace * firstShare));
  const follows = Math.max(0, state.pace - firsts);
  $('meetDesc').textContent = `At ${state.pace} a week: about ${firsts} first meetings and ${follows} follow ups.`;
  const hrs = h => String(+h.toFixed(1));
  $('meetTime').innerHTML = `About <b>${hrs(state.pace * MEETING_HOURS)} hours a week</b> of meetings, at 30 minutes each.`;

  renderChoices();
  renderStages(c);
  renderPyramid(c);
  renderTimeline(c);
  persist(c);
}

/* ---------- Help: book a call (prototype, no real scheduling) ---------- */
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
  const wrap = $('days');
  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${d.toLocaleString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b>${d.toLocaleString('en-US', { month: 'short' })}`;
    b.addEventListener('click', () => { booking.day = i; booking.time = null; renderBooking(); });
    wrap.appendChild(b);
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
    const btn = $('helpBtn');
    btn.firstChild.textContent = 'Call booked';
  });
}

function fitChip() { sizeInput.style.width = Math.max(1.2, sizeInput.value.length - (sizeInput.value.includes('.') ? 0.5 : 0)) + 0.2 + 'ch'; }

function init() {
  checkSlider.max = CHECKS.length - 1;
  checkSlider.value = state.checkIdx;
  paceSlider.value = state.pace;
  sizeInput.value = sizeLabel(state.size);
  fitChip();
  buildChoices();
  buildPyramid();
  initBooking();

  checkSlider.addEventListener('input', () => { state.checkIdx = +checkSlider.value; render(); });
  paceSlider.addEventListener('input', () => { state.pace = +paceSlider.value; render(); });

  const knownSlider = $('knownSlider');
  knownSlider.value = state.known;
  knownSlider.addEventListener('input', () => {
    state.known = +knownSlider.value;
    const c = calc();
    renderKnown(c);
    persist(c);
  });

  $('chipEdit').addEventListener('click', () => { sizeInput.focus(); });
  sizeInput.addEventListener('focus', () => { $('fundChip').classList.add('editing'); sizeInput.select(); });
  sizeInput.addEventListener('input', () => {
    let v = sizeInput.value.replace(/[^\d.]/g, '');
    const i = v.indexOf('.');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 1);
    sizeInput.value = v;
    fitChip();
    const m = parseFloat(v);
    if (m >= MIN_SIZE && m <= MAX_SIZE) { state.size = m; render(); }
  });
  sizeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sizeInput.blur();
    if (e.key === 'Escape') { sizeInput.value = sizeLabel(state.size); sizeInput.blur(); }
  });
  sizeInput.addEventListener('blur', () => {
    const v = parseFloat(sizeInput.value);
    state.size = isNaN(v) ? state.size : Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(v * 10) / 10));
    sizeInput.value = sizeLabel(state.size);
    fitChip();
    $('fundChip').classList.remove('editing');
    render();
  });

  $('cta').addEventListener('click', () => {
    persist(calc());
    DemoNav.go(3);
  });

  render();
}

init();
