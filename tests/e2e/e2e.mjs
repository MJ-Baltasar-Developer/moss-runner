// Browser tests: plays the real game in headless Chromium on a desktop, a phone (both ways up),
// a tablet, and offline. Usage: serve web/ (python3 -m http.server 8000 --directory web), then
//   node tests/e2e/e2e.mjs [http://localhost:8000/]
// Set CHROME to use a specific Chromium binary.
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8000/';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const failures = [];
let passed = 0;

async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(name); console.log(`  ✗ ${name}\n      ${e.message.split('\n')[0]}`); }
}

const PHONE = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const PHONE_UP = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 720 } };

/** Open the game; expose the engine (E), the synced state (G) and state.js (S) for the test. */
async function open(ctxOpts, query = '') {
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  await p.goto(URL + query);
  await p.waitForFunction(() => document.querySelector('#scoreList')?.children.length > 0);
  await p.evaluate(async () => {
    window.E = (await import('./js/engine.js')).engine;
    window.S = await import('./js/state.js'); window.G = S.G;
  });
  p.errors = errors;
  return p;
}
const g = (p, f, a) => p.evaluate(f, a);
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('Desktop');
await test('title screen, keyboard hints, no errors', async () => {
  const p = await open(DESKTOP);
  assert.equal(await g(p, () => document.documentElement.dataset.device), 'desktop');
  assert.ok(await p.isVisible('#title'));
  assert.ok(await p.isVisible('.controls.keys'));
  assert.ok(!(await p.isVisible('.touch-only')));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

await test('Easy mode: hearts, checkpoint, retry from the flag', async () => {
  const p = await open(DESKTOP);
  await p.keyboard.press('Enter'); await wait(300);
  assert.equal(await g(p, () => G.maxHearts), 3);
  await g(p, () => { E.debugSpawn('log', G.player.x - 10); S.afterEngine(); }); await wait(300);
  assert.equal(await g(p, () => [G.state, G.hearts].join()), 'play,2');
  await g(p, () => { E.debugSkipTo(300); S.afterEngine(); }); await wait(500);
  assert.ok(await g(p, () => G.checkpoint > 0), 'checkpoint reached');
  for (let i = 0; i < 2; i++) { await g(p, () => { E.debugInvincible(0); E.debugSpawn('log', G.player.x - 10); S.afterEngine(); }); await wait(400); }
  await wait(1300);
  assert.ok(await p.isVisible('#over'));
  assert.match(await p.textContent('#againBtn'), /from the flag/);
  await p.keyboard.press('Space'); await wait(300);
  // back at the flag (a few frames on from it by now)
  assert.equal(await g(p, () => [G.state, G.stage, G.hearts, G.dist >= G.checkpoint && G.dist < G.checkpoint + 600].join()), 'play,1,3,true');
  await p.context().close();
});

await test('levels, all four moves, packed particles', async () => {
  const p = await open(DESKTOP);
  await p.keyboard.press('Enter'); await wait(300);
  await g(p, () => { E.debugInvincible(60); for (let i = 0; i < 6; i++) { E.debugGainXp(17 + 5 * G.level); S.afterEngine(); } });
  assert.equal(await g(p, () => G.level), 7);
  for (const k of ['1', '2', '3', '4']) { await p.keyboard.press(k); await wait(150); }
  const s = await g(p, () => ({ dash: G.dash > 0 || G.player.x !== 170, shield: !!G.shield, storm: !!G.storm, buf: G.pbuf instanceof Float32Array, n: G.pbuf.length / G.pstride, pal: G.palette.length }));
  assert.ok(s.shield && s.storm && s.buf && s.n > 50 && s.pal > 3, JSON.stringify(s));
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

await test('Moss evolves into Fernando at level 8', async () => {
  const p = await open(DESKTOP);
  await p.fill('#prompt', 'moss'); await p.keyboard.press('Enter'); await wait(300);
  await g(p, () => { E.debugInvincible(60); for (let i = 0; i < 7; i++) { E.debugGainXp(17 + 5 * G.level); S.afterEngine(); } });
  assert.equal(await g(p, () => G.char.name), 'Fernando');
  await wait(2800);
  assert.match(await p.textContent('#toast'), /Dapper/);
  await p.context().close();
});

await test('reaching the nest awards a sticker', async () => {
  const p = await open(DESKTOP);
  await p.keyboard.press('Enter'); await wait(300);
  await g(p, () => { E.debugInvincible(60); E.debugSkipTo(10); S.afterEngine(); }); await wait(3200);
  assert.ok(await p.isVisible('#clear'));
  assert.ok(await g(p, () => !!JSON.parse(localStorage.getItem('mossRunner.stickers')).nest));
  await p.context().close();
});

await test('daily challenge: same course, best run becomes a ghost', async () => {
  const p = await open(DESKTOP);
  await p.click('#dailyBtn'); await wait(300);
  assert.equal(await g(p, () => [G.daily, G.stage].join()), 'true,3');
  await g(p, () => E.debugInvincible(3)); await wait(1500);
  for (let i = 0; i < 3; i++) { await g(p, () => { E.debugInvincible(0); E.debugSpawn('log', G.player.x - 10); S.afterEngine(); }); await wait(400); }
  await wait(1200);
  assert.ok(await p.isVisible('#over'));
  assert.ok(await g(p, () => JSON.parse(localStorage.getItem('mossRunner.daily')).inputs !== undefined));
  await p.keyboard.press('Space'); await wait(600);
  const ghost = await g(p, async () => (await import('./js/ui/daily.js')).ghostPose());
  assert.ok(ghost && ghost.dist > 0, 'ghost is running');
  await p.context().close();
});

await test('settings persist; the sticker book opens', async () => {
  const p = await open(DESKTOP);
  await p.click('#settingsBtn');
  await p.uncheck('#setEasy'); await p.check('#setContrast');
  await p.click('#settings [data-close]');
  await p.reload(); await p.waitForTimeout(500);
  const s = await g(p, () => JSON.parse(localStorage.getItem('mossRunner.settings')));
  assert.equal(s.easy, false); assert.equal(s.contrast, true);
  assert.equal(await p.isChecked('#easyToggle'), false);
  await p.click('#stickersBtn');
  assert.equal(await p.locator('.sticker').count(), 14);
  await p.context().close();
});

await test('worlds: snowy peaks and swamp, with their own obstacles', async () => {
  // which obstacles each world spawns is covered by the Rust tests; here: they draw and behave in the browser
  for (const [stage, biome, kinds] of [[7, 1, ['snowball', 'icicle']], [12, 2, ['croc', 'mushroom']]]) {
    const p = await open(DESKTOP, `?stage=${stage}`);
    await g(p, () => { window.__god = setInterval(() => E.debugInvincible(5), 50); });
    assert.equal(await g(p, () => G.biome), biome);
    await g(p, k => { k.forEach((t, i) => E.debugSpawn(t, 520 + i * 260)); S.afterEngine(); }, kinds);
    await wait(1500);
    if (stage === 7) assert.ok(await g(p, () => G.obstacles.some(o => o.type === 'icicle' && (o.falling || o.landed))), 'icicle dropped');
    assert.deepEqual(p.errors, []);
    await p.context().close();
  }
});

console.log('Phone (landscape)');
await test('compact title screen fits without scrolling', async () => {
  const p = await open(PHONE);
  assert.equal(await g(p, () => document.documentElement.dataset.device), 'phone');
  const box = await p.locator('.title-card').boundingBox();
  assert.ok(box.height <= 390, `title card is ${box.height}px tall`);
  assert.ok(await p.isVisible('.touch-only'));
  assert.ok(!(await p.isVisible('.controls.keys')));
  assert.ok(!(await p.isVisible('#rotate')));
  await p.context().close();
});

await test('tap to hop, big move buttons, pause button', async () => {
  const p = await open(PHONE);
  await p.tap('#startBtn'); await wait(300);
  const cv = await p.locator('#game').boundingBox();
  await p.touchscreen.tap(cv.x + cv.width * 0.5, cv.y + cv.height * 0.4); await wait(120);
  assert.ok(await g(p, () => !G.player.onGround || G.player.y < 352), 'hopped');
  const slot = await g(p, async () => (await import('./js/render/hud.js')).slotRect(0).w);
  assert.equal(slot, 72);
  await wait(800);
  const r = await g(p, async () => (await import('./js/render/hud.js')).pauseRect());
  await p.touchscreen.tap(cv.x + (r.x + r.w / 2) * cv.width / 960, cv.y + (r.y + r.h / 2) * cv.height / 420); await wait(150);
  assert.equal(await g(p, () => G.state), 'paused');
  assert.ok(await p.isVisible('#pause'));
  await p.context().close();
});

console.log('Phone (portrait)');
await test('asks to turn the phone sideways, or play anyway', async () => {
  const p = await open(PHONE_UP);
  assert.ok(await p.isVisible('#rotate'));
  await p.tap('#rotateAnyway');
  assert.ok(!(await p.isVisible('#rotate')));
  await p.context().close();
});

console.log('Tablet');
await test('tablet layout with touch-sized buttons', async () => {
  const p = await open(TABLET);
  assert.equal(await g(p, () => document.documentElement.dataset.device), 'tablet');
  assert.ok(await p.isVisible('.touch-only'));
  await p.tap('#startBtn'); await wait(200);
  assert.equal(await g(p, async () => (await import('./js/render/hud.js')).slotRect(0).w), 70);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

console.log('Installable app');
await test('manifest and icons are served', async () => {
  const p = await open(DESKTOP);
  const m = await g(p, async () => (await fetch('manifest.webmanifest')).json());
  assert.equal(m.name, 'Moss Run');
  for (const i of m.icons) assert.equal(await g(p, async src => (await fetch(src)).status, i.src), 200);
  await p.context().close();
});

await test('works offline once opened', async () => {
  const p = await open(DESKTOP, '?sw');
  await p.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated');
  // every file on the list must be publishable (GitHub Pages leaves out hidden files) and cached
  const list = await g(p, async () => { const t = await (await fetch('sw-files.js')).text(); return t.match(/'\.\/[^']*'/g).map(x => x.slice(1, -1)); });
  assert.ok(!list.some(f => /\/\./.test(f)), 'no hidden files: ' + list.filter(f => /\/\./.test(f)));
  const cached = await g(p, async () => { const k = (await caches.keys()).find(k => k.startsWith('moss-run-')); return (await (await caches.open(k)).keys()).length; });
  assert.equal(cached, list.length, 'everything cached for offline play');
  await p.reload(); await p.waitForTimeout(800); // now controlled by the service worker
  await p.context().setOffline(true);
  await p.reload();
  await p.waitForFunction(() => document.querySelector('#scoreList')?.children.length > 0, null, { timeout: 8000 });
  await p.keyboard.press('Enter'); await wait(500);
  assert.equal(await g(p, async () => (await import('./js/state.js')).G.state), 'play');
  await p.context().close();
});

console.log('Boss');
await test('Grimwing: moves damage him; later fights swoop high', async () => {
  const p = await open(DESKTOP, '?boss');
  await g(p, () => { window.__god = setInterval(() => E.debugInvincible(5), 50); });
  await wait(3500);
  const hp0 = await g(p, () => G.boss.hp);
  await p.keyboard.press('3'); await wait(1300);
  assert.equal(hp0 - await g(p, () => G.boss.hp), 3);
  await p.context().close();
  const q = await open(DESKTOP, '?stage=10');
  await g(q, () => { window.__god = setInterval(() => E.debugInvincible(5), 50); E.debugSkipTo(60); S.afterEngine(); });
  let high = false;
  for (let i = 0; i < 120 && !high; i++) { high = await g(q, () => !!(G.boss && G.boss.high)); await wait(250); }
  assert.ok(high, 'saw a high swoop');
  await q.context().close();
});

await browser.close();
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
