//! Gameplay rules, tested by driving the engine the way the browser does: inputs, then frames.

use moss_engine::config::{is_boss_stage, xp_needed, MOVES, PLAYER_X, PX_PER_M};
use moss_engine::game::{Event, Game, Mode, ObKind, State};

const DT: f64 = 1.0 / 60.0;

fn run(g: &mut Game, seconds: f64) {
    for _ in 0..(seconds / DT).round() as usize {
        g.frame(DT);
    }
}

fn level_to(g: &mut Game, level: u32) {
    while g.level < level {
        g.gain_xp(xp_needed(g.level), None);
    }
}

fn sounds(events: &[Event]) -> Vec<&'static str> {
    events.iter().filter_map(|e| if let Event::Sfx { name, .. } = e { Some(*name) } else { None }).collect()
}

#[test]
fn a_new_run_starts_on_stage_one() {
    let mut g = Game::new(1);
    assert_eq!(g.state, State::Title);
    g.new_run();
    assert_eq!((g.state, g.stage, g.level), (State::Play, 1, 1));
    assert!(g.take_events().contains(&Event::Started));
    assert_eq!(g.stage_len, 600.0 * PX_PER_M);
}

#[test]
fn hop_up_and_land_again() {
    let mut g = Game::new(2);
    g.new_run();
    g.take_events();
    g.jump_press();
    run(&mut g, 0.1);
    assert!(!g.player.on_ground && g.player.vy < 0.0, "should be rising");
    g.jump_release();
    run(&mut g, 1.2);
    assert!(g.player.on_ground);
    let s = sounds(&g.take_events());
    assert!(s.contains(&"jump") && s.contains(&"land"));
}

#[test]
fn releasing_early_gives_a_smaller_hop() {
    let peak = |hold: f64| {
        let mut g = Game::new(3);
        g.new_run();
        g.jump_press();
        let mut top = f64::MAX;
        for i in 0..90 {
            if i as f64 * DT >= hold {
                g.jump_release();
            }
            g.frame(DT);
            top = top.min(g.player.y);
        }
        top
    };
    assert!(peak(0.05) > peak(0.5), "a tap should not go as high as a long press");
}

#[test]
fn running_into_an_obstacle_ends_the_run() {
    let mut g = Game::new(4);
    g.new_run();
    g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
    run(&mut g, 0.1);
    assert_eq!(g.state, State::Dying);
    run(&mut g, 1.5);
    assert_eq!(g.state, State::Dead);
    let ev = g.take_events();
    assert!(ev.contains(&Event::Died) && ev.contains(&Event::Over));
}

#[test]
fn levels_follow_mosss_xp_curve_and_unlock_moves() {
    let mut g = Game::new(5);
    g.new_run();
    assert_eq!(xp_needed(1), 22);
    g.gain_xp(21, None);
    assert_eq!(g.level, 1);
    g.gain_xp(1, None);
    assert_eq!((g.level, g.xp), (2, 0));
    // each move is learned at its level
    for m in MOVES {
        level_to(&mut g, m.lv);
        assert!(g.unlock_flash.get(m.id).copied().unwrap_or(0.0) > 0.0, "{} should flash as learned", m.name);
    }
}

#[test]
fn a_move_cannot_be_used_before_it_is_learned() {
    let mut g = Game::new(6);
    g.new_run();
    g.take_events();
    g.use_move(3); // Leaf Storm needs Lv 6
    assert!(g.storm.is_none());
    assert!(sounds(&g.take_events()).contains(&"denied"));
}

#[test]
fn brave_bird_smashes_through_obstacles() {
    let mut g = Game::new(7);
    g.new_run();
    level_to(&mut g, 2);
    g.use_move(0);
    g.spawn_kind(ObKind::Stump, PLAYER_X - 10.0);
    run(&mut g, 0.2);
    assert_eq!(g.state, State::Play);
    assert_eq!(g.smashed, 1);
    // and then it's on cooldown
    assert!(g.cds["brave-bird"] > 5.0);
}

