// Boss: Grimwing the Crow King guards the nest on every 5th stage.
import { Sfx } from '../audio/sfx.js';
import { GROUND, W } from '../config.js';
import { addShake, burst, floatText, gainXP, hitstop, setBanner } from './effects.js';
import { G } from './state.js';
import { die } from './update.js';
import { circ, ell, lerp, pick, rr } from '../util.js';

export const BOSS_AT = 1700; // px before the nest where he blocks the way
export const isBossStage = s => s % 5 === 0;
export const BOSS_NAME = 'Grimwing';
export const BOSS_W = 120, BOSS_H = 46; // body hitbox while swooping
export const LANE = { low: GROUND - 20, high: GROUND - 84 }; // feather heights: low = hop over, high = stay on the ground

export function startBoss() {
  const n = G.stage / 5, max = 18 + 6 * (n - 1);
  G.boss = { n, hp: max, max, x: W + 170, y: 190, homeX: 780, homeY: 190, t: 0, mode: 'enter', modeT: 0, next: 1.4,
    hurt: 0, tele: 0, last: null, dying: false, dyingT: 0, enraged: false, rot: 0, flap: 0 };
  G.hazards = [];
  setBanner(`${BOSS_NAME} the Crow King!`, 'Dodge his attacks · hit him with moves · run into golden acorns to bat them back', 3.2, '#ff8a80');
  Sfx.caw(); addShake(6);
}

export function bossAttack(B) {
  const options = ['volley', 'swoop', 'stomp'].filter(a => a !== B.last);
  const a = pick(options); B.last = a; B.mode = a; B.modeT = 0;
  const fast = B.enraged;
  if (a === 'volley') {
    B.tele = fast ? 0.45 : 0.7;
    const n = fast ? 5 : 3; B.pattern = []; B.shotT = B.tele;
    for (let i = 0; i < n; i++) B.pattern.push(Math.random() < 0.55 ? 'low' : 'high');
    if (!B.pattern.includes('low')) B.pattern[0] = 'low';
  } else if (a === 'swoop') {
    B.tele = fast ? 0.6 : 0.9; B.swoops = fast ? 2 : 1; B.phase = 'rise';
  } else {
    B.tele = fast ? 0.5 : 0.75; B.phase = 'rise'; B.waves = fast ? 2 : 1;
  }
  Sfx.caw(0.7);
}

export function bossIdle(B, gapScale = 1) { B.mode = 'idle'; B.modeT = 0; B.next = (B.enraged ? 0.85 : 1.35) * gapScale; B.tele = 0; }

export function dropAcorn(B) {
  G.hazards.push({ kind: 'acorn', x: B.x - 50, y: GROUND - 22, w: 22, h: 22, vx: -240, t: 0 });
}

export function hurtBoss(n, x, y) {
  const B = G.boss; if (!B || B.dying) return;
  B.hp = Math.max(0, B.hp - n); B.hurt = 0.18;
  floatText(x, y - 40, `-${n}`, '#ff8a80', 22);
  burst(x, y, 10, { color: ['#2a2438', '#4a3f63', '#7a3d9a'], kind: 'feather', min: 100, max: 300, g: 300 });
  addShake(6); hitstop(0.05); Sfx.bossHit();
  if (!B.enraged && B.hp <= B.max / 2 && B.hp > 0) {
    B.enraged = true; Sfx.caw();
    setBanner(`${BOSS_NAME} is furious!`, 'His attacks come faster now', 1.8, '#ff8a80');
  }
  if (B.hp <= 0) {
    B.dying = true; B.dyingT = 0; G.hazards = [];
    hitstop(0.25); addShake(18); Sfx.boom(); Sfx.level(G.char);
    burst(B.x, B.y, 50, { color: ['#2a2438', '#4a3f63', '#7a3d9a', '#ffd54f'], kind: 'feather', min: 150, max: 520, g: 350, smin: 4, smax: 9 });
    burst(B.x, B.y, 24, { color: ['#ffffff', '#ffe58a', '#ff8a80'], kind: 'spark', min: 100, max: 400, g: 0 });
    const bonus = 1000 * B.n; G.score += bonus;
    setBanner(`${BOSS_NAME} defeated!`, `+${bonus} · the way home is clear`, 2.6, '#ffd54f');
    gainXP(40, B.x, B.y - 60);
  }
}

