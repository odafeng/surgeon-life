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

describe('代稱一致性', () => {
  // 「事件裡喊媽、結局的 memory 卻是爸」是這樣來的：text 換成了代稱，
  // 同一個事件的 memory 沒有跟著換。同一幕的兩段文字必須用同一套詞。
  const TOKENS = [
    ['{爸爸}', '爸爸'],
    ['{爸}', '爸'],
    ['{學長}', '學長'],
    ['{配偶}', null],
  ];

  it('同一個事件裡，text 用了代稱就不會有另一段寫死同一個詞', async () => {
    const { EVENTS } = await import('../src/events.js');
    const bad = [];
    const asText = (v) => (typeof v === 'string' ? v : '');
    for (const e of EVENTS) {
      const text = asText(e.text);
      const others = [
        ['log', asText(e.log)],
        ['memory', asText(e.memory)],
        ...(e.choices || []).flatMap((c, i) => [
          [`choices[${i}].log`, asText(c.log)],
          [`choices[${i}].memory`, asText(c.memory)],
          [`choices[${i}].label`, asText(c.label)],
        ]),
      ];
      for (const [token, bare] of TOKENS) {
        if (!bare || !text.includes(token)) continue;
        for (const [where, str] of others) {
          if (!str) continue;
          const stripped = str.split(token).join('');
          if (stripped.includes(bare))
            bad.push(`${e.id} ${where}：text 用了 ${token}，這裡卻寫死「${bare}」`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('婚禮', () => {
  // 一開始只看配偶的 stage，於是有人結婚十一年、演完結婚紀念日之後又辦了一次婚禮。
  // 收成兩年窗口之後又太窄，八成的人一輩子沒辦成——所以它跟出生一樣走 forced。
  it('每個結了婚的人都辦得成，而且就在答應的隔年', async () => {
    let married = 0;
    let wed = 0;
    const late = [];
    for (const gender of ['m', 'f']) {
      for (let seed = 1; seed <= 15; seed++) {
        const s = createGame(seed, gender);
        const intent = { clinical: 41, teaching: 12, research: 12, family: 25, personal: 10 };
        let at = null;
        while (!s.ending && s.age <= 65) {
          const alloc = conformAllocation(s, intent);
          const { ending } = await playYear(s, alloc, async (ev) => {
            if (ev.id === 'fa_wedding') at = s.age;
            return 0;
          });
          if (ending) break;
        }
        if (s.family.marriedAt !== undefined) {
          married += 1;
          if (at !== null) {
            wed += 1;
            if (at - s.family.marriedAt !== 1)
              late.push(`${gender}/${seed}: 差 ${at - s.family.marriedAt} 年`);
          }
        }
      }
    }
    expect(married).toBeGreaterThan(20);
    expect(wed).toBe(married);
    expect(late).toEqual([]);
  });
});

describe('結局不會反寫玩家的選擇', () => {
  // 有人在 65 歲明確拒絕了部主任，結局卻寫「教授、部主任、學會理事」。
  // 結局的文字是最後一段話，玩家沒有機會反駁——它不能宣稱沒有發生的事。
  const CLAIMS = [
    ['部主任', (s) => s.people?.chief?.succeeded],
    ['孩子', (s) => s.family.kids > 0],
  ];

  it('結局內文宣稱的事，狀態裡都要成立', async () => {
    const { decideEnding } = await import('../src/endings.js');
    const bad = [];
    for (const kids of [0, 1])
      for (const succeeded of [false, true])
        for (const rank of ['vs', 'associate', 'professor'])
          for (const clinical of [30, 80])
            for (const cause of ['retire', 'death']) {
              const s = createGame(1);
              s.age = 66;
              s.rank = rank;
              s.attrs.clinical = clinical;
              s.attrs.familyBond = 60;
              s.attrs.health = 50;
              s.attrs.self = 60;
              s.family.kids = kids;
              if (kids) s.family.children = [{ bornAt: 34 }];
              s.family.stage = kids ? 'married' : 'single';
              s.people.chief.succeeded = succeeded;
              const e = decideEnding(s, cause);
              for (const [word, holds] of CLAIMS)
                if (e.body.includes(word) && !holds(s))
                  bad.push(`${e.id}（${rank}/kids${kids}/主任${succeeded}）說了「${word}」`);
            }
    expect([...new Set(bad)]).toEqual([]);
  });
});

describe('分岔要分乾淨', () => {
  // 「你正要解釋外科的訓練還有幾年」改成依職級分岔之後，正文對了，
  // 但玩家按的那顆按鈕仍然寫著「老實講完訓練年限和值班」。
  // 一幕戲的正文分岔了，選項與結果也必須跟著分岔——玩家看的是按鈕上的字。
  const STAGE_WORDS = ['訓練年限', '總醫師', '還在訓練', '升上主治'];

  it('正文依狀態分岔的事件，沒有寫死職級字眼的選項或結果', async () => {
    const { EVENTS } = await import('../src/events.js');
    const bad = [];
    for (const e of EVENTS) {
      if (typeof e.text !== 'function') continue;
      const statics = [
        ['log', e.log],
        ['memory', e.memory],
        ...(e.choices || []).flatMap((c, i) => [
          [`choices[${i}].label`, c.label],
          [`choices[${i}].log`, c.log],
          [`choices[${i}].memory`, c.memory],
        ]),
      ].filter(([, v]) => typeof v === 'string');
      for (const [where, str] of statics)
        for (const w of STAGE_WORDS)
          if (str.includes(w)) bad.push(`${e.id} ${where}：寫死了「${w}」`);
    }
    expect(bad).toEqual([]);
  });
});