#[test]
fn a_double_team_decoy_takes_one_hit() {
    let mut g = Game::new(8);
    g.new_run();
    level_to(&mut g, 3);
    g.use_move(1);
    assert!(g.shield.is_some());
    g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
    run(&mut g, 0.1);
    assert_eq!(g.state, State::Play);
    assert!(g.shield.is_none());
}

#[test]
fn reaching_the_nest_clears_the_stage() {
    let mut g = Game::new(9);
    g.new_run();
    g.dist = g.stage_len - 300.0;
    g.obstacles.clear();
    run(&mut g, 1.0);
    assert_eq!(g.state, State::Arrive);
    run(&mut g, 3.0);
    assert_eq!(g.state, State::Cleared);
    assert!(g.score >= 250.0, "home bonus");
    g.take_events();
    g.jump_press();
    assert_eq!((g.state, g.stage), (State::Play, 2));
}

#[test]
fn every_fifth_stage_has_a_boss() {
    assert!(!is_boss_stage(4) && is_boss_stage(5) && is_boss_stage(10));
}

#[test]
fn grimwing_blocks_the_nest_until_beaten() {
    let mut g = Game::new(10);
    g.start_practice();
    assert_eq!((g.stage, g.level, g.practice), (5, 7, true));
    run(&mut g, 3.0);
    let b = g.boss.as_ref().expect("the boss should have arrived");
    assert_eq!((b.hp, b.max), (18, 18));
    // the nest gets no closer while he's alive
    g.inv = 60.0;
    let d = g.dist;
    run(&mut g, 2.0);
    assert_eq!(g.dist, d);
    // beat him
    let (x, y) = (g.boss.as_ref().unwrap().x, g.boss.as_ref().unwrap().y);
    g.hurt_boss(18, x, y);
    assert!(g.boss.as_ref().unwrap().dying);
    assert!(g.score >= 1000.0, "boss bonus");
    run(&mut g, 2.0);
    assert!(g.boss.is_none() && g.boss_done);
    run(&mut g, 12.0);
    assert!(matches!(g.state, State::Arrive | State::Cleared));
}

#[test]
fn grimwing_gets_furious_at_half_health() {
    let mut g = Game::new(11);
    g.start_practice();
    run(&mut g, 3.0);
    g.hurt_boss(8, 0.0, 0.0);
    assert!(!g.boss.as_ref().unwrap().enraged);
    g.hurt_boss(1, 0.0, 0.0);
    assert!(g.boss.as_ref().unwrap().enraged);
}

#[test]
fn moves_damage_the_boss() {
    let mut g = Game::new(12);
    g.start_practice();
    run(&mut g, 3.0);
    g.inv = 60.0;
    let hp = |g: &Game| g.boss.as_ref().unwrap().hp;
    let h0 = hp(&g);
    g.use_move(2); // Seed Bomb: 3 seeds, 1 each
    run(&mut g, 1.2);
    assert_eq!(h0 - hp(&g), 3);
    let h1 = hp(&g);
    g.use_move(0); // Brave Bird charges at him: 3
    run(&mut g, 0.8);
    assert_eq!(h1 - hp(&g), 3);
    let h2 = hp(&g);
    g.use_move(3); // Leaf Storm: 4
    run(&mut g, 0.8);
    assert_eq!(h2 - hp(&g), 4);
}

#[test]
fn he_cycles_through_his_attacks() {
    let mut g = Game::new(13);
    g.start_practice();
    g.inv = 1e9;
    let mut seen = std::collections::HashSet::new();
    for _ in 0..(40.0 / DT) as usize {
        g.frame(DT);
        g.inv = 1e9;
        if let Some(b) = &g.boss {
            seen.insert(format!("{:?}", b.mode));
        }
    }
    for m in [Mode::Volley, Mode::Swoop, Mode::Stomp] {
        assert!(seen.contains(&format!("{m:?}")), "never saw {m:?}");
    }
}

