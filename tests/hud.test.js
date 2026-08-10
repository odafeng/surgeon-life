import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { rankLine, sealTitle } from '../src/view.js';
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

  it('沒升上主治之前，名牌印的是點值', () => {
    // 這是 ui.js 那個順序不變量為什麼重要——名牌真的會讀 pointValue，
    // 而且只在這個階段讀。哪天名牌不印點值了，下面那個測試就該一起拿掉。
    const s = createGame(1);
    s.age = 29;
    s.pointValue = 0.91;
    expect(sealTitle(s)).toBe('健保點值 0.91');
  });
});

// renderHud 排在 rollPointValue 前面，於是名牌印的是去年的點值（第一年是 fallback
// 0.82），配置盤 chip 印的是今年的——同一個畫面上兩個數字。上一次修這個 bug 我只
// 統一了來源（兩邊都讀 state.pointValue），沒有動讀取時機，所以它又長回來一次。
// 這裡守的是順序，不是數值：真正的螢幕要 jsdom 才跑得起來，但會壞的是這個先後。
describe('yearLoop 的先後順序', () => {
  const body = (() => {
    const src = readFileSync('src/ui.js', 'utf8');
    const from = src.indexOf('async function yearLoop()');
    expect(from, 'yearLoop 改名了，這個測試要跟著改').toBeGreaterThan(-1);
    const to = src.indexOf('\n}', from);
    return src.slice(from, to);
  })();
  const at = (call) => body.indexOf(call);

  it('點值先擲，畫面才畫', () => {
    expect(at('rollPointValue(state)')).toBeGreaterThan(-1);
    expect(at('renderHud(state)')).toBeGreaterThan(-1);
    expect(at('rollPointValue(state)'), '名牌與配置盤會顯示不同的點值').toBeLessThan(
      at('renderHud(state)'),
    );
  });

  it('點值先擲，才存檔', () => {
    // 存檔沒帶到這次擲的結果的話，重新載入會再擲一次，數字跟著換
    expect(at('rollPointValue(state)'), '重新載入會擲出不一樣的點值').toBeLessThan(
      at('autosave()'),
    );
  });
});
