# Moss Run

A small arcade runner: hop, glide and level up your way home to the nest. The game engine is
written in **Rust** and compiled to **WebAssembly**; the page draws it on an HTML5 canvas.

**▶ Play it: https://mj-baltasar-developer.github.io/moss-runner/**

![Moss Run gameplay](screenshot.png)

## Where Moss came from

Moss didn't start as a game character. He started as a **desktop pet inside Claude Code**:
a small sage-green owlet who lives on the screen while I work and keeps an eye on my
pull requests and CI runs.

- When a **new pull request** is opened, he cheers ("New PR opened! hoo-hoo!") and pops a toast.
- When a **PR is updated**, he lets me know which branch changed.
- When I check **CI status**, he reacts to the result: he thinks while it's running,
  celebrates when it passes, and looks worried when it fails.
- Every PR and update earns him **XP**, so he levels up as the work ships. Along the way he
  learned four moves (Brave Bird, Double Team, Seed Bomb and Leaf Storm), a twig nest to
  sleep in, feeding and bath times, and evolutions.

Moss Run takes that same owlet off the desktop and into a game. His colours, his XP curve,
his cry and his four moves all come straight from the pet's code, and the goal is the same
thing he does at the end of every work day: fly home to his nest.

## Make your own runner

On the start screen, describe your character in a few words and it gets drawn for you.
Try `moss`, `blue robot with sunglasses`, `pink cat with a gold crown`, `orange fox wizard`
or `rainbow slime with a halo`.

The generator understands colours, 14 creature types (owl, bird, cat, fox, frog, slime, robot,
ghost, dragon, bunny, bear, panda, penguin, mouse), hats, scarves and other neckwear, glasses
and masks. If it doesn't know a word, it says so under the preview and uses an owlet instead.

## Controls

| Key | Action |
|---|---|
| Space / tap | Hop (tap lightly for a small hop) |
| Hold Space | Glide |
| 1 / Z | Brave Bird: glowing dash through anything (Lv 2) |
| 2 / X | Double Team: decoys take one hit (Lv 3) |
| 3 / C | Seed Bomb: blasts the obstacles ahead (Lv 4) |
| 4 / V | Leaf Storm: clears the screen (Lv 6) |
| P / M | Pause / mute |
| E | Change runner after a run |

Collect leaf orbs and golden acorns to earn XP. Each stage ends at the nest, and the next one
is longer and faster.

