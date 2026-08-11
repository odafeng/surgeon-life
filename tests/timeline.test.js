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
  // kidEstranged 一直沒被列進來，於是 other_peoples_children 的內文從來沒進過這裡。
  // 它以前只有 120 局裡的 5 局讀得到，漏掉不痛不癢；把它排到部主任與恩師之前
  // 以後變成 42 局，這個洞就有份量了。只在 kids > 0 時給——那條鏈本來就要先有小孩，
  // 硬造 kids = 0 的走偏小孩會製造一個玩不到的假紅燈。
  const states = () => {
    const out = [];
    for (const kids of [0, 1])
      for (const estranged of [false, true])
        for (const succeeded of [false, true])
          for (const rank of ['vs', 'associate', 'professor'])
            for (const clinical of [30, 80])
              for (const familyBond of [20, 80])
                for (const health of [20, 70])
                  for (const self of [30, 80]) {
                    if (estranged && !kids) continue;
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
                    s.flags.kidEstranged = estranged;
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

  it('專責病房那兩個月只會經歷一次', async () => {
    // 成立專責病房、被排兩個月、延期的那三台癌症——是同一批病人。
    // 複製一次等於換一批人再死一次。
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
            if (l.text.includes('院內成立專責病房')) seen += 1;
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

describe('相親對象的性別跟配偶線一致', () => {
  // 這個遊戲的配偶線是固定異性：男主角配郁涵、女主角配宗翰。
  // 相親那一幕原本寫死「她想找可以一起吃飯的」，女性主角會被安排一場同性相親——
  // 而遊戲從來沒問過性向，別的地方也不支援，那會讀成意外而不是設定。
  it('男主角遇到的是她，女主角遇到的是他', async () => {
    const { EVENTS } = await import('../src/events.js');
    const { resolve, val } = await import('../src/engine.js');
    const e = EVENTS.find((x) => x.id === 'f_blind_date');
    const leave = e.choices.find((c) => /先走/.test(c.label));
    for (const [gender, want, avoid] of [
      ['m', '她想找', '他想找'],
      ['f', '他想找', '她想找'],
    ]) {
      const s = createGame(1, gender);
      const log = resolve(s, val(leave.log, s));
      expect(log, gender).toContain(want);
      expect(log, gender).not.toContain(avoid);
    }
  });
});

describe('帶著唯一識別資料的時刻只演一次', () => {
  // 判準是試玩者定的：第一次／單一事件的語法，加上不可能原樣重現的識別資料。
  // 12A 病房那二十床、被砍的那個週三、捐了整層樓的那位病人、
  // 九十一歲那位長輩、那則標題與三百字聲明、第一次設 F7、躺了十四小時的老先生。
  //
  // 每個標記字串都先確認過只屬於一個事件。今天已經有四次是我比對太寬、
  // 量到根本沒發生的重播——「三個小時」在四個事件裡都有，
  // 「十四個小時」和「九十一歲」各在兩個裡面。
  const ONCE = [
    ['as_beds_closed', '12A'],
    ['as_or_slot_cut', '週三整天被砍成半天'],
    ['as_vip_round', '捐了一整層樓'],
    ['as_violence_punch', '我爸就是被你們害死的'],
    ['as_news_frame', '權威醫師失手'],
    ['as_defensive_chart', 'F7'],
    ['as_consult_pingpong', '已回覆，待處理'],
  ];

  it('每個標記字串都只屬於一個事件', async () => {
    // 標記不唯一的話，測試會報一個根本沒發生的重播——今天已經發生四次
    const { EVENTS } = await import('../src/events.js');
    const s = createGame(1);
    for (const [id, mark] of ONCE) {
      const owners = EVENTS.filter((e) => {
        const parts = [
          typeof e.text === 'function' ? e.text(s) : e.text,
          e.log,
          ...(e.choices || []).flatMap((c) => [c.log, c.memory]),
        ];
        return parts.some((x) => typeof x === 'string' && x.includes(mark));
      }).map((e) => e.id);
      expect(owners, `${id} 的標記「${mark}」`).toEqual([id]);
    }
  });

  it('這七幕在一局裡最多各出現一次', async () => {
    const counts = Object.fromEntries(ONCE.map(([id]) => [id, 0]));
    const worst = Object.fromEntries(ONCE.map(([id]) => [id, 0]));
    for (let seed = 1; seed <= 10; seed++) {
      const s = createGame(seed);
      const intent = { clinical: 45, teaching: 12, research: 12, family: 16, personal: 15 };
      for (const id of Object.keys(counts)) counts[id] = 0;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            for (const [id, mark] of ONCE) if (l.text.includes(mark)) counts[id] += 1;
          },
        );
        if (ending) break;
      }
      for (const [id] of ONCE) worst[id] = Math.max(worst[id], counts[id]);
    }
    const over = Object.entries(worst).filter(([, n]) => n > 1);
    expect(over.map(([id, n]) => `${id} 演了 ${n} 次`)).toEqual([]);
  });

  it('總額結算可以年年來，數字是去年跟今年的差', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'as_point_settle');
    expect(e.once, '這一幕是年度事件，不該標 once').toBeUndefined();

    // 原本拿 0.95 當基準（跟最好的一年比），而正文說的是年初與年中——
    // 一年只擲一個點值，那兩個時間點不存在。而且 Math.max 的下限讓點值 0.92
    // 以上講出假數字，實測 15.2% 的年份。改成去年對今年，那是真的有兩個值。
    const at = (last, now) => {
      const s = createGame(1);
      s.lastPointValue = last;
      s.pointValue = now;
      return e.text(s);
    };
    expect(at(0.9, 0.72), '今年比較差就要說少拿').toMatch(/實拿少了 1\.8 萬/);
    expect(at(0.72, 0.9), '點值會回升，多拿也要講得出來').toMatch(/實拿多了 1\.8 萬/);
    expect(at(0.85, 0.85), '一樣就說一樣，不要湊一個數字出來').toMatch(/一模一樣/);

    // 兩年一樣的時候不能講成「少了 0.0 萬」，那是舊 clamp 的另一面
    for (const pv of [0.72, 0.85, 0.92, 0.95]) expect(at(pv, pv)).not.toMatch(/0\.0 萬/);

    expect(at(0.9, 0.72)).toMatch(/又貼出來/); // 語氣要說明這不是第一次
  });
});

