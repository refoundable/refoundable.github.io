// LP prospects page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

const GP_COMMIT = 0;             // manager's own commitment, defaults to 0
const FIRST_CLOSE = 0.30;        // default first close, as a share of the fund
const FC_MIN = 100;              // smallest first close, in $K
const FC_MAX_SHARE = 0.50;       // largest first close, as a share of the fund
const FC_STEP = 50;              // slider steps, in $K
const PACE = 6;                  // assumed LP meetings a week
const RAMP_WEEKS = 4.345;        // one month to build the list before meetings start
const MEET_RATE = 0.5;           // share of prospects who take a first meeting
const CONVERSION = 0.15;         // share of people met who commit
const MEETINGS_PER_LP = 3;       // meetings with each LP who commits
const MEETINGS_PER_PASS = 1;     // meetings with each person who passes
const LP_LIMIT = 99;             // warn above this many LPs
const MAX_LP_SHARE = 0.20;       // no single LP can exceed 20% of the fund
const MEETING_HOURS = 0.5;       // each meeting takes 30 minutes
const MIN_SIZE = 1, MAX_SIZE = 19.99;
const START = new Date();
START.setHours(0, 0, 0, 0);   // today, at midnight

// Minimum LP check in $K. Smallest is $50K.
const CHECKS = [50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

// Commitment mixes. Tiers run bottom to top: share of LPs, check as a multiple of the minimum.
const PRESETS = {
  small:    { label: 'Small checks',        tiers: [[0.75, 1], [0.20, 2], [0.05, 4]] },
  balanced: { label: 'Balanced',            tiers: [[0.60, 1], [0.30, 2.5], [0.10, 6]] },
  anchors:  { label: 'A few anchors',       tiers: [[0.70, 1], [0.25, 2], [0.05, 20]] }
};
const TIER_NAMES = ['Minimum', 'Larger checks', 'Largest checks'];

// Starting values come from the shared demo state: fund size from step 1,
// and this page's own choices if they've been here before.
const saved = DemoStore.load();
const state = {
  size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, saved.size)),
  checkIdx: CHECKS.includes(saved.minCheck) ? CHECKS.indexOf(saved.minCheck) : CHECKS.indexOf(100),
  preset: PRESETS[saved.preset] ? saved.preset : 'balanced',
  known: saved.known,
  firstClose: 0
};

// First close in $K: $50K steps, from $100K up to half the fund.
const fcMax = sizeM => Math.floor(sizeM * 1e3 * FC_MAX_SHARE / FC_STEP) * FC_STEP;
const fcClamp = (k, sizeM) => Math.min(fcMax(sizeM), Math.max(FC_MIN, Math.round(k / FC_STEP) * FC_STEP));
state.firstClose = fcClamp(state.size * 1e3 * (saved.firstCloseShare ?? FIRST_CLOSE), state.size);

