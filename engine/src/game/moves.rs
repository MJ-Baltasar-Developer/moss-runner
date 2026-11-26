//! Moss's four moves, learned as he levels up (from the pet's attacks):
//! Brave Bird (dash), Double Team (decoys), Seed Bomb (homing seeds) and Leaf Storm (clears the screen).

use super::*;
use std::f64::consts::PI;

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

impl Game {
    /// Use move `i` (0-3). Does nothing outside play; buzzes if it isn't learned or is cooling down.
    pub fn use_move(&mut self, i: usize) {
        let Some(m) = MOVES.get(i).copied() else { return };
        if self.state != State::Play {
            return;
        }
        if self.level < m.lv || self.cds.get(m.id).copied().unwrap_or(0.0) > 0.0 {
            self.sfx("denied");
            self.unlock_flash.insert(m.id, -0.35);
            return;
        }
        self.cds.insert(m.id, m.cd);
        self.shout(&format!("{}!", m.name));
        let (px, py) = (self.player.x, self.player.y);
        match m.kind {
            MoveId::BraveBird => {
                self.dash = 0.55;
                self.player.vy = 0.0;
                self.sfx("dash");
                self.add_shake(4.0);
                if self.boss.as_ref().is_some_and(|b| !b.dying) {
                    // charge straight at the boss and back
                    self.charge = Some(Charge { t: 0.0, y0: py, hit: false });
                }
                self.burst(
                    px,
                    py - 26.0,
                    14,
                    &["#bfe9ff", "#ffffff", "#7fc9ff"],
                    Burst { angle: Some(PI), spread: 0.5, min: 100.0, max: 300.0, g: 0.0, kind: PKind::Spark, ..Default::default() },
                );
            }
            MoveId::DoubleTeam => {
                self.shield = Some(Shield { t: 12.0 });
                self.sfx("shield");
                let base = self.ch.base.clone();
                self.burst(
                    px,
                    py - 26.0,
                    16,
                    &[&base, "#ffffff"],
                    Burst { g: 0.0, min: 60.0, max: 180.0, kind: PKind::Spark, ..Default::default() },
                );
            }
            MoveId::SeedBomb => {
                let on_boss = self.boss.as_ref().is_some_and(|b| !b.dying);
                let mut ahead: Vec<(f64, u32)> = if on_boss {
                    vec![]
                } else {
                    self.obstacles.iter().filter(|o| !o.dead && o.x + o.w > px + 20.0 && o.x < W + 40.0).map(|o| (o.x, o.id)).collect()
                };
                ahead.sort_by(|a, b| a.0.total_cmp(&b.0));
                ahead.truncate(3);
                let n = ahead.len().max(3);
                for k in 0..n {
                    let tgt = if on_boss { SeedTarget::Boss } else { ahead.get(k).map_or(SeedTarget::None, |a| SeedTarget::Obstacle(a.1)) };
                    self.seeds.push(Seed {
                        x0: px + 10.0,
                        y0: py - 36.0,
                        x: px,
                        y: py,
                        t: -(k as f64) * 0.12,
                        dur: 0.42,
                        tgt,
                        fx: px + 260.0 + k as f64 * 110.0,
                        fy: GROUND - 6.0,
                        thrown: false,
                        done: false,
                    });
                }
            }
            MoveId::LeafStorm => {
                self.storm = Some(Storm { x: px, t: 0.0, hit_boss: false });
                self.sfx("storm");
                self.add_shake(6.0);
            }
        }
    }

    /// Wing angle of the player's current pose (the renderer works it out the same way).
    pub(crate) fn wing_angle(&self) -> f64 {
        let p = &self.player;
        if self.dash > 0.0 {
            30.0
        } else if p.on_ground {
            10.0 + (p.run_ph * 2.0).sin() * 6.0
        } else if p.gliding {
            95.0 + (self.t * 24.0).sin() * 22.0
        } else if p.vy < 0.0 {
            75.0
        } else {
            45.0
        }
    }

    pub(crate) fn update_moves(&mut self, dt: f64) {
        for m in MOVES {
            let v = self.cds.entry(m.id).or_insert(0.0);
            *v = (*v - dt).max(0.0);
        }
        for v in self.unlock_flash.values_mut() {
            *v = if *v > 0.0 { (*v - dt).max(0.0) } else { (*v + dt).min(0.0) };
        }
        if self.dash > 0.0 {
            self.update_dash(dt);
        }
        if let Some(s) = self.shield.as_mut() {
            s.t -= dt;
            if s.t <= 0.0 {
                self.shield = None;
                let (px, py) = (self.player.x, self.player.y);
                self.burst(px, py - 26.0, 10, &["#ffffff"], Burst { g: 0.0, kind: PKind::Spark, ..Default::default() });
            }
        }
        if self.inv > 0.0 {
            self.inv -= dt;
        }
        self.update_seeds(dt);
        self.update_storm(dt);
    }

