import { describe, it, expect } from 'vitest';
import { createGame, playYear } from '../src/engine.js';

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
