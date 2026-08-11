import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createGame, playYear, conformAllocation, resolve } from '../src/engine.js';

// 家庭的里程碑狀態只能有一個主人。
//
// 這條規則不是潔癖。在此之前 events/family.js 有自己的一套懷孕旗標
// （flags.expecting），跟 people-family.js 的 flags.expectingChild 平行跑，
// 於是同一局會出現：35 歲驗孕棒兩條線、41 歲又問「要不要有個孩子」，
// 中間那六年的懷孕沒有人記得。也會出現兩場婚禮。
// female.js 也在名單上：它寫的是「同一個」expectingChild，出生仍然走 fa_birth，
// 所以它是同一台狀態機的另一個入口，不是第二套系統。
const OWNERS = ['people-family.js', 'people-family-branches.js', 'female.js'];
// 只抓「賦值」，不抓比較——= 後面不能再接 =。
const MILESTONE_WRITES =
  /\bs\.family\.(stage|kids|floor|children)\s*(=(?!=)|\.push)|\bs\.flags\.expecting\w*\s*=(?!=)/;

describe('家庭里程碑狀態的所有權', () => {
  it('只有人物弧線的檔案能寫，其他事件檔只能讀', () => {
    const offenders = [];
    for (const file of readdirSync('src/events')) {
      if (!file.endsWith('.js') || OWNERS.includes(file)) continue;
      const src = readFileSync(`src/events/${file}`, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (MILESTONE_WRITES.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders, `這些地方在弧線外面改家庭狀態：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('只有一套懷孕旗標', () => {
    const all = readdirSync('src/events')
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(`src/events/${f}`, 'utf8'))
      .join('\n');
    expect(all).not.toMatch(/flags\.expecting\b/); // 舊的那一套
    expect(all).toMatch(/flags\.expectingChild\b/);
  });
});

describe('懷孕到出生', () => {
  it('一局裡不會問第二次「要不要有個孩子」，也不會生第二次第一胎', async () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = createGame(seed);
      let alloc = { clinical: 45, teaching: 10, research: 10, family: 25, personal: 10 };
      const asked = [];
      const births = [];
      while (!s.ending && s.age <= 65) {
        alloc = conformAllocation(s, alloc);
        const { ending, logs } = await playYear(s, alloc, async (ev) => {
          if (ev.id === 'fa_pregnancy') asked.push(s.age);
          return 0;
        });
        for (const l of logs) if (l.text.startsWith('孩子出生那天')) births.push(s.age);
        if (ending) break;
      }
      expect(asked.length, `seed ${seed} 問了 ${asked.length} 次`).toBeLessThanOrEqual(1);
      expect(births.length, `seed ${seed} 生了 ${births.length} 次第一胎`).toBeLessThanOrEqual(1);
    }
  });
});

// 「把該辦的辦一辦」那個選項的 log 明寫「沒有婚禮，只有戶政事務所和兩份影本」，
// 但它設 marriedAt，而 marriedAt 排的就是婚禮那一幕——500 局裡有 296 局隔年去敬酒。
describe('說了不辦婚禮就不會辦', () => {
  it('未婚生子後補登記的那條路不會接到婚禮', async () => {
    let registered = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = createGame(seed);
      let sawRegistry = false;
      let sawWedding = false;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, {
          clinical: 50,
          teaching: 10,
          research: 15,
          family: 10,
          personal: 15,
        });
        const { logs } = await playYear(s, alloc, async (ev) => {
          if (/meet|reunion/.test(ev.id)) return 0;
          if (ev.id === 'fa_ring' || ev.id === 'fb_unwed_pregnancy') return 1;
          return 0; // 「把該辦的辦一辦」是第一個選項
        });
        for (const l of logs) {
          if (l.text.includes('只有戶政事務所和兩份影本')) sawRegistry = true;
          if (l.text.includes('敬酒到第三桌')) sawWedding = true;
        }
      }
      if (sawRegistry) registered++;
      expect(sawRegistry && sawWedding, `seed ${seed} 說了沒有婚禮，隔年又去敬酒`).toBe(false);
    }
    // 沒有人走到那條路的話，上面的斷言全部是空的
    expect(registered, '沒有任何一局補登記，這個測試沒有驗到東西').toBeGreaterThan(0);
  });
});

describe('第二胎', () => {
  // 不管主角是男是女，生第二個都要是一個真的會被問到的決定，
  // 不是藏在條件裡永遠碰不到的支線。
  it('兩種性別都問得到，而且問的時候已經有第一個孩子', async () => {
    for (const gender of ['m', 'f']) {
      let asked = 0;
      let hadFirst = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const s = createGame(seed, gender);
        const intent = { clinical: 45, teaching: 10, research: 10, family: 25, personal: 10 };
        let sawSecond = false;
        while (!s.ending && s.age <= 65) {
          const alloc = conformAllocation(s, intent);
          const { ending } = await playYear(s, alloc, async (ev) => {
            if (ev.id === 'fa_second_child') {
              sawSecond = true;
              expect(s.family.kids, `${gender} seed ${seed}`).toBe(1);
              return 1; // 選「一個就好」——這裡驗的是「被問到」，不是結果
            }
            return 0; // 其他一律答應，才走得到有孩子的那條路
          });
          if (ending) break;
        }
        if (s.family.children.length >= 1) hadFirst++;
        if (sawSecond) asked++;
      }
      expect(hadFirst, `${gender} 有第一胎的局數`).toBeGreaterThan(25);
      expect(asked, `${gender} 被問第二胎的局數`).toBeGreaterThan(15);
    }
  });
});

describe('代稱解析', () => {
  // {配偶}、{她} 這種東西只該存在於原始碼裡。任何一個漏掉解析的欄位，
  // 玩家都會在畫面上看到大括號——第四輪的 hint 就是這樣漏出去的。

  it('原始碼裡用到的每一個代稱，resolve 都認得', () => {
    const src = readdirSync('src/events')
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(`src/events/${f}`, 'utf8'))
      .join('\n');
    // 只找 {中文}，避開樣板字串的 ${...}
    const tokens = new Set(src.match(/(?<!\$)\{[\u4e00-\u9fff]{1,4}\}/g) || []);
    expect(tokens.size, '應該至少用到一個代稱').toBeGreaterThan(0);
    for (const gender of ['m', 'f']) {
      const s = createGame(1, gender);
      for (const tok of tokens) {
        expect(resolve(s, tok), `${tok} @${gender}`).not.toContain('{');
      }
    }
  });

  it('求婚那一幕的每個文字欄位都解析過，包括 hint', async () => {
    // 靠隨機遊玩碰不到這一幕（12 個 seed 跑下來一次都沒抽到），
    // 所以直接把狀態擺到求婚前一年。
    for (const gender of ['m', 'f']) {
      let seen = null;
      for (let seed = 1; seed <= 30 && !seen; seed++) {
        const s = createGame(seed, gender);
        s.age = 33;
        s.family = { stage: 'steady', kids: 0, children: [], floor: 15, invested: 6, neglect: 0 };
        s.people.spouse.stage = 2;
        for (let y = 0; y < 4 && !seen; y++) {
          await playYear(
            s,
            { clinical: 45, teaching: 10, research: 10, family: 25, personal: 10 },
            async (ev) => {
              if (ev.id === 'fa_ring') seen = ev;
              return 1; // 拒絕，讓狀態停在 steady，下一年還能再抽到
            },
          );
        }
      }
      expect(seen, `${gender} 沒有觸發到求婚`).toBeTruthy();
      expect(seen.text).not.toContain('{');
      for (const c of seen.choices) {
        expect(c.label, `${gender} label`).not.toContain('{');
        if (c.hint) expect(c.hint, `${gender} hint`).not.toContain('{');
      }
    }
  });
});
