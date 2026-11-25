const $ = id => document.getElementById(id);
const show = (el, on) => el.classList.toggle('hidden', !on);

const qs = [...document.querySelectorAll('#planner .q')];
const answers = {};
let applied = false;
let cur = 0;

function go(i){
  cur = i;
  qs.forEach((q, n) => show(q, n === i));
  const q = qs[i];
  q.classList.remove('fade'); void q.offsetWidth; q.classList.add('fade');
  $('bar').style.width = ((i + 1) / qs.length * 100) + '%';
  $('back').classList.toggle('gone', i === 0);
  document.querySelectorAll('.pl-foot .next').forEach(b => show(b, b.dataset.for === q.dataset.k));
}

qs.forEach((q, i) => {
  q.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    q.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
    b.classList.add('sel');
    answers[q.dataset.k] = b.dataset.v;
    setTimeout(() => go(i + 1), 180);
  });
  const chips = [...q.querySelectorAll('.chip-o')];
  if (!chips.length) return;
  const max = +q.dataset.max, next = document.querySelector('.pl-foot .next[data-for="' + q.dataset.k + '"]'), other = q.querySelector('.other-in');
  chips.forEach(c => c.onclick = () => {
    if (!c.classList.contains('sel')) {
      // "Global" can't be combined with specific regions
      if ('solo' in c.dataset) chips.forEach(x => x.classList.remove('sel'));
      else chips.filter(x => 'solo' in x.dataset).forEach(x => x.classList.remove('sel'));
    }
    const picked = chips.filter(x => x.classList.contains('sel'));
    if (!c.classList.contains('sel') && picked.length >= max) return;
    c.classList.toggle('sel');
    const now = chips.filter(x => x.classList.contains('sel'));
    q.querySelector('.cnt').textContent = now.length;
    next.disabled = !now.length;
    chips.forEach(x => x.classList.toggle('off', now.length >= max && !x.classList.contains('sel')));
    if (other && c.textContent === 'Other') {
      show(other, c.classList.contains('sel'));
      if (c.classList.contains('sel')) other.focus();
    }
  });
  if (other) other.onkeydown = e => { if (e.key === 'Enter' && !next.disabled) next.click(); };
  next.onclick = () => {
    answers[q.dataset.k] = chips.filter(x => x.classList.contains('sel'))
      .map(x => x.textContent === 'Other' && other && other.value.trim() ? other.value.trim() : x.textContent);
    go(i + 1);
  };
});

const mailErrText = $('mailErr').textContent;
$('mailForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('mailName').value.trim();
  const v = $('mail').value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $('mailErr').textContent = !name ? 'Please enter your name' : mailErrText;
  show($('mailErr'), !name || !ok);
  if (!name) return $('mailName').focus();
  if (!ok) return $('mail').focus();

  const btn = e.submitter;
  if (btn) btn.disabled = true;
  try {
    await submitLead({
      form_type: 'application',
      name,
      email: v,
      regions: answers.where,
      fund_size: answers.size,
      stage: answers.stage,
      sectors: answers.sectors,
      lp_network: answers.lps,
      angel_checks: answers.angel,
    }, 'mailHp');
  } catch (err) {
    if (btn) btn.disabled = false;
    $('mailErr').textContent = 'Something went wrong. Please try again, or email john@refoundable.com.';
    show($('mailErr'), true);
    return;
  }

  $('sentTo').textContent = v;
  show($('sendForm'), false); show($('sent'), true); show($('applyBtn'), false); show($('labApply'), false);
  applied = true; syncNav();
  show($('back'), false); show($('sentNote'), true);
  $('sumRows').replaceChildren(...[['size', 'Fund size'], ['stage', 'Stage'], ['sectors', 'Sectors'], ['where', 'Region'], ['lps', 'Network LPs'], ['angel', 'Angel investments']].map(([k, label]) => {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = [].concat(answers[k] || '—').join(', ');
    row.append(dt, dd); return row;
  }));
};

$('back').onclick = () => go(cur - 1);
go(0);

$('navCta').onclick = () => {
  const p = $('planner');
  p.scrollIntoView({behavior:'smooth', block:'center'});
  p.querySelector('.pl-bar').animate([{boxShadow:'0 0 0 0 rgba(110,93,170,.6)'},{boxShadow:'0 0 0 6px rgba(110,93,170,0)'}],{duration:800});
};

// Sticky nav: the Apply button only appears once the application has scrolled out of view
let plannerVisible = true;
const syncNav = () => {
  $('navCta').classList.toggle('show', !plannerVisible && !applied);
};
$('labApply').onclick = () => $('navCta').onclick();
new IntersectionObserver(([e]) => { plannerVisible = e.isIntersecting; syncNav(); }, {rootMargin: '-120px 0px 0px 0px'}).observe($('planner'));

