//! Grimwing the Crow King guards the nest on every 5th stage.
//!
//! He cycles between three telegraphed attacks and never repeats one twice in a row:
//! - **volley**: a burst of feathers, low (hop over) or high (stay on the ground)
//! - **swoop**: he dives along the ground across the screen
//! - **stomp**: he slams down and sends a shockwave along the ground
//!
//! He sometimes drops a golden acorn; running into it bats it back at him. At half health he
//! becomes furious and attacks faster.

use super::*;

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

impl Game {
    pub(crate) fn start_boss(&mut self) {
        let n = self.stage / 5;
        let max = 18 + 6 * (n - 1);
        self.boss = Some(Boss {
            n,
            hp: max,
            max,
            x: W + 170.0,
            y: 190.0,
            home_x: 780.0,
            home_y: 190.0,
            t: 0.0,
            mode: Mode::Enter,
            mode_t: 0.0,
            next: 1.4,
            hurt: 0.0,
            tele: 0.0,
            last: None,
            dying: false,
            dying_t: 0.0,
            enraged: false,
            rot: 0.0,
            flap: 0.0,
            phase: None,
            pattern: vec![],
            shot_t: 0.0,
            swoops: 0,
            waves: 0,
            vy: 0.0,
            recoil: 0.0,
            acorn_later: false,
        });
        self.hazards.clear();
        self.set_banner(
            &format!("{BOSS_NAME} the Crow King!"),
            "Dodge his attacks · hit him with moves · run into golden acorns to bat them back",
            3.2,
            "#ff8a80",
        );
        self.sfx_arg("caw", 1.0);
        self.add_shake(6.0);
    }

    fn boss_attack(&mut self) {
        let last = self.boss.as_ref().and_then(|b| b.last);
        let options: Vec<Mode> = [Mode::Volley, Mode::Swoop, Mode::Stomp].into_iter().filter(|m| Some(*m) != last).collect();
        let a = self.rng.pick(&options);
        let lanes: Vec<Lane> = (0..5).map(|_| if self.rng.chance(0.55) { Lane::Low } else { Lane::High }).collect();
        let Some(b) = self.boss.as_mut() else { return };
        b.last = Some(a);
        b.mode = a;
        b.mode_t = 0.0;
        let fast = b.enraged;
        match a {
            Mode::Volley => {
                b.tele = if fast { 0.45 } else { 0.7 };
                b.pattern = lanes[..if fast { 5 } else { 3 }].to_vec();
                b.shot_t = b.tele;
                if !b.pattern.contains(&Lane::Low) {
                    b.pattern[0] = Lane::Low;
                }
            }
            Mode::Swoop => {
                b.tele = if fast { 0.6 } else { 0.9 };
                b.swoops = if fast { 2 } else { 1 };
                b.phase = Some(Phase::Rise);
            }
            _ => {
                b.tele = if fast { 0.5 } else { 0.75 };
                b.phase = Some(Phase::Rise);
                b.waves = if fast { 2 } else { 1 };
            }
        }
        self.sfx_arg("caw", 0.7);
    }

    fn boss_idle(b: &mut Boss) {
        b.mode = Mode::Idle;
        b.mode_t = 0.0;
        b.next = if b.enraged { 0.85 } else { 1.35 };
        b.tele = 0.0;
    }

    fn drop_acorn(&mut self, bx: f64) {
        self.hazards.push(Hazard {
            kind: HKind::Acorn,
            lane: None,
            x: bx - 50.0,
            y: GROUND - 22.0,
            w: 22.0,
            h: 22.0,
            vx: -240.0,
            t: 0.0,
            dead: false,
        });
    }

