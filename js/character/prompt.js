// Turns the player's description ("blue robot with sunglasses") into character traits.
import { MOSS } from '../config.js';
import { hashStr, shade } from '../util.js';

export const COLORS = {
  red: '#d9483b', crimson: '#b8303a', scarlet: '#d9363b', orange: '#e8892e', amber: '#f4b23c', yellow: '#f2c94c',
  gold: '#e0b23a', golden: '#e0b23a', green: '#6fae5a', mossy: '#7fa86b', lime: '#9ccc4a', mint: '#8fd6b4',
  teal: '#3aa39a', cyan: '#4cc3d9', aqua: '#4cc3d9', blue: '#4a7fd4', navy: '#2c4a7a', sky: '#7cc0ea',
  purple: '#8a5cc2', violet: '#8a5cc2', lavender: '#b49ae0', pink: '#ee8fb4', magenta: '#c94ca0', rose: '#e07a92',
  white: '#f2f0ea', black: '#2c2c34', gray: '#8f969c', grey: '#8f969c', silver: '#b9c0c7', brown: '#8b5a2b',
  tan: '#c9a06b', cream: '#efe3c2', beige: '#e3d2ae', rainbow: 'rainbow', shadow: '#3a3550',
};
export const CREATURE_WORDS = {
  owl: 'owl', owlet: 'owl', bird: 'bird', birdie: 'bird', chick: 'bird', duck: 'bird', duckling: 'bird', sparrow: 'bird',
  parrot: 'bird', robin: 'bird', cat: 'cat', kitten: 'cat', kitty: 'cat', fox: 'fox', frog: 'frog', toad: 'frog',
  slime: 'slime', blob: 'slime', jelly: 'slime', robot: 'robot', bot: 'robot', droid: 'robot', android: 'robot',
  mech: 'robot', ghost: 'ghost', spirit: 'ghost', phantom: 'ghost', dragon: 'dragon', lizard: 'dragon', dino: 'dragon',
  dinosaur: 'dragon', bunny: 'bunny', rabbit: 'bunny', bear: 'bear', teddy: 'bear', panda: 'panda', penguin: 'penguin',
  mouse: 'mouse', rat: 'mouse', hamster: 'mouse',
};
export const CREATURES = {
  owl:     { body: MOSS.body, ears: 'tufts', eyes: 'owl', mouth: 'beak', wings: true, feet: 'talon', shape: 'owl', belly: true },
  bird:    { body: '#f2c94c', eyes: 'owl', mouth: 'beak', wings: true, feet: 'talon', shape: 'round', belly: true },
  cat:     { body: '#9a9ca3', ears: 'cat', eyes: 'cute', mouth: 'cat', tail: 'cat', feet: 'paw', shape: 'round', belly: true },
  fox:     { body: '#e07f36', bellyCol: '#f7efe2', ears: 'fox', eyes: 'cute', mouth: 'cat', tail: 'fox', feet: 'paw', shape: 'round', belly: true },
  frog:    { body: '#6fae5a', bellyCol: '#d8ecb8', ears: 'frog', eyes: 'cute', mouth: 'frog', feet: 'paw', shape: 'round', belly: true },
  slime:   { body: '#4fc0a8', eyes: 'cute', mouth: 'smile', shape: 'slime', shiny: true },
  robot:   { body: '#9aa4ad', ears: 'antenna', eyes: 'robot', mouth: 'grill', feet: 'block', shape: 'square', panel: true, iris: '#5fe3f0' },
  ghost:   { body: '#eef0f7', eyes: 'ghost', mouth: 'o', shape: 'ghost', alpha: 0.9 },
  dragon:  { body: '#c8483a', bellyCol: '#f2d39a', ears: 'horns', eyes: 'cute', mouth: 'dragon', wings: true, tail: 'dragon', feet: 'paw', shape: 'round', belly: true },
  bunny:   { body: '#f1ece4', ears: 'bunny', eyes: 'cute', mouth: 'cat', tail: 'puff', feet: 'paw', shape: 'round', belly: true },
  bear:    { body: '#8b5e3c', ears: 'bear', eyes: 'cute', mouth: 'cat', feet: 'paw', shape: 'round', belly: true },
  panda:   { body: '#f4f4f0', ears: 'bear', eyes: 'cute', mouth: 'cat', feet: 'paw', shape: 'round', panda: true, darkCol: '#2c2c34' },
  penguin: { body: '#2f3440', bellyCol: '#f4f4f0', eyes: 'cute', mouth: 'beak', wings: true, feet: 'talon', shape: 'round', belly: true },
  mouse:   { body: '#a9a4a0', ears: 'mouse', eyes: 'cute', mouth: 'cat', tail: 'cat', feet: 'paw', shape: 'round', belly: true },
};
export const HAT_WORDS = { hat: 'top', tophat: 'top', top: 'top', crown: 'crown', tiara: 'crown', king: 'crown', queen: 'crown',
  princess: 'crown', prince: 'crown', royal: 'crown', wizard: 'wizard', witch: 'wizard', mage: 'wizard', magician: 'wizard',
  cap: 'cap', baseball: 'cap', acorn: 'acorn', bow: 'bow', ribbon: 'bow', halo: 'halo', angel: 'halo', horns: 'horns',
  horned: 'horns', devil: 'horns', headphones: 'headphones', dj: 'headphones', beanie: 'beanie', toque: 'beanie' };