// What happens when something hurts the player. Returns true if the run ended.
export function hazardHitPlayer(h) {
  const P = G.player;
  if (G.dash > 0) { if (h) { h.dead = true; burst(h.x + h.w / 2, h.y + h.h / 2, 8, { color: ['#ffffff', '#bfe9ff'], kind: 'spark', g: 0 }); } return false; }
  if (G.inv > 0) return false;
  if (G.shield) {
    if (h) h.dead = true;
    G.shield = null; G.inv = 1.0; Sfx.shieldBreak();
    burst(P.x, P.y - 26, 22, { color: [G.char.base, G.char.darkCol, '#ffffff'], g: 200, min: 120, max: 300, kind: 'feather' });
    floatText(P.x, P.y - 70, 'Decoy took it!', '#ffd54f', 15);
    return false;
  }
  die(null); return true;
}

export function overlapsPlayer(x, y, w, h) {
  const P = G.player, px = P.x - 14, py = P.y - 46;
  return px < x + w && px + 28 > x && py < y + h && py + 42 > y;
}

export function updateBoss(dt, live) {
  const B = G.boss; B.t += dt; B.modeT += dt; B.flap += dt * (B.mode === 'swoop' && B.phase === 'dive' ? 22 : 9);
  if (B.hurt > 0) B.hurt -= dt;
  if (B.dying) {
    B.dyingT += dt; B.rot += dt * 6; B.y += dt * 260 * B.dyingT; B.x += dt * 80;
    if (B.dyingT > 1.5) { G.boss = null; G.bossDone = true; }
    return;
  }
  const hover = () => { B.x = lerp(B.x, B.homeX, Math.min(1, dt * 3)); B.y = lerp(B.y, B.homeY + Math.sin(B.t * 2.2) * 18, Math.min(1, dt * 4)); };
  if (B.mode === 'enter') {
    B.x = lerp(B.x, B.homeX, Math.min(1, dt * 1.8)); B.y = B.homeY + Math.sin(B.t * 2.2) * 18;
    if (B.modeT > 1.4) bossIdle(B);
  } else if (B.mode === 'idle') {
    hover(); B.next -= dt;
    if (B.next <= 0 && live) bossAttack(B);
  } else if (B.mode === 'volley') {
    hover();
    if (B.modeT >= B.tele) {
      B.shotT -= dt;
      if (B.shotT <= 0 && B.pattern.length) {
        const lane = B.pattern.shift();
        G.hazards.push({ kind: 'feather', lane, x: B.x - 70, y: LANE[lane] - 6, w: 42, h: 12, vx: -560, t: 0 });
        Sfx.feather(); B.recoil = 0.12;
        // a low feather followed by a high one needs time to land in between
        B.shotT = lane === 'low' && B.pattern[0] === 'high' ? 0.8 : B.enraged ? 0.42 : 0.52;
      }
      if (!B.pattern.length && B.shotT <= -0.2) { if (Math.random() < 0.55) dropAcorn(B); bossIdle(B); }
    }
  } else if (B.mode === 'swoop') {
    if (B.phase === 'rise') {
      B.x = lerp(B.x, W - 70, Math.min(1, dt * 4)); B.y = lerp(B.y, 120, Math.min(1, dt * 4));
      if (B.modeT >= B.tele) { B.phase = 'dive'; B.y = GROUND - 44; Sfx.dash(); }
    } else if (B.phase === 'dive') {
      B.x -= (B.enraged ? 1050 : 950) * dt; B.y = GROUND - 44 + Math.sin(B.t * 30) * 2;
      if (live && overlapsPlayer(B.x - BOSS_W / 2, B.y - BOSS_H / 2, BOSS_W, BOSS_H)) {
        if (G.dash > 0) { /* dashing through him */ } else if (hazardHitPlayer(null)) return;
      }
      if (B.x < -180) {
        B.swoops--;
        if (B.swoops > 0) { B.x = W + 180; B.phase = 'rise'; B.modeT = 0; B.tele = 0.5; }
        else { B.x = W + 180; B.y = B.homeY; B.mode = 'enter'; B.modeT = 0; if (Math.random() < 0.4) B.acornLater = true; }
      }
    }
  } else if (B.mode === 'stomp') {
    if (B.phase === 'rise') {
      B.x = lerp(B.x, B.homeX, Math.min(1, dt * 3)); B.y = lerp(B.y, 100, Math.min(1, dt * 5));
      if (B.modeT >= B.tele) { B.phase = 'drop'; B.vy = 0; }
    } else if (B.phase === 'drop') {
      B.vy += 4200 * dt; B.y += B.vy * dt;
      if (B.y >= GROUND - 52) {
        B.y = GROUND - 52; B.waves--; addShake(12); hitstop(0.05); Sfx.boom();
        G.hazards.push({ kind: 'wave', x: B.x - 70, y: GROUND - 24, w: 34, h: 24, vx: B.enraged ? -520 : -460, t: 0 });
        burst(B.x, GROUND, 18, { color: ['#c9a96b', '#e3d2ae', '#7a5a3a'], angle: -Math.PI / 2, spread: 1.4, min: 120, max: 380, g: 700, kind: 'chip' });
        if (B.waves > 0) { B.phase = 'bounce'; B.modeT = 0; } else { B.phase = 'lift'; B.modeT = 0; if (Math.random() < 0.45) dropAcorn(B); }
      }
    } else if (B.phase === 'bounce') {
      B.y = lerp(B.y, 150, Math.min(1, dt * 6));
      if (B.modeT > 0.45) { B.phase = 'drop'; B.vy = 0; }
    } else if (B.phase === 'lift') {
      hover(); if (B.modeT > 0.6) bossIdle(B);
    }
  }
  if (B.mode === 'idle' && B.acornLater) { B.acornLater = false; dropAcorn(B); }
  if (B.recoil > 0) B.recoil -= dt;
}

