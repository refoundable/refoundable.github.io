// Dashboard. All handlers are attached here (no inline JS) so the same
// files would also work inside a Chrome extension, which blocks inline scripts.

// Everything set up during onboarding, read from the shared demo state.
const saved = DemoStore.load();
const story = saved.story || {};
const MIX_LABELS = { small: 'Mostly small checks', balanced: 'Balanced', anchors: 'A few anchors' };
const TIER_LABELS = ['Minimum', 'Larger', 'Largest'];

const FUND = {
  name: (story.fundName || '').trim() || 'Fund I',
  gp: saved.name,
  size: saved.size * 1e6,
  firstClose: saved.size * 1e6 * 0.30,
  minCheck: saved.minCheck * 1e3,
  mix: MIX_LABELS[saved.preset] || 'Balanced',
  lpsNeeded: saved.plan.lps,
  prospects: saved.plan.prospects,
  meetingsNeeded: saved.plan.meetings,
  pace: saved.pace,
  firstCheck: saved.firstCheck * 1e3,
  companies: saved.companies,
  firstCloseWeeks: saved.plan.firstCloseWeeks,
  thesis: story.thesisText || '',
  why: (story.why || '').trim()
};
const TO_RAISE = FUND.size * 0.99;   // after the 1% GP commitment
const MEETING_HOURS = 0.5;

// Names from onboarding, biggest likely checks first.
const LIST = (saved.people || [])
  .slice()
  .sort((a, b) => b.tier - a.tier)
  .map(p => [p.name, TIER_LABELS[p.tier] || 'Minimum']);

// Placeholder schedule: live, online and free.
const WORKSHOPS = [
  {
    id: 'outreach', title: 'Reaching out to your first LPs', date: new Date(2026, 10, 19, 12), mins: 60, rec: true,
    why: 'You have 10 names ready to contact',
    blurb: 'Who to contact first, what to say, and how to turn a warm intro into a first meeting.',
    cover: ['Ordering your list so the likeliest yeses come first', 'Intro messages that get replies, with real examples', 'What to send before and after a first meeting'],
    who: 'Managers who have a list and are about to start their first conversations with LPs.'
  },
  {
    id: 'thesis', title: 'Building a great fund thesis', date: new Date(2026, 10, 24, 13), mins: 60, rec: false,
    why: '',
    blurb: 'Turn what you invest in, and why you, into a story LPs remember and repeat.',
    cover: ['What makes a thesis specific enough to stand out', 'Showing your edge with proof, not adjectives', 'Testing your thesis on friendly LPs before you go wide'],
    who: 'Anyone writing or rewriting their thesis, at any stage of the raise.'
  },
  {
    id: 'meetings', title: 'Running great LP meetings', date: new Date(2026, 11, 3, 12), mins: 60, rec: true,
    why: 'Your first meetings are coming up',
    blurb: 'How to structure a 30 minute meeting, handle the hard questions and ask for a commitment.',
    cover: ['A simple structure for a first LP meeting', 'The questions LPs always ask, and how to answer them', 'Following up so a maybe becomes a yes'],
    who: 'Managers with first LP meetings booked or coming soon.'
  },
  {
    id: 'model', title: 'Fund modeling 201', date: new Date(2026, 11, 1, 12), mins: 75, rec: false,
    why: '',
    blurb: 'Go past the basics: reserves for follow-on checks, ownership and what it takes to return the fund.',
    cover: ['Setting aside money for follow-on investments', 'Ownership, dilution and what a winner needs to look like', 'Stress testing your model before LPs do'],
    who: 'Managers who have a basic fund model and want to go deeper.'
  },
  {
    id: 'close', title: 'Your first close: what to expect', date: new Date(2026, 11, 10, 12), mins: 60, rec: false,
    why: '',
    blurb: 'What has to be in place before your first close, and how long each step usually takes.',
    cover: ['When you’re ready to hold a first close', 'Documents and steps along the way', 'Keeping momentum between first and final close'],
    who: 'Managers with soft commitments starting to come in.'
  }
];

const TODAY = new Date(2026, 10, 14, 15, 47);
const fresh = () => ({ listed: LIST.length, meetings: 0, soft: 0, weeksIn: 0, signed: new Set(), booked: false });
let state = fresh();