#[test]
fn the_same_seed_replays_the_same_game() {
    let play = || {
        let mut g = Game::new(42);
        g.new_run();
        for i in 0..600 {
            if i % 50 == 0 {
                g.jump_press();
            }
            if i % 50 == 20 {
                g.jump_release();
            }
            g.frame(DT);
        }
        (g.score, g.dist, g.obstacles.len(), g.orb_count, g.player.y)
    };
    assert_eq!(play(), play());
}

// ---------- Easy mode, evolution, worlds, daily challenge, replays ----------

use moss_engine::game::{RunMode, STEP};

#[test]
fn easy_mode_gives_three_hearts() {
    let mut g = Game::new(20);
    g.set_easy(true);
    g.new_run();
    assert_eq!((g.hearts, g.max_hearts), (3, 3));
    g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
    run(&mut g, 0.1);
    assert_eq!((g.state, g.hearts), (State::Play, 2), "a hit costs a heart, the run goes on");
    assert!(g.take_events().iter().any(|e| matches!(e, Event::Hurt { hearts: 2 })));
    for _ in 0..2 {
        g.inv = 0.0;
        g.obstacles.clear();
        g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
        run(&mut g, 0.1);
    }
    assert_eq!(g.state, State::Dying, "no hearts left");
}

#[test]
fn easy_mode_retries_from_the_checkpoint() {
    let mut g = Game::new(21);
    g.set_easy(true);
    g.new_run();
    level_to(&mut g, 3);
    g.inv = 1e9;
    g.dist = g.stage_len * 0.5 - 50.0;
    run(&mut g, 0.5);
    assert!(g.checkpoint > 0.0);
    let cp = g.checkpoint;
    g.inv = 0.0;
    g.hearts = 1;
    g.obstacles.clear();
    g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
    run(&mut g, 1.5);
    assert_eq!(g.state, State::Dead);
    g.jump_press();
    assert_eq!((g.state, g.stage, g.level, g.hearts), (State::Play, 1, 3, 3), "same stage, level kept, hearts back");
    assert_eq!(g.dist, cp, "back at the flag");
}

#[test]
fn normal_mode_has_one_heart_and_starts_over() {
    let mut g = Game::new(22);
    g.new_run();
    g.start_stage(3);
    assert_eq!(g.hearts, 1);
    g.spawn_kind(ObKind::Log, PLAYER_X - 10.0);
    run(&mut g, 1.5);
    g.jump_press();
    assert_eq!(g.stage, 1);
}

#[test]
fn moss_evolves_like_the_pet() {
    let mut g = Game::new(23);
    g.set_character("moss");
    g.new_run();
    level_to(&mut g, 8);
    assert_eq!(g.ch.name, "Fernando");
    assert!(g.take_events().iter().any(|e| matches!(e, Event::Evolved { name } if name == "Fernando")));
    level_to(&mut g, 16);
    assert_eq!(g.ch.name, "Thornhood");
    // a new run starts as Moss again
    g.new_run();
    assert_eq!(g.ch.name, "Moss");
    // other runners don't evolve
    g.set_character("pink cat");
    g.new_run();
    level_to(&mut g, 20);
    assert_eq!(g.ch.name, "Pink Cat");
}

#[test]
fn each_world_has_its_own_obstacles() {
    let kinds = |stage: u32| {
        let mut g = Game::new(24);
        g.new_run();
        g.start_stage(stage);
        g.inv = 1e9;
        let mut seen = std::collections::HashSet::new();
        for _ in 0..(40.0 / STEP) as usize {
            g.step();
            g.inv = 1e9;
            for o in &g.obstacles {
                seen.insert(format!("{:?}", o.kind));
            }
        }
        seen
    };
    let snow = kinds(7);
    assert!(snow.contains("Snowball") && snow.contains("Icicle"), "{snow:?}");
    assert!(!snow.contains("Bramble"));
    let swamp = kinds(12);
    assert!(swamp.contains("Croc") && swamp.contains("Mushroom"), "{swamp:?}");
}

