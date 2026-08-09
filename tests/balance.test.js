import { describe, it, expect } from 'vitest';
import {
  createGame,
  effective,
  healthCap,
  healthDelta,
  applyGrowth,
  settleMoney,
  forecast,
  nextPromotionGate,
  yearlyExpenses,
} from '../src/engine.js';

const alloc = (c, t, r, f, p) => ({
  clinical: c,
  teaching: t,
  research: r,
  family: f,
  personal: p,
});

describe('effective — 邊際遞減', () => {
  it('轉折點以下是線性的', () => {
    expect(effective('personal', 10)).toBe(10);
    expect(effective('clinical', 45)).toBe(45);
  });

  it('轉折點以上只剩 tail 倍效果', () => {
    // personal: knee 18, tail 0.25 → 100% 只換到 18 + 82*0.25 = 38.5
    expect(effective('personal', 100)).toBeCloseTo(38.5, 5);
    // clinical: knee 45, tail 0.4 → 100% 換到 45 + 55*0.4 = 67
    expect(effective('clinical', 100)).toBeCloseTo(67, 5);
  });

  it('個人軸的遞減最陡——休息有效,但買不到不死之身', () => {
    const personalGain = effective('personal', 100) / effective('personal', 20);
    const clinicalGain = effective('clinical', 100) / effective('clinical', 20);
    expect(personalGain).toBeLessThan(clinicalGain);
  });
});

describe('healthCap — 健康上限隨年齡下降', () => {
  it('32 歲前不封頂', () => {
    expect(healthCap(25)).toBe(100);
    expect(healthCap(32)).toBe(100);
  });

  it('之後每年掉 1 點,退休時只剩約三分之二', () => {
    expect(healthCap(50)).toBe(82);
    expect(healthCap(65)).toBe(67);
  });

  it('個人拉滿也無法把健康堆回 100', () => {
    const s = createGame(1);
    s.age = 60;
    s.attrs.health = 60;
    s.talents.constitution = 10;
    for (let i = 0; i < 20; i++) {
      s.attrs.health = Math.min(
        healthCap(s.age),
        s.attrs.health + healthDelta(s, alloc(0, 0, 0, 0, 100)),
      );
    }
    expect(s.attrs.health).toBeLessThanOrEqual(healthCap(60));
    expect(s.attrs.health).toBeLessThan(75);
  });
});

describe('臨床荒廢會退步', () => {
  it('主治靠 20% 下限混,刀會生疏', () => {
    const s = createGame(1);
    s.age = 40;
    s.attrs.clinical = 80;
    applyGrowth(s, alloc(20, 0, 0, 40, 40));
    expect(s.attrs.clinical).toBeLessThan(80);
  });

  it('臨床 25% 以上就不會退步', () => {
    const s = createGame(1);
    s.age = 40;
    s.attrs.clinical = 80;
    applyGrowth(s, alloc(25, 0, 0, 35, 40));
    expect(s.attrs.clinical).toBeGreaterThanOrEqual(80);
  });
});

describe('settleMoney — 負債會咬人', () => {
  it('負存款滾 8% 利息並累計負債年數', () => {
    const s = createGame(1);
    s.age = 28;
    s.attrs.money = -1000;
    const before = s.attrs.money;
    settleMoney(s);
    const net = 95 - yearlyExpenses(s); // 住院醫師薪水扣支出
    expect(s.attrs.money).toBe(Math.round((before + net) * 1.08));
    expect(s.stats.debtYears).toBe(1);
  });

  it('存款為正時不收利息', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.attrs.money = 1000;
    settleMoney(s);
    expect(s.stats.debtYears).toBe(0);
  });

  it('支出隨年齡與家累增加', () => {
    const young = createGame(1);
    const old = createGame(1);
    old.age = 55;
    old.family.stage = 'married';
    old.family.kids = 2;
    expect(yearlyExpenses(old)).toBeGreaterThan(yearlyExpenses(young) + 150);
  });
});

describe('forecast — 按下確認之前就要看得到代價', () => {
  it('回傳健康變化與年結餘', () => {
    const s = createGame(1);
    const f = forecast(s, alloc(60, 0, 20, 10, 10));
    const labels = f.chips.map((c) => c.label);
    expect(labels).toContain('健康');
    expect(labels).toContain('年結餘');
  });

  it('個人歸零且在扣血時會警告', () => {
    const s = createGame(1);
    s.age = 45;
    const f = forecast(s, alloc(80, 0, 20, 0, 0));
    expect(f.warnings.join()).toMatch(/個人/);
  });

  it('有孩子而家庭低於 25% 會警告', () => {
    const s = createGame(1);
    s.family.kids = 1;
    const f = forecast(s, alloc(60, 0, 20, 10, 10));
    expect(f.warnings.join()).toMatch(/孩子/);
  });

  it('必死的配置會直說', () => {
    const s = createGame(1);
    s.age = 50;
    s.attrs.health = 4;
    s.talents.constitution = 1;
    const f = forecast(s, alloc(80, 0, 20, 0, 0));
    expect(f.warnings.join()).toMatch(/活不過今年/);
  });

  it('主治會顯示升等門檻進度', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.attrs.papers = 120;
    const f = forecast(s, alloc(30, 20, 30, 10, 10));
    const gate = f.chips.find((c) => c.label === '歸類計分');
    expect(gate).toBeTruthy();
    expect(gate.detail).toBe('120 / 300');
  });
});

describe('nextPromotionGate', () => {
  it('只在外科主治階段回傳門檻', () => {
    const s = createGame(1);
    expect(nextPromotionGate(s)).toBeNull(); // pgy
    s.age = 40;
    s.rank = 'vs';
    expect(nextPromotionGate(s).papers).toBe(300);
    s.rank = 'assistant';
    expect(nextPromotionGate(s).papers).toBe(400);
    s.rank = 'professor';
    expect(nextPromotionGate(s)).toBeNull(); // 到頂了
  });
});