const $ = id => document.getElementById(id);
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(d) {
  if (d <= 0) return '$0';
  if (d >= 1e6) return '$' + String(+(d / 1e6).toFixed(d >= 1e7 ? 1 : 2)) + 'M';
  return '$' + Math.round(d / 1e3) + 'K';
}
const int = v => Math.round(v).toLocaleString('en-US');
const initials = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const shortDate = d => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const longDate = d => d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const timeOf = d => d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2400);
}

// Number tween so values roll instead of snapping.
const tweens = {};
function tween(el, to, fmt) {
  const from = tweens[el.id] ?? to;
  const t0 = performance.now(), dur = 600;
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

/* ---------- Header ---------- */
function renderHeader() {
  const h = TODAY.getHours();
  $('greet').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  $('today').textContent = TODAY.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('firstName').textContent = FUND.gp.split(' ')[0];
  $('fundName').textContent = FUND.name;
  $('navFund').textContent = FUND.name;
  $('navAv').textContent = initials(FUND.gp);
}

/* ---------- Next step ---------- */
function renderNext() {
  const ul = $('nextPeople');
  const top = LIST.slice(0, 4);
  const rest = LIST.length - top.length;
  ul.innerHTML = top.length
    ? top.map(([n, t]) => `<li><span class="pav">${initials(n)}</span><span class="pn">${esc(n)}</span><span class="pt">${t} check</span></li>`).join('') +
      (rest > 0 ? `<li class="more">+ ${rest} more on your list</li>` : '')
    : '<li class="more" style="padding-left:0">No names yet. Your first 10 go here.</li>';

  const ws = WORKSHOPS[0];
  $('nextWsDate').textContent = shortDate(ws.date);
  const btn = $('nextWorkshop');
  const joined = state.signed.has(ws.id);
  btn.classList.toggle('joined', joined);
  btn.firstChild.textContent = joined ? '✓ You’re in “Reaching out to your first LPs” on ' : 'Join “Reaching out to your first LPs” on ';

  if (state.meetings > 0) {
    $('nextTitle').textContent = 'Keep the meetings coming';
    $('nextSub').textContent = `${state.meetings} meetings so far and ${money(state.soft)} soft-circled. Follow up while conversations are warm, and keep adding names.`;
    $('startOutreach').firstChild.textContent = 'Plan this week’s outreach';
  } else if (LIST.length === 0) {
    $('nextTitle').textContent = 'Add your first 10 names';
    $('nextSub').textContent = 'Everything starts with your list. Add the people who come to mind first, then reach out to the ones most likely to say yes.';
    $('startOutreach').firstChild.textContent = 'Start my list';
  } else {
    $('nextTitle').textContent = `Reach out to your first ${Math.min(10, LIST.length)}`;
    $('nextSub').textContent = FUND.why
      ? 'Your list and your story are ready. Start with the people most likely to say yes, and aim for your first meetings this week.'
      : 'Your list is ready. Add why you to your fund story, then start with the people most likely to say yes.';
    $('startOutreach').firstChild.textContent = 'Start outreach';
  }
}

/* ---------- Live numbers ---------- */
function weeksToFirstClose() {
  // Behind or ahead of plan shifts the estimate; on plan it counts down week by week.
  const planned = FUND.pace * state.weeksIn;
  const ratio = planned > 0 ? state.meetings / planned : 1;
  const remaining = Math.max(0, FUND.firstCloseWeeks - state.weeksIn);
  return remaining / Math.max(0.4, ratio);
}

function renderNumbers(animate) {
  tween($('sList'), state.listed, int);
  $('sListOf').textContent = `of ${int(FUND.prospects)}`;
  $('bList').style.width = Math.min(100, state.listed / FUND.prospects * 100) + '%';
  $('nList').textContent = state.listed < 25 ? `${25 - state.listed} more to reach 25 for outreach.` : 'Keep adding as people come to mind.';

  tween($('sMeet'), state.meetings, int);
  $('sMeetOf').textContent = `of ${int(FUND.meetingsNeeded)}`;
  $('bMeet').style.width = Math.min(100, state.meetings / FUND.meetingsNeeded * 100) + '%';
  $('nMeet').textContent = `Your plan: ${FUND.pace} a week, about ${+(FUND.pace * MEETING_HOURS).toFixed(1)} hours.`;

  tween($('sSoft'), state.soft, money);
  $('sSoftOf').textContent = `of ${money(TO_RAISE)}`;
  $('bSoft').style.width = Math.min(100, state.soft / TO_RAISE * 100) + '%';
  $('nSoft').textContent = state.soft > 0
    ? `${Math.round(state.soft / FUND.firstClose * 100)}% of the way to your ${money(FUND.firstClose)} first close.`
    : 'LPs who’ve said they’re in, before signing.';

  const w = weeksToFirstClose();
  const d = new Date(TODAY.getTime() + w * 7 * 864e5);
  $('sClose').textContent = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const months = Math.max(1, Math.round(w / 4.345));
  $('nClose').textContent = `About ${months} month${months === 1 ? '' : 's'} away at your current pace.`;
  $('bClose').style.width = Math.min(100, state.soft / FUND.firstClose * 100) + '%';

  if (animate) document.querySelectorAll('.stat').forEach(s => { s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); });
}

