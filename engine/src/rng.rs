//! A small seeded random number generator (xorshift64*). Seeding it makes runs reproducible,
//! which is what lets the tests replay exactly the same game.

#[derive(Clone, Debug)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        // splitmix64 the seed so small seeds (0, 1, 2...) still give well-mixed states
        let mut z = seed.wrapping_add(0x9E37_79B9_7F4A_7C15);
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^= z >> 31;
        Rng(if z == 0 { 1 } else { z })
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    /// Uniform in [0, 1).
    pub fn f(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// Uniform in [a, b).
    pub fn range(&mut self, a: f64, b: f64) -> f64 {
        a + self.f() * (b - a)
    }

    pub fn chance(&mut self, p: f64) -> bool {
        self.f() < p
    }

    pub fn pick<T: Copy>(&mut self, items: &[T]) -> T {
        items[((self.f() * items.len() as f64) as usize).min(items.len() - 1)]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_seed_same_numbers() {
        let (mut a, mut b) = (Rng::new(7), Rng::new(7));
        for _ in 0..100 {
            assert_eq!(a.f(), b.f());
        }
    }

    #[test]
    fn stays_in_range() {
        let mut r = Rng::new(1);
        for _ in 0..10_000 {
            let v = r.range(-3.0, 5.0);
            assert!((-3.0..5.0).contains(&v));
        }
    }
}
