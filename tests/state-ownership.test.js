import { readdirSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// 這個 session 有同一個形狀的 bug 出現了六次：一件事實有兩個主人，各寫各的。
//   懷孕（flags.expecting vs expectingChild）、婚禮、離婚、父母病程、
//   配置下限（conformAllocation vs alloc-panel 自己那份）、
//   研究計畫（settleGrant 每年自動送件 vs act_grant 的按鈕）。
// 每一次都是試玩者先在畫面上撞到矛盾，我才回頭找。
//
// 所以改成登記制：跨檔案被寫入的狀態欄位必須列在下面並寫明理由。
// 出現新的就紅燈——那不代表一定有錯，而是「請你先想清楚誰是主人」。
const ALLOWED = {
  // 能力值本來就由行動、事件、年度結算共同推動，那是設計
  'attrs.health': '行動、事件、年度結算都會動它',
  'attrs.clinical': '同上',
  'attrs.self': '同上',
  'attrs.papers': '同上',
  'attrs.money': '同上',
  'stats.livesSaved': '救回來的人由事件記錄',
  // 家庭弧線的兩個檔是同一台狀態機的兩個入口，另有 family-state.test.js 把關
  'family.stage': '弧線與分支是同一台狀態機，見 family-state.test.js',
  'family.floor': '同上',
  'family.neglect': '同上（engine 每年結算，事件調整）',
  'family.marriedAt': '同上',
  'people.spouse.gone': '同上',
  'flags.expectingChild': '同上，female.js 是女性路線的入口',
  // 開始與推進分屬不同層，是交接不是重複
  'flags.phd': '事件決定要不要念，engine 負責推進與畢業',
  'flags.phdProgress': '同上',
  // 兩種不同的起訴來源匯流到同一條審判鏈，判決事件沒有 once，不會卡住
  'flags.onTrial': '醫療爭議調解與醫療糾紛都可能上法院，判決由 core.js 統一收尾',
  'flags.aestheticCurious': '住院醫師與主治階段都可能動念',
  'flags.leftAt': '自己選擇離開與被債務逼出去是兩個入口，同一個離開的那一年',
};

function writersByField() {
  const found = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${name.name}`;
      if (name.isDirectory()) walk(path);
      else if (name.name.endsWith('.js')) {
        for (const line of readFileSync(path, 'utf8').split('\n')) {
          if (line.trimStart().startsWith('//')) continue;
          const re =
            /\b(?:s|state)\.((?:flags|grants|family|people|attrs|stats)\.[A-Za-z_.]+)\s*(?:=(?!=)|\+=|-=)/g;
          let m;
          while ((m = re.exec(line))) (found[m[1]] ||= new Set()).add(name.name);
        }
      }
    }
  };
  walk('src');
  return found;
}

describe('狀態欄位的所有權', () => {
  it('跨檔案被寫入的欄位都登記過', () => {
    const shared = Object.entries(writersByField())
      .filter(([, files]) => files.size > 1)
      .map(([field, files]) => [field, [...files].sort().join('、')]);
    const unregistered = shared.filter(([field]) => !(field in ALLOWED));
    expect(
      unregistered.map(([f, w]) => `${f}（${w}）`),
      '這些欄位有兩個以上的檔案在寫。先確認誰是主人，再登記到 ALLOWED。',
    ).toEqual([]);
  });

  it('登記表沒有過期的項目', () => {
    // 欄位改名或收斂成單一主人之後，登記也要跟著清掉，否則這張表會慢慢失去意義
    const shared = new Set(
      Object.entries(writersByField())
        .filter(([, files]) => files.size > 1)
        .map(([field]) => field),
    );
    const stale = Object.keys(ALLOWED).filter((f) => !shared.has(f));
    expect(stale, '這些已經不是跨檔案寫入了，可以從 ALLOWED 移除').toEqual([]);
  });
});
