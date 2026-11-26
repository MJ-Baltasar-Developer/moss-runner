// Moss's four moves: Brave Bird, Double Team, Seed Bomb and Leaf Storm.
import { Sfx } from '../audio/sfx.js';
import { GROUND, MOVES, PLAYER_X, W } from '../config.js';
import { hurtBoss } from './boss.js';
import { addShake, burst, hitstop, shout, smash } from './effects.js';
import { G } from './state.js';
import { snapPose } from './update.js';
import { clamp, lerp, pick, rand } from '../util.js';

export function useMove(i) {
  const m = MOVES[i];
  if (!m || G.state !== 'play') return;
  if (G.level < m.lv || G.cds[m.id] > 0) { Sfx.denied(); G.unlockFlash[m.id] = -0.35; return; }
  const P = G.player;
  G.cds[m.id] = m.cd;
  shout(m.name + '!');
  if (m.id === 'brave-bird') {
    G.dash = 0.55; P.vy = 0; Sfx.dash(); addShake(4);
    if (G.boss && !G.boss.dying) G.charge = { t: 0, y0: P.y, hit: false }; // charge straight at the boss and back
    burst(P.x, P.y - 26, 14, { color: ['#bfe9ff', '#ffffff', '#7fc9ff'], angle: Math.PI, spread: 0.5, min: 100, max: 300, g: 0, kind: 'spark' });
  } else if (m.id === 'double-team') {
    G.shield = { t: 12 }; Sfx.shield();
    burst(P.x, P.y - 26, 16, { color: [G.char.base, '#ffffff'], g: 0, min: 60, max: 180, kind: 'spark' });
  } else if (m.id === 'seed-bomb') {
    const onBoss = G.boss && !G.boss.dying;
    const ahead = onBoss ? [] : G.obstacles.filter(o => !o.dead && o.x + o.w > P.x + 20 && o.x < W + 40).sort((a, b) => a.x - b.x).slice(0, 3);
    const n = Math.max(3, ahead.length);
    for (let k = 0; k < n; k++) {
      const tgt = onBoss ? { boss: true } : ahead[k] || null;
      G.seeds.push({ x0: P.x + 10, y0: P.y - 36, x: P.x, y: P.y, t: -k * 0.12, dur: 0.42, tgt, fx: P.x + 260 + k * 110, fy: GROUND - 6 });
    }
  } else if (m.id === 'leaf-storm') {
    G.storm = { x: P.x, t: 0 }; Sfx.storm(); addShake(6);
  }
}

