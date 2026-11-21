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

$('mailForm').onsubmit = e => {
  e.preventDefault();
  const v = $('mail').value.trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  show($('mailErr'), !ok);
  if (!ok) return $('mail').focus();
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

$('howTenK').onclick = () => {
  const d = $('ten-k');
  d.open = true;
  d.scrollIntoView({behavior:'smooth', block:'center'});
  d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash');
};