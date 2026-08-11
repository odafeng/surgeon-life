import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/events.js';

// 正文講出一個「遊戲也有在算」的數字時，state 要真的動那麼多。
//
// 這一類已經抓到過四次：績效排名說「你一年開四百台刀」、年度考核說「歸類計分零」
// 而 HUD 顯示 61、事件寫死點值 0.78 而當年是 0.89、期刊分區說少了 18 點卻沒有扣。
// 每一次都是試玩者在畫面上撞到，因為正文與 state 是兩個人在寫。
//
// 改成登記制：正文只要出現「數字＋遊戲在模擬的單位」，就要在下面說明它憑什麼。
// 沒登記的直接紅燈——那不代表一定有錯，是「請你先確認 state 真的動了」。
const CLAIMS = {
  a_lawsuit: '和解金 150 萬，該選項 effects.money = -150',
  a_verdict_lose: '賠償 200 萬，effects.money = -200',
  r_paper_boss: '一篇 case series 15 點，該選項 effects.papers = 15',
  ac_if_zone: '期刊降區少 18 點，effects.papers = -18',
  // 這個講的不是玩家身上的量，是制度本身的數字
  r_coding: 'A 碼 18,000 點與 B 碼 32,000 點是申報碼的面額，不是玩家的分數',
};

// 「數字＋單位」而且那個單位是遊戲在算的量
const MODELLED = /[0-9][0-9,]* ?(點|萬)/;

const proseOf = (e) =>
  [e.text, e.log, e.memory, ...(e.choices ?? []).flatMap((c) => [c.label, c.log, c.memory, c.hint])]
    .filter((v) => typeof v === 'string')
    .join('　');

describe('正文講出來的數字', () => {
  it('每一個都登記過', () => {
    const unregistered = EVENTS.filter((e) => MODELLED.test(proseOf(e))).filter(
      (e) => !(e.id in CLAIMS),
    );
    expect(
      unregistered.map((e) => `${e.id}：${proseOf(e).match(MODELLED)[0]}`),
      '這些事件的正文講了一個遊戲也在算的數字。先確認 state 真的動了，再登記到 CLAIMS。',
    ).toEqual([]);
  });

  it('登記表沒有過期的項目', () => {
    // 正文改寫之後登記也要跟著清，否則這張表會慢慢變成不知道在守什麼
    const stated = new Set(EVENTS.filter((e) => MODELLED.test(proseOf(e))).map((e) => e.id));
    const stale = Object.keys(CLAIMS).filter((id) => !stated.has(id));
    expect(stale, '這些事件的正文已經沒有數字了，可以從 CLAIMS 移除').toEqual([]);
  });

  // 登記表寫了金額與分數，這裡把它們真的對一次——只驗說得出對應關係的那幾個
  it('說了金額就真的扣那麼多', () => {
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const settle = byId('a_lawsuit').choices.find((c) => /和解/.test(c.label));
    expect(settle.effects.money).toBe(-150);
    expect(byId('a_verdict_lose').effects.money).toBe(-200);
  });

  it('說了分數就真的動那麼多', () => {
    const byId = (id) => EVENTS.find((e) => e.id === id);
    const write = byId('r_paper_boss').choices.find((c) => /擠時間寫/.test(c.label));
    expect(write.effects.papers).toBe(15);
    // 這一個以前只扣 self，玩家被告知分數掉了但 HUD 不動
    expect(byId('ac_if_zone').effects.papers).toBe(-18);
  });
});
