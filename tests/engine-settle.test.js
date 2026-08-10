import { describe, it, expect } from 'vitest';
import {
  createGame,
  playYear,
  applyGrowth,
  settleHealth,
  settleMoney,
  settlePhd,
  settlePromotion,
  malpracticeChance,
  projectCollapse,
  forecast,
  conformAllocation,
  annualSlack,
  rollPointValue,
} from '../src/engine.js';
import { ACTIONS, runAction } from '../src/actions.js';

const alloc = (c, t, r, f, p) => ({
  clinical: c,
  teaching: t,
  research: r,
  family: f,
  personal: p,
});

describe('applyGrowth', () => {
  it('dexterity steepens the clinical growth curve', () => {
    const slow = createGame(1);
    const fast = createGame(1);
    slow.age = fast.age = 27; // resident, mult 1.0
    slow.talents.dexterity = 1;
    fast.talents.dexterity = 10;
    applyGrowth(slow, alloc(60, 0, 0, 20, 20));
    applyGrowth(fast, alloc(60, 0, 0, 20, 20));
    // 臨床 60% → 邊際遞減後 45+15*0.4=51% → 6.12 等效月
    // 手感 1: 6.12*(0.4+0.16)=3.43 ; 手感 10: 6.12*(0.4+1.6)=12.24
    expect(fast.attrs.clinical - 5).toBeCloseTo(12.24, 1);
    expect(slow.attrs.clinical - 5).toBeCloseTo(3.43, 1);
  });

  it('a PhD multiplies paper output by 1.5 — the degree is a production line', () => {
    const phd = createGame(1);
    const none = createGame(1);
    phd.flags.phd = 'done';
    applyGrowth(phd, alloc(50, 0, 30, 10, 10));
    applyGrowth(none, alloc(50, 0, 30, 10, 10));
    expect(phd.attrs.papers).toBeCloseTo(none.attrs.papers * 1.5, 5);
  });

  it('kids raise the family time tax', () => {
    const s = createGame(1);
    s.family.kids = 1;
    const before = s.attrs.familyBond;
    applyGrowth(s, alloc(60, 0, 0, 20, 20)); // 家庭 20% < 25% → +7.2 −12
    expect(s.attrs.familyBond).toBeCloseTo(before - 4.8, 5);
  });

  it('zero personal months erodes self', () => {
    const s = createGame(1);
    applyGrowth(s, alloc(60, 0, 20, 20, 0));
    expect(s.attrs.self).toBeCloseTo(47, 5);
  });

  it('counts surgeries', () => {
    const s = createGame(1);
    s.age = 27; // resident: surgical, 8/month
    applyGrowth(s, alloc(60, 0, 0, 20, 20));
    expect(s.stats.surgeries).toBe(49); // 6.12 等效月 × 8 台
  });

  // 一位一直單身、沒有孩子的外科醫師，結算單上寫著「錯過的家庭晚餐 4902」。
  // neglect 早就用 hasSomeone 判斷過「還沒有人的時候不算疏忽」，
  // 但這個計數在判斷外面，自己加了四十年。
  describe('錯過的晚餐要有人在等', () => {
    it('一直單身、沒有孩子的人不會累積', () => {
      const s = createGame(1);
      s.age = 40;
      for (let y = 0; y < 10; y++) applyGrowth(s, alloc(60, 0, 0, 0, 40));
      expect(s.stats.missedDinners).toBe(0);
    });

    it('有人之後才開始算', () => {
      const s = createGame(1);
      s.age = 40;
      applyGrowth(s, alloc(60, 0, 0, 10, 30));
      expect(s.stats.missedDinners).toBe(0); // 還沒有人
      s.family.stage = 'married';
      applyGrowth(s, alloc(60, 0, 0, 10, 30));
      expect(s.stats.missedDinners).toBeGreaterThan(0); // 有人了，而且低於承諾
    });

    // 家庭給到 70%——幾乎是上限——原本一年還是錯 36 頓，
    // 結算單等於在否定玩家實際做過的事。
    it('做到自己答應的下限就不再累積', () => {
      const s = createGame(1);
      s.age = 42;
      s.family = {
        stage: 'married',
        kids: 2,
        children: [{ bornAt: 37 }],
        floor: 25,
        invested: 5,
        neglect: 0,
      };
      for (const fam of [25, 40, 70]) {
        s.stats.missedDinners = 0;
        applyGrowth(s, alloc(100 - 20 - fam, 10, 10, fam, 10 - 10 + (fam > 60 ? 0 : 0)));
        expect(s.stats.missedDinners, `家庭 ${fam}%`).toBe(0);
      }
    });

    it('低於承諾才欠，而且差越多欠越多', () => {
      const mk = (fam) => {
        const s = createGame(1);
        s.age = 42;
        s.family = {
          stage: 'married',
          kids: 2,
          children: [{ bornAt: 37 }],
          floor: 25,
          invested: 5,
          neglect: 0,
        };
        applyGrowth(s, alloc(100 - 20 - fam, 10, 10, fam, 0));
        return s.stats.missedDinners;
      };
      expect(mk(15)).toBeGreaterThan(0);
      expect(mk(0)).toBeGreaterThan(mk(10));
      expect(mk(10)).toBeGreaterThan(mk(15));
    });

    it('未婚但有孩子也要算——只要低於承諾', () => {
      const s = createGame(1);
      s.age = 40;
      s.family.kids = 1;
      s.family.children = [{ bornAt: 35 }];
      applyGrowth(s, alloc(70, 0, 0, 5, 25)); // 承諾下限 15%，只給 5%
      expect(s.stats.missedDinners).toBeGreaterThan(0);

      // 同樣未婚有小孩，但做到下限就不算欠
      const kept = createGame(1);
      kept.age = 40;
      kept.family.kids = 1;
      kept.family.children = [{ bornAt: 35 }];
      applyGrowth(kept, alloc(55, 0, 0, 20, 25));
      expect(kept.stats.missedDinners).toBe(0);
    });
  });
});

