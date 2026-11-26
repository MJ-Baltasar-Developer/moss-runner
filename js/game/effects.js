// Particles, banners, shake, hitstop, XP and smashing obstacles.
import { Sfx } from '../audio/sfx.js';
import { CREAM, MOVES, XP, need } from '../config.js';
import { G } from './state.js';
import { pick, rand } from '../util.js';

export function burst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.angle != null ? o.angle + rand(-o.spread, o.spread) : rand(0, Math.PI * 2);
    const s = rand(o.min || 60, o.max || 260);
    G.parts.push({ x, y, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), life: rand(0.4, 0.9) * (o.life || 1), max: 0,
      size: rand(o.smin || 2, o.smax || 5), color: Array.isArray(o.color) ? pick(o.color) : (o.color || '#fff'),
      g: o.g != null ? o.g : 600, kind: o.kind || 'dot', rot: rand(0, 6), vr: rand(-10, 10), drag: o.drag || 0, scroll: o.scroll !== false });
    G.parts[G.parts.length - 1].max = G.parts[G.parts.length - 1].life;
  }
}
export function floatText(x, y, text, color = CREAM, size = 16) { G.parts.push({ x, y, vx: 0, vy: -60, life: 1.0, max: 1.0, text, color, size, g: 0, kind: 'text', scroll: false }); }
export function setBanner(title, sub, dur = 1.8, color = CREAM) { G.banner = { title, sub, t: 0, dur, color }; }
export function shout(text) { G.shouts = [{ text, t: 0, dur: 0.9 }]; }
export function addShake(a) { G.shake = Math.max(G.shake, a); }
export function hitstop(s) { G.hitstop = Math.max(G.hitstop, s); }

export function gainXP(n, x, y) {
  G.xp += n;
  if (x != null) floatText(x, y, `+${n} XP`, '#cdeac0', 13);
  while (G.xp >= need(G.level)) {
    G.xp -= need(G.level); G.level++; G.maxLevel = Math.max(G.maxLevel, G.level);
    const P = G.player;
    burst(P.x, P.y - 28, 26, { color: ['#ffd54f', '#f48fb1', '#cdeac0', '#ffffff'], g: 120, kind: 'spark', min: 80, max: 240 });
    hitstop(0.06); Sfx.level(G.char);
    const m = MOVES.find(m => m.lv === G.level);
    if (m) {
      setBanner(`${G.char.name} learned ${m.name}!`, `Press ${m.key} (or ${m.alt.toUpperCase()}): ${m.desc}`, 2.8, '#ffd54f');
      G.cds[m.id] = 0; G.unlockFlash[m.id] = 2.5; Sfx.learn();
    } else setBanner(`Level up! Lv ${G.level}`, `${G.char.name} grew stronger`, 1.6, '#cdeac0');
    G.levelCheer = 1.0;
  }
}

export function smash(o, why) {
  if (o.dead) return; o.dead = true;
  const cxo = o.x + o.w / 2, cyo = o.y + o.h / 2;
  const d = o.d;
  burst(cxo, cyo, d.bird ? 16 : 22, { color: d.wood, kind: d.bird ? 'feather' : 'chip', min: 120, max: 420, g: 900, smin: 3, smax: 7 });
  burst(cxo, cyo, 8, { color: ['#ffffff', '#ffe58a'], kind: 'spark', min: 60, max: 200, g: 0, life: 0.6 });
  G.smashed++; G.score += 25;
  gainXP(d.xp ? XP[d.xp] : XP.smash, cxo, cyo - 30);
  addShake(d.xp ? 8 : 5); hitstop(why === 'dash' ? 0.035 : 0.05); Sfx.smash();
}

