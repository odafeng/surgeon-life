import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine.js';
import { decideEnding } from '../src/endings.js';

// 結局卡從結算單裡挑四欄印在圖上。那是靠字串比對抓的，欄位一改名就靜靜少一欄——
// 圖還是產得出來，只是空了一格，沒有任何地方會報錯。
//
// canvas 在 Node 裡跑不起來，所以這裡不驗畫面，只驗它依賴的那四個名字還在。
// 版面是在瀏覽器裡看過的：標題與記憶在上、場景留中間、數字與出處錨在底部。
const HEADLINE = (() => {
  const src = readFileSync('src/share.js', 'utf8');
  const m = src.match(/const HEADLINE = \[([^\]]+)\]/);
  expect(m, 'share.js 的 HEADLINE 改寫法了，這個測試要跟著改').toBeTruthy();
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
})();

describe('結局卡挑的那幾欄', () => {
  it('抓到的欄位名不是空的', () => {
    expect(HEADLINE.length).toBeGreaterThan(2);
  });

  it('每一欄在結算單裡都找得到', () => {
    const s = createGame(1);
    s.age = 66;
    const labels = decideEnding(s, 'retire').settlement.map((r) => r.label);
    const missing = HEADLINE.filter((h) => !labels.includes(h));
    expect(missing, '這幾欄結算單裡沒有，卡片上會空一格而且不會有人知道').toEqual([]);
  });

  it('換一種結局也還在', () => {
    // 結算單是共用的，但這一條擋住「某個結局把某欄拿掉」
    const s = createGame(2);
    s.age = 66;
    s.flags.mentorDiedOnTable = true;
    const labels = decideEnding(s, 'retire').settlement.map((r) => r.label);
    expect(HEADLINE.filter((h) => !labels.includes(h))).toEqual([]);
  });
});
