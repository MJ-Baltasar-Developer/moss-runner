// The canvas, and G: a read-only view of the Rust engine's state, refreshed every frame.
// Game actions go to the engine; its events (sounds, panels, saving the run) are handled here.
import { Sfx } from './audio/sfx.js';
import { H, W } from './config.js';
import { engine, parsePrompt } from './engine.js';
import { showClear, showOver, showPanel } from './ui/panels.js';
import { saveRun } from './ui/scores.js';

export const cv = document.getElementById('game'), cx = cv.getContext('2d');
// Draw at the canvas's real on-screen pixel size (CSS size x devicePixelRatio), so it stays sharp
// at any window size or zoom. K maps the 960x420 game coordinates onto those pixels.
export let DPR = 1, K = 1;
export function resize() {
  DPR = window.devicePixelRatio || 1;
  const cssW = cv.getBoundingClientRect().width || W;
  const bw = Math.max(W, Math.round(cssW * DPR)), bh = Math.round(bw * H / W);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  K = bw / W;
  const pvEl = document.getElementById('preview'), pd = Math.round(220 * DPR);
  if (pvEl && pvEl.width !== pd) { pvEl.width = pd; pvEl.height = pd; }
}
resize(); window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);

/**
 * The game state as last seen from the engine (player, obstacles, orbs, particles, boss...).
 * `char` (the runner's traits) and the saved-run fields are kept on the JavaScript side.
 */
export const G = { char: parsePrompt('moss'), lastWasBest: false, lastEntry: null };
sync();

/** Copy the engine's state into G. */
export function sync() { Object.assign(G, engine.snapshot()); }

/** After any engine call: refresh G and react to what happened. */
export function afterEngine() {
  sync();
  for (const e of engine.takeEvents()) {
    if (e.type === 'sfx') {
      if (e.name === 'level' || e.name === 'nest') Sfx[e.name](G.char);
      else if (Sfx[e.name]) Sfx[e.name](e.arg);
    } else if (e.type === 'started') showPanel(null);
    else if (e.type === 'died') saveRun();
    else if (e.type === 'over') showOver();
    else if (e.type === 'cleared') showClear();
  }
}

// Game actions, forwarded to the engine
export function newRun() { engine.newRun(); afterEngine(); }
export function startPractice() { engine.startPractice(); afterEngine(); }
export function restartRun() { engine.restartRun(); afterEngine(); }
export function nextStage() { engine.nextStage(); afterEngine(); }