    fn update_dash(&mut self, dt: f64) {
        self.dash -= dt;
        let (px, py) = (self.player.x, self.player.y);
        if self.fx.chance(0.9) {
            let y = py - 28.0 + self.fx.range(-14.0, 14.0);
            let size = self.fx.range(3.0, 7.0);
            let color = self.fx.pick(&["#bfe9ff", "#ffffff", "#7fc9ff"]);
            self.parts.push(Particle { vx: -200.0, size, ..Particle::plain(px - 10.0, y, PKind::Spark, 0.3, color) });
        }
        self.after_t -= dt;
        if self.after_t <= 0.0 {
            self.after_t = 0.05;
            let snap = Snap { wing: self.wing_angle(), run: self.player.run_ph };
            self.parts.push(Particle { snap: Some(snap), ..Particle::plain(px, py, PKind::After, 0.25, "") });
        }
        if let Some(mut c) = self.charge.take() {
            c.t += dt;
            let p = (c.t / 0.55).min(1.0);
            let (bx, by) = match &self.boss {
                Some(b) => (b.x - 90.0, (b.y + 40.0).clamp(110.0, GROUND)),
                None => (PLAYER_X, c.y0),
            };
            if p < 0.45 {
                let e = p / 0.45;
                self.player.x = lerp(PLAYER_X, bx, e * e);
                self.player.y = lerp(c.y0, by, e);
            } else {
                if !c.hit {
                    c.hit = true;
                    if let Some((x, y)) = self.boss.as_ref().filter(|b| !b.dying).map(|b| (b.x, b.y)) {
                        self.hurt_boss(3, x - 40.0, y);
                    }
                }
                let e = (p - 0.45) / 0.55;
                self.player.x = lerp(bx, PLAYER_X, e);
                self.player.y = lerp(by, c.y0, e);
            }
            if p >= 1.0 || self.dash <= 0.0 {
                self.player.x = PLAYER_X;
            } else {
                self.charge = Some(c);
            }
        }
        if self.dash <= 0.0 {
            self.inv = self.inv.max(0.2);
        }
    }

    fn update_seeds(&mut self, dt: f64) {
        let (px, py) = (self.player.x, self.player.y);
        for i in 0..self.seeds.len() {
            let s = &mut self.seeds[i];
            s.t += dt;
            if s.t < 0.0 {
                s.x = px;
                s.y = py - 36.0;
                continue;
            }
            if !s.thrown {
                s.thrown = true;
                s.x0 = px + 10.0;
                s.y0 = py - 36.0;
                self.sfx("throwSeed");
            }
            let s = self.seeds[i].clone();
            let p = (s.t / s.dur).min(1.0);
            let boss = self.boss.as_ref().filter(|b| !b.dying).map(|b| (b.x, b.y));
            let at_boss = if s.tgt == SeedTarget::Boss { boss } else { None };
            let live = match s.tgt {
                SeedTarget::Obstacle(id) => self.obstacles.iter().position(|o| o.id == id && !o.dead),
                _ => None,
            };
            let (tx, ty) = match (at_boss, live) {
                (Some(b), _) => b,
                (None, Some(j)) => {
                    let o = &self.obstacles[j];
                    (o.x + o.w / 2.0, o.y + o.h / 2.0)
                }
                _ => (s.fx, s.fy),
            };
            let sx = lerp(s.x0, tx, p);
            let sy = lerp(s.y0, ty, p) - (PI * p).sin() * if at_boss.is_some() { 140.0 } else { 90.0 };
            let speed = self.speed;
            let seed = &mut self.seeds[i];
            seed.x = sx;
            seed.y = sy;
            if s.tgt == SeedTarget::None {
                seed.fx -= speed * dt;
            }
            if p >= 1.0 {
                seed.done = true;
                self.burst(
                    sx,
                    sy,
                    26,
                    &["#ffb347", "#ffd54f", "#e0603a", "#fff2c0"],
                    Burst { kind: PKind::Spark, min: 80.0, max: 360.0, g: 200.0, ..Default::default() },
                );
                self.burst(sx, sy, 10, &["#8b5a2b", "#5e3b1a"], Burst { kind: PKind::Chip, min: 100.0, max: 300.0, ..Default::default() });
                self.parts.push(Particle { r: Some(50.0), ..Particle::plain(sx, sy, PKind::Ring, 0.35, "#ffd54f") });
                self.sfx("boom");
                self.add_shake(7.0);
                self.add_hitstop(0.04);
                if at_boss.is_some() {
                    self.hurt_boss(1, sx, sy);
                } else if let Some(j) = live {
                    self.smash(j, "seed");
                }
            }
        }
        self.seeds.retain(|s| !s.done);
    }

    fn update_storm(&mut self, dt: f64) {
        let Some(mut st) = self.storm.take() else { return };
        st.t += dt;
        st.x += 1500.0 * dt;
        for _ in 0..6 {
            let x = st.x + self.fx.range(-60.0, 10.0);
            let y = self.fx.range(30.0, GROUND);
            let (vx, vy) = (self.fx.range(200.0, 700.0), self.fx.range(-200.0, 200.0));
            let life = self.fx.range(0.4, 0.9);
            let size = self.fx.range(5.0, 9.0);
            let color = self.fx.pick(&["#6aa35e", "#9ccc4a", "#4f8a47", "#cdeac0", "#e8c547"]);
            let (rot, vr) = (self.fx.range(0.0, 6.0), self.fx.range(-14.0, 14.0));
            self.parts.push(Particle {
                vx,
                vy,
                size,
                g: 80.0,
                rot,
                vr,
                scroll: false,
                max: 0.9,
                ..Particle::plain(x, y, PKind::Leaf, life, color)
            });
        }
        for i in 0..self.obstacles.len() {
            if !self.obstacles[i].dead && self.obstacles[i].x < st.x {
                self.smash(i, "storm");
            }
        }
        for h in self.hazards.iter_mut() {
            if h.x < st.x && matches!(h.kind, HKind::Feather | HKind::Wave) {
                h.dead = true;
            }
        }
        if let Some((bx, by)) = self.boss.as_ref().filter(|b| !b.dying).map(|b| (b.x, b.y)) {
            if !st.hit_boss && st.x > bx {
                st.hit_boss = true;
                self.hurt_boss(4, bx, by);
            }
        }
        let px = self.player.x;
        for orb in self.orbs.iter_mut() {
            if !orb.taken && orb.x < st.x && orb.x > px {
                orb.pull = true;
            }
        }
        if st.x <= W + 150.0 {
            self.storm = Some(st);
        }
    }
}
