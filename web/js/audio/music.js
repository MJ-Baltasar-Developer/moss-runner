// Background music, synthesized like everything else: a small step sequencer with a bass line,
// a melody and soft drums. Each world has its own tune, and Grimwing gets a tense one.
import { Sfx } from './sfx.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

// 16 steps per bar; null = rest. Notes are MIDI numbers.
const TUNES = {
  title: { bpm: 92, root: 60, bass: [48, null, null, null, 55, null, null, null, 52, null, null, null, 55, null, null, null],
    lead: [72, null, 76, null, 79, null, 76, null, 74, null, 72, null, 69, null, null, null], drums: 'soft' },
  forest: { bpm: 128, bass: [48, null, 48, null, 55, null, 48, null, 45, null, 45, null, 52, null, 43, null],
    lead: [72, 76, 79, 76, 81, null, 79, 76, 74, 72, 76, null, 72, null, 67, null], drums: 'run' },
  snow: { bpm: 116, bass: [50, null, null, 50, 57, null, null, null, 53, null, null, 53, 55, null, null, null],
    lead: [74, null, 81, 79, 77, null, 74, null, 72, null, 77, 76, 74, null, null, null], drums: 'soft' },
  swamp: { bpm: 108, bass: [45, null, 45, 47, 48, null, 47, null, 45, null, 43, null, 40, null, 43, null],
    lead: [69, null, 72, null, 71, 69, null, 64, 67, null, 69, null, 64, null, null, null], drums: 'swing' },
  boss: { bpm: 150, bass: [45, 45, 57, 45, 45, 56, 45, 55, 41, 41, 53, 41, 43, 43, 55, 44],
    lead: [81, null, 80, null, 76, null, 81, 83, 84, null, 83, null, 80, null, 76, null], drums: 'run' },
};

export const Music = {
  gain: null, tune: null, step: 0, next: 0, timer: null, volume: 0.5,

  setVolume(v) { this.volume = v; if (this.gain) this.gain.gain.value = this.level(); },
  level() { return Sfx.muted ? 0 : 0.22 * this.volume; },

  /** Switch to a tune by name ('title', 'forest', 'snow', 'swamp', 'boss'), or null for silence. */
  play(name) {
    if (!Sfx.ctx || name === this.tune) return;
    if (!this.gain) { this.gain = Sfx.ctx.createGain(); this.gain.connect(Sfx.ctx.destination); }
    this.gain.gain.value = this.level();
    this.tune = name;
    this.step = 0;
    this.next = Sfx.ctx.currentTime + 0.08;
    if (!this.timer && name) this.timer = setInterval(() => this.schedule(), 60);
    if (!name && this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  /** Queue the notes that fall in the next fraction of a second (the usual Web Audio look-ahead). */
  schedule() {
    const ctx = Sfx.ctx, T = TUNES[this.tune];
    if (!ctx || !T) return;
    this.gain.gain.value = this.level();
    const dt = 60 / T.bpm / 4;
    while (this.next < ctx.currentTime + 0.25) {
      const i = this.step % 16, t = this.next;
      if (T.bass[i] != null) this.note(NOTE(T.bass[i]), t, dt * 1.8, 'triangle', 0.55);
      if (T.lead[i] != null) this.note(NOTE(T.lead[i]), t, dt * 0.9, 'square', 0.16);
      this.drum(T.drums, i, t);
      this.step++;
      this.next += dt * (T.drums === 'swing' && i % 2 === 0 ? 1.15 : T.drums === 'swing' ? 0.85 : 1);
    }
  },

  note(f, t, dur, type, vol) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + 0.02);
  },

  drum(style, i, t) {
    const ctx = Sfx.ctx;
    if (!Sfx.noiseBuf) return;
    const hit = (f0, f1, dur, vol) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = Sfx.noiseBuf; f.type = 'bandpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.gain); s.start(t); s.stop(t + dur + 0.02);
    };
    const kick = () => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.16);
    };
    if (style === 'run') { if (i % 4 === 0) kick(); if (i % 8 === 4) hit(1800, 900, 0.12, 0.35); if (i % 2 === 1) hit(7000, 6000, 0.03, 0.12); }
    else if (style === 'soft') { if (i % 8 === 0) kick(); if (i % 4 === 2) hit(8000, 7000, 0.02, 0.08); }
    else if (style === 'swing') { if (i % 8 === 0 || i % 8 === 5) kick(); if (i % 4 === 2) hit(2500, 1200, 0.08, 0.2); }
  },
};

/** Which tune fits the game right now. */
export function tuneFor(G) {
  if (G.state === 'title') return 'title';
  if (G.state === 'paused' || G.state === 'dead') return null;
  if (G.boss && !G.boss.dying) return 'boss';
  return ['forest', 'snow', 'swamp'][G.biome || 0];
}
