import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PROLOGUE, EVENTS } from '../src/events.js';
import { decideEnding } from '../src/endings.js';
import { createGame } from '../src/engine.js';
import { val } from '../src/text.js';

const VALID_STAGES = ['pgy', 'resident', 'attending', 'aesthetic'];
const VALID_EFFECT_KEYS = [
  'clinical',
  'teaching',
  'papers',
  'self',
  'health',
  'familyBond',
  'money',
];
const VALID_STAT_KEYS = ['surgeries', 'livesSaved', 'lawsuits', 'missedDinners'];

/**
 * text / label / log / memory 都可以是狀態的函式。
 * 兩種性別各解析一次——女性線只在 gender 為 f 時走另一半分支，
 * 只驗一種性別的話，那一半永遠不會被跑到。
 */
function mustResolve(field, where) {
  expect(['string', 'function'], where).toContain(typeof field);
  if (typeof field !== 'function') return;
  for (const gender of ['m', 'f']) {
    const s = createGame(1, gender);
    s.age = 40;
    const out = field(s);
    expect(typeof out, `${where} @${gender}`).toBe('string');
    expect(out.length, `${where} @${gender}`).toBeGreaterThan(0);
  }
}

describe('PROLOGUE', () => {
  it('runs 16→24 and contains the exam event at 18 whose every choice leads nowhere else', () => {
    expect(PROLOGUE[0].age).toBe(16);
    expect(PROLOGUE.at(-1).age).toBe(24);
    const exam = PROLOGUE.find((p) => p.exam);
    expect(exam.age).toBe(18);
    expect(exam.choices.length).toBeGreaterThanOrEqual(3);
    expect(exam.outcome).toMatch(/醫學系/);
  });
});

describe('EVENTS integrity', () => {
  it('ids are unique', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every event is well-formed', () => {
    for (const e of EVENTS) {
      expect(e.id, e.id).toBeTruthy();
      expect(Array.isArray(e.stages) && e.stages.length > 0, e.id).toBe(true);
      for (const s of e.stages) expect(VALID_STAGES, `${e.id} stage ${s}`).toContain(s);
      mustResolve(e.text, `${e.id} text`);
      if (e.log) mustResolve(e.log, `${e.id} log`);
      if (e.memory) mustResolve(e.memory, `${e.id} memory`);
      if (e.choices) {
        expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
        for (const c of e.choices) {
          mustResolve(c.label, `${e.id} label`);
          mustResolve(c.log, `${e.id} log`);
          if (c.memory) mustResolve(c.memory, `${e.id} memory`);
          for (const k of Object.keys(c.effects || {}))
            expect(VALID_EFFECT_KEYS, e.id).toContain(k);
          for (const k of Object.keys(c.stats || {})) expect(VALID_STAT_KEYS, e.id).toContain(k);
        }
      } else {
        for (const k of Object.keys(e.effects || {})) expect(VALID_EFFECT_KEYS, e.id).toContain(k);
        for (const k of Object.keys(e.stats || {})) expect(VALID_STAT_KEYS, e.id).toContain(k);
      }
    }
  });

  it('the specialty choice exists, forced at age 26, and offers a way out', () => {
    const e = EVENTS.find((x) => x.id === 'pgy_specialty');
    expect(e.forced({ age: 26 })).toBe(true);
    expect(e.forced({ age: 25 })).toBe(false);
    const exit = e.choices.find((c) => c.set);
    expect(exit).toBeTruthy();
  });

  it('the lawsuit event is special (never in the random pool)', () => {
    const e = EVENTS.find((x) => x.id === 'a_lawsuit');
    expect(e.special).toBe(true);
  });

  it('every stage has a pool big enough that a 40-year life does not repeat itself', () => {
    // 一局最多走 40 年、每年抽 2 個，池子太小就會連年跳出同一則新聞。
    // 醫美階段曾經只有 4 個事件，玩起來像壞掉的跑馬燈。
    for (const s of VALID_STAGES) {
      const n = EVENTS.filter((e) => e.stages.includes(s) && !e.special).length;
      expect(n, `stage ${s}`).toBeGreaterThanOrEqual(35);
    }
  });

  it('the whole game carries 200+ events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(200);
  });
});

