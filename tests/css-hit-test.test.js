import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// 試玩者在 28 歲的行動面板遇到「卡片看得到、怎麼點都沒反應」。
// elementsFromPoint 指出最上層不是 button，是 .scroll::after——
// 卷軸的裝飾橫槓。.scroll 是捲動容器，用 bottom 定位的絕對元素是相對
// 整份可捲動內容，內容一長就落在可見卡片中間，而它有背景色又沒有排除點擊。
//
// jsdom 不做 hit test，所以這件事測不到 DOM，要測的是規則本身。
// 只釘這一條：本輪的證據只支持卷軸裝飾，不夠支持任何更廣的通則。
const css = readFileSync('style.css', 'utf8');

/** 把 CSS 拆成 { selector, body } 的清單。夠用就好，不需要真的解析器。 */
function rules(source) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(source))) out.push({ selector: m[1].trim(), body: m[2] });
  return out;
}

describe('卷軸的裝飾橫槓不能吃掉點擊', () => {
  it('.scroll::before 與 .scroll::after 都排除了點擊', () => {
    const bar = rules(css).find(
      (r) => r.selector.includes('.scroll::before') && r.selector.includes('.scroll::after'),
    );
    expect(bar, '.scroll::before/.scroll::after 的規則應該還在').toBeTruthy();
    expect(bar.body).toMatch(/pointer-events\s*:\s*none/);
  });
});
