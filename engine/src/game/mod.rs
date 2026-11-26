//! The game simulation. `Game` holds the whole state of a run; the renderer reads it through a
//! snapshot each frame and never changes it. Things the page has to react to (sounds, the
//! game-over and stage-cleared panels) are queued as `Event`s.

mod boss;
mod effects;
mod moves;
mod spawn;
mod update;

pub use effects::Burst;

use crate::character::{parse_prompt, Traits};
use crate::config::*;
use crate::rng::Rng;
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum State {
    Title,
    Play,
    /// Flying into the nest at the end of a stage.
    Arrive,
    Cleared,
    /// The short tumble after a hit, before the game-over panel.
    Dying,
    Dead,
    Paused,
}

/// Something the page should react to.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Event {
    /// Play a sound effect (`arg` is used by a few, such as the orb streak pitch).
    Sfx { name: &'static str, arg: f64 },
    /// A stage started: hide any panel.
    Started,
    /// The player was hit: save the run.
    Died,
    /// Show the game-over panel.
    Over,
    /// Show the stage-cleared panel.
    Cleared,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub x: f64,
    pub y: f64,
    pub vy: f64,
    pub on_ground: bool,
    pub buffer: f64,
    pub coyote: f64,
    pub run_ph: f64,
    pub squash: f64,
    pub gliding: bool,
    pub rot: f64,
}

impl Player {
    fn new() -> Self {
        Player {
            x: PLAYER_X,
            y: GROUND,
            vy: 0.0,
            on_ground: true,
            buffer: 0.0,
            coyote: 0.0,
            run_ph: 0.0,
            squash: 0.0,
            gliding: false,
            rot: 0.0,
        }
    }
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ObKind {
    Log,
    Bramble,
    Stump,
    Dummy,
    CrowLow,
    CrowHi,
    Branch,
}

/// Size, hitbox and behaviour of each obstacle type.
pub struct ObDef {
    pub w: f64,
    pub h: f64,
    /// Fixed top y for flying or hanging obstacles; ground obstacles sit on the ground.
    pub y: Option<f64>,
    /// Hitbox insets: top, right, bottom, left.
    pub hb: [f64; 4],
    /// Colours of the chips or feathers it breaks into.
    pub wood: [&'static str; 2],
    pub ground: bool,
    /// Extra speed towards the player (crows fly at you).
    pub vx: f64,
    pub bird: bool,
    /// Moss's training dummy from the pet: worth more XP.
    pub dummy: bool,
}

impl ObKind {
    pub fn def(self) -> ObDef {
        let base = ObDef { w: 0.0, h: 0.0, y: None, hb: [0.0; 4], wood: ["", ""], ground: true, vx: 0.0, bird: false, dummy: false };
        match self {
            ObKind::Log => ObDef { w: 54.0, h: 30.0, hb: [4.0, 6.0, 8.0, 6.0], wood: ["#8b5a2b", "#5e3b1a"], ..base },
            ObKind::Bramble => ObDef { w: 64.0, h: 38.0, hb: [8.0, 10.0, 16.0, 10.0], wood: ["#3f6b3a", "#7a3d6b"], ..base },
            ObKind::Stump => ObDef { w: 42.0, h: 62.0, hb: [4.0, 4.0, 8.0, 4.0], wood: ["#8b5a2b", "#c2915a"], ..base },
            ObKind::Dummy => ObDef { w: 38.0, h: 72.0, hb: [8.0, 6.0, 16.0, 6.0], wood: ["#c9a96b", "#8b5a2b"], dummy: true, ..base },
            ObKind::CrowLow => ObDef {
                w: 44.0,
                h: 26.0,
                y: Some(GROUND - 64.0),
                hb: [6.0, 6.0, 12.0, 10.0],
                wood: ["#2c2c34", "#4a4a58"],
                ground: false,
                vx: 70.0,
                bird: true,
                ..base
            },
            ObKind::CrowHi => ObDef {
                w: 44.0,
                h: 26.0,
                y: Some(GROUND - 132.0),
                hb: [6.0, 6.0, 12.0, 10.0],
                wood: ["#2c2c34", "#4a4a58"],
                ground: false,
                vx: 70.0,
                bird: true,
                ..base
            },
            ObKind::Branch => ObDef {
                w: 84.0,
                h: GROUND - 94.0,
                y: Some(0.0),
                hb: [10.0, 0.0, 20.0, 4.0],
                wood: ["#5e3b1a", "#5f9150"],
                ground: false,
                ..base
            },
        }
    }

