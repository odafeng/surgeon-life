import { describe, it, expect } from 'vitest';
import {
  createGame,
  getStage,
  validateAllocation,
  applyEffects,
  applyStats,
  ALLOC_KEYS,
} from '../src/engine.js';

describe('createGame', () => {
  it('starts at age 25 with a license and rolled talents', () => {
    const s = createGame(1);
    expect(s.age).toBe(25);
    expect(s.career).toBe('surgery');
    expect(s.talents.exam).toBe(9);
    expect(s.attrs.health).toBe(88);
    expect(s.family.stage).toBe('single');
  });
});

describe('getStage', () => {
  it('maps age to career stage', () => {
    const s = createGame(1);
    expect(getStage(s).key).toBe('pgy');
    s.age = 27;
    expect(getStage(s).key).toBe('resident');
    s.age = 32;
    expect(getStage(s).key).toBe('attending');
  });

  it('aesthetic career overrides age mapping', () => {
    const s = createGame(1);
    s.age = 40;
    s.career = 'aesthetic';
    expect(getStage(s).key).toBe('aesthetic');
  });
});

describe('validateAllocation', () => {
  it('accepts a valid allocation summing to 100', () => {
    const s = createGame(1); // pgy, minClinicalPct 50
    const alloc = { clinical: 50, teaching: 0, research: 20, family: 15, personal: 15 };
    expect(validateAllocation(s, alloc)).toEqual(alloc);
  });

  it('rejects sums other than 100', () => {
    const s = createGame(1);
    expect(() =>
      validateAllocation(s, { clinical: 50, teaching: 0, research: 0, family: 0, personal: 0 }),
    ).toThrow(/100/);
  });

  it('rejects clinical below the stage minimum — you do not get a choice', () => {
    const s = createGame(1); // pgy minClinicalPct 50
    expect(() =>
      validateAllocation(s, { clinical: 45, teaching: 5, research: 20, family: 15, personal: 15 }),
    ).toThrow(/臨床/);
  });

  it('rejects negatives and non-integers', () => {
    const s = createGame(1);
    expect(() =>
      validateAllocation(s, { clinical: 101, teaching: -1, research: 0, family: 0, personal: 0 }),
    ).toThrow();
    expect(() =>
      validateAllocation(s, {
        clinical: 50.5,
        teaching: 4.5,
        research: 20,
        family: 10,
        personal: 15,
      }),
    ).toThrow();
  });

  it('exposes ALLOC_KEYS in stable order', () => {
    expect(ALLOC_KEYS).toEqual(['clinical', 'teaching', 'research', 'family', 'personal']);
  });
});

describe('applyEffects / applyStats', () => {
  it('clamps attrs to 0..100 but money and papers are unclamped/floored at 0', () => {
    const s = createGame(1);
    applyEffects(s, { self: 999, health: -999, money: -500, papers: 3 });
    expect(s.attrs.self).toBe(100);
    expect(s.attrs.health).toBe(0);
    expect(s.attrs.money).toBe(-490);
    expect(s.attrs.papers).toBe(3);
  });

  it('accumulates stats counters', () => {
    const s = createGame(1);
    applyStats(s, { surgeries: 2, livesSaved: 1 });
    applyStats(s, { surgeries: 1 });
    expect(s.stats.surgeries).toBe(3);
    expect(s.stats.livesSaved).toBe(1);
  });
});