export const NECK_WORDS = { scarf: 'scarf', cape: 'cape', cloak: 'cape', hero: 'cape', superhero: 'cape', bowtie: 'bowtie', tuxedo: 'bowtie', fancy: 'bowtie' };
export const FACE_WORDS = { glasses: 'glasses', spectacles: 'glasses', nerd: 'glasses', nerdy: 'glasses', sunglasses: 'sunglasses',
  shades: 'sunglasses', cool: 'sunglasses', mask: 'mask', ninja: 'mask', masked: 'mask', bandit: 'mask', eyepatch: 'eyepatch',
  pirate: 'eyepatch' };
export const SLOT_WORDS = { hat: 'hat', tophat: 'hat', cap: 'hat', crown: 'hat', tiara: 'hat', beanie: 'hat', bow: 'hat', ribbon: 'hat',
  halo: 'hat', horns: 'hat', headphones: 'hat', scarf: 'neck', cape: 'neck', cloak: 'neck', bowtie: 'neck', tie: 'neck',
  glasses: 'face', sunglasses: 'face', shades: 'face', mask: 'face', eyes: 'iris', eye: 'iris', belly: 'belly',
  tummy: 'belly', wings: 'wing', wing: 'wing', ears: 'body', beak: 'beak', feet: 'feet', aura: 'glow', glow: 'glow' };

export const STOP_WORDS = new Set(['a', 'an', 'the', 'with', 'and', 'in', 'on', 'of', 'wearing', 'has', 'have', 'who', 'that', 'is', 'very', 'super',
  'little', 'cute', 'my', 'some', 'its', 'his', 'her', 'their', 'plus', 'like', 'eyes', 'eye', 'belly', 'tummy', 'wings', 'wing', 'ears', 'beak', 'feet',
  'tail', 'one', 'eyed', 'hat', 'top', 'tie', 'boots', 'aura', 'glow', 'dark', 'deep', 'light', 'pale', 'pastel', 'bright', 'neon', 'tall', 'long']);
export const MOD_WORDS = new Set(['spots', 'spotted', 'spotty', 'dotted', 'dots', 'polka', 'stripes', 'striped', 'stripy', 'tiger', 'tabby', 'speckled',
  'speckles', 'freckles', 'freckled', 'glowing', 'sparkly', 'sparkle', 'shiny', 'magic', 'magical', 'radiant', 'cosmic', 'tiny', 'small', 'mini',
  'baby', 'smol', 'big', 'huge', 'giant', 'large', 'chonky', 'chubby', 'fat', 'round', 'chunky', 'plump', 'fluffy', 'lanky', 'slim', 'skinny',
  'square', 'boxy', 'cube', 'cubic', 'blocky', 'angry', 'grumpy', 'fierce', 'evil', 'mad', 'sleepy', 'tired', 'lazy', 'chill', 'cyclops', 'spooky',
  'haunted', 'fire', 'flame', 'fiery', 'lava', 'ice', 'icy', 'frost', 'frozen', 'snow', 'fairy', 'winged', 'angel']);
