import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { createGame, playYear, conformAllocation } from '../src/engine.js';

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
