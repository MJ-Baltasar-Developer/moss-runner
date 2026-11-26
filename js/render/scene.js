// Drawing the world: sky, hills, obstacles, the nest, orbs, the player and particles.
import { drawCritter, drawGhostCopy } from '../character/sprite.js';
import { CREAM, DAY, GROUND, H, MOSS, PLAYER_X, SPRITE_S, W } from '../config.js';
import { G } from '../game/state.js';
import { circ, clamp, ell, h01, rad, rgba, rr, shade } from '../util.js';

export const NEST_STUMP_H = 58, NEST_SEAT = GROUND - NEST_STUMP_H - 8;
export function nestScreenX() { return PLAYER_X + (G.stageLen - G.dist); }

export function drawBackground(c) {
  const pal = DAY[(G.stage - 1) % DAY.length];
  const sky = c.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, pal.sky[0]); sky.addColorStop(1, pal.sky[1]);
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const off = G.scroll;
  if (pal.stars) {
    for (let i = 0; i < 70; i++) { const x = (h01(i) * W * 1.3 - off * 0.02) % (W * 1.3); const xx = x < 0 ? x + W * 1.3 : x; c.fillStyle = `rgba(255,255,240,${0.3 + 0.5 * Math.abs(Math.sin(G.t * (0.5 + h01(i + 9)) + i))})`; c.fillRect(xx, h01(i + 50) * 200, 2, 2); }
  }
  // sun / moon
  const sunX = 760 - (G.dist / G.stageLen) * 120, sunY = pal.moon ? 80 : pal.name === 'Sunset' ? 210 : pal.name === 'Dusk' ? 240 : 80;
  c.fillStyle = rgba(pal.sun, 0.25); circ(c, sunX, sunY, 54); c.fill();
  c.fillStyle = pal.sun; circ(c, sunX, sunY, 34); c.fill();
  if (pal.moon) { c.fillStyle = pal.sky[0]; circ(c, sunX + 14, sunY - 8, 30); c.fill(); }
  // clouds
  c.fillStyle = rgba(pal.cloud, pal.stars ? 0.35 : 0.85);
  for (let i = Math.floor(off * 0.1 / 260) - 1; i < Math.floor(off * 0.1 / 260) + 5; i++) {
    const x = i * 260 - off * 0.1 + h01(i) * 120, y = 40 + h01(i + 3) * 90, s = 0.7 + h01(i + 7) * 0.6;
    ell(c, x, y, 40 * s, 13 * s); c.fill(); ell(c, x + 22 * s, y - 9 * s, 24 * s, 14 * s); c.fill(); ell(c, x - 20 * s, y - 4 * s, 18 * s, 10 * s); c.fill();
  }
  // hills
  const hill = (k, base, amp, col) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, GROUND);
    for (let x = 0; x <= W + 20; x += 20) { const X = x + off * k; c.lineTo(x, base + Math.sin(X * 0.006) * amp + Math.sin(X * 0.0137 + 1) * amp * 0.5); }
    c.lineTo(W, GROUND); c.closePath(); c.fill();
  };
  hill(0.15, 250, 26, pal.far);
  hill(0.3, 285, 20, pal.near);
  // trees
  const k = 0.55, sp = 120, start = Math.floor(off * k / sp) - 1;
  for (let i = start; i < start + Math.ceil(W / sp) + 3; i++) {
    if (h01(i * 3.1) > 0.62) continue;
    const x = i * sp - off * k + h01(i) * 60, s = 0.7 + h01(i + 2) * 0.6, base = GROUND - 4;
    c.fillStyle = shade(pal.ground, -0.15); c.fillRect(x - 4 * s, base - 46 * s, 8 * s, 46 * s);
    if (h01(i + 5) < 0.5) {
      c.fillStyle = pal.treeDk; circ(c, x, base - 60 * s, 28 * s); c.fill();
      c.fillStyle = pal.tree; circ(c, x - 10 * s, base - 66 * s, 20 * s); c.fill(); circ(c, x + 12 * s, base - 58 * s, 18 * s); c.fill();
    } else {
      c.fillStyle = pal.treeDk; c.beginPath(); c.moveTo(x - 26 * s, base - 30 * s); c.lineTo(x, base - 110 * s); c.lineTo(x + 26 * s, base - 30 * s); c.fill();
      c.fillStyle = pal.tree; c.beginPath(); c.moveTo(x - 20 * s, base - 62 * s); c.lineTo(x, base - 118 * s); c.lineTo(x + 20 * s, base - 62 * s); c.fill();
    }
  }
  // ground
  c.fillStyle = pal.ground; c.fillRect(0, GROUND, W, H - GROUND);
  c.fillStyle = pal.grass; c.fillRect(0, GROUND - 4, W, 10);
  c.fillStyle = shade(pal.ground, -0.18);
  for (let i = Math.floor(off / 70) - 1; i < Math.floor(off / 70) + W / 70 + 2; i++) {
    const x = i * 70 - off + h01(i) * 50, y = GROUND + 16 + h01(i + 1) * 46;
    ell(c, x, y, 5 + h01(i + 2) * 6, 3); c.fill();
  }
  c.fillStyle = shade(pal.grass, 0.12);
  for (let i = Math.floor(off / 36) - 1; i < Math.floor(off / 36) + W / 36 + 2; i++) {
    if (h01(i + 0.5) < 0.45) continue;
    const x = i * 36 - off + h01(i) * 20;
    c.beginPath(); c.moveTo(x - 4, GROUND); c.lineTo(x - 2, GROUND - 9); c.lineTo(x, GROUND - 2); c.lineTo(x + 3, GROUND - 11); c.lineTo(x + 5, GROUND); c.fill();
  }
}

