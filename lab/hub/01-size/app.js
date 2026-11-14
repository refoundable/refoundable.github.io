// Fund size page. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

const FEE_RATE = 0.02;          // annual management fee
const FUND_YEARS = 10;          // fees total 2% x 10 years = 20% of the fund
const FEE_YEARS = 2;            // ...but are paid out in the first 2 years, half each year
// Formation and fund admin come out of the fees, not from LPs. The GP's share of the
// fees steps up like tax brackets: 50% on the first $3M, 60% on $3M–$7M, 70% above $7M.
const GP_SHARE = [[3, 0.5], [7, 0.6], [Infinity, 0.7]];
const FIRST_CLOSE = 0.30;
const INVEST_YEARS = 2;         // window for new investments
const THIN_PORTFOLIO = 15;      // below this, the portfolio turns amber
const MAX_DOTS = 120;

// Self-serve funds go up to $19.99M. At $20M and above, people talk to the fund team.
const SELF_SERVE_MAX = 19.99;
const CAP = 20;

// Fund sizes in $M, in $0.5M steps from $1M to $19.5M.
// The last stop is "$20M+", which hands off to the fund team.
const SIZES = [...Array.from({ length: 38 }, (_, i) => 1 + i * 0.5), CAP];
const OVER_IDX = SIZES.length - 1;
const MIN_SIZE = SIZES[0];
const TICKS = [1, 5, 10, 15, CAP];

// Average first check in $K.
const CHECKS = [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000];

// Track colors, matched to the CSS gradient stops.
const STOPS = [
  [0, [140, 191, 164]],
  [0.38, [229, 204, 124]],
  [0.68, [232, 162, 117]],
  [1, [215, 124, 130]]
];

// Size is kept in $M so a typed value (e.g. 8.35) doesn't have to sit on a slider step.
// Starting values come from the shared demo state, so going back keeps earlier choices.
// size is always a self-serve size; over and intended describe a $20M+ plan.
const saved = DemoStore.load();
const state = {
  size: Math.min(SELF_SERVE_MAX, Math.max(MIN_SIZE, saved.size)),
  checkIdx: CHECKS.includes(saved.firstCheck) ? CHECKS.indexOf(saved.firstCheck) : CHECKS.indexOf(150),
  over: !!saved.bigFund || saved.size >= CAP,
  intended: saved.bigFund && saved.bigFund.size > CAP ? saved.bigFund.size : (saved.size > CAP ? saved.size : null),
  salesBooked: false
};

