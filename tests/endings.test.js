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
    s.attrs = { ...s.attrs, clinical: 55, familyBond: 70, health: 60, self: 60 };
    expect(decideEnding(s, 'retire').id).toBe('ordinary');
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
    expect(labels).toContain('執刀次數');
    expect(labels).toContain('錯過的家庭晚餐');
    const cited = decideEnding(s, 'retire').settlement.find((x) => x.label.includes('引用'));
    expect(cited.value).toBe('3 篇');
  });
});
