// Moss's cry, ported from the Moss pet (pet/cries.py): one bright chirp that rises, then dips a
// little ("Mo-ossss"). Each character gets its own pitch and voice (T.voice and T.creature).
export function playCry(sfx, T, delay = 0) {
  if (!sfx.ctx || sfx.muted) return;
  const k = T ? T.voice : 1, t = sfx.ctx.currentTime + delay;
  const o = sfx.ctx.createOscillator(), g = sfx.ctx.createGain();
  o.type = T && T.creature === 'robot' ? 'square' : T && (T.creature === 'dragon' || T.creature === 'bear') ? 'sawtooth' : 'sine';
  o.frequency.setValueAtTime(1800 * k, t); o.frequency.linearRampToValueAtTime(2600 * k, t + 0.21); o.frequency.linearRampToValueAtTime(2200 * k, t + 0.35);
  if (T && T.creature === 'ghost') { const lfo = sfx.ctx.createOscillator(), lg = sfx.ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.4); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  o.connect(g); g.connect(sfx.master); o.start(t); o.stop(t + 0.4);
}