describe('settleHealth', () => {
  it('overwork accelerates decay; personal time recovers', () => {
    const worked = createGame(1);
    const rested = createGame(1);
    worked.talents.constitution = rested.talents.constitution = 5;
    settleHealth(worked, alloc(80, 0, 20, 0, 0)); // 負荷 100% → 過勞 6.3
    settleHealth(rested, alloc(50, 0, 10, 10, 30)); // 負荷 60% → 過勞 0.7,且有回血
    expect(worked.attrs.health).toBeLessThan(rested.attrs.health);
  });

  it('returns true on death (health hits 0)', () => {
    const s = createGame(1);
    s.attrs.health = 3;
    s.talents.constitution = 1;
    expect(settleHealth(s, alloc(80, 0, 20, 0, 0))).toBe(true);
    expect(s.attrs.health).toBe(0);
  });
});

describe('settleMoney', () => {
  it('salary follows rank, not surgical skill', () => {
    const a = createGame(1);
    const b = createGame(1);
    a.age = b.age = 35;
    a.rank = b.rank = 'vs';
    a.attrs.clinical = 95;
    b.attrs.clinical = 40;
    settleMoney(a);
    settleMoney(b);
    expect(a.attrs.money).toBe(b.attrs.money); // 技能 95 和 40,收入一樣
  });

  it('aesthetic income depends on social talent', () => {
    const hi = createGame(1);
    const lo = createGame(1);
    hi.career = lo.career = 'aesthetic';
    hi.talents.social = 9; // 60+405=465
    lo.talents.social = 2; // 60+90=150
    settleMoney(hi);
    settleMoney(lo);
    expect(hi.attrs.money).toBeGreaterThan(lo.attrs.money + 200);
  });
});

