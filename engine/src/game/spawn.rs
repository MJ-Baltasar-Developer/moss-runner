//! Obstacles and orbs.

use super::*;

impl Game {
    /// How often each obstacle type turns up; later stages add harder ones.
    fn weights(stage: u32) -> Vec<(ObKind, f64)> {
        use ObKind::*;
        let mut w = vec![(Log, 3.0), (Bramble, 2.0), (Dummy, 1.2), (CrowHi, 1.0)];
        if stage >= 2 {
            w.extend([(Stump, 2.0), (CrowLow, 1.2), (Branch, 1.0)]);
        }
        if stage >= 3 {
            for (k, v) in w.iter_mut() {
                match k {
                    CrowHi => *v = 1.6,
                    Branch => *v = 1.4,
                    CrowLow => *v = 1.6,
                    Stump => *v = 2.4,
                    _ => {}
                }
            }
        }
        w
    }

    pub(crate) fn spawn_obstacle(&mut self) {
        let w = Self::weights(self.stage);
        let total: f64 = w.iter().map(|(_, v)| v).sum();
        let mut r = self.rng.f() * total;
        let mut kind = ObKind::Log;
        for (k, v) in &w {
            r -= v;
            if r <= 0.0 {
                kind = *k;
                break;
            }
        }
        let x = self.spawn_kind(kind, W + 30.0);
        let d = kind.def();

        // orb patterns that reward the right move
        if self.rng.chance(0.62) {
            let cx = x + d.w / 2.0;
            if d.ground {
                for i in 0..5 {
                    let dx = (i as f64 - 2.0) * 34.0;
                    self.add_orb(cx + dx, GROUND - 52.0 - 95.0 * (1.0 - (dx / 110.0).powi(2)) + d.h * 0.4, false);
                }
            } else if kind == ObKind::CrowLow {
                for i in 0..3 {
                    self.add_orb(cx - 30.0 + i as f64 * 30.0, GROUND - 160.0 - if i == 1 { 14.0 } else { 0.0 }, false);
                }
            } else {
                for i in 0..4 {
                    self.add_orb(cx - 54.0 + i as f64 * 36.0, GROUND - 26.0, false);
                }
            }
        }
        // gap until the next obstacle: always room to land and jump again
        let sp = if self.speed != 0.0 { self.speed } else { stage_speed(self.stage) };
        let tight = (0.95 - self.stage as f64 * 0.06).max(0.5);
        let mut gap = sp * self.rng.range(tight, tight + 0.85) + d.w + 120.0;
        if kind == ObKind::Branch || kind == ObKind::CrowHi {
            gap += 80.0;
        }
        self.next_spawn = gap;
        if self.rng.chance(0.25) {
            for i in 0..4 {
                let gold = self.rng.chance(0.06) && i == 3;
                self.add_orb(W + 30.0 + d.w + gap * 0.45 + i as f64 * 32.0, GROUND - 26.0, gold);
            }
        }
    }

    /// Put an obstacle of `kind` at `x`. Returns its x.
    pub fn spawn_kind(&mut self, kind: ObKind, x: f64) -> f64 {
        let d = kind.def();
        let t = self.rng.f() * 10.0;
        let id = self.next_id;
        self.next_id += 1;
        self.obstacles.push(Obstacle { id, kind, x, y: d.y.unwrap_or(GROUND - d.h), w: d.w, h: d.h, t, dead: false });
        x
    }

    pub(crate) fn add_orb(&mut self, x: f64, y: f64, gold: bool) {
        let gold = gold || self.rng.chance(0.05);
        let ph = self.rng.f() * 6.0;
        self.orbs.push(Orb { x, y, gold, ph, taken: false, pull: false });
    }
}
