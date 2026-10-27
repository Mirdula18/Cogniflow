/** mulberry32: tiny seeded PRNG, integer maths only so output is identical on every machine. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (lo: number, hi: number): number => lo + Math.floor(next() * (hi - lo + 1));
  const chance = (p: number): boolean => next() < p;
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T;

  /** Picks by weight; weights need not sum to 1. */
  const weighted = <T>(items: readonly T[], weights: readonly number[]): T => {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = next() * total;
    for (const [i, w] of weights.entries()) {
      r -= w;
      if (r < 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  };

  /** n distinct integers from 0..max-1. */
  const sampleIndices = (max: number, n: number): number[] => {
    const all = Array.from({ length: max }, (_, i) => i);
    for (let i = max - 1; i > 0; i--) {
      const j = int(0, i);
      [all[i], all[j]] = [all[j] as number, all[i] as number];
    }
    return all.slice(0, n);
  };

  return { next, int, chance, pick, weighted, sampleIndices };
}

export type Rng = ReturnType<typeof createRng>;
