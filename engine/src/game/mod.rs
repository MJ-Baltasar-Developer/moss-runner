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
    /// Show the stage-cleared panel. `flawless`: no hits taken.
    Cleared { flawless: bool },
    /// Lost a heart (Easy mode) but still running.
    Hurt { hearts: u32 },
    /// Reached the checkpoint flag.
    Checkpoint,
    /// The runner evolved (Moss -> Fernando -> Thornhood).
    Evolved { name: String },
    /// Grimwing was beaten.
    BossDefeated,
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
    /// Snowy peaks: rolls towards you.
    Snowball,
    /// Snowy peaks: hangs overhead, drops as you get close and sticks in the ground.
    Icicle,
    /// Swamp: a bounce pad, never hurts. Land on it to spring up high.
    Mushroom,
    /// Swamp: long and low.
    Croc,
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
    /// Can't be smashed or hurt you; landing on it bounces you up.
    pub bouncy: bool,
    /// Falls when the player gets close.
    pub falls: bool,
}

impl ObKind {
    pub fn def(self) -> ObDef {
        let base = ObDef {
            w: 0.0,
            h: 0.0,
            y: None,
            hb: [0.0; 4],
            wood: ["", ""],
            ground: true,
            vx: 0.0,
            bird: false,
            dummy: false,
            bouncy: false,
            falls: false,
        };
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
            ObKind::Snowball => ObDef { w: 40.0, h: 40.0, hb: [6.0, 6.0, 4.0, 6.0], wood: ["#ffffff", "#cfe6f2"], vx: 110.0, ..base },
            ObKind::Icicle => ObDef {
                w: 30.0,
                h: 70.0,
                y: Some(-10.0),
                hb: [4.0, 8.0, 4.0, 8.0],
                wood: ["#e6f6ff", "#9fd3ea"],
                ground: false,
                falls: true,
                ..base
            },
            ObKind::Mushroom => ObDef { w: 58.0, h: 42.0, hb: [0.0, 6.0, 0.0, 6.0], wood: ["#e0583a", "#f7efe2"], bouncy: true, ..base },
            ObKind::Croc => ObDef { w: 78.0, h: 26.0, hb: [8.0, 6.0, 4.0, 10.0], wood: ["#4d7a3a", "#2f4f2c"], ..base },
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
            "snowball" => ObKind::Snowball,
            "icicle" => ObKind::Icicle,
            "mushroom" => ObKind::Mushroom,
            "croc" => ObKind::Croc,
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
    /// Icicles: falling speed, and whether it has dropped or landed.
    pub vy: f64,
    pub falling: bool,
    pub landed: bool,
    /// Mushrooms: squash after a bounce.
    pub boing: f64,
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
    /// This swoop comes in high (stay on the ground).
    pub high: bool,
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

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum RunMode {
    Normal,
    /// Straight to the stage 5 boss with every move learned. Not saved to best runs.
    Practice,
    /// One stage, the same course for everyone on the same day.
    Daily,
}

/// Input codes for recordings: `step << 3 | code`.
const IN_JUMP: u32 = 0;
const IN_RELEASE: u32 = 1;
const IN_MOVE0: u32 = 2;

/// The simulation runs in fixed steps of this length, whatever the screen's frame rate, so a
/// recording replays the same on every device.
pub const STEP: f64 = 1.0 / 120.0;

/// Most particles alive at once; the oldest go first.
pub const MAX_PARTICLES: usize = 900;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub state: State,
    pub mode: RunMode,
    pub practice: bool,
    pub daily: bool,
    /// Easy mode: three hearts and checkpoints.
    pub easy: bool,
    pub hearts: u32,
    pub max_hearts: u32,
    /// Distance of the checkpoint flag reached in this stage (0 = none yet).
    pub checkpoint: f64,
    pub t: f64,
    pub stage: u32,
    /// Which world: 0 forest, 1 snowy peaks, 2 swamp.
    pub biome: u32,
    /// Time-of-day palette index (0 morning ... 4 night).
    pub day: u32,
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
    /// Floating text ("+4 XP"). Other particles go to the renderer as a packed buffer.
    pub texts: Vec<Particle>,
    pub seeds: Vec<Seed>,
    pub shouts: Vec<Shout>,
    pub hazards: Vec<Hazard>,
    pub boss: Option<Boss>,
    pub boss_done: bool,
    pub charge: Option<Charge>,
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
    /// Fixed steps since the run started.
    pub steps: u32,
    #[serde(skip)]
    pub(crate) parts: Vec<Particle>,
    /// Took no hits this stage (for the "flawless" sticker).
    #[serde(skip)]
    flawless: bool,
    #[serde(skip)]
    after_t: f64,
    #[serde(skip)]
    prev_state: State,
    #[serde(skip)]
    pub ch: Traits,
    /// The description the run started with (evolutions change `ch` during a run).
    #[serde(skip)]
    prompt: String,
    #[serde(skip)]
    rng: Rng,
    #[serde(skip)]
    fx: Rng,
    #[serde(skip)]
    daily_seed: u32,
    #[serde(skip)]
    acc: f64,
    #[serde(skip)]
    recording: Vec<u32>,
    #[serde(skip)]
    script: Vec<u32>,
    #[serde(skip)]
    script_at: usize,
    #[serde(skip)]
    events: Vec<Event>,
    #[serde(skip)]
    next_id: u32,
    #[serde(skip)]
    palette: Vec<String>,
}

impl Game {
    pub fn new(seed: u64) -> Self {
        Game {
            state: State::Title,
            mode: RunMode::Normal,
            practice: false,
            daily: false,
            easy: false,
            hearts: 1,
            max_hearts: 1,
            checkpoint: 0.0,
            t: 0.0,
            stage: 1,
            biome: 0,
            day: 0,
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
            texts: vec![],
            seeds: vec![],
            shouts: vec![],
            hazards: vec![],
            boss: None,
            boss_done: false,
            charge: None,
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
            steps: 0,
            parts: vec![],
            flawless: true,
            after_t: 0.0,
            prev_state: State::Play,
            ch: parse_prompt("moss"),
            prompt: "moss".into(),
            rng: Rng::new(seed),
            fx: Rng::new(seed ^ 0x5eed),
            daily_seed: 0,
            acc: 0.0,
            recording: vec![],
            script: vec![],
            script_at: 0,
            events: vec![],
            next_id: 1,
            palette: vec![],
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

    pub(crate) fn emit(&mut self, e: Event) {
        self.events.push(e);
    }

    /// Set the runner from a description. Runs start from this (evolutions change it mid-run).
    pub fn set_character(&mut self, prompt: &str) -> &Traits {
        self.prompt = prompt.to_string();
        self.ch = parse_prompt(prompt);
        &self.ch
    }

    pub fn set_easy(&mut self, on: bool) {
        self.easy = on;
    }

    /// Where the nest is on screen.
    pub fn nest_screen_x(&self) -> f64 {
        PLAYER_X + (self.stage_len - self.dist)
    }

    // ---- runs and stages ----

    pub fn new_run(&mut self) {
        self.reset_run(1, RunMode::Normal);
        self.start_stage(1);
    }

    /// Jump straight to the stage 5 boss with every move learned. Not saved to best runs.
    pub fn start_practice(&mut self) {
        self.reset_run(7, RunMode::Practice);
        self.start_stage(5);
        self.dist = self.stage_len - BOSS_AT - 500.0;
        self.set_banner("Boss practice", "Stage 5 · all moves learned · not saved to best runs", 2.2, "#ffd54f");
    }

    /// Today's challenge: one stage built from `seed`, the same course for everyone.
    pub fn start_daily(&mut self, seed: u32) {
        self.daily_seed = seed;
        self.rng = Rng::new(seed as u64);
        self.fx = Rng::new(seed as u64 ^ 0x5eed);
        self.reset_run(4, RunMode::Daily);
        self.start_stage(3);
        self.biome = seed % 3;
        self.day = (seed / 3) % DAY_NAMES.len() as u32;
        self.stage_len = stage_len_px(4);
        let world = ["the forest", "the snowy peaks", "the swamp"][self.biome as usize];
        let sub = format!("Same course for everyone today · {} m through {world}", (self.stage_len / PX_PER_M).round());
        self.set_banner("Daily challenge", &sub, 2.6, "#ffd54f");
    }

    fn reset_run(&mut self, level: u32, mode: RunMode) {
        self.mode = mode;
        self.practice = mode == RunMode::Practice;
        self.daily = mode == RunMode::Daily;
        self.stage = 1;
        self.score = 0.0;
        self.orb_count = 0;
        self.smashed = 0;
        self.level = level;
        self.xp = 0;
        self.max_level = level;
        self.cds.clear();
        self.ch = parse_prompt(&self.prompt);
        self.max_hearts = if self.easy { 3 } else { 1 };
        self.steps = 0;
        self.acc = 0.0;
        self.recording.clear();
        self.checkpoint = 0.0;
    }

    /// Restart after losing. Easy mode retries the same stage from its checkpoint flag;
    /// otherwise the run starts over.
    pub fn restart_run(&mut self) {
        match self.mode {
            RunMode::Practice => self.start_practice(),
            RunMode::Daily => self.start_daily(self.daily_seed),
            RunMode::Normal if self.easy => {
                let (stage, cp) = (self.stage, self.checkpoint);
                self.score = self.stage_start;
                self.start_stage(stage);
                if cp > 0.0 {
                    self.dist = cp;
                    self.checkpoint = cp;
                    self.next_spawn = 500.0;
                }
            }
            RunMode::Normal => self.new_run(),
        }
    }

    pub fn next_stage(&mut self) {
        if self.daily {
            self.start_daily(self.daily_seed);
        } else {
            self.start_stage(self.stage + 1);
        }
    }

    pub fn start_stage(&mut self, s: u32) {
        self.stage = s;
        self.biome = biome_of(s);
        self.day = (s - 1) % DAY_NAMES.len() as u32;
        self.dist = 0.0;
        self.speed = self.base_speed() * 0.6;
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
        self.checkpoint = 0.0;
        self.hearts = self.max_hearts;
        self.flawless = true;
        self.player = Player::new();
        for m in MOVES {
            self.cds.insert(m.id, 0.0);
        }
        self.state = State::Play;
        self.events.push(Event::Started);
        let world = ["", " · Snowy Peaks", " · The Swamp"][self.biome as usize];
        let sub = format!(
            "{}{world} · {} m to the nest{}",
            DAY_NAMES[self.day as usize],
            (self.stage_len / PX_PER_M).round(),
            if is_boss_stage(s) { " · a boss guards it!" } else { "" }
        );
        self.set_banner(&format!("Stage {s}"), &sub, 2.2, CREAM);
    }

    /// Running speed for the stage before the end-of-stage speed-up; Easy mode is a bit slower.
    pub(crate) fn base_speed(&self) -> f64 {
        stage_speed(self.stage) * if self.easy { 0.85 } else { 1.0 }
    }

    // ---- input ----

    fn record(&mut self, code: u32) {
        if matches!(self.state, State::Play | State::Arrive) && self.script.is_empty() {
            self.recording.push(self.steps << 3 | code);
        }
    }

    /// Space, tap or click. Also restarts after a run and moves on after a cleared stage.
    pub fn jump_press(&mut self) {
        self.record(IN_JUMP);
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
        self.record(IN_RELEASE);
        self.held = false;
        if self.state == State::Play && self.player.vy < JUMP_CUT {
            self.player.vy = JUMP_CUT;
        }
    }

    /// Use move `i` (0-3).
    pub fn press_move(&mut self, i: usize) {
        self.record(IN_MOVE0 + i as u32);
        self.use_move(i);
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

    // ---- recordings (ghost replays) ----

    /// Every input of this run so far, as `step << 3 | code`.
    pub fn recording(&self) -> &[u32] {
        &self.recording
    }

    /// Play back a recording: its inputs are applied at the same steps they were made.
    pub fn set_script(&mut self, inputs: Vec<u32>) {
        self.script = inputs;
        self.script_at = 0;
    }

    fn apply_script(&mut self) {
        while let Some(&v) = self.script.get(self.script_at) {
            if v >> 3 != self.steps {
                break;
            }
            self.script_at += 1;
            match v & 7 {
                IN_JUMP => self.jump_press(),
                IN_RELEASE => self.jump_release(),
                c => self.use_move((c - IN_MOVE0) as usize),
            }
        }
    }

    // ---- time ----

    /// Advance the game by `dt` seconds of real time, in fixed steps.
    pub fn frame(&mut self, dt: f64) {
        if self.state == State::Paused || self.state == State::Title {
            return;
        }
        self.acc += dt.min(0.1);
        while self.acc >= STEP {
            self.acc -= STEP;
            self.step();
            if self.state == State::Paused || self.state == State::Title {
                break;
            }
        }
    }

    /// One fixed step. During hitstop the world freezes for a moment.
    pub fn step(&mut self) {
        if !self.script.is_empty() {
            self.apply_script();
        }
        if self.hitstop > 0.0 {
            self.hitstop -= STEP;
            self.t += STEP * 0.2;
        } else {
            self.update(STEP);
        }
        // keep the particle count bounded even while hitstop pauses the update
        if self.parts.len() > MAX_PARTICLES {
            let extra = self.parts.len() - MAX_PARTICLES;
            self.parts.drain(0..extra);
        }
        self.steps += 1;
    }

    // ---- particles for the renderer ----

    /// Floats per particle in `particle_buffer`.
    pub const PARTICLE_STRIDE: usize = 10;

    /// All particles packed as `[x, y, size, rot, life, max, kind, colour, ring radius, wing]`,
    /// so the renderer gets them without building hundreds of objects every frame.
    /// Colours are indices into `palette()`.
    pub fn particle_buffer(&mut self) -> Vec<f32> {
        let mut out = Vec::with_capacity(self.parts.len() * Self::PARTICLE_STRIDE);
        for i in 0..self.parts.len() {
            let c = self.color_index(i);
            let p = &self.parts[i];
            out.extend_from_slice(&[
                p.x as f32,
                p.y as f32,
                p.size as f32,
                p.rot as f32,
                p.life as f32,
                p.max as f32,
                p.kind as u8 as f32,
                c as f32,
                p.r.unwrap_or(0.0) as f32,
                p.snap.as_ref().map_or(0.0, |s| s.wing) as f32,
            ]);
        }
        out
    }

    fn color_index(&mut self, i: usize) -> usize {
        let c = &self.parts[i].color;
        match self.palette.iter().position(|p| p == c) {
            Some(k) => k,
            None => {
                self.palette.push(c.clone());
                self.palette.len() - 1
            }
        }
    }

    /// Colours used by `particle_buffer`; it only ever grows.
    pub fn palette(&self) -> &[String] {
        &self.palette
    }

    pub fn particle_count(&self) -> usize {
        self.parts.len()
    }
}

/// Which world a stage is in: five stages each of forest, snowy peaks and swamp, then round again.
pub fn biome_of(stage: u32) -> u32 {
    ((stage - 1) / 5) % 3
}
