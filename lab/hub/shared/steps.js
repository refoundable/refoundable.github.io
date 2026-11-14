// Setup breadcrumb for steps 1 to 4, added to the top of <main>. No page markup needed.
// Load after store.js, demo.js and footer.js, and before app.js. It reads data-step from <body>.
//
// A step counts as completed once someone leaves it with the page's main button,
// which is the only way to move on to a new step. The breadcrumb can go back to any
// earlier step, and forward only to steps already completed. The rest are locked.
(function () {
  const STEPS = ['Fund size', 'Your raise', 'First LPs', 'Final steps'];
  const current = +document.body.dataset.step;
  const main = document.querySelector('main');
  if (!main || !(current >= 1 && current <= STEPS.length)) return;

  const completed = DemoStore.load().stepsDone || 0;

  // A page can block moving on (the fund size page does at $20M+).
  const blocked = () => document.body.classList.contains('over');

  // Mark this step completed when the main button moves on. This runs before the
  // page's own handler, because this file loads before app.js.
  const cta = document.getElementById('cta');
  if (cta) {
    cta.addEventListener('click', () => {
      if (!blocked()) DemoStore.save({ stepsDone: Math.max(completed, current) });
    });
  }

  const nav = document.createElement('nav');
  nav.className = 'steps';
  nav.setAttribute('aria-label', 'Setup steps');

  const list = document.createElement('ol');
  list.className = 'steps-list';
  STEPS.forEach((label, i) => {
    const n = i + 1;
    const li = document.createElement('li');
    const done = n <= completed;
    const open = n < current || (n > current && done);
    li.className = n === current ? 'is-now' : done ? 'is-done' : open ? 'is-open' : 'is-locked';

    const el = document.createElement(open ? 'a' : 'span');
    el.innerHTML = `<i>${done && n !== current ? '✓' : n}</i><b>${label}</b>`;
    if (n === current) el.setAttribute('aria-current', 'step');
    if (open) {
      el.href = DemoNav.url(n);
      // At $20M+ on the fund size page, moving forward has to go through the fund team.
      if (n > current) el.addEventListener('click', e => { if (blocked()) e.preventDefault(); });
    }
    li.appendChild(el);
    list.appendChild(li);
  });
  nav.appendChild(list);

  main.prepend(nav);
})();