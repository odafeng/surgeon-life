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
  // 結局是玩家唯一無法反駁的一段文字，它不能宣稱沒有發生的事。
  //
  // 這份清單原本只守「部主任」和「孩子」——也就是我當時已經知道的兩個，
  // 所以「學會理事」（整個專案沒有任何 state）就這樣漏過去了。
  // 改成登記制：結局裡只要出現頭銜類的詞，就必須在這裡登記它的依據，
  // 沒登記的直接紅燈，而不是安靜地通過。
  // 用 regex 而不是 includes：「副教授」裡面也有「教授」。
  const TITLES = {
    部主任: { re: /部主任/, holds: (s) => s.people?.chief?.succeeded },
    教授: { re: /(?<![副助理])教授/, holds: (s) => s.rank === 'professor' },
    副教授: { re: /副教授/, holds: (s) => ['associate', 'professor'].includes(s.rank) },
    主治醫師: { re: /主治醫師/, holds: () => true }, // 走到結局的外科醫師至少是主治
    孩子: { re: /孩子/, holds: (s) => s.family.kids > 0 },
  };

  // 頭銜以外，結局也會宣稱處境。這一組要對「完整內文」驗，不能走 claims()——
  // 那個過濾器會丟掉含否定詞的句子，而這幾句本身就帶著「不」和「沒有」，
  // 走 claims() 的話它們永遠不會被看到，測試會假綠。
  const SITUATIONS = {
    家人不等你吃飯: { re: /家人早就學會不等你吃飯/, holds: (s) => s.attrs.familyBond < 45 },
    膝蓋要扶欄杆: { re: /膝蓋上下樓要扶欄杆/, holds: (s) => s.attrs.health < 35 },
    沒有為自己活過: { re: /沒有一年，你是為自己活的/, holds: (s) => s.attrs.self < 50 },
  };
  // 出現在結局內文裡、看起來像頭銜或身分的詞，一律要有依據
  const TITLE_LIKE = /理事|院長|會長|部主任|副院長|主委/g;

  // 「不知道為什麼你沒當教授」是在講一件沒發生的事，不是在授予頭銜。
  // 按句子切開，跳過帶否定詞的那幾句再檢查。
  const claims = (body) =>
    body
      .split(/[。；，]/)
      .filter((clause) => !/[沒不未]/.test(clause))
      .join('　');

  // health 原本固定 50，於是 both_but 只會從「家庭垮」那半邊觸發，
  // 「健康垮但家庭很好」那條分支一次都沒被跑到——而那正是漏掉的那一條。
  // 每一個會被結局文字讀到的數值都要有高低兩種。
  const states = () => {
    const out = [];
    for (const kids of [0, 1])
      for (const succeeded of [false, true])
        for (const rank of ['vs', 'associate', 'professor'])
          for (const clinical of [30, 80])
            for (const familyBond of [20, 80])
              for (const health of [20, 70])
                for (const self of [30, 80]) {
                  const s = createGame(1);
                  s.age = 66;
                  s.rank = rank;
                  s.attrs.clinical = clinical;
                  s.attrs.familyBond = familyBond;
                  s.attrs.health = health;
                  s.attrs.self = self;
                  s.family.kids = kids;
                  if (kids) s.family.children = [{ bornAt: 34 }];
                  s.family.stage = kids ? 'married' : 'single';
                  s.people.chief.succeeded = succeeded;
                  out.push(s);
                }
    return out;
  };

  it('結局內文宣稱的頭銜，狀態裡都要成立', async () => {
    const { decideEnding } = await import('../src/endings.js');
    const bad = [];
    for (const s of states())
      for (const cause of ['retire', 'death']) {
        const e = decideEnding(s, cause);
        // 頭銜授予要跳過否定句（「沒當教授」是在講沒發生的事）；
        // 處境宣稱本身就含否定詞，必須對完整內文驗。
        for (const [word, { re, holds, body }] of [
          ...Object.entries(TITLES).map(([k, v]) => [k, { ...v, body: claims(e.body) }]),
          ...Object.entries(SITUATIONS).map(([k, v]) => [k, { ...v, body: e.body }]),
        ])
          if (re.test(body) && !holds(s))
            bad.push(
              `${e.id}（${s.rank}/kids${s.family.kids}/主任${s.people.chief.succeeded}）說了「${word}」`,
            );
      }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('沒有登記依據的頭銜不准出現在結局裡', async () => {
    const { decideEnding } = await import('../src/endings.js');
    const unknown = new Set();
    for (const s of states())
      for (const cause of ['retire', 'death', 'exit-specialty']) {
        const body = decideEnding(s, cause).body;
        for (const w of claims(body).match(TITLE_LIKE) || []) if (!(w in TITLES)) unknown.add(w);
      }
    expect([...unknown], '這些頭銜沒有任何 state 支撐，也沒有登記').toEqual([]);
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

describe('凍卵這條線不會斷在半路', () => {
  // 單身女性凍了卵，付了十五萬與每年的保管費，然後這條線就沒有下文——
  // 因為 fw_eggs_used 要求 family.stage 不是單身。那個閘門本身沒有錯：
  // 《人工生殖法》把受術對象限定為受術夫妻。錯的是遊戲從來沒有說出來。
  it('單身而且凍過卵的人，會被告知為什麼用不到', async () => {
    let frozen = 0;
    let told = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame(seed, 'f');
      const intent = { clinical: 35, teaching: 15, research: 30, family: 5, personal: 15 };
      let sawLaw = false;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          // 一直單身：每次感情機會都選最後一個選項
          async (ev) =>
            /fa_meet|fb_reunion|fb_late_meet|fb_gold/.test(ev.id) ? ev.choices.length - 1 : 0,
          async (l) => {
            if (l.text.includes('限受術夫妻')) sawLaw = true;
          },
        );
        if (ending) break;
      }
      if (s.flags.eggsFrozen && s.family.stage === 'single') {
        frozen += 1;
        if (sawLaw) told += 1;
      }
    }
    expect(frozen, '這條路線要有人凍卵，測試才有意義').toBeGreaterThan(10);
    expect(told / frozen, '凍了卵又單身的人，多數要看到那一幕').toBeGreaterThan(0.7);
  });
});

describe('遇到的人跟後來的伴侶要是同一個人', () => {
  // fb_late_meet 的「女兒」是寫死的名詞，代稱掃描抓不到。
  // 女性主角在同一幕遇到病人的女兒、log 解析成「他接起來」、
  // 之後配偶又固定是男性的宗翰——同一個人在三句話裡換了兩次性別。
  it('兩種主角走完整個接受分支都不會前後矛盾', async () => {
    const { EVENTS } = await import('../src/events.js');
    const { resolve } = await import('../src/engine.js');
    const e = EVENTS.find((x) => x.id === 'fb_late_meet');
    const call = e.choices.find((c) => /打那通電話/.test(c.label));

    for (const [gender, self, other] of [
      ['m', /女兒/, /她接起來/],
      ['f', /兒子/, /他接起來/],
    ]) {
      const s = createGame(1, gender);
      s.age = 43;
      const text = resolve(s, e.text(s));
      const memory = resolve(s, call.memory(s));
      const log = resolve(s, call.log);
      expect(text, `${gender} 正文`).toMatch(self);
      expect(memory, `${gender} 記憶`).toMatch(self);
      expect(log, `${gender} 結果`).toMatch(other);
      // 三段文字不能各說各的性別
      expect(text.includes('女兒') === memory.includes('女兒'), `${gender} 正文與記憶要一致`).toBe(
        true,
      );
    }
  });
});

describe('具體時刻不重播', () => {
  // 「寫了七個月、投出去三小時、不送外審、改名 v2」是一個帶著唯一數字的時刻。
  // 退稿本身當然會再發生，但同一段記憶逐字演第二次就讀成失憶。
  it('那封三小時就退回來的信，一局裡只會收到一次', async () => {
    for (let seed = 1; seed <= 12; seed++) {
      const s = createGame(seed);
      const intent = { clinical: 35, teaching: 15, research: 25, family: 10, personal: 15 };
      let seen = 0;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            // 「三個小時」在四個事件裡都有，要用這一幕獨有的那一句
            if (l.text.includes('投出去三小時後收到回信')) seen += 1;
          },
        );
        if (ending) break;
      }
      expect(seen, `seed ${seed} 演了 ${seen} 次`).toBeLessThanOrEqual(1);
    }
  });

  it('急診推床那一段也只演一次', async () => {
    // 第四天、群組名字後面的 4、第五天上樓、下午又來三個——四個精確數字是同一件事。
    for (let seed = 1; seed <= 12; seed++) {
      const s = createGame(seed);
      const intent = { clinical: 45, teaching: 12, research: 12, family: 16, personal: 15 };
      let seen = 0;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            if (l.text.includes('在急診推床上第四天')) seen += 1;
          },
        );
        if (ending) break;
      }
      expect(seen, `seed ${seed} 演了 ${seen} 次`).toBeLessThanOrEqual(1);
    }
  });
});

describe('學弟妹怎麼稱呼主角', () => {
  // 許士杰對女性教授說「學長對不起」。這不是主角的學長，是學弟在叫主角。
  it('許士杰道歉時叫的是學姊還是學長，看主角是誰', async () => {
    const { EVENTS } = await import('../src/events.js');
    const { resolve } = await import('../src/engine.js');
    const e = EVENTS.find((x) => x.id === 'j_first_case');
    for (const [gender, want] of [
      ['m', '學長對不起'],
      ['f', '學姊對不起'],
    ]) {
      const s = createGame(1, gender);
      expect(resolve(s, e.log), `${gender}`).toContain(want);
    }
  });
});