**Boss:** on every 5th stage, Grimwing the Crow King guards the nest. Dodge his feather volleys,
swoops and stomps, then hit back with your moves or by catching the golden acorns he drops.
Want to practise? Press **Practice the boss** on the start screen, or open the game with
[`?boss`](https://mj-baltasar-developer.github.io/moss-runner/?boss) at the end of the address.

## How it was made

Moss Run was built in one day (26 November 2026) with [Claude Code](https://claude.com/claude-code),
working from the Moss pet's source:

1. **Reading the pet.** Claude went through the Moss mod: the SVG drawing of the owlet
   (palette, wings, eyes), the XP curve (`17 + 5 × level`), the synthesized cry, and how each
   of his four attacks plays out on the desktop.
2. **Designing the game.** Three choices shaped it: Moss's moves become unlockable abilities,
   the controls are a hop + glide mix (part Dino runner, part Flappy Bird), and the run is split
   into stages that each end at the nest.
3. **Drawing everything in code.** There are no images, sprite sheets, sound files or
   libraries. Characters, the world and every sound are generated in code.
4. **Tuning the feel.** Coyote time, jump buffering, variable jump height, hitstop, screen
   shake and particles were added and tuned until the hops and hits felt good.
5. **Testing.** Each feature was played through automatically in a headless browser
   (Playwright): orbs, level-ups, every move, reaching the nest, dying, saving scores,
   restarting, and the boss fight. Screenshots were checked at 1×, 1.5× and 2× screen scaling.
6. **Second round.** Sharper rendering on high-resolution screens, the Grimwing boss fight,
   and fixes to the character generator (masks follow the eyes, top hats are black by
   default, unknown creatures are named).
7. **Splitting it up.** The first version was a single 2,100-line `index.html`. It was then
   split into small ES modules (sprites, sounds, moves, boss, rendering, UI), so it's easier
   to work on and ready to package as an app. The game plays exactly as before.
8. **Moving the engine to Rust.** All the game rules (physics, spawning, XP, the four moves,
   the Grimwing boss AI and the character generator) were ported to Rust and compiled to
   WebAssembly. JavaScript now only draws, plays sounds and reads input. The Rust parser was
   checked against the original on 52 descriptions and gives identical output, and the rules
   are covered by `cargo test`.

## Architecture

```
            keyboard / touch
                   │
                   ▼
  ┌─────────────────────────────────┐   snapshot() every frame   ┌──────────────────────────┐
  │  engine/  (Rust → WebAssembly)  │ ─────────────────────────► │  web/js  (JavaScript)    │
  │  physics, spawning, collisions, │                            │  Canvas 2D renderer,     │
  │  XP + levels, the four moves,   │   takeEvents(): sounds,    │  Web Audio sounds,       │
  │  Grimwing's AI, the character   │ ─────────────────────────► │  panels, saved scores    │
  │  generator                      │   panels, "save the run"   │                          │
  └─────────────────────────────────┘                            └──────────────────────────┘
```

The Rust engine owns the game state and the rules. Each frame the page calls `engine.frame(dt)`,
reads a snapshot of the state, and draws it. The engine never touches the screen, and the
renderer never changes the game. That split means:

- **The rules are testable without a browser.** `cargo test` plays the game headlessly: hops,
  collisions, levelling, every move, reaching the nest, and the whole boss fight.
- **Runs are deterministic.** The engine uses its own seeded random number generator, so the
  same seed and the same inputs replay exactly the same game (there's a test for that).
- **One source of truth.** Screen size, moves, cooldowns and the XP curve are defined once in
  Rust and handed to the renderer.

## Tech stack

| Part | What it uses |
|---|---|
| Game engine | **Rust**, compiled to **WebAssembly** with `wasm-bindgen` and `wasm-pack`; state crosses to JavaScript with `serde` |
| Rendering | HTML5 Canvas 2D, with `Path2D` shapes built from SVG path strings |
| Sharpness | The canvas is sized to the real screen pixels (CSS size × `devicePixelRatio`), kept up to date with a `ResizeObserver` |
| Sound | Web Audio API: oscillators and filtered noise. Every sound is synthesized, including Moss's cry |
| Characters | A keyword parser (in Rust) turns your description into traits, and one drawing function renders any combination |
| Saving | `localStorage` for best runs and settings (it still works if storage is blocked) |
| Tests | `cargo test`: unit tests plus gameplay tests that drive the engine like a player would |
| CI/CD | GitHub Actions: `cargo fmt`, `clippy`, `cargo test`, build the WebAssembly, deploy to GitHub Pages |
| Front end | Plain JavaScript ES modules: no framework, no bundler |

The game runs at a fixed 960 × 420 internal resolution and is scaled to fit the window.

## Build and run it yourself

You need [Rust](https://rustup.rs) with the WebAssembly target, and `wasm-pack`:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Then build the engine and serve the `web` folder:

```sh
git clone https://github.com/MJ-Baltasar-Developer/moss-runner.git
cd moss-runner
./build.sh                                   # compiles engine/ into web/pkg
python3 -m http.server 8000 --directory web  # then open http://localhost:8000
```

Browsers only load WebAssembly and ES modules from a web server, not from a file opened by
double-clicking, so any static server works (`npx serve web`, VS Code's Live Server...).
After changing Rust code, run `./build.sh` again and reload. After changing JavaScript, just reload.

Run the tests:

```sh
cd engine
cargo test
```

### Project layout

```
build.sh                    builds the Rust engine into web/pkg
engine/                     the game engine (Rust)
  src/
    lib.rs                  the WebAssembly interface the page calls
    config.rs               rules: screen size, physics, moves, XP curve, boss constants
    character.rs            your description -> character traits (colours, creatures, hats...)
    color.rs                colour mixing, shared with the renderer's formulas
    rng.rs                  seeded random numbers (deterministic runs)
    game/
      mod.rs                the game state, runs and stages, input
      update.rs             one frame: physics, collisions, the nest, dying, particles
      spawn.rs              obstacles and orbs
      moves.rs              Brave Bird, Double Team, Seed Bomb, Leaf Storm
      boss.rs               Grimwing: attacks, hazards, damage
      effects.rs            particles, banners, shake, hitstop, XP and levels
  tests/gameplay.rs         gameplay tests
  examples/parse.rs         print the traits for any description
web/                        the page (this folder is what gets published)
  index.html, css/
  js/
    engine.js               loads the WebAssembly engine
    state.js                G: the engine's state as seen by the renderer; engine events
    main.js, loop.js        start-up and the frame loop
    config.js               colours and palettes (the rules come from Rust)
    character/sprite.js     draws any character from its traits
    audio/sfx.js, cry.js    sound effects and Moss's cry (Web Audio)
    render/                 the world, the HUD and the boss
    ui/                     panels, saved scores, keyboard / mouse / touch
```

Ideas for a first change: add a creature or colour word in `engine/src/character.rs`, a new
time-of-day palette to `DAY` in `web/js/config.js`, or a new boss attack in
`engine/src/game/boss.rs`.

### Publishing your own copy

Fork the repo, then in your fork go to **Settings → Pages** and set the source to
**GitHub Actions**. The included workflow tests, builds and deploys on every push to `main`.
Your copy will be live at `https://<your-username>.github.io/moss-runner/`.
