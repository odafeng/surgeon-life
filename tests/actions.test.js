import { describe, it, expect } from 'vitest';
import { ACTIONS, ACTION_GROUPS, descOf, availableActions } from '../src/actions.js';
import { createGame, getStage } from '../src/engine.js';

const alloc = (c, t, r, f, p) => ({
  clinical: c,
  teaching: t,
  research: r,
  family: f,
  personal: p,
});

/** 一個活在指定年齡的狀態，行動的 cond 大多要讀 alloc 和 stage。 */
function at(age, career = 'surgery') {
  const s = createGame(1);
  s.age = age;
  s.career = career;
  s.alloc = alloc(55, 10, 15, 10, 10);
  return s;
}

describe('ACTION_GROUPS', () => {
  it('covers every action exactly once', () => {
    const grouped = ACTION_GROUPS.flatMap((g) => g.ids);
    expect([...grouped].sort()).toEqual(ACTIONS.map((a) => a.id).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe('descOf', () => {
  it('resolves every action to a non-empty string at every stage', () => {
    for (const age of [25, 29, 40, 55]) {
      const s = at(age);
      for (const a of ACTIONS) {
        expect(typeof descOf(a, s), `${a.id} @ ${age}`).toBe('string');
        expect(descOf(a, s).length, `${a.id} @ ${age}`).toBeGreaterThan(0);
      }
    }
  });

  it('does not offer to clear the OR schedule to someone who cannot', () => {
    const write = ACTIONS.find((a) => a.id === 'act_write');
    expect(descOf(write, at(25))).not.toMatch(/刀表/);
    expect(descOf(write, at(29))).not.toMatch(/刀表/);
    expect(descOf(write, at(40))).toMatch(/刀表/);
  });
});

describe('act_moonlight', () => {
  // 住院醫師是受訓身分，兼職受限也還沒有獨立執業資格。
  it('is closed to trainees and open to attendings', () => {
    for (const age of [25, 29]) {
      const s = at(age);
      expect(getStage(s).key).not.toBe('attending');
      expect(availableActions(s, 12, []).map((a) => a.id)).not.toContain('act_moonlight');
    }
    const s = at(40);
    expect(availableActions(s, 12, []).map((a) => a.id)).toContain('act_moonlight');
  });
});
