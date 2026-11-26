// Drawing Grimwing the Crow King, his attacks and his health bar. His behaviour is in the
// Rust engine (engine/src/game/boss.rs); this only draws the state it reports.
import { GROUND, W } from '../config.js';
import { CFG } from '../engine.js';
import { G } from '../state.js';
import { circ, ell, rr } from '../util.js';

export const BOSS_NAME = CFG.bossName;
const LANE = { low: CFG.laneLow, high: CFG.laneHigh }; // feather heights: low = hop over, high = stay on the ground

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