// 引用不存在的圖檔不會讓測試變紅,只會讓玩家看到破圖——所以在這裡擋住。
describe('美術素材引用', () => {
  const AGES = [25, 30, 42, 60];
  const MOODS = ['weary', 'wry', 'lifted'];

  // 兩套立繪都要齊。少一張的話，選了那個性別的玩家會在某一年看到破圖。
  it('兩種性別、每個年齡段的四種表情都有檔案', () => {
    for (const who of ['', 'f-']) {
      for (const age of AGES) {
        expect(existsSync(`assets/portrait-${who}${age}.webp`), `${who}${age} 平靜`).toBe(true);
        for (const m of MOODS)
          expect(existsSync(`assets/portrait-${who}${age}-${m}.webp`), `${who}${age} ${m}`).toBe(
            true,
          );
      }
    }
  });

  it('事件引用的場景與表情都存在', () => {
    for (const e of EVENTS) {
      if (e.scene)
        expect(existsSync(`assets/scene-${e.scene}.webp`), `${e.id} → ${e.scene}`).toBe(true);
      if (e.mood) expect(MOODS, `${e.id} → ${e.mood}`).toContain(e.mood);
    }
  });

  it('每個結局引用的場景都存在', () => {
    const causes = ['retire', 'death', 'exit-specialty'];
    for (const cause of causes) {
      for (const seed of [1, 2, 3]) {
        const s = createGame(seed);
        const ending = decideEnding(s, cause);
        expect(
          existsSync(`assets/scene-${ending.scene}.webp`),
          `${ending.id} → ${ending.scene}`,
        ).toBe(true);
      }
    }
  });

  it('每個階段的預設場景都存在', () => {
    for (const name of [
      'corridor',
      'or',
      'aesthetic',
      'oncall',
      'office',
      'home',
      'clinic',
      'court',
    ])
      expect(existsSync(`assets/scene-${name}.webp`), name).toBe(true);
  });
});

// 事件冷卻：剛看過的不再抽。沒有這條的話，池子小的階段會連年跳出同一則。
describe('事件不會連年重複', () => {
  it('連續 20 年至少看到 25 種不同事件', async () => {
    const { createGame, pickEvents } = await import('../src/engine.js');
    for (const setup of [
      (s) => {
        s.career = 'aesthetic';
        s.talents.social = 3;
      },
      () => {},
    ]) {
      const s = createGame(42);
      s.age = 40;
      s.alloc = { clinical: 40, teaching: 10, research: 20, family: 15, personal: 15 };
      setup(s);
      const seen = new Set();
      for (let y = 0; y < 20; y++) {
        for (const e of pickEvents(s)) seen.add(e.id);
        s.age++;
      }
      expect(seen.size).toBeGreaterThanOrEqual(25);
    }
  });
});

// 玩家可見的新選項要有自己的回歸測試，不能只靠全域的資料完整性檢查——
// 那一支只驗形狀（欄位型別、效果鍵合法），不會發現某個選項整個消失。
describe('審稿的利益衝突', () => {
  const ev = () => EVENTS.find((e) => e.id === 'ac_be_reviewer');

  it('這一幕確實擺出了利益衝突', () => {
    // 沒有重疊這個前提，「婉拒」就沒有意義，測試也就失去意思
    expect(ev().text).toMatch(/重疊/);
  });

  it('揭露重疊並婉拒是選項之一，而且排在最前面', () => {
    const c = ev().choices[0];
    expect(c.label).toMatch(/婉拒/);
    expect(c.label).toMatch(/編輯/);
  });

  it('婉拒只回自我，不動教學與計分', () => {
    const c = ev().choices[0];
    expect(c.effects.self).toBeGreaterThan(0); // 做對的事，自我會回來
    // 審稿不是教學服務，婉拒不該扣教學分數；也不該因此多拿歸類計分
    expect(c.effects.teaching ?? 0).toBe(0);
    expect(c.effects.papers ?? 0).toBe(0);
    expect(c.memory).toBeTruthy(); // 這是會被記進「你記得的事」的決定
  });

  it('不替合規行為捏造後果', () => {
    // ICMJE 與 COPE 都把「向編輯揭露並迴避」當成正常流程，編輯不會因此記你一筆。
    // 第一版寫「少了一次在期刊露臉」，跟同幕的匿名審稿矛盾；
    // 第二版改成「下次他想到誰就是想不到你」，是把矛盾換成沒有依據的報復。
    const c = ev().choices[0];
    expect(c.log).not.toMatch(/露臉/); // 匿名審稿不會在期刊上出現
    expect(c.log).not.toMatch(/想不到你|記你一筆|以後不會再找你/); // 沒有依據的職涯懲罰
    expect(c.log).toMatch(/編輯|換了人審/);
    // 同一幕的另一個選項明寫署名匿名，兩邊不能互相打架
    expect(ev().choices.some((x) => /匿名/.test(x.log))).toBe(true);
  });

  it('原本那兩條路都還在——婉拒是多一個選擇，不是取代', () => {
    const labels = ev().choices.map((c) => c.label);
    expect(labels.length).toBe(3);
    expect(labels.some((l) => /照規矩審/.test(l))).toBe(true);
    expect(labels.some((l) => /延長審查期限/.test(l))).toBe(true);
  });
});

