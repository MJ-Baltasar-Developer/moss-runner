//! Hex colour helpers, matching the renderer's JavaScript versions exactly.

fn hex_rgb(h: &str) -> [f64; 3] {
    let h = h.trim_start_matches('#');
    let p = |i: usize| u8::from_str_radix(h.get(i..i + 2).unwrap_or("00"), 16).unwrap_or(0) as f64;
    [p(0), p(2), p(4)]
}

fn rgb_hex(c: [f64; 3]) -> String {
    // JavaScript's Math.round rounds .5 up; for these non-negative values f64::round does the same
    let b = |v: f64| v.round().clamp(0.0, 255.0) as u8;
    format!("#{:02x}{:02x}{:02x}", b(c[0]), b(c[1]), b(c[2]))
}

/// Blend two colours: t = 0 gives `a`, t = 1 gives `b`.
pub fn mix(a: &str, b: &str, t: f64) -> String {
    let (a, b) = (hex_rgb(a), hex_rgb(b));
    rgb_hex([0, 1, 2].map(|i| a[i] + (b[i] - a[i]) * t))
}

/// Darken (t < 0) or lighten (t > 0) a colour.
pub fn shade(h: &str, t: f64) -> String {
    if t < 0.0 {
        mix(h, "#000000", -t)
    } else {
        mix(h, "#ffffff", t)
    }
}

/// 32-bit FNV-1a over the text's UTF-16 code units, like the JavaScript `hashStr`.
pub fn hash_str(s: &str) -> u32 {
    let mut x: u32 = 2_166_136_261;
    for ch in s.chars() {
        let mut buf = [0u16; 2];
        x ^= ch.encode_utf16(&mut buf)[0] as u32;
        x = x.wrapping_mul(16_777_619);
    }
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shade_darkens_and_lightens() {
        assert_eq!(shade("#808080", -1.0), "#000000");
        assert_eq!(shade("#808080", 1.0), "#ffffff");
        assert_eq!(shade("#7fa86b", 0.0), "#7fa86b");
    }

    #[test]
    fn mix_halfway() {
        assert_eq!(mix("#000000", "#ffffff", 0.5), "#808080");
    }

    #[test]
    fn hash_is_fnv1a() {
        assert_eq!(hash_str(""), 2_166_136_261);
        assert_eq!(hash_str("a"), 0xe40c292c);
    }
}
