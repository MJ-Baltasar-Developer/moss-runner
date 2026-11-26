// Entry point: wires up the title screen and runs the game loop.
import { Sfx } from './audio/sfx.js';
import { nextStage, restartRun } from './state.js';
import { startLoop } from './loop.js';
import { initInput } from './ui/input.js';
import { $, pauseToggle, previewT, pv, startFromTitle, toTitle, updatePreview } from './ui/panels.js';
import { store } from './util.js';

const EXAMPLES = ['moss', 'fernando', 'thornhood', 'blue robot with sunglasses', 'pink cat with a gold crown', 'spooky ghost with a red scarf', 'orange fox wizard', 'tiny green frog with glasses', 'purple dragon with a black cape', 'chonky panda in headphones', 'rainbow slime with a halo'];
for (const ex of EXAMPLES) {
  const b = document.createElement('button'); b.className = 'ex'; b.textContent = ex;
  b.addEventListener('click', () => { $('prompt').value = ex; updatePreview(); Sfx.init(); Sfx.cry(previewT); $('prompt').focus(); });
  $('examples').appendChild(b);
}
$('prompt').addEventListener('input', updatePreview);
$('prompt').value = store.get('mossRunner.prompt', 'moss');
$('startBtn').addEventListener('click', startFromTitle);
$('againBtn').addEventListener('click', () => restartRun());
$('practiceBtn').addEventListener('click', () => startFromTitle(true));
$('editBtn').addEventListener('click', toTitle);
$('nextBtn').addEventListener('click', nextStage);
$('resumeBtn').addEventListener('click', pauseToggle);
pv.addEventListener('click', () => { Sfx.init(); Sfx.cry(previewT); });

initInput();
toTitle();
if (/[?&]boss\b/.test(location.search)) startFromTitle(true);
startLoop();