// 上一個 commit 改了四處行為卻沒有附測試，這裡補上。
// 每一條都只釘住實際被回報、被修正的那一點，不擴成全域家規。
describe('回報後修正的那幾處', () => {
  const byId = (id) => EVENTS.find((e) => e.id === id);

  it('休克的病人不會被拉去站著拍片', () => {
    // 血壓量不到的人站不起來。不能站的時候看游離氣體是讓他左側躺。
    const e = byId('w_the_night');
    expect(e.text).toMatch(/血壓量不到/); // 前提還在，這條測試才有意義
    expect(e.text).not.toMatch(/立位/);
    expect(e.text).toMatch(/左側躺/);
  });

  it('爭第一作者的後果不記在升等的教學服務分數上', () => {
    // 那是研究合作與科內政治，這個遊戲沒有建那條線；不要拿不相干的軸來頂。
    const c = byId('r_authorship').choices.find((x) => /爭取第一作者/.test(x.label));
    expect(c).toBeTruthy();
    expect(c.effects.teaching ?? 0).toBe(0);
    expect(c.effects.papers).toBeGreaterThan(0); // 你確實拿到了第一作者
  });

  it('女性線那兩處的後果也不記在教學服務分數上', () => {
    // 頂撞主任是政治，拿診斷書談班表是人力調度，兩者都不是教學服務。
    const chief = byId('fw_recruit_ask').choices.find((c) => /不會問我同梯/.test(c.label));
    expect(chief).toBeTruthy();
    expect(chief.effects.teaching ?? 0).toBe(0);
    expect(chief.bond?.chief).toBeLessThan(0); // 代價由關係承擔

    const roster = byId('fw_on_call_pregnant').choices.find((c) => /診斷書/.test(c.label));
    expect(roster).toBeTruthy();
    expect(roster.effects.teaching ?? 0).toBe(0);
    expect(roster.bond?.chief).toBeLessThan(0);
  });

  // 教學服務分數是升等用的，算的是登錄得到的教學行為——演講時數、臨床教學、
  // 論文指導。這一類錯了至少六次，前四次都是零星撞到的（醫材函文、獵頭、爭第一
  // 作者、孕期班表），第五次才整批把 39 處有 teaching 正效果的抓出來一次審完。
  //
  // 這裡釘的是那次裁決的兩個方向：判為非教學的不能再長回來，判為諷刺的也不能被
  // 下一個人當 bug 修掉——後者已經有兩個人差點動手。
  describe('教學服務分數只給登錄得到的教學', () => {
    const choiceOf = (id, labelRe) => {
      const c = byId(id).choices.find((x) => labelRe.test(String(x.label)));
      expect(c, `${id} 找不到 ${labelRe}`).toBeTruthy();
      return c;
    };

    it.each([
      ['ac_resident_hours', /你自己補/, '替住院醫師補班是人力替代'],
      ['j_asks_hours', /照實填/, '爭取誠實登錄工時是倡議，而且失敗了'],
      ['j_the_question', /會。總得有人開刀/, '醫局門口那五分鐘沒有系統登錄得到'],
      ['j_the_question', /不會。你還來得及/, '同一段對話，反方向也不該扣'],
      ['c_his_words', /不會出現在任何一張表上/, '辦公室裡的一句實話量不到'],
      ['c_his_words', /我在幫你想別的辦法/, '整理技術報告是研究協助，而且被退了'],
    ])('%s「%s」不記教學分', (id, labelRe, why) => {
      expect(choiceOf(id, labelRe).effects?.teaching ?? 0, why).toBe(0);
    });

    it('答不出來那一支的教學分是刻意留的諷刺', () => {
      // 那節門診本來就會登錄成教學時數（a_teaching_credit：「教學時數已認列」）。
      // 制度記得到你出現過，記不到你答不出來。要拿掉它請先讀那一段的註解。
      const silent = choiceOf('ac_clerk_question', /答不出來/);
      expect(silent.effects.teaching, '這個 +2 是諷刺，不是軸錯置').toBe(2);
      expect(silent.effects.self, '而它同時要讓你付代價，不然諷刺讀起來像獎勵').toBeLessThan(0);
      // 並排的另一支沒有教學分，笑點靠這個對比成立
      expect(choiceOf('ac_clerk_question', /這行還是值得/).effects?.teaching ?? 0).toBe(0);

      // 但那個對比只有看選項卡才讀得到，所以 log 要用機制語言點一下——
      // 而且順序不能反：情緒先落地，官僚才收尾。
      const log = String(silent.log);
      expect(log, '沒有把制度那一句講出來，+2 讀起來就像遊戲以為你教了東西').toMatch(
        /登錄成教學時數/,
      );
      expect(
        log.indexOf('他懂的是哪一種答案'),
        '公文那句蓋在留白前面，那句留白就沒了',
      ).toBeLessThan(log.indexOf('登錄成教學時數'));
    });
  });

  // 保管費年年收，這一幕沒有 once。原本寫死「三年前那個名字」，但實測它會在凍卵後
  // 第 1 到第 35 年之間演出，中位 19 年——1286 次演出裡只有 19 次剛好是三年。
  it('保管費通知講的年數是真的年數', () => {
    const fee = byId('fw_egg_storage_fee');
    const say = (frozenAt, age) => {
      const s = createGame(1, 'f');
      s.age = age;
      s.flags.eggsFrozen = frozenAt;
      return val(fee.log, s);
    };
    // 正文的年數寫中文數字，阿拉伯數字只用在年齡與計數
    expect(say(33, 52)).toMatch(/十九年前那個名字/);
    expect(say(33, 36)).toMatch(/三年前那個名字/);
    expect(say(33, 43)).toMatch(/十年前那個名字/);
    expect(say(33, 53)).toMatch(/二十年前那個名字/);
    expect(say(33, 34)).toMatch(/去年那個名字/); // 隔年就演的話「一年前」讀起來很怪
    expect(say(33, 68)).toMatch(/三十五年前那個名字/);
    expect(say(33, 52)).not.toMatch(/[0-9]/);
  });

  // 凍卵窗口 30-38 橫跨 R5 與主治，實測 273 次觸發裡 146 次是主治。
  it('凍卵那一幕不會對主治講輪訓', () => {
    const at = (rank) => {
      const s = createGame(1, 'f');
      s.age = 34;
      s.rank = rank;
      return val(byId('fw_egg_freeze').text, s);
    };
    expect(at('none')).toMatch(/輪訓/);
    expect(at('vs')).not.toMatch(/輪訓/);
    expect(at('professor')).not.toMatch(/輪訓/);
  });

  // 保管費的 cond 就是 flags.eggsFrozen。凡是正文說「停了」的選項，都必須把它清掉，
  // 否則帳單會繼續寄——實測 400 局裡有 45 局選了「不用了。」，其中 14 局之後又被收費。
  describe('說終止保管的選項要真的終止', () => {
    const clears = (eventId, labelRe) => {
      const c = byId(eventId).choices.find((x) => labelRe.test(x.label));
      expect(c, `${eventId} 找不到 ${labelRe}`).toBeTruthy();
      const s = createGame(1, 'f');
      s.flags.eggsFrozen = 33;
      c.set?.(s);
      return s.flags.eggsFrozen;
    };

    it('「不用了。」之後不再收保管費', () => {
      expect(clears('fw_eggs_used', /不用了/)).toBeFalsy();
    });

    it('簽了「不繼續保存」之後不再收保管費', () => {
      expect(clears('fw_eggs_let_go', /不繼續保存/)).toBeFalsy();
    });

    it('選擇繼續保存的話，帳單本來就該繼續來', () => {
      expect(clears('fw_eggs_let_go', /照舊/)).toBe(33);
    });

    // 有伴侶時做過療程、伴侶之後離開的人會變回單身，於是《人工生殖法》那一幕會在
    // 中位 16 年後才演，把「原來需要另一個人的名字」講成第一次領悟——她那時候有那個名字。
    // 500 局裡有 36 局撞到（佔用過卵的 31%）。
    it('做過療程的人不會在十幾年後被當成第一次告知法規', () => {
      const law = byId('fw_eggs_law');
      const base = () => {
        const s = createGame(1, 'f');
        s.age = 54;
        s.flags.eggsFrozen = 33;
        s.family.stage = 'single';
        return s;
      };
      expect(law.cond(base()), '沒做過療程的單身女性仍然要看到這一幕').toBe(true);

      const tried = base();
      byId('fw_eggs_used')
        .choices.find((c) => /登記/.test(c.label))
        .set(tried);
      expect(tried.flags.eggsTried).toBeTruthy();
      expect(law.cond(tried), '她三十幾歲就用過那個名字了').toBe(false);
    });

    // 《人工生殖法》限受術夫妻。這一幕的 cond 只要求「不是單身」，實測 135 次觸發
    // 全部是未婚——所以法規那道牆要寫在正文與選項裡，開始療程等於先去登記。
    it('開始療程的那個選項會先完成結婚登記', () => {
      const start = byId('fw_eggs_used').choices.find((c) => /登記/.test(c.label));
      const s = createGame(1, 'f');
      s.age = 39;
      s.family.stage = 'steady';
      s.flags.eggsFrozen = 33;
      start.set(s);
      expect(s.family.stage, '沒有登記就開始療程等於遊戲自己違反它講過的法規').toBe('married');
      expect(s.family.marriedAt).toBe(39);
      expect(val(byId('fw_eggs_used').text, s)).toMatch(/結婚證書/);
    });

    it('凍卵線的每一條路都走得到某一個收尾', () => {
      // 之前單身那條沒有出口：39 歲告訴她不能用，然後保管費一路收到六十幾歲。
      const fee = byId('fw_egg_storage_fee');
      const exits = ['fw_eggs_used', 'fw_eggs_let_go'];
      const single = createGame(1, 'f');
      single.age = 46;
      single.flags.eggsFrozen = 33;
      expect(fee.cond(single), '還在收費').toBe(true);
      expect(
        exits.some((id) => byId(id).cond(single)),
        '單身、四十幾歲、還在繳保管費的人，至少要有一幕讓她決定',
      ).toBe(true);
    });
  });
});

