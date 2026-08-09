import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('same seed produces same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('int(min,max) stays within inclusive bounds', () => {
    const r = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = r.int(1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('chance(0) is never true, chance(1) is always true', () => {
    const r = createRng(9);
    for (let i = 0; i < 50; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it('pick returns an element of the array', () => {
    const r = createRng(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) expect(arr).toContain(r.pick(arr));
  });
});
