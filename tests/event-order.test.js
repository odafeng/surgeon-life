import { describe, it, expect } from 'vitest';
import { createGame, playYear, getStage } from '../src/engine.js';
import { EVENTS } from '../src/events.js';

const alloc = (c, t, r, f, p) => ({
  clinical: c,
  teaching: t,
  research: r,
  family: f,
  personal: p,
});

/** 已婚、經營多年、孩子明年出生的那一年。 */
function expecting(seed) {
  const s = createGame(seed);
  s.age = 34;
  s.family = { stage: 'married', kids: 0, children: [], floor: 20, invested: 9, neglect: 0 };
  s.people.spouse.stage = 4;
  s.flags.expectingChild = true;
  return s;
}

describe('事件順序', () => {
  // pickEvents 一次算完全年的 cond，playYear 卻是一幕一幕演的。
  // 前一幕改掉狀態之後，後一幕的前提可能已經不成立。
  it('孩子出生之後，同一年不會再問「要不要有個孩子」', async () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = expecting(seed);
      const asked = [];
      await playYear(s, alloc(45, 10, 10, 25, 10), async (ev) => {
        asked.push(ev.id);
        return 0;
      });
      if (s.family.kids > 0) {
        expect(asked, `seed ${seed}`).not.toContain('fa_pregnancy');
      }
    }
  });
});

describe('升主治', () => {
  // 主治身分在跨進那一年就成立。晚一年才成立的話，
  // 「你當主治的第一台刀」會演在「你升上主治醫師」前面。
  it('跨進 32 歲的當下就拿到主治職級，而且只公告一次', async () => {
    const s = createGame(3);
    s.age = 31;
    s.alloc = alloc(60, 10, 10, 10, 10);
    const { logs } = await playYear(s, alloc(60, 10, 10, 10, 10), async () => 0);
    expect(getStage(s).key).toBe('attending');
    expect(s.rank).toBe('vs');
    const announced = logs.filter((l) => l.text.includes('你升上主治醫師'));
    expect(announced).toHaveLength(1);
    expect(announced[0].text).toMatch(/300 點/);
  });
});

describe('選項標籤', () => {
  it('可以是函式，會依當下狀態改寫', async () => {
    const s = createGame(1);
    s.age = 40;
    s.family = { stage: 'steady', kids: 0, children: [], floor: 15, invested: 9, neglect: 0 };
    s.people.spouse.stage = 2;
    const ring = EVENTS.find((e) => e.id === 'fa_ring');
    const wait = ring.choices.find((c) => typeof c.label === 'function');
    expect(wait.label(s)).not.toMatch(/等升上主治/);
    s.age = 29;
    expect(wait.label(s)).toMatch(/等升上主治/);
  });
});