// Book a call: region, then contact details, then a short confirmation
const bk = $('booker');
const bkSteps = [...bk.querySelectorAll('.q')];
const bkChips = [...bkSteps[0].querySelectorAll('.chip-o')];

function bkGo(i){
  bkSteps.forEach((q, n) => show(q, n === i));
  bkSteps[i].classList.remove('fade'); void bkSteps[i].offsetWidth; bkSteps[i].classList.add('fade');
  $('bkBar').style.width = ((i + 1) / bkSteps.length * 100) + '%';
  $('bkBack').classList.toggle('gone', i !== 1);
  show($('bkNext'), i === 0); show($('bkSend'), i === 1); show($('bkDone'), i === 2);
  if (i === 1) $('bkName').focus();
}

function bkSync(){
  const now = bkChips.filter(x => x.classList.contains('sel'));
  bkSteps[0].querySelector('.cnt').textContent = now.length;
  $('bkNext').disabled = !now.length;
  bkChips.forEach(x => x.classList.toggle('off', now.length >= 2 && !x.classList.contains('sel')));
}

bkChips.forEach(c => c.onclick = () => {
  if (!c.classList.contains('sel')) {
    // "Global" can't be combined with specific regions
    if ('solo' in c.dataset) bkChips.forEach(x => x.classList.remove('sel'));
    else bkChips.filter(x => 'solo' in x.dataset).forEach(x => x.classList.remove('sel'));
    if (bkChips.filter(x => x.classList.contains('sel')).length >= 2) return;
  }
  c.classList.toggle('sel');
  bkSync();
});

$('bookBtn').onclick = () => {
  // Carry over the regions from the application if they've already answered it
  if (answers.where && !bkChips.some(x => x.classList.contains('sel')))
    bkChips.forEach(x => x.classList.toggle('sel', answers.where.includes(x.textContent)));
  bkSync(); bkGo(0); bk.showModal();
};
$('bkNext').onclick = () => bkGo(1);
$('bkBack').onclick = () => bkGo(0);
$('bkClose').onclick = $('bkDone').onclick = () => bk.close();
// Clicking the dimmed page around the pop-up closes it; clicks on its own padding do not
bk.onclick = e => {
  const r = bk.getBoundingClientRect();
  if (e.target === bk && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) bk.close();
};

$('bkForm').onsubmit = async e => {
  e.preventDefault();
  const name = $('bkName').value.trim(), mail = $('bkMail').value.trim(), li = $('bkIn').value.trim();
  const bad = [
    [!name, $('bkName'), 'Please enter your name'],
    [li && !/linkedin\.com\//i.test(li), $('bkIn'), 'That doesn’t look like a LinkedIn profile link'],
    [!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail), $('bkMail'), 'Please enter a valid email address']
  ];
  bad.forEach(([b, el]) => el.classList.toggle('bad', !!b));
  const first = bad.find(([b]) => b);
  show($('bkErr'), !!first);
  if (first) { $('bkErr').textContent = first[2]; return first[1].focus(); }

  $('bkSend').disabled = true;
  try {
    await submitLead({
      form_type: 'call',
      name,
      email: mail,
      linkedin: li,
      regions: bkChips.filter(x => x.classList.contains('sel')).map(x => x.textContent.trim()),
    }, 'bkHp');
  } catch (err) {
    $('bkErr').textContent = 'Something went wrong. Please try again, or email john@refoundable.com.';
    show($('bkErr'), true);
    return;
  } finally {
    $('bkSend').disabled = false;
  }

  $('bkFirst').textContent = name.split(/\s+/)[0];
  $('bkTo').textContent = mail;
  bkGo(2);
};

// Theme toggle: remembers the choice; defaults to system setting
const root = document.documentElement;
const setTheme = dark => {
  root.classList.toggle('dark', dark);
  $('themeBtn').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
};
const saved = () => { try { return localStorage.getItem('theme'); } catch (e) { return null; } };
setTheme(root.classList.contains('dark'));
$('themeBtn').onclick = () => {
  const dark = !root.classList.contains('dark');
  setTheme(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if (!saved()) setTheme(e.matches); });

// honeypot check for form submission
async function submitLead(payload, honeypotId) {
  const res = await fetch("/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      website: document.getElementById(honeypotId)?.value || "",
      test: new URLSearchParams(location.search).get("test") === "1",
    }),
  });
  const out = await res.json().catch(() => ({ ok: false }));
  if (!out.ok) throw new Error(out.error || "submit_failed");
}