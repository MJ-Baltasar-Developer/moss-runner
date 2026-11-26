// The HUD: score, XP bar, progress to the nest and the move slots.
import { Sfx } from '../audio/sfx.js';
import { drawCritter } from '../character/sprite.js';
import { CREAM, DAY, H, LEAF, MOSS, MOVES, PX_PER_M, W, need } from '../config.js';
import { BOSS_NAME, drawBossHUD } from './boss.js';
import { G } from '../state.js';
import { bestScore } from '../ui/scores.js';
import { circ, clamp, ell, rr } from '../util.js';

export const SLOT = 60, SLOT_GAP = 8, SLOT_Y = H - SLOT - 10;
export function slotRect(i) { return { x: 14 + i * (SLOT + SLOT_GAP), y: SLOT_Y, w: SLOT, h: SLOT }; }

export function drawMoveIcon(c, id, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (id === 'brave-bird') {
    c.fillStyle = '#7fc9ff'; c.beginPath(); c.moveTo(-12, -9); c.lineTo(4, 0); c.lineTo(-12, 9); c.lineTo(-7, 0); c.fill();
    c.fillStyle = '#e8f7ff'; c.beginPath(); c.moveTo(-2, -9); c.lineTo(14, 0); c.lineTo(-2, 9); c.lineTo(3, 0); c.fill();
  } else if (id === 'double-team') {
    c.globalAlpha = 0.45; c.fillStyle = col; circ(c, -8, 2, 8); c.fill(); circ(c, 8, 2, 8); c.fill();
    c.globalAlpha = 1; circ(c, 0, -1, 9); c.fill(); c.fillStyle = MOSS.iris; circ(c, -3, -2, 2.5); c.fill(); circ(c, 3, -2, 2.5); c.fill();
  } else if (id === 'seed-bomb') {
    c.fillStyle = '#8b5a2b'; ell(c, 0, 2, 9, 7); c.fill(); c.fillStyle = '#c2915a'; ell(c, -3, 0, 3, 2); c.fill();
    c.fillStyle = '#ffd54f'; c.beginPath(); c.moveTo(6, -6); c.lineTo(9, -13); c.lineTo(11, -7); c.lineTo(15, -10); c.lineTo(11, -3); c.fill();
  } else if (id === 'leaf-storm') {
    [[-6, -4, -0.6, '#9ccc4a'], [6, -6, 0.5, '#6aa35e'], [0, 6, 0.1, '#cdeac0']].forEach(([a, b, r, cl]) => { c.fillStyle = cl; ell(c, a, b, 8, 4, r); c.fill(); });
  }
  c.restore();
}