export function updateHazards(dt, live) {
  const B = G.boss;
  for (const h of G.hazards) {
    h.t += dt;
    if (h.kind === 'shot') {
      // a batted-back acorn flying at the boss
      const tx = B ? B.x : W + 100, ty = B ? B.y : 100;
      h.x += (tx - h.x) * Math.min(1, dt * 7); h.y += (ty - h.y) * Math.min(1, dt * 7) - Math.sin(h.t * 6) * 2;
      if (Math.hypot(tx - h.x, ty - h.y) < 30 || h.t > 1.2) { h.dead = true; if (B && !B.dying) { hurtBoss(2, B.x, B.y); Sfx.boom(); burst(h.x, h.y, 16, { color: ['#ffd54f', '#fff2c0'], kind: 'spark', g: 0 }); } }
      continue;
    }
    h.x += h.vx * dt;
    if (!live) continue;
    if (!overlapsPlayer(h.x, h.y, h.w, h.h)) continue;
    if (h.kind === 'acorn') {
      h.kind = 'shot'; h.t = 0; Sfx.throwSeed(); Sfx.gold();
      floatText(h.x, h.y - 30, 'Batted back!', '#ffd54f', 15);
      continue;
    }
    if (hazardHitPlayer(h)) return;
  }
  G.hazards = G.hazards.filter(h => !h.dead && h.x > -80 && h.x < W + 200);
}