    pub fn from_name(name: &str) -> Option<ObKind> {
        Some(match name {
            "log" => ObKind::Log,
            "bramble" => ObKind::Bramble,
            "stump" => ObKind::Stump,
            "dummy" => ObKind::Dummy,
            "crowLow" => ObKind::CrowLow,
            "crowHi" => ObKind::CrowHi,
            "branch" => ObKind::Branch,
            _ => return None,
        })
    }
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Obstacle {
    #[serde(skip)]
    pub id: u32,
    #[serde(rename = "type")]
    pub kind: ObKind,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub t: f64,
    pub dead: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct Orb {
    pub x: f64,
    pub y: f64,
    pub gold: bool,
    pub ph: f64,
    pub taken: bool,
    /// Pulled towards the player by Leaf Storm.
    pub pull: bool,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum PKind {
    Dot,
    Leaf,
    Feather,
    Chip,
    Spark,
    Ring,
    Text,
    /// A faded copy of the player left behind by Brave Bird.
    After,
}

#[derive(Serialize, Clone, Debug)]
pub struct Snap {
    pub wing: f64,
    pub run: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct Particle {
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub life: f64,
    pub max: f64,
    pub size: f64,
    pub color: String,
    pub g: f64,
    pub kind: PKind,
    pub rot: f64,
    pub vr: f64,
    pub drag: f64,
    /// Moves with the world (true) or stays put on screen (false).
    pub scroll: bool,
    pub text: Option<String>,
    /// Ring radius.
    pub r: Option<f64>,
    pub snap: Option<Snap>,
}

impl Particle {
    fn plain(x: f64, y: f64, kind: PKind, life: f64, color: &str) -> Self {
        Particle {
            x,
            y,
            vx: 0.0,
            vy: 0.0,
            life,
            max: life,
            size: 0.0,
            color: color.into(),
            g: 0.0,
            kind,
            rot: 0.0,
            vr: 0.0,
            drag: 0.0,
            scroll: true,
            text: None,
            r: None,
            snap: None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SeedTarget {
    None,
    Boss,
    Obstacle(u32),
}

#[derive(Serialize, Clone, Debug)]
pub struct Seed {
    pub x0: f64,
    pub y0: f64,
    pub x: f64,
    pub y: f64,
    pub t: f64,
    pub dur: f64,
    pub fx: f64,
    pub fy: f64,
    #[serde(skip)]
    pub tgt: SeedTarget,
    #[serde(skip)]
    pub thrown: bool,
    #[serde(skip)]
    pub done: bool,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Lane {
    Low,
    High,
}

impl Lane {
    pub fn y(self) -> f64 {
        match self {
            Lane::Low => LANE_LOW,
            Lane::High => LANE_HIGH,
        }
    }
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum HKind {
    Feather,
    /// Shockwave from a stomp.
    Wave,
    /// Golden acorn the boss drops; run into it to bat it back.
    Acorn,
    /// A batted-back acorn flying at the boss.
    Shot,
}

#[derive(Serialize, Clone, Debug)]
pub struct Hazard {
    pub kind: HKind,
    pub lane: Option<Lane>,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub vx: f64,
    pub t: f64,
    pub dead: bool,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Enter,
    Idle,
    Volley,
    Swoop,
    Stomp,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Rise,
    Dive,
    Drop,
    Bounce,
    Lift,
}

/// Grimwing the Crow King.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Boss {
    /// Which boss fight this is (1 on stage 5, 2 on stage 10...).
    pub n: u32,
    pub hp: u32,
    pub max: u32,
    pub x: f64,
    pub y: f64,
    pub home_x: f64,
    pub home_y: f64,
    pub t: f64,
    pub mode: Mode,
    pub mode_t: f64,
    /// Time until the next attack while idle.
    pub next: f64,
    pub hurt: f64,
    /// Warning time before the attack lands (the renderer draws the telegraph).
    pub tele: f64,
    pub last: Option<Mode>,
    pub dying: bool,
    pub dying_t: f64,
    pub enraged: bool,
    pub rot: f64,
    pub flap: f64,
    pub phase: Option<Phase>,
    /// Feathers still to fire in this volley.
    pub pattern: Vec<Lane>,
    pub shot_t: f64,
    pub swoops: i32,
    pub waves: i32,
    pub vy: f64,
    pub recoil: f64,
    pub acorn_later: bool,
}

#[derive(Serialize, Clone, Debug)]
pub struct Banner {
    pub title: String,
    pub sub: String,
    pub t: f64,
    pub dur: f64,
    pub color: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Shout {
    pub text: String,
    pub t: f64,
    pub dur: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct Shield {
    pub t: f64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Storm {
    pub x: f64,
    pub t: f64,
    pub hit_boss: bool,
}

/// Brave Bird aimed at the boss: fly to him, hit, fly back.
#[derive(Serialize, Clone, Debug)]
pub struct Charge {
    pub t: f64,
    pub y0: f64,
    pub hit: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Arrive {
    pub t: f64,
    pub x0: f64,
    pub y0: f64,
    pub done: bool,
    pub done_t: f64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub state: State,
    pub t: f64,
    pub stage: u32,
    /// Distance run in this stage, in world pixels.
    pub dist: f64,
    /// Total scroll, for the parallax background.
    pub scroll: f64,
    pub speed: f64,
    pub stage_len: f64,
    pub score: f64,
    pub orb_count: u32,
    pub smashed: u32,
    pub level: u32,
    pub xp: u32,
    pub max_level: u32,
    pub player: Player,
    pub obstacles: Vec<Obstacle>,
    pub orbs: Vec<Orb>,
    pub parts: Vec<Particle>,
    pub seeds: Vec<Seed>,
    pub shouts: Vec<Shout>,
    pub hazards: Vec<Hazard>,
    pub boss: Option<Boss>,
    pub boss_done: bool,
    pub charge: Option<Charge>,
    /// Boss practice: not saved to best runs.
    pub practice: bool,
    pub shake: f64,
    pub hitstop: f64,
    pub banner: Option<Banner>,
    /// Cooldown left per move id.
    pub cds: BTreeMap<&'static str, f64>,
    /// Flash on a move slot: positive when just learned, negative when pressed too early.
    pub unlock_flash: BTreeMap<&'static str, f64>,
    /// Brave Bird time left.
    pub dash: f64,
    pub shield: Option<Shield>,
    /// Invulnerability time left.
    pub inv: f64,
    pub storm: Option<Storm>,
    pub next_spawn: f64,
    pub dead_t: f64,
    pub arrive: Option<Arrive>,
    /// Jump held (gliding).
    pub held: bool,
    pub orb_streak: u32,
    pub orb_streak_t: f64,
    pub stage_start: f64,
    pub level_cheer: f64,
    #[serde(skip)]
    after_t: f64,
    #[serde(skip)]
    prev_state: State,
    #[serde(skip)]
    pub ch: Traits,
    #[serde(skip)]
    rng: Rng,
    #[serde(skip)]
    events: Vec<Event>,
    #[serde(skip)]
    next_id: u32,
}

impl Game {
    pub fn new(seed: u64) -> Self {
        Game {
            state: State::Title,
            t: 0.0,
            stage: 1,
            dist: 0.0,
            scroll: 0.0,
            speed: 0.0,
            stage_len: 0.0,
            score: 0.0,
            orb_count: 0,
            smashed: 0,
            level: 1,
            xp: 0,
            max_level: 1,
            player: Player::new(),
            obstacles: vec![],
            orbs: vec![],
            parts: vec![],
            seeds: vec![],
            shouts: vec![],
            hazards: vec![],
            boss: None,
            boss_done: false,
            charge: None,
            practice: false,
            shake: 0.0,
            hitstop: 0.0,
            banner: None,
            cds: BTreeMap::new(),
            unlock_flash: BTreeMap::new(),
            dash: 0.0,
            shield: None,
            inv: 0.0,
            storm: None,
            next_spawn: 0.0,
            dead_t: 0.0,
            arrive: None,
            held: false,
            orb_streak: 0,
            orb_streak_t: 0.0,
            stage_start: 0.0,
            level_cheer: 0.0,
            after_t: 0.0,
            prev_state: State::Play,
            ch: parse_prompt("moss"),
            rng: Rng::new(seed),
            events: vec![],
            next_id: 1,
        }
    }

    /// Hand over the queued events and clear the queue.
    pub fn take_events(&mut self) -> Vec<Event> {
        std::mem::take(&mut self.events)
    }

    pub(crate) fn sfx(&mut self, name: &'static str) {
        self.events.push(Event::Sfx { name, arg: 0.0 });
    }

    pub(crate) fn sfx_arg(&mut self, name: &'static str, arg: f64) {
        self.events.push(Event::Sfx { name, arg });
    }

    pub fn set_character(&mut self, prompt: &str) -> &Traits {
        self.ch = parse_prompt(prompt);
        &self.ch
    }

    /// Where the nest is on screen.
    pub fn nest_screen_x(&self) -> f64 {
        PLAYER_X + (self.stage_len - self.dist)
    }

    // ---- runs and stages ----

    pub fn new_run(&mut self) {
        self.reset_run(1, false);
        self.start_stage(1);
    }

    /// Jump straight to the stage 5 boss with every move learned. Not saved to best runs.
    pub fn start_practice(&mut self) {
        self.reset_run(7, true);
        self.start_stage(5);
        self.dist = self.stage_len - BOSS_AT - 500.0;
        self.set_banner("Boss practice", "Stage 5 · all moves learned · not saved to best runs", 2.2, "#ffd54f");
    }

    fn reset_run(&mut self, level: u32, practice: bool) {
        self.stage = 1;
        self.score = 0.0;
        self.orb_count = 0;
        self.smashed = 0;
        self.level = level;
        self.xp = 0;
        self.max_level = level;
        self.cds.clear();
        self.practice = practice;
    }

    pub fn restart_run(&mut self) {
        if self.practice {
            self.start_practice()
        } else {
            self.new_run()
        }
    }

    pub fn next_stage(&mut self) {
        self.start_stage(self.stage + 1);
    }

    pub fn start_stage(&mut self, s: u32) {
        self.stage = s;
        self.dist = 0.0;
        self.speed = stage_speed(s) * 0.6;
        self.stage_len = stage_len_px(s);
        self.obstacles.clear();
        self.orbs.clear();
        self.seeds.clear();
        self.shouts.clear();
        self.hazards.clear();
        self.dash = 0.0;
        self.shield = None;
        self.inv = 0.0;
        self.storm = None;
        self.next_spawn = 700.0;
        self.arrive = None;
        self.banner = None;
        self.dead_t = 0.0;
        self.stage_start = self.score;
        self.orb_streak = 0;
        self.boss = None;
        self.boss_done = false;
        self.charge = None;
        self.player = Player::new();
        for m in MOVES {
            self.cds.insert(m.id, 0.0);
        }
        self.state = State::Play;
        self.events.push(Event::Started);
        let sub = format!(
            "{} · {} m to the nest{}",
            DAY_NAMES[((s - 1) as usize) % DAY_NAMES.len()],
            (self.stage_len / PX_PER_M).round(),
            if is_boss_stage(s) { " · a boss guards it!" } else { "" }
        );
        self.set_banner(&format!("Stage {s}"), &sub, 2.2, CREAM);
    }

    // ---- input ----

    /// Space, tap or click. Also restarts after a run and moves on after a cleared stage.
    pub fn jump_press(&mut self) {
        match self.state {
            State::Play => {
                self.held = true;
                self.player.buffer = BUFFER;
            }
            State::Dying if self.dead_t > 0.3 => {
                self.state = State::Dead;
                self.restart_run();
            }
            State::Dead if self.dead_t > 0.3 => self.restart_run(),
            State::Cleared => self.next_stage(),
            State::Paused => self.toggle_pause(),
            _ => {}
        }
    }

    /// Letting go early makes a small hop.
    pub fn jump_release(&mut self) {
        self.held = false;
        if self.state == State::Play && self.player.vy < JUMP_CUT {
            self.player.vy = JUMP_CUT;
        }
    }

    pub fn toggle_pause(&mut self) {
        match self.state {
            State::Play | State::Arrive => {
                self.prev_state = self.state;
                self.state = State::Paused;
            }
            State::Paused => self.state = self.prev_state,
            _ => {}
        }
    }

    pub fn to_title(&mut self) {
        self.state = State::Title;
    }

    /// Advance the game by `dt` seconds. During hitstop the world freezes for a moment.
    pub fn frame(&mut self, dt: f64) {
        if self.state == State::Paused || self.state == State::Title {
            return;
        }
        if self.hitstop > 0.0 {
            self.hitstop -= dt;
            self.t += dt * 0.2;
        } else {
            self.update(dt);
        }
    }
}
