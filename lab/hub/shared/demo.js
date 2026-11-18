// Demo bar: the name, optional step links, and a restart button on the dashboard.
// Pages set data-step (0 to 5) and data-root ('' at the top level, '../' in a step folder) on <body>.
(function () {
  const STEPS = [
    ['Sign up', ''],
    ['Size', '01-size/'],
    ['Focus', '02-story/'],
    ['Raise', '03-plan/'],
    ['First check', '04-prospects/'],
    ['Dashboard', '05-dashboard/']
  ];
  const root = document.body.dataset.root || '';
  const current = +document.body.dataset.step;
  const url = path => root + path + 'index.html';
  // Step links can be shown or hidden. Set to true to show them
  const SHOW_STEPS = true;

  window.DemoNav = {
    url(step) { return url(STEPS[step][1]); },
    go(step) { location.href = url(STEPS[step][1]); },
    restart() { window.DemoStore.reset(); location.href = url(''); }
  };

  const bar = document.querySelector('.proto');
  if (!bar) return;
  // The name in the bar is set here for every page
  // The divider between the two parts is drawn in CSS (.tag-sub::before)
  const BAR_NAME = 'Iris';
  const BAR_LABEL = 'Design Preview';
  let tag = bar.querySelector('.tag');
  if (!tag) {
    tag = document.createElement('span');
    tag.className = 'tag';
    bar.prepend(tag);
  }
  const name = document.createElement('span');
  name.textContent = BAR_NAME;
  const sub = document.createElement('span');
  sub.className = 'tag-sub';
  sub.textContent = BAR_LABEL;
  tag.replaceChildren(name, sub);

  const actions = bar.querySelector('.proto-actions');
  
    if (SHOW_STEPS) {
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
      if (actions) bar.insertBefore(nav, actions); else bar.appendChild(nav);
    }
  
    // Restart sits with the page's own controls, and only on the dashboard, the end of the flow.
    if (current === STEPS.length - 1) {
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'demo-restart';
      restart.textContent = '↺ Restart';
      restart.addEventListener('click', () => window.DemoNav.restart());
      let box = actions;
      if (!box) {
        box = document.createElement('span');
        box.className = 'proto-actions';
        bar.appendChild(box);
      }
      box.appendChild(restart);
    }
  })();