function persist() {
  DemoStore.save({
    size: state.size,
    firstCheck: CHECKS[state.checkIdx],
    companies: calc().companies,
    bigFund: state.over ? { size: state.intended || CAP } : null
  });
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
const sizeLabel = m => String(+m.toFixed(2));
// Big number in the hero: always at least one decimal (5.0, 5.5), two if typed (8.35).
const heroLabel = m => (Math.round(m * 100) % 10 ? m.toFixed(2) : m.toFixed(1));

function difficulty(m) {
  if (m <= 3) return 'Easier to raise';
  if (m <= 8) return 'Achievable for a first fund';
  if (m <= 15) return 'A stretch for a first fund';
  return 'Hard for a first fund';
}

// Fractional position of any self-serve size along the stepped slider.
function sizePos(m) {
  for (let i = 1; i < OVER_IDX; i++) {
    if (m <= SIZES[i]) return i - 1 + (m - SIZES[i - 1]) / (SIZES[i] - SIZES[i - 1]);
  }
  return OVER_IDX - 1;
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

// What the GP keeps from the fees, in dollars. sizeM is the fund size in $M.
function gpFees(sizeM) {
  let total = 0, from = 0;
  for (const [upTo, share] of GP_SHARE) {
    const part = Math.min(sizeM, upTo) - from;
    if (part <= 0) break;
    total += part * 1e6 * FEE_RATE * FUND_YEARS * share;
    from = upTo;
  }
  return total;
}

function calc() {
  const size = state.size * 1e6;
  const check = CHECKS[state.checkIdx] * 1e3;
  const fees = size * FEE_RATE * FUND_YEARS;
  const gp = gpFees(state.size);
  const net = size - fees;
  return {
    size, check, fees, gp, net,
    close: size * FIRST_CLOSE,
    companies: Math.floor(net / check)
  };
}

function fitInput() {
  const v = sizeInput.value || '0';
  const dots = (v.match(/\./g) || []).length;
  const plus = (v.match(/\+/g) || []).length;
  sizeInput.style.width = ((v.length - plus) * 0.9 - dots * 0.6 + plus * 0.75 + 0.15) + 'ch';
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

/* ---------- Hero ---------- */
function renderSize(fromTyping) {
  const m = state.size;
  const pos = state.over ? OVER_IDX : sizePos(m);
  document.documentElement.style.setProperty('--zone', colorAt(pos / OVER_IDX));
  sizeSlider.value = state.over ? OVER_IDX : Math.min(OVER_IDX - 1, Math.round(pos));

  if (state.over) {
    if (!fromTyping) {
      cancelAnimationFrame(sizeInput._raf);
      sizeInput.value = state.intended ? heroLabel(state.intended) : CAP + '+';
      fitInput();
    }
    tweens.sizeInput = state.intended || CAP;
  } else if (!fromTyping) {
    tweenNum(sizeInput, m, v => heroLabel(Math.abs(v - m) < 0.05 ? m : Math.round(v * 2) / 2));
  } else {
    tweens.sizeInput = m;
  }

  $('pillText').textContent = state.over ? 'Very hard for a first fund' : difficulty(m);
  renderMode();
}

// Switches the page between the self-serve numbers and the fund team card.
function renderMode() {
  const over = state.over;
  document.body.classList.toggle('over', over);
  $('bigFund').hidden = !over;

  $('ctaText').innerHTML = over
    ? (state.salesBooked ? '✓ Call booked with our fund team' : 'Talk to our fund team')
    : `Continue with <span id="ctaSize">$${sizeLabel(state.size)}M</span>`;

  $('fine').textContent = over
    ? `Self-serve funds on Decile Hub go up to $${SELF_SERVE_MAX}M. For larger funds, our fund team sets you up with a structure built for your raise.`
    : `Assumes 2% annual fees over a 10 year fund life, paid out in the first ${FEE_YEARS} years. Formation and fund admin are covered from the fees, not charged to LPs. You keep 50% of the fees on the first $3M, 60% from $3M to $7M and 70% above $7M. Assumes a ${INVEST_YEARS} year window for new investments.`;

  const lead = state.intended ? `You’re planning about $${sizeLabel(state.intended)}M. ` : '';
  $('bfSub').textContent = `${lead}Decile Hub is built for smaller funds. Raising $${CAP}M or more usually means a traditional fund structure, institutional LPs and a longer raise, and our fund team works with managers like you one-on-one.`;
}

/* ---------- Numbers ---------- */
function renderMetrics() {
  const c = calc();
  tweenNum($('mClose'), c.close, money);
  tweenNum($('mFees'), c.gp, money);
  tweenNum($('mNet'), c.net, money);
  const half = money(c.gp / FEE_YEARS);
  $('mFeesLife').textContent = `Paid over ${FEE_YEARS} years.`;

  $('sNet').style.width = (c.net / c.size * 100) + '%';
  $('sFee').style.width = (c.fees / c.size * 100) + '%';
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
  return `<b>About ${yr} new investment${yr === 1 ? '' : 's'} a year for ${INVEST_YEARS} years</b>, roughly one ${every}.`;
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
}

function renderAll(fromTyping) {
  renderSize(fromTyping);
  renderMetrics();
  renderPortfolio();
  persist();
}

/* ---------- Changing the size ---------- */
function setSelfServe(m) {
  state.over = false;
  state.intended = null;
  state.size = m;
  renderAll(false);
}

function setOver(intended) {
  state.over = true;
  state.intended = intended && intended > CAP ? intended : null;
  renderAll(false);
}

function buildTicks() {
  const wrap = $('ticks');
  TICKS.forEach(m => {
    const s = document.createElement('span');
    const isCap = m === CAP;
    s.textContent = isCap ? `$${CAP}M+` : '$' + m + 'M';
    if (isCap) s.className = 'cap-tick';
    s.style.left = (SIZES.indexOf(m) / OVER_IDX * 100) + '%';
    s.addEventListener('click', () => (isCap ? setOver(null) : setSelfServe(m)));
    wrap.appendChild(s);
  });

  // Hatch the stretch of track between the last self-serve stop and "$20M+".
  // The thumb center travels 20px in from each end, so the zone starts halfway
  // between the two stops on that inset scale.
  const p = (OVER_IDX - 0.5) / OVER_IDX;
  $('capZone').style.left = `calc(20px + (100% - 40px) * ${p})`;
}

function commitTyped() {
  const v = parseFloat(sizeInput.value);
  if (isNaN(v)) { renderAll(false); return; }
  if (v >= CAP) { setOver(Math.round(v * 100) / 100); return; }
  setSelfServe(Math.min(SELF_SERVE_MAX, Math.max(MIN_SIZE, Math.round(v * 100) / 100)));
}

/* ---------- $20M+ sales call (prototype, no real scheduling) ---------- */
// The help call itself comes from ../shared/footer.js.
let salesCall;
function initSales() {
  salesCall = DemoBooking.make({
    panel: 'sales', prefix: 'sales', days: 4,
    times: ['9:30 AM', '11:00 AM', '2:00 PM', '4:30 PM'],
    onOpen: () => {
      const f = $('salesSize');
      if (!state.salesBooked) f.value = sizeLabel(state.intended || CAP);
    },
    when: (d, t) => {
      const size = parseFloat($('salesSize').value);
      const fund = !isNaN(size) && size > 0 ? ` · about a $${sizeLabel(size)}M fund` : '';
      return `${DemoBooking.longDate(d)} at ${t} · 30 minutes${fund}.`;
    },
    onBooked: () => {
      const size = parseFloat($('salesSize').value);
      if (!isNaN(size) && size >= CAP) state.intended = size > CAP ? size : null;
      state.salesBooked = true;
      renderMode();
      persist();
    }
  });
  $('salesSize').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^\d.]/g, ''); });
}