    /// Damage the boss by `n`, with the hit effect at (x, y).
    pub fn hurt_boss(&mut self, n: u32, x: f64, y: f64) {
        let Some(b) = self.boss.as_mut().filter(|b| !b.dying) else { return };
        b.hp = b.hp.saturating_sub(n);
        b.hurt = 0.18;
        let (hp, max, enraged, bx, by, bn) = (b.hp, b.max, b.enraged, b.x, b.y, b.n);
        self.float_text(x, y - 40.0, &format!("-{n}"), "#ff8a80", 22.0);
        self.burst(
            x,
            y,
            10,
            &["#2a2438", "#4a3f63", "#7a3d9a"],
            Burst { kind: PKind::Feather, min: 100.0, max: 300.0, g: 300.0, ..Default::default() },
        );
        self.add_shake(6.0);
        self.add_hitstop(0.05);
        self.sfx("bossHit");
        if !enraged && hp as f64 <= max as f64 / 2.0 && hp > 0 {
            if let Some(b) = self.boss.as_mut() {
                b.enraged = true;
            }
            self.sfx_arg("caw", 1.0);
            self.set_banner(&format!("{BOSS_NAME} is furious!"), "His attacks come faster now", 1.8, "#ff8a80");
        }
        if hp == 0 {
            if let Some(b) = self.boss.as_mut() {
                b.dying = true;
                b.dying_t = 0.0;
            }
            self.hazards.clear();
            self.add_hitstop(0.25);
            self.add_shake(18.0);
            self.sfx("boom");
            self.sfx("level");
            self.burst(
                bx,
                by,
                50,
                &["#2a2438", "#4a3f63", "#7a3d9a", "#ffd54f"],
                Burst { kind: PKind::Feather, min: 150.0, max: 520.0, g: 350.0, smin: 4.0, smax: 9.0, ..Default::default() },
            );
            self.burst(
                bx,
                by,
                24,
                &["#ffffff", "#ffe58a", "#ff8a80"],
                Burst { kind: PKind::Spark, min: 100.0, max: 400.0, g: 0.0, ..Default::default() },
            );
            let bonus = 1000 * bn;
            self.score += bonus as f64;
            self.set_banner(&format!("{BOSS_NAME} defeated!"), &format!("+{bonus} · the way home is clear"), 2.6, "#ffd54f");
            self.gain_xp(xp::BOSS, Some((bx, by - 60.0)));
        }
    }

    /// Something hit the player (hazard `h`, or the boss himself when `None`).
    /// Brave Bird and the invulnerability window ignore it, a Double Team decoy takes it,
    /// otherwise the run ends. Returns true if the run ended.
    pub(crate) fn hazard_hit_player(&mut self, h: Option<usize>) -> bool {
        let (px, py) = (self.player.x, self.player.y);
        if self.dash > 0.0 {
            if let Some(i) = h {
                self.hazards[i].dead = true;
                let hz = &self.hazards[i];
                let (cx, cy) = (hz.x + hz.w / 2.0, hz.y + hz.h / 2.0);
                self.burst(cx, cy, 8, &["#ffffff", "#bfe9ff"], Burst { kind: PKind::Spark, g: 0.0, ..Default::default() });
            }
            return false;
        }
        if self.inv > 0.0 {
            return false;
        }
        if self.shield.is_some() {
            if let Some(i) = h {
                self.hazards[i].dead = true;
            }
            self.decoy_takes_hit(px, py);
            return false;
        }
        self.die(None);
        true
    }

    pub(crate) fn decoy_takes_hit(&mut self, px: f64, py: f64) {
        self.shield = None;
        self.inv = 1.0;
        self.sfx("shieldBreak");
        let (base, dark) = (self.ch.base.clone(), self.ch.dark_col.clone().unwrap_or_default());
        self.burst(
            px,
            py - 26.0,
            22,
            &[&base, &dark, "#ffffff"],
            Burst { g: 200.0, min: 120.0, max: 300.0, kind: PKind::Feather, ..Default::default() },
        );
        self.float_text(px, py - 70.0, "Decoy took it!", "#ffd54f", 15.0);
    }

    /// The player's hitbox overlaps this rectangle.
    pub fn overlaps_player(&self, x: f64, y: f64, w: f64, h: f64) -> bool {
        let (px, py) = (self.player.x - 14.0, self.player.y - 46.0);
        px < x + w && px + 28.0 > x && py < y + h && py + 42.0 > y
    }

    pub(crate) fn update_boss(&mut self, dt: f64, live: bool) {
        let Some(mut b) = self.boss.take() else { return };
        let keep = self.step_boss(&mut b, dt, live);
        // step_boss may have replaced self.boss (it never does) or ended the fight
        if keep && self.boss.is_none() {
            self.boss = Some(b);
        }
    }

