import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// 試玩者在 28 歲的行動面板遇到「卡片看得到、怎麼點都沒反應」。
// elementsFromPoint 指出最上層不是 button，是 .scroll::after——
// 卷軸的裝飾橫槓。.scroll 是捲動容器，用 bottom 定位的絕對元素是相對
// 整份可捲動內容，內容一長就落在可見卡片中間，而它有背景色又沒有排除點擊。
//
// 加上 pointer-events: none 只解決了點擊，橫槓仍然畫在卡片上。
// 真正的原因是絕對定位的子元素會跟著捲動容器的內容一起捲；
// 這個裝飾在不捲動時又會被 overflow 裁掉，等於從來沒有正確顯示過，已移除。
//
// jsdom 不做 hit test 也不做版面計算，所以測的是規則本身。
// 只釘這一條：本輪的證據只支持 .scroll 的裝飾層，不夠支持任何更廣的通則。
const css = readFileSync('style.css', 'utf8');

/** 把 CSS 拆成 { selector, body } 的清單。夠用就好，不需要真的解析器。 */
function rules(source) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(source))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

describe('捲動面板裡不能有絕對定位的裝飾層', () => {
  it('.scroll 沒有絕對定位的 ::before / ::after', () => {
    const offenders = rules(css)
      .filter((r) => /\.scroll::(before|after)/.test(r.selector))
      .filter((r) => /position\s*:\s*absolute/.test(r.body))
      .map((r) => r.selector);
    expect(
      offenders,
      `這些會跟著內容捲動，最後橫在 action card 上：\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
