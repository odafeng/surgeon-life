import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// 試玩者在 28 歲的行動面板遇到「卡片看得到、怎麼點都沒反應」。
// elementsFromPoint 指出最上層不是 button，是 .scroll::after——
// 卷軸的裝飾橫槓。.scroll 是捲動容器，用 bottom 定位的絕對元素是相對
// 整份可捲動內容，內容一長就落在可見卡片中間，而它有背景色又沒有排除點擊。
//
// jsdom 不做 hit test，所以這件事測不到 DOM，要測的是規則本身：
// 絕對定位的純裝飾 pseudo-element 一律不得參與點擊。
const css = readFileSync('style.css', 'utf8');

/** 把 CSS 拆成 { selector, body } 的清單。夠用就好，不需要真的解析器。 */
function rules(source) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(source))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

describe('裝飾元素不能吃掉點擊', () => {
  it('絕對定位又有 content 的 pseudo-element，一律標了 pointer-events: none', () => {
    const offenders = rules(css)
      .filter((r) => /::(before|after)/.test(r.selector))
      .filter((r) => /content\s*:/.test(r.body))
      .filter((r) => /position\s*:\s*absolute/.test(r.body))
      .filter((r) => !/pointer-events\s*:\s*none/.test(r.body))
      .map((r) => r.selector);
    expect(offenders, `這些裝飾層會出現在 hit test 裡：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('捲動容器裡的裝飾橫槓確實排除了點擊', () => {
    // 這一條單獨釘住，因為它就是玩家實際撞到的那一個
    const bar = rules(css).find((r) => r.selector.includes('.scroll::after'));
    expect(bar, '.scroll::after 應該還在').toBeTruthy();
    expect(bar.body).toMatch(/pointer-events\s*:\s*none/);
  });
});