// 前一輪把王慶昌的第一台刀從破裂性腹主動脈瘤改成十二指腸前壁穿孔，
// 但下游的追蹤沒有跟著改：門診說「追蹤影像沒有變化」、復發那一幕靠「例行追蹤的斷層」。
// 穿孔修補後既沒有可追的腫瘤，也沒有理由讓他年年吃那個輻射。
describe('王慶昌的追蹤要接得上他開過的那台刀', () => {
  const byId = (id) => EVENTS.find((e) => e.id === id);
  const text = (id) => {
    const e = byId(id);
    return typeof e.text === 'string' ? e.text : e.text(createGame(1));
  };

  it('第一台刀是穿孔修補', () => {
    expect(text('w_the_night')).toMatch(/游離氣體|板子/);
  });

  it('年度門診追的是症狀與傷口，不是影像', () => {
    const t = text('w_annual_guava');
    expect(t).not.toMatch(/影像|斷層|電腦斷層/);
  });

  it('胰頭腫瘤由新症狀帶出來，不是憑空的例行斷層', () => {
    const t = text('w_recurrence');
    expect(t).not.toMatch(/例行追蹤/);
    expect(t).toMatch(/黃|尿|瘦/); // 先有症狀，才有理由開影像
    expect(t).toMatch(/斷層/); // 影像仍然要出現，只是排在症狀之後
  });
});

