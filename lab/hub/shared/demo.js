// Demo bar: step links and a restart button, added to each page's prototype bar.
// Pages set data-step (0 to 5) and data-root ('' at the top level, '../' in a step folder) on <body>.
(function () {
  const STEPS = [
    ['Sign up', ''],
    ['Fund size', '01-fund-size/'],
    ['LP plan', '02-lp-plan/'],
    ['First LPs', '03-first-lps/'],
    ['Fund story', '04-fund-story/'],
    ['Dashboard', '05-dashboard/']
  ];
  const root = document.body.dataset.root || '';
  const current = +document.body.dataset.step;
  const url = path => root + path + 'index.html';

  window.DemoNav = {
    go(step) { location.href = url(STEPS[step][1]); },
    restart() { window.DemoStore.reset(); location.href = url(''); }
  };

  const bar = document.querySelector('.proto');
  if (!bar) return;

  const nav = document.createElement('nav');
  nav.className = 'demo-steps';
  nav.setAttribute('aria-label', 'Demo steps');
  STEPS.forEach(([label, path], i) => {
    const a = document.createElement('a');
    a.href = url(path);
    a.textContent = i === 0 ? label : `${i} ${label}`;
    if (i === current) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
    nav.appendChild(a);
  });

  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'demo-restart';
  restart.textContent = '↺ Restart demo';
  restart.addEventListener('click', () => window.DemoNav.restart());
  nav.appendChild(restart);

  const actions = bar.querySelector('.proto-actions');
  if (actions) bar.insertBefore(nav, actions); else bar.appendChild(nav);
})();
