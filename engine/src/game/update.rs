//! One frame of the game: speed, player physics, spawning, collisions, the boss, moves,
//! reaching the nest, dying and particles.

use super::*;
use std::f64::consts::PI;

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

impl Game {
    pub(crate) fn update(&mut self, dt: f64) {
        self.t += dt;
        if let Some(b) = self.banner.as_mut() {
            b.t += dt;
            if b.t > b.dur {
                self.banner = None;
            }
        }
        for s in self.shouts.iter_mut() {
            s.t += dt;
        }
        self.shouts.retain(|s| s.t < s.dur);
        if self.level_cheer > 0.0 {
            self.level_cheer -= dt;
        }
        self.orb_streak_t -= dt;
        if self.orb_streak_t <= 0.0 {
            self.orb_streak = 0;
        }

        // ---- speed ----
        match self.state {
            State::Play => {
                let prog = self.dist / self.stage_len;
                let dashing = self.dash > 0.0;
                let target = self.base_speed() * (1.0 + 0.18 * prog) * if dashing { 1.9 } else { 1.0 };
                self.speed += (target - self.speed) * (dt * if dashing { 10.0 } else { 2.5 }).min(1.0);
            }
            State::Arrive | State::Dying => self.speed *= (-3.2 * dt).exp(),
            _ => self.speed = 0.0,
        }
        let mv = self.speed * dt;
        if self.boss.is_none() {
            self.dist += mv; // the nest stays out of reach until the boss is beaten
        }
        self.scroll += mv;

        if self.state == State::Play {
            self.update_player(dt);

            // ---- spawning ----
            self.next_spawn -= mv;
            let remaining = self.stage_len - self.dist;
            let boss_ahead = is_boss_stage(self.stage) && !self.boss_done;
            let quiet = boss_ahead && remaining < BOSS_AT + 1000.0; // clear the field before he arrives
            if self.next_spawn <= 0.0 && remaining > 1150.0 && !quiet {
                self.spawn_obstacle();
            }
            if boss_ahead && self.boss.is_none() && remaining <= BOSS_AT {
                self.start_boss();
            }

            // ---- Easy mode checkpoint: halfway, or just before the boss ----
            if self.easy && self.mode == RunMode::Normal && self.checkpoint == 0.0 {
                let at = if boss_ahead { self.stage_len - BOSS_AT - 600.0 } else { self.stage_len * 0.5 };
                if self.dist >= at {
                    self.checkpoint = self.dist;
                    self.shout("Checkpoint!");
                    self.sfx("checkpoint");
                    self.emit(Event::Checkpoint);
                }
            }

            // ---- arrival at the nest ----
            if remaining <= 230.0 && self.boss.is_none() {
                self.state = State::Arrive;
                self.arrive = Some(Arrive { t: 0.0, x0: self.player.x, y0: self.player.y, done: false, done_t: 0.0 });
                self.dash = 0.0;
                self.shield = None;
                self.seeds.clear();
                self.storm = None;
                self.shout("Home!");
            }
        }

        // ---- world objects scroll past ----
        let playing = self.state == State::Play;
        let (px, speed) = (self.player.x, self.speed.max(200.0));
        let mut landed_icicles = vec![];
        for (i, o) in self.obstacles.iter_mut().enumerate() {
            let d = o.kind.def();
            o.x -= mv + if d.vx != 0.0 && playing { d.vx * dt } else { 0.0 };
            o.t += dt;
            if o.boing > 0.0 {
                o.boing -= dt;
            }
            // icicles drop when you get close (timed to land just ahead of you), then stick in the ground
            if d.falls && !o.landed {
                if !o.falling && playing && o.x - px < speed * 0.85 {
                    o.falling = true;
                }
                if o.falling {
                    o.vy += 1800.0 * dt;
                    o.y += o.vy * dt;
                    if o.y + o.h >= GROUND + 6.0 {
                        o.landed = true;
                        o.h = 36.0;
                        o.y = GROUND - 30.0;
                        o.vy = 0.0;
                        landed_icicles.push(i);
                    }
                }
            }
        }
        for i in landed_icicles {
            let o = &self.obstacles[i];
            let (x, w) = (o.x, o.w);
            self.burst(
                x + w / 2.0,
                GROUND,
                10,
                &["#e6f6ff", "#9fd3ea", "#ffffff"],
                Burst { kind: PKind::Chip, min: 80.0, max: 240.0, g: 900.0, ..Default::default() },
            );
            self.sfx("crack");
        }
        self.obstacles.retain(|o| o.x + o.w > -60.0 && !o.dead);
        for orb in self.orbs.iter_mut() {
            orb.x -= mv;
            orb.ph += dt * 5.0;
        }

        if self.state == State::Play {
            self.collect_orbs(dt);
            self.hit_obstacles();
            if self.state == State::Play {
                self.score += mv / PX_PER_M; // 1 point per metre (not after the fatal hit)
            }
        }
        self.orbs.retain(|o| !o.taken && o.x > -40.0);

        let live = self.state == State::Play;
        if self.boss.is_some() {
            self.update_boss(dt, live);
        }
        if !self.hazards.is_empty() {
            self.update_hazards(dt, self.state == State::Play);
        }
        if self.state == State::Play {
            self.update_moves(dt);
        }
        if self.state == State::Arrive {
            self.update_arrive(dt);
        }

        if self.state == State::Dying {
            self.dead_t += dt;
            let p = &mut self.player;
            p.vy += GRAV * 0.8 * dt;
            p.y += p.vy * dt;
            p.x -= 60.0 * dt;
            p.rot += dt * 9.0;
            if self.dead_t > 0.85 {
                self.state = State::Dead;
                self.events.push(Event::Over);
            }
        } else if self.state == State::Dead {
            self.dead_t += dt;
        }

        self.update_particles(dt, mv);
        self.shake = (self.shake - dt * 30.0).max(0.0);
    }