describe('settlePromotion', () => {
  it('first attending year grants vs rank', () => {
    const s = createGame(1);
    s.age = 32;
    expect(settlePromotion(s)).toMatch(/主治/);
    expect(s.rank).toBe('vs');
  });

  it('assistant professorship needs 300 points and passing teaching — never clinical', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.attrs.clinical = 100;
    s.attrs.papers = 299;
    s.attrs.teaching = 100;
    expect(settlePromotion(s)).toBeNull(); // 歸類計分差 1 點,刀神也沒用
    s.attrs.papers = 300;
    expect(settlePromotion(s)).toMatch(/助理教授/);
    expect(s.rank).toBe('assistant');
  });

  it('teaching below 70 blocks submission entirely (教學服務不及格,不得送件)', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.attrs.papers = 500;
    s.attrs.teaching = 69;
    expect(settlePromotion(s)).toBeNull();
  });

  it('a PhD lets you submit by degree — no point threshold (以學位送審者,不在此限)', () => {
    const withPhd = createGame(1);
    const without = createGame(1);
    for (const s of [withPhd, without]) {
      s.age = 40;
      s.rank = 'vs';
      s.attrs.papers = 50;
      s.attrs.teaching = 70;
    }
    withPhd.flags.phd = 'done';
    expect(settlePromotion(without)).toBeNull(); // 50 點,沒學位:繼續刻
    expect(settlePromotion(withPhd)).toMatch(/助理教授/); // 以學位送審,直接過
  });

  it('associate needs a grant application record; professor needs 2+ years as PI (未具備者不收件)', () => {
    const s = createGame(1);
    s.age = 50;
    s.rank = 'assistant';
    s.attrs.papers = 450;
    s.attrs.teaching = 80;
    expect(settlePromotion(s)).toBeNull(); // 沒有計畫申請紀錄:不收件
    s.grants.applied = true;
    expect(settlePromotion(s)).toMatch(/副教授/);
    s.attrs.papers = 600;
    s.grants.yearsPI = 1;
    expect(settlePromotion(s)).toBeNull(); // 主持未滿二年:不收件
    s.grants.yearsPI = 2;
    expect(settlePromotion(s)).toMatch(/教授/);
  });
});

describe('計畫只有一個主人', () => {
  // 同一年裡，行動面板先說「通過了，累計 2 年」，年度事件又說「未通過，創新性不足」。
  // 兩套系統各寫各的 grants，年資還會重複累計；而且不按那顆按鈕、
  // 光把研究拉到 25% 就會自動送件，讓那個行動失去意義。
  it('engine 不再自己送件——沒有按行動就不會有申請紀錄', async () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    // 研究拉到 30%，遠超過舊門檻的 25%
    await playYear(s, alloc(40, 10, 30, 10, 10), async () => 0);
    expect(s.grants.applied, '沒有按寫計畫書就不該有申請紀錄').toBe(false);
    expect(s.grants.yearsPI).toBe(0);
  });

  it('一年最多一則申請結果，主持年資最多加一', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.alloc = alloc(40, 10, 30, 10, 10);
    s.rng = { chance: () => true, next: () => 0, getState: () => 0, setState: () => {} };
    const grant = ACTIONS.find((a) => a.id === 'act_grant');
    const before = s.grants.yearsPI;
    const out = runAction(s, grant);
    expect(s.grants.applied).toBe(true);
    expect(s.grants.yearsPI - before).toBe(1);
    expect(out).toMatch(/通過|沒過/);
  });

  it('行動的結果就是那一年唯一的結果', async () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.alloc = alloc(40, 10, 30, 10, 10);
    s.rng = { chance: () => true, next: () => 0, getState: () => 0, setState: () => {} };
    runAction(
      s,
      ACTIONS.find((a) => a.id === 'act_grant'),
    );
    const after = s.grants.yearsPI;
    const { logs } = await playYear(s, alloc(40, 10, 30, 10, 10), async () => 0);
    expect(s.grants.yearsPI, '年底不該再加一次').toBe(after);
    expect(logs.filter((l) => /計畫申請結果|創新性不足/.test(l.text))).toHaveLength(0);
  });
});

