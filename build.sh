#!/bin/sh
# Build the Rust engine to WebAssembly into web/pkg, where the page loads it from.
# Needs: Rust (https://rustup.rs) with the wasm32 target, and wasm-pack.
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-pack
set -e
cd "$(dirname "$0")"
wasm-pack build engine --target web --out-dir ../web/pkg --release --no-pack
echo "Built web/pkg. Serve the web folder, e.g.: python3 -m http.server 8000 --directory web"