    fn update_player(&mut self, dt: f64) {
        let dashing = self.dash > 0.0;
        let p = &mut self.player;
        p.buffer -= dt;
        p.coyote -= dt;
        let mut jumped = false;
        if p.buffer > 0.0 && (p.on_ground || p.coyote > 0.0) && !dashing {
            p.vy = JUMP_V;
            p.on_ground = false;
            p.coyote = 0.0;
            p.buffer = 0.0;
            p.squash = -0.12;
            jumped = true;
        }
        if dashing {
            p.vy = 0.0;
        } else {
            p.gliding = !p.on_ground && self.held && p.vy > 0.0;
            p.vy += GRAV * if p.gliding { 0.3 } else { 1.0 } * dt;
            if p.gliding && p.vy > GLIDE_VMAX {
                p.vy = lerp(p.vy, GLIDE_VMAX, (dt * 14.0).min(1.0));
            }
        }
        p.y += p.vy * dt;
        if p.y < 60.0 {
            p.y = 60.0;
            p.vy = p.vy.max(0.0);
        }
        let mut landed = false;
        if p.y >= GROUND {
            if !p.on_ground {
                p.squash = 0.18;
                landed = true;
            }
            p.y = GROUND;
            p.vy = 0.0;
            p.on_ground = true;
        } else if p.on_ground {
            p.on_ground = false;
            p.coyote = COYOTE;
        }
        let px = p.x;
        if jumped {
            self.sfx("jump");
            self.burst(
                px,
                GROUND,
                6,
                &["#c9a96b", "#e3d2ae"],
                Burst { angle: Some(PI), spread: 0.6, min: 40.0, max: 140.0, g: 200.0, smin: 2.0, smax: 4.0, ..Default::default() },
            );
        }
        if landed {
            self.sfx("land");
            self.burst(
                px,
                GROUND,
                5,
                &["#c9a96b", "#e3d2ae"],
                Burst { angle: Some(-PI / 2.0), spread: 1.2, min: 30.0, max: 110.0, g: 300.0, smin: 2.0, smax: 4.0, ..Default::default() },
            );
        }
        if self.player.on_ground {
            self.player.run_ph += dt * self.speed / 26.0;
            if self.fx.f() < dt * 6.0 {
                let vy = -self.fx.range(20.0, 60.0);
                let size = self.fx.range(2.0, 3.5);
                self.parts.push(Particle {
                    vx: -40.0,
                    vy,
                    size,
                    g: 100.0,
                    ..Particle::plain(px - 8.0, GROUND - 2.0, PKind::Dot, 0.4, "#d9c7a3")
                });
            }
        }
        self.player.squash *= (-12.0 * dt).exp();
    }

