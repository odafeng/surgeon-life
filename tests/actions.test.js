import { describe, it, expect } from 'vitest';
import {
  ACTIONS,
  ACTION_GROUPS,
  descOf,
  availableActions,
  repeatFactor,
  settleStreaks,
  runAction,
} from '../src/actions.js';
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

describe('重複衰退', () => {
  const drill = ACTIONS.find((a) => a.id === 'act_drill');
  const dinner = ACTIONS.find((a) => a.id === 'act_dinner');

  it('連續做的收穫逐年遞減，第四年之後打平', () => {
    const s = at(40);
    const seen = [];
    for (let i = 0; i < 5; i++) {
      seen.push(repeatFactor(s, drill));
      settleStreaks(s, ['act_drill']);
    }
    expect(seen).toEqual([1, 0.75, 0.55, 0.45, 0.45]);
  });

  it('停兩年回到全效', () => {
    const s = at(40);
    for (let i = 0; i < 4; i++) settleStreaks(s, ['act_drill']);
    expect(repeatFactor(s, drill)).toBe(0.45);
    settleStreaks(s, []);
    expect(repeatFactor(s, drill)).toBeLessThan(1);
    settleStreaks(s, []);
    expect(repeatFactor(s, drill)).toBe(1);
  });

  it('陪家人不衰退——重複本身就是重點', () => {
    const s = at(40);
    s.family.stage = 'married';
    for (let i = 0; i < 6; i++) settleStreaks(s, ['act_dinner']);
    expect(repeatFactor(s, dinner)).toBe(1);
  });

  it('實際套用到數值上，第三年的臨床增益明顯少於第一年', () => {
    const a = at(40);
    const b = at(40);
    const before = a.attrs.clinical;
    runAction(a, drill);
    const firstGain = a.attrs.clinical - before;

    for (let i = 0; i < 2; i++) settleStreaks(b, ['act_drill']);
    const beforeB = b.attrs.clinical;
    runAction(b, drill);
    const thirdGain = b.attrs.clinical - beforeB;

    expect(thirdGain).toBeCloseTo(firstGain * 0.55, 5);
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