export function drawBoss(c) {
  const B = G.boss; if (!B) return;
  const white = B.hurt > 0;
  const col = v => white ? '#ffffff' : v;
  // telegraphs
  if (!B.dying) {
    const blink = 0.35 + 0.35 * Math.abs(Math.sin(G.t * 14));
    if (B.mode === 'swoop' && B.phase === 'rise') {
      c.fillStyle = `rgba(255,82,82,${blink * 0.45})`; c.fillRect(0, GROUND - 68, W, 48);
      c.fillStyle = `rgba(255,255,255,${blink + 0.2})`; c.font = '900 26px system-ui, sans-serif'; c.textAlign = 'center';
      for (let i = 0; i < 3; i++) c.fillText('‹', W - 150 - i * 40, GROUND - 34);
    }
    if (B.mode === 'volley' && B.modeT < B.tele) {
      c.fillStyle = `rgba(255,82,82,${blink + 0.2})`;
      B.pattern.forEach((lane, i) => { const y = LANE[lane], x = W - 30 - i * 26; c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x - 14, y); c.lineTo(x, y + 8); c.fill(); });
    }
    if (B.mode === 'stomp' && B.phase === 'rise') {
      c.fillStyle = `rgba(255,82,82,${blink * 0.5})`; ell(c, B.homeX, GROUND + 2, 70, 9); c.fill();
    }
  }
  c.save();
  c.translate(B.x + (B.recoil > 0 ? 8 : 0), B.y);
  c.rotate(B.rot + (B.mode === 'swoop' && B.phase === 'dive' ? -0.12 : 0));
  if (B.dying) c.globalAlpha = Math.max(0, 1 - B.dyingT / 1.5);
  const teleGlow = !B.dying && B.tele > 0 && B.modeT < B.tele;
  if (teleGlow || B.enraged) { c.shadowColor = '#ff5252'; c.shadowBlur = teleGlow ? 30 : 14; }
  const flap = Math.sin(B.flap);
  // back wing
  c.fillStyle = col('#1f1a2b');
  c.beginPath(); c.moveTo(10, -10); c.quadraticCurveTo(50, -60 - flap * 40, 100, -50 - flap * 55); c.lineTo(70, -20); c.lineTo(88, -16 - flap * 20); c.lineTo(40, 6); c.closePath(); c.fill();
  // tail
  c.fillStyle = col('#2a2438');
  c.beginPath(); c.moveTo(50, -6); c.lineTo(104, -22); c.lineTo(98, -4); c.lineTo(108, 6); c.lineTo(52, 14); c.closePath(); c.fill();
  // body
  const g = c.createLinearGradient(0, -40, 0, 40);
  g.addColorStop(0, col('#4a3f63')); g.addColorStop(1, col('#1f1a2b'));
  c.fillStyle = g; ell(c, 0, 0, 64, 40); c.fill();
  c.shadowBlur = 0;
  // chest feathers
  c.strokeStyle = col('#5e5180'); c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-30 + i * 14, 8); c.quadraticCurveTo(-24 + i * 14, 20, -18 + i * 14, 8); c.stroke(); }
  // talons
  c.strokeStyle = col('#f2c14e'); c.lineWidth = 4; c.lineCap = 'round';
  for (const fx of [-14, 14]) { c.beginPath(); c.moveTo(fx, 34); c.lineTo(fx, 48); c.moveTo(fx, 48); c.lineTo(fx - 8, 56); c.moveTo(fx, 48); c.lineTo(fx + 2, 58); c.moveTo(fx, 48); c.lineTo(fx + 9, 55); c.stroke(); }
  // head
  c.fillStyle = col('#2a2438'); circ(c, -52, -22, 30); c.fill();
  // spiky crest
  c.fillStyle = col('#7a3d9a');
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-60 + i * 12, -46); c.lineTo(-72 + i * 16, -78 + i * 4); c.lineTo(-48 + i * 12, -44); c.fill(); }
  // little gold crown
  c.fillStyle = col('#f2c14e');
  c.beginPath(); c.moveTo(-66, -48); c.lineTo(-66, -60); c.lineTo(-59, -53); c.lineTo(-52, -64); c.lineTo(-45, -53); c.lineTo(-38, -60); c.lineTo(-38, -48); c.closePath(); c.fill();
  // beak (opens when attacking)
  const open = (B.mode !== 'idle' && B.mode !== 'enter') || B.dying ? 7 : 1;
  c.fillStyle = col('#f2c14e');
  c.beginPath(); c.moveTo(-74, -28); c.lineTo(-118, -22 + open * 0.2); c.lineTo(-74, -16); c.fill();
  c.fillStyle = col('#d9a23a');
  c.beginPath(); c.moveTo(-76, -14); c.lineTo(-108, -14 + open); c.lineTo(-74, -8 + open * 0.4); c.fill();
  // eye + angry brow
  if (B.dying) {
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-64, -34); c.lineTo(-52, -22); c.moveTo(-52, -34); c.lineTo(-64, -22); c.stroke();
  } else {
    c.fillStyle = '#ffffff'; circ(c, -58, -28, 9); c.fill();
    c.shadowColor = '#ff1744'; c.shadowBlur = 12;
    c.fillStyle = white ? '#ff8a80' : '#ff1744'; circ(c, -61, -28, 5); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = col('#120f1a'); c.lineWidth = 5; c.beginPath(); c.moveTo(-74, -44); c.lineTo(-46, -36); c.stroke();
  }
  // front wing
  c.fillStyle = col('#352d4a');
  c.beginPath(); c.moveTo(-6, -14); c.quadraticCurveTo(30, -66 - flap * 44, 84, -70 - flap * 60); c.lineTo(58, -36 - flap * 26); c.lineTo(76, -30 - flap * 30); c.lineTo(46, -14); c.lineTo(58, -6 - flap * 10); c.lineTo(16, 10); c.closePath(); c.fill();
  c.restore();
}

