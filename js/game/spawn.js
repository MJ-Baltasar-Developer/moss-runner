// Obstacles and orbs.
import { GROUND, W } from '../config.js';
import { G, stageSpeed } from './state.js';
import { rand } from '../util.js';

export const OB = {
  log:     { w: 54, h: 30, ground: true, hb: [4, 6, 8, 6], wood: ['#8b5a2b', '#5e3b1a'] },
  bramble: { w: 64, h: 38, ground: true, hb: [8, 10, 16, 10], wood: ['#3f6b3a', '#7a3d6b'] },
  stump:   { w: 42, h: 62, ground: true, hb: [4, 4, 8, 4], wood: ['#8b5a2b', '#c2915a'] },
  dummy:   { w: 38, h: 72, ground: true, hb: [8, 6, 16, 6], wood: ['#c9a96b', '#8b5a2b'], xp: 'dummy' },
  crowLow: { w: 44, h: 26, y: GROUND - 64, hb: [6, 6, 12, 10], wood: ['#2c2c34', '#4a4a58'], vx: 70, bird: true },
  crowHi:  { w: 44, h: 26, y: GROUND - 132, hb: [6, 6, 12, 10], wood: ['#2c2c34', '#4a4a58'], vx: 70, bird: true },
  branch:  { w: 84, h: GROUND - 94, y: 0, hb: [10, 0, 20, 4], wood: ['#5e3b1a', '#5f9150'], hang: true },
};
export function weights(stage) {
  const w = { log: 3, bramble: 2, dummy: 1.2, crowHi: 1 };
  if (stage >= 2) Object.assign(w, { stump: 2, crowLow: 1.2, branch: 1 });
  if (stage >= 3) Object.assign(w, { crowHi: 1.6, branch: 1.4, crowLow: 1.6, stump: 2.4 });
  return w;
}
export function spawnObstacle() {
  const w = weights(G.stage); let total = 0; for (const k in w) total += w[k];
  let r = Math.random() * total, type = 'log';
  for (const k in w) { r -= w[k]; if (r <= 0) { type = k; break; } }
  const d = OB[type];
  const o = { type, x: W + 30, w: d.w, h: d.h, y: d.y != null ? d.y : GROUND - d.h, t: Math.random() * 10, dead: false, d };
  G.obstacles.push(o);
  // orb patterns that reward the right move
  if (Math.random() < 0.62) {
    const cxo = o.x + o.w / 2;
    if (d.ground) {
      const n = 5; for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 34; addOrb(cxo + dx, GROUND - 52 - 95 * (1 - Math.pow(dx / 110, 2)) + o.h * 0.4); }
    } else if (type === 'crowLow') {
      for (let i = 0; i < 3; i++) addOrb(cxo - 30 + i * 30, GROUND - 160 - (i === 1 ? 14 : 0));
    } else {
      for (let i = 0; i < 4; i++) addOrb(cxo - 54 + i * 36, GROUND - 26);
    }
  }
  // gap until the next obstacle: always room to land and jump again
  const sp = G.speed || stageSpeed(G.stage);
  const tight = Math.max(0.5, 0.95 - G.stage * 0.06);
  let gap = sp * rand(tight, tight + 0.85) + o.w + 120;
  if (type === 'branch' || type === 'crowHi') gap += 80;
  G.nextSpawn = gap;
  if (Math.random() < 0.25) for (let i = 0; i < 4; i++) addOrb(W + 30 + o.w + gap * 0.45 + i * 32, GROUND - 26, Math.random() < 0.06 && i === 3);
}
export function addOrb(x, y, gold) { G.orbs.push({ x, y, gold: gold || Math.random() < 0.05, ph: Math.random() * 6, taken: false }); }

