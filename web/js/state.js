// The canvas, and G: a read-only view of the Rust engine's state, refreshed every frame.
// Game actions go to the engine; its events (sounds, panels, saving the run) are handled here.
import { Sfx } from './audio/sfx.js';
import { H, W } from './config.js';
import { Engine, engine, parsePrompt } from './engine.js';
import { showClear, showOver, showPanel } from './ui/panels.js';
import { saveRun } from './ui/scores.js';
import { award, saveTotals, tally } from './ui/stickers.js';
import { finishDaily, startGhost, stopGhost } from './ui/daily.js';

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
export const G = { char: parsePrompt('moss'), lastWasBest: false, lastEntry: null, palette: [], pstride: Engine.particleStride() };
sync();

/** Copy the engine's state into G. */
export function sync() {
  Object.assign(G, engine.snapshot());
  // particles arrive packed in a Float32Array, with colours as indices into a shared palette
  G.pbuf = engine.particles();
  if (engine.paletteSize() !== G.palette.length) G.palette = engine.palette();
}

/** After any engine call: refresh G and react to what happened. */
export function afterEngine() {
  sync();
  for (const e of engine.takeEvents()) {
    switch (e.type) {
      case 'sfx':
        if (e.name === 'level' || e.name === 'nest') Sfx[e.name](G.char);
        else if (Sfx[e.name]) Sfx[e.name](e.arg);
        if (e.name === 'orb' || e.name === 'gold') tally('orbs');
        else if (e.name === 'smash') tally('smashed');
        else if (e.name === 'boing') award('bounce');
        else if (e.name === 'learn' && G.level >= 6) award('storm');
        else if (e.name === 'level' && G.level >= 10) award('lv10');
        break;
      case 'started':
        showPanel(null);
        if (G.biome === 1) award('snow'); else if (G.biome === 2) award('swamp');
        if (G.daily) startGhost(); else stopGhost();
        break;
      case 'died':
        if (G.daily) G.dailyResult = finishDaily(Math.floor(G.score), engine.recording());
        else saveRun();
        saveTotals();
        break;
      case 'over': showOver(); break;
      case 'cleared':
        award('nest');
        if (e.flawless) award('flawless');
        if (G.daily) {
          G.dailyResult = finishDaily(Math.floor(G.score), engine.recording());
          award('daily');
          if (G.dailyResult.beatGhost) award('ghost');
        }
        saveTotals();
        showClear();
        break;
      case 'evolved':
        G.char = engine.character();
        award(e.name.toLowerCase());
        break;
      case 'bossdefeated': award('grimwing'); break;
    }
  }
}

// Game actions, forwarded to the engine
export function newRun() { engine.newRun(); afterEngine(); }
export function startPractice() { engine.startPractice(); afterEngine(); }
export function restartRun() { engine.restartRun(); afterEngine(); }
export function nextStage() { engine.nextStage(); afterEngine(); }
export function startDaily(seed) { engine.startDaily(seed); afterEngine(); }
