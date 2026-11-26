// Keyboard, mouse and touch input.
import { Sfx } from '../audio/sfx.js';
import { BUFFER, H, JUMP_CUT, MOVES, W } from '../config.js';
import { useMove } from '../game/moves.js';
import { G, cv, restartRun, startStage } from '../game/state.js';
import { slotRect } from '../render/hud.js';
import { pauseToggle, startFromTitle, toTitle } from './panels.js';

export function jumpPress() {
  Sfx.init();
  if (G.state === 'play') { G.held = true; G.player.buffer = BUFFER; }
  else if (G.state === 'dying' && G.deadT > 0.3) { G.state = 'dead'; restartRun(); }
  else if (G.state === 'dead' && G.deadT > 0.3) restartRun();
  else if (G.state === 'cleared') startStage(G.stage + 1);
  else if (G.state === 'paused') pauseToggle();
}
export function jumpRelease() {
  G.held = false;
  const P = G.player;
  if (P && G.state === 'play' && P.vy < JUMP_CUT) P.vy = JUMP_CUT;
}
export function canvasPoint(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }

export function initInput() {
  window.addEventListener('keydown', e => {
    const inInput = e.target && e.target.id === 'prompt';
    if (inInput) {
      if (e.key === 'Enter') { e.preventDefault(); startFromTitle(); }
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    const k = e.key.toLowerCase();
    if (e.code === 'Space' || k === 'arrowup' || k === 'w') {
      e.preventDefault();
      if (e.repeat) return;
      if (G.state === 'title') { startFromTitle(); return; }
      jumpPress(); return;
    }
    if (G.state === 'title') { if (k === 'enter') startFromTitle(); return; }
    if (k === 'enter' && (G.state === 'dead' || G.state === 'cleared')) { jumpPress(); return; }
    const mi = MOVES.findIndex(m => m.key === k || m.alt === k);
    if (mi >= 0) { e.preventDefault(); useMove(mi); return; }
    if (k === 'm') { Sfx.init(); Sfx.toggle(); return; }
    if (k === 'p' || k === 'escape') { if (G.state === 'dead' && k === 'escape') toTitle(); else pauseToggle(); return; }
    if (k === 'e' && (G.state === 'dead' || G.state === 'cleared')) { toTitle(); return; }
    if (k === 'r' && (G.state === 'dead' || G.state === 'dying')) { restartRun(); return; }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') jumpRelease();
  });
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = canvasPoint(e);
    if (G.state === 'play') {
      for (let i = 0; i < MOVES.length; i++) { const r = slotRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { useMove(i); return; } }
    }
    if (G.state === 'title') return;
    jumpPress();
  });
  window.addEventListener('pointerup', () => jumpRelease());
  window.addEventListener('pointercancel', () => jumpRelease());
  window.addEventListener('blur', () => { G.held = false; if (G.state === 'play') pauseToggle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseToggle(); });
}