// 台灣的外科專科醫師甄審看的是完成訓練與筆試口試，沒有論文或第一作者門檻。
// 原本住院醫師說「我要申請專科」，把一個不存在的制度門檻寫成理由。
// 第一作者真正有用的地方是留任、找主治缺、申請 fellowship。
describe('第一作者的理由要對得上真實需求', () => {
  const e = () => EVENTS.find((x) => x.id === 'ac_author_order');

  it('住院醫師要的不是專科考試的門票', () => {
    expect(e().text).not.toMatch(/申請專科|專科醫師甄審/);
  });

  it('理由與後續結果講的是同一件事', () => {
    const ev = e();
    expect(ev.text).toMatch(/留|履歷/); // 他要的是留下來
    const give = ev.choices.find((c) => /給他/.test(c.label));
    expect(give.log).toMatch(/留|缺/); // 結果也要回答那件事
    expect(give.log).not.toMatch(/申請/); // 不能還停在舊的理由上
  });
});

// 這個遊戲沒有房貸、沒有房子，也沒有任何 home ownership state。
// 保健食品那一幕的接受選項原本寫「接。房貸不會自己還。」——
// 一個一直單身、從未買房的玩家會被告知自己有房貸。
describe('選項不替玩家造沒有的負擔', () => {
  it('保健食品業配的接受選項不提房貸', () => {
    const e = EVENTS.find((x) => x.id === 'ac_supplement_ad');
    const take = e.choices.find((c) => c.effects?.money > 0);
    expect(take, '應該有一個拿錢的選項').toBeTruthy();
    expect(take.label).not.toMatch(/房貸|房子|頭期款/);
    expect(take.label).toMatch(/十五萬/); // 講眼前那筆錢就夠了
  });
});

