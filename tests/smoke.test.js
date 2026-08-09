import { describe, it, expect } from 'vitest';
import { createGame, playYear, getStage, conformAllocation, ALLOC_KEYS } from '../src/engine.js';
import { createRng } from '../src/rng.js';

function randomAlloc(state, rng) {
  const min = getStage(state).minClinicalPct;
  const alloc = { clinical: min, teaching: 0, research: 0, family: 0, personal: 0 };
  let left = 100 - min;
  while (left > 0) {
    const chunk = Math.min(left, 5);
    alloc[rng.pick(ALLOC_KEYS)] += chunk;
    left -= chunk;
  }
  // 制度的臨床下限與承諾的家庭下限都要顧到，跟真正的玩家一樣
  const out = conformAllocation(state, alloc);
  const sum = ALLOC_KEYS.reduce((s, k) => s + out[k], 0);
  out.personal += 100 - sum;
  return out;
}

describe('smoke: random playthroughs', () => {
  it('200 random lives all reach an ending with attrs in bounds', async () => {
    for (let seed = 1; seed <= 200; seed++) {
      const state = createGame(seed);
      const rng = createRng(seed * 7919);
      const chooser = async (ev) => rng.int(0, ev.choices.length - 1);
      let ending = null;
      let guard = 0;
      while (!ending && guard++ < 60) {
        ({ ending } = await playYear(state, randomAlloc(state, rng), chooser));
        for (const k of ['clinical', 'teaching', 'self', 'health', 'familyBond']) {
          expect(state.attrs[k], `seed ${seed} attr ${k}`).toBeGreaterThanOrEqual(0);
          expect(state.attrs[k], `seed ${seed} attr ${k}`).toBeLessThanOrEqual(100);
        }
        expect(state.attrs.papers, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      }
      expect(ending, `seed ${seed} never ended`).not.toBeNull();
      expect(ending.title, `seed ${seed}`).toBeTruthy();
      expect(ending.settlement.length, `seed ${seed}`).toBeGreaterThan(0);
    }
  }, 30000);

  it('multiple distinct endings are reachable across seeds', async () => {
    const seen = new Set();
    for (let seed = 1; seed <= 120; seed++) {
      const state = createGame(seed);
      const rng = createRng(seed * 104729);
      const chooser = async (ev) => rng.int(0, ev.choices.length - 1);
      let ending = null;
      let guard = 0;
      while (!ending && guard++ < 60) {
        ({ ending } = await playYear(state, randomAlloc(state, rng), chooser));
      }
      seen.add(ending.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  }, 30000);
});