export function parsePrompt(raw) {
  const text = (raw || '').toLowerCase().trim();
  const toks = text.replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
  const has = (...w) => w.some(x => toks.includes(x));
  const tags = [];
  let creature = null, creatureWord = null;
  for (const t of toks) if (CREATURE_WORDS[t]) { creature = CREATURE_WORDS[t]; creatureWord = t; break; }

  const preset = !text ? 'moss' : has('thornhood') ? 'thornhood' : has('fernando') ? 'fernando'
    : (has('moss') && !creature) ? 'moss' : null;
  const base = CREATURES[creature || 'owl'];
  const T = Object.assign({}, base, { creature: creature || 'owl', hat: null, neck: null, face: null, pattern: null,
    glow: null, size: 1, wide: 1, tall: 1, angry: false, sleepy: false, cyclops: false, extraWings: false });
  T.body = base.body;
  T.feetCol = MOSS.feet; T.beakCol = MOSS.beak; T.iris = base.iris || (base.eyes === 'owl' ? MOSS.iris : null);
  T.accent = MOSS.scarf;
  let name = null;

  if (preset) {
    Object.assign(T, CREATURES.owl, { creature: 'owl', body: MOSS.body, darkCol: MOSS.dark, bellyCol: MOSS.belly, ring: MOSS.ring,
      iris: MOSS.iris, hat: 'acorn', hatCol: MOSS.acorn, neck: 'scarf', neckCol: MOSS.scarf, pattern: 'speckle' });
    name = 'Moss';
    if (preset === 'fernando') { T.hat = 'top'; T.hatCol = MOSS.acorn; T.plume = true; T.tall = 1.06; name = 'Fernando'; T.wink = true; }
    if (preset === 'thornhood') { T.body = '#4f7a45'; T.darkCol = '#2f4f2c'; T.bellyCol = '#f1ead2'; T.ring = '#e9e2c8';
      T.iris = '#e8862e'; T.hat = 'hood'; T.neck = 'cape'; T.neckCol = '#2f4f2c'; T.tall = 1.1; T.pattern = 'chevron'; T.angry = true; name = 'Thornhood'; }
    tags.push(name === 'Moss' ? 'the original owlet' : name === 'Fernando' ? 'stage 2 · the dandy' : 'stage 3 · hooded');
  }

  // modifiers + colors
  let mod = 0, bodySet = false, accentSet = false;
  const colorFor = (w, m) => { const c = COLORS[w]; if (c === 'rainbow') return c; return m ? shade(c, m) : c; };
  const assigned = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === 'dark' || t === 'deep') { mod = -0.35; continue; }
    if (t === 'light' || t === 'pale' || t === 'pastel' || t === 'baby' && COLORS[toks[i + 1]]) { mod = 0.4; continue; }
    if (t === 'bright' || t === 'neon') { mod = 0.12; continue; }
    if (!COLORS[t] || (t === 'mossy' && preset)) { if (t !== 'and') mod = 0; continue; }
    const col = colorFor(t, mod); mod = 0;
    let slot = null;
    for (let j = i + 1; j < Math.min(toks.length, i + 4); j++) {
      if (COLORS[toks[j]] || CREATURE_WORDS[toks[j]]) break;
      if (SLOT_WORDS[toks[j]]) { slot = SLOT_WORDS[toks[j]]; break; }
    }
    if (slot === 'hat') T.hatCol = col;
    else if (slot === 'neck') T.neckCol = col;
    else if (slot === 'face') T.faceCol = col;
    else if (slot === 'iris') T.iris = col === 'rainbow' ? '#e0b23a' : col;
    else if (slot === 'belly') T.bellyCol = col === 'rainbow' ? '#ffffff' : col;
    else if (slot === 'wing') T.wingCol = col === 'rainbow' ? '#ee8fb4' : col;
    else if (slot === 'glow') T.glow = col === 'rainbow' ? '#ffd54f' : col;
    else if (slot === 'beak') T.beakCol = col;
    else if (slot === 'feet') T.feetCol = col;
    else if (!bodySet) { T.body = col; bodySet = true; T.darkCol = null; T.ring = null; if (preset) T.bellyCol = null; }
    else if (!accentSet) { T.accent = col === 'rainbow' ? '#ee8fb4' : col; accentSet = true; }
    assigned.push(t + (slot && slot !== 'body' ? ' ' + slot : ''));
  }

  // accessories
  for (const t of toks) {
    if (HAT_WORDS[t] && !(t === 'top' && !has('hat'))) T.hat = HAT_WORDS[t];
    if (NECK_WORDS[t]) T.neck = NECK_WORDS[t];
    if (FACE_WORDS[t]) T.face = FACE_WORDS[t];
  }
  if (has('bow') && has('tie')) { T.neck = 'bowtie'; if (T.hat === 'bow') T.hat = null; }
  if (has('angel', 'fairy', 'winged', 'wings') && !T.wings) { T.wings = true; T.extraWings = true; }
  if (has('angel')) T.wingCol = T.wingCol || '#ffffff';
  if (has('fairy')) { T.wingCol = T.wingCol || '#bfe6f5'; T.glow = T.glow || '#d6f3ff'; }
  if (has('spots', 'spotted', 'spotty', 'dotted', 'dots', 'polka')) T.pattern = 'spots';
  if (has('stripes', 'striped', 'stripy', 'tiger', 'tabby')) T.pattern = 'stripes';
  if (has('speckled', 'speckles', 'freckles', 'freckled')) T.pattern = 'speckle';
  if (has('glowing', 'glow', 'sparkly', 'sparkle', 'shiny', 'magic', 'magical', 'radiant', 'cosmic')) T.glow = T.glow || '#ffe58a';
  if (has('tiny', 'small', 'little', 'mini', 'baby', 'smol')) T.size = 0.86;
  if (has('big', 'huge', 'giant', 'large')) T.size = 1.12;
  if (has('chonky', 'chubby', 'fat', 'round', 'chunky', 'plump', 'fluffy')) T.wide = 1.12;
  if (has('tall', 'long', 'lanky', 'slim', 'skinny')) T.tall = 1.12;
  if (has('square', 'boxy', 'cube', 'cubic', 'blocky')) T.shape = 'square';
  if (has('angry', 'grumpy', 'fierce', 'evil', 'mad')) T.angry = true;
  if (has('sleepy', 'tired', 'lazy', 'chill')) T.sleepy = true;
  if (has('cyclops') || /one[\s-]eyed?/.test(text)) T.cyclops = true;
  if (has('spooky', 'haunted')) { T.glow = T.glow || '#b9a7ff'; }
  if (has('fire', 'flame', 'fiery', 'lava')) { if (!bodySet) T.body = '#e0583a'; T.glow = T.glow || '#ff9a3c'; }
  if (has('ice', 'icy', 'frost', 'frozen', 'snow')) { if (!bodySet) T.body = '#bfe3f2'; T.glow = T.glow || '#d8f4ff'; }

  // derived colours
  if (T.body === 'rainbow') T.rainbow = true;
  const b = T.rainbow ? '#e07ab0' : T.body;
  T.base = b;
  T.darkCol = T.darkCol || shade(b, b === '#2c2c34' || b === '#2f3440' ? 0.25 : -0.3);
  if (T.belly !== false && (T.belly || T.bellyCol)) T.bellyCol = T.bellyCol || shade(b, 0.72);
  T.ring = T.ring || shade(b, -0.5);
  T.hatCol = T.hatCol || (T.hat === 'crown' || T.hat === 'halo' ? '#f2c14e' : T.hat === 'acorn' ? MOSS.acorn : T.hat === 'wizard' ? '#5b4aa0' : T.hat === 'top' ? '#2c2c34' : T.accent);
  T.neckCol = T.neckCol || (T.neck === 'cape' ? '#c0392b' : T.accent);
  T.faceCol = T.faceCol || (T.face === 'mask' ? '#2c2c34' : T.face === 'glasses' ? '#3a2a1a' : '#1d1d24');
  T.wingCol = T.wingCol || T.darkCol;
  T.seed = hashStr(text || 'moss');

  // voice: pitch scales with size; some creatures change the waveform
  T.voice = { owl: 1, bird: 1.15, cat: 0.55, fox: 0.6, frog: 0.3, slime: 0.7, robot: 0.5, ghost: 0.35, dragon: 0.22,
    bunny: 1.05, bear: 0.35, panda: 0.38, penguin: 0.7, mouse: 1.3 }[T.creature] / T.size;

  // name + tags
  if (!name) {
    const firstColor = toks.find(t => COLORS[t]);
    const noun = creatureWord ? creatureWord : 'owlet';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    name = (firstColor ? cap(firstColor) + ' ' : '') + cap(noun);
    if (T.hat === 'crown' && !firstColor) name = 'King ' + cap(noun);
    if (T.hat === 'wizard' && !firstColor) name = cap(noun) + ' Wizard';
  }
  T.name = name;
  if (!preset && !creature) {
    // name the word we couldn't place, so the player knows why they got an owlet
    const known = w => COLORS[w] || HAT_WORDS[w] || NECK_WORDS[w] || FACE_WORDS[w] || SLOT_WORDS[w] || STOP_WORDS.has(w) || MOD_WORDS.has(w);
    const unknown = toks.filter(w => !known(w) && w.length > 2 && !/\d/.test(w));
    tags.push(unknown.length ? `"${unknown[0]}" unknown, so: owlet` : 'owlet (default)');
  } else if (!preset) tags.push(creature);
  for (const a of assigned) tags.push(a);
  for (const k of ['hat', 'neck', 'face', 'pattern']) if (T[k] && (!preset || k === 'face')) tags.push(T[k]);
  if (T.extraWings) tags.push('wings');
  if (T.glow) tags.push('glow');
  if (T.size < 1) tags.push('tiny'); if (T.size > 1) tags.push('big');
  if (T.wide > 1) tags.push('chonky'); if (T.tall > 1 && !preset) tags.push('tall');
  if (T.cyclops) tags.push('one eye'); if (T.angry && !preset) tags.push('fierce'); if (T.sleepy) tags.push('sleepy');
  T.tags = [...new Set(tags)];
  return T;
}
