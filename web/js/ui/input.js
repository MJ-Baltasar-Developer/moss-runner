// Keyboard, mouse, touch and gamepad input.
// Touch: tap or hold anywhere to hop and glide; tap a move button with another finger while
// gliding; the round button at the top pauses.
import { Sfx } from '../audio/sfx.js';
import { H, MOVES, W } from '../config.js';
import { engine } from '../engine.js';
import { G, afterEngine, cv, restartRun } from '../state.js';
import { pauseRect, slotRect } from '../render/hud.js';
import { tutorialSaw } from '../render/tutorial.js';
import { pauseToggle, startFromTitle, toTitle } from './panels.js';

export function jumpPress() {
  Sfx.init();
  if (G.state === 'paused') { pauseToggle(); return; }
  if (G.state === 'play') tutorialSaw('hop');
  // hop, or restart after a run, or go on after a cleared stage: the engine decides
  engine.jumpPress(); afterEngine();
}
export function jumpRelease() {
  if (G.state === 'play' && !G.player.onGround && G.held) tutorialSaw('glide');
  engine.jumpRelease(); // letting go early makes a small hop
}
function useMove(i) {
  if (G.state === 'play' && G.level >= MOVES[i].lv) tutorialSaw('move');
  engine.useMove(i); afterEngine();
}
export function canvasPoint(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// the finger (or mouse) that is holding the jump, so lifting another finger doesn't end a glide
let jumpPointer = null;

export function initInput() {
  window.addEventListener('keydown', e => {
    const inInput = e.target && e.target.id === 'prompt';
    if (inInput) {
      if (e.key === 'Enter') { e.preventDefault(); startFromTitle(); }
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (document.querySelector('.overlay.modal:not(.hidden)')) { if (e.key === 'Escape') document.querySelector('.overlay.modal:not(.hidden) [data-close]')?.click(); return; }
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
    if (k === 'p' || k === 'escape') { if ((G.state === 'dead' || G.state === 'cleared') && k === 'escape') toTitle(); else pauseToggle(); return; }
    if (k === 'e' && (G.state === 'dead' || G.state === 'cleared')) { toTitle(); return; }
    if (k === 'r' && (G.state === 'dead' || G.state === 'dying')) { restartRun(); return; }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') jumpRelease();
  });
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = canvasPoint(e);
    if (G.state === 'title') return;
    if ((G.state === 'play' || G.state === 'arrive') && inside(p, pauseRect())) { pauseToggle(); return; }
    if (G.state === 'play') {
      for (let i = 0; i < MOVES.length; i++) if (inside(p, slotRect(i))) { useMove(i); return; }
    }
    jumpPointer = e.pointerId;
    jumpPress();
  });
  const up = e => { if (jumpPointer === null || e.pointerId === jumpPointer) { jumpPointer = null; jumpRelease(); } };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', () => { jumpRelease(); if (G.state === 'play') pauseToggle(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseToggle(); });
}

// ---- gamepad: A hop/glide, X Y B RB the four moves, Start pause ----
const PAD_MOVES = [2, 3, 1, 5];
let padPrev = [];
export function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && Array.from(pads).find(p => p && p.connected);
  if (!pad) return;
  const now = pad.buttons.map(b => b.pressed);
  const pressed = i => now[i] && !padPrev[i], released = i => !now[i] && padPrev[i];
  if (pressed(0)) { if (G.state === 'title') startFromTitle(); else jumpPress(); }
  if (released(0)) jumpRelease();
  PAD_MOVES.forEach((b, i) => { if (pressed(b)) useMove(i); });
  if (pressed(9)) { if (G.state === 'dead' || G.state === 'cleared') toTitle(); else pauseToggle(); }
  padPrev = now;
}
