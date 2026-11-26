// The canvas, the run state G, and starting runs and stages.
import { parsePrompt } from '../character/prompt.js';
import { DAY, GROUND, H, MOVES, PLAYER_X, PX_PER_M, W } from '../config.js';
import { BOSS_AT, isBossStage } from './boss.js';
import { setBanner } from './effects.js';
import { showPanel } from '../ui/panels.js';

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

export const G = {
  state: 'title', t: 0, char: parsePrompt('moss'), stage: 1, dist: 0, scroll: 0, speed: 0, stageLen: 0,
  score: 0, orbCount: 0, smashed: 0, level: 1, xp: 0, maxLevel: 1,
  player: null, obstacles: [], orbs: [], parts: [], seeds: [], shouts: [], hazards: [], boss: null, bossDone: false, charge: null, practice: false,
  shake: 0, hitstop: 0, banner: null, cds: {}, unlockFlash: {}, dash: 0, shield: null, inv: 0, storm: null,
  nextSpawn: 0, deadT: 0, arrive: null, held: false, orbStreak: 0, orbStreakT: 0, stageStart: 0,
};
export const stageSpeed = s => Math.min(300 + 32 * (s - 1), 560);
export const stageLenPx = s => (500 + 100 * s) * PX_PER_M;

export function newPlayer() { return { x: PLAYER_X, y: GROUND, vy: 0, onGround: true, buffer: 0, coyote: 0, runPh: 0, squash: 0, gliding: false, rot: 0 }; }

export function newRun() {
  Object.assign(G, { stage: 1, score: 0, orbCount: 0, smashed: 0, level: 1, xp: 0, maxLevel: 1, cds: {}, practice: false });
  startStage(1);
}
// Practice: jump straight to the stage 5 boss with every move learned. Not saved to best runs.
export function startPractice() {
  Object.assign(G, { score: 0, orbCount: 0, smashed: 0, level: 7, xp: 0, maxLevel: 7, cds: {}, practice: true });
  startStage(5);
  G.dist = G.stageLen - BOSS_AT - 500;
  setBanner('Boss practice', 'Stage 5 · all moves learned · not saved to best runs', 2.2, '#ffd54f');
}
export function restartRun() { if (G.practice) startPractice(); else newRun(); }
export function startStage(s) {
  Object.assign(G, { stage: s, dist: 0, speed: stageSpeed(s) * 0.6, stageLen: stageLenPx(s), obstacles: [], orbs: [], seeds: [], shouts: [],
    dash: 0, shield: null, inv: 0, storm: null, nextSpawn: 700, arrive: null, banner: null, deadT: 0, stageStart: G.score, orbStreak: 0,
    hazards: [], boss: null, bossDone: false, charge: null });
  G.player = newPlayer();
  for (const m of MOVES) G.cds[m.id] = 0;
  G.state = 'play';
  showPanel(null);
  setBanner(`Stage ${s}`, `${DAY[(s - 1) % DAY.length].name} · ${Math.round(G.stageLen / PX_PER_M)} m to the nest${isBossStage(s) ? ' · a boss guards it!' : ''}`, 2.2);
}
