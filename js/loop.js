// The game loop: update, then draw, every animation frame.
import { G } from './game/state.js';
import { update } from './game/update.js';
import { render } from './render/render.js';
import { drawPreview } from './ui/panels.js';

export let last = performance.now();
export function resetClock() { last = performance.now(); }
export function frame(now) {
  let dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (G.state !== 'paused' && G.state !== 'title') {
    if (G.hitstop > 0) { G.hitstop -= dt; G.t += dt * 0.2; }
    else update(dt);
  }
  render();
  drawPreview(now / 1000);
  requestAnimationFrame(frame);
}
export function startLoop() { requestAnimationFrame(frame); }
