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

/**
 * text / label / log / memory 都可以是狀態的函式。
 * 兩種性別各解析一次——女性線只在 gender 為 f 時走另一半分支，
 * 只驗一種性別的話，那一半永遠不會被跑到。
 */
function mustResolve(field, where) {
  expect(['string', 'function'], where).toContain(typeof field);
  if (typeof field !== 'function') return;
  for (const gender of ['m', 'f']) {
    const s = createGame(1, gender);
    s.age = 40;
    const out = field(s);
    expect(typeof out, `${where} @${gender}`).toBe('string');
    expect(out.length, `${where} @${gender}`).toBeGreaterThan(0);
  }
}

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
      mustResolve(e.text, `${e.id} text`);
      if (e.log) mustResolve(e.log, `${e.id} log`);
      if (e.memory) mustResolve(e.memory, `${e.id} memory`);
      if (e.choices) {
        expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
        for (const c of e.choices) {
          mustResolve(c.label, `${e.id} label`);
          mustResolve(c.log, `${e.id} log`);
          if (c.memory) mustResolve(c.memory, `${e.id} memory`);
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

  // 兩套立繪都要齊。少一張的話，選了那個性別的玩家會在某一年看到破圖。
  it('兩種性別、每個年齡段的四種表情都有檔案', () => {
    for (const who of ['', 'f-']) {
      for (const age of AGES) {
        expect(existsSync(`assets/portrait-${who}${age}.webp`), `${who}${age} 平靜`).toBe(true);
        for (const m of MOODS)
          expect(existsSync(`assets/portrait-${who}${age}-${m}.webp`), `${who}${age} ${m}`).toBe(
            true,
          );
      }
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

// 玩家可見的新選項要有自己的回歸測試，不能只靠全域的資料完整性檢查——
// 那一支只驗形狀（欄位型別、效果鍵合法），不會發現某個選項整個消失。
describe('審稿的利益衝突', () => {
  const ev = () => EVENTS.find((e) => e.id === 'ac_be_reviewer');

  it('這一幕確實擺出了利益衝突', () => {
    // 沒有重疊這個前提，「婉拒」就沒有意義，測試也就失去意思
    expect(ev().text).toMatch(/重疊/);
  });

  it('揭露重疊並婉拒是選項之一，而且排在最前面', () => {
    const c = ev().choices[0];
    expect(c.label).toMatch(/婉拒/);
    expect(c.label).toMatch(/編輯/);
  });

  it('婉拒只回自我，不動教學與計分', () => {
    const c = ev().choices[0];
    expect(c.effects.self).toBeGreaterThan(0); // 做對的事，自我會回來
    // 審稿不是教學服務，婉拒不該扣教學分數；也不該因此多拿歸類計分
    expect(c.effects.teaching ?? 0).toBe(0);
    expect(c.effects.papers ?? 0).toBe(0);
    expect(c.memory).toBeTruthy(); // 這是會被記進「你記得的事」的決定
  });

  it('不替合規行為捏造後果', () => {
    // ICMJE 與 COPE 都把「向編輯揭露並迴避」當成正常流程，編輯不會因此記你一筆。
    // 第一版寫「少了一次在期刊露臉」，跟同幕的匿名審稿矛盾；
    // 第二版改成「下次他想到誰就是想不到你」，是把矛盾換成沒有依據的報復。
    const c = ev().choices[0];
    expect(c.log).not.toMatch(/露臉/); // 匿名審稿不會在期刊上出現
    expect(c.log).not.toMatch(/想不到你|記你一筆|以後不會再找你/); // 沒有依據的職涯懲罰
    expect(c.log).toMatch(/編輯|換了人審/);
    // 同一幕的另一個選項明寫署名匿名，兩邊不能互相打架
    expect(ev().choices.some((x) => /匿名/.test(x.log))).toBe(true);
  });

  it('原本那兩條路都還在——婉拒是多一個選擇，不是取代', () => {
    const labels = ev().choices.map((c) => c.label);
    expect(labels.length).toBe(3);
    expect(labels.some((l) => /照規矩審/.test(l))).toBe(true);
    expect(labels.some((l) => /延長審查期限/.test(l))).toBe(true);
  });
});
