# Moss Run

A small arcade runner: hop, glide and level up your way home to the nest.

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
3. **Building it as one file.** Everything is drawn in code. There are no images, sprite
   sheets, sound files or libraries, so the whole game is a single `index.html`.
4. **Tuning the feel.** Coyote time, jump buffering, variable jump height, hitstop, screen
   shake and particles were added and tuned until the hops and hits felt good.
5. **Testing.** Each feature was played through automatically in a headless browser
   (Playwright): orbs, level-ups, every move, reaching the nest, dying, saving scores,
   restarting, and the boss fight. Screenshots were checked at 1×, 1.5× and 2× screen scaling.
6. **Second round.** Sharper rendering on high-resolution screens, the Grimwing boss fight,
   and fixes to the character generator (masks follow the eyes, top hats are black by
   default, unknown creatures are named).

## Tech stack

| Part | What it uses |
|---|---|
| Rendering | HTML5 Canvas 2D, with `Path2D` shapes built from SVG path strings |
| Sharpness | The canvas is sized to the real screen pixels (CSS size × `devicePixelRatio`), kept up to date with a `ResizeObserver` |
| Sound | Web Audio API: oscillators and filtered noise. Every sound is synthesized, including Moss's cry |
| Characters | A keyword parser turns your description into traits, and one drawing function renders any combination |
| Saving | `localStorage` for best runs and settings (it still works if storage is blocked) |
| Hosting | GitHub Pages, straight from `main` |
| Dependencies | None: no framework, no bundler, no build step |

The game runs at a fixed 960 × 420 internal resolution and is scaled to fit the window.

## Build and run it yourself

There's nothing to build. Clone it and open the file:

```sh
git clone https://github.com/MJ-Baltasar-Developer/moss-runner.git
cd moss-runner
xdg-open index.html     # Linux  (macOS: open index.html, Windows: start index.html)
```

Or serve it locally, which matches how GitHub Pages serves it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Edit `index.html`, save, and reload the browser. Any modern browser works (Chrome, Firefox,
Edge, Safari).

### Finding your way around `index.html`

The script is split into sections with banner comments, in this order:

| Section | What's in it |
|---|---|
| Constants | Screen size, physics (gravity, jump, glide), the four moves, time-of-day palettes |
| Text prompt → character traits | `parsePrompt()`: colours, creatures, hats, neckwear, face items, presets |
| Character drawing | `drawCritter()` and its helpers, in a 120 × 125 box like the pet's SVG |
| Audio | All the sound effects and Moss's cry |
| Game state | The canvas resize logic and the run state `G`; practice mode |
| Spawning / Effects / Moves | Obstacles and orbs, particles and shake, the four abilities |
| Boss | Grimwing's attacks, hazards, damage and HUD |
| Update / Rendering / Loop | The per-frame game logic, drawing and the main loop |
| Scores / Panels / Input | Saved runs, the start and game-over screens, keyboard and touch |

Ideas for a first change: add a creature to `CREATURE_WORDS`, a colour to `COLORS`, or a new
time-of-day palette to `DAY`.

### Publishing your own copy

Fork the repo, then in your fork go to **Settings → Pages**, choose **Deploy from a branch**,
and pick `main` and `/ (root)`. Your copy will be live at
`https://<your-username>.github.io/moss-runner/` in a minute or two.
