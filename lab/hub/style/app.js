// Style guide: swatches, small live demos and the tokens block.
(function () {
  const $ = id => document.getElementById(id);

  const SWATCHES = {
    purples: [
      ['Plum', '--plum', '#3F3168', 'Hero numbers, dark banners, selected states'],
      ['Plum 2', '--plum-2', '#54449A', 'End of dark gradients'],
      ['Violet', '--violet', '#6E5DAA', 'Eyebrows, focus, accents'],
      ['Lavender', '--lavender', '#A99BD3', 'Hover borders, secondary fills'],
      ['Lilac', '--lilac', '#D9D1EE', 'Light fills, avatars'],
      ['Mist', '--mist', '#EFEBF8', 'Tinted backgrounds, soft buttons']
    ],
    neutrals: [
      ['Background', '--bg', '#F6F4FA', 'The page'],
      ['Surface', '--surface', '#FFFFFF', 'Cards and panels'],
      ['Ink', '--ink', '#211B2E', 'Primary text'],
      ['Ink 2', '--ink-2', '#5B546B', 'Secondary text, labels'],
      ['Ink 3', '--ink-3', '#958FA4', 'Hints, captions'],
      ['Line', '--line', '#E7E2EF', 'Borders, dividers']
    ],
    success: [
      ['Sage', '--sage', '#8CBFA4', 'Goal reached, positive dots'],
      ['Sage tint', '--sage-tint', '#DCEFE4', 'Success backgrounds'],
      ['Sage ink', '--sage-ink', '#2F7A55', 'Success text']
    ],
    amber: [
      ['Amber ink', '--amber-ink', '#9A6A1E', 'Nudge text'],
      ['Amber number', '--amber-num', '#B8862E', 'A number that needs attention'],
      ['Amber dot', '--amber-dot', '#D9A441', 'Nudge dot'],
      ['Amber tint', '--amber-bg', '#FCF6E8', 'Nudge card tint'],
      ['Amber line', '--amber-line', '#EEDDB4', 'Nudge card border']
    ]
  };

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2000);
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${label}`);
    } catch (e) {
      toast(`${label}: ${text.length > 40 ? 'select the text and copy it' : text}`);
    }
  }

  // Swatches
  document.querySelectorAll('.swatches').forEach(wrap => {
    SWATCHES[wrap.dataset.group].forEach(([name, token, hex, use]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw';
      b.innerHTML = `<span style="background:${hex}"></span><div><b>${name}</b><code>${hex} · ${token}</code><p>${use}</p></div>`;
      b.addEventListener('click', () => copy(hex, `${name} ${hex}`));
      wrap.appendChild(b);
    });
  });

  // Motion demos
  $('replayRise').addEventListener('click', () => {
    document.querySelectorAll('.card').forEach((c, i) => {
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = `rise .5s var(--ease) ${i * 0.05}s both`;
    });
  });

  const rollVals = [10, 15, 5, 25, 10];
  let rollIdx = 0, rollFrom = 10;
  $('rollBtn').addEventListener('click', () => {
    rollIdx = (rollIdx + 1) % rollVals.length;
    const to = rollVals[rollIdx], from = rollFrom, t0 = performance.now(), el = $('rollNum');
    const step = now => {
      const k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
      el.textContent = '$' + Math.round(from + (to - from) * e) + 'M';
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    rollFrom = to;
  });

  $('flashBtn').addEventListener('click', () => {
    const r = $('flashRow');
    r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
  });

  // Standard slider fill
  const std = $('stdSlider');
  const fill = () => std.style.setProperty('--fill', std.value + '%');
  std.addEventListener('input', fill);
  fill();

  // Demo chips and segmented control
  document.querySelectorAll('.row-demo .chip:not(:disabled)').forEach(c => c.addEventListener('click', () => {
    c.classList.toggle('on');
    c.textContent = (c.classList.contains('on') ? '✓ ' : '') + c.textContent.replace(/^✓ /, '');
  }));
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  }));

  // Tokens: the block is the contents of tokens.css, embedded in the page.
  $('copyTokens').addEventListener('click', () => copy($('tokensCode').textContent, 'tokens'));
})();