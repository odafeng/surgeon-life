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

  // 孩子走偏那條鏈原本幾乎讀不到：120 局裡 53 局拿到 kidEstranged 且活到退休，
  // 只有 5 局看得到結局，其餘被部主任（21）與恩師（16）先攔下來。
  // 那兩個結局各自還有別的路可以拿到，這一條沒有。
  describe('孩子走偏排在職涯結局之前', () => {
    const estranged = () => {
      const s = createGame(1);
      s.flags.kidEstranged = true;
      return s;
    };

    it('壓過部主任接班', () => {
      const s = estranged();
      s.people.chief.succeeded = true;
      expect(decideEnding(s, 'retire').id).toBe('other_peoples_children');
    });

    it('壓過親手救回恩師', () => {
      const s = estranged();
      s.flags.mentorOperated = true;
      s.flags.mentorSurvived = true;
      expect(decideEnding(s, 'retire').id).toBe('other_peoples_children');
    });

    it('壓過恩師死在台上', () => {
      const s = estranged();
      s.flags.mentorDiedOnTable = true;
      expect(decideEnding(s, 'retire').id).toBe('other_peoples_children');
    });

    // 但離開健保體系是另一個層級的分岔——那幾局的人生根本不在同一個地方收尾，
    // 醫美自己那三個結局仍然優先。這是刻意留下的，不是漏掉。
    it('讓給醫美階段的結局', () => {
      const s = estranged();
      s.career = 'aesthetic';
      s.talents.social = 8;
      expect(decideEnding(s, 'retire').id).toBe('laser');
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