describe('會診沒人回與後送電話也只演一次', () => {
  // 同一次術前會診四十八小時無回覆、同一份看了三遍的心臟超音波；
  // 同一位要葉克膜的病人、第一到第四通、成功的是第七通、凌晨三點五十。
  const ONCE = [
    ['as_consult_silence', '四十八小時沒有回覆'],
    ['as_transfer_calls', '第一通說沒床'],
  ];

  it('標記字串各自只屬於一個事件', async () => {
    const { EVENTS } = await import('../src/events.js');
    const s = createGame(1);
    for (const [id, mark] of ONCE) {
      const owners = EVENTS.filter((e) => {
        const parts = [
          typeof e.text === 'function' ? e.text(s) : e.text,
          e.log,
          ...(e.choices || []).flatMap((c) => [c.log, c.memory]),
        ];
        return parts.some((x) => typeof x === 'string' && x.includes(mark));
      }).map((e) => e.id);
      expect(owners, `${id} 的標記「${mark}」`).toEqual([id]);
    }
  });

  it('一局裡最多各出現一次', async () => {
    const worst = { as_consult_silence: 0, as_transfer_calls: 0 };
    for (let seed = 1; seed <= 10; seed++) {
      const s = createGame(seed);
      const intent = { clinical: 45, teaching: 12, research: 12, family: 16, personal: 15 };
      const n = { as_consult_silence: 0, as_transfer_calls: 0 };
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            for (const [id, mark] of ONCE) if (l.text.includes(mark)) n[id] += 1;
          },
        );
        if (ending) break;
      }
      for (const [id] of ONCE) worst[id] = Math.max(worst[id], n[id]);
    }
    expect(Object.entries(worst).filter(([, v]) => v > 1)).toEqual([]);
  });
});

describe('老師只退休一次', () => {
  // people-mentor.js 的 m_retire 與 attending-career.js 的 ac_mentor_farewell
  // 各自 once，卻演的是同一件事——同一場惜別會、同一面匾額、同一個一萬一千台。
  // 有玩家在 50 歲送過老師，54 歲又送了一次。
  it('一局裡最多一場惜別會', async () => {
    for (let seed = 1; seed <= 15; seed++) {
      const s = createGame(seed, seed % 2 ? 'f' : 'm');
      const intent = { clinical: 40, teaching: 15, research: 15, family: 15, personal: 15 };
      let seen = 0;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            if (/惜別會|你的老師退休了/.test(l.text)) seen += 1;
          },
        );
        if (ending) break;
      }
      expect(seen, `seed ${seed} 送了 ${seen} 次`).toBeLessThanOrEqual(1);
    }
  });

  it('退休由人物弧線擁有，沒有第二份實作', async () => {
    const { EVENTS } = await import('../src/events.js');
    const s = createGame(1);
    const farewells = EVENTS.filter((e) => {
      const text = typeof e.text === 'function' ? e.text(s) : e.text;
      return typeof text === 'string' && /惜別會|老師退休/.test(text);
    });
    // 陳文彬的惜別會與黃振邦的卸任茶會是不同的人，各留一份
    const mentor = farewells.filter((e) => e.id.startsWith('m_'));
    expect(mentor).toHaveLength(1);
    expect(farewells.every((e) => e.id.startsWith('m_') || e.id.startsWith('c_'))).toBe(true);
  });
});