describe('診所週轉那一幕也不替玩家造房貸', () => {
  // 條件只有存款低於 50 萬，單身、從未買房的人一樣會抽到。
  it('自己停薪那個選項的結果不提房貸', () => {
    const e = EVENTS.find((x) => x.id === 'ae_closure_risk');
    const c = e.choices.find((x) => /不領薪水/.test(x.label));
    expect(c, '應該有一個自己停薪的選項').toBeTruthy();
    expect(c.log).not.toMatch(/房貸/);
  });
});

describe('別人的藥盒不等於主角的', () => {
  // p_stayed_cost 的條件只有「同梯還在」與年齡，卻收在「跟你自己抽屜裡那排一樣多」。
  // 這個遊戲沒有用藥狀態，健康 96 的主角也會讀到那一句。
  it('不宣稱主角自己有藥盒', () => {
    const e = EVENTS.find((x) => x.id === 'p_stayed_cost');
    expect(e.text).toMatch(/六罐|一排藥盒/); // 林致遠那排要留著，那是這一幕的重量
    expect(e.log).not.toMatch(/你自己|你的抽屜|抽屜裡那排/);
  });
});

describe('挖角那一幕不會讓玩家走掉又沒走', () => {
  // 原本的「去」只改錢與心情，之後黃振邦、阿蘭姐與整套院內事件照演，
  // 結果文還寫「孩子轉了學」——這一局可能單身無子。
  // 作者決定不建轉職狀態，改成談判：你其實走不掉。
  const e = () => EVENTS.find((x) => x.id === 'as_headhunt');

  it('沒有一個選項宣稱你離開了這間醫院', () => {
    for (const c of e().choices) {
      expect(c.label).not.toMatch(/^去/);
      expect(c.log).not.toMatch(/新醫院|搬了家|轉了學/);
    }
  });

  it('兩個選項都留在原院，但代價不同', () => {
    const [deal, decline] = e().choices;
    expect(deal.label).toMatch(/談/);
    expect(deal.effects.self).toBeLessThan(0); // 拿去談是要付代價的
    expect(decline.effects.self).toBeGreaterThan(0); // 不提的人保住了一點自己
    expect(decline.log).toMatch(/婉拒/);
  });
});