    fn collect_orbs(&mut self, dt: f64) {
        let (px, py) = (self.player.x, self.player.y);
        for i in 0..self.orbs.len() {
            let o = &mut self.orbs[i];
            if o.taken {
                continue;
            }
            let (dx, dy) = (px - o.x, (py - 26.0) - o.y);
            let d2 = dx * dx + dy * dy;
            if o.pull || d2 < 75.0 * 75.0 {
                let k = (dt * if o.pull { 6.0 } else { 9.0 }).min(1.0);
                o.x += dx * k;
                o.y += dy * k;
            }
            if d2 < 26.0 * 26.0 {
                o.taken = true;
                let (gold, ox, oy) = (o.gold, o.x, o.y);
                self.orb_count += 1;
                self.orb_streak += 1;
                self.orb_streak_t = 0.6;
                self.score += if gold { 50.0 } else { 10.0 };
                let colors: &[&str] = if gold { &["#ffd54f", "#fff2c0"] } else { &["#cdeac0", "#9ccc4a", "#ffffff"] };
                self.burst(
                    ox,
                    oy,
                    if gold { 14 } else { 7 },
                    colors,
                    Burst { g: 0.0, min: 40.0, max: 160.0, kind: PKind::Spark, life: 0.6, ..Default::default() },
                );
                if gold {
                    self.sfx("gold");
                } else {
                    self.sfx_arg("orb", self.orb_streak as f64);
                }
                self.gain_xp(if gold { xp::GOLD } else { xp::ORB }, None);
            }
        }
    }

    fn hit_obstacles(&mut self) {
        let p = &self.player;
        let (hx, hy, hw, hh) = (p.x - 14.0, p.y - 46.0, 28.0, 42.0);
        for i in 0..self.obstacles.len() {
            let o = &self.obstacles[i];
            if o.dead {
                continue;
            }
            let [t, r, b, l] = o.kind.def().hb;
            let (ox, oy, ow, oh) = (o.x + l, o.y + t, o.w - l - r, o.h - t - b);
            if !(hx < ox + ow && hx + hw > ox && hy < oy + oh && hy + hh > oy) {
                continue;
            }
            if o.kind.def().bouncy {
                // mushrooms: land on top to bounce high; running into the side does nothing
                if self.player.vy > 0.0 && self.player.y <= o.y + 22.0 {
                    self.player.vy = JUMP_V * 1.18;
                    self.player.on_ground = false;
                    self.player.squash = -0.2;
                    self.obstacles[i].boing = 0.3;
                    self.sfx("boing");
                    let (x, y) = (self.player.x, self.player.y);
                    self.burst(
                        x,
                        y,
                        8,
                        &["#ffd54f", "#ffffff"],
                        Burst { kind: PKind::Spark, g: 0.0, min: 60.0, max: 160.0, ..Default::default() },
                    );
                }
                continue;
            }
            if self.dash > 0.0 {
                self.smash(i, "dash");
            } else if self.inv > 0.0 {
                continue;
            } else if self.shield.is_some() {
                self.smash(i, "shield");
                let (px, py) = (self.player.x, self.player.y);
                self.decoy_takes_hit(px, py);
            } else if self.hit_player() {
                break;
            }
        }
    }

    fn update_arrive(&mut self, dt: f64) {
        let Some(mut a) = self.arrive.take() else { return };
        a.t += dt;
        let (nest_x, seat_y) = (self.nest_screen_x(), NEST_SEAT);
        let p = (a.t / 0.8).min(1.0);
        let e = 1.0 - (1.0 - p).powi(2);
        if !a.done {
            self.player.x = lerp(a.x0, nest_x, e);
            self.player.y = lerp(a.y0, seat_y, p) - (PI * p).sin() * 110.0;
            self.player.on_ground = false;
            if p >= 1.0 {
                a.done = true;
                a.done_t = 0.0;
                self.player.y = seat_y;
                self.player.squash = 0.2;
                let bonus = 250 * self.stage;
                self.score += bonus as f64;
                self.sfx("nest");
                self.float_text(nest_x, seat_y - 80.0, &format!("+{bonus} home bonus"), "#ffd54f", 18.0);
                self.burst(
                    nest_x,
                    seat_y - 30.0,
                    40,
                    &["#6aa35e", "#9ccc4a", "#ffd54f", "#f48fb1", "#e0603a"],
                    Burst { kind: PKind::Leaf, min: 120.0, max: 420.0, g: 400.0, ..Default::default() },
                );
                self.add_shake(5.0);
                self.add_hitstop(0.08);
                self.gain_xp(xp::NEST, Some((nest_x, seat_y - 100.0)));
            }
        } else {
            self.player.x = nest_x;
            self.player.y = seat_y;
            a.done_t += dt;
            if a.done_t > 1.6 && self.state == State::Arrive {
                self.state = State::Cleared;
                let flawless = self.flawless;
                self.events.push(Event::Cleared { flawless });
            }
        }
        self.arrive = Some(a);
        self.player.squash *= (-10.0 * dt).exp();
    }

