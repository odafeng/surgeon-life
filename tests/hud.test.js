import { describe, it, expect } from 'vitest';
import { rankLine } from '../src/view.js';
import { createGame } from '../src/engine.js';

// HUD 上職級那一行後面的數字是「當主治的第幾年」，不是「當這個職級的第幾年」。
// 原本兩者直接相接，於是 35 歲才升上助理教授的人在 36 歲看到「助理教授・第 5 年」，
// 36 歲底升副教授的人在 37 歲看到「副教授・第 6 年」——玩家沒有理由不那樣讀。
const at = (age, rank) => {
  const s = createGame(1);
  s.age = age;
  s.rank = rank;
  return rankLine(s);
};

describe('HUD 的職級與年資', () => {
  it('掛了教職的時候，年資要說清楚算的是主治', () => {
    expect(at(36, 'assistant')).toBe('助理教授・主治第 5 年');
    expect(at(37, 'associate')).toBe('副教授・主治第 6 年');
    expect(at(45, 'professor')).toBe('教授・主治第 14 年');
  });

  it('剛升等的隔年不會宣稱自己當了這個職級好幾年', () => {
    // 35 歲升助理教授、36 歲底升副教授的那一局，就是試玩者實際看到的情況
    for (const [age, rank] of [
      [36, 'assistant'],
      [37, 'associate'],
    ]) {
      const line = at(age, rank);
      const label = line.split('・')[0];
      expect(line, `${label} 的年資不得看起來像職級年資`).not.toMatch(
        new RegExp(`${label}・第 \\d+ 年`),
      );
    }
  });

  it('職級本身就是主治醫師時不重複標', () => {
    expect(at(32, 'vs')).toBe('主治醫師・第 1 年');
    expect(at(32, 'vs')).not.toMatch(/主治第/);
  });

  it('住院醫師照舊顯示住院醫師的年資', () => {
    expect(at(29, 'none')).toBe('外科住院醫師・第 3 年');
  });
});
