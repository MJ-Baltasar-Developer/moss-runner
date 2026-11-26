//! # Moss Run engine
//!
//! The game's rules and state, written in Rust and compiled to WebAssembly. The browser side
//! (`web/js`) only draws, plays sounds and forwards input:
//!
//! ```text
//!   input ──► Engine (Rust/Wasm) ──► snapshot() ──► renderer (Canvas 2D)
//!                    │
//!                    └──► take_events() ──► sounds, panels, saved scores
//! ```
//!
//! The simulation is deterministic for a given seed, which is what makes it testable with
//! `cargo test` without a browser.

pub mod character;
pub mod color;
pub mod config;
pub mod game;
pub mod rng;

use serde::Serialize;
use wasm_bindgen::prelude::*;

fn to_js<T: Serialize + ?Sized>(v: &T) -> JsValue {
    // json_compatible: maps become plain objects, which is what the renderer expects
    v.serialize(&serde_wasm_bindgen::Serializer::json_compatible()).unwrap_or(JsValue::NULL)
}

/// Parse a character description (used by the title-screen preview).
#[wasm_bindgen(js_name = parsePrompt)]
pub fn parse_prompt(text: &str) -> JsValue {
    to_js(&character::parse_prompt(text))
}

/// Screen size, moves and other rule constants the renderer needs.
#[wasm_bindgen]
pub fn config() -> JsValue {
    to_js(&config::public_config())
}

/// XP needed to go from `level` to `level + 1`.
#[wasm_bindgen(js_name = xpNeeded)]
pub fn xp_needed(level: u32) -> u32 {
    config::xp_needed(level)
}

/// The game, as seen from JavaScript.
#[wasm_bindgen]
pub struct Engine {
    game: game::Game,
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Engine {
        Engine { game: game::Game::new(seed as u64) }
    }

    /// Set the runner from a description. Returns its traits for drawing.
    #[wasm_bindgen(js_name = setCharacter)]
    pub fn set_character(&mut self, prompt: &str) -> JsValue {
        to_js(self.game.set_character(prompt))
    }

    /// Advance the game by `dt` seconds.
    pub fn frame(&mut self, dt: f64) {
        self.game.frame(dt);
    }

    /// The whole visible state, for the renderer.
    pub fn snapshot(&self) -> JsValue {
        to_js(&self.game)
    }

    /// Sounds and panel changes since the last call.
    #[wasm_bindgen(js_name = takeEvents)]
    pub fn take_events(&mut self) -> JsValue {
        to_js(&self.game.take_events())
    }

    #[wasm_bindgen(js_name = newRun)]
    pub fn new_run(&mut self) {
        self.game.new_run();
    }
    #[wasm_bindgen(js_name = startPractice)]
    pub fn start_practice(&mut self) {
        self.game.start_practice();
    }
    #[wasm_bindgen(js_name = restartRun)]
    pub fn restart_run(&mut self) {
        self.game.restart_run();
    }
    #[wasm_bindgen(js_name = nextStage)]
    pub fn next_stage(&mut self) {
        self.game.next_stage();
    }
    #[wasm_bindgen(js_name = jumpPress)]
    pub fn jump_press(&mut self) {
        self.game.jump_press();
    }
    #[wasm_bindgen(js_name = jumpRelease)]
    pub fn jump_release(&mut self) {
        self.game.jump_release();
    }
    #[wasm_bindgen(js_name = useMove)]
    pub fn use_move(&mut self, i: usize) {
        self.game.use_move(i);
    }
    #[wasm_bindgen(js_name = togglePause)]
    pub fn toggle_pause(&mut self) {
        self.game.toggle_pause();
    }
    #[wasm_bindgen(js_name = toTitle)]
    pub fn to_title(&mut self) {
        self.game.to_title();
    }
    /// Current state name ("title", "play", "paused"...), without a full snapshot.
    pub fn state(&self) -> String {
        format!("{:?}", self.game.state).to_lowercase()
    }

    // ---- hooks for the browser tests ----

    #[wasm_bindgen(js_name = debugGainXp)]
    pub fn debug_gain_xp(&mut self, n: u32) {
        self.game.gain_xp(n, None);
    }
    #[wasm_bindgen(js_name = debugInvincible)]
    pub fn debug_invincible(&mut self, seconds: f64) {
        self.game.inv = seconds;
    }
    #[wasm_bindgen(js_name = debugSpawn)]
    pub fn debug_spawn(&mut self, kind: &str, x: f64) -> bool {
        match game::ObKind::from_name(kind) {
            Some(k) => {
                self.game.spawn_kind(k, x);
                true
            }
            None => false,
        }
    }
    /// Jump to `metres_left` metres before the nest.
    #[wasm_bindgen(js_name = debugSkipTo)]
    pub fn debug_skip_to(&mut self, metres_left: f64) {
        self.game.dist = self.game.stage_len - metres_left * config::PX_PER_M;
        self.game.obstacles.clear();
    }
    #[wasm_bindgen(js_name = debugHurtBoss)]
    pub fn debug_hurt_boss(&mut self, n: u32) {
        if let Some((x, y)) = self.game.boss.as_ref().map(|b| (b.x, b.y)) {
            self.game.hurt_boss(n, x, y);
        }
    }
}
