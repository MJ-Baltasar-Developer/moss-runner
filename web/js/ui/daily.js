// The daily challenge and its ghost.
//
// Everyone gets the same course each day: the seed comes from the date, and the Rust engine is
// deterministic (fixed time steps, its own random numbers). Your best run's inputs are saved, and
// next time a second engine replays them in step with you: that's your ghost.
import { Engine } from '../engine.js';
import { G } from '../state.js';
import { hashStr, store } from '../util.js';

const KEY = 'mossRunner.daily';

/** Today's date as YYYY-MM-DD in the player's own time zone. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const dailySeed = (date = today()) => hashStr('moss-daily-' + date);

/** Today's best { date, score, inputs } or null. */
export function dailyBest() {
  const d = store.get(KEY, null);
  return d && d.date === today() ? d : null;
}

let ghost = null;

/** Start the ghost (if there is a best run today) alongside a new daily run. */
export function startGhost() {
  const best = dailyBest();
  ghost = null;
  if (!best || !Array.isArray(best.inputs)) return; // an empty recording is fine: running straight
  ghost = new Engine(1);
  ghost.startDaily(dailySeed());
  ghost.setScript(new Uint32Array(best.inputs));
  ghost.takeEvents();
}
export function stopGhost() { ghost = null; }

/** Step the ghost with the same dt as the live game (only while the live game is running). */
export function stepGhost(dt) {
  if (!ghost || !G.daily) return;
  ghost.frame(dt);
  ghost.takeEvents();
}

/** The ghost's pose for drawing: { dist, x, y, vy, onGround, gliding, runPh, alive, dash } or null. */
export function ghostPose() {
  if (!ghost || !G.daily) return null;
  const p = ghost.pose();
  return { dist: p[0], x: p[1], y: p[2], vy: p[3], onGround: !!p[4], gliding: !!p[5], runPh: p[6], alive: !!p[7], dash: p[8] };
}

/**
 * At the end of a daily run: keep it if it beat today's best. Returns { best, improved, beatGhost }.
 */
export function finishDaily(score, inputs) {
  const prev = dailyBest();
  const improved = !prev || score > prev.score;
  if (improved) store.set(KEY, { date: today(), score, inputs: Array.from(inputs) });
  return { best: improved ? score : prev.score, improved, beatGhost: !!(prev && improved) };
}
