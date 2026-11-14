// Sign-up placeholder. Saves the name and starts the flow.
(function () {
  const $ = id => document.getElementById(id);
  const saved = DemoStore.load();
  const started = localStorageHas();

  if (started && saved.name) $('name').value = saved.name;
  if (started && saved.email) $('email').value = saved.email;
  $('resume').hidden = !started;

  $('signupForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('name').value.trim() || DemoStore.DEFAULTS.name;
    DemoStore.save({ name, email: $('email').value.trim() });
    DemoNav.go(1);
  });
  $('resumeBtn').addEventListener('click', () => DemoNav.go(1));

  function localStorageHas() {
    try { return !!localStorage.getItem('decile-onboarding-demo'); } catch (e) { return false; }
  }
})();
