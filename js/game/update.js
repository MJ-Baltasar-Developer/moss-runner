// Per-frame game logic: physics, collisions, reaching the nest, dying.
import { Sfx } from '../audio/sfx.js';
import { COYOTE, GLIDE_VMAX, GRAV, GROUND, JUMP_V, PX_PER_M, XP } from '../config.js';
import { BOSS_AT, isBossStage, startBoss, updateBoss, updateHazards } from './boss.js';
import { addShake, burst, floatText, gainXP, hitstop, shout, smash } from './effects.js';
import { updateMoves } from './moves.js';
import { spawnObstacle } from './spawn.js';
import { G, stageSpeed } from './state.js';
import { NEST_SEAT, nestScreenX } from '../render/scene.js';
import { showClear, showOver } from '../ui/panels.js';
import { saveRun } from '../ui/scores.js';
import { lerp, pick, rand } from '../util.js';

export function snapPose() { return { wing: G.player.wingAng || 8, run: G.player.runPh }; }

export function update(dt) {
  G.t += dt;
  const P = G.player;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  for (const s of G.shouts) s.t += dt; G.shouts = G.shouts.filter(s => s.t < s.dur);
  if (G.levelCheer > 0) G.levelCheer -= dt;
  G.orbStreakT -= dt; if (G.orbStreakT <= 0) G.orbStreak = 0;

  if (G.state === 'play') {
    const prog = G.dist / G.stageLen;
    const target = stageSpeed(G.stage) * (1 + 0.18 * prog) * (G.dash > 0 ? 1.9 : 1);
    G.speed += (target - G.speed) * Math.min(1, dt * (G.dash > 0 ? 10 : 2.5));
  } else if (G.state === 'arrive' || G.state === 'dying') {
    G.speed *= Math.exp(-3.2 * dt);
  } else G.speed = 0;
  const move = G.speed * dt;
  if (!G.boss) G.dist += move; // the nest stays out of reach until the boss is beaten
  G.scroll += move;

  if (G.state === 'play') {
    // ---- player physics ----
    P.buffer -= dt; P.coyote -= dt;
    if (P.buffer > 0 && (P.onGround || P.coyote > 0) && G.dash <= 0) {
      P.vy = JUMP_V; P.onGround = false; P.coyote = 0; P.buffer = 0; P.squash = -0.12; Sfx.jump();
      burst(P.x, GROUND, 6, { color: ['#c9a96b', '#e3d2ae'], angle: Math.PI, spread: 0.6, min: 40, max: 140, g: 200, smin: 2, smax: 4 });
    }
    if (G.dash > 0) { P.vy = 0; }
    else {
      P.gliding = !P.onGround && G.held && P.vy > 0;
      P.vy += GRAV * (P.gliding ? 0.3 : 1) * dt;
      if (P.gliding && P.vy > GLIDE_VMAX) P.vy = lerp(P.vy, GLIDE_VMAX, Math.min(1, dt * 14));
    }
    P.y += P.vy * dt;
    if (P.y < 60) { P.y = 60; P.vy = Math.max(P.vy, 0); }
    if (P.y >= GROUND) {
      if (!P.onGround) { P.squash = 0.18; Sfx.land(); burst(P.x, GROUND, 5, { color: ['#c9a96b', '#e3d2ae'], angle: -Math.PI / 2, spread: 1.2, min: 30, max: 110, g: 300, smin: 2, smax: 4 }); }
      P.y = GROUND; P.vy = 0; P.onGround = true;
    } else if (P.onGround) { P.onGround = false; P.coyote = COYOTE; }
    if (P.onGround) {
      P.runPh += dt * G.speed / 26;
      if (Math.random() < dt * 6) G.parts.push({ x: P.x - 8, y: GROUND - 2, vx: -40, vy: -rand(20, 60), life: 0.4, max: 0.4, size: rand(2, 3.5), color: '#d9c7a3', g: 100, kind: 'dot', scroll: true, rot: 0, vr: 0 });
    }
    P.squash *= Math.exp(-12 * dt);

    // ---- spawning ----
    G.nextSpawn -= move;
    const remaining = G.stageLen - G.dist;
    const bossAhead = isBossStage(G.stage) && !G.bossDone;
    const quiet = bossAhead && remaining < BOSS_AT + 1000; // clear the field before he arrives
    if (G.nextSpawn <= 0 && remaining > 1150 && !quiet) spawnObstacle();
    if (bossAhead && !G.boss && remaining <= BOSS_AT) startBoss();

    // ---- arrival at the nest ----
    if (remaining <= 230 && !G.boss) {
      G.state = 'arrive';
      G.arrive = { t: 0, x0: P.x, y0: P.y, done: false };
      G.dash = 0; G.shield = null; G.seeds = []; G.storm = null;
      shout('Home!');
    }
  }

  // ---- world objects ----
  const worldDx = move;
  for (const o of G.obstacles) {
    o.x -= worldDx + (o.d.vx && G.state === 'play' ? o.d.vx * dt : 0);
    o.t += dt;
  }
  G.obstacles = G.obstacles.filter(o => o.x + o.w > -60 && !o.dead);
  for (const orb of G.orbs) { orb.x -= worldDx; orb.ph += dt * 5; }

  if (G.state === 'play') {
    const hb = { x: P.x - 14, y: P.y - 46, w: 28, h: 42 };
    // orbs
    for (const orb of G.orbs) {
      if (orb.taken) continue;
      const dx = P.x - orb.x, dy = (P.y - 26) - orb.y, d2 = dx * dx + dy * dy;
      if (orb.pull || d2 < 75 * 75) { const k = Math.min(1, dt * (orb.pull ? 6 : 9)); orb.x += dx * k; orb.y += dy * k; }
      if (d2 < 26 * 26) {
        orb.taken = true; G.orbCount++; G.orbStreak++; G.orbStreakT = 0.6;
        G.score += orb.gold ? 50 : 10;
        burst(orb.x, orb.y, orb.gold ? 14 : 7, { color: orb.gold ? ['#ffd54f', '#fff2c0'] : ['#cdeac0', '#9ccc4a', '#ffffff'], g: 0, min: 40, max: 160, kind: 'spark', life: 0.6 });
        if (orb.gold) Sfx.gold(); else Sfx.orb(G.orbStreak);
        gainXP(orb.gold ? XP.gold : XP.orb);
      }
    }
    // obstacles
    for (const o of G.obstacles) {
      if (o.dead) continue;
      const [t, r, b, l] = o.d.hb;
      const ox = o.x + l, oy = o.y + t, ow = o.w - l - r, oh = o.h - t - b;
      if (hb.x < ox + ow && hb.x + hb.w > ox && hb.y < oy + oh && hb.y + hb.h > oy) {
        if (G.dash > 0) smash(o, 'dash');
        else if (G.inv > 0) continue;
        else if (G.shield) {
          smash(o, 'shield'); G.shield = null; G.inv = 1.0; Sfx.shieldBreak();
          burst(P.x, P.y - 26, 22, { color: [G.char.base, G.char.darkCol, '#ffffff'], g: 200, min: 120, max: 300, kind: 'feather' });
          floatText(P.x, P.y - 70, 'Decoy took it!', '#ffd54f', 15);
        } else { die(o); break; }
      }
    }
    if (G.state === 'play') G.score += move / PX_PER_M; // 1 point per metre (not after the fatal hit)
  }
  G.orbs = G.orbs.filter(o => !o.taken && o.x > -40);

  if (G.boss) updateBoss(dt, G.state === 'play');
  if (G.hazards.length) updateHazards(dt, G.state === 'play');

  if (G.state === 'play') updateMoves(dt);

  if (G.state === 'arrive') {
    const A = G.arrive; A.t += dt;
    const nestX = nestScreenX(), seatY = NEST_SEAT;
    const p = Math.min(1, A.t / 0.8), e = 1 - Math.pow(1 - p, 2);
    if (!A.done) {
      P.x = lerp(A.x0, nestX, e); P.y = lerp(A.y0, seatY, p) - Math.sin(Math.PI * p) * 110;
      P.onGround = false;
      if (p >= 1) {
        A.done = true; A.doneT = 0; P.y = seatY; P.squash = 0.2;
        G.score += 250 * G.stage; Sfx.nest(G.char);
        floatText(nestX, seatY - 80, `+${250 * G.stage} home bonus`, '#ffd54f', 18);
        burst(nestX, seatY - 30, 40, { color: ['#6aa35e', '#9ccc4a', '#ffd54f', '#f48fb1', '#e0603a'], kind: 'leaf', min: 120, max: 420, g: 400 });
        addShake(5); hitstop(0.08);
        gainXP(XP.nest, nestX, seatY - 100);
      }
    } else {
      P.x = nestX; P.y = seatY;
      A.doneT += dt;
      if (A.doneT > 1.6 && G.state === 'arrive') { G.state = 'cleared'; showClear(); }
    }
    P.squash *= Math.exp(-10 * dt);
  }

  if (G.state === 'dying') {
    G.deadT += dt;
    P.vy += GRAV * 0.8 * dt; P.y += P.vy * dt; P.x -= 60 * dt; P.rot += dt * 9;
    if (G.deadT > 0.85) { G.state = 'dead'; showOver(); }
  } else if (G.state === 'dead') G.deadT += dt;

  // particles
  for (const p of G.parts) {
    p.life -= dt;
    p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; }
    p.x += p.vx * dt - (p.scroll ? worldDx : 0); p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
    if (p.kind === 'chip' || p.kind === 'feather') { if (p.y > GROUND + 4 && p.vy > 0) { p.y = GROUND + 4; p.vy *= -0.3; p.vx *= 0.6; } if (p.kind === 'feather') { p.vy = Math.min(p.vy, 90); p.vx *= 1 - 2 * dt; } }
  }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  G.shake = Math.max(0, G.shake - dt * 30);
}

export function die(o) {
  const P = G.player;
  G.state = 'dying'; G.deadT = 0; P.vy = -560; P.rot = 0; G.charge = null;
  hitstop(0.16); addShake(15); Sfx.hit();
  burst(P.x, P.y - 26, 26, { color: [G.char.base, G.char.darkCol, G.char.bellyCol || '#ffffff'], kind: 'feather', min: 120, max: 380, g: 300, smin: 3, smax: 7 });
  burst(P.x + 12, P.y - 26, 10, { color: ['#ffffff', '#ffe58a'], kind: 'spark', g: 0, min: 100, max: 260 });
  shout(pick(['Oof!', 'Hoo...!', 'Ow!', 'Bonk!']));
  if (o) o.hitT = 0.3;
  saveRun();
}

