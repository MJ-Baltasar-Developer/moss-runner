// Keyboard, mouse and touch input.
import { Sfx } from '../audio/sfx.js';
import { H, MOVES, W } from '../config.js';
import { engine } from '../engine.js';
import { G, afterEngine, cv, restartRun } from '../state.js';
import { slotRect } from '../render/hud.js';
import { pauseToggle, startFromTitle, toTitle } from './panels.js';

export function jumpPress() {
  Sfx.init();
  if (G.state === 'paused') { pauseToggle(); return; }
  // hop, or restart after a run, or go on after a cleared stage: the engine decides
  engine.jumpPress(); afterEngine();
}
function useMove(i) { engine.useMove(i); afterEngine(); }
export function jumpRelease() {
  engine.jumpRelease(); // letting go early makes a small hop
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
  window.addEventListener('blur', () => { jumpRelease(); if (G.state === 'play') pauseToggle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseToggle(); });
}
