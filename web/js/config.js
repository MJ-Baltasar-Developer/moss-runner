// Constants for drawing. The rules (sizes, moves, XP curve) come from the Rust engine, so
// there's one source of truth; the colours and palettes live here.
import { CFG, xpNeeded } from './engine.js';

export const { w: W, h: H, ground: GROUND, pxPerM: PX_PER_M, playerX: PLAYER_X } = CFG;
export const SPRITE_S = 0.46;

export const MOSS = {
  body: '#7fa86b', dark: '#557d47', belly: '#eaf1d8', ring: '#3f5f36', iris: '#f4b23c',
  acorn: '#8b5a2b', acornDark: '#5e3b1a', scarf: '#e0603a', scarfDark: '#b8452a', beak: '#f2c14e', feet: '#e58b2e',
};
export const LEAF = '#6aa35e', CREAM = '#faf0d6';

// Moss's own XP curve: XP needed to go from `level` to `level + 1`.
export const need = xpNeeded;
/** The four moves: id, name, key, level learned, cooldown, description. */
export const MOVES = CFG.moves;

export const DAY = [
  { name: 'Morning', sky: ['#9fd3ea', '#e8f5dc'], sun: '#fff3b0', far: '#a9c99a', near: '#88b378', tree: '#5f9150', treeDk: '#4a7a3f', ground: '#7a5a3a', grass: '#6aa35e', cloud: '#ffffff', stars: false },
  { name: 'Noon', sky: ['#6fbde8', '#d6f0f6'], sun: '#fffbe0', far: '#9cc48c', near: '#78ab69', tree: '#568c47', treeDk: '#41733a', ground: '#80603d', grass: '#72ad62', cloud: '#ffffff', stars: false },
  { name: 'Sunset', sky: ['#ee8a5e', '#fad49d'], sun: '#ffd27a', far: '#b98a76', near: '#8a8a5c', tree: '#5a7340', treeDk: '#475c33', ground: '#6e4e31', grass: '#6f9a4e', cloud: '#ffd9c2', stars: false },
  { name: 'Dusk', sky: ['#4e4380', '#e3978a'], sun: '#ffc9a0', far: '#6a5a7e', near: '#4d5e4f', tree: '#3c5740', treeDk: '#2f4734', ground: '#4f3a29', grass: '#4d7346', cloud: '#c9a3b8', stars: true },
  { name: 'Night', sky: ['#121a31', '#2c3b5b'], sun: '#f3efd8', far: '#283849', near: '#223a2d', tree: '#1d3627', treeDk: '#162b1f', ground: '#352719', grass: '#2d5634', cloud: '#3c4a66', stars: true, moon: true },
];