describe('教職這條路還走得到', () => {
  // 把年底的自動送件拿掉之後，計畫只能靠行動取得。
  // 那是對的語意（你得真的去寫），但要確認它沒有把教授這一關關死。
  it('每年按下寫計畫書的人，主持年資追得上教授的門檻', async () => {
    const intent = { clinical: 30, teaching: 20, research: 30, family: 0, personal: 20 };
    let reached = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const s = createGame(seed);
      while (!s.ending && s.age <= 65) {
        const use = conformAllocation(s, intent);
        s.alloc = use;
        const grant = ACTIONS.find((a) => a.id === 'act_grant');
        if (!grant.cond || grant.cond(s)) runAction(s, grant);
        const { ending } = await playYear(s, use, async () => 0);
        if (ending) break;
      }
      if (s.grants.yearsPI >= 2) reached += 1;
    }
    expect(reached, '按了一輩子計畫書卻湊不到兩年主持，那條路等於關死').toBeGreaterThan(5);
  });
});

describe('settlePhd', () => {
  it('accumulates progress from the research share and graduates at 15', () => {
    const s = createGame(1);
    s.age = 36;
    s.rank = 'vs';
    s.flags.phd = 'studying';
    s.flags.phdProgress = 0;
    // 研究 50% → 有效 44% → 每年 5.28 等效月
    expect(settlePhd(s, alloc(30, 0, 50, 10, 10))).toBeNull(); // 5.28
    expect(settlePhd(s, alloc(30, 0, 50, 10, 10))).toBeNull(); // 10.56
    expect(settlePhd(s, alloc(30, 0, 50, 10, 10))).toMatch(/博士/); // 15.84 ≥ 15 → 畢業
    expect(s.flags.phd).toBe('done');
  });

  it('costs extra health while studying and is a no-op otherwise', () => {
    const studying = createGame(1);
    studying.flags.phd = 'studying';
    studying.flags.phdProgress = 0;
    const before = studying.attrs.health;
    settlePhd(studying, alloc(60, 0, 20, 10, 10));
    expect(studying.attrs.health).toBe(before - 2);
    const idle = createGame(1);
    expect(settlePhd(idle, alloc(60, 0, 20, 10, 10))).toBeNull();
  });
});

describe('malpracticeChance', () => {
  it('low clinical raises risk; high social lowers it more than skill does', () => {
    const clumsy = createGame(1);
    const smooth = createGame(1);
    clumsy.age = smooth.age = 40;
    clumsy.attrs.clinical = 90;
    clumsy.talents.social = 1;
    smooth.attrs.clinical = 40;
    smooth.talents.social = 10;
    // 會說話比會開刀更能保護你不被告
    expect(malpracticeChance(smooth)).toBeLessThan(malpracticeChance(clumsy));
  });

  it('is zero outside surgical practice', () => {
    const s = createGame(1);
    expect(malpracticeChance(s)).toBe(0); // pgy
    s.career = 'aesthetic';
    s.age = 40;
    expect(malpracticeChance(s)).toBe(0);
  });
});

describe('projectCollapse', () => {
  // 新手最常見的死法是把「個人」壓到剩一點點，然後在沒有任何警告的情況下
  // 死在五十歲。這條預告要在他按下確認之前就講清楚。
  const at = (personal) => ({
    clinical: 100 - 10 - 10 - 15 - personal,
    teaching: 10,
    research: 10,
    family: 15,
    personal,
  });

  it('個人壓到很低就預告倒下的年份，而且越低越早', () => {
    const s = createGame(7);
    s.age = 33;
    const zero = projectCollapse(s, at(0));
    const five = projectCollapse(s, at(5));
    expect(zero).toBeGreaterThan(33);
    expect(zero).toBeLessThan(five);
    expect(five).toBeLessThanOrEqual(65);
  });

  it('個人給夠就不會預告倒下', () => {
    const s = createGame(7);
    s.age = 33;
    expect(projectCollapse(s, at(20))).toBeNull();
    expect(projectCollapse(s, at(25))).toBeNull();
  });

  it('配置盤的警告跟預告是同一個數字，不會各說各話', () => {
    const s = createGame(7);
    s.age = 33;
    const alloc = at(5);
    const fallAt = projectCollapse(s, alloc);
    const warned = forecast(s, alloc).warnings.find((w) => w.includes('倒下'));
    expect(warned).toContain(String(fallAt));
  });
});

