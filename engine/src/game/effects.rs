//! Particles, banners, screen shake, hitstop, XP and smashing obstacles.

use super::*;

/// Options for a burst of particles. Start from `Burst::default()` and change what you need.
#[derive(Clone, Debug)]
pub struct Burst {
    /// Aim the burst (radians) instead of spraying all around, within +/- `spread`.
    pub angle: Option<f64>,
    pub spread: f64,
    pub min: f64,
    pub max: f64,
    pub vx: f64,
    pub vy: f64,
    pub life: f64,
    pub smin: f64,
    pub smax: f64,
    pub g: f64,
    pub kind: PKind,
    pub drag: f64,
}

impl Default for Burst {
    fn default() -> Self {
        Burst {
            angle: None,
            spread: 0.0,
            min: 60.0,
            max: 260.0,
            vx: 0.0,
            vy: 0.0,
            life: 1.0,
            smin: 2.0,
            smax: 5.0,
            g: 600.0,
            kind: PKind::Dot,
            drag: 0.0,
        }
    }
}

impl Game {
    pub(crate) fn burst(&mut self, x: f64, y: f64, n: usize, colors: &[&str], o: Burst) {
        for _ in 0..n {
            let a = match o.angle {
                Some(a) => a + self.fx.range(-o.spread, o.spread),
                None => self.fx.range(0.0, std::f64::consts::TAU),
            };
            let s = self.fx.range(o.min, o.max);
            let life = self.fx.range(0.4, 0.9) * o.life;
            let color = if colors.is_empty() { "#fff" } else { self.fx.pick(colors) };
            let p = Particle {
                vx: a.cos() * s + o.vx,
                vy: a.sin() * s + o.vy,
                size: self.fx.range(o.smin, o.smax),
                g: o.g,
                rot: self.fx.range(0.0, 6.0),
                vr: self.fx.range(-10.0, 10.0),
                drag: o.drag,
                ..Particle::plain(x, y, o.kind, life, color)
            };
            self.parts.push(p);
        }
    }

    pub(crate) fn float_text(&mut self, x: f64, y: f64, text: &str, color: &str, size: f64) {
        self.texts.push(Particle {
            vy: -60.0,
            size,
            scroll: false,
            text: Some(text.into()),
            ..Particle::plain(x, y, PKind::Text, 1.0, color)
        });
    }

    pub(crate) fn set_banner(&mut self, title: &str, sub: &str, dur: f64, color: &str) {
        self.banner = Some(Banner { title: title.into(), sub: sub.into(), t: 0.0, dur, color: color.into() });
    }

    pub(crate) fn shout(&mut self, text: &str) {
        self.shouts = vec![Shout { text: text.into(), t: 0.0, dur: 0.9 }];
    }

    pub(crate) fn add_shake(&mut self, a: f64) {
        self.shake = self.shake.max(a);
    }

    /// Freeze the world for a split second to make a hit land.
    pub(crate) fn add_hitstop(&mut self, s: f64) {
        self.hitstop = self.hitstop.max(s);
    }

    /// Add XP, levelling up (and learning moves) as many times as it covers.
    pub fn gain_xp(&mut self, n: u32, at: Option<(f64, f64)>) {
        self.xp += n;
        if let Some((x, y)) = at {
            self.float_text(x, y, &format!("+{n} XP"), "#cdeac0", 13.0);
        }
        while self.xp >= xp_needed(self.level) {
            self.xp -= xp_needed(self.level);
            self.level += 1;
            self.max_level = self.max_level.max(self.level);
            let (px, py) = (self.player.x, self.player.y);
            self.burst(
                px,
                py - 28.0,
                26,
                &["#ffd54f", "#f48fb1", "#cdeac0", "#ffffff"],
                Burst { g: 120.0, kind: PKind::Spark, min: 80.0, max: 240.0, ..Default::default() },
            );
            self.add_hitstop(0.06);
            self.sfx("level");
            let name = self.ch.name.clone();
            if let Some(m) = MOVES.iter().find(|m| m.lv == self.level) {
                self.set_banner(
                    &format!("{name} learned {}!", m.name),
                    &format!("Press {} (or {}): {}", m.key, m.alt.to_uppercase(), m.desc),
                    2.8,
                    "#ffd54f",
                );
                self.cds.insert(m.id, 0.0);
                self.unlock_flash.insert(m.id, 2.5);
                self.sfx("learn");
            } else {
                self.set_banner(&format!("Level up! Lv {}", self.level), &format!("{name} grew stronger"), 1.6, "#cdeac0");
            }
            self.level_cheer = 1.0;
            self.maybe_evolve();
        }
    }

    /// Moss evolves like the desktop pet: Fernando at Lv 8, Thornhood at Lv 16.
    fn maybe_evolve(&mut self) {
        let next = match (self.ch.name.as_str(), self.level) {
            ("Moss", l) if l >= 8 => "fernando",
            ("Fernando", l) if l >= 16 => "thornhood",
            _ => return,
        };
        let from = self.ch.name.clone();
        self.ch = crate::character::parse_prompt(next);
        let to = self.ch.name.clone();
        self.set_banner(&format!("{from} evolved into {to}!"), "A new look, the same brave heart", 3.0, "#ffd54f");
        let (px, py) = (self.player.x, self.player.y);
        self.burst(
            px,
            py - 30.0,
            40,
            &["#ffd54f", "#ffffff", "#cdeac0", "#6aa35e"],
            Burst { kind: PKind::Leaf, min: 100.0, max: 360.0, g: 200.0, ..Default::default() },
        );
        self.add_hitstop(0.1);
        self.sfx("evolve");
        self.emit(Event::Evolved { name: to });
    }

    /// Break obstacle `i` (by a move, a dash or the shield): chips, score and XP.
    pub(crate) fn smash(&mut self, i: usize, why: &str) {
        if self.obstacles[i].dead || self.obstacles[i].kind.def().bouncy {
            return;
        }
        self.obstacles[i].dead = true;
        let o = &self.obstacles[i];
        let d = o.kind.def();
        let (cx, cy) = (o.x + o.w / 2.0, o.y + o.h / 2.0);
        let kind = if d.bird { PKind::Feather } else { PKind::Chip };
        self.burst(
            cx,
            cy,
            if d.bird { 16 } else { 22 },
            &d.wood,
            Burst { kind, min: 120.0, max: 420.0, g: 900.0, smin: 3.0, smax: 7.0, ..Default::default() },
        );
        self.burst(
            cx,
            cy,
            8,
            &["#ffffff", "#ffe58a"],
            Burst { kind: PKind::Spark, min: 60.0, max: 200.0, g: 0.0, life: 0.6, ..Default::default() },
        );
        self.smashed += 1;
        self.score += 25.0;
        self.gain_xp(if d.dummy { xp::DUMMY } else { xp::SMASH }, Some((cx, cy - 30.0)));
        self.add_shake(if d.dummy { 8.0 } else { 5.0 });
        self.add_hitstop(if why == "dash" { 0.035 } else { 0.05 });
        self.sfx("smash");
    }
}