describe('數字要有敘事依據', () => {
  // 出勤紀錄那一幕，照實回覆扣 5 萬、配合修改給 8 萬，而兩段結果都沒有提到任何一筆錢。
  // 主治的收入綁在績效，不是在院時數——那兩個數字是為了讓選項有重量硬接上去的。
  it('出勤紀錄那一幕不再憑空動存款', () => {
    const e = EVENTS.find((x) => x.id === 'as_overtime_edit');
    for (const c of e.choices) expect(c.effects.money ?? 0).toBe(0);
    // 代價仍然在，只是寫在該寫的地方
    expect(e.choices.find((c) => /照實/.test(c.label)).effects.self).toBeGreaterThan(0);
    expect(e.choices.find((c) => /修正/.test(c.label)).effects.self).toBeLessThan(0);
  });
});

describe('受雇階段的選項不會動私人存款', () => {
  // 主治是受雇的：DRG 超支由醫院吸收、健保給付的斷層不是他自費、
  // 停一次門診也不會讓存款少二十萬。這些數字原本是為了讓選項有重量硬接的。
  it('DRG 與防禦性影像都不從個人存款扣', () => {
    for (const id of ['as_drg_los', 'as_defensive_ct']) {
      const e = EVENTS.find((x) => x.id === id);
      for (const c of e.choices) expect(c.effects.money ?? 0, `${id} ${c.label}`).toBe(0);
    }
  });

  it('為了孩子停診，代價在家庭與人情，不在存款', () => {
    const e = EVENTS.find((x) => x.id === 'fb_kid_warning');
    const go = e.choices.find((c) => /今天就去/.test(c.label));
    expect(go.effects.money ?? 0).toBe(0);
    expect(go.effects.familyBond).toBeGreaterThan(0);
    expect(go.log).toMatch(/代診/); // 欠下的是替你代診的那個人
  });

  it('派出所那一筆賠償兩邊都要付，而且結果文說得出誰付的', () => {
    // 賠償是真的（「賠了錢，簽了字」），只是八十萬是憑空的數字。
    const e = EVENTS.find((x) => x.id === 'fb_kid_police');
    const [go, stay] = e.choices;
    expect(go.effects.money).toBe(stay.effects.money); // 同一件事，金額一樣
    expect(Math.abs(go.effects.money)).toBeLessThan(40);
    expect(go.log).toMatch(/賠了錢/);
    expect(stay.log).toMatch(/墊的/); // 沒去的那一邊要說清楚是誰付的
  });
});

describe('績效排名不替玩家寫履歷', () => {
  // 主治第二年、臨床只有 20% 的玩家被告知「你開的刀最難，也最花時間」。
  // 這個遊戲沒有追蹤刀的難度，也沒有任何選擇能讓你成為專開難刀的人。
  it('不宣稱玩家開的刀最難', () => {
    const e = EVENTS.find((x) => x.id === 'ac_kpi_slide');
    expect(e.text).not.toMatch(/你開的刀最難|最花時間/);
    expect(e.text).toMatch(/排名|績效/); // 制度上的對比要留著，那是這一幕的內容
    expect(e.log).toMatch(/短刀/); // 同事開短刀排第一，這個對比不依賴玩家的刀有多難
  });
});

describe('教學分數只給教學', () => {
  // 教學軸就是升等審查的教學服務分數。向健保署做行政說明、跟醫院談聘書條件
  // 都不是教學服務——這已經是第三、第四次接錯這個軸。
  it('醫材函文與挖角談判都不動教學', () => {
    const cases = [
      ['as_nhi_letter_sd', /認真寫/],
      ['as_headhunt', /談條件/],
    ];
    for (const [id, pick] of cases) {
      const e = EVENTS.find((x) => x.id === id);
      const c = e.choices.find((x) => pick.test(typeof x.label === 'string' ? x.label : ''));
      expect(c, `${id} 找不到那個選項`).toBeTruthy();
      expect(c.effects.teaching ?? 0, `${id}`).toBe(0);
    }
  });

  it('代價還在，只是換到對的地方', () => {
    const letter = EVENTS.find((x) => x.id === 'as_nhi_letter_sd');
    expect(letter.choices.find((c) => /認真寫/.test(c.label)).effects.health).toBeLessThan(0);
    const deal = EVENTS.find((x) => x.id === 'as_headhunt');
    expect(deal.choices.find((c) => /談條件/.test(c.label)).effects.self).toBeLessThan(0);
  });
});

