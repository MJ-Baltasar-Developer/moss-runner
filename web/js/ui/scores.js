// Best runs, saved in localStorage.
import { G } from '../state.js';
import { store } from '../util.js';

export function scores() { const s = store.get('mossRunner.scores', []); return Array.isArray(s) ? s : []; }
export function bestScore() { const s = scores(); return s.length ? s[0].score : 0; }
export function saveRun() {
  if (G.practice) { G.lastWasBest = false; return; }
  const list = scores();
  const entry = { score: Math.floor(G.score), stage: G.stage, level: G.level, name: G.char.name, date: new Date().toISOString().slice(0, 10) };
  G.lastWasBest = !list.length || entry.score > list[0].score;
  list.push(entry); list.sort((a, b) => b.score - a.score);
  store.set('mossRunner.scores', list.slice(0, 5));
  G.lastEntry = entry;
}
export function renderScores() {
  const ol = document.getElementById('scoreList'); ol.innerHTML = '';
  const s = scores();
  if (!s.length) { const li = document.createElement('li'); li.textContent = 'No runs yet. Be the first to reach the nest!'; li.style.listStyle = 'none'; li.style.marginLeft = '-22px'; ol.appendChild(li); return; }
  for (const e of s) {
    const li = document.createElement('li');
    const b = document.createElement('b'); b.textContent = e.score;
    li.append(b, ` · ${e.name} · stage ${e.stage} · Lv ${e.level}`);
    ol.appendChild(li);
  }
}