describe('論文接受可以有很多次，但不是同一封信', () => {
  // 試玩者在 53 與 59 歲收到逐字相同的那封信：同一個 Congratulations、
  // 同一句「這種事在這裡不算事」。接受本來就會發生多次，所以不標 once，
  // 改成讓正文自己承認那是另一篇。
  it('第一次與第二次讀起來不同，而且順序不會顛倒', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'ac_accept_mail');
    const s = createGame(1);

    // playYear 的順序：先算 text → 套效果 → 跑 set → 才算 log。
    // 用布林旗標的話，第一次就會顯示第二次的結果文。
    const first = {
      text: e.text(s),
      get log() {
        return e.log(s);
      },
    };
    expect(first.text).not.toMatch(/又一封/);
    e.set(s);
    expect(first.log).toMatch(/不算事/); // set 之後才算 log，第一次仍要是第一次的說法

    const second = e.text(s);
    expect(second).toMatch(/又一封/);
    e.set(s);
    expect(e.log(s)).toMatch(/連是哪一本都要想一下/);
  });

  it('沒有被標成 once——這一幕本來就該再發生', async () => {
    const { EVENTS } = await import('../src/events.js');
    expect(EVENTS.find((x) => x.id === 'ac_accept_mail').once).toBeUndefined();
  });
});

describe('陳文彬只有一個主人', () => {
  // 惜別會有兩份、手抖那一幕也有兩份：attending-career.js 的 ac_mentor_hands
  // 說「你的指導教授七十歲了，還在開刀」，而這一局他早已退休、還被玩家親手開過刀。
  // 上一輪我只拔了惜別會就收手，沒有掃剩下的——這次掃完。
  it('恩師的戲只寫在人物弧線裡', async () => {
    const { EVENTS } = await import('../src/events.js');
    const s = createGame(1);
    const mentions = EVENTS.filter((e) => {
      const parts = [
        typeof e.text === 'function' ? e.text(s) : e.text,
        typeof e.log === 'function' ? e.log(s) : e.log,
        ...(e.choices || []).flatMap((c) => [typeof c.log === 'function' ? c.log(s) : c.log]),
      ];
      return parts.some((x) => typeof x === 'string' && /指導教授|你的老師|陳文彬/.test(x));
    });
    const outside = mentions.filter((e) => !e.id.startsWith('m_'));
    // 兩個例外，各有理由：
    // j_successor 是刻意的回音——許士杰把老師那句話傳給下一代，
    //   它不宣稱老師在場，也不描寫他做了什麼。
    // lv_mentor_silence 是你離開健保那一年的道別。它不屬於恩師的弧線階段，
    //   而是綁在「離開」這個轉折上，跟另外五幕道別是同一個時刻的一部分，
    //   拆到六個檔案反而讓那一刻散掉。leaving.js 擁有那一年，弧線擁有其餘。
    expect(outside.map((e) => e.id).sort()).toEqual(['j_successor', 'lv_mentor_silence']);
  });

  it('老師退休之後，不會再有人看見他開刀', async () => {
    for (let seed = 1; seed <= 15; seed++) {
      const s = createGame(seed, seed % 2 ? 'f' : 'm');
      const intent = { clinical: 40, teaching: 15, research: 15, family: 15, personal: 15 };
      let retired = false;
      const after = [];
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            if (l.text.includes('惜別會')) retired = true;
            else if (retired && /老師.*開刀|指導教授.*開刀|跟陳文彬的刀/.test(l.text))
              after.push(l.text.slice(0, 24));
          },
        );
        if (ending) break;
      }
      expect(after, `seed ${seed} 在惜別會之後還看到老師開刀`).toEqual([]);
    }
  });
});

