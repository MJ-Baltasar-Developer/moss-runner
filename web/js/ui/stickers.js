// The sticker book: little rewards for milestones, kept on the device.
import { Sfx } from '../audio/sfx.js';
import { store } from '../util.js';

export const STICKERS = [
  { id: 'nest', icon: '🪺', name: 'Home Sweet Home', how: 'Reach the nest' },
  { id: 'flawless', icon: '✨', name: 'Not a Scratch', how: 'Clear a stage without getting hit' },
  { id: 'storm', icon: '🌪️', name: 'Leaf Storm', how: 'Learn all four moves' },
  { id: 'grimwing', icon: '👑', name: 'Crow King Down', how: 'Beat Grimwing' },
  { id: 'fernando', icon: '🎩', name: 'Dapper', how: 'Moss evolves into Fernando' },
  { id: 'thornhood', icon: '🌿', name: 'Hooded', how: 'Evolve into Thornhood' },
  { id: 'snow', icon: '❄️', name: 'Snow Day', how: 'Reach the Snowy Peaks' },
  { id: 'swamp', icon: '🐸', name: 'Swamp Stomper', how: 'Reach the Swamp' },
  { id: 'bounce', icon: '🍄', name: 'Boing!', how: 'Bounce on a mushroom' },
  { id: 'orbs', icon: '🍃', name: 'Leaf Collector', how: 'Collect 300 orbs' },
  { id: 'smash', icon: '💥', name: 'Smasher', how: 'Smash 50 obstacles' },
  { id: 'daily', icon: '📅', name: 'Daily Runner', how: 'Finish a daily challenge' },
  { id: 'ghost', icon: '👻', name: 'Faster Than a Ghost', how: 'Beat your own daily ghost' },
  { id: 'lv10', icon: '⭐', name: 'Level 10', how: 'Reach level 10 in one run' },
];

const got = store.get('mossRunner.stickers', {});
const totals = Object.assign({ orbs: 0, smashed: 0 }, store.get('mossRunner.totals', {}));
let toastTimer = null;

export const hasSticker = id => !!got[id];
export const stickerCount = () => STICKERS.filter(s => got[s.id]).length;

/** Award a sticker (once) and show a little toast. */
export function award(id) {
  if (got[id]) return;
  const s = STICKERS.find(s => s.id === id); if (!s) return;
  got[id] = new Date().toISOString().slice(0, 10);
  store.set('mossRunner.stickers', got);
  Sfx.sticker();
  const t = document.getElementById('toast');
  t.textContent = `${s.icon}  New sticker: ${s.name}!`;
  t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/** Count things across all runs. */
export function tally(what) {
  totals[what] = (totals[what] || 0) + 1;
  if (totals.orbs >= 300) award('orbs');
  if (totals.smashed >= 50) award('smash');
  if (totals[what] % 10 === 0) store.set('mossRunner.totals', totals);
}
export function saveTotals() { store.set('mossRunner.totals', totals); }

export function renderStickers() {
  const grid = document.getElementById('stickerGrid'); grid.innerHTML = '';
  for (const s of STICKERS) {
    const d = document.createElement('div'); d.className = 'sticker' + (got[s.id] ? '' : ' locked');
    const i = document.createElement('div'); i.className = 'icon'; i.textContent = got[s.id] ? s.icon : '?';
    const n = document.createElement('b'); n.textContent = s.name;
    const h = document.createElement('small'); h.textContent = s.how;
    d.append(i, n, h); grid.appendChild(d);
  }
  document.getElementById('stickerCount').textContent = `${stickerCount()} / ${STICKERS.length}`;
}
