//! The character generator: turns a description such as "blue robot with sunglasses" or
//! "pink cat with a gold crown" into the traits the renderer draws.
//!
//! It's a small keyword parser. Colour words attach to the next body part named after them
//! ("red scarf", "gold eyes"), or to the body if none follows. Creature, hat, neckwear and face
//! words pick the parts, and modifiers ("tiny", "chonky", "spooky", "fire") tweak them.

use crate::color::{hash_str, shade};
use crate::config::*;
use serde::Serialize;

/// Everything the renderer needs to draw a character. Serialized with the same field names as
/// the renderer's JavaScript expects.
#[derive(Serialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Traits {
    pub name: String,
    pub creature: String,
    pub tags: Vec<String>,
    /// Body colour as described ("rainbow" for rainbow bodies); `base` is the colour to draw with.
    pub body: String,
    pub base: String,
    pub rainbow: bool,
    pub dark_col: Option<String>,
    pub belly: bool,
    pub belly_col: Option<String>,
    pub ring: Option<String>,
    pub iris: Option<String>,
    pub accent: String,
    pub feet_col: String,
    pub beak_col: String,
    pub wing_col: Option<String>,
    // body parts
    pub shape: String,
    pub ears: Option<String>,
    pub eyes: String,
    pub mouth: String,
    pub wings: bool,
    pub extra_wings: bool,
    pub feet: Option<String>,
    pub tail: Option<String>,
    pub shiny: bool,
    pub panel: bool,
    pub panda: bool,
    pub alpha: Option<f64>,
    // accessories
    pub hat: Option<String>,
    pub hat_col: Option<String>,
    pub plume: bool,
    pub neck: Option<String>,
    pub neck_col: Option<String>,
    pub face: Option<String>,
    pub face_col: Option<String>,
    pub pattern: Option<String>,
    pub glow: Option<String>,
    // proportions and mood
    pub size: f64,
    pub wide: f64,
    pub tall: f64,
    pub angry: bool,
    pub sleepy: bool,
    pub cyclops: bool,
    pub wink: bool,
    /// Seed for per-character details such as speckle placement.
    pub seed: u32,
    /// Pitch multiplier for the character's cry.
    pub voice: f64,
}

fn color(w: &str) -> Option<&'static str> {
    Some(match w {
        "red" => "#d9483b",
        "crimson" => "#b8303a",
        "scarlet" => "#d9363b",
        "orange" => "#e8892e",
        "amber" => "#f4b23c",
        "yellow" => "#f2c94c",
        "gold" | "golden" => "#e0b23a",
        "green" => "#6fae5a",
        "mossy" => "#7fa86b",
        "lime" => "#9ccc4a",
        "mint" => "#8fd6b4",
        "teal" => "#3aa39a",
        "cyan" | "aqua" => "#4cc3d9",
        "blue" => "#4a7fd4",
        "navy" => "#2c4a7a",
        "sky" => "#7cc0ea",
        "purple" | "violet" => "#8a5cc2",
        "lavender" => "#b49ae0",
        "pink" => "#ee8fb4",
        "magenta" => "#c94ca0",
        "rose" => "#e07a92",
        "white" => "#f2f0ea",
        "black" => "#2c2c34",
        "gray" | "grey" => "#8f969c",
        "silver" => "#b9c0c7",
        "brown" => "#8b5a2b",
        "tan" => "#c9a06b",
        "cream" => "#efe3c2",
        "beige" => "#e3d2ae",
        "rainbow" => "rainbow",
        "shadow" => "#3a3550",
        _ => return None,
    })
}