describe('教學服務分數不含院務行政', () => {
  // 試玩者的理由：若 institutional service 都要算，那個軸就不該叫教學服務。
  // 感控委員會、接下部主任、在惜別會上台講一句話，三者都不是教學。
  it('這三幕都不動教學分數', () => {
    for (const id of ['c_admin_dump', 'c_succession', 'm_retire']) {
      const e = EVENTS.find((x) => x.id === id);
      for (const c of e.choices || []) expect(c.effects?.teaching ?? 0, `${id} ${c.label}`).toBe(0);
    }
  });

  it('三幕原本就各有足夠的代價或回饋', () => {
    const admin = EVENTS.find((x) => x.id === 'c_admin_dump').choices[0];
    const chief = EVENTS.find((x) => x.id === 'c_succession').choices[0];
    const retire = EVENTS.find((x) => x.id === 'm_retire').choices[0];
    for (const c of [admin, chief, retire]) {
      const moved = Object.entries(c.effects || {}).filter(([, v]) => v);
      expect(moved.length, `${c.label} 拿掉教學之後不能什麼都不剩`).toBeGreaterThan(0);
    }
  });
});

describe('沒有第二份「你開的刀最難」', () => {
  // 修掉 ac_kpi_slide 之後，c_kpi_ranking 還有一份同型的斷言——
  // 又是只修了被回報的那一個。
  it('全部事件都不宣稱玩家開的刀最難', () => {
    const bad = [];
    for (const e of EVENTS) {
      const parts = [e.text, e.log, ...(e.choices || []).flatMap((c) => [c.log, c.memory])];
      for (const x of parts)
        if (typeof x === 'string' && /最難的刀|刀最難|全科最難/.test(x)) bad.push(e.id);
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});

describe('特約病房不發獎金也不扣薪', () => {
  // 早晚各巡一次頂樓，私人存款 +10；交給住院醫師，私人存款 −10。
  // 正文與結果裡只有院方壓力、時間分配與病人指名，沒有任何獎金、扣薪或自費。
  it('兩個選項都不動存款', () => {
    const e = EVENTS.find((x) => x.id === 'as_vip_round');
    for (const c of e.choices) expect(c.effects.money ?? 0, c.label).toBe(0);
  });

  it('代價留在原本就寫對的地方', () => {
    const e = EVENTS.find((x) => x.id === 'as_vip_round');
    const obey = e.choices.find((c) => /照做/.test(c.label));
    const delegate = e.choices.find((c) => /住院醫師/.test(c.label));
    expect(obey.effects.health).toBeLessThan(0); // 一天多跑兩趟
    expect(obey.log).toMatch(/沒有家屬的老先生/); // 真正被排擠掉的是那個人
    expect(delegate.effects.self).toBeGreaterThan(0);
    expect(delegate.log).toMatch(/院長室/); // 代價是那通電話
  });
});

describe('點值只有一份', () => {
  // 配置盤顯示當年 0.89，事件卻寫死 0.78；而 yearlyIncome 已經用 pointValue
  // 算過薪水了，事件再扣 20 萬等於同一件事算兩次。
  it('沒有任何地方把點值寫死', () => {
    const bad = [];
    for (const e of EVENTS) {
      const parts = [e.text, e.log, ...(e.choices || []).flatMap((c) => [c.log, c.memory])];
      for (const x of parts) if (typeof x === 'string' && /點值\s*0\.\d/.test(x)) bad.push(e.id);
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('點值那一幕帶入當年的數字，而且不重複扣錢', () => {
    const e = EVENTS.find((x) => x.id === 'a_point_value');
    expect(e.effects.money ?? 0, 'yearlyIncome 已經把點值算進薪水了').toBe(0);
    expect(e.effects.self).toBeLessThan(0); // 重量留在自我
    const low = createGame(1);
    low.pointValue = 0.72;
    const high = createGame(1);
    high.pointValue = 0.95;
    expect(e.text(low)).toContain('0.72');
    expect(e.text(high)).toContain('0.95');
  });
});
