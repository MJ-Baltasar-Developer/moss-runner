// Player settings, saved on the device.
import { store } from './util.js';

const KEY = 'mossRunner.settings';
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = {
  easy: true,            // three hearts and checkpoints: friendlier for young players
  music: 0.5,            // 0..1
  sound: 1,              // 0..1
  reducedMotion: reduced, // no screen shake, no flashing
  contrast: false,       // boss warnings in yellow and black instead of red
  tutorial: true,        // show the first-run hints
};
export const settings = Object.assign({}, defaults, store.get(KEY, {}));
export function saveSettings() { store.set(KEY, settings); }
