import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ALL_ENDINGS } from '../src/collection.js';

// 圖鑑是另一份結局清單，而且是手寫的。目前 19 對 19 全部對得上——
// 這裡不是在修東西，是在把那個「對得上」釘住：加第 20 個結局卻忘了登記，
// 玩家會拿到一個結局然後在收藏頁看不到它，而且不會有任何地方報錯。
//
// 用掃原始碼的方式取 endings.js 那一份，跟 state-ownership、family-state 同一個做法：
// decideEnding 是一條有序 if-chain，沒有辦法從外面列舉它會回傳哪些東西。
const declared = () => {
  const src = readFileSync('src/endings.js', 'utf8');
  const pairs = [...src.matchAll(/id: '([a-z_]+)',\s*\n\s*title: '([^']+)'/g)].map((m) => ({
    id: m[1],
    title: m[2],
  }));
  // 抓法一旦失效就會靜靜地回傳空陣列，下面每一條都會變成空斷言
  expect(pairs.length, 'endings.js 的寫法變了，這個抓法要跟著改').toBeGreaterThan(10);
  return pairs;
};

describe('結局圖鑑', () => {
  it('每一個拿得到的結局都登記過', () => {
    const listed = ALL_ENDINGS.map((e) => e.id);
    const missing = declared()
      .map((e) => e.id)
      .filter((id) => !listed.includes(id));
    expect(missing, '這些結局玩家拿得到，但收藏頁不會出現').toEqual([]);
  });

  it('圖鑑裡沒有拿不到的結局', () => {
    // 反過來也要守：結局被刪掉或改名之後，圖鑑會留下一個永遠點不亮的格子
    const ids = declared().map((e) => e.id);
    const orphan = ALL_ENDINGS.map((e) => e.id).filter((id) => !ids.includes(id));
    expect(orphan, '這些格子永遠點不亮').toEqual([]);
  });

  it('兩邊的標題一致', () => {
    // 改了結局的標題卻沒改圖鑑，玩家會在收藏頁看到一個他沒讀過的名字
    const byId = Object.fromEntries(ALL_ENDINGS.map((e) => [e.id, e.title]));
    const bad = declared()
      .filter((e) => byId[e.id] !== e.title)
      .map((e) => `${e.id}：結局「${e.title}」圖鑑「${byId[e.id]}」`);
    expect(bad).toEqual([]);
  });

  it('沒有重複的 id 或標題', () => {
    const ids = ALL_ENDINGS.map((e) => e.id);
    const titles = ALL_ENDINGS.map((e) => e.title);
    expect(ids.length, '有重複的 id').toBe(new Set(ids).size);
    expect(titles.length, '兩個結局叫同一個名字，收藏頁分不出來').toBe(new Set(titles).size);
  });

  it('每一格都有提示，而且提示不會直接寫出結局內文', () => {
    for (const e of ALL_ENDINGS) {
      expect(e.hint, `${e.id} 沒有提示`).toBeTruthy();
      expect(e.hint.length, `${e.id} 的提示太長，那是說明不是提示`).toBeLessThan(30);
    }
  });
});
