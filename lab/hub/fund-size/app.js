// Fund size page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

const FEE_RATE = 0.02;          // annual management fee
const FUND_YEARS = 10;          // fees charged over the fund life
const EXPENSE_FIXED = 150000;   // formation, admin, audit, tax (rough)
const EXPENSE_RATE = 0.01;      // plus ~1% of the fund
const FIRST_CLOSE = 0.30;
const CARRY_RATE = 0.20;        // share of profits
const RETURN_MULTIPLE = 3;      // "if the fund returns 3x"
const GP_COMMIT_LOW = 0.01;     // GP commitment range
const GP_COMMIT_HIGH = 0.02;
const INVEST_YEARS = 3;         // window for new investments
const THIN_PORTFOLIO = 15;      // below this, show the gentle nudge
const MAX_DOTS = 120;

// Fund sizes in $M. Finer steps at the small end, where most first funds live.
const SIZES = [
  1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  22.5, 25, 27.5, 30, 35, 40, 45, 50
];
const MIN_SIZE = SIZES[0];
const MAX_SIZE = SIZES[SIZES.length - 1];
const TICKS = [1, 5, 10, 20, 30, 50];

// Average first check in $K.
const CHECKS = [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];

// Track colors, matched to the CSS gradient stops.
const STOPS = [
  [0, [140, 191, 164]],
  [0.38, [229, 204, 124]],
  [0.68, [232, 162, 117]],
  [1, [215, 124, 130]]
];

// Size is kept in $M so a typed value (e.g. 8.3) doesn't have to sit on a slider step.
// Starting values come from the shared demo state, so going back keeps earlier choices.
const saved = DemoStore.load();
const state = {
  size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, saved.size)),
  checkIdx: CHECKS.includes(saved.firstCheck) ? CHECKS.indexOf(saved.firstCheck) : CHECKS.indexOf(150)
};

function persist() {
  DemoStore.save({ size: state.size, firstCheck: CHECKS[state.checkIdx], companies: calc().companies });
}

const $ = id => document.getElementById(id);
const sizeSlider = $('sizeSlider');
const sizeInput = $('sizeInput');
const checkSlider = $('checkSlider');

function money(dollars) {
  if (dollars >= 1e6) {
    const m = dollars / 1e6;
    return '$' + (m >= 10 ? m.toFixed(m % 1 ? 1 : 0) : (+m.toFixed(2)).toString()) + 'M';
  }
  return '$' + Math.round(dollars / 1e3) + 'K';
}
const sizeLabel = m => String(+m.toFixed(1));

function difficulty(m) {
  if (m <= 3) return 'Easier to raise';
  if (m <= 8) return 'Achievable for a first fund';
  if (m <= 15) return 'A stretch for a first fund';
  if (m <= 25) return 'Hard for a first fund';
  return 'Very hard for a first fund';
}

// Fractional position of any size along the stepped slider.
function sizePos(m) {
  for (let i = 1; i < SIZES.length; i++) {
    if (m <= SIZES[i]) return i - 1 + (m - SIZES[i - 1]) / (SIZES[i] - SIZES[i - 1]);
  }
  return SIZES.length - 1;
}

function colorAt(t) {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i - 1], [p2, c2] = STOPS[i];
    if (t <= p2) {
      const k = (t - p1) / (p2 - p1);
      const c = c1.map((v, j) => Math.round(v + (c2[j] - v) * k));
      return `rgb(${c.join(',')})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(',')})`;
}

function calc() {
  const size = state.size * 1e6;
  const check = CHECKS[state.checkIdx] * 1e3;
  const feesYear = size * FEE_RATE;
  const feesLife = feesYear * FUND_YEARS;
  const expenses = EXPENSE_FIXED + size * EXPENSE_RATE;
  const net = Math.max(0, size - feesLife - expenses);
  return {
    size, check, feesYear, feesLife, expenses, net,
    close: size * FIRST_CLOSE,
    carry: CARRY_RATE * size * (RETURN_MULTIPLE - 1),
    commitLow: size * GP_COMMIT_LOW,
    companies: Math.floor(net / check)
  };
}

function fitInput() {
  const v = sizeInput.value || '0';
  const dots = (v.match(/\./g) || []).length;
  sizeInput.style.width = (v.length - dots * 0.6 + 0.15) + 'ch';
}

// Small tween so the numbers roll instead of snapping.
const tweens = {};
function tweenNum(el, to, fmt) {
  const from = tweens[el.id] ?? to;
  const start = performance.now(), dur = 260;
  cancelAnimationFrame(el._raf);
  const write = v => {
    if (el === sizeInput) { el.value = fmt(v); fitInput(); }
    else el.textContent = fmt(v);
  };
  const tick = now => {
    const k = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    const v = from + (to - from) * e;
    write(v);
    tweens[el.id] = v;
    if (k < 1) el._raf = requestAnimationFrame(tick);
    else tweens[el.id] = to;
  };
  el._raf = requestAnimationFrame(tick);
}

function renderSize(fromTyping) {
  const m = state.size;
  const pos = sizePos(m);
  document.documentElement.style.setProperty('--zone', colorAt(pos / (SIZES.length - 1)));
  sizeSlider.value = Math.round(pos);

  if (!fromTyping) tweenNum(sizeInput, m, v => sizeLabel(Math.abs(v - m) < 0.05 ? m : Math.round(v * 2) / 2));
  else tweens.sizeInput = m;
  $('pillText').textContent = difficulty(m);
  $('ctaSize').textContent = '$' + sizeLabel(m) + 'M';
}

