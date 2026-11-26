// The title, game-over, stage-cleared and pause panels, and the title preview.
import { Sfx } from '../audio/sfx.js';
import { drawCritter } from '../character/sprite.js';
import { DAY, PX_PER_M, WORLDS } from '../config.js';
import { CFG, engine, parsePrompt } from '../engine.js';
import { G, afterEngine, newRun, startDaily, startPractice } from '../state.js';
import { dailyBest, dailySeed, stopGhost } from './daily.js';
import { device } from '../device.js';
import { settings } from '../settings.js';
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
  if (G.daily) {
    const r = G.dailyResult || { best: Math.floor(G.score) };
    $('overTitle').textContent = 'Daily challenge';
    $('overBest').textContent = r.improved ? 'New best today!' : ''; $('overBest').classList.toggle('hidden', !r.improved);
    const left = Math.max(0, Math.round((G.stageLen - G.dist) / PX_PER_M));
    statsHTML($('overStats'), [['Score', Math.floor(G.score)], ['Distance left', `${left} m`], ['Orbs', G.orbCount], ['Today\'s best', r.best]]);
    $('againBtn').firstChild.textContent = 'Try again ';
    showPanel('over');
    return;
  }
  $('overBest').textContent = 'New best!';
  $('againBtn').firstChild.textContent = G.easy && !G.practice ? (G.checkpoint > 0 ? 'Try again from the flag ' : 'Try this stage again ') : 'Run again ';
  $('overTitle').textContent = G.practice ? (G.boss ? `${CFG.bossName} won this round!` : 'Practice over') : pick([`${G.char.name} took a tumble!`, 'Bonk!', 'So close to home...', 'Ouch! Feathers everywhere.']);
  $('overBest').classList.toggle('hidden', !G.lastWasBest);
  const left = Math.max(0, Math.round((G.stageLen - G.dist) / PX_PER_M));
  statsHTML($('overStats'), [['Score', Math.floor(G.score)], ['Stage', `${G.stage} (${left} m from the nest)`], ['Level', G.level], ['Orbs', G.orbCount], ['Smashed', G.smashed], ['Best', bestScore()]]);
  showPanel('over');
}
export function showClear() {
  const daily = G.daily;
  $('nextBtn').firstChild.textContent = daily ? 'Race again ' : 'Next stage ';
  $('clearTitleBtn').classList.toggle('hidden', !daily);
  $('clearHint').textContent = daily ? 'Your best run today becomes a ghost to race.' : 'Each stage is longer and faster. Your level and moves carry over.';
  $('clearBest').classList.add('hidden');
  if (daily) {
    const r = G.dailyResult || { best: Math.floor(G.score) };
    $('clearTitle').textContent = 'Daily challenge done!';
    $('clearBest').classList.toggle('hidden', !r.improved);
    statsHTML($('clearStats'), [['Score', Math.floor(G.score)], ['Orbs', G.orbCount], ['Smashed', G.smashed], ['Today\'s best', r.best]]);
    showPanel('clear');
    return;
  }
  $('clearTitle').textContent = G.stage === 1 ? 'Home sweet nest!' : pick(['Home sweet nest!', 'Made it home!', 'Nest reached!']);
  statsHTML($('clearStats'), [['Stage cleared', G.stage], ['Score', Math.floor(G.score)], ['Level', G.level], ['Orbs', G.orbCount], ['Next', `Stage ${G.stage + 1} · ${Math.floor(G.stage / 5) % 3 ? WORLDS[Math.floor(G.stage / 5) % 3] : DAY[G.stage % DAY.length].name}`], ['Distance', `${500 + 100 * (G.stage + 1)} m`]]);
  showPanel('clear');
}
export function toTitle() {
  engine.toTitle(); afterEngine(); stopGhost(); showPanel('title'); renderScores(); updatePreview();
  const best = dailyBest();
  $('dailyBtn').textContent = best ? `📅 Daily · best ${best.score}` : '📅 Daily challenge';
  // on touch screens, focusing the text box would pop up the keyboard
  if (!device.touch) setTimeout(() => { $('prompt').focus(); $('prompt').select(); }, 30);
}
/** Start a run from the title screen: mode is 'practice', 'daily', or anything else for a normal run. */
export function startFromTitle(mode) {
  Sfx.init();
  G.char = engine.setCharacter($('prompt').value);
  store.set('mossRunner.prompt', $('prompt').value);
  $('prompt').blur();
  engine.setEasy(settings.easy);
  if (mode === 'practice') startPractice(); else if (mode === 'daily') startDaily(dailySeed()); else newRun();
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
