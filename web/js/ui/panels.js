// The title, game-over, stage-cleared and pause panels, and the title preview.
import { Sfx } from '../audio/sfx.js';
import { drawCritter } from '../character/sprite.js';
import { DAY, PX_PER_M } from '../config.js';
import { CFG, engine, parsePrompt } from '../engine.js';
import { G, afterEngine, newRun, startPractice } from '../state.js';
import { resetClock } from '../loop.js';
import { bestScore, renderScores } from './scores.js';
import { ell, pick, store } from '../util.js';

export const $ = id => document.getElementById(id);
export function showPanel(id) { for (const p of ['title', 'over', 'clear', 'pause']) $(p).classList.toggle('hidden', p !== id); }
export function statsHTML(el, rows) {
  el.innerHTML = '';
  for (const [k, v] of rows) { const a = document.createElement('span'); a.textContent = k; const b = document.createElement('span'); b.textContent = v; el.append(a, b); }
}
export function showOver() {
  $('overTitle').textContent = G.practice ? (G.boss ? `${CFG.bossName} won this round!` : 'Practice over') : pick([`${G.char.name} took a tumble!`, 'Bonk!', 'So close to home...', 'Ouch! Feathers everywhere.']);
  $('overBest').classList.toggle('hidden', !G.lastWasBest);
  const left = Math.max(0, Math.round((G.stageLen - G.dist) / PX_PER_M));
  statsHTML($('overStats'), [['Score', Math.floor(G.score)], ['Stage', `${G.stage} (${left} m from the nest)`], ['Level', G.level], ['Orbs', G.orbCount], ['Smashed', G.smashed], ['Best', bestScore()]]);
  showPanel('over');
}
export function showClear() {
  $('clearTitle').textContent = G.stage === 1 ? 'Home sweet nest!' : pick(['Home sweet nest!', 'Made it home!', 'Nest reached!']);
  statsHTML($('clearStats'), [['Stage cleared', G.stage], ['Score', Math.floor(G.score)], ['Level', G.level], ['Orbs', G.orbCount], ['Next', `Stage ${G.stage + 1} · ${DAY[G.stage % DAY.length].name}`], ['Distance', `${500 + 100 * (G.stage + 1)} m`]]);
  showPanel('clear');
}
export function toTitle() {
  engine.toTitle(); afterEngine(); showPanel('title'); renderScores(); updatePreview();
  setTimeout(() => { $('prompt').focus(); $('prompt').select(); }, 30);
}
export function startFromTitle(practice) {
  Sfx.init();
  G.char = engine.setCharacter($('prompt').value);
  store.set('mossRunner.prompt', $('prompt').value);
  $('prompt').blur();
  if (practice === true) startPractice(); else newRun();
  Sfx.cry(G.char);
}
export function pauseToggle() {
  const was = G.state;
  engine.togglePause(); afterEngine();
  if (G.state === 'paused') showPanel('pause');
  else if (was === 'paused') { showPanel(null); resetClock(); }
}

// title preview
export const pv = $('preview'), pc = pv.getContext('2d');
export let previewT = null;
export function updatePreview() {
  previewT = parsePrompt($('prompt').value);
  $('pname').textContent = previewT.name;
  const chips = $('chips'); chips.innerHTML = '';
  for (const t of previewT.tags) { const s = document.createElement('span'); s.className = 'chip'; s.textContent = t; chips.appendChild(s); }
}
export function drawPreview(t) {
  if (G.state !== 'title' || !previewT) return;
  pc.setTransform(pv.width / 220, 0, 0, pv.width / 220, 0, 0);
  pc.clearRect(0, 0, 220, 220);
  pc.fillStyle = 'rgba(0,0,0,0.25)'; ell(pc, 110, 188, 46, 8); pc.fill();
  const runCycle = Math.floor(t / 3) % 2 === 1;
  const ph = t * 12;
  pc.save(); pc.translate(110, 186 - (runCycle ? Math.abs(Math.sin(ph)) * 4 : 0)); pc.scale(1.25, 1.25);
  drawCritter(pc, previewT, { t, wing: runCycle ? 10 + Math.sin(ph * 2) * 6 : 8 + Math.max(0, Math.sin(t * 2)) * 4, mood: (t % 6) > 5.2 ? 'cheer' : 'idle', eyes: (t % 3.7) < 0.12 ? 'blink' : 'open', run: runCycle ? ph : null, look: Math.sin(t * 0.8) > 0.7 ? 3 : Math.sin(t * 0.8) < -0.7 ? -3 : 0 });
  pc.restore();
}
