// Shared page footer: fine print, main button, help banner and the 20 minute help call.
// Each page adds one placeholder with its own wording, and loads this file before its app.js:
//
//   <div id="pageFoot"
//        data-fine="Fine print on the left."
//        data-cta="Main button label"
//        data-help="Stuck on your thesis?"
//        data-help-sub="Banner line under the title."
//        data-book-sub="Intro line in the booking panel."
//        data-book-note="Line after booking."
//        data-book-back="Back to my story"></div>
//
// Leave out data-cta and data-fine on a page with no main button (the dashboard).
// The help banner goes right after the footer. To put it somewhere else on a page,
// add <div id="pageHelp"></div> where it should go.
//
// The page's app.js finds the same ids as before: cta, ctaText, fine, helpBanner, helpBtn.
(function () {
  /* ---------- Booking panels (prototype, no real scheduling) ---------- */
  function nextWeekdays(n) {
    const out = [], d = new Date();
    d.setHours(0, 0, 0, 0);
    while (out.length < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
    }
    return out;
  }
  const longDate = d => d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const $ = id => document.getElementById(id);

  // One booking panel. prefix is the start of the panel's element ids, e.g. 'book' or 'sales':
  // {prefix}Days, {prefix}Slots, {prefix}Confirm, {prefix}Pick, {prefix}Done, {prefix}When,
  // {prefix}DoneBtn and {prefix}Close.
  function make(cfg) {
    const id = s => $(cfg.prefix + s);
    const panel = $(cfg.panel);
    const days = nextWeekdays(cfg.days || 4);
    const pick = { day: 0, time: null };
    const when = cfg.when || ((d, t) => `${longDate(d)} at ${t}.`);

    const render = () => {
      [...id('Days').children].forEach((b, i) => b.classList.toggle('on', i === pick.day));
      const slots = id('Slots');
      slots.innerHTML = '';
      cfg.times.forEach(t => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        b.classList.toggle('on', t === pick.time);
        b.addEventListener('click', () => { pick.time = t; render(); });
        slots.appendChild(b);
      });
      id('Confirm').disabled = !pick.time;
    };

    days.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `${d.toLocaleString('en-US', { weekday: 'short' })}<b>${d.getDate()}</b>${d.toLocaleString('en-US', { month: 'short' })}`;
      b.addEventListener('click', () => { pick.day = i; pick.time = null; render(); });
      id('Days').appendChild(b);
    });

    const close = () => { panel.hidden = true; };
    id('Close').addEventListener('click', close);
    id('DoneBtn').addEventListener('click', close);
    panel.addEventListener('click', e => { if (e.target === panel) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

    id('Confirm').addEventListener('click', () => {
      id('When').textContent = when(days[pick.day], pick.time);
      id('Pick').hidden = true;
      id('Done').hidden = false;
      if (cfg.onBooked) cfg.onBooked();
    });

    return {
      open(showDone) {
        if (!showDone) {
          pick.day = 0; pick.time = null;
          id('Pick').hidden = false;
          id('Done').hidden = true;
          render();
        }
        if (cfg.onOpen) cfg.onOpen();
        panel.hidden = false;
      }
    };
  }

  // Other panels on a page (like the $20M+ sales call) can reuse this.
  window.DemoBooking = { make, longDate };

  /* ---------- Footer, help banner and help call ---------- */
  const slot = $('pageFoot');
  if (!slot) return;
  const o = slot.dataset;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content; };

  const parts = [];
  if (o.fine || o.cta) {
    parts.push(html(`
      <footer class="foot">
        ${o.fine ? `<p class="fine" id="fine">${esc(o.fine)}</p>` : ''}
        ${o.cta ? `<span class="cta-wrap"><button class="cta cta-step" id="cta"><span id="ctaText">${esc(o.cta)}</span></button></span>` : ''}
      </footer>`));
  }

  const banner = html(`
    <aside class="help" id="helpBanner" aria-label="Get help from the Decile team">
      <div class="help-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a3 3 0 0 1-3 3h-3"/></svg>
      </div>
      <div class="help-copy">
        <p class="help-title">${esc(o.help || 'Need help?')} Talk to the team.</p>
        <p class="help-sub">${esc(o.helpSub || 'Book a free call with a Decile fund specialist. We’ll walk through your fund model and setup with you.')}</p>
      </div>
      <button class="help-btn" id="helpBtn">Book a time<span class="arrow">→</span></button>
    </aside>`);

  const spot = $('pageHelp');
  if (spot) spot.replaceWith(banner); else parts.push(banner);
  slot.replaceWith(...parts);

  document.body.appendChild(html(`
    <div class="book" id="book" hidden>
      <div class="book-panel" role="dialog" aria-modal="true" aria-labelledby="bookTitle">
        <button class="book-x" id="bookClose" aria-label="Close">×</button>
        <div id="bookPick">
          <p class="eyebrow">Free · 20 minute call</p>
          <h2 id="bookTitle">Talk to a fund specialist</h2>
          <p class="book-sub">${esc(o.bookSub || 'Pick a time that works. We’ll go through your plan, your questions and next steps for setup.')}</p>
          <div class="days" id="bookDays"></div>
          <div class="slots" id="bookSlots"></div>
          <button class="cta book-go" id="bookConfirm" disabled>Confirm time<span class="arrow">→</span></button>
        </div>
        <div id="bookDone" hidden>
          <div class="done-check">✓</div>
          <h2>You’re booked</h2>
          <p class="book-sub" id="bookWhen"></p>
          <p class="book-note">${esc(o.bookNote || 'We’ll send a calendar invite with a video link.')}</p>
          <button class="cta book-go" id="bookDoneBtn">${esc(o.bookBack || 'Done')}</button>
        </div>
      </div>
    </div>`));

  const helpCall = make({
    panel: 'book', prefix: 'book', days: 4,
    times: ['10:00 AM', '1:30 PM', '4:00 PM'],
    onBooked: () => { $('helpBtn').firstChild.textContent = 'Call booked'; }
  });
  $('helpBtn').addEventListener('click', () => helpCall.open(false));
})();