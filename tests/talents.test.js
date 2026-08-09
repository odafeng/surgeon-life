import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';
import { rollTalents, TALENT_LABELS } from '../src/talents.js';

describe('rollTalents', () => {
  it('exam is always fixed at 9 — the only guaranteed talent', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(rollTalents(createRng(seed)).exam).toBe(9);
    }
  });

  it('other talents are random within 1..10', () => {
    const keys = ['dexterity', 'research', 'charisma', 'social', 'constitution'];
    const seen = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      const t = rollTalents(createRng(seed));
      for (const k of keys) {
        expect(t[k]).toBeGreaterThanOrEqual(1);
        expect(t[k]).toBeLessThanOrEqual(10);
        seen.add(`${k}:${t[k]}`);
      }
    }
    expect(seen.size).toBeGreaterThan(20); // 確認不是寫死同一組
  });

  it('labels cover every talent key', () => {
    const t = rollTalents(createRng(1));
    for (const k of Object.keys(t)) expect(TALENT_LABELS[k]).toBeTruthy();
  });
});