fn creature_word(w: &str) -> Option<&'static str> {
    Some(match w {
        "owl" | "owlet" => "owl",
        "bird" | "birdie" | "chick" | "duck" | "duckling" | "sparrow" | "parrot" | "robin" => "bird",
        "cat" | "kitten" | "kitty" => "cat",
        "fox" => "fox",
        "frog" | "toad" => "frog",
        "slime" | "blob" | "jelly" => "slime",
        "robot" | "bot" | "droid" | "android" | "mech" => "robot",
        "ghost" | "spirit" | "phantom" => "ghost",
        "dragon" | "lizard" | "dino" | "dinosaur" => "dragon",
        "bunny" | "rabbit" => "bunny",
        "bear" | "teddy" => "bear",
        "panda" => "panda",
        "penguin" => "penguin",
        "mouse" | "rat" | "hamster" => "mouse",
        _ => return None,
    })
}

fn hat_word(w: &str) -> Option<&'static str> {
    Some(match w {
        "hat" | "tophat" | "top" => "top",
        "crown" | "tiara" | "king" | "queen" | "princess" | "prince" | "royal" => "crown",
        "wizard" | "witch" | "mage" | "magician" => "wizard",
        "cap" | "baseball" => "cap",
        "acorn" => "acorn",
        "bow" | "ribbon" => "bow",
        "halo" | "angel" => "halo",
        "horns" | "horned" | "devil" => "horns",
        "headphones" | "dj" => "headphones",
        "beanie" | "toque" => "beanie",
        _ => return None,
    })
}

fn neck_word(w: &str) -> Option<&'static str> {
    Some(match w {
        "scarf" => "scarf",
        "cape" | "cloak" | "hero" | "superhero" => "cape",
        "bowtie" | "tuxedo" | "fancy" => "bowtie",
        _ => return None,
    })
}

fn face_word(w: &str) -> Option<&'static str> {
    Some(match w {
        "glasses" | "spectacles" | "nerd" | "nerdy" => "glasses",
        "sunglasses" | "shades" | "cool" => "sunglasses",
        "mask" | "ninja" | "masked" | "bandit" => "mask",
        "eyepatch" | "pirate" => "eyepatch",
        _ => return None,
    })
}

/// Which part a colour word applies to when one of these follows it.
fn slot_word(w: &str) -> Option<&'static str> {
    Some(match w {
        "hat" | "tophat" | "cap" | "crown" | "tiara" | "beanie" | "bow" | "ribbon" | "halo" | "horns" | "headphones" => "hat",
        "scarf" | "cape" | "cloak" | "bowtie" | "tie" => "neck",
        "glasses" | "sunglasses" | "shades" | "mask" => "face",
        "eyes" | "eye" => "iris",
        "belly" | "tummy" => "belly",
        "wings" | "wing" => "wing",
        "ears" => "body",
        "beak" => "beak",
        "feet" => "feet",
        "aura" | "glow" => "glow",
        _ => return None,
    })
}

const STOP_WORDS: &[&str] = &[
    "a", "an", "the", "with", "and", "in", "on", "of", "wearing", "has", "have", "who", "that", "is", "very", "super", "little", "cute",
    "my", "some", "its", "his", "her", "their", "plus", "like", "eyes", "eye", "belly", "tummy", "wings", "wing", "ears", "beak", "feet",
    "tail", "one", "eyed", "hat", "top", "tie", "boots", "aura", "glow", "dark", "deep", "light", "pale", "pastel", "bright", "neon",
    "tall", "long",
];
const MOD_WORDS: &[&str] = &[
    "spots", "spotted", "spotty", "dotted", "dots", "polka", "stripes", "striped", "stripy", "tiger", "tabby", "speckled", "speckles",
    "freckles", "freckled", "glowing", "sparkly", "sparkle", "shiny", "magic", "magical", "radiant", "cosmic", "tiny", "small", "mini",
    "baby", "smol", "big", "huge", "giant", "large", "chonky", "chubby", "fat", "round", "chunky", "plump", "fluffy", "lanky", "slim",
    "skinny", "square", "boxy", "cube", "cubic", "blocky", "angry", "grumpy", "fierce", "evil", "mad", "sleepy", "tired", "lazy", "chill",
    "cyclops", "spooky", "haunted", "fire", "flame", "fiery", "lava", "ice", "icy", "frost", "frozen", "snow", "fairy", "winged", "angel",
];