function persist(c) {
  DemoStore.save({
    size: state.size,
    minCheck: CHECKS[state.checkIdx],
    preset: state.preset,
    firstCloseShare: state.firstClose / (state.size * 1e3),
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
const fcSlider = $('fcSlider');

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
  const raise1 = Math.max(0, state.firstClose * 1e3 - gp);   // GP commitment counts toward first close
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
  const meetWeeks = meetings / PACE
  const firstWeeks = RAMP_WEEKS + meetWeeks * (lp1 / lps);
  const finalWeeks = RAMP_WEEKS + meetWeeks;
  
  return { size, gp, toRaise, raise1, committed, minCheck, lp1, lp2, lps, tierData, met, prospects, meetings,
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

// The whole pyramid grows with the number of LPs needed: about 55% of the frame
// at 10 LPs, filling it at 100 (the page warns above 99). Tiers keep their shape
// relative to the base. The square root keeps small tiers from shrinking to slivers.
function pyramidWidth(total) {
  const k = Math.min(1, Math.max(0, Math.log(total / 10) / Math.log(10)));
  return 55 + 45 * k;
}

function renderPyramid(c) {
  const full = pyramidWidth(c.lps);
  const most = Math.max(...c.tierData.map(t => t.count), 1);
  c.tierData.forEach((t, i) => {
    const bar = $('tb' + i);
    bar.style.width = (full * Math.sqrt(t.count / most)) + '%';
    bar.textContent = t.count;
    $('tn' + i).textContent = `${t.name} · ${t.count} LP${t.count === 1 ? '' : 's'}`;
    $('tc' + i).textContent = t.capped
      ? `${money(t.check)} each, 20% cap per LP`
      : `${money(t.check)} each`;
    tween($('tm' + i), t.dollars, money);
    $('ts' + i).textContent = Math.round(t.dollars / c.committed * 100) + '% of the money';
  });

  $('ph1n').textContent = `${c.lp1} LP${c.lp1 === 1 ? '' : 's'}`;
  $('ph2n').textContent = `${c.lp2} more`;
}

/* ---------- Timeline ---------- */
// Meetings start sits above the bar, closes below. The bar changes color at meetings
// start and first close, and a dark notch marks final close. In px from the top of the
// track (matches .track padding and .lbl tops in styles.css): `edge` is the bar edge
// facing the label, `lead` the height of the line that joins a moved label back.
const TL = {
  up:   { edge: 58, lead: 37 },
  down: { edge: 72, lead: 93 }
};
const LABEL_GAP = 16;

function renderTimeline(c) {
  const total = c.finalWeeks;
  $('segRamp').style.width = (RAMP_WEEKS / total * 100) + '%';
  $('segFirst').style.width = ((c.firstWeeks - RAMP_WEEKS) / total * 100) + '%';

  tween($('tFirst'), months(c.firstWeeks), v => Math.round(v) + ' mo');
  tween($('tFinal'), months(c.finalWeeks), v => Math.round(v) + ' mo');

  const pts = [
    { cls: 'up', w: RAMP_WEEKS, t: 'Start raising', s: monthYear(addWeeks(RAMP_WEEKS)) },
    { cls: 'down first', w: c.firstWeeks, t: 'First close', s: monthYear(addWeeks(c.firstWeeks)) },
    { cls: 'down final', w: c.finalWeeks, t: 'Final close', s: monthYear(addWeeks(c.finalWeeks)) }
  ];
  const marks = $('marks');
  if (!marks.children.length) {
    pts.forEach(() => {
      const d = document.createElement('div');
      d.innerHTML = '<i class="notch"></i><i class="tick"></i><i class="lead"></i><div class="lbl"><b></b><span></span></div>';
      marks.appendChild(d);
    });
  }
  [...marks.children].forEach((d, i) => {
    const p = pts[i];
    d.className = 'mark-pt ' + p.cls;
    d.dataset.x = p.w / total;
    d.style.left = (p.w / total * 100) + '%';
    d.querySelector('b').textContent = p.t;
    d.querySelector('span').textContent = p.s;
  });
  placeLabels();
}

// Each label centers on its point and stays inside the track. If the two labels in a
// row would touch, the later one moves right, then the earlier one left if needed,
// and a short elbow line joins a moved label back to its point. Points never move.
function placeLabels() {
  const W = $('track').clientWidth;
  const all = [...$('marks').children];
  if (!W || !all.length) return;

  ['up', 'down'].forEach(row => {
    const items = all.filter(d => d.classList.contains(row)).map(d => {
      const lbl = d.querySelector('.lbl');
      const w = lbl.offsetWidth, x = +d.dataset.x * W;
      return { d, lbl, w, x, left: Math.min(W - w, Math.max(0, x - w / 2)) };
    });
    const [a, b] = items;
    if (b) {
      const overlap = () => a.left + a.w + LABEL_GAP - b.left;
      if (overlap() > 0) b.left = Math.min(W - b.w, b.left + overlap());
      if (overlap() > 0) a.left = Math.max(0, a.left - overlap());
    }

    const y = TL[row];
    items.forEach(it => {
      const { d, lbl, w, x, left } = it;
      lbl.style.left = (left - x) + 'px';
      lbl.style.textAlign = left >= x - 1 ? 'left' : left + w <= x + 1 ? 'right' : 'left';

      // Moved clear of its point: a line runs out from the bar, then across to the
      // label's near edge. `span` is [start, end] in px from the point, or null when
      // the label sits over it.
      const span = x < left - 2 ? [0, left - x - 6]
        : x > left + w + 2 ? [left + w - x + 6, 0] : null;
      const moved = span !== null;
      const tick = d.querySelector('.tick'), lead = d.querySelector('.lead');
      const reach = moved ? Math.abs(y.edge - y.lead) : 0;
      tick.style.top = (row === 'up' ? y.edge - reach : y.edge) + 'px';
      tick.style.height = reach + 'px';
      lead.classList.toggle('on', moved);
      if (moved) {
        lead.style.top = (y.lead - 0.75) + 'px';
        lead.style.left = span[0] + 'px';
        lead.style.width = Math.max(0, span[1] - span[0]) + 'px';
      }
    });
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
  checkSlider.style.setProperty('--fill', (state.checkIdx / (CHECKS.length - 1) * 100) + '%');
  const fcPct = Math.round(c.raise1 / c.size * 100);
  $('fcVal').textContent = `${money(c.raise1)}`;
  fcSlider.style.setProperty('--fill', ((state.firstClose - FC_MIN) / (fcSlider.max - FC_MIN) * 100) + '%');

  tween($('nLPs'), c.lps, int);
  tween($('nFirst'), c.raise1, money);
  $('fcDesc').textContent = `${fcPct}% of your ${money(c.size)} fund, from about ${c.lp1} LP${c.lp1 === 1 ? '' : 's'}.`;

  $('lpDesc').textContent = `To raise ${money(c.toRaise)}, about ${money(c.avg)} per LP on average.`;
  $('lpCard').classList.toggle('over', c.lps > LP_LIMIT);

  renderChoices();
  renderPyramid(c);
  renderTimeline(c);
  persist(c);
}

function init() {
  checkSlider.max = CHECKS.length - 1;
  checkSlider.value = state.checkIdx;
  fcSlider.min = FC_MIN;
  fcSlider.max = fcMax(state.size);
  fcSlider.step = FC_STEP;
  fcSlider.value = state.firstClose;
  $('fcMaxLabel').textContent = money(fcSlider.max * 1e3);
  buildChoices();
  buildPyramid();

  new ResizeObserver(placeLabels).observe($('track'));
  checkSlider.addEventListener('input', () => { state.checkIdx = +checkSlider.value; render(); });
  fcSlider.addEventListener('input', () => { state.firstClose = +fcSlider.value; render(); });

  $('cta').addEventListener('click', () => {
    persist(calc());
    DemoNav.go(4);
  });

  render();
}

init();