function renderMetrics() {
  const c = calc();
  tweenNum($('mClose'), c.close, money);
  tweenNum($('mFees'), c.feesYear, money);
  tweenNum($('mNet'), c.net, money);
  tweenNum($('mCarry'), c.carry, money);
  tweenNum($('mCommit'), c.commitLow, v => money(v) + '–' + money(v * GP_COMMIT_HIGH / GP_COMMIT_LOW));
  $('mFeesLife').textContent = `About ${money(c.feesLife)} over ${FUND_YEARS} years.`;

  $('sNet').style.width = (c.net / c.size * 100) + '%';
  $('sFee').style.width = (c.feesLife / c.size * 100) + '%';
  $('sExp').style.width = (c.expenses / c.size * 100) + '%';
}

function busyText(n) {
  if (n === 0) return 'Not enough to make an investment at this check size.';
  const perYear = n / INVEST_YEARS;
  const weeks = 52 / perYear;
  let every;
  if (weeks < 1.5) every = 'a week';
  else if (weeks < 7) every = `every ${Math.round(weeks)} weeks`;
  else {
    const months = weeks / 4.33;
    every = months < 1.5 ? 'a month' : `every ${Math.round(months)} months`;
  }
  const yr = Math.max(1, Math.round(perYear));
  return `<b>About ${yr} new investment${yr === 1 ? '' : 's'} a year</b> for ${INVEST_YEARS} years, roughly one ${every}.`;
}

let lastDots = -1;
function renderPortfolio() {
  const c = calc();
  const n = c.companies;
  const thin = n < THIN_PORTFOLIO;

  $('checkVal').textContent = money(c.check);
  checkSlider.style.setProperty('--fill', (state.checkIdx / (CHECKS.length - 1) * 100) + '%');
  tweenNum($('countNum'), n, v => String(Math.round(v)));
  $('countBox').classList.toggle('thin', thin);
  $('busy').innerHTML = busyText(n);

  const shown = Math.min(n, MAX_DOTS);
  if (shown !== lastDots) {
    const dots = $('dots');
    const prev = Math.max(0, Math.min(lastDots, MAX_DOTS));
    dots.innerHTML = '';
    for (let i = 0; i < shown; i++) {
      const d = document.createElement('i');
      d.style.animationDelay = i >= prev ? Math.min(400, (i - prev) * 8) + 'ms' : '0ms';
      if (i < prev) d.style.animation = 'none';
      dots.appendChild(d);
    }
    if (n > MAX_DOTS) {
      const more = document.createElement('span');
      more.className = 'more';
      more.textContent = `+${n - MAX_DOTS} more`;
      dots.appendChild(more);
    }
    lastDots = shown;
  }

  const nudge = $('nudge');
  nudge.classList.toggle('thin', thin);
  $('nudgeText').textContent = thin
    ? `That’s a concentrated portfolio. With ${n} companies, one or two outcomes will decide most of the fund’s results. A smaller check or a bigger fund spreads the risk.`
    : `${money(c.net)} invested at ${money(c.check)} per company. Change the check size to see how your portfolio shifts.`;
}

function renderAll(fromTyping) {
  renderSize(fromTyping);
  renderMetrics();
  renderPortfolio();
  persist();
}

function setSize(m) {
  state.size = m;
  renderAll(false);
}

function buildTicks() {
  const wrap = $('ticks');
  TICKS.forEach(m => {
    const s = document.createElement('span');
    s.textContent = '$' + m + 'M';
    s.style.left = (SIZES.indexOf(m) / (SIZES.length - 1) * 100) + '%';
    s.addEventListener('click', () => setSize(m));
    wrap.appendChild(s);
  });
}

function commitTyped() {
  const v = parseFloat(sizeInput.value);
  const m = isNaN(v) ? state.size : Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(v * 10) / 10));
  state.size = m;
  sizeInput.value = sizeLabel(m);
  fitInput();
  renderAll(true);
}

function init() {
  sizeSlider.max = SIZES.length - 1;
  checkSlider.max = CHECKS.length - 1;
  checkSlider.value = state.checkIdx;

  sizeSlider.addEventListener('input', () => setSize(SIZES[+sizeSlider.value]));

  sizeInput.addEventListener('focus', () => sizeInput.select());
  sizeInput.addEventListener('input', () => {
    // Keep digits and a single decimal point.
    let v = sizeInput.value.replace(/[^\d.]/g, '');
    const i = v.indexOf('.');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 1);
    sizeInput.value = v;
    fitInput();
    const m = parseFloat(v);
    if (!isNaN(m) && m >= MIN_SIZE && m <= MAX_SIZE) {
      state.size = m;
      renderAll(true);
    }
  });
  sizeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sizeInput.blur();
    if (e.key === 'Escape') { sizeInput.value = sizeLabel(state.size); sizeInput.blur(); }
  });
  sizeInput.addEventListener('blur', commitTyped);

  checkSlider.addEventListener('input', () => {
    state.checkIdx = +checkSlider.value;
    renderPortfolio();
    persist();
  });
  $('cta').addEventListener('click', () => {
    persist();
    DemoNav.go(2);
  });

  initBooking();
  buildTicks();
  sizeInput.value = sizeLabel(state.size);
  fitInput();
  renderAll(false);
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

init();