/// The parts a creature starts with. `None` means the creature doesn't set that part.
#[derive(Default)]
struct Base {
    body: &'static str,
    ears: Option<&'static str>,
    eyes: &'static str,
    mouth: &'static str,
    wings: Option<bool>,
    feet: Option<&'static str>,
    shape: &'static str,
    belly: Option<bool>,
    belly_col: Option<&'static str>,
    tail: Option<&'static str>,
    shiny: bool,
    panel: bool,
    iris: Option<&'static str>,
    alpha: Option<f64>,
    panda: bool,
    dark_col: Option<&'static str>,
}

fn base(creature: &str) -> Base {
    let critter = |body, ears, mouth, tail| Base {
        body,
        ears,
        eyes: "cute",
        mouth,
        tail,
        feet: Some("paw"),
        shape: "round",
        belly: Some(true),
        ..Default::default()
    };
    match creature {
        "bird" => Base {
            body: "#f2c94c",
            eyes: "owl",
            mouth: "beak",
            wings: Some(true),
            feet: Some("talon"),
            shape: "round",
            belly: Some(true),
            ..Default::default()
        },
        "cat" => critter("#9a9ca3", Some("cat"), "cat", Some("cat")),
        "fox" => Base { belly_col: Some("#f7efe2"), ..critter("#e07f36", Some("fox"), "cat", Some("fox")) },
        "frog" => Base { belly_col: Some("#d8ecb8"), ..critter("#6fae5a", Some("frog"), "frog", None) },
        "slime" => Base { body: "#4fc0a8", eyes: "cute", mouth: "smile", shape: "slime", shiny: true, ..Default::default() },
        "robot" => Base {
            body: "#9aa4ad",
            ears: Some("antenna"),
            eyes: "robot",
            mouth: "grill",
            feet: Some("block"),
            shape: "square",
            panel: true,
            iris: Some("#5fe3f0"),
            ..Default::default()
        },
        "ghost" => Base { body: "#eef0f7", eyes: "ghost", mouth: "o", shape: "ghost", alpha: Some(0.9), ..Default::default() },
        "dragon" => Base { belly_col: Some("#f2d39a"), wings: Some(true), ..critter("#c8483a", Some("horns"), "dragon", Some("dragon")) },
        "bunny" => critter("#f1ece4", Some("bunny"), "cat", Some("puff")),
        "bear" => critter("#8b5e3c", Some("bear"), "cat", None),
        "panda" => Base { belly: None, panda: true, dark_col: Some("#2c2c34"), ..critter("#f4f4f0", Some("bear"), "cat", None) },
        "penguin" => Base {
            body: "#2f3440",
            belly_col: Some("#f4f4f0"),
            eyes: "cute",
            mouth: "beak",
            wings: Some(true),
            feet: Some("talon"),
            shape: "round",
            belly: Some(true),
            ..Default::default()
        },
        "mouse" => critter("#a9a4a0", Some("mouse"), "cat", Some("cat")),
        _ => Base {
            body: MOSS_BODY,
            ears: Some("tufts"),
            eyes: "owl",
            mouth: "beak",
            wings: Some(true),
            feet: Some("talon"),
            shape: "owl",
            belly: Some(true),
            ..Default::default()
        },
    }
}

fn voice(creature: &str) -> f64 {
    match creature {
        "bird" => 1.15,
        "cat" => 0.55,
        "fox" => 0.6,
        "frog" => 0.3,
        "slime" => 0.7,
        "robot" => 0.5,
        "ghost" => 0.35,
        "dragon" => 0.22,
        "bunny" => 1.05,
        "bear" => 0.35,
        "panda" => 0.38,
        "penguin" => 0.7,
        "mouse" => 1.3,
        _ => 1.0,
    }
}

fn s(v: &str) -> Option<String> {
    Some(v.to_string())
}

fn cap(w: &str) -> String {
    let mut c = w.chars();
    match c.next() {
        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
        None => String::new(),
    }
}

