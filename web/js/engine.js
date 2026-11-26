// Bridge to the Rust engine (compiled to WebAssembly in ../pkg by wasm-pack).
// Every module that imports this waits for the engine to load (top-level await).
import init, { Engine, config, parsePrompt, xpNeeded } from '../pkg/moss_engine.js';

await init();

/** Rule constants from Rust: screen size, moves, boss name... */
export const CFG = config();
/** The running game. The renderer reads it through snapshots (see state.js). */
export const engine = new Engine((Math.random() * 2 ** 32) >>> 0);
export { parsePrompt, xpNeeded };
