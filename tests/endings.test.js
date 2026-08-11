import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine.js';
import { decideEnding } from '../src/endings.js';

describe('decideEnding', () => {
  it('exit at specialty choice is a neutral path, not a verdict', () => {
    const s = createGame(1);
    const e = decideEnding(s, 'exit-specialty');
    expect(e.id).toBe('another_path');
    expect(e.body).toMatch(/沒有誰的選擇比較高明/);
  });

  it('death from zero health', () => {
    const s = createGame(1);
    s.attrs.health = 0;
    expect(decideEnding(s, 'death').id).toBe('no_self_heal');
  });

  it('aesthetic splits on social talent', () => {
    const s = createGame(1);
    s.career = 'aesthetic';
    s.talents.social = 8;
    expect(decideEnding(s, 'retire').id).toBe('laser');
    s.talents.social = 3;
    expect(decideEnding(s, 'retire').id).toBe('rent');
  });

  // 判定鏈是有序的，先中先贏，所以順序就是一組取捨。這裡釘的是那組取捨的理由：
  // 只有一條路能走到的結局，贏過很多條路都拿得到的結局。
  //
  // 兩件事各量過一次。孩子走偏：120 局有 53 局拿到旗標且活到退休，原本只有 5 局
  // 讀得到結局。恩師那台刀：300 局有 62 局死在台上，53 局拿到「算術問題」，只有
  // 3 局讀到「他死在我的手上」——而那不是巧合，臨床配低才開得壞那台刀，臨床配低
  // 也一定欠債，兩件事被同一個配置綁在一起。
  describe('只有一條路的結局排在前面', () => {
    const only = (mutate) => {
      const s = createGame(1);
      mutate(s);
      return decideEnding(s, 'retire').id;
    };
    const aesthetic = (s) => {
      s.career = 'aesthetic';
      s.flags.forcedAesthetic = true;
    };
    const kidGone = (s) => {
      s.flags.kidEstranged = true;
    };
    const mentorDied = (s) => {
      s.flags.mentorDiedOnTable = true;
    };
    const mentorLived = (s) => {
      s.flags.mentorOperated = true;
      s.flags.mentorSurvived = true;
    };
    const chief = (s) => {
      s.people.chief.succeeded = true;
    };

    it('恩師死在台上壓過被債務逼出去', () => {
      expect(only((s) => (mentorDied(s), aesthetic(s)))).toBe('on_my_table');
    });

    it('親手救回恩師也壓過被債務逼出去', () => {
      expect(only((s) => (mentorLived(s), aesthetic(s)))).toBe('his_hands');
    });

    it('孩子走偏壓過醫美與部主任', () => {
      expect(only((s) => (kidGone(s), aesthetic(s)))).toBe('other_peoples_children');
      expect(only((s) => (kidGone(s), chief(s)))).toBe('other_peoples_children');
    });

    it('恩師那台刀壓過孩子走偏', () => {
      // 兩個都只有一條路，順序是作者定的：親手開死教你的人排在最前面
      expect(only((s) => (mentorDied(s), kidGone(s)))).toBe('on_my_table');
      expect(only((s) => (mentorLived(s), kidGone(s)))).toBe('his_hands');
    });

    it('但人死了就是死了，過勞死仍然最優先', () => {
      const s = createGame(1);
      mentorDied(s);
      kidGone(s);
      s.attrs.health = 0;
      expect(decideEnding(s, 'death').id).toBe('no_self_heal');
    });
  });

  it('professor who no longer operates', () => {
    const s = createGame(1);
    s.rank = 'professor';
    s.attrs.clinical = 30;
    expect(decideEnding(s, 'retire').id).toBe('no_or');
  });

  it('legend in the OR, stranger at home', () => {
    const s = createGame(1);
    s.attrs.clinical = 90;
    s.attrs.familyBond = 10;
    expect(decideEnding(s, 'retire').id).toBe('legend');
  });

  it('the balanced life is merely ordinary — and that is the point', () => {
    const s = createGame(1);
    // 有家庭才談得上平衡；單身高自我是另一個結局
    s.family = { ...s.family, stage: 'married', kids: 1, children: [{ bornAt: 34 }] };
    s.people.spouse.stage = 3;
    s.attrs = { ...s.attrs, clinical: 55, familyBond: 70, health: 60, self: 60 };
    expect(decideEnding(s, 'retire').id).toBe('ordinary');
  });

  it('a life nobody ever walked into is its own ending, not a leftover', () => {
    const s = createGame(1);
    s.attrs = { ...s.attrs, clinical: 55, familyBond: 55, health: 60, self: 70 };
    expect(decideEnding(s, 'retire').id).toBe('alone_on_purpose');
  });

  it('low self paints every ending gray', () => {
    const s = createGame(1);
    s.attrs.clinical = 90;
    s.attrs.familyBond = 10;
    s.attrs.self = 10;
    const e = decideEnding(s, 'retire');
    expect(e.filterKind).toBe('gray');
    expect(e.filterLine).toMatch(/活得這麼累/);
  });

  it('high self earns the reconciliation line', () => {
    const s = createGame(1);
    s.attrs.self = 80;
    expect(decideEnding(s, 'retire').filterKind).toBe('peace');
  });

  it('settlement includes the numbers that never appear on any award', () => {
    const s = createGame(1);
    s.stats.surgeries = 1234;
    s.attrs.papers = 400; // 歸類計分 400 點 ≈ 10 篇
    const labels = decideEnding(s, 'retire').settlement.map((x) => x.label);
    expect(labels).toContain('累計刀量（含跟刀）');
    expect(labels).toContain('錯過的家庭晚餐');
    const cited = decideEnding(s, 'retire').settlement.find((x) => x.label.includes('引用'));
    expect(cited.value).toBe('3 篇');
  });
});
