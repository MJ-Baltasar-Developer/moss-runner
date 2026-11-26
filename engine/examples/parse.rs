//! Print the traits for each description read from stdin (one per line) as JSON lines.
//! `echo "blue robot with sunglasses" | cargo run --example parse`
use std::io::BufRead;

fn main() {
    for line in std::io::stdin().lock().lines() {
        let t = moss_engine::character::parse_prompt(&line.unwrap());
        println!("{}", serde_json::to_string(&t).unwrap());
    }
}