    fn update_particles(&mut self, dt: f64, world_dx: f64) {
        for p in self.parts.iter_mut() {
            p.life -= dt;
            p.vy += p.g * dt;
            if p.drag != 0.0 {
                p.vx *= 1.0 - p.drag * dt;
            }
            p.x += p.vx * dt - if p.scroll { world_dx } else { 0.0 };
            p.y += p.vy * dt;
            if p.vr != 0.0 {
                p.rot += p.vr * dt;
            }
            if matches!(p.kind, PKind::Chip | PKind::Feather) {
                if p.y > GROUND + 4.0 && p.vy > 0.0 {
                    p.y = GROUND + 4.0;
                    p.vy *= -0.3;
                    p.vx *= 0.6;
                }
                if p.kind == PKind::Feather {
                    p.vy = p.vy.min(90.0);
                    p.vx *= 1.0 - 2.0 * dt;
                }
            }
        }
        self.parts.retain(|p| p.life > 0.0);
        for p in self.texts.iter_mut() {
            p.life -= dt;
            p.y += p.vy * dt;
        }
        self.texts.retain(|p| p.life > 0.0);
        if self.parts.len() > MAX_PARTICLES {
            let extra = self.parts.len() - MAX_PARTICLES;
            self.parts.drain(0..extra);
        }
    }

    /// Something hurt the player. In Easy mode a heart is lost and the run goes on while any
    /// are left. Returns true if the run ended.
    pub(crate) fn hit_player(&mut self) -> bool {
        self.flawless = false;
        if self.hearts > 1 {
            self.hearts -= 1;
            self.inv = 1.6;
            self.add_shake(10.0);
            self.add_hitstop(0.08);
            self.sfx("ouch");
            let (px, py) = (self.player.x, self.player.y);
            let hearts = self.hearts;
            self.float_text(px, py - 70.0, if hearts == 1 { "Last heart!" } else { "Ouch!" }, "#ff8a80", 16.0);
            self.burst(px, py - 26.0, 12, &["#ff8a80", "#ffffff"], Burst { kind: PKind::Spark, g: 0.0, ..Default::default() });
            self.emit(Event::Hurt { hearts });
            return false;
        }
        self.hearts = 0;
        self.die(None);
        true
    }

    /// The run is over: tumble, then game over.
    pub(crate) fn die(&mut self, _o: Option<usize>) {
        self.state = State::Dying;
        self.dead_t = 0.0;
        self.player.vy = -560.0;
        self.player.rot = 0.0;
        self.charge = None;
        self.add_hitstop(0.16);
        self.add_shake(15.0);
        self.sfx("hit");
        let (px, py) = (self.player.x, self.player.y);
        let (base, dark, belly) = (
            self.ch.base.clone(),
            self.ch.dark_col.clone().unwrap_or_default(),
            self.ch.belly_col.clone().unwrap_or_else(|| "#ffffff".into()),
        );
        self.burst(
            px,
            py - 26.0,
            26,
            &[&base, &dark, &belly],
            Burst { kind: PKind::Feather, min: 120.0, max: 380.0, g: 300.0, smin: 3.0, smax: 7.0, ..Default::default() },
        );
        self.burst(
            px + 12.0,
            py - 26.0,
            10,
            &["#ffffff", "#ffe58a"],
            Burst { kind: PKind::Spark, g: 0.0, min: 100.0, max: 260.0, ..Default::default() },
        );
        let msg = self.fx.pick(&["Oof!", "Hoo...!", "Ow!", "Bonk!"]);
        self.shout(msg);
        self.events.push(Event::Died);
    }
}
