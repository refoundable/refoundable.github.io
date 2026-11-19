// Homepage and sign-up. Saves the name and starts the flow.
(function () {
  const $ = id => document.getElementById(id);
  const saved = DemoStore.load();
  const started = localStorageHas();

  // On a return visit, refill what the user typed. When the field was left empty, the
  // default name is saved for the later pages but never goes back into the field.
  if (started && saved.nameTyped) $('name').value = saved.name;
  if (started && saved.email) $('email').value = saved.email;

  function start() {
    const typed = $('name').value.trim();
    DemoStore.save({ name: typed || DemoStore.DEFAULTS.name, nameTyped: !!typed, email: $('email').value.trim() });
    DemoNav.go(1);
  }

  $('signupForm').addEventListener('submit', e => { e.preventDefault(); start(); });

  // Google and LinkedIn sign-up do the same as the form in the demo.
  $('ssoGoogle').addEventListener('click', start);
  $('ssoLinkedin').addEventListener('click', start);

  // Log in picks up where they left off, or points to sign-up if they haven't started.
  $('loginBtn').addEventListener('click', () => {
    if (started) DemoNav.go(Math.min(5, (saved.stepsDone || 0) + 1));
    else focusSignup();
  });

  // Every "Start your fund" button scrolls to the form and puts the cursor in it.
  document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
    closeTen();
    focusSignup();
  }));
  function focusSignup() {
    $('signup').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('name').focus({ preventScroll: true }), 400);
  }

  // How the $10K works, in a pop-up from the offer card.
  function openTen() { $('howTen').hidden = false; $('howTenClose').focus(); }
  function closeTen() { $('howTen').hidden = true; }
  $('offerHow').addEventListener('click', openTen);
  $('howTenClose').addEventListener('click', closeTen);
  $('howTen').addEventListener('click', e => { if (e.target === $('howTen')) closeTen(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('howTen').hidden) closeTen(); });

  // Terms, Privacy and Help go nowhere in the demo.
  document.querySelectorAll('a.dead').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // Live sessions: saving a seat flips the button, and a second click undoes it.
  document.querySelectorAll('.w-save').forEach(b => b.addEventListener('click', () => {
    const saved = b.classList.toggle('saved');
    b.textContent = saved ? '✓ Seat saved' : 'Save my seat';
  }));

  // Stories: one at a time on a loop. Pauses while hovered or focused, and when
  // the visitor prefers reduced motion. The name tabs jump to a story, and the
  // bar on the current tab fills while it plays.
  const slides = [...document.querySelectorAll('.slide')];
  const dots = $('dots');
  const STORY_MS = 9000;
  let current = 0, timer = null;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = $('stories');
  box.style.setProperty('--story-ms', `${STORY_MS}ms`);

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.innerHTML = `<b>${s.dataset.name}</b><small>${s.dataset.meta}</small>`;
    b.addEventListener('click', () => { show(i); restart(); });
    dots.appendChild(b);
  });

  function show(i) {
    slides[current].classList.remove('is-on');
    current = (i + slides.length) % slides.length;
    slides[current].classList.add('is-on');
    paintDots();
  }
  function paintDots() {
    [...dots.children].forEach((d, i) => {
      d.classList.remove('on');
      d.setAttribute('aria-selected', i === current);
    });
    // Forcing a reflow between removing and re-adding the class restarts the fill from zero.
    const tab = dots.children[current];
    void tab.offsetWidth;
    tab.classList.add('on');
    if (dots.scrollWidth > dots.clientWidth) dots.scrollTo({ left: tab.offsetLeft - 12, behavior: 'smooth' });
  }
  function restart() {
    clearInterval(timer);
    box.classList.remove('paused');
    if (!still) timer = setInterval(() => show(current + 1), STORY_MS);
  }
  function pause() { clearInterval(timer); box.classList.add('paused'); }

  box.addEventListener('mouseenter', pause);
  box.addEventListener('mouseleave', () => { paintDots(); restart(); });
  box.addEventListener('focusin', pause);
  box.addEventListener('focusout', () => { paintDots(); restart(); });
  paintDots();
  restart();

  function localStorageHas() {
    try { return !!localStorage.getItem('decile-onboarding-demo'); } catch (e) { return false; }
  }
})();