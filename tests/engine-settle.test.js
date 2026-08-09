import { describe, it, expect } from 'vitest';
import {
  createGame,
  applyGrowth,
  settleHealth,
  settleMoney,
  settlePhd,
  settleGrant,
  settlePromotion,
  malpracticeChance,
  projectCollapse,
  forecast,
} from '../src/engine.js';

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

  it('counts missed dinners and surgeries', () => {
    const s = createGame(1);
    s.age = 27; // resident: surgical, 8/month
    applyGrowth(s, alloc(60, 0, 0, 20, 20));
    expect(s.stats.missedDinners).toBe(96); // (100−20)% × 12 個月 × 10 頓
    expect(s.stats.surgeries).toBe(49); // 6.12 等效月 × 8 台
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

describe('settleGrant', () => {
  it('research >= 25% leaves an application record regardless of outcome', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.rng = { chance: () => false, next: () => 0.99 };
    const log = settleGrant(s, alloc(40, 0, 30, 20, 10));
    expect(s.grants.applied).toBe(true);
    expect(s.grants.yearsPI).toBe(0);
    expect(log).toMatch(/創新性不足/); // 被拒的審查意見,一行
  });

  it('a passing roll adds a PI year', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.rng = { chance: () => true, next: () => 0 };
    const log = settleGrant(s, alloc(40, 0, 30, 20, 10));
    expect(s.grants.yearsPI).toBe(1);
    expect(log).toMatch(/計畫/);
  });

  it('is a no-op below 25% research or outside attending surgery', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    expect(settleGrant(s, alloc(50, 20, 20, 5, 5))).toBeNull();
    const pgy = createGame(1);
    expect(settleGrant(pgy, alloc(50, 0, 30, 10, 10))).toBeNull();
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
