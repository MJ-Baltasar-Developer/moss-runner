// The game loop: the Rust engine steps the game, then the renderer draws it, every animation frame.
import { engine } from './engine.js';
import { afterEngine } from './state.js';
import { render } from './render/render.js';
import { drawPreview } from './ui/panels.js';

export let last = performance.now();
export function resetClock() { last = performance.now(); }
export function frame(now) {
  let dt = Math.min(0.033, (now - last) / 1000); last = now;
  engine.frame(dt); // does nothing while paused or on the title screen
  afterEngine();
  render();
  drawPreview(now / 1000);
  requestAnimationFrame(frame);
}
export function startLoop() { requestAnimationFrame(frame); }
