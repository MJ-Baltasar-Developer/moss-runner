// Entry point: wires up the title screen, settings, sticker book and app install, then starts the loop.
import { Sfx } from './audio/sfx.js';
import { Music } from './audio/music.js';
import { device, isIOS } from './device.js';
import { engine } from './engine.js';
import { saveSettings, settings } from './settings.js';
import { afterEngine, nextStage, restartRun } from './state.js';
import { startLoop } from './loop.js';
import { initInput } from './ui/input.js';
import { $, pauseToggle, previewT, pv, showPanel, startFromTitle, toTitle, updatePreview } from './ui/panels.js';
import { renderStickers, stickerCount, STICKERS } from './ui/stickers.js';
import { store } from './util.js';

// ---- title screen ----
const EXAMPLES = ['moss', 'fernando', 'thornhood', 'blue robot with sunglasses', 'pink cat with a gold crown', 'spooky ghost with a red scarf', 'orange fox wizard', 'tiny green frog with glasses', 'purple dragon with a black cape', 'chonky panda in headphones', 'rainbow slime with a halo'];
for (const ex of EXAMPLES) {
  const b = document.createElement('button'); b.className = 'ex'; b.textContent = ex;
  b.addEventListener('click', () => { $('prompt').value = ex; updatePreview(); Sfx.init(); Sfx.cry(previewT); if (!device.touch) $('prompt').focus(); });
  $('examples').appendChild(b);
}
$('prompt').addEventListener('input', updatePreview);
$('prompt').value = store.get('mossRunner.prompt', 'moss');
$('startBtn').addEventListener('click', () => startFromTitle());
$('dailyBtn').addEventListener('click', () => startFromTitle('daily'));
$('practiceBtn').addEventListener('click', () => startFromTitle('practice'));
$('againBtn').addEventListener('click', () => restartRun());
$('editBtn').addEventListener('click', toTitle);
$('nextBtn').addEventListener('click', nextStage);
$('clearTitleBtn').addEventListener('click', toTitle);
$('resumeBtn').addEventListener('click', pauseToggle);
$('quitBtn').addEventListener('click', toTitle);
pv.addEventListener('click', () => { Sfx.init(); Sfx.cry(previewT); });

// ---- settings ----
function applySettings() {
  Sfx.setVolume(settings.sound);
  Music.setVolume(settings.music);
  engine.setEasy(settings.easy);
  $('easyToggle').checked = $('setEasy').checked = settings.easy;
}
const bind = (id, key, prop = 'checked') => {
  const el = $(id); el[prop] = settings[key];
  el.addEventListener('input', () => { settings[key] = prop === 'checked' ? el.checked : Number(el.value); saveSettings(); applySettings(); });
};
bind('setEasy', 'easy'); bind('easyToggle', 'easy');
bind('setMusic', 'music', 'value'); bind('setSound', 'sound', 'value');
bind('setMotion', 'reducedMotion'); bind('setContrast', 'contrast'); bind('setTutorial', 'tutorial');
applySettings();
$('iosHint').classList.toggle('hidden', !(isIOS && !device.app));

// ---- settings and sticker book open over the title ----
const openModal = id => { Sfx.init(); if (id === 'stickers') renderStickers(); $(id).classList.remove('hidden'); };
const closeModals = () => { for (const m of document.querySelectorAll('.modal')) m.classList.add('hidden'); updateBadge(); };
$('settingsBtn').addEventListener('click', () => openModal('settings'));
$('stickersBtn').addEventListener('click', () => openModal('stickers'));
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeModals);
const updateBadge = () => { $('stickerBadge').textContent = `${stickerCount()}/${STICKERS.length}`; };
updateBadge();

// ---- phones: full screen, rotate hint ----
const canFull = document.fullscreenEnabled && device.touch && !device.app;
$('fullBtn').classList.toggle('hidden', !canFull);
$('fullBtn').addEventListener('click', async () => {
  try {
    await document.documentElement.requestFullscreen();
    await screen.orientation?.lock?.('landscape');
  } catch (e) { /* not every browser allows it */ }
});
$('rotateAnyway').addEventListener('click', () => document.documentElement.classList.add('rotate-ok'));

// ---- installable app (PWA) ----
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('installBtn').classList.remove('hidden'); });
$('installBtn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => null);
  installPrompt = null; $('installBtn').classList.add('hidden');
});
window.addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));
// offline support. Skipped on localhost so edits show up straight away (add ?sw to test it there).
const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
if ('serviceWorker' in navigator && (!local || /[?&]sw\b/.test(location.search))) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline play just won't be available */ });
}

// ---- go ----
initInput();
toTitle();
const q = location.search;
if (/[?&]boss\b/.test(q)) startFromTitle('practice');
else if (/[?&]daily\b/.test(q)) startFromTitle('daily');
else if (/[?&]stage=(\d+)/.test(q)) { startFromTitle(); engine.startAtStage(Number(q.match(/[?&]stage=(\d+)/)[1])); afterEngine(); showPanel(null); }
startLoop();

