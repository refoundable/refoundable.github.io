// Shared demo state. Every page reads and writes the same record in the
// browser's local storage, so choices carry forward through the flow.
(function () {
  const KEY = 'decile-onboarding-demo';

  // What a fresh demo starts with. Units: size in $M, checks in $K.
  const DEFAULTS = {
    name: 'Alex Rivera',
    email: '',
    size: 10,             // fund size
    firstCheck: 150,      // average first check into a startup
    companies: 51,        // portfolio size from the fund size page
    minCheck: 100,        // minimum LP check
    preset: 'balanced',   // commitment mix
    pace: 10,             // LP meetings per week
    known: 100,           // people they could ask today
    plan: {               // results of the LP plan page
      lps: 52, prospects: 520, meetings: 332,
      firstCloseWeeks: 19.6, finalCloseWeeks: 43.2,
      tierChecks: [100, 250, 600]
    },
    people: [],           // first LPs: { id, name, prompt, tier }
    story: null           // fund story fields, plus thesisText for the dashboard
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  let memory = null;      // fallback if local storage is unavailable

  function load() {
    let saved = memory;
    try { saved = JSON.parse(localStorage.getItem(KEY)) || memory; } catch (e) { /* use memory */ }
    return Object.assign(clone(DEFAULTS), saved || {});
  }

  function save(patch) {
    const next = Object.assign(load(), patch);
    memory = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* memory only */ }
    return next;
  }

  function reset() {
    memory = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ }
  }

  window.DemoStore = { load, save, reset, DEFAULTS };
})();
