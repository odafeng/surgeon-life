import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PROLOGUE } from '../src/events/prologue.js';

// 序章八幕、455 字，點進來的人要連按八次才做到第一個決定。加了一個出口。
//
// 沒有 jsdom，測不了真正的點擊，所以這裡守的是三件會靜靜壞掉的事：
// 按鈕存在且預設隱藏、年誌不會因為跳過而缺一段、問你話的時候不給跳。
const html = readFileSync('index.html', 'utf8');
const ui = readFileSync('src/ui.js', 'utf8');
const body = (() => {
  const from = ui.indexOf('async function runPrologue()');
  expect(from, 'runPrologue 改名了，這個測試要跟著改').toBeGreaterThan(-1);
  return ui.slice(from, ui.indexOf('\n}', from));
})();

describe('序章可以跳過', () => {
  it('按鈕在 index.html 裡，而且預設是隱藏的', () => {
    const tag = html.match(/<button id="btn-skip-prologue"[^>]*>/)?.[0];
    expect(tag, '按鈕不在 index.html 裡').toBeTruthy();
    expect(tag, '沒有 hidden 的話，標題畫面就會看到它').toMatch(/class="[^"]*\bhidden\b/);
  });

  it('跳過之後年誌還是有那八年', () => {
    // remember 要排在 skipped 判斷之前。反過來的話，跳過的人翻年誌
    // 會發現自己是從 25 歲憑空出現的——而年誌是玩家自己的紀錄，不是演出的副產品。
    const remembered = body.indexOf('remember({ kind: ');
    const check = body.indexOf('if (skipped)');
    expect(remembered).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(-1);
    expect(remembered, '跳過會讓年誌少掉序章那幾年').toBeLessThan(check);
  });

  it('放榜那一幕的結果也要記進去', () => {
    // 那一幕有選項，跳過的人不會選，但「你都填了醫學系」這件事還是發生了
    const exam = PROLOGUE.find((s) => s.exam);
    expect(exam.outcome).toBeTruthy();
    expect(body, '跳過的話放榜結果會從年誌消失').toMatch(
      /if \(skipped\)[\s\S]{0,120}step\.outcome/,
    );
  });

  it('askChoice 等待的時候不給跳', () => {
    // showText 只認 textbox 的點擊，askChoice 等的是卡片——
    // 那一刻按跳過會補一次解不開的點擊，然後卡在那裡。
    const ask = body.indexOf('askChoice(');
    const hide = body.lastIndexOf("skipBtn.classList.add('hidden')", ask);
    expect(hide, 'askChoice 之前沒有把跳過鍵收起來，按下去會卡住').toBeGreaterThan(-1);
  });
});
