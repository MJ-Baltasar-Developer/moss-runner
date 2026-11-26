//! Game constants. Moss's palette, XP curve and moves come from the Moss desktop pet
//! (the Claude Code mod: `hooks/register.tsx` and `pet/progress.py`).

use serde::Serialize;

/// Size of the game world in game units. The canvas is scaled to fit the window.
pub const W: f64 = 960.0;
pub const H: f64 = 420.0;
/// y of the ground line (the player's feet rest here).
pub const GROUND: f64 = 352.0;
/// World pixels per metre, for the "m to the nest" display and the score.
pub const PX_PER_M: f64 = 30.0;
pub const PLAYER_X: f64 = 170.0;

// Player physics
pub const GRAV: f64 = 2600.0;
pub const JUMP_V: f64 = -830.0;
/// Releasing the jump early cuts the upward speed to this, for small hops.
pub const JUMP_CUT: f64 = -330.0;
pub const GLIDE_VMAX: f64 = 115.0;
/// A jump pressed this long before landing still counts.
pub const BUFFER: f64 = 0.13;
/// A jump pressed this long after running off an edge still counts.
pub const COYOTE: f64 = 0.08;

pub const MOSS_BODY: &str = "#7fa86b";
pub const MOSS_DARK: &str = "#557d47";
pub const MOSS_BELLY: &str = "#eaf1d8";
pub const MOSS_RING: &str = "#3f5f36";
pub const MOSS_IRIS: &str = "#f4b23c";
pub const MOSS_ACORN: &str = "#8b5a2b";
pub const MOSS_SCARF: &str = "#e0603a";
pub const MOSS_BEAK: &str = "#f2c14e";
pub const MOSS_FEET: &str = "#e58b2e";
pub const CREAM: &str = "#faf0d6";

/// Moss's own XP curve: XP needed to go from `level` to `level + 1`.
pub fn xp_needed(level: u32) -> u32 {
    17 + 5 * level
}

pub mod xp {
    pub const ORB: u32 = 3;
    pub const GOLD: u32 = 10;
    pub const SMASH: u32 = 4;
    pub const DUMMY: u32 = 15;
    pub const NEST: u32 = 20;
    pub const BOSS: u32 = 40;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MoveId {
    BraveBird,
    DoubleTeam,
    SeedBomb,
    LeafStorm,
}

#[derive(Serialize, Clone, Copy, Debug)]
pub struct MoveDef {
    #[serde(skip)]
    pub kind: MoveId,
    pub id: &'static str,
    pub name: &'static str,
    pub key: &'static str,
    pub alt: &'static str,
    /// Level the move is learned at.
    pub lv: u32,
    /// Cooldown in seconds.
    pub cd: f64,
    pub desc: &'static str,
}

pub const MOVES: [MoveDef; 4] = [
    MoveDef {
        kind: MoveId::BraveBird,
        id: "brave-bird",
        name: "Brave Bird",
        key: "1",
        alt: "z",
        lv: 2,
        cd: 6.0,
        desc: "glowing dash through anything",
    },
    MoveDef {
        kind: MoveId::DoubleTeam,
        id: "double-team",
        name: "Double Team",
        key: "2",
        alt: "x",
        lv: 3,
        cd: 16.0,
        desc: "decoys take one hit for you",
    },
    MoveDef {
        kind: MoveId::SeedBomb,
        id: "seed-bomb",
        name: "Seed Bomb",
        key: "3",
        alt: "c",
        lv: 4,
        cd: 7.0,
        desc: "blasts the obstacles ahead",
    },
    MoveDef {
        kind: MoveId::LeafStorm,
        id: "leaf-storm",
        name: "Leaf Storm",
        key: "4",
        alt: "v",
        lv: 6,
        cd: 28.0,
        desc: "clears the whole screen",
    },
];

/// Names of the five time-of-day palettes, one per stage in turn (the colours live in the renderer).
pub const DAY_NAMES: [&str; 5] = ["Morning", "Noon", "Sunset", "Dusk", "Night"];

// Boss
pub const BOSS_NAME: &str = "Grimwing";
/// Distance before the nest where the boss blocks the way.
pub const BOSS_AT: f64 = 1700.0;
pub const BOSS_W: f64 = 120.0;
pub const BOSS_H: f64 = 46.0;
pub fn is_boss_stage(stage: u32) -> bool {
    stage.is_multiple_of(5)
}
/// Feather heights: hop over a low one, stay on the ground under a high one.
pub const LANE_LOW: f64 = GROUND - 20.0;
pub const LANE_HIGH: f64 = GROUND - 84.0;

// The nest
pub const NEST_STUMP_H: f64 = 58.0;
pub const NEST_SEAT: f64 = GROUND - NEST_STUMP_H - 8.0;

pub fn stage_speed(stage: u32) -> f64 {
    (300.0 + 32.0 * (stage as f64 - 1.0)).min(560.0)
}
pub fn stage_len_px(stage: u32) -> f64 {
    (500.0 + 100.0 * stage as f64) * PX_PER_M
}

/// Everything the JavaScript renderer needs to know about the rules, so there's one source of truth.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicConfig {
    pub w: f64,
    pub h: f64,
    pub ground: f64,
    pub px_per_m: f64,
    pub player_x: f64,
    pub moves: [MoveDef; 4],
    pub boss_name: &'static str,
    pub boss_at: f64,
    pub lane_low: f64,
    pub lane_high: f64,
    pub nest_stump_h: f64,
    pub nest_seat: f64,
}

pub fn public_config() -> PublicConfig {
    PublicConfig {
        w: W,
        h: H,
        ground: GROUND,
        px_per_m: PX_PER_M,
        player_x: PLAYER_X,
        moves: MOVES,
        boss_name: BOSS_NAME,
        boss_at: BOSS_AT,
        lane_low: LANE_LOW,
        lane_high: LANE_HIGH,
        nest_stump_h: NEST_STUMP_H,
        nest_seat: NEST_SEAT,
    }
}