describe('業配可以一直來，但不是同一支影片', () => {
  // 試玩者在同一局收到兩次一模一樣的保健食品邀約，連拒絕的結果都逐字相同，
  // 而結果裡的「那支影片」是單數，讀起來就是同一支。
  // 不同廠商本來就會一直來，所以不標 once，改成讓正文承認這是又一間。
  it('第二次明說是另一間，而且結果不會提前跳到第二次的說法', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'ac_supplement_ad');
    const s = createGame(1);
    const refuse = e.choices.find((c) => /拒絕/.test(c.label));

    // playYear 的順序：text → 效果 → set → log
    expect(e.text(s)).not.toMatch(/又一間/);
    refuse.set(s);
    expect(refuse.log(s), '第一次仍要是第一次的說法').toMatch(/那支影片現在還在播/);

    expect(e.text(s)).toMatch(/又一間/);
    refuse.set(s);
    expect(refuse.log(s)).toMatch(/這家隔週也找到了別人/);
  });

  it('接受那一邊也跟著分岔，而且兩邊共用同一個計數', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'ac_supplement_ad');
    const s = createGame(1);
    const [refuse, take] = e.choices;
    refuse.set(s); // 第一次拒絕
    expect(e.text(s)).toMatch(/又一間/); // 第二次就該知道是另一間
    take.set(s);
    expect(take.log(s)).toMatch(/只 NG 了兩次/);
  });

  it('沒有被標成 once', async () => {
    const { EVENTS } = await import('../src/events.js');
    expect(EVENTS.find((x) => x.id === 'ac_supplement_ad').once).toBeUndefined();
  });
});

describe('年度考核唸的是你真正的數字', () => {
  // HUD 上歸類計分 61，黃振邦卻說「歸類計分零」；選項又寫死「我一年開四百台刀」，
  // 而那一局臨床只有 20%。兩個數字都要照實帶進來——
  // 而且不能只修正文漏掉按鈕，那是上一輪犯過的錯。
  it('正文與選項都帶入當下的計分與刀量', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'c_paper_quota');
    const s = createGame(1);
    s.attrs.papers = 61;
    s.stats.surgeries = 420;

    expect(e.text(s)).toContain('歸類計分 61');
    expect(e.text(s)).not.toMatch(/歸類計分零/);

    const push = e.choices[0];
    expect(push.label(s)).toContain('420');
    expect(push.label(s)).not.toMatch(/四百台/);
    expect(push.log(s)).toContain('420'); // 主任回話時唸的是同一個數字
  });

  it('數字變了，三段文字一起跟著變', async () => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === 'c_paper_quota');
    const a = createGame(1);
    a.attrs.papers = 0;
    a.stats.surgeries = 180;
    const b = createGame(1);
    b.attrs.papers = 240;
    b.stats.surgeries = 1100;
    expect(e.text(a)).not.toBe(e.text(b));
    expect(e.choices[0].label(a)).not.toBe(e.choices[0].label(b));
    expect(e.choices[0].log(a)).not.toBe(e.choices[0].log(b));
  });
});

// 同一個形狀在三條弧線上各出現一次：里程碑事件推進了 stage，而接在它後面的
// 那一幕留在抽籤池裡，於是要嘛晚很多年，要嘛整局不演。
//
//   恩師惜別會 → 最後一次門診    間隔中位 7 年、最長 15，兩幕都演的只有 60 局
//   王慶昌過世 → 兒子送來餅乾盒  過世的 76 局裡只有 23 局收得到
//   阿蘭姐遞申請 → 她最後一天    間隔中位 5 年，199 局遞了申請只有 99 局看到她走
//
// 三幕都是那條線的情感收束，而且都不是機緣——惜別會辦完本來就要交接病人、
// 盒子是兒子送來的、退休申請隔天就送出去了。三個都改成「觸發的隔年 forced」。
// （w_grandson 沒有跟著改：孫子剛好輪到你的醫院見習本來就是運氣。）
describe('里程碑之後的那一幕不留在抽籤池裡', () => {
  const cases = [
    ['m_last_clinic', 'mentorRetiredAt', '恩師的最後一次門診'],
    ['w_the_box', null, '王慶昌的餅乾盒'], // 用 people.patient.diedAt，不是 flags
    ['n_last_day', 'nurseNoticeAt', '阿蘭姐的最後一天'],
  ];

  it.each(cases)('%s 是 forced，不是抽籤', async (id) => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === id);
    expect(e, `${id} 不見了`).toBeTruthy();
    expect(e.forced, '留在 cond 就是留在抽籤池裡').toBeTypeOf('function');
    expect(e.cond, 'forced 與 cond 不要同時存在，閘門會分散在兩個地方').toBeUndefined();
  });

  it.each(cases.filter(([, flag]) => flag))('%s 只在觸發的隔年演', async (id, flag) => {
    const { EVENTS } = await import('../src/events.js');
    const e = EVENTS.find((x) => x.id === id);
    const src = String(e.forced);
    expect(src, `${id} 沒有讀 ${flag}`).toContain(flag);
    expect(src, '要釘在隔年，不是「之後任何一年」').toMatch(/===\s*1/);
  });
});