/// Lower-case words: anything that isn't a letter, digit, space or hyphen is dropped.
fn tokenize(text: &str) -> Vec<String> {
    let cleaned: String =
        text.chars().map(|c| if c.is_ascii_lowercase() || c.is_ascii_digit() || c.is_whitespace() || c == '-' { c } else { ' ' }).collect();
    cleaned.split(|c: char| c.is_whitespace() || c == '-').filter(|w| !w.is_empty()).map(String::from).collect()
}

/// "one eye", "one-eyed"...
fn says_one_eyed(text: &str) -> bool {
    let b = text.as_bytes();
    text.match_indices("one").any(|(i, _)| {
        let rest = &b[i + 3..];
        !rest.is_empty() && (rest[0] == b'-' || (rest[0] as char).is_whitespace()) && rest[1..].starts_with(b"eye")
    })
}

/// Parse a description into character traits.
pub fn parse_prompt(raw: &str) -> Traits {
    let text = raw.to_lowercase().trim().to_string();
    let toks = tokenize(&text);
    let has = |words: &[&str]| words.iter().any(|w| toks.iter().any(|t| t == w));
    let mut tags: Vec<String> = Vec::new();

    let (creature, creature_w) = toks.iter().find_map(|t| creature_word(t).map(|c| (Some(c), Some(t.clone())))).unwrap_or((None, None));

    let preset = if text.is_empty() {
        Some("moss")
    } else if has(&["thornhood"]) {
        Some("thornhood")
    } else if has(&["fernando"]) {
        Some("fernando")
    } else if has(&["moss"]) && creature.is_none() {
        Some("moss")
    } else {
        None
    };

    let b = base(creature.unwrap_or("owl"));
    let mut t = Traits {
        creature: creature.unwrap_or("owl").to_string(),
        body: b.body.to_string(),
        ears: b.ears.map(String::from),
        eyes: b.eyes.to_string(),
        mouth: b.mouth.to_string(),
        wings: b.wings.unwrap_or(false),
        feet: b.feet.map(String::from),
        shape: b.shape.to_string(),
        belly: b.belly.unwrap_or(false),
        belly_col: b.belly_col.map(String::from),
        tail: b.tail.map(String::from),
        shiny: b.shiny,
        panel: b.panel,
        alpha: b.alpha,
        panda: b.panda,
        dark_col: b.dark_col.map(String::from),
        size: 1.0,
        wide: 1.0,
        tall: 1.0,
        feet_col: MOSS_FEET.to_string(),
        beak_col: MOSS_BEAK.to_string(),
        iris: b.iris.map(String::from).or(if b.eyes == "owl" { s(MOSS_IRIS) } else { None }),
        accent: MOSS_SCARF.to_string(),
        ..Default::default()
    };
    let mut name: Option<String> = None;

    if let Some(p) = preset {
        // Moss himself, or one of his evolutions (Fernando, Thornhood). Only the owl's own parts are
        // reset, as in the original, so "fernando fox" keeps the fox tail.
        let owl = base("owl");
        t.creature = "owl".into();
        t.ears = owl.ears.map(String::from);
        t.eyes = owl.eyes.into();
        t.mouth = owl.mouth.into();
        t.wings = true;
        t.feet = owl.feet.map(String::from);
        t.shape = owl.shape.into();
        t.belly = true;
        t.body = MOSS_BODY.into();
        t.dark_col = s(MOSS_DARK);
        t.belly_col = s(MOSS_BELLY);
        t.ring = s(MOSS_RING);
        t.iris = s(MOSS_IRIS);
        t.hat = s("acorn");
        t.hat_col = s(MOSS_ACORN);
        t.neck = s("scarf");
        t.neck_col = s(MOSS_SCARF);
        t.pattern = s("speckle");
        name = s("Moss");
        if p == "fernando" {
            t.hat = s("top");
            t.hat_col = s(MOSS_ACORN);
            t.plume = true;
            t.tall = 1.06;
            t.wink = true;
            name = s("Fernando");
        }
        if p == "thornhood" {
            t.body = "#4f7a45".into();
            t.dark_col = s("#2f4f2c");
            t.belly_col = s("#f1ead2");
            t.ring = s("#e9e2c8");
            t.iris = s("#e8862e");
            t.hat = s("hood");
            t.neck = s("cape");
            t.neck_col = s("#2f4f2c");
            t.tall = 1.1;
            t.pattern = s("chevron");
            t.angry = true;
            name = s("Thornhood");
        }
        tags.push(
            match p {
                "moss" => "the original owlet",
                "fernando" => "stage 2 · the dandy",
                _ => "stage 3 · hooded",
            }
            .into(),
        );
    }

    // colours, with "dark", "light" and "bright" modifiers
    let mut modv = 0.0;
    let (mut body_set, mut accent_set) = (false, false);
    let mut assigned: Vec<String> = Vec::new();
    for i in 0..toks.len() {
        let w = toks[i].as_str();
        if w == "dark" || w == "deep" {
            modv = -0.35;
            continue;
        }
        let next_is_color = toks.get(i + 1).is_some_and(|n| color(n).is_some());
        if w == "light" || w == "pale" || w == "pastel" || (w == "baby" && next_is_color) {
            modv = 0.4;
            continue;
        }
        if w == "bright" || w == "neon" {
            modv = 0.12;
            continue;
        }
        let Some(c) = color(w).filter(|_| !(w == "mossy" && preset.is_some())) else {
            if w != "and" {
                modv = 0.0;
            }
            continue;
        };
        let col = if c == "rainbow" || modv == 0.0 { c.to_string() } else { shade(c, modv) };
        modv = 0.0;
        let mut slot = None;
        for n in toks.iter().take((i + 4).min(toks.len())).skip(i + 1) {
            if color(n).is_some() || creature_word(n).is_some() {
                break;
            }
            if let Some(sl) = slot_word(n) {
                slot = Some(sl);
                break;
            }
        }
        let rainbow_or = |alt: &str| if col == "rainbow" { alt.to_string() } else { col.clone() };
        match slot {
            Some("hat") => t.hat_col = Some(col.clone()),
            Some("neck") => t.neck_col = Some(col.clone()),
            Some("face") => t.face_col = Some(col.clone()),
            Some("iris") => t.iris = Some(rainbow_or("#e0b23a")),
            Some("belly") => t.belly_col = Some(rainbow_or("#ffffff")),
            Some("wing") => t.wing_col = Some(rainbow_or("#ee8fb4")),
            Some("glow") => t.glow = Some(rainbow_or("#ffd54f")),
            Some("beak") => t.beak_col = col.clone(),
            Some("feet") => t.feet_col = col.clone(),
            _ if !body_set => {
                t.body = col.clone();
                body_set = true;
                t.dark_col = None;
                t.ring = None;
                if preset.is_some() {
                    t.belly_col = None;
                }
            }
            _ if !accent_set => {
                t.accent = rainbow_or("#ee8fb4");
                accent_set = true;
            }
            _ => {}
        }
        assigned.push(match slot {
            Some(sl) if sl != "body" => format!("{w} {sl}"),
            _ => w.to_string(),
        });
    }

    // accessories
    let has_hat_word = has(&["hat"]);
    for w in &toks {
        if let Some(h) = hat_word(w) {
            if !(w == "top" && !has_hat_word) {
                t.hat = s(h);
            }
        }
        if let Some(n) = neck_word(w) {
            t.neck = s(n);
        }
        if let Some(f) = face_word(w) {
            t.face = s(f);
        }
    }
    if has(&["bow"]) && has(&["tie"]) {
        t.neck = s("bowtie");
        if t.hat.as_deref() == Some("bow") {
            t.hat = None;
        }
    }
    if has(&["angel", "fairy", "winged", "wings"]) && !t.wings {
        t.wings = true;
        t.extra_wings = true;
    }
    if has(&["angel"]) {
        t.wing_col.get_or_insert("#ffffff".into());
    }
    if has(&["fairy"]) {
        t.wing_col.get_or_insert("#bfe6f5".into());
        t.glow.get_or_insert("#d6f3ff".into());
    }
    if has(&["spots", "spotted", "spotty", "dotted", "dots", "polka"]) {
        t.pattern = s("spots");
    }
    if has(&["stripes", "striped", "stripy", "tiger", "tabby"]) {
        t.pattern = s("stripes");
    }
    if has(&["speckled", "speckles", "freckles", "freckled"]) {
        t.pattern = s("speckle");
    }
    if has(&["glowing", "glow", "sparkly", "sparkle", "shiny", "magic", "magical", "radiant", "cosmic"]) {
        t.glow.get_or_insert("#ffe58a".into());
    }
    if has(&["tiny", "small", "little", "mini", "baby", "smol"]) {
        t.size = 0.86;
    }
    if has(&["big", "huge", "giant", "large"]) {
        t.size = 1.12;
    }
    if has(&["chonky", "chubby", "fat", "round", "chunky", "plump", "fluffy"]) {
        t.wide = 1.12;
    }
    if has(&["tall", "long", "lanky", "slim", "skinny"]) {
        t.tall = 1.12;
    }
    if has(&["square", "boxy", "cube", "cubic", "blocky"]) {
        t.shape = "square".into();
    }
    if has(&["angry", "grumpy", "fierce", "evil", "mad"]) {
        t.angry = true;
    }
    if has(&["sleepy", "tired", "lazy", "chill"]) {
        t.sleepy = true;
    }
    if has(&["cyclops"]) || says_one_eyed(&text) {
        t.cyclops = true;
    }
    if has(&["spooky", "haunted"]) {
        t.glow.get_or_insert("#b9a7ff".into());
    }
    if has(&["fire", "flame", "fiery", "lava"]) {
        if !body_set {
            t.body = "#e0583a".into();
        }
        t.glow.get_or_insert("#ff9a3c".into());
    }
    if has(&["ice", "icy", "frost", "frozen", "snow"]) {
        if !body_set {
            t.body = "#bfe3f2".into();
        }
        t.glow.get_or_insert("#d8f4ff".into());
    }

    // derived colours
    t.rainbow = t.body == "rainbow";
    let b = if t.rainbow { "#e07ab0".to_string() } else { t.body.clone() };
    t.base = b.clone();
    if t.dark_col.is_none() {
        t.dark_col = Some(shade(&b, if b == "#2c2c34" || b == "#2f3440" { 0.25 } else { -0.3 }));
    }
    if (t.belly || t.belly_col.is_some()) && t.belly_col.is_none() {
        t.belly_col = Some(shade(&b, 0.72));
    }
    if t.ring.is_none() {
        t.ring = Some(shade(&b, -0.5));
    }
    if t.hat_col.is_none() {
        t.hat_col = Some(match t.hat.as_deref() {
            Some("crown") | Some("halo") => "#f2c14e".into(),
            Some("acorn") => MOSS_ACORN.into(),
            Some("wizard") => "#5b4aa0".into(),
            Some("top") => "#2c2c34".into(),
            _ => t.accent.clone(),
        });
    }
    if t.neck_col.is_none() {
        t.neck_col = Some(if t.neck.as_deref() == Some("cape") { "#c0392b".into() } else { t.accent.clone() });
    }
    if t.face_col.is_none() {
        t.face_col = s(match t.face.as_deref() {
            Some("mask") => "#2c2c34",
            Some("glasses") => "#3a2a1a",
            _ => "#1d1d24",
        });
    }
    if t.wing_col.is_none() {
        t.wing_col = t.dark_col.clone();
    }
    t.seed = hash_str(if text.is_empty() { "moss" } else { &text });
    t.voice = voice(&t.creature) / t.size;

    // name
    let name = name.unwrap_or_else(|| {
        let first_color = toks.iter().find(|w| color(w).is_some());
        let noun = creature_w.clone().unwrap_or_else(|| "owlet".into());
        match (first_color, t.hat.as_deref()) {
            (None, Some("crown")) => format!("King {}", cap(&noun)),
            (None, Some("wizard")) => format!("{} Wizard", cap(&noun)),
            (Some(c), _) => format!("{} {}", cap(c), cap(&noun)),
            (None, _) => cap(&noun),
        }
    });
    t.name = name;

    // tags shown under the preview
    if preset.is_none() && creature.is_none() {
        // name the word we couldn't place, so the player knows why they got an owlet
        let known = |w: &str| {
            color(w).is_some()
                || hat_word(w).is_some()
                || neck_word(w).is_some()
                || face_word(w).is_some()
                || slot_word(w).is_some()
                || STOP_WORDS.contains(&w)
                || MOD_WORDS.contains(&w)
        };
        let unknown = toks.iter().find(|w| !known(w) && w.len() > 2 && !w.chars().any(|c| c.is_ascii_digit()));
        tags.push(match unknown {
            Some(u) => format!("\"{u}\" unknown, so: owlet"),
            None => "owlet (default)".into(),
        });
    } else if preset.is_none() {
        tags.push(t.creature.clone());
    }
    tags.extend(assigned);
    for (k, v) in [("hat", &t.hat), ("neck", &t.neck), ("face", &t.face), ("pattern", &t.pattern)] {
        if let Some(v) = v {
            if preset.is_none() || k == "face" {
                tags.push(v.clone());
            }
        }
    }
    if t.extra_wings {
        tags.push("wings".into());
    }
    if t.glow.is_some() {
        tags.push("glow".into());
    }
    if t.size < 1.0 {
        tags.push("tiny".into());
    }
    if t.size > 1.0 {
        tags.push("big".into());
    }
    if t.wide > 1.0 {
        tags.push("chonky".into());
    }
    if t.tall > 1.0 && preset.is_none() {
        tags.push("tall".into());
    }
    if t.cyclops {
        tags.push("one eye".into());
    }
    if t.angry && preset.is_none() {
        tags.push("fierce".into());
    }
    if t.sleepy {
        tags.push("sleepy".into());
    }
    let mut seen = std::collections::HashSet::new();
    t.tags = tags.into_iter().filter(|x| seen.insert(x.clone())).collect();
    t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_and_moss_give_moss() {
        for p in ["", "moss", "  MOSS  "] {
            let t = parse_prompt(p);
            assert_eq!(t.name, "Moss");
            assert_eq!(t.hat.as_deref(), Some("acorn"));
            assert_eq!(t.neck.as_deref(), Some("scarf"));
            assert_eq!(t.base, MOSS_BODY);
        }
    }

    #[test]
    fn colours_attach_to_the_part_after_them() {
        let t = parse_prompt("pink cat with a gold crown");
        assert_eq!(t.creature, "cat");
        assert_eq!(t.base, "#ee8fb4");
        assert_eq!(t.hat.as_deref(), Some("crown"));
        assert_eq!(t.hat_col.as_deref(), Some("#e0b23a"));
        assert_eq!(t.name, "Pink Cat");
    }

    #[test]
    fn unknown_creature_is_named() {
        let t = parse_prompt("purple shark");
        assert_eq!(t.creature, "owl");
        assert!(t.tags.contains(&"\"shark\" unknown, so: owlet".to_string()));
    }

    #[test]
    fn modifiers() {
        let t = parse_prompt("tiny chonky one-eyed ghost");
        assert_eq!(t.size, 0.86);
        assert_eq!(t.wide, 1.12);
        assert!(t.cyclops);
        assert!((t.voice - 0.35 / 0.86).abs() < 1e-12);
    }

    #[test]
    fn top_hats_default_to_black() {
        assert_eq!(parse_prompt("frog in a top hat").hat_col.as_deref(), Some("#2c2c34"));
    }

    #[test]
    fn evolutions() {
        assert_eq!(parse_prompt("fernando").name, "Fernando");
        let t = parse_prompt("thornhood");
        assert_eq!(t.hat.as_deref(), Some("hood"));
        assert!(t.angry);
    }
}
