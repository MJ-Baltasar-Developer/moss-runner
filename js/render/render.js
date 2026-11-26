// Draws one frame.
import { GROUND, H, W } from '../config.js';
import { drawBoss, drawHazards } from '../game/boss.js';
import { G, K, cx } from '../game/state.js';
import { drawHUD } from './hud.js';
import { NEST_STUMP_H, drawBackground, drawNest, drawObstacle, drawOrb, drawParts, drawPlayer, drawSeeds, drawShouts } from './scene.js';
import { rand } from '../util.js';

export function render() {
  const c = cx;
  c.setTransform(K, 0, 0, K, 0, 0);
  c.save();
  if (G.shake > 0) c.translate(rand(-G.shake, G.shake) * 0.6, rand(-G.shake, G.shake) * 0.6);
  drawBackground(c);
  if (G.state !== 'title') {
    drawNest(c, false);
    for (const o of G.orbs) drawOrb(c, o);
    for (const o of G.obstacles) drawObstacle(c, o);
    drawBoss(c);
    drawHazards(c);
    drawParts(c, false);
    drawSeeds(c);
    drawPlayer(c);
    drawNest(c, true);
    if ((G.state === 'arrive' && G.arrive && G.arrive.done) || G.state === 'cleared') {
      // he sits in the nest: redraw his top half above the bowl
      const P = G.player; const top = GROUND - NEST_STUMP_H;
      c.save(); c.beginPath(); c.rect(P.x - 80, 0, 160, top - 4); c.clip(); drawPlayer(c); c.restore();
    }
    if (G.storm) { const g = c.createLinearGradient(G.storm.x - 160, 0, G.storm.x + 20, 0); g.addColorStop(0, 'rgba(156,204,74,0)'); g.addColorStop(1, 'rgba(156,204,74,0.28)'); c.fillStyle = g; c.fillRect(G.storm.x - 160, 0, 180, GROUND); }
    drawParts(c, true);
    drawShouts(c);
  } else {
    // title backdrop: a calm scrolling forest
    G.scroll += 0.6;
  }
  c.restore();
  if (G.state !== 'title') drawHUD(c);
  if (G.state === 'dying' || G.state === 'dead') { c.fillStyle = `rgba(40,10,10,${Math.min(0.25, G.deadT * 0.4)})`; c.fillRect(0, 0, W, H); }
}