export function updateMoves(dt) {
  const P = G.player;
  for (const m of MOVES) G.cds[m.id] = Math.max(0, G.cds[m.id] - dt);
  for (const k in G.unlockFlash) { const v = G.unlockFlash[k]; G.unlockFlash[k] = v > 0 ? Math.max(0, v - dt) : Math.min(0, v + dt); }
  if (G.dash > 0) {
    G.dash -= dt;
    if (Math.random() < 0.9) G.parts.push({ x: P.x - 10, y: P.y - 28 + rand(-14, 14), vx: -200, vy: 0, life: 0.3, max: 0.3, size: rand(3, 7), color: pick(['#bfe9ff', '#ffffff', '#7fc9ff']), g: 0, kind: 'spark', rot: 0, vr: 0, scroll: true });
    G.afterT = (G.afterT || 0) - dt;
    if (G.afterT <= 0) { G.afterT = 0.05; G.parts.push({ kind: 'after', x: P.x, y: P.y, life: 0.25, max: 0.25, vx: 0, vy: 0, g: 0, scroll: true, snap: snapPose() }); }
    if (G.charge) {
      const C = G.charge, B = G.boss; C.t += dt;
      const p = Math.min(1, C.t / 0.55);
      const bx = B ? B.x - 90 : PLAYER_X, by = B ? clamp(B.y + 40, 110, GROUND) : C.y0;
      if (p < 0.45) { const e = p / 0.45; P.x = lerp(PLAYER_X, bx, e * e); P.y = lerp(C.y0, by, e); }
      else {
        if (!C.hit) { C.hit = true; if (B && !B.dying) hurtBoss(3, B.x - 40, B.y); }
        const e = (p - 0.45) / 0.55; P.x = lerp(bx, PLAYER_X, e); P.y = lerp(by, C.y0, e);
      }
      if (p >= 1 || G.dash <= 0) { G.charge = null; P.x = PLAYER_X; }
    }
    if (G.dash <= 0) G.inv = Math.max(G.inv, 0.2);
  }
  if (G.shield) { G.shield.t -= dt; if (G.shield.t <= 0) { G.shield = null; burst(P.x, P.y - 26, 10, { color: ['#ffffff'], g: 0, kind: 'spark' }); } }
  if (G.inv > 0) G.inv -= dt;
  for (const s of G.seeds) {
    s.t += dt; if (s.t < 0) { s.x = P.x; s.y = P.y - 36; continue; }
    if (!s.thrown) { s.thrown = true; s.x0 = P.x + 10; s.y0 = P.y - 36; Sfx.throwSeed(); }
    const p = Math.min(1, s.t / s.dur);
    const B = G.boss, atBoss = s.tgt && s.tgt.boss && B && !B.dying;
    const live = s.tgt && !s.tgt.boss && !s.tgt.dead;
    const tx = atBoss ? B.x : live ? s.tgt.x + s.tgt.w / 2 : s.fx, ty = atBoss ? B.y : live ? s.tgt.y + s.tgt.h / 2 : s.fy;
    s.x = lerp(s.x0, tx, p); s.y = lerp(s.y0, ty, p) - Math.sin(Math.PI * p) * (atBoss ? 140 : 90);
    if (s.tgt === null) s.fx -= G.speed * dt;
    if (p >= 1) {
      s.done = true;
      burst(s.x, s.y, 26, { color: ['#ffb347', '#ffd54f', '#e0603a', '#fff2c0'], kind: 'spark', min: 80, max: 360, g: 200 });
      burst(s.x, s.y, 10, { color: ['#8b5a2b', '#5e3b1a'], kind: 'chip', min: 100, max: 300 });
      G.parts.push({ kind: 'ring', x: s.x, y: s.y, life: 0.35, max: 0.35, r: 50, color: '#ffd54f', vx: 0, vy: 0, g: 0, scroll: true });
      Sfx.boom(); addShake(7); hitstop(0.04);
      if (atBoss) hurtBoss(1, s.x, s.y);
      else if (live) smash(s.tgt, 'seed');
    }
  }
  G.seeds = G.seeds.filter(s => !s.done);
  if (G.storm) {
    const S = G.storm; S.t += dt; S.x += 1500 * dt;
    for (let i = 0; i < 6; i++) G.parts.push({ x: S.x + rand(-60, 10), y: rand(30, GROUND), vx: rand(200, 700), vy: rand(-200, 200), life: rand(0.4, 0.9), max: 0.9, size: rand(5, 9), color: pick(['#6aa35e', '#9ccc4a', '#4f8a47', '#cdeac0', '#e8c547']), g: 80, kind: 'leaf', rot: rand(0, 6), vr: rand(-14, 14), scroll: false });
    for (const o of G.obstacles) if (!o.dead && o.x < S.x) smash(o, 'storm');
    for (const h of G.hazards) if (h.x < S.x && (h.kind === 'feather' || h.kind === 'wave')) h.dead = true;
    if (G.boss && !G.boss.dying && !S.hitBoss && S.x > G.boss.x) { S.hitBoss = true; hurtBoss(4, G.boss.x, G.boss.y); }
    for (const orb of G.orbs) if (!orb.taken && orb.x < S.x && orb.x > P.x) { orb.pull = true; }
    if (S.x > W + 150) G.storm = null;
  }
}