export function drawObstacle(c, o) {
  const { x, y, w, h } = o;
  c.save();
  if (o.type === 'log') {
    c.fillStyle = 'rgba(0,0,0,0.18)'; ell(c, x + w / 2, GROUND + 2, w / 2 + 4, 5); c.fill();
    c.fillStyle = '#8b5a2b'; rr(c, x, y + 2, w, h - 2, 12); c.fill();
    c.strokeStyle = '#5e3b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 12, y + 10); c.lineTo(x + w - 18, y + 10); c.moveTo(x + 8, y + 20); c.lineTo(x + w - 22, y + 20); c.stroke();
    c.fillStyle = '#c2915a'; ell(c, x + w - 10, y + h / 2 + 1, 10, h / 2 - 1); c.fill();
    c.strokeStyle = '#8b5a2b'; c.lineWidth = 1.5; ell(c, x + w - 10, y + h / 2 + 1, 5, h / 4); c.stroke();
    c.fillStyle = '#6aa35e'; ell(c, x + 18, y + 2, 7, 3, -0.3); c.fill();
  } else if (o.type === 'bramble') {
    c.fillStyle = 'rgba(0,0,0,0.18)'; ell(c, x + w / 2, GROUND + 2, w / 2, 5); c.fill();
    c.fillStyle = '#3f6b3a'; circ(c, x + 16, y + 24, 16); c.fill(); circ(c, x + 34, y + 16, 17); c.fill(); circ(c, x + 50, y + 25, 15); c.fill();
    c.fillStyle = '#4f7f45'; circ(c, x + 30, y + 28, 13); c.fill();
    c.strokeStyle = '#2b4a28'; c.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const a = -Math.PI + i * Math.PI / 8, cx0 = x + w / 2, cy0 = y + 26; c.beginPath(); c.moveTo(cx0 + Math.cos(a) * 26, cy0 + Math.sin(a) * 20); c.lineTo(cx0 + Math.cos(a) * 34, cy0 + Math.sin(a) * 27); c.stroke(); }
    c.fillStyle = '#7a3d6b'; [[18, 18], [40, 12], [52, 28], [28, 30]].forEach(([a, b]) => { circ(c, x + a, y + b, 3.2); c.fill(); });
  } else if (o.type === 'stump') {
    c.fillStyle = 'rgba(0,0,0,0.18)'; ell(c, x + w / 2, GROUND + 2, w / 2 + 6, 5); c.fill();
    c.fillStyle = '#7a4f28'; c.fillRect(x, y + 6, w, h - 6);
    c.fillStyle = '#6a4322'; c.fillRect(x + 8, y + 10, 4, h - 14); c.fillRect(x + 26, y + 14, 3, h - 18);
    c.fillStyle = '#c2915a'; ell(c, x + w / 2, y + 6, w / 2, 7); c.fill();
    c.strokeStyle = '#8b5a2b'; c.lineWidth = 1.2; ell(c, x + w / 2, y + 6, w / 4, 3.5); c.stroke();
    c.fillStyle = '#5e3b1a'; c.beginPath(); c.moveTo(x - 4, GROUND); c.lineTo(x + 4, GROUND - 12); c.lineTo(x + 10, GROUND); c.moveTo(x + w + 4, GROUND); c.lineTo(x + w - 4, GROUND - 12); c.lineTo(x + w - 10, GROUND); c.fill();
  } else if (o.type === 'dummy') {
    // Moss's training dummy (from the pet): post, straw body, wooden arms
    const cxo = x + w / 2, wob = Math.sin(o.t * 3) * 0.04;
    c.translate(cxo, GROUND); c.rotate(wob); c.translate(-cxo, -GROUND);
    c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, cxo, GROUND + 2, 16, 4); c.fill();
    c.fillStyle = '#6e4a26'; c.fillRect(cxo - 3, y + 30, 6, h - 30);
    c.fillStyle = '#8b5a2b'; c.fillRect(x - 2, y + 30, w + 4, 6);
    c.fillStyle = '#d8b66a'; rr(c, cxo - 13, y + 22, 26, 30, 9); c.fill();
    c.strokeStyle = '#a3833f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cxo - 13, y + 33); c.lineTo(cxo + 13, y + 33); c.moveTo(cxo - 13, y + 43); c.lineTo(cxo + 13, y + 43); c.stroke();
    c.fillStyle = '#d8b66a'; circ(c, cxo, y + 12, 11); c.fill();
    c.strokeStyle = '#e0603a'; c.lineWidth = 2.5; circ(c, cxo, y + 37, 5); c.stroke(); circ(c, cxo, y + 37, 1.2); c.stroke();
    c.fillStyle = '#5e3b1a'; c.fillRect(cxo - 5, y + 9, 3, 3); c.fillRect(cxo + 2, y + 9, 3, 3);
  } else if (o.type === 'crowLow' || o.type === 'crowHi') {
    const flap = Math.sin(o.t * 16);
    const cxo = x + w / 2, cyo = y + h / 2;
    c.fillStyle = '#2c2c34';
    ell(c, cxo, cyo, 17, 10); c.fill();
    circ(c, cxo - 14, cyo - 5, 8); c.fill();
    c.beginPath(); c.moveTo(cxo + 14, cyo - 2); c.lineTo(cxo + 26, cyo - 6); c.lineTo(cxo + 24, cyo + 4); c.fill();
    c.fillStyle = '#3d3d4a'; c.beginPath(); c.moveTo(cxo - 6, cyo - 4); c.lineTo(cxo + 6, cyo - 4); c.lineTo(cxo + 2 + flap * 4, cyo - 4 - 18 * flap); c.closePath(); c.fill();
    c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(cxo - 21, cyo - 6); c.lineTo(cxo - 30, cyo - 3); c.lineTo(cxo - 21, cyo - 2); c.fill();
    c.fillStyle = '#ff5252'; circ(c, cxo - 16, cyo - 7, 1.8); c.fill();
  } else if (o.type === 'branch') {
    c.fillStyle = '#5e3b1a'; c.fillRect(x + w / 2 - 6, 0, 12, h - 16);
    c.save(); c.translate(x + w / 2, h - 18); c.rotate(Math.sin(o.t * 2) * 0.05);
    c.fillStyle = '#4a7a3f'; ell(c, 0, 0, w / 2 + 4, 20); c.fill();
    c.fillStyle = '#5f9150'; ell(c, -12, -4, 22, 14); c.fill(); ell(c, 16, 2, 20, 13); c.fill();
    c.fillStyle = '#7a3d6b'; circ(c, -18, 10, 3); c.fill(); circ(c, 8, 14, 3); c.fill(); circ(c, 22, 8, 3); c.fill();
    c.restore();
  }
  c.restore();
}

