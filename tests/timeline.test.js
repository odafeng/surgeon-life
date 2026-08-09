import { describe, it, expect } from 'vitest';
import { createGame, playYear, conformAllocation, forecast } from '../src/engine.js';
import { decideEnding } from '../src/endings.js';

// 第一次有人自然玩完一整條職涯（25→66，零快轉）之後回報的問題，
// 全部是「同一件事在兩個地方各有一份真相」造成的：
//   孩子的年齡看主角幾歲、父母的病程有兩套旗標、
//   王慶昌的年資靠 stage 每年連播、結算單沒有走代稱解析。
// 這支測試把那條時間線整條釘住。
const ALLOC = { clinical: 45, teaching: 12, research: 12, family: 21, personal: 10 };

async function live(seed, gender, onEvent) {
  const s = createGame(seed, gender);
  let alloc = { ...ALLOC };
  while (!s.ending && s.age <= 65) {
    alloc = conformAllocation(s, alloc);
    const { ending } = await playYear(
      s,
      alloc,
      async () => 0,
      async (l) => onEvent(l, s),
    );
    if (ending) break;
  }
  return s;
}

describe('時間線', () => {
  it('孩子的戲永遠對得上孩子的年齡', async () => {
    const bad = [];
    for (const gender of ['m', 'f']) {
      for (let seed = 1; seed <= 12; seed++) {
        await live(seed, gender, (l, s) => {
          const kid = s.family.children?.[0];
          const age = kid ? s.age - kid.bornAt : -1;
          const say = (label, lo, hi) => {
            if (age < lo || age > hi) bad.push(`${gender}/${seed} ${label} 時孩子 ${age} 歲`);
          };
          if (l.text.includes('扶著沙發')) say('第一次站起來', 1, 3);
          if (l.text.includes('上國中')) say('上國中', 12, 15);
          if (l.text.includes('搬出去住')) say('搬出去', 19, 99);
        });
      }
    }
    expect(bad).toEqual([]);
  });

  it('走了的人不會再回來演日常', async () => {
    const bad = [];
    for (let seed = 1; seed <= 15; seed++) {
      await live(seed, 'f', (l, s) => {
        if (l.text.includes('爸媽走路變慢') && s.flags.parentGone) bad.push(`seed ${seed} 父親`);
        if (l.text.includes('一個人跑三間房') && s.people.nurse.stage >= 2)
          bad.push(`seed ${seed} 阿蘭姐`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('王慶昌的年資從初診那年算，不是台詞裡寫死的', async () => {
    const bad = [];
    for (let seed = 1; seed <= 20; seed++) {
      await live(seed, 'm', (l, s) => {
        const m = l.text.match(/認識他已經 (\d+) 年/);
        if (!m) return;
        const real = s.people.patient.metAt ? s.age - s.people.patient.metAt : -1;
        if (Number(m[1]) !== real) bad.push(`seed ${seed}: 台詞 ${m[1]} 年，實際 ${real} 年`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('結局頁與配置盤警告都不會漏出未解析的代稱', async () => {
    const leaked = [];
    const check = (str, where) => {
      if (typeof str === 'string' && str.includes('{'))
        leaked.push(`${where}: ${str.slice(0, 40)}`);
    };
    for (const gender of ['m', 'f']) {
      for (let seed = 1; seed <= 10; seed++) {
        const s = createGame(seed, gender);
        let alloc = { ...ALLOC };
        while (!s.ending && s.age <= 65) {
          alloc = conformAllocation(s, alloc);
          for (const w of forecast(s, alloc).warnings) check(w, '配置盤');
          const { ending } = await playYear(
            s,
            alloc,
            async () => 0,
            async (l) => check(l.text, l.kind),
          );
          if (ending) break;
        }
        for (const m of s.memories) check(m.text, 'memory');
        const e = decideEnding(s, s.age > 65 ? 'retire' : 'death');
        check(e.body, '結局內文');
        for (const r of e.settlement) check(String(r.value), '結算單');
      }
    }
    expect(leaked).toEqual([]);
  });
});

describe('升等門檻', () => {
  // 試玩者累積到 848 點仍是副教授，配置盤只顯示「848 / 500」，
  // 他完全不知道自己卡在「計畫主持滿 2 年」。缺什麼就要講什麼。
  it('計分破表但計畫年資不夠時，配置盤會說出真正缺的那一項', () => {
    const s = createGame(1);
    s.age = 50;
    s.rank = 'associate';
    s.attrs.papers = 848;
    s.attrs.teaching = 90;
    s.grants.yearsPI = 0;
    const warned = forecast(s, ALLOC).warnings.find((w) => w.includes('升等到教授'));
    expect(warned).toBeTruthy();
    expect(warned).toContain('計畫主持滿 2 年');
    expect(warned).not.toContain('歸類計分'); // 這一項早就達成了，不該再列
  });

  it('條件補齊之後就不再提醒', () => {
    const s = createGame(1);
    s.age = 50;
    s.rank = 'associate';
    s.attrs.papers = 848;
    s.attrs.teaching = 90;
    s.grants.yearsPI = 2;
    expect(forecast(s, ALLOC).warnings.find((w) => w.includes('升等到教授'))).toBeUndefined();
  });
});