#[test]
fn mushrooms_bounce_you_up() {
    let mut g = Game::new(25);
    g.new_run();
    g.player.y = 300.0;
    g.player.vy = 300.0;
    g.player.on_ground = false;
    g.spawn_kind(ObKind::Mushroom, PLAYER_X - 30.0);
    run(&mut g, 0.05);
    assert!(g.player.vy < -800.0, "bounced: vy = {}", g.player.vy);
    assert_eq!(g.state, State::Play);
}

#[test]
fn icicles_drop_and_stick_in_the_ground() {
    let mut g = Game::new(26);
    g.new_run();
    g.inv = 1e9;
    g.spawn_kind(ObKind::Icicle, PLAYER_X + 250.0);
    run(&mut g, 1.0);
    let o = g.obstacles.iter().find(|o| o.kind == ObKind::Icicle).expect("icicle");
    assert!(o.landed);
}

#[test]
fn later_grimwings_swoop_high_too() {
    let mut g = Game::new(27);
    g.new_run();
    g.start_stage(10);
    g.dist = g.stage_len - 1800.0;
    g.inv = 1e9;
    let mut high = false;
    for _ in 0..(60.0 / STEP) as usize {
        g.step();
        g.inv = 1e9;
        if let Some(b) = &g.boss {
            assert_eq!(b.n, 2);
            high |= b.high;
        }
    }
    assert!(high);
}

#[test]
fn the_daily_course_is_the_same_however_you_play() {
    let course = |play: bool| {
        let mut g = Game::new(99);
        g.start_daily(20261126);
        assert_eq!(g.mode, RunMode::Daily);
        g.inv = 1e9;
        let mut seen = vec![];
        for i in 0..(30.0 / STEP) as usize {
            if play && i % 90 == 0 {
                g.jump_press();
                g.press_move(i / 90 % 3);
            }
            g.step();
            g.inv = 1e9;
            for o in &g.obstacles {
                if !seen.iter().any(|(id, _)| *id == o.id) {
                    seen.push((o.id, o.kind));
                }
            }
        }
        seen
    };
    // the dashing run gets further in the same time; the course itself is identical
    let (a, b) = (course(false), course(true));
    let n = a.len().min(b.len());
    assert!(n > 10);
    assert_eq!(a[..n], b[..n]);
}

#[test]
fn a_recording_replays_exactly() {
    let mut live = Game::new(5);
    live.start_daily(777);
    for i in 0..3000 {
        if i % 70 == 0 {
            live.jump_press();
        }
        if i % 70 == 30 {
            live.jump_release();
        }
        if i == 400 {
            live.press_move(0);
        }
        live.inv = 1e9; // keep the live run going so it's one recording
        live.step();
    }
    let mut ghost = Game::new(5);
    ghost.start_daily(777);
    ghost.set_script(live.recording().to_vec());
    for _ in 0..3000 {
        ghost.inv = 1e9;
        ghost.step();
    }
    assert_eq!((ghost.dist, ghost.player.y, ghost.score, ghost.state), (live.dist, live.player.y, live.score, live.state));
}

#[test]
fn particles_pack_into_a_flat_buffer() {
    let mut g = Game::new(28);
    g.new_run();
    level_to(&mut g, 3);
    run(&mut g, 0.2);
    let n = g.particle_count();
    assert!(n > 0);
    let buf = g.particle_buffer();
    assert_eq!(buf.len(), n * Game::PARTICLE_STRIDE);
    let max_color = (0..n).map(|i| buf[i * Game::PARTICLE_STRIDE + 7] as usize).max().unwrap();
    assert!(max_color < g.palette().len());
}
