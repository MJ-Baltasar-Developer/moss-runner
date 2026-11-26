// The game loop: the Rust engine steps the game, then the renderer draws it, every animation frame.
import { Music, tuneFor } from './audio/music.js';
import { engine } from './engine.js';
import { G, afterEngine } from './state.js';
import { render } from './render/render.js';
import { stepGhost } from './ui/daily.js';
import { pollGamepad } from './ui/input.js';
import { drawPreview } from './ui/panels.js';

export let last = performance.now();
export function resetClock() { last = performance.now(); }
export function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollGamepad();
  const running = G.state !== 'paused' && G.state !== 'title';
  engine.frame(dt); // fixed 1/120 s steps inside; does nothing while paused or on the title screen
  if (running) stepGhost(dt); // the daily ghost runs in step with you
  afterEngine();
  Music.play(tuneFor(G));
  render();
  drawPreview(now / 1000);
  requestAnimationFrame(frame);
}
export function startLoop() { requestAnimationFrame(frame); }
