/* Interface sounds: single key presses cut from two CC0 Freesound recordings (assets/sounds/ui/CREDITS.md).
   Kept to a few moments: picking an answer, going back, opening a build, copying a share link, and a light detent
   tick as the price slider moves.
   Visitors can turn them off with the speaker button; the choice is remembered on this device. */
(() => {
  const FILES = { key: ['key-1', 'key-2', 'key-3'], settle: ['settle'], confirm: ['confirm'] };
  const LEVEL = { key: 0.3, settle: 0.42, confirm: 0.32, tick: 0.2 };
  // A tick is just the first click of a key press (the down stroke), so it borrows the key recordings.
  const FROM = { tick: 'key' };
  const STORE = 'thock.sound';
  let on = true, ctx = null, out = null, fetched = false;
  const raw = {}, bufs = {}, pending = {}, lastAt = {}, lastPick = {};
  try { on = localStorage.getItem(STORE) !== 'off'; } catch (e) {}

  // The files are fetched while the page is idle; decoding needs an audio context, which browsers only let a page
  // start from a tap or key press, so that waits for the first one.
  function fetchAll() {
    if (fetched || !on) return; fetched = true;
    for (const [name, files] of Object.entries(FILES)) files.forEach((f, i) => {
      fetch(`assets/sounds/ui/${f}.wav`).then(r => r.ok ? r.arrayBuffer() : null).then(b => {
        if (!b) return; (raw[name] ??= [])[i] = b; if (ctx) decode(name, i);
      }).catch(() => {});
    });
  }
  function decode(name, i) {
    const b = raw[name]?.[i]; if (!b || bufs[name]?.[i]) return;
    raw[name][i] = null;
    const p = ctx.decodeAudioData(b).then(d => { (bufs[name] ??= [])[i] = d; });
    p.catch(() => {}); (pending[name] ??= [])[i] = p;
  }
  function start() {
    if (ctx || !on) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    out = ctx.createGain(); out.connect(ctx.destination);
    for (const name of Object.keys(raw)) raw[name].forEach((_, i) => decode(name, i));
  }

  function play(name, { rate = 1, gain = 1, delay = 0, dur = 0 } = {}) {
    if (!on || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const set = FROM[name] || name, list = bufs[set] || [];
    const ready = list.map((b, i) => b ? i : -1).filter(i => i >= 0);
    // The very first tap starts decoding, so its sound plays as soon as one press is ready, if that's still in time.
    if (!ready.length) {
      const t0 = ctx.currentTime, opts = { rate, gain, delay, dur };
      if (pending[set]) Promise.any(pending[set].filter(Boolean)).then(() => { if (ctx.currentTime - t0 < 0.12) play(name, opts); }).catch(() => {});
      return;
    }
    // A held key or a double tap shouldn't stack the same sound on itself.
    const now = ctx.currentTime; if (now - (lastAt[name] ?? -1) < (dur ? 0.03 : 0.045)) return; lastAt[name] = now;
    // Never the same keystroke twice in a row, and each lands a touch differently, like real typing.
    let i = ready[Math.floor(Math.random() * ready.length)];
    if (ready.length > 1 && i === lastPick[name]) i = ready[(ready.indexOf(i) + 1) % ready.length];
    lastPick[name] = i;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = list[i];
    src.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    const level = LEVEL[name] * gain * (0.88 + Math.random() * 0.2), t = now + delay;
    g.gain.value = level;
    // A shortened sound closes with a quick fade so the cut doesn't click.
    if (dur) { g.gain.setValueAtTime(level, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur); }
    src.connect(g).connect(out); src.start(t); if (dur) src.stop(t + dur + 0.01);
  }

  function paint() {
    const b = document.getElementById('sound-toggle'); if (!b) return;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Sounds on' : 'Sounds off');
    b.title = on ? 'Turn sounds off' : 'Turn sounds on';
  }
  function setOn(v) {
    on = v; try { localStorage.setItem(STORE, v ? 'on' : 'off'); } catch (e) {}
    paint(); if (on) { fetchAll(); start(); play('key'); }
  }

  addEventListener('pointerdown', start, { capture: true, passive: true });
  addEventListener('keydown', start, { capture: true });
  document.addEventListener('DOMContentLoaded', () => {
    paint();
    document.getElementById('sound-toggle')?.addEventListener('click', () => setOn(!on));
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(fetchAll);
  }, { once: true });

  window.ThockSfx = { play, get on() { return on; } };
})();
