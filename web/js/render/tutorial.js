// First-run hints for new (and young) players: drawn in the game, with a hand on touch screens
// and the key on keyboards. Each hint shows until the player has done it once.
import { CREAM, GROUND, MOVES } from '../config.js';
import { device } from '../device.js';
import { settings, saveSettings } from '../settings.js';
import { G } from '../state.js';
import { circ, rr } from '../util.js';
import { slotRect } from './hud.js';

const done = { hop: false, glide: false, move: false };

/** Call from input: the player hopped / glided / used a move. */
export function tutorialSaw(what) {
  if (done[what]) return;
  done[what] = true;
  if (done.hop && done.glide && done.move && settings.tutorial) { settings.tutorial = false; saveSettings(); }
}

function bubble(c, x, y, text) {
  c.font = '800 16px system-ui, sans-serif'; c.textAlign = 'center';
  const w = c.measureText(text).width + 24;
  c.fillStyle = 'rgba(38,51,38,0.92)'; rr(c, x - w / 2, y - 22, w, 32, 10); c.fill();
  c.strokeStyle = '#ffd54f'; c.lineWidth = 2; rr(c, x - w / 2, y - 22, w, 32, 10); c.stroke();
  c.fillStyle = CREAM; c.fillText(text, x, y);
}

function hand(c, x, y, press) {
  c.save(); c.translate(x, y + (press ? 4 : 0));
  c.fillStyle = '#ffe0c2'; c.strokeStyle = '#5e3b1a'; c.lineWidth = 2;
  rr(c, -7, -26, 14, 30, 7); c.fill(); c.stroke();
  rr(c, -16, -4, 32, 26, 10); c.fill(); c.stroke();
  if (press) { c.strokeStyle = 'rgba(255,213,79,0.9)'; c.lineWidth = 3; circ(c, 0, -26, 14); c.stroke(); }
  c.restore();
}

export function drawTutorial(c) {
  if (!settings.tutorial || G.state !== 'play' || G.practice) return;
  const P = G.player, pulse = Math.floor(G.t * 3) % 2 === 0;
  const near = G.obstacles.some(o => !o.dead && o.x > P.x && o.x - P.x < 330);
  if (!done.hop && near) {
    bubble(c, P.x + 70, GROUND - 120, device.touch ? 'Tap to hop!' : 'Press Space to hop!');
    if (device.touch) hand(c, P.x + 150, GROUND - 40, pulse);
  } else if (done.hop && !done.glide && !P.onGround && P.vy > 0) {
    bubble(c, P.x + 80, P.y - 90, device.touch ? 'Hold to glide!' : 'Hold Space to glide!');
  } else if (!done.move) {
    const m = MOVES.findIndex(m => G.level >= m.lv && !(G.cds[m.id] > 0));
    if (m >= 0) {
      const r = slotRect(m);
      bubble(c, r.x + r.w / 2 + 60, r.y - 22, device.touch ? 'Tap a move!' : `Press ${MOVES[m].key} for ${MOVES[m].name}!`);
      if (device.touch) hand(c, r.x + r.w / 2, r.y + r.h - 6, pulse);
    }
  }
}