describe('conformAllocation', () => {
  // 下限提高時，原本 research 排在捐贈者第一順位，會被一路抽到 0 而其他軸不動。
  // 快轉會把壓過的結果寫回 state.alloc，於是研究軸再也回不來——
  // 學術線那一整批事件因此對玩家消失，而畫面上沒有任何提示。
  it('提高下限時按比例跟每一軸拿，不會把單一軸抽乾', () => {
    const s = createGame(1);
    s.age = 33;
    s.family.floor = 25;
    const out = conformAllocation(s, {
      clinical: 30,
      teaching: 15,
      research: 32,
      family: 8,
      personal: 15,
    });
    expect(out.family).toBe(25);
    expect(out.research).toBeGreaterThan(0);
    expect(out.teaching).toBeLessThan(15); // 教學也要出一份
    expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(100);
  });

  // 試玩者在真實 UI 重現的那一條：25 歲 50/0/25/5/20，快轉三年，
  // PGY 升 R1 之後臨床下限從 50 變 60，多出來的 10% 全從 research 扣。
  // 原因是配置盤自己又寫了一份同樣的邏輯——兩份實作，只改到一份。
  it('升 R1 那年多出來的臨床，按比例跟每一軸拿', () => {
    const s = createGame(1);
    s.age = 27;
    const said = { clinical: 50, teaching: 0, research: 25, family: 5, personal: 20 };
    const out = conformAllocation(s, said);
    expect(out.clinical).toBe(60);
    expect(said.research - out.research).toBe(5); // 25/50 的份額
    expect(said.personal - out.personal).toBe(4); // 20/50 的份額
    expect(said.family - out.family).toBe(1);
    expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('每年從玩家的意圖重算，不會一層一層越削越少', () => {
    const s = createGame(1);
    s.age = 33;
    s.family.floor = 20;
    const intent = { clinical: 30, teaching: 15, research: 32, family: 8, personal: 15 };
    const once = conformAllocation(s, intent);
    const twice = conformAllocation(s, once); // 拿結果再壓一次會繼續削
    expect(twice.research).toBeLessThanOrEqual(once.research);
    // 從意圖重算永遠得到同一個答案
    expect(conformAllocation(s, intent)).toEqual(once);
  });
});

describe('annualSlack', () => {
  // projectCollapse 只回答「會不會倒」，而它是一條平均線。
  // 女性單身學術路線的個人 15%：預告說活得到退休，實測 27/40 倒在工作中，
  // 因為那條線每年淨掉 1.7 點，貼著地板走的人被事件的變異推下去。
  const at = (personal) => ({
    clinical: 100 - 15 - 30 - 5 - personal,
    teaching: 15,
    research: 30,
    family: 5,
    personal,
  });

  it('個人給得少就是每年在退，給得夠才轉正', () => {
    const s = createGame(1, 'f');
    expect(annualSlack(s, at(15))).toBeLessThan(0);
    expect(annualSlack(s, at(18))).toBeLessThan(0);
    expect(annualSlack(s, at(20))).toBeGreaterThan(0);
    expect(annualSlack(s, at(25))).toBeGreaterThan(annualSlack(s, at(20)));
  });

  it('沒有算出倒下、但每年在退的配置，仍然會被警告', () => {
    const s = createGame(1, 'f');
    s.age = 33;
    const alloc = conformAllocation(s, at(15));
    expect(projectCollapse(s, alloc), '這個配置的平均線撐得到退休').toBeNull();
    const w = forecast(s, alloc).warnings.find((x) => x.includes('餘裕'));
    expect(w, '撐得過不等於安全，這裡必須出聲').toBeTruthy();
    expect(w).toMatch(/1\.7/); // 講出實際數字，不要只說「危險」
  });

  it('餘裕轉正之後就不再囉嗦', () => {
    const s = createGame(1, 'f');
    s.age = 33;
    const alloc = conformAllocation(s, at(25));
    expect(forecast(s, alloc).warnings.find((x) => x.includes('餘裕'))).toBeUndefined();
  });
});

describe('健康預告的數字不能自相矛盾', () => {
  // 截圖上寫「健康 +4.2」，同一格後面卻是「100 → 98」。兩個數字都對：
  // 休息確實回了 4.2 點，但 healthCap 隨年齡下降，34 歲的上限是 98。
  // 放在一起就是在說謊——玩家看到正號，健康卻掉了。
  const alloc = { clinical: 25, teaching: 20, research: 40, family: 0, personal: 15 };
  const chip = (age, health) => {
    const s = createGame(1, 'f');
    s.age = age;
    s.attrs.health = health;
    return forecast(s, alloc).chips.find((c) => c.label === '健康');
  };

  it('上限咬住的時候顯示的是實際淨變化，而且說出上限', () => {
    const c = chip(33, 100);
    expect(c.value).toMatch(/^−/); // 實際會掉，就要顯示負號
    expect(c.detail).toContain('100 → 98');
    expect(c.detail).toMatch(/上限 98/); // 講出原因，否則玩家會以為是 bug
    expect(c.good).toBe(false);
  });

  it('還沒碰到上限就照實顯示增益，也不多嘴', () => {
    const c = chip(33, 70);
    expect(c.value).toBe('+4.2');
    expect(c.detail).toBe('70 → 74');
    expect(c.detail).not.toMatch(/上限/);
    expect(c.good).toBe(true);
  });

  it('顯示的數字永遠等於 detail 兩端的差', () => {
    for (const [age, health] of [
      [33, 100],
      [33, 70],
      [40, 95],
      [55, 50],
      [60, 40],
    ]) {
      const c = chip(age, health);
      const [from, to] = c.detail
        .match(/(\d+) → (\d+)/)
        .slice(1)
        .map(Number);
      const shown = Number(c.value.replace('−', '-').replace('+', ''));
      expect(Math.abs(shown - (to - from)), `${age} 歲 健康 ${health}`).toBeLessThan(1);
    }
  });
});

describe('點值在玩家分配之前就定下來', () => {
  // 配置盤的年結餘是用點值算的，但原本 playYear 才擲點值——
  // 於是盤上顯示的是去年的值。試玩者在 43 歲的盤看到 0.93，那一年實際是 0.81。
  it('一年只擲一次，開盤看到的就是那一年會用的', async () => {
    const s = createGame(5);
    s.age = 43;
    s.rank = 'vs';
    const a = alloc(40, 10, 10, 20, 20);
    const shown = rollPointValue(s); // ui 在開盤前呼叫
    const chip = forecast(s, a).chips.find((c) => c.label.includes('點值'));
    expect(chip.value).toBe(shown.toFixed(2));
    await playYear(s, a, async () => 0);
    expect(s.pointValue, 'playYear 不該再擲一次').toBe(shown);
  });

  it('跨年才會重新擲', () => {
    const s = createGame(5);
    s.age = 43;
    const first = rollPointValue(s);
    expect(rollPointValue(s), '同一年重複呼叫不變').toBe(first);
    s.age = 44;
    const second = rollPointValue(s);
    expect(s.flags.pointYear).toBe(44);
    expect(typeof second).toBe('number');
  });

  it('直接呼叫 playYear 的路徑仍然會擲', async () => {
    const s = createGame(9);
    s.age = 40;
    s.rank = 'vs';
    expect(s.pointValue).toBeUndefined();
    await playYear(s, alloc(40, 10, 10, 20, 20), async () => 0);
    expect(s.pointValue).toBeGreaterThan(0.7);
  });
});