export function drawHazards(c) {
  for (const h of G.hazards) {
    c.save();
    if (h.kind === 'feather') {
      c.translate(h.x + h.w / 2, h.y + h.h / 2);
      c.fillStyle = 'rgba(255,82,82,0.25)'; ell(c, 8, 0, 30, 8); c.fill();
      c.fillStyle = '#2a2438'; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(0, -10, 22, -2); c.lineTo(22, 2); c.quadraticCurveTo(0, 10, -22, 0); c.fill();
      c.strokeStyle = '#7a3d9a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-22, 0); c.lineTo(26, 0); c.stroke();
    } else if (h.kind === 'wave') {
      const x = h.x, y = h.y;
      c.fillStyle = 'rgba(201,169,107,0.9)';
      c.beginPath(); c.moveTo(x, GROUND); c.quadraticCurveTo(x + 6, y - 4, x + 17, y); c.quadraticCurveTo(x + 28, y - 4, x + h.w, GROUND); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + 8, y + 6, 18, 3);
    } else if (h.kind === 'acorn' || h.kind === 'shot') {
      const x = h.x + h.w / 2, y = h.y + h.h / 2;
      c.translate(x, y); c.rotate(h.kind === 'acorn' ? -h.t * 8 : h.t * 20);
      c.fillStyle = 'rgba(255,213,79,0.35)'; circ(c, 0, 0, 18 + Math.sin(G.t * 10) * 3); c.fill();
      c.fillStyle = '#e0b23a'; ell(c, 0, 3, 9, 10); c.fill();
      c.fillStyle = '#8b5a2b'; c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(0, -14, 11, 0); c.fill();
      c.fillStyle = '#fff2c0'; circ(c, -3, 3, 2.2); c.fill();
    }
    c.restore();
  }
}

export function drawBossHUD(c) {
  const B = G.boss; if (!B) return;
  const x = 300, w = 360, y = 64;
  c.fillStyle = 'rgba(38,20,30,0.85)'; rr(c, x - 10, y - 4, w + 52, 34, 10); c.fill();
  c.fillStyle = '#ffcdd2'; c.font = '800 11px system-ui, sans-serif'; c.textAlign = 'left';
  c.fillText(`${BOSS_NAME.toUpperCase()} · CROW KING${B.n > 1 ? ' ' + 'I'.repeat(Math.min(B.n, 3)) : ''}`, x, y + 9);
  c.textAlign = 'right'; c.fillText(B.dying ? 'defeated!' : B.enraged ? 'FURIOUS' : `${B.hp} / ${B.max}`, x + w + 32, y + 9);
  c.fillStyle = 'rgba(255,255,255,0.15)'; rr(c, x, y + 15, w + 32, 8, 4); c.fill();
  const f = B.hp / B.max;
  c.fillStyle = B.enraged ? (Math.floor(G.t * 8) % 2 ? '#ff5252' : '#ff8a80') : '#e53935';
  if (f > 0) { rr(c, x, y + 15, Math.max(8, (w + 32) * f), 8, 4); c.fill(); }
}

