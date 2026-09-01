//! Rust 2021 + WebAssembly Micro-Engine
//! Provides high-throughput hash calculation and prime sieve benchmarking.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct EdgeComputeEngine {
    cycles: u64,
}

#[wasm_bindgen]
impl EdgeComputeEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { cycles: 0 }
    }

    /// Fast 64-bit non-cryptographic hash (FNV-1a)
    pub fn compute_fnv1a_hash(&mut self, input: &str) -> String {
        self.cycles += 1;
        let mut hash: u64 = 0xcbf29ce484222325;
        for byte in input.as_bytes() {
            hash ^= *byte as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
        format!("{:016x}", hash)
    }

    /// Prime sieve benchmark testing WebAssembly execution throughput
    pub fn count_primes_up_to(&self, limit: u32) -> u32 {
        if limit < 2 {
            return 0;
        }
        let mut is_prime = vec![true; limit as usize + 1];
        is_prime[0] = false;
        is_prime[1] = false;

        let mut count = 0;
        let sqrt_limit = (limit as f64).sqrt() as usize;

        for p in 2..=sqrt_limit {
            if is_prime[p] {
                let mut multiple = p * p;
                while multiple <= limit as usize {
                    is_prime[multiple] = false;
                    multiple += p;
                }
            }
        }

        for &p in &is_prime {
            if p {
                count += 1;
            }
        }
        count
    }
}
