import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/events.js';

// 家庭弧線從 family.js 搬到 people-family.js 的時候，舊的那幾格沒有清乾淨，
// 於是同一段文字有兩個主人。試玩者在小孩線撞到第一個：f_kid_stranger 跟
// fa_kindergarten 逐字相同，而前者沒有年齡閘門——134 次演出裡 63% 是孩子
// 超過六歲，最大演到二十六歲的「幼稚園親子日」。
//
// 寫這條掃描是為了找出同一形狀的其他幾個，它立刻又找到一組（f_anniversary
// 與 fa_anniversary）。兩個都處理掉了，這條留著守以後。
//
// 逐字重複本身就是問題，不必等到閘門也錯：玩家會在同一局讀到兩次一樣的話。
const FIELDS = (e) => [
  ['text', e.text],
  ['log', e.log],
  ['memory', e.memory],
  ...(e.choices ?? []).flatMap((c) => [
    ['label', c.label],
    ['log', c.log],
    ['memory', c.memory],
  ]),
];

// 短句可以合理地重複（「你說好。」），長句不行
const MIN = 16;

describe('沒有兩幕共用同一段文字', () => {
  it('正文、log、memory、選項都不重複', () => {
    const seen = new Map();
    for (const e of EVENTS)
      for (const [field, v] of FIELDS(e)) {
        if (typeof v !== 'string' || v.length < MIN) continue;
        const key = `${field}｜${v}`;
        if (!seen.has(key)) seen.set(key, new Set());
        seen.get(key).add(e.id);
      }
    const dup = [...seen.entries()]
      .filter(([, ids]) => ids.size > 1)
      .map(([key, ids]) => {
        const [field, text] = key.split('｜');
        return `${[...ids].join(' 與 ')} 的 ${field}：${text.slice(0, 24)}…`;
      });
    expect(dup, '這幾段文字有兩個主人。合併成一個，或把其中一個改寫。').toEqual([]);
  });

  it('掃描真的看到了東西', () => {
    // 欄位改名或 EVENTS 匯出方式變了的話，上面那條會變成空斷言
    const fields = EVENTS.flatMap(FIELDS).filter(
      ([, v]) => typeof v === 'string' && v.length >= MIN,
    );
    expect(fields.length, '掃不到文字欄位了，這個測試的抓法要跟著改').toBeGreaterThan(500);
  });
});