export function drawNest(c, front) {
  const nx = nestScreenX();
  if (nx > W + 200) return;
  const top = GROUND - NEST_STUMP_H;
  if (!front) {
    // stump + flag
    c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, nx, GROUND + 3, 62, 7); c.fill();
    c.fillStyle = '#7a4f28'; c.fillRect(nx - 46, top, 92, NEST_STUMP_H);
    c.fillStyle = '#6a4322'; c.fillRect(nx - 30, top + 6, 5, NEST_STUMP_H - 8); c.fillRect(nx + 18, top + 10, 4, NEST_STUMP_H - 12);
    c.fillStyle = '#5e3b1a'; c.beginPath(); c.moveTo(nx - 56, GROUND); c.lineTo(nx - 44, GROUND - 16); c.lineTo(nx - 36, GROUND); c.moveTo(nx + 56, GROUND); c.lineTo(nx + 44, GROUND - 16); c.lineTo(nx + 36, GROUND); c.fill();
    c.strokeStyle = '#5e3b1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(nx + 52, top + 4); c.lineTo(nx + 52, top - 70); c.stroke();
    const fw = Math.sin(G.t * 6) * 4;
    c.fillStyle = MOSS.scarf; c.beginPath(); c.moveTo(nx + 53, top - 70); c.quadraticCurveTo(nx + 72, top - 64 + fw, nx + 88, top - 60 + fw); c.lineTo(nx + 53, top - 48); c.fill();
    c.fillStyle = CREAM; c.font = '700 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('HOME', nx, top + 34);
    // nest back (inside of the bowl)
    c.fillStyle = '#4a321c'; ell(c, nx, top - 6, 56, 13); c.fill();
    c.strokeStyle = '#6e4a2a'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(nx - 50 + i * 15, top - 12); c.lineTo(nx - 40 + i * 15, top - 2); c.stroke(); }
  } else {
    // nest front bowl with twigs (like the pet's nest)
    const g = c.createLinearGradient(0, top - 8, 0, top + 18);
    g.addColorStop(0, '#9a6a3a'); g.addColorStop(1, '#5e3b1a');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(nx - 60, top - 6); c.quadraticCurveTo(nx - 56, top + 18, nx, top + 18); c.quadraticCurveTo(nx + 56, top + 18, nx + 60, top - 6); c.quadraticCurveTo(nx, top + 6, nx - 60, top - 6); c.fill();
    c.strokeStyle = '#c2915a'; c.lineWidth = 3; c.beginPath(); c.moveTo(nx - 58, top - 6); c.quadraticCurveTo(nx, top + 7, nx + 58, top - 6); c.stroke();
    const tw = [[-48, 4, 0.5], [-26, 10, -0.3], [-4, 12, 0.2], [20, 9, -0.4], [42, 4, 0.35], [-38, -2, -0.6], [34, -2, 0.6]];
    c.lineCap = 'round';
    tw.forEach(([dx, dy, a], i) => { c.strokeStyle = i % 2 ? '#8b5a2b' : '#c2915a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(nx + dx - Math.cos(a) * 14, top + dy - Math.sin(a) * 14); c.lineTo(nx + dx + Math.cos(a) * 14, top + dy + Math.sin(a) * 14); c.stroke(); });
    c.fillStyle = '#6aa35e'; ell(c, nx - 46, top + 6, 7, 3.5, -0.5); c.fill(); ell(c, nx + 40, top + 10, 7, 3.5, 0.6); c.fill();
  }
}

export function drawOrb(c, o) {
  const bob = Math.sin(o.ph) * 3;
  if (o.gold) {
    c.fillStyle = 'rgba(255,213,79,0.3)'; circ(c, o.x, o.y + bob, 15); c.fill();
    // golden acorn
    c.fillStyle = '#e0b23a'; ell(c, o.x, o.y + bob + 3, 8, 9); c.fill();
    c.fillStyle = '#8b5a2b'; c.beginPath(); c.moveTo(o.x - 10, o.y + bob); c.quadraticCurveTo(o.x, o.y + bob - 12, o.x + 10, o.y + bob); c.fill();
    c.fillStyle = '#fff2c0'; circ(c, o.x - 3, o.y + bob + 2, 2); c.fill();
  } else {
    const g = c.createRadialGradient(o.x - 2, o.y + bob - 2, 1, o.x, o.y + bob, 10);
    g.addColorStop(0, '#f4ffe8'); g.addColorStop(0.5, '#9ccc4a'); g.addColorStop(1, 'rgba(106,163,94,0)');
    c.fillStyle = g; circ(c, o.x, o.y + bob, 10); c.fill();
    c.fillStyle = '#4f8a47'; c.beginPath(); c.moveTo(o.x, o.y + bob - 5); c.quadraticCurveTo(o.x + 5, o.y + bob, o.x, o.y + bob + 5); c.quadraticCurveTo(o.x - 5, o.y + bob, o.x, o.y + bob - 5); c.fill();
  }
}

export function playerPose() {
  const P = G.player, T = G.char;
  let wing = 8, mood = 'idle', eyes = ((G.t % 3.7) < 0.12) ? 'blink' : 'open';
  if (G.state === 'dying' || G.state === 'dead') { eyes = 'x'; mood = 'worried'; wing = 100; }
  else if ((G.state === 'arrive' && G.arrive && G.arrive.done) || G.state === 'cleared') { mood = 'cheer'; wing = 115 + Math.sin(G.t * 22) * 18; }
  else if (G.dash > 0) { wing = 30; mood = 'cheer'; }
  else if (P.onGround) { wing = 10 + Math.sin(P.runPh * 2) * 6; }
  else if (P.gliding) { wing = 95 + Math.sin(G.t * 24) * 22; }
  else if (P.vy < 0) wing = 75; else wing = 45;
  if (G.levelCheer > 0 && G.state === 'play') mood = 'cheer';
  P.wingAng = wing;
  return { t: G.t, wing, mood, eyes, run: P.onGround && G.state === 'play' ? P.runPh : null, air: !P.onGround, glide: P.gliding && G.state === 'play' && G.dash <= 0 };
}

export function drawPlayer(c) {
  const P = G.player, T = G.char;
  const pose = playerPose();
  const sq = P.squash;
  const bob = P.onGround && G.state === 'play' ? Math.abs(Math.sin(P.runPh)) * 2.5 : 0;
  let lean = 6;
  if (!P.onGround) lean = clamp(P.vy / 60, -10, 14);
  if (G.dash > 0) lean = 18;
  if (G.state === 'arrive' || G.state === 'cleared') lean = 0;
  // shadow
  if (G.state !== 'dying' && G.state !== 'dead') {
    const floorY = (G.state === 'arrive' || G.state === 'cleared') && Math.abs(P.x - nestScreenX()) < 50 ? NEST_SEAT + 4 : GROUND;
    const hgt = clamp((floorY - P.y) / 200, 0, 1);
    c.fillStyle = `rgba(0,0,0,${0.22 * (1 - hgt * 0.7)})`; ell(c, P.x, floorY + 2, 22 * (1 - hgt * 0.5), 5); c.fill();
  }
  // Double Team decoys orbiting
  if (G.shield) {
    for (let i = 0; i < 3; i++) {
      const a = G.t * 4 + i * Math.PI * 2 / 3;
      c.save(); c.translate(P.x + Math.cos(a) * 38, P.y - bob + Math.sin(a) * 10 - 4); c.scale(SPRITE_S * 0.9, SPRITE_S * 0.9);
      drawGhostCopy(c, T, pose, 0.32 + (G.shield.t < 2 ? Math.sin(G.t * 30) * 0.15 : 0)); c.restore();
    }
  }
  if (G.inv > 0 && G.dash <= 0 && Math.floor(G.t * 20) % 2 === 0) return;
  c.save();
  c.translate(P.x, P.y - bob);
  if (G.state === 'dying' || G.state === 'dead') { c.translate(0, -28); c.rotate(P.rot); c.translate(0, 28); }
  c.rotate(rad(lean));
  c.scale(SPRITE_S * (1 + sq), SPRITE_S * (1 - sq));
  if (G.dash > 0) { c.shadowColor = '#bfe9ff'; c.shadowBlur = 24; }
  drawCritter(c, T, pose);
  c.restore();
}

export function drawParts(c, front) {
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'text') {
      if (!front) continue;
      c.globalAlpha = a; c.fillStyle = p.color; c.font = `800 ${p.size}px system-ui, sans-serif`; c.textAlign = 'center';
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 3; c.strokeText(p.text, p.x, p.y); c.fillText(p.text, p.x, p.y);
      continue;
    }
    if (front) continue;
    c.globalAlpha = a;
    if (p.kind === 'after') {
      c.save(); c.translate(p.x, p.y); c.rotate(rad(18)); c.scale(SPRITE_S, SPRITE_S);
      c.globalAlpha = a * 0.35; drawCritter(c, G.char, { t: G.t, wing: p.snap.wing, mood: 'cheer', eyes: 'open', run: null, air: true }); c.restore();
      continue;
    }
    if (p.kind === 'ring') { c.strokeStyle = p.color; c.lineWidth = 4 * a; circ(c, p.x, p.y, p.r * (1 - a) + 8); c.stroke(); continue; }
    c.fillStyle = p.color;
    if (p.kind === 'leaf' || p.kind === 'feather') {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
      ell(c, 0, 0, p.size, p.size * (p.kind === 'leaf' ? 0.45 : 0.3)); c.fill(); c.restore();
    } else if (p.kind === 'chip') {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore();
    } else if (p.kind === 'spark') {
      const s = p.size * (0.5 + a * 0.5);
      c.beginPath(); c.moveTo(p.x, p.y - s); c.lineTo(p.x + s * 0.3, p.y - s * 0.3); c.lineTo(p.x + s, p.y); c.lineTo(p.x + s * 0.3, p.y + s * 0.3);
      c.lineTo(p.x, p.y + s); c.lineTo(p.x - s * 0.3, p.y + s * 0.3); c.lineTo(p.x - s, p.y); c.lineTo(p.x - s * 0.3, p.y - s * 0.3); c.fill();
    } else { circ(c, p.x, p.y, p.size * a); c.fill(); }
  }
  c.globalAlpha = 1;
}