/* ---------- Fund model and story ---------- */
function renderModel() {
  const rows = [
    ['Fund size', money(FUND.size)],
    ['First close', money(FUND.firstClose)],
    ['Minimum LP check', money(FUND.minCheck)],
    ['Check mix', FUND.mix, true],
    ['LPs needed', `About ${FUND.lpsNeeded}`],
    ['Meetings a week', String(FUND.pace)],
    ['Typical first check', money(FUND.firstCheck)],
    ['Portfolio', `About ${FUND.companies} companies`, true],
    ['Prospects to reach', int(FUND.prospects)]
  ];
  $('modelGrid').innerHTML = rows.map(([k, v, txt]) => `<div><dt>${k}</dt><dd class="${txt ? 'txt' : ''}">${esc(v)}</dd></div>`).join('');
  $('stThesis').textContent = FUND.thesis || 'Your thesis goes here. Pick a stage, sectors and region in your fund story.';
  $('stThesis').style.color = FUND.thesis ? '' : 'var(--ink-3)';
  $('stWhy').textContent = FUND.why || 'Not written yet. This is the line LPs remember.';
  $('stWhy').style.color = FUND.why ? '' : 'var(--ink-3)';
}

/* ---------- Workshops ---------- */
function renderWorkshops() {
  const sorted = [...WORKSHOPS].sort((a, b) => (b.rec - a.rec) || (a.date - b.date));
  $('wsGrid').innerHTML = sorted.map(w => {
    const signed = state.signed.has(w.id);
    const tags = [
      w.rec ? '<span class="ws-tag rec">Recommended for you</span>' : '',
      signed ? '<span class="ws-tag in">✓ Signed up</span>' : ''
    ].join('');
    return `<article class="ws ${w.rec ? 'rec' : ''} ${signed ? 'signed' : ''}">
      <div class="ws-tags">${tags}</div>
      <div class="ws-date">
        <span class="ws-cal"><i>${w.date.toLocaleString('en-US', { month: 'short' })}</i><b>${w.date.getDate()}</b></span>
        <span class="ws-time">${w.date.toLocaleString('en-US', { weekday: 'long' })}, ${timeOf(w.date)} ET<br>${w.mins} min · Live online</span>
      </div>
      <h3>${esc(w.title)}</h3>
      <p class="ws-blurb">${esc(w.blurb)}</p>
      ${w.rec ? `<p class="ws-why">${esc(w.why)}</p>` : ''}
      <button class="ws-btn" type="button" data-ws="${w.id}">${signed ? 'You’re signed up' : 'Learn more and sign up'}</button>
    </article>`;
  }).join('');
  $('wsGrid').querySelectorAll('[data-ws]').forEach(b => b.addEventListener('click', () => openWorkshop(b.dataset.ws)));
  const n = state.signed.size;
  $('learnCount').textContent = n ? `${n} workshop${n === 1 ? '' : 's'} on your calendar` : '';
}

