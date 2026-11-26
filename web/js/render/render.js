// Draws one frame.
import { GROUND, H, W } from '../config.js';
import { drawBoss, drawHazards } from './boss.js';
import { G, K, cx } from '../state.js';
import { drawHUD } from './hud.js';
import { NEST_STUMP_H, drawBackground, drawCheckpoint, drawGhost, drawNest, drawObstacle, drawOrb, drawParts, drawPlayer, drawSeeds, drawShouts } from './scene.js';
import { rand } from '../util.js';
import { settings } from '../settings.js';
import { ghostPose } from '../ui/daily.js';

let titleScroll = 0; // the title backdrop scrolls on its own; the engine is idle there

export function render() {
  const c = cx;
  if (G.state === 'title') G.scroll = (titleScroll += 0.6);
  c.setTransform(K, 0, 0, K, 0, 0);
  c.save();
  if (G.shake > 0 && !settings.reducedMotion) c.translate(rand(-G.shake, G.shake) * 0.6, rand(-G.shake, G.shake) * 0.6);
  drawBackground(c);
  if (G.state !== 'title') {
    drawNest(c, false);
    drawCheckpoint(c);
    for (const o of G.orbs) drawOrb(c, o);
    for (const o of G.obstacles) drawObstacle(c, o);
    drawBoss(c);
    drawHazards(c);
    drawParts(c, false);
    drawSeeds(c);
    drawGhost(c, ghostPose());
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
  }
  c.restore();
  if (G.state !== 'title') drawHUD(c);
  if (G.state === 'dying' || G.state === 'dead') { c.fillStyle = `rgba(40,10,10,${Math.min(0.25, G.deadT * 0.4)})`; c.fillRect(0, 0, W, H); }
}