    /// One frame of the boss. Returns false when he's gone (defeated and fallen off screen).
    fn step_boss(&mut self, b: &mut Boss, dt: f64, live: bool) -> bool {
        b.t += dt;
        b.mode_t += dt;
        b.flap += dt * if b.mode == Mode::Swoop && b.phase == Some(Phase::Dive) { 22.0 } else { 9.0 };
        if b.hurt > 0.0 {
            b.hurt -= dt;
        }
        if b.dying {
            b.dying_t += dt;
            b.rot += dt * 6.0;
            b.y += dt * 260.0 * b.dying_t;
            b.x += dt * 80.0;
            if b.dying_t > 1.5 {
                self.boss_done = true;
                return false;
            }
            return true;
        }
        let k3 = (dt * 3.0).min(1.0);
        let hover = |b: &mut Boss| {
            b.x = lerp(b.x, b.home_x, k3);
            b.y = lerp(b.y, b.home_y + (b.t * 2.2).sin() * 18.0, (dt * 4.0).min(1.0));
        };
        match b.mode {
            Mode::Enter => {
                b.x = lerp(b.x, b.home_x, (dt * 1.8).min(1.0));
                b.y = b.home_y + (b.t * 2.2).sin() * 18.0;
                if b.mode_t > 1.4 {
                    Self::boss_idle(b);
                }
            }
            Mode::Idle => {
                hover(b);
                b.next -= dt;
                if b.next <= 0.0 && live {
                    // boss_attack works on self.boss, so hand him back for a moment
                    self.boss = Some(b.clone());
                    self.boss_attack();
                    *b = self.boss.take().unwrap();
                }
            }
            Mode::Volley => {
                hover(b);
                if b.mode_t >= b.tele {
                    b.shot_t -= dt;
                    if b.shot_t <= 0.0 && !b.pattern.is_empty() {
                        let lane = b.pattern.remove(0);
                        self.hazards.push(Hazard {
                            kind: HKind::Feather,
                            lane: Some(lane),
                            x: b.x - 70.0,
                            y: lane.y() - 6.0,
                            w: 42.0,
                            h: 12.0,
                            vx: -560.0,
                            t: 0.0,
                            dead: false,
                        });
                        self.sfx("feather");
                        b.recoil = 0.12;
                        // a low feather followed by a high one needs time to land in between
                        b.shot_t = if lane == Lane::Low && b.pattern.first() == Some(&Lane::High) {
                            0.8
                        } else if b.enraged {
                            0.42
                        } else {
                            0.52
                        };
                    }
                    if b.pattern.is_empty() && b.shot_t <= -0.2 {
                        if self.rng.chance(0.55) {
                            self.drop_acorn(b.x);
                        }
                        Self::boss_idle(b);
                    }
                }
            }
            Mode::Swoop => match b.phase {
                Some(Phase::Rise) => {
                    b.x = lerp(b.x, W - 70.0, (dt * 4.0).min(1.0));
                    b.y = lerp(b.y, 120.0, (dt * 4.0).min(1.0));
                    if b.mode_t >= b.tele {
                        b.phase = Some(Phase::Dive);
                        b.y = GROUND - 44.0;
                        self.sfx("dash");
                    }
                }
                Some(Phase::Dive) => {
                    b.x -= if b.enraged { 1050.0 } else { 950.0 } * dt;
                    b.y = GROUND - 44.0 + (b.t * 30.0).sin() * 2.0;
                    if live
                        && self.overlaps_player(b.x - BOSS_W / 2.0, b.y - BOSS_H / 2.0, BOSS_W, BOSS_H)
                        && self.dash <= 0.0
                        && self.hazard_hit_player(None)
                    {
                        return true;
                    }
                    if b.x < -180.0 {
                        b.swoops -= 1;
                        b.x = W + 180.0;
                        if b.swoops > 0 {
                            b.phase = Some(Phase::Rise);
                            b.mode_t = 0.0;
                            b.tele = 0.5;
                        } else {
                            b.y = b.home_y;
                            b.mode = Mode::Enter;
                            b.mode_t = 0.0;
                            if self.rng.chance(0.4) {
                                b.acorn_later = true;
                            }
                        }
                    }
                }
                _ => {}
            },
            Mode::Stomp => match b.phase {
                Some(Phase::Rise) => {
                    b.x = lerp(b.x, b.home_x, k3);
                    b.y = lerp(b.y, 100.0, (dt * 5.0).min(1.0));
                    if b.mode_t >= b.tele {
                        b.phase = Some(Phase::Drop);
                        b.vy = 0.0;
                    }
                }
                Some(Phase::Drop) => {
                    b.vy += 4200.0 * dt;
                    b.y += b.vy * dt;
                    if b.y >= GROUND - 52.0 {
                        b.y = GROUND - 52.0;
                        b.waves -= 1;
                        self.add_shake(12.0);
                        self.add_hitstop(0.05);
                        self.sfx("boom");
                        self.hazards.push(Hazard {
                            kind: HKind::Wave,
                            lane: None,
                            x: b.x - 70.0,
                            y: GROUND - 24.0,
                            w: 34.0,
                            h: 24.0,
                            vx: if b.enraged { -520.0 } else { -460.0 },
                            t: 0.0,
                            dead: false,
                        });
                        self.burst(
                            b.x,
                            GROUND,
                            18,
                            &["#c9a96b", "#e3d2ae", "#7a5a3a"],
                            Burst {
                                angle: Some(-std::f64::consts::FRAC_PI_2),
                                spread: 1.4,
                                min: 120.0,
                                max: 380.0,
                                g: 700.0,
                                kind: PKind::Chip,
                                ..Default::default()
                            },
                        );
                        b.mode_t = 0.0;
                        if b.waves > 0 {
                            b.phase = Some(Phase::Bounce);
                        } else {
                            b.phase = Some(Phase::Lift);
                            if self.rng.chance(0.45) {
                                self.drop_acorn(b.x);
                            }
                        }
                    }
                }
                Some(Phase::Bounce) => {
                    b.y = lerp(b.y, 150.0, (dt * 6.0).min(1.0));
                    if b.mode_t > 0.45 {
                        b.phase = Some(Phase::Drop);
                        b.vy = 0.0;
                    }
                }
                Some(Phase::Lift) => {
                    hover(b);
                    if b.mode_t > 0.6 {
                        Self::boss_idle(b);
                    }
                }
                _ => {}
            },
        }
        if b.mode == Mode::Idle && b.acorn_later {
            b.acorn_later = false;
            self.drop_acorn(b.x);
        }
        if b.recoil > 0.0 {
            b.recoil -= dt;
        }
        true
    }