let openWs = null;
function openWorkshop(id) {
  const w = WORKSHOPS.find(x => x.id === id);
  openWs = w;
  const when = `${longDate(w.date)} · ${timeOf(w.date)} ET · ${w.mins} min`;
  $('wsKicker').textContent = w.rec ? 'Recommended for you · Live · Free' : 'Live workshop · Free';
  $('wsTitle').textContent = w.title;
  $('wsWhen').textContent = when;
  $('wsDesc').textContent = w.blurb;
  $('wsCover').innerHTML = w.cover.map(c => `<li>${esc(c)}</li>`).join('');
  $('wsFor').textContent = w.who;
  $('wsDoneWhen').textContent = `${w.title} · ${when}`;
  const signed = state.signed.has(id);
  $('wsInfo').hidden = signed;
  $('wsDone').hidden = !signed;
  $('wsSheet').hidden = false;
}

/* ---------- Help: book a call (prototype, no real scheduling) ---------- */
const SLOT_TIMES = ['10:00 AM', '1:30 PM', '4:00 PM'];
const booking = { day: null, time: null };

function nextWeekdays(n) {
  const out = [], d = new Date(TODAY);
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
  SLOT_TIMES.forEach(t => {
    const b = document.createElement('button');
    b.textContent = t;
    b.classList.toggle('on', t === booking.time);
    b.addEventListener('click', () => { booking.time = t; renderBooking(); });
    slots.appendChild(b);
  });
  $('bookConfirm').disabled = booking.day === null || !booking.time;
}

function initPanels() {
  const days = nextWeekdays(4);
  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${d.toLocaleString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b>${d.toLocaleString('en-US', { month: 'short' })}`;
    b.addEventListener('click', () => { booking.day = i; booking.time = null; renderBooking(); });
    $('days').appendChild(b);
  });

  const book = $('book'), ws = $('wsSheet');
  const closeAll = () => { book.hidden = true; ws.hidden = true; };

  $('helpBtn').addEventListener('click', () => {
    booking.day = 0; booking.time = null;
    $('bookPick').hidden = false; $('bookDone').hidden = true;
    renderBooking();
    book.hidden = false;
  });
  $('bookConfirm').addEventListener('click', () => {
    $('bookWhen').textContent = `${longDate(days[booking.day])} at ${booking.time}.`;
    $('bookPick').hidden = true; $('bookDone').hidden = false;
    $('helpBtn').firstChild.textContent = 'Call booked';
  });

  $('wsSignup').addEventListener('click', () => {
    state.signed.add(openWs.id);
    $('wsInfo').hidden = true; $('wsDone').hidden = false;
    renderWorkshops();
    renderNext();
  });

  [$('bookClose'), $('bookDoneBtn'), $('wsClose'), $('wsDoneBtn')].forEach(b => b.addEventListener('click', closeAll));
  [book, ws].forEach(p => p.addEventListener('click', e => { if (e.target === p) closeAll(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
}

/* ---------- Nav highlight ---------- */
function initNav() {
  const links = [...document.querySelectorAll('.links a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
  const update = () => {
    const y = window.scrollY + 120;
    let idx = 0;
    targets.forEach((t, i) => { if (t && t.offsetTop <= y) idx = i; });
    if (window.scrollY < 40) idx = 0;
    links.forEach((a, i) => a.classList.toggle('on', i === idx));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------- Init ---------- */
function renderAll(animate) {
  renderNext();
  renderNumbers(animate);
  renderWorkshops();
}

function init() {
  renderHeader();
  renderModel();
  renderAll(false);
  initPanels();
  initNav();

  $('startOutreach').addEventListener('click', () => {
    if (LIST.length === 0) { DemoNav.go(3); return; }
    toast('Outreach tools would open here. Not part of this prototype.');
  });
  $('nextWorkshop').addEventListener('click', () => openWorkshop('outreach'));
  $('openModel').addEventListener('click', () => DemoNav.go(1));
  $('openStory').addEventListener('click', () => DemoNav.go(4));

  // Prototype helper: two weeks of progress at the planned pace.
  $('demoSim').addEventListener('click', () => {
    state.weeksIn += 2;
    state.listed += 8;
    state.meetings += FUND.pace * 2 - 3;
    state.soft += 2 * 150e3 + (state.weeksIn >= 4 ? 300e3 : 0);
    renderAll(true);
    toast(`Two weeks later: ${state.meetings} meetings held, ${money(state.soft)} soft-circled.`);
  });
  $('demoReset').addEventListener('click', () => {
    const signed = state.signed;
    state = fresh();
    state.signed = signed;
    renderAll(true);
  });
}

init();