export function drawHUD(c) {
  const T = G.char;
  c.textBaseline = 'alphabetic';
  // top-left: name + level badge (styled like the pet's level bar by the nest)
  c.fillStyle = 'rgba(61,41,23,0.88)'; rr(c, 12, 12, 214, 48, 10); c.fill();
  c.strokeStyle = 'rgba(194,145,90,0.9)'; c.lineWidth = 1.5; rr(c, 12, 12, 214, 48, 10); c.stroke();
  c.save(); c.beginPath(); c.rect(16, 14, 40, 44); c.clip();
  c.translate(36, 56); c.scale(0.3, 0.3); drawCritter(c, T, { t: G.t, wing: 8, mood: G.levelCheer > 0 ? 'cheer' : 'idle', eyes: (G.t % 3.7) < 0.12 ? 'blink' : 'open' }); c.restore();
  c.fillStyle = CREAM; c.font = '800 15px system-ui, sans-serif'; c.textAlign = 'left';
  c.fillText(T.name.length > 14 ? T.name.slice(0, 13) + '…' : T.name, 60, 31);
  c.font = '700 12px system-ui, sans-serif'; c.textAlign = 'right'; c.fillText(`Lv ${G.level}`, 216, 31);
  c.fillStyle = 'rgba(250,240,214,0.22)'; rr(c, 60, 39, 156, 9, 4.5); c.fill();
  c.fillStyle = LEAF; rr(c, 60, 39, Math.max(9, 156 * clamp(G.xp / need(G.level), 0, 1)), 9, 4.5); c.fill();
  c.fillStyle = 'rgba(250,240,214,0.7)'; c.font = '600 9px system-ui, sans-serif'; c.textAlign = 'right';
  c.fillText(`${G.xp}/${need(G.level)} XP`, 216, 57);

  // top-center: progress to the nest
  const px = 300, pw = 360, py = 22;
  const prog = clamp(G.dist / G.stageLen, 0, 1);
  c.fillStyle = 'rgba(38,51,38,0.78)'; rr(c, px - 10, 12, pw + 52, 40, 10); c.fill();
  c.fillStyle = CREAM; c.font = '700 11px system-ui, sans-serif'; c.textAlign = 'left';
  c.fillText(`Stage ${G.stage} · ${DAY[(G.stage - 1) % DAY.length].name}`, px, py + 4);
  c.textAlign = 'right';
  c.fillText(G.boss && !G.boss.dying ? `Beat ${BOSS_NAME} to get home!` : `${Math.max(0, Math.round((G.stageLen - G.dist) / PX_PER_M))} m to the nest`, px + pw, py + 4);
  c.fillStyle = 'rgba(250,240,214,0.2)'; rr(c, px, py + 11, pw, 7, 3.5); c.fill();
  c.fillStyle = '#c2915a'; rr(c, px, py + 11, Math.max(7, pw * prog), 7, 3.5); c.fill();
  c.fillStyle = T.base; circ(c, px + pw * prog, py + 14.5, 5.5); c.fill(); c.strokeStyle = CREAM; c.lineWidth = 1.5; c.stroke();
  // little nest icon
  c.fillStyle = '#8b5a2b'; c.beginPath(); c.moveTo(px + pw + 8, py + 10); c.quadraticCurveTo(px + pw + 20, py + 26, px + pw + 32, py + 10); c.fill();
  c.strokeStyle = '#c2915a'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + pw + 7, py + 10); c.lineTo(px + pw + 33, py + 10); c.stroke();

  // top-right: score
  const best = Math.max(bestScore(), Math.floor(G.score));
  c.fillStyle = 'rgba(38,51,38,0.78)'; rr(c, W - 164, 12, 152, 48, 10); c.fill();
  c.fillStyle = CREAM; c.textAlign = 'right'; c.font = '800 20px ui-monospace, monospace'; c.fillText(String(Math.floor(G.score)).padStart(6, '0'), W - 22, 36);
  c.font = '600 11px system-ui, sans-serif'; c.fillStyle = 'rgba(250,240,214,0.7)'; c.fillText(`BEST ${best}  ·  ${G.orbCount} orbs`, W - 22, 53);
  if (Sfx.muted) { c.textAlign = 'left'; c.fillText('muted (M)', W - 156, 53); }
  if (G.practice) { c.textAlign = 'right'; c.fillStyle = '#ffd54f'; c.font = '800 10px system-ui, sans-serif'; c.fillText('PRACTICE · not saved', W - 22, 74); }
  drawBossHUD(c);

  // bottom-left: move slots
  for (let i = 0; i < MOVES.length; i++) {
    const m = MOVES[i], r = slotRect(i), locked = G.level < m.lv, cd = G.cds[m.id] || 0, fl = G.unlockFlash[m.id] || 0;
    const active = (m.id === 'brave-bird' && G.dash > 0) || (m.id === 'double-team' && G.shield) || (m.id === 'leaf-storm' && G.storm) || (m.id === 'seed-bomb' && G.seeds.length);
    c.save();
    if (fl < 0) c.translate(Math.sin(G.t * 80) * 3, 0);
    c.fillStyle = locked ? 'rgba(31,42,31,0.8)' : 'rgba(38,51,38,0.92)'; rr(c, r.x, r.y, r.w, r.h, 9); c.fill();
    c.strokeStyle = active ? '#ffd54f' : fl > 0 ? `rgba(255,213,79,${0.5 + 0.5 * Math.sin(G.t * 12)})` : locked ? '#3f5136' : '#557d47';
    c.lineWidth = active || fl > 0 ? 3 : 2; rr(c, r.x, r.y, r.w, r.h, 9); c.stroke();
    c.globalAlpha = locked ? 0.3 : 1;
    drawMoveIcon(c, m.id, r.x + r.w / 2, r.y + r.h / 2 - 3, 1.1, T.base);
    c.globalAlpha = 1;
    if (!locked && cd > 0) {
      c.fillStyle = 'rgba(10,14,10,0.62)';
      c.beginPath(); c.moveTo(r.x + r.w / 2, r.y + r.h / 2);
      c.arc(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cd / m.cd)); c.closePath();
      c.save(); rr(c, r.x, r.y, r.w, r.h, 9); c.clip(); c.fill(); c.restore();
      c.fillStyle = CREAM; c.font = '800 14px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(Math.ceil(cd), r.x + r.w / 2, r.y + r.h / 2 + 5);
    }
    c.font = '700 10px ui-monospace, monospace'; c.textAlign = 'left'; c.fillStyle = locked ? 'rgba(250,240,214,0.45)' : CREAM;
    c.fillText(m.key, r.x + 5, r.y + 12);
    c.textAlign = 'center'; c.font = '700 9px system-ui, sans-serif';
    c.fillText(locked ? `Lv ${m.lv}` : m.name, r.x + r.w / 2, r.y + r.h - 4);
    c.restore();
  }
  if (G.shield) { c.fillStyle = CREAM; c.font = '600 11px system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(`decoys ${Math.ceil(G.shield.t)}s`, 14 + 4 * (SLOT + SLOT_GAP), SLOT_Y + 28); }

  // banner
  if (G.banner) {
    const b = G.banner, a = b.t < 0.15 ? b.t / 0.15 : b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
    const pop = b.t < 0.15 ? 0.7 + 0.3 * (b.t / 0.15) + Math.sin(b.t / 0.15 * Math.PI) * 0.12 : 1;
    c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate(W / 2, 118); c.scale(pop, pop);
    c.textAlign = 'center'; c.font = '900 30px system-ui, sans-serif';
    c.lineWidth = 6; c.strokeStyle = 'rgba(30,40,30,0.75)'; c.strokeText(b.title, 0, 0); c.fillStyle = b.color; c.fillText(b.title, 0, 0);
    if (b.sub) { c.font = '700 15px system-ui, sans-serif'; c.lineWidth = 4; c.strokeText(b.sub, 0, 26); c.fillStyle = CREAM; c.fillText(b.sub, 0, 26); }
    c.restore();
  }
}