    pub(crate) fn update_hazards(&mut self, dt: f64, live: bool) {
        for i in 0..self.hazards.len() {
            let boss = self.boss.as_ref().map(|b| (b.x, b.y, b.dying));
            self.hazards[i].t += dt;
            if self.hazards[i].kind == HKind::Shot {
                // a batted-back acorn flying at the boss
                let (tx, ty) = boss.map_or((W + 100.0, 100.0), |(x, y, _)| (x, y));
                let h = &mut self.hazards[i];
                let k = (dt * 7.0).min(1.0);
                h.x += (tx - h.x) * k;
                h.y += (ty - h.y) * k - (h.t * 6.0).sin() * 2.0;
                if (tx - h.x).hypot(ty - h.y) < 30.0 || h.t > 1.2 {
                    h.dead = true;
                    let (hx, hy) = (h.x, h.y);
                    if let Some((bx, by, false)) = boss {
                        self.hurt_boss(2, bx, by);
                        self.sfx("boom");
                        self.burst(hx, hy, 16, &["#ffd54f", "#fff2c0"], Burst { kind: PKind::Spark, g: 0.0, ..Default::default() });
                    }
                }
                continue;
            }
            let h = &mut self.hazards[i];
            h.x += h.vx * dt;
            if !live {
                continue;
            }
            let (x, y, w, hh) = (h.x, h.y, h.w, h.h);
            if !self.overlaps_player(x, y, w, hh) {
                continue;
            }
            if self.hazards[i].kind == HKind::Acorn {
                let h = &mut self.hazards[i];
                h.kind = HKind::Shot;
                h.t = 0.0;
                self.sfx("throwSeed");
                self.sfx("gold");
                self.float_text(x, y - 30.0, "Batted back!", "#ffd54f", 15.0);
                continue;
            }
            if self.hazard_hit_player(Some(i)) {
                return;
            }
        }
        self.hazards.retain(|h| !h.dead && h.x > -80.0 && h.x < W + 200.0);
    }
}