/* ---------- Init ---------- */
function init() {
  sizeSlider.max = OVER_IDX;
  checkSlider.max = CHECKS.length - 1;
  checkSlider.value = state.checkIdx;

  sizeSlider.addEventListener('input', () => {
    const i = +sizeSlider.value;
    if (i === OVER_IDX) setOver(null); else setSelfServe(SIZES[i]);
  });

  sizeInput.addEventListener('focus', () => sizeInput.select());
  sizeInput.addEventListener('input', () => {
    // Keep digits and a single decimal point, with up to two decimals.
    let v = sizeInput.value.replace(/[^\d.]/g, '');
    const i = v.indexOf('.');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
    sizeInput.value = v;
    fitInput();
    const m = parseFloat(v);
    if (isNaN(m) || m < MIN_SIZE) return;
    if (m >= CAP) { state.over = true; state.intended = m > CAP ? m : null; }
    else { state.over = false; state.intended = null; state.size = m; }
    renderAll(true);
  });
  sizeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sizeInput.blur();
    if (e.key === 'Escape') { renderAll(false); sizeInput.blur(); }
  });
  sizeInput.addEventListener('blur', commitTyped);

  checkSlider.addEventListener('input', () => {
    state.checkIdx = +checkSlider.value;
    renderPortfolio();
    persist();
  });

  $('cta').addEventListener('click', () => {
    if (state.over) { salesCall.open(state.salesBooked); return; }
    persist();
    DemoNav.go(2);
  });

  initSales();
  buildTicks();
  sizeInput.value = state.over ? (state.intended ? heroLabel(state.intended) : CAP + '+') : sizeLabel(state.size);
  fitInput();
  renderAll(false);
}

init();