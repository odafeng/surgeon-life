import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PROLOGUE, EVENTS } from '../src/events.js';
import { decideEnding } from '../src/endings.js';
import { createGame } from '../src/engine.js';

const VALID_STAGES = ['pgy', 'resident', 'attending', 'aesthetic'];
const VALID_EFFECT_KEYS = [
  'clinical',
  'teaching',
  'papers',
  'self',
  'health',
  'familyBond',
  'money',
];
const VALID_STAT_KEYS = ['surgeries', 'livesSaved', 'lawsuits', 'missedDinners'];

describe('PROLOGUE', () => {
  it('runs 16→24 and contains the exam event at 18 whose every choice leads nowhere else', () => {
    expect(PROLOGUE[0].age).toBe(16);
    expect(PROLOGUE.at(-1).age).toBe(24);
    const exam = PROLOGUE.find((p) => p.exam);
    expect(exam.age).toBe(18);
    expect(exam.choices.length).toBeGreaterThanOrEqual(3);
    expect(exam.outcome).toMatch(/醫學系/);
  });
});

describe('EVENTS integrity', () => {
  it('ids are unique', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every event is well-formed', () => {
    for (const e of EVENTS) {
      expect(e.id, e.id).toBeTruthy();
      expect(Array.isArray(e.stages) && e.stages.length > 0, e.id).toBe(true);
      for (const s of e.stages) expect(VALID_STAGES, `${e.id} stage ${s}`).toContain(s);
      expect(['string', 'function'], e.id).toContain(typeof e.text);
      if (e.choices) {
        expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
        for (const c of e.choices) {
          expect(typeof c.label, e.id).toBe('string');
          expect(typeof c.log, e.id).toBe('string');
          for (const k of Object.keys(c.effects || {}))
            expect(VALID_EFFECT_KEYS, e.id).toContain(k);
          for (const k of Object.keys(c.stats || {})) expect(VALID_STAT_KEYS, e.id).toContain(k);
        }
      } else {
        for (const k of Object.keys(e.effects || {})) expect(VALID_EFFECT_KEYS, e.id).toContain(k);
        for (const k of Object.keys(e.stats || {})) expect(VALID_STAT_KEYS, e.id).toContain(k);
      }
    }
  });

  it('the specialty choice exists, forced at age 26, and offers a way out', () => {
    const e = EVENTS.find((x) => x.id === 'pgy_specialty');
    expect(e.forced({ age: 26 })).toBe(true);
    expect(e.forced({ age: 25 })).toBe(false);
    const exit = e.choices.find((c) => c.set);
    expect(exit).toBeTruthy();
  });

  it('the lawsuit event is special (never in the random pool)', () => {
    const e = EVENTS.find((x) => x.id === 'a_lawsuit');
    expect(e.special).toBe(true);
  });

  it('every stage has a pool big enough that a 40-year life does not repeat itself', () => {
    // 一局最多走 40 年、每年抽 2 個，池子太小就會連年跳出同一則新聞。
    // 醫美階段曾經只有 4 個事件，玩起來像壞掉的跑馬燈。
    for (const s of VALID_STAGES) {
      const n = EVENTS.filter((e) => e.stages.includes(s) && !e.special).length;
      expect(n, `stage ${s}`).toBeGreaterThanOrEqual(35);
    }
  });

  it('the whole game carries 200+ events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(200);
  });
});

// 引用不存在的圖檔不會讓測試變紅,只會讓玩家看到破圖——所以在這裡擋住。
describe('美術素材引用', () => {
  const AGES = [25, 30, 42, 60];
  const MOODS = ['weary', 'wry', 'lifted'];

  it('每個年齡段的四種表情都有檔案', () => {
    for (const age of AGES) {
      expect(existsSync(`assets/portrait-${age}.webp`), `${age} 平靜`).toBe(true);
      for (const m of MOODS)
        expect(existsSync(`assets/portrait-${age}-${m}.webp`), `${age} ${m}`).toBe(true);
    }
  });

  it('事件引用的場景與表情都存在', () => {
    for (const e of EVENTS) {
      if (e.scene)
        expect(existsSync(`assets/scene-${e.scene}.webp`), `${e.id} → ${e.scene}`).toBe(true);
      if (e.mood) expect(MOODS, `${e.id} → ${e.mood}`).toContain(e.mood);
    }
  });

  it('每個結局引用的場景都存在', () => {
    const causes = ['retire', 'death', 'exit-specialty'];
    for (const cause of causes) {
      for (const seed of [1, 2, 3]) {
        const s = createGame(seed);
        const ending = decideEnding(s, cause);
        expect(
          existsSync(`assets/scene-${ending.scene}.webp`),
          `${ending.id} → ${ending.scene}`,
        ).toBe(true);
      }
    }
  });

  it('每個階段的預設場景都存在', () => {
    for (const name of [
      'corridor',
      'or',
      'aesthetic',
      'oncall',
      'office',
      'home',
      'clinic',
      'court',
    ])
      expect(existsSync(`assets/scene-${name}.webp`), name).toBe(true);
  });
});

// 事件冷卻：剛看過的不再抽。沒有這條的話，池子小的階段會連年跳出同一則。
describe('事件不會連年重複', () => {
  it('連續 20 年至少看到 25 種不同事件', async () => {
    const { createGame, pickEvents } = await import('../src/engine.js');
    for (const setup of [
      (s) => {
        s.career = 'aesthetic';
        s.talents.social = 3;
      },
      () => {},
    ]) {
      const s = createGame(42);
      s.age = 40;
      s.alloc = { clinical: 40, teaching: 10, research: 20, family: 15, personal: 15 };
      setup(s);
      const seen = new Set();
      for (let y = 0; y < 20; y++) {
        for (const e of pickEvents(s)) seen.add(e.id);
        s.age++;
      }
      expect(seen.size).toBeGreaterThanOrEqual(25);
    }
  });
});
