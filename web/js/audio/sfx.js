// Sound effects. Everything is synthesized with the Web Audio API; there are no sound files.
import { playCry } from './cry.js';
import { store } from '../util.js';

export const Sfx = {
  ctx: null, master: null, noiseBuf: null, muted: store.get('mossRunner.muted', false),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.45; this.master.connect(this.ctx.destination);
      const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  toggle() { this.muted = !this.muted; store.set('mossRunner.muted', this.muted); if (this.master) this.master.gain.value = this.muted ? 0 : 0.45; },
  env(g, t, vol, dur, attack = 0.005) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  },
  tone(f0, f1, dur, type = 'square', vol = 0.15, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, f0, f1, vol = 0.2, delay = 0, q = 1.2, type = 'bandpass') {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    this.env(g, t, vol, dur, 0.01); s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  // Moss's cry, pitched per character (see cry.js)
  cry(T, delay = 0) { playCry(this, T, delay); },
  jump() { this.tone(330, 660, 0.12, 'square', 0.08); },
  land() { this.noise(0.06, 900, 300, 0.06); },
  orb(n) { const f = 880 * Math.pow(2, (n % 8) / 12); this.tone(f, f * 1.5, 0.09, 'sine', 0.12); this.tone(f * 2, f * 2, 0.06, 'triangle', 0.05, 0.03); },
  gold() { [0, 4, 7, 12].forEach((s, i) => this.tone(988 * Math.pow(2, s / 12), 988 * Math.pow(2, s / 12), 0.1, 'triangle', 0.1, i * 0.05)); },
  level(T) { [0, 4, 7, 12, 16].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.14, 'square', 0.07, i * 0.07)); this.cry(T, 0.4); },
  learn() { [0, 7, 12, 19].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 392 * Math.pow(2, s / 12), 0.2, 'triangle', 0.1, 0.8 + i * 0.09)); },
  dash() { this.noise(0.35, 400, 3000, 0.2, 0, 0.8); this.tone(220, 880, 0.25, 'sawtooth', 0.05); },
  shield() { [0, 5, 10].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), 990, 0.25, 'sine', 0.08, i * 0.06)); },
  shieldBreak() { this.noise(0.25, 3000, 600, 0.18); this.tone(990, 330, 0.25, 'triangle', 0.1); },
  throwSeed() { this.tone(600, 1200, 0.08, 'triangle', 0.08); },
  boom() { this.noise(0.4, 1200, 60, 0.35, 0, 0.7, 'lowpass'); this.tone(150, 40, 0.3, 'sine', 0.25); },
  storm() { this.noise(1.2, 300, 2400, 0.22, 0, 0.6); this.noise(1.0, 2000, 500, 0.12, 0.2, 2); },
  smash() { this.noise(0.15, 1800, 300, 0.25); this.tone(200, 80, 0.12, 'square', 0.1); },
  hit() { this.noise(0.3, 2000, 100, 0.35, 0, 0.6, 'lowpass'); this.tone(440, 70, 0.5, 'square', 0.14); },
  nest(T) { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 392 * Math.pow(2, s / 12), 0.16, i % 2 ? 'triangle' : 'square', 0.07, i * 0.09)); this.cry(T, 0.85); },
  click() { this.tone(700, 900, 0.05, 'square', 0.05); },
  caw(v = 1) { this.tone(720, 260, 0.38, 'sawtooth', 0.12 * v); this.noise(0.3, 1800, 500, 0.12 * v, 0, 3); this.tone(640, 240, 0.3, 'sawtooth', 0.08 * v, 0.22); },
  bossHit() { this.tone(320, 110, 0.14, 'square', 0.14); this.noise(0.12, 2400, 600, 0.18); },
  feather() { this.noise(0.12, 4000, 1500, 0.1, 0, 2); },
  denied() { this.tone(200, 150, 0.1, 'square', 0.06); },
};