export function drawSeeds(c) {
  for (const s of G.seeds) {
    if (s.t < 0) continue;
    c.save(); c.translate(s.x, s.y); c.rotate(s.t * 14);
    c.fillStyle = '#8b5a2b'; ell(c, 0, 0, 7, 5); c.fill();
    c.fillStyle = '#c2915a'; ell(c, -2, -1, 3, 2); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,213,79,0.8)'; circ(c, s.x - 6, s.y + 2, 2.5); c.fill();
  }
}

export function drawShouts(c) {
  const P = G.player;
  for (const s of G.shouts) {
    const a = s.t < 0.1 ? s.t / 0.1 : s.t > s.dur - 0.2 ? (s.dur - s.t) / 0.2 : 1;
    c.globalAlpha = clamp(a, 0, 1);
    c.font = '800 14px system-ui, sans-serif'; c.textAlign = 'center';
    const w = c.measureText(s.text).width + 18, x = clamp(P.x + 10, w / 2 + 4, W - w / 2 - 4), y = P.y - 78 - s.t * 10;
    c.fillStyle = CREAM; rr(c, x - w / 2, y - 16, w, 24, 10); c.fill();
    c.beginPath(); c.moveTo(x - 8, y + 8); c.lineTo(x - 2, y + 15); c.lineTo(x + 2, y + 8); c.fill();
    c.strokeStyle = '#557d47'; c.lineWidth = 1.5; rr(c, x - w / 2, y - 16, w, 24, 10); c.stroke();
    c.fillStyle = '#263326'; c.fillText(s.text, x, y + 1);
  }
  c.globalAlpha = 1;
}

