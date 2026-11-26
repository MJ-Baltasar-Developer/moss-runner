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

## Play on a phone, tablet or computer

Moss Run lays itself out for the device it's on:

- **Phones:** a compact title screen, big move buttons in a column at the left edge (left thumb
  for moves, right thumb taps anywhere to hop), a pause button, and a "turn your phone sideways" hint.
- **Tablets:** roomy layout with touch-sized buttons.
- **Computers:** keyboard controls, and gamepads work too.

**Install it like an app.** On Android or a computer, open the game and press **⬇ Install app**
(or use the browser's menu: *Install app* / *Add to Home screen*). On iPhone or iPad, tap
**Share → Add to Home Screen**. It then opens full screen from its own icon and **works offline**.

## Controls

| Keyboard | Touch | Gamepad | Action |
|---|---|---|---|
| Space | Tap anywhere | A | Hop (tap lightly for a small hop) |
| Hold Space | Hold | Hold A | Glide |
| 1 / Z | Move button 1 | X | Brave Bird: glowing dash through anything (Lv 2) |
| 2 / X | Move button 2 | Y | Double Team: decoys take one hit (Lv 3) |
| 3 / C | Move button 3 | B | Seed Bomb: blasts the obstacles ahead (Lv 4) |
| 4 / V | Move button 4 | RB | Leaf Storm: clears the screen (Lv 6) |
| P | ⏸ button | Start | Pause |
| M | Settings | | Mute / volume |

Collect leaf orbs and golden acorns to earn XP. Each stage ends at the nest, and the next one
is longer and faster.

## What's in the game

- **Easy mode** (on by default, for younger players): three hearts instead of one, a checkpoint
  flag halfway through each stage (or just before the boss), and a slightly slower pace. Losing
  all your hearts puts you back at the flag, not at the start.
- **Three worlds,** five stages each: the **Forest**; the **Snowy Peaks**, with rolling snowballs and
  icicles that drop as you get close and stick in the ground; and **the Swamp**, with snapping crocs
  and mushrooms you can bounce on to reach orbs up high.
- **Grimwing the Crow King** guards the nest on every 5th stage. Dodge his feather volleys, swoops
  and stomps, then hit back with your moves or by running into the golden acorns he drops. From his
  second fight on he also swoops high, so watch the warning: **Hop!** or **Stay down!**
  Practise with **Practice the boss**, or [`?boss`](https://mj-baltasar-developer.github.io/moss-runner/?boss).
- **Moss evolves** like the desktop pet: into **Fernando** at level 8 and **Thornhood** at level 16.
- **Daily challenge:** one stage, the same course for everyone on the same day. Your best run is
  saved as a **ghost**, a see-through Moss that races you next time.
- **Sticker book:** 14 stickers for milestones such as beating Grimwing, a no-hit stage,
  reaching each world, or beating your ghost.
- **Music** for each world and the boss, synthesized like the sound effects.
- **Settings:** Easy mode, music and sound volume, less motion (no screen shake or flashing),
  high-contrast boss warnings (yellow instead of red), and the how-to-play hints.
- **First-run hints** show new players what to do: "Tap to hop!", "Hold to glide!", "Tap a move!"

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
9. **Making it an app for kids.** Phone and tablet layouts, installable and offline (a PWA),
   Easy mode, two new worlds, the daily challenge with ghost replays, evolution, stickers, music,
   settings, gamepad support, and browser tests for every screen size in CI.

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
- **Runs are deterministic.** The engine steps the game in fixed 1/120 s steps whatever the
  screen's frame rate, and draws its randomness from seeded generators: one for the course
  (obstacles, orbs, the boss) and one for visual effects. So the same seed and the same inputs
  replay exactly the same game. That's what makes the **daily challenge** fair (the course
  doesn't depend on how you play) and **ghosts** possible: the engine records your inputs as
  `step << 3 | action`, and a second engine replays them in step with you.
- **One source of truth.** Screen size, moves, cooldowns and the XP curve are defined once in
  Rust and handed to the renderer.
- **Cheap to draw from.** Particles (up to 900) cross into JavaScript as one packed
  `Float32Array` instead of hundreds of objects. With about 620 particles on screen, handing the
  state to the renderer dropped from **1.92 ms to 0.12 ms per frame** on average (p95: 3.1 ms to
  0.3 ms), measured in headless Chromium against the previous build.

## Tech stack

| Part | What it uses |
|---|---|
| Game engine | **Rust**, compiled to **WebAssembly** with `wasm-bindgen` and `wasm-pack`; state crosses to JavaScript with `serde` |
| Rendering | HTML5 Canvas 2D, with `Path2D` shapes built from SVG path strings |
| Sharpness | The canvas is sized to the real screen pixels (CSS size × `devicePixelRatio`), kept up to date with a `ResizeObserver` |
| Sound | Web Audio API: oscillators and filtered noise. Every sound is synthesized, including Moss's cry |
| Characters | A keyword parser (in Rust) turns your description into traits, and one drawing function renders any combination |
| Saving | `localStorage` for best runs, settings, stickers and the daily ghost (it still works if storage is blocked) |
| App | PWA: web manifest, service worker for offline play, icons drawn by the game's own sprite code |
| Devices | One layout system for phone, tablet and desktop (`web/js/device.js` + CSS), touch and Gamepad APIs |
| Tests | `cargo test`: 37 unit and gameplay tests (determinism, replays, every rule). Playwright: 15 browser tests on desktop, phone (both ways up), tablet and offline |
| CI/CD | GitHub Actions: `cargo fmt`, `clippy`, `cargo test`, build the WebAssembly, browser tests, deploy to GitHub Pages |
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
./build.sh                                   # compiles engine/ into web/pkg, lists files for offline play
python3 -m http.server 8000 --directory web  # then open http://localhost:8000
```

Browsers only load WebAssembly and ES modules from a web server, not from a file opened by
double-clicking, so any static server works (`npx serve web`, VS Code's Live Server...).
After changing Rust code, run `./build.sh` again and reload. After changing JavaScript, just reload.
The offline service worker is skipped on `localhost` so your edits show up straight away
(add `?sw` to the address to test it). Handy addresses: `?boss` (boss practice), `?daily`,
`?stage=7` (start at a stage: 6-10 are the Snowy Peaks, 11-15 the Swamp).

To try it on your phone, serve it on your network (`python3 -m http.server 8000 --directory web --bind 0.0.0.0`)
and open `http://<your computer's IP>:8000` on the phone. Installing and offline play need HTTPS,
which the GitHub Pages copy has.

Run the tests:

```sh
cd engine && cargo test            # the rules (Rust)

cd tests/e2e && npm ci && npx playwright install chromium
node e2e.mjs http://localhost:8000/   # the game in a browser: desktop, phone, tablet, offline
```

### Project layout

```
build.sh                    builds the Rust engine into web/pkg and the offline file list
tools/make-icons.cjs        draws the app icons with the game's sprite code
tests/e2e/e2e.mjs           browser tests (Playwright)
engine/                     the game engine (Rust)
  src/
    lib.rs                  the WebAssembly interface the page calls
    config.rs               rules: screen size, physics, moves, XP curve, boss constants
    character.rs            your description -> character traits (colours, creatures, hats...)
    color.rs                colour mixing, shared with the renderer's formulas
    rng.rs                  seeded random numbers (deterministic runs)
    game/
      mod.rs                the game state, run modes (normal, practice, daily), Easy mode, input,
                            fixed time steps, recordings, the packed particle buffer
      update.rs             one frame: physics, collisions, the nest, dying, particles
      spawn.rs              obstacles and orbs, per world
      moves.rs              Brave Bird, Double Team, Seed Bomb, Leaf Storm
      boss.rs               Grimwing: attacks, hazards, damage
      effects.rs            particles, banners, shake, hitstop, XP and levels
  tests/gameplay.rs         gameplay tests
  examples/parse.rs         print the traits for any description
web/                        the page (this folder is what gets published)
  index.html, css/          the page and its phone / tablet / desktop layouts
  manifest.webmanifest      makes it installable
  sw.js                     offline play (service worker)
  icons/
  js/
    engine.js               loads the WebAssembly engine
    device.js               phone, tablet or desktop; installed app or browser
    settings.js             Easy mode, volumes, less motion, high contrast, hints
    state.js                G: the engine's state as seen by the renderer; engine events
    main.js, loop.js        start-up and the frame loop
    config.js               colours and palettes (the rules come from Rust)
    character/sprite.js     draws any character from its traits
    audio/                  sound effects, Moss's cry, and the music sequencer (Web Audio)
    render/                 the worlds, the HUD, the boss, the tutorial hints
    ui/                     panels, saved scores, input (keyboard, touch, gamepad),
                            the daily challenge and its ghost, the sticker book
```

Ideas for a first change: add a creature or colour word in `engine/src/character.rs`, a new
obstacle for a world in `engine/src/game/spawn.rs` (and its drawing in `web/js/render/scene.js`),
a sticker in `web/js/ui/stickers.js`, or a new boss attack in `engine/src/game/boss.rs`.

### Publishing your own copy

Fork the repo, then in your fork go to **Settings → Pages** and set the source to
**GitHub Actions**. The included workflow tests, builds and deploys on every push to `main`.
Your copy will be live at `https://<your-username>.github.io/moss-runner/`.
