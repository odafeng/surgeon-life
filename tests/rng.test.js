import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('same seed produces same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
});
