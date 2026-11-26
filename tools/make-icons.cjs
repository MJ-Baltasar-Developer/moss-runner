// Draws the app icons with the game's own sprite code (no image files needed) and saves them in web/icons.
// Usage: serve the web folder on port 8000, then:  node tools/make-icons.cjs
// Needs Playwright (npm i playwright, or set PLAYWRIGHT to its path and CHROME to a Chromium binary).
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const URL = process.env.URL || 'http://localhost:8000/';
const OUT = path.join(__dirname, '..', 'web', 'icons');

(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage();
  await p.goto(URL); await p.waitForTimeout(800);
  const icons = await p.evaluate(async () => {
    const { drawCritter } = await import('./js/character/sprite.js');
    const { parsePrompt } = await import('./js/engine.js');
    const T = parsePrompt('moss');
    const draw = (size, maskable) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = size;
      const c = cv.getContext('2d'), k = size / 512;
      c.scale(k, k);
      // leafy green background with a soft glow; maskable icons keep Moss inside the safe circle
      const g = c.createRadialGradient(256, 230, 40, 256, 256, 360);
      g.addColorStop(0, '#4f7f45'); g.addColorStop(1, '#1f2a1f');
      c.fillStyle = g;
      if (maskable) c.fillRect(0, 0, 512, 512);
      else { c.beginPath(); c.roundRect(0, 0, 512, 512, 110); c.fill(); }
      c.fillStyle = '#8b5a2b'; c.beginPath(); c.ellipse(256, 420, 150, 34, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c2915a'; c.beginPath(); c.ellipse(256, 410, 132, 22, 0, 0, Math.PI * 2); c.fill();
      const s = maskable ? 2.6 : 3.2;
      c.translate(256, maskable ? 410 : 418); c.scale(s, s);
      drawCritter(c, T, { t: 0.4, wing: 14, mood: 'cheer', eyes: 'open' });
      return cv.toDataURL('image/png');
    };
    return { 'icon-192.png': draw(192), 'icon-512.png': draw(512), 'maskable-512.png': draw(512, true), 'apple-touch-icon.png': draw(180, true), 'favicon-32.png': draw(32) };
  });
  for (const [name, url] of Object.entries(icons)) fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', Object.keys(icons).join(', '));
  await b.close();
})();
