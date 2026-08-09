# 《外科醫師的一生》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一個零建置的單頁網頁遊戲《外科醫師的一生》:回合制人生選擇器,序章 16-24 歲蒙太奇,本篇 25-65 歲每年一回合(12 個月分配到臨床/教學/研究/家庭/個人五軸),天賦決定成長斜率,多結局皆有代價。

**Architecture:** 純 Vanilla JS ES modules,engine 純邏輯不碰 DOM,事件與結局是資料檔,UI 一層薄薄的 DOM 渲染。Vitest 直接測 engine。瀏覽器開 `index.html` 即玩(需經 HTTP server 供 ES module 載入)。

**Tech Stack:** Vanilla JS (ES2022 modules)、Vitest、ESLint 9 (flat config)、Prettier、husky + lint-staged、GitHub Actions。

## Global Constraints

- 所有玩家可見文案為**繁體中文**;程式識別字為英文。
- Commit message 為英文,遵循 Conventional Commits(feat:/fix:/test:/chore:/docs:)。
- **零建置**:不得引入 bundler/transpiler;瀏覽器直接載入 ES modules。
- 不引入任何 runtime 依賴;devDependencies 僅限:vitest、eslint、@eslint/js、prettier、eslint-config-prettier、husky、lint-staged。
- Node 22(本機 v22.23.1)。
- 屬性數值範圍 0-100(`papers` 與 `money` 例外:papers ≥ 0 無上限,money 可為負)。
- 金額單位:萬元(新台幣)。
- 手機優先響應式;深色主題。
- 每個任務結束時 `npx vitest run` 全綠、`npx eslint .` 無錯誤才可 commit(唯一例外:Task 1 的佔位測試刻意留紅,作為 Task 2 的 TDD 起點)。

## File Structure

```
surgeon-life/
├── index.html            # 入口,載入 src/ui.js
├── style.css             # 深色、手機優先
├── package.json          # scripts + devDeps + lint-staged
├── eslint.config.js
├── .prettierrc.json
├── .gitignore
├── .github/workflows/ci.yml
├── .husky/pre-commit
├── docs/adr/0001-vanilla-js-no-build.md
├── src/
│   ├── rng.js            # 可播種 RNG(mulberry32)
│   ├── talents.js        # 天賦擲骰
│   ├── engine.js         # 回合邏輯:state、配置驗證、成長、健康、薪水、升等、醫糾機率、playYear
│   ├── events.js         # PROLOGUE(序章)與 EVENTS(本篇事件)資料
│   ├── endings.js        # 結局判定 + 人生結算單
│   └── ui.js             # DOM 渲染與流程
└── tests/
    ├── rng.test.js
    ├── talents.test.js
    ├── engine-core.test.js
    ├── engine-settle.test.js
    ├── events-data.test.js
    ├── endings.test.js
    ├── play-year.test.js
    └── smoke.test.js
```

模組相依方向(無循環):`ui.js → engine.js → (events.js, endings.js, rng.js, talents.js)`;`ui.js → events.js`(序章)。

---

### Task 1: 專案腳手架(工具鏈 + CI + ADR)

**Files:**

- Create: `package.json`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `docs/adr/0001-vanilla-js-no-build.md`, `tests/rng.test.js`(先放一個必敗測試佔位,Task 2 會實作)

**Interfaces:**

- Produces: `npm test`(vitest run)、`npx eslint .`、`npx prettier --check .` 三道檢查;pre-commit hook 跑 lint-staged。

- [ ] **Step 1: 建立 package.json**

```json
{
  "name": "surgeon-life",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{css,html,md,json,yml}": ["prettier --write"]
  }
}
```

- [ ] **Step 2: 安裝 devDependencies**

Run: `npm install -D vitest eslint @eslint/js prettier eslint-config-prettier husky lint-staged`
Expected: `node_modules/` 出現,`package.json` 寫入版本。

- [ ] **Step 3: 建立 eslint.config.js**

```js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  prettier,
  {
    files: ['src/ui.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
];
```

- [ ] **Step 4: 建立 .prettierrc.json 與 .gitignore**

`.prettierrc.json`:

```json
{ "singleQuote": true, "printWidth": 100 }
```

`.gitignore`:

```
node_modules/
```

- [ ] **Step 5: 設定 husky pre-commit**

Run: `npx husky init && printf 'npx lint-staged\n' > .husky/pre-commit`
Expected: `.husky/pre-commit` 內容為 `npx lint-staged`。(husky init 會覆寫 prepare script,確認 package.json 的 prepare 仍為 `husky`。)

- [ ] **Step 6: 建立 CI workflow `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prettier --check .
      - run: npx eslint .
      - run: npm test
```

- [ ] **Step 7: 撰寫 ADR 0001 `docs/adr/0001-vanilla-js-no-build.md`**

```markdown
# 0001. 採用零建置 Vanilla JS 架構

## Status

Accepted

## Context

《外科醫師的一生》是輕量單頁文字遊戲,核心複雜度在事件內容而非程式架構。
候選方案:(A) 純 Vanilla JS ES modules 零建置;(B) Vite + TypeScript。

## Decision

採用方案 A。engine 純邏輯與 DOM 分離,以 Vitest 直接對 ES module 做單元測試;
部署為 GitHub Pages 靜態檔案,無 build step。

## Consequences

- 優點:零工具鏈負擔、clone 即玩、部署即複製檔案。
- 缺點:沒有 TypeScript 型別保護,事件資料欄位錯誤要靠資料完整性測試把關。
- 缺點:無 bundler 最佳化(minify/tree-shaking);以本遊戲的體量可接受。
- 約束:所有隨機性必須經由可播種 RNG,否則 engine 不可測。
```

- [ ] **Step 8: 建立佔位測試 `tests/rng.test.js`(Task 2 的第一個失敗測試)**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('same seed produces same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
});
```

- [ ] **Step 9: 驗證工具鏈(測試應紅,lint 應綠)**

Run: `npx vitest run`
Expected: FAIL — `Cannot find module '../src/rng.js'`(證明 vitest 正常運作)
Run: `npx eslint . && npx prettier --check .`
Expected: 無錯誤(prettier 若報格式,先 `npm run format`)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold tooling, CI, ADR 0001"
```

(此 commit 會觸發 pre-commit hook;若 hook 因測試以外的原因失敗,修正後再 commit。測試紅不擋 commit——hook 只跑 lint-staged。)

---

### Task 2: 可播種 RNG(`src/rng.js`)

**Files:**

- Create: `src/rng.js`
- Test: `tests/rng.test.js`(擴充 Task 1 的檔案)

**Interfaces:**

- Produces: `createRng(seed:number) → { next():number(0..1), int(min:number,max:number):number(含兩端), chance(p:number):boolean, pick(arr:T[]):T }`

- [ ] **Step 1: 擴充失敗測試**

在 `tests/rng.test.js` 的 describe 內追加:

```js
it('int(min,max) stays within inclusive bounds', () => {
  const r = createRng(7);
  for (let i = 0; i < 200; i++) {
    const v = r.int(1, 10);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(10);
    expect(Number.isInteger(v)).toBe(true);
  }
});

it('chance(0) is never true, chance(1) is always true', () => {
  const r = createRng(9);
  for (let i = 0; i < 50; i++) {
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  }
});

it('pick returns an element of the array', () => {
  const r = createRng(3);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 20; i++) expect(arr).toContain(r.pick(arr));
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/rng.test.js`
Expected: FAIL(module 不存在)

- [ ] **Step 3: 實作 `src/rng.js`**

```js
// mulberry32:可播種、夠均勻、一行狀態。
export function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/rng.test.js`
Expected: PASS(4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/rng.js tests/rng.test.js
git commit -m "feat: add seedable rng (mulberry32)"
```

---

### Task 3: 天賦擲骰(`src/talents.js`)

**Files:**

- Create: `src/talents.js`
- Test: `tests/talents.test.js`

**Interfaces:**

- Consumes: `createRng` 產生的 rng 物件(只用 `int`)。
- Produces:
  - `rollTalents(rng) → { exam:9, dexterity:1..10, research:1..10, charisma:1..10, social:1..10, constitution:1..10 }`
  - `TALENT_LABELS = { exam:'考試能力', dexterity:'手感', research:'研究天賦', charisma:'表達魅力', social:'社交能力', constitution:'體質' }`

- [ ] **Step 1: 寫失敗測試 `tests/talents.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';
import { rollTalents, TALENT_LABELS } from '../src/talents.js';

describe('rollTalents', () => {
  it('exam is always fixed at 9 — the only guaranteed talent', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(rollTalents(createRng(seed)).exam).toBe(9);
    }
  });

  it('other talents are random within 1..10', () => {
    const keys = ['dexterity', 'research', 'charisma', 'social', 'constitution'];
    const seen = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      const t = rollTalents(createRng(seed));
      for (const k of keys) {
        expect(t[k]).toBeGreaterThanOrEqual(1);
        expect(t[k]).toBeLessThanOrEqual(10);
        seen.add(`${k}:${t[k]}`);
      }
    }
    expect(seen.size).toBeGreaterThan(20); // 確認不是寫死同一組
  });

  it('labels cover every talent key', () => {
    const t = rollTalents(createRng(1));
    for (const k of Object.keys(t)) expect(TALENT_LABELS[k]).toBeTruthy();
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/talents.test.js`
Expected: FAIL(module 不存在)

- [ ] **Step 3: 實作 `src/talents.js`**

```js
export const TALENT_LABELS = {
  exam: '考試能力',
  dexterity: '手感',
  research: '研究天賦',
  charisma: '表達魅力',
  social: '社交能力',
  constitution: '體質',
};

// 考試能力固定 9:你就是那個很會考試的孩子,不然進不了醫學系。
export function rollTalents(rng) {
  return {
    exam: 9,
    dexterity: rng.int(1, 10),
    research: rng.int(1, 10),
    charisma: rng.int(1, 10),
    social: rng.int(1, 10),
    constitution: rng.int(1, 10),
  };
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/talents.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/talents.js tests/talents.test.js
git commit -m "feat: talent roll with fixed exam talent"
```

---

### Task 4: Engine 核心 — state、職涯階段、配置驗證(`src/engine.js` 第一部分)

**Files:**

- Create: `src/engine.js`
- Test: `tests/engine-core.test.js`

**Interfaces:**

- Consumes: `createRng`(Task 2)、`rollTalents`(Task 3)。
- Produces(後續任務都依賴這些簽名):
  - `ALLOC_KEYS = ['clinical','teaching','research','family','personal']`
  - `AXIS_LABELS = { clinical:'臨床', teaching:'教學', research:'研究', family:'家庭', personal:'個人' }`
  - `createGame(seed:number) → state`(state 形狀見下)
  - `getStage(state) → { key,label,salary,minClinical,clinicalMult,teachingMult,surgical,surgeriesPerMonth }`
  - `validateAllocation(state, alloc) → alloc`(合法回傳正規化複本;不合法 throw `Error`,訊息為繁中)
  - `clamp(x:number) → 0..100`
  - `applyEffects(state, effects:Object)`、`applyStats(state, stats:Object)`

state 形狀:

```js
{
  age: 25,
  career: 'surgery',        // 'surgery' | 'aesthetic' | 'exited'
  rank: 'none',             // 'none' | 'vs' | 'assistant' | 'associate' | 'professor'
  talents: {...rollTalents},
  attrs: { clinical: 5, teaching: 0, papers: 0, self: 50, health: 88, familyBond: 50, money: 10 },
  family: { stage: 'single', kids: 0 },   // stage: 'single'|'dating'|'steady'|'married'
  grants: { applied: false, yearsPI: 0 }, // 部級計畫:申請紀錄 / 通過並主持年數
  flags: {},
  used: [],                 // once 事件 id
  stats: { surgeries: 0, livesSaved: 0, lawsuits: 0, missedDinners: 0 },
  alloc: null,
  ending: null,
  rng: createRng(seed),
}
```

- [ ] **Step 1: 寫失敗測試 `tests/engine-core.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  createGame,
  getStage,
  validateAllocation,
  applyEffects,
  applyStats,
  ALLOC_KEYS,
} from '../src/engine.js';

describe('createGame', () => {
  it('starts at age 25 with a license and rolled talents', () => {
    const s = createGame(1);
    expect(s.age).toBe(25);
    expect(s.career).toBe('surgery');
    expect(s.talents.exam).toBe(9);
    expect(s.attrs.health).toBe(88);
    expect(s.family.stage).toBe('single');
  });
});

describe('getStage', () => {
  it('maps age to career stage', () => {
    const s = createGame(1);
    expect(getStage(s).key).toBe('pgy');
    s.age = 27;
    expect(getStage(s).key).toBe('resident');
    s.age = 32;
    expect(getStage(s).key).toBe('attending');
  });

  it('aesthetic career overrides age mapping', () => {
    const s = createGame(1);
    s.age = 40;
    s.career = 'aesthetic';
    expect(getStage(s).key).toBe('aesthetic');
  });
});

describe('validateAllocation', () => {
  it('accepts a valid 12-month allocation', () => {
    const s = createGame(1); // pgy, minClinical 6
    const alloc = { clinical: 6, teaching: 0, research: 2, family: 2, personal: 2 };
    expect(validateAllocation(s, alloc)).toEqual(alloc);
  });

  it('rejects sums other than 12', () => {
    const s = createGame(1);
    expect(() =>
      validateAllocation(s, { clinical: 6, teaching: 0, research: 0, family: 0, personal: 0 }),
    ).toThrow(/12/);
  });

  it('rejects clinical below the stage minimum — you do not get a choice', () => {
    const s = createGame(1); // pgy minClinical 6
    expect(() =>
      validateAllocation(s, { clinical: 5, teaching: 1, research: 2, family: 2, personal: 2 }),
    ).toThrow(/臨床/);
  });

  it('rejects negatives and non-integers', () => {
    const s = createGame(1);
    expect(() =>
      validateAllocation(s, { clinical: 13, teaching: -1, research: 0, family: 0, personal: 0 }),
    ).toThrow();
    expect(() =>
      validateAllocation(s, { clinical: 6.5, teaching: 0.5, research: 2, family: 1, personal: 2 }),
    ).toThrow();
  });

  it('exposes ALLOC_KEYS in stable order', () => {
    expect(ALLOC_KEYS).toEqual(['clinical', 'teaching', 'research', 'family', 'personal']);
  });
});

describe('applyEffects / applyStats', () => {
  it('clamps attrs to 0..100 but money and papers are unclamped/floored at 0', () => {
    const s = createGame(1);
    applyEffects(s, { self: 999, health: -999, money: -500, papers: 3 });
    expect(s.attrs.self).toBe(100);
    expect(s.attrs.health).toBe(0);
    expect(s.attrs.money).toBe(-490);
    expect(s.attrs.papers).toBe(3);
  });

  it('accumulates stats counters', () => {
    const s = createGame(1);
    applyStats(s, { surgeries: 2, livesSaved: 1 });
    applyStats(s, { surgeries: 1 });
    expect(s.stats.surgeries).toBe(3);
    expect(s.stats.livesSaved).toBe(1);
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/engine-core.test.js`
Expected: FAIL(module 不存在)

- [ ] **Step 3: 實作 `src/engine.js`(核心部分)**

```js
import { createRng } from './rng.js';
import { rollTalents } from './talents.js';

export const ALLOC_KEYS = ['clinical', 'teaching', 'research', 'family', 'personal'];

export const AXIS_LABELS = {
  clinical: '臨床',
  teaching: '教學',
  research: '研究',
  family: '家庭',
  personal: '個人',
};

const STAGES = {
  pgy: {
    key: 'pgy',
    label: 'PGY',
    salary: 75,
    minClinical: 6,
    clinicalMult: 0.8,
    teachingMult: 0.4,
    surgical: false,
    surgeriesPerMonth: 2,
  },
  resident: {
    key: 'resident',
    label: '外科住院醫師',
    salary: 95,
    minClinical: 7,
    clinicalMult: 1.0,
    teachingMult: 1.0,
    surgical: true,
    surgeriesPerMonth: 8,
  },
  attending: {
    key: 'attending',
    label: '主治醫師',
    salary: 220,
    minClinical: 2,
    clinicalMult: 0.7,
    teachingMult: 1.0,
    surgical: true,
    surgeriesPerMonth: 10,
  },
  aesthetic: {
    key: 'aesthetic',
    label: '醫美診所',
    salary: 0, // 由社交能力決定,見 settleMoney
    minClinical: 0,
    clinicalMult: 0,
    teachingMult: 0,
    surgical: false,
    surgeriesPerMonth: 0,
  },
};

export function createGame(seed) {
  const rng = createRng(seed);
  return {
    age: 25,
    career: 'surgery',
    rank: 'none',
    talents: rollTalents(rng),
    attrs: { clinical: 5, teaching: 0, papers: 0, self: 50, health: 88, familyBond: 50, money: 10 },
    family: { stage: 'single', kids: 0 },
    grants: { applied: false, yearsPI: 0 },
    flags: {},
    used: [],
    stats: { surgeries: 0, livesSaved: 0, lawsuits: 0, missedDinners: 0 },
    alloc: null,
    ending: null,
    rng,
  };
}

export function getStage(state) {
  if (state.career === 'aesthetic') return STAGES.aesthetic;
  if (state.age <= 26) return STAGES.pgy;
  if (state.age <= 31) return STAGES.resident;
  return STAGES.attending;
}

export function clamp(x) {
  return Math.max(0, Math.min(100, x));
}

export function validateAllocation(state, alloc) {
  const stage = getStage(state);
  const out = {};
  for (const k of ALLOC_KEYS) {
    const v = alloc[k];
    if (!Number.isInteger(v) || v < 0)
      throw new Error(`「${AXIS_LABELS[k]}」必須是 0 以上的整數月數`);
    out[k] = v;
  }
  const sum = ALLOC_KEYS.reduce((s, k) => s + out[k], 0);
  if (sum !== 12) throw new Error(`一年只有 12 個月,你分配了 ${sum} 個月`);
  if (out.clinical < stage.minClinical)
    throw new Error(`${stage.label}的臨床月數不得低於 ${stage.minClinical}——這不是你能選的`);
  return out;
}

export function applyEffects(state, effects) {
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'money') state.attrs.money += v;
    else if (k === 'papers') state.attrs.papers = Math.max(0, state.attrs.papers + v);
    else state.attrs[k] = clamp(state.attrs[k] + v);
  }
}

export function applyStats(state, stats) {
  for (const [k, v] of Object.entries(stats)) {
    state.stats[k] = (state.stats[k] || 0) + v;
  }
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/engine-core.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js tests/engine-core.test.js
git commit -m "feat: engine core state, stages, allocation validation"
```

---

### Task 5: Engine 結算 — 成長、健康、薪水、升等、醫糾機率(`src/engine.js` 第二部分)

**Files:**

- Modify: `src/engine.js`(追加函式)
- Test: `tests/engine-settle.test.js`

**Interfaces:**

- Consumes: Task 4 的 state 與 `getStage`/`clamp`。
- Produces:
  - `applyGrowth(state, alloc)` — 時間 × 天賦斜率 → 能力成長,累加 stats 計數
  - `settleHealth(state, alloc) → boolean`(true = 死亡)
  - `settleMoney(state)` — 薪資入帳(職級決定,醫美看社交)
  - `settlePhd(state, alloc) → string|null` — 博士班進度結算,畢業時回傳繁中 log
  - `settleGrant(state, alloc) → string|null` — 部級研究計畫申請/通過結算,有事發生時回傳繁中 log
  - `settlePromotion(state) → string|null` — 升等判定,回傳繁中 log 或 null
  - `malpracticeChance(state) → number`(0..0.45)

規則(數字為最終定案,直接照抄):

- 成長:`clinical += alloc.clinical * (0.4 + dexterity*0.16) * stage.clinicalMult`;醫美時 clinical 每年再 -3。`teaching += alloc.teaching * (0.5 + charisma*0.15) * stage.teachingMult`。`papers += alloc.research * (2 + research*1.2) * (flags.phd==='done' ? 1.5 : 1)`(保留小數)——`papers` 的語意是**歸類計分點數**(陽明交大醫學院細則:每篇=期刊等級×性質×作者排名,遊戲抽象化為時間×天賦累積;研究天賦 5 的人投 4 個月/年 ≈ 32 點/年,離 300 點門檻約十年——這個慢,就是諷刺本體)。博士 ×1.5 = 論文生產線。
- 家庭:`familyBond += alloc.family*3`;若 `kids>0 && alloc.family<3` 再 -12;若 `alloc.family===0` 再 -8。
- 自我:`self += alloc.personal*2.5`;若 `alloc.personal===0` 再 -3。
- 計數:`missedDinners += (12-alloc.family)*10`;surgical 階段 `surgeries += alloc.clinical*surgeriesPerMonth`、`livesSaved += round(該值*0.1)`。
- 健康:`ageBase = 1 + (age>=40?1.5:0) + (age>=55?1.5:0)`;`factor = 1.5 - constitution*0.08`;`overwork = max(0, clinical+research-8)*1.2`;`recovery = personal*1.8`;`health = clamp(health - (ageBase+overwork)*factor + recovery)`;health===0 → 死亡。
- 薪水:surgery 依 stage.salary;rank 加給 assistant+10 / associate+20 / professor+30(諷刺:教授加給一個月一萬)。醫美:`60 + social*45`。支出:`40 + kids*40 + (married?20:0)`。`money += salary - expenses`。
- 博士班:`flags.phd` 為 `undefined | 'studying' | 'declined' | 'done'`(由事件觸發就讀或婉拒,見 Task 6)。`settlePhd(state, alloc)`:非 `'studying'` 回傳 null;就讀中 `flags.phdProgress += alloc.research`,每年額外 `health -2`(在職進修);`phdProgress >= 15` → `flags.phd='done'`,回傳畢業 log。**博士不是升等的必要條件**,是加速器(依細則真實條文「以學位送審者,不在此限」):(1) 助理教授可以學位送審,免歸類計分門檻;(2) 研究產出 ×1.5(見成長公式)。
- 研究計畫:`settleGrant(state, alloc)`——非 attending 或非 surgery 回傳 null。`alloc.research >= 3` 時:`grants.applied = true`(申請紀錄),並擲 `rng.chance(min(0.5, 0.1 + research*0.03 + (phd==='done'?0.1:0)))`:通過 → `grants.yearsPI += 1`,回傳通過 log;未通過 → 回傳被拒 log(審查意見:「創新性不足。」)。`alloc.research < 3` 回傳 null。
- 升等(僅 surgery 且 attending;數字取自陽明交大醫學院細則):rank none→vs(第一年自動)。**教學及格線 70(教學服務審查,未達不得送件)適用所有升等**:
  - vs→assistant:`teaching >= 70` 且(`papers >= 300` **或** `flags.phd === 'done'`(以學位送審,不受計分門檻限制))
  - assistant→associate:`teaching >= 70 && papers >= 400 && grants.applied`(5 年內部級計畫申請紀錄,未具備者不收件)
  - associate→professor:`teaching >= 70 && papers >= 500 && grants.yearsPI >= 2`(通過計畫且主持二年以上,未具備者不收件)
  - **手術技能不在任何條件裡。**升等 log 可帶外審敘事(外審五人、80 分及格、通過不得低於四人)。
- 醫糾:非 surgery 或非 resident/attending → 0。`base = attending?0.08:0.04`;`+ max(0,65-clinical)*0.004`;`- social*0.02`;`flags.defensive` 再 -0.03;夾在 0.005..0.45。

- [ ] **Step 1: 寫失敗測試 `tests/engine-settle.test.js`**

```js
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
    applyGrowth(slow, alloc(8, 0, 0, 2, 2));
    applyGrowth(fast, alloc(8, 0, 0, 2, 2));
    // 1: 8*(0.4+0.16)=4.48 ; 10: 8*(0.4+1.6)=16
    expect(fast.attrs.clinical - 5).toBeCloseTo(16, 1);
    expect(slow.attrs.clinical - 5).toBeCloseTo(4.48, 1);
  });

  it('a PhD multiplies paper output by 1.5 — the degree is a production line', () => {
    const phd = createGame(1);
    const none = createGame(1);
    phd.flags.phd = 'done';
    applyGrowth(phd, alloc(6, 0, 4, 1, 1));
    applyGrowth(none, alloc(6, 0, 4, 1, 1));
    expect(phd.attrs.papers).toBeCloseTo(none.attrs.papers * 1.5, 5);
  });

  it('kids raise the family time tax', () => {
    const s = createGame(1);
    s.family.kids = 1;
    const before = s.attrs.familyBond;
    applyGrowth(s, alloc(6, 0, 2, 2, 2)); // family 2 < 3 → +6 -12
    expect(s.attrs.familyBond).toBeCloseTo(before - 6, 5);
  });

  it('zero personal months erodes self', () => {
    const s = createGame(1);
    applyGrowth(s, alloc(6, 0, 2, 4, 0));
    expect(s.attrs.self).toBeCloseTo(47, 5);
  });

  it('counts missed dinners and surgeries', () => {
    const s = createGame(1);
    s.age = 27; // resident: surgical, 8/month
    applyGrowth(s, alloc(8, 0, 0, 2, 2));
    expect(s.stats.missedDinners).toBe(100);
    expect(s.stats.surgeries).toBe(64);
  });
});

describe('settleHealth', () => {
  it('overwork accelerates decay; personal time recovers', () => {
    const worked = createGame(1);
    const rested = createGame(1);
    worked.talents.constitution = rested.talents.constitution = 5;
    settleHealth(worked, alloc(10, 0, 2, 0, 0)); // overwork (12-8)*1.2=4.8
    settleHealth(rested, alloc(7, 0, 1, 0, 4)); // no overwork, recovery 7.2
    expect(worked.attrs.health).toBeLessThan(rested.attrs.health);
  });

  it('returns true on death (health hits 0)', () => {
    const s = createGame(1);
    s.attrs.health = 3;
    s.talents.constitution = 1;
    expect(settleHealth(s, alloc(10, 0, 2, 0, 0))).toBe(true);
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
  it('research >= 3 months leaves an application record regardless of outcome', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.rng = { chance: () => false, next: () => 0.99 };
    const log = settleGrant(s, alloc(4, 0, 3, 3, 2));
    expect(s.grants.applied).toBe(true);
    expect(s.grants.yearsPI).toBe(0);
    expect(log).toMatch(/創新性不足/); // 被拒的審查意見,一行
  });

  it('a passing roll adds a PI year', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    s.rng = { chance: () => true, next: () => 0 };
    const log = settleGrant(s, alloc(4, 0, 3, 3, 2));
    expect(s.grants.yearsPI).toBe(1);
    expect(log).toMatch(/計畫/);
  });

  it('is a no-op below 3 research months or outside attending surgery', () => {
    const s = createGame(1);
    s.age = 40;
    s.rank = 'vs';
    expect(settleGrant(s, alloc(6, 2, 2, 1, 1))).toBeNull();
    const pgy = createGame(1);
    expect(settleGrant(pgy, alloc(6, 0, 3, 2, 1))).toBeNull();
  });
});

describe('settlePhd', () => {
  it('accumulates progress from research months and graduates at 15', () => {
    const s = createGame(1);
    s.age = 36;
    s.rank = 'vs';
    s.flags.phd = 'studying';
    s.flags.phdProgress = 0;
    expect(settlePhd(s, alloc(4, 0, 6, 1, 1))).toBeNull(); // 6
    expect(settlePhd(s, alloc(4, 0, 6, 1, 1))).toBeNull(); // 12
    expect(settlePhd(s, alloc(4, 0, 6, 1, 1))).toMatch(/博士/); // 18 ≥ 15 → 畢業
    expect(s.flags.phd).toBe('done');
  });

  it('costs extra health while studying and is a no-op otherwise', () => {
    const studying = createGame(1);
    studying.flags.phd = 'studying';
    studying.flags.phdProgress = 0;
    const before = studying.attrs.health;
    settlePhd(studying, alloc(6, 0, 2, 2, 2));
    expect(studying.attrs.health).toBe(before - 2);
    const idle = createGame(1);
    expect(settlePhd(idle, alloc(6, 0, 2, 2, 2))).toBeNull();
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
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/engine-settle.test.js`
Expected: FAIL(函式未定義)

- [ ] **Step 3: 在 `src/engine.js` 追加實作**

```js
export function applyGrowth(state, alloc) {
  const stage = getStage(state);
  const t = state.talents;
  const a = state.attrs;
  a.clinical = clamp(a.clinical + alloc.clinical * (0.4 + t.dexterity * 0.16) * stage.clinicalMult);
  if (state.career === 'aesthetic') a.clinical = clamp(a.clinical - 3);
  a.teaching = clamp(a.teaching + alloc.teaching * (0.5 + t.charisma * 0.15) * stage.teachingMult);
  a.papers += alloc.research * (2 + t.research * 1.2) * (state.flags.phd === 'done' ? 1.5 : 1);
  a.familyBond = clamp(
    a.familyBond +
      alloc.family * 3 -
      (state.family.kids > 0 && alloc.family < 3 ? 12 : 0) -
      (alloc.family === 0 ? 8 : 0),
  );
  a.self = clamp(a.self + alloc.personal * 2.5 - (alloc.personal === 0 ? 3 : 0));
  state.stats.missedDinners += (12 - alloc.family) * 10;
  if (stage.surgical) {
    const ops = alloc.clinical * stage.surgeriesPerMonth;
    state.stats.surgeries += ops;
    state.stats.livesSaved += Math.round(ops * 0.1);
  }
}

export function settleHealth(state, alloc) {
  const ageBase = 1 + (state.age >= 40 ? 1.5 : 0) + (state.age >= 55 ? 1.5 : 0);
  const factor = 1.5 - state.talents.constitution * 0.08;
  const overwork = Math.max(0, alloc.clinical + alloc.research - 8) * 1.2;
  const recovery = alloc.personal * 1.8;
  state.attrs.health = clamp(state.attrs.health - (ageBase + overwork) * factor + recovery);
  return state.attrs.health <= 0;
}

const RANK_BONUS = { none: 0, vs: 0, assistant: 10, associate: 20, professor: 30 };

export function settleMoney(state) {
  const stage = getStage(state);
  const salary =
    stage.key === 'aesthetic'
      ? 60 + state.talents.social * 45
      : stage.salary + RANK_BONUS[state.rank];
  const expenses = 40 + state.family.kids * 40 + (state.family.stage === 'married' ? 20 : 0);
  state.attrs.money += salary - expenses;
}

export function settlePhd(state, alloc) {
  if (state.flags.phd !== 'studying') return null;
  state.attrs.health = clamp(state.attrs.health - 2); // 白天開刀,晚上上課
  state.flags.phdProgress += alloc.research;
  if (state.flags.phdProgress < 15) return null;
  state.flags.phd = 'done';
  return '你通過口試,拿到博士學位。口試委員最後一個問題是:「畢業後,你打算什麼時候做研究?」你看著自己下週的刀表,笑而不答。';
}

export function settleGrant(state, alloc) {
  if (state.career !== 'surgery' || getStage(state).key !== 'attending') return null;
  if (alloc.research < 3) return null;
  state.grants.applied = true; // 申請紀錄本身就是副教授送審的門票
  const p = Math.min(
    0.5,
    0.1 + state.talents.research * 0.03 + (state.flags.phd === 'done' ? 0.1 : 0),
  );
  if (state.rng.chance(p)) {
    state.grants.yearsPI += 1;
    return `你的部級研究計畫通過了,今年以主持人身分執行(累計 ${state.grants.yearsPI} 年)。經費不多,但升等表上那一格,終於能填了。`;
  }
  return '計畫申請結果:未通過。你寫了兩週的計畫書,審查意見一行:「創新性不足。」';
}

export function settlePromotion(state) {
  if (state.career !== 'surgery' || getStage(state).key !== 'attending') return null;
  const a = state.attrs;
  const phd = state.flags.phd === 'done';
  if (state.rank === 'none') {
    state.rank = 'vs';
    return '你升上主治醫師。恭喜——從今天起,你的薪水和健保點值綁在一起了。';
  }
  if (a.teaching < 70) return null; // 教學服務審查 70 分及格,未達不得送件
  if (state.rank === 'vs' && (a.papers >= 300 || phd)) {
    state.rank = 'assistant';
    return phd
      ? '你以博士學位送審,升等通過:助理教授。學位論文充當代表著作,歸類計分的門檻與你無關——細則寫得明白:「以學位送審者,不在此限。」'
      : '外審五人回來四份「優良」,升等通過:助理教授。三百點歸類計分,是你十年的夜晚。月薪增加一萬元——你的手術技能,不在任何一張評分表上。';
  }
  if (state.rank === 'assistant' && a.papers >= 400 && state.grants.applied) {
    state.rank = 'associate';
    return '升等通過:副教授。院長在頒聘書時說「繼續努力」,你想不起他上次進開刀房是哪一年。';
  }
  if (state.rank === 'associate' && a.papers >= 500 && state.grants.yearsPI >= 2) {
    state.rank = 'professor';
    return '升等通過:教授。五百點計分、兩年計畫主持、外審五人全數通過——這是這個體系能給你的最高肯定,與你救過多少人無關。';
  }
  return null;
}

export function malpracticeChance(state) {
  const stage = getStage(state);
  if (state.career !== 'surgery' || (stage.key !== 'resident' && stage.key !== 'attending'))
    return 0;
  let p = stage.key === 'attending' ? 0.08 : 0.04;
  p += Math.max(0, 65 - state.attrs.clinical) * 0.004;
  p -= state.talents.social * 0.02;
  if (state.flags.defensive) p -= 0.03;
  return Math.min(0.45, Math.max(0.005, p));
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/engine-settle.test.js tests/engine-core.test.js`
Expected: PASS(兩檔全綠,確認未破壞 Task 4)

- [ ] **Step 5: Commit**

```bash
git add src/engine.js tests/engine-settle.test.js
git commit -m "feat: growth, health, salary, promotion, malpractice formulas"
```

---

### Task 6: 事件資料(`src/events.js`)+ 資料完整性測試

**Files:**

- Create: `src/events.js`
- Test: `tests/events-data.test.js`

**Interfaces:**

- Consumes: state 形狀(Task 4)。事件的 `cond`/`text`/`set` 都收 `state`;規劃結果經由 `state.alloc` 取得。
- Produces:
  - `PROLOGUE: Array<{age:number, text:string, exam?:true, choices?:string[], outcome?:string}>`
  - `EVENTS: Array<Event>`,Event 形狀:

```js
{
  id: string,                    // 唯一
  stages: string[],              // 'pgy'|'resident'|'attending'|'aesthetic' 的子集
  once?: true,
  weight?: number,               // 預設 1
  special?: true,                // 不進隨機池(由 engine 依機率注入,如醫糾)
  forced?: (state) => boolean,   // 為 true 時本年必定觸發
  cond?: (state) => boolean,
  text: string | (state) => string,
  effects?: Object, stats?: Object, set?: (state) => void, log?: string,   // 無選項的自動事件
  choices?: [{ label, cond?, effects?, stats?, set?, log }],
}
```

- [ ] **Step 1: 寫失敗測試 `tests/events-data.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { PROLOGUE, EVENTS } from '../src/events.js';

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
      expect(['string', 'function'], e.id).toContain(typeof e.text);
      if (e.choices) {
        expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
        for (const c of e.choices) {
          expect(typeof c.label, e.id).toBe('string');
          expect(typeof c.log, e.id).toBe('string');
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

  it('every stage has a reasonable pool of events', () => {
    for (const s of VALID_STAGES) {
      const n = EVENTS.filter((e) => e.stages.includes(s) && !e.special).length;
      expect(n, `stage ${s}`).toBeGreaterThanOrEqual(4);
    }
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/events-data.test.js`
Expected: FAIL(module 不存在)

- [ ] **Step 3: 實作 `src/events.js`(完整內容如下,直接照抄)**

```js
// 事件資料。cond/text/set 都收 state;規劃結果在 state.alloc。
// effects 可用鍵:clinical/teaching/papers/self/health/familyBond/money
// stats 可用鍵:surgeries/livesSaved/lawsuits/missedDinners

export const PROLOGUE = [
  {
    age: 16,
    text: '16 歲。模擬考成績單發下來,你又是全校前三。導師在成績單上寫:「醫學系沒問題。」',
  },
  {
    age: 17,
    text: '17 歲。過年圍爐,親戚輪流拍你的肩:「當醫生好啊,穩定,又賺錢。」你扒著飯,沒有說話。',
  },
  {
    age: 18,
    exam: true,
    text: '18 歲,大學聯考放榜。你考了全國前 1%,分數可以填任何科系。你為什麼填醫學系?',
    choices: ['因為我想救人', '因為家人的期待', '分數到了,不填可惜'],
    outcome: '——無論你剛才選了什麼,你都填了醫學系。這個遊戲沒有給你選擇。當年也是。',
  },
  { age: 19, text: '19 歲。白袍典禮,你宣讀醫師誓詞。台下的家長舉著手機,閃光燈此起彼落。' },
  { age: 21, text: '21 歲。大體解剖第一課,你們向大體老師鞠躬。從那天起,背書到凌晨三點成了日常。' },
  {
    age: 23,
    text: '23 歲。醫院見習。你第一次進開刀房,看主治醫師把腫瘤從人體裡取出來。你在口罩後面,起了雞皮疙瘩。',
  },
  { age: 24, text: '24 歲。國考通過,你拿到醫師執照。從這一刻起——你的人生,才真正開始要你自己選。' },
];

export const EVENTS = [
  // ───────────── PGY(25-26)─────────────
  {
    id: 'pgy_scut',
    stages: ['pgy'],
    weight: 3,
    text: '接不完的 NG、導尿、抽血、寫不完的病歷。學長說:「這就是 PGY,習慣就好。」',
    effects: { health: -3 },
    log: '你開始習慣了。這件事本身有點可怕。',
  },
  {
    id: 'pgy_first_death',
    stages: ['pgy'],
    once: true,
    weight: 2,
    text: '你第一次參與急救。壓胸時肋骨斷裂的觸感,和主治宣告死亡時牆上時鐘的位置,你都會記得很久。',
    effects: { self: -2, health: -2 },
    log: '那晚你在值班室坐了很久,沒有開燈。',
  },
  {
    id: 'pgy_mentor',
    stages: ['pgy'],
    once: true,
    cond: (s) => s.talents.dexterity >= 6,
    text: '值班夜,總醫師帶你開了人生第一台闌尾。收尾時他看著你的手:「手感不錯,考慮外科?」',
    effects: { self: 5 },
    log: '你走出開刀房,天還沒亮,但你睡意全無。',
  },
  {
    id: 'pgy_salary_talk',
    stages: ['pgy'],
    weight: 2,
    text: '大學同學會。念資工的室友剛拿到新加坡的 offer,年薪是你的三倍。他問你:「你們醫師很賺吧?」',
    choices: [
      {
        label: '笑著說還好',
        effects: { self: -2 },
        log: '你笑得很得體。你在醫院練得最好的,常常是這個。',
      },
      {
        label: '老實講薪水',
        effects: { self: 2 },
        log: '整桌安靜了三秒。然後有人說:「可是你們是在救人啊。」你點點頭。這句話你之後會聽到很多次,通常在別人不想付錢的時候。',
      },
    ],
  },
  {
    id: 'pgy_specialty',
    stages: ['pgy'],
    once: true,
    forced: (s) => s.age === 26,
    text: 'PGY 結束,選科的時刻到了。外科的學長說:「你的手很穩,來吧,總得有人開刀。」同梯的說:「別傻了,現在誰走外科?」',
    choices: [
      {
        label: '選外科。總得有人開刀。',
        effects: { self: 5 },
        log: '你簽下外科住院醫師志願書。歡迎來到戰場。',
      },
      {
        label: '選別科。那裡有你想要的生活。',
        set: (s) => {
          s.flags.exitNow = true;
          s.flags.exitCause = 'exit-specialty';
        },
        log: '你選擇了另一條路。學長拍拍你的肩,沒有多說什麼——你們都明白,每條路有每條路的代價。',
      },
    ],
  },

  // ───────────── 住院醫師(27-31)─────────────
  {
    id: 'r_aortic',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.alloc.clinical >= 7,
    text: '凌晨兩點,你已連續工作 28 小時。急診來電:主動脈剝離,需要人手。',
    choices: [
      {
        label: '衝上去。',
        effects: { health: -8, self: 4 },
        stats: { surgeries: 1, livesSaved: 1 },
        log: '八小時後,病人活著推出開刀房。你在更衣室的長椅上睡著,夢裡的手還在打結。',
      },
      {
        label: '你真的站不起來了。',
        effects: { self: -6, health: 3 },
        log: '學長替你上了。你躺在值班室盯著天花板,一直到天亮。',
      },
    ],
  },
  {
    id: 'r_mm_conf',
    stages: ['resident'],
    weight: 2,
    text: '併發症與死亡討論會。投影片打出你的 case,主任的雷射筆停在你的名字上。',
    choices: [
      {
        label: '低頭把每一條檢討都記下來。',
        effects: { clinical: 3, self: -3 },
        log: '會後你把筆記重看了三遍。下一台一樣的刀,你避開了同一個陷阱。',
      },
      {
        label: '心裡想:這是運氣問題。',
        effects: { self: 1 },
        log: '你安慰自己外科本來就有風險。這句話,你說得越來越順口了。',
      },
    ],
  },
  {
    id: 'r_peer_quit',
    stages: ['resident'],
    once: true,
    weight: 2,
    text: '同梯的住院醫師遞了辭呈,下個月去醫美診所報到。群組裡他傳來新診所的照片:落地窗、掛畫、下午六點的日落。',
    effects: { self: -3 },
    log: '你看著手機,開刀房的無影燈在你頭頂嗡嗡作響。',
  },
  {
    id: 'r_paper_boss',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.alloc.research === 0,
    text: '主任把你叫進辦公室,桌上放著你的年度考核:「你的 paper 呢?沒有論文,你以後拿什麼升等?」',
    choices: [
      {
        label: '從睡眠裡擠時間寫。',
        effects: { papers: 15, health: -5 },
        log: '凌晨三點的醫局,只剩你的螢幕亮著。三個月後,一篇 case series 刊出——歸類計分 15 點。你離三百點,又近了二十分之一。',
      },
      {
        label: '說你想先把刀練好。',
        effects: { self: 3 },
        log: '主任搖頭:「開刀不會讓你升等。」最可怕的是——他說的是實話。',
      },
    ],
  },
  {
    id: 'r_first_solo',
    stages: ['resident'],
    once: true,
    cond: (s) => s.attrs.clinical >= 40,
    text: '你的第一台主刀。結束後,你在手術紀錄的 surgeon 欄位,第一次簽下自己的名字。',
    effects: { self: 8 },
    stats: { surgeries: 1 },
    log: '你把手術帽收進口袋。這一天你等了九年。',
  },
  {
    id: 'r_needle',
    stages: ['resident'],
    weight: 1,
    text: '急刀中你被縫針扎到。沖洗、抽血、預防性投藥、寫異常事件報告——然後刷手,回去繼續開。',
    effects: { health: -3 },
    log: '報告表上有一欄「後續追蹤」。你自己就是那個追蹤者。',
  },

  // ───────────── 主治(32+)─────────────
  {
    id: 'a_point_value',
    stages: ['attending'],
    weight: 3,
    text: '健保公告本季點值 0.78。你算了一下:昨天那台八小時的胃癌根除術,實拿的錢買不起一支新手機。',
    effects: { money: -20, self: -3 },
    log: '隔壁維修站換手機螢幕要價三千,不砍價、不核刪、當場付清。',
  },
  {
    id: 'a_audit',
    stages: ['attending'],
    weight: 2,
    text: '健保署核刪了你三個月前的手術申報,理由:「非必要之醫療行為。」病人現在還活著,大概就是最好的反駁——但反駁要寫成三頁申覆。',
    choices: [
      {
        label: '熬夜寫申覆。',
        effects: { health: -3, money: 10 },
        log: '申覆成功,拿回七成。你用救人的那雙手,寫了一整晚的公文。',
      },
      {
        label: '算了,自己吸收。',
        effects: { money: -15, self: -2 },
        log: '你把公文夾闔上。這種「算了」,每一次都在教健保署下一次刪得更兇。',
      },
    ],
  },
  {
    id: 'a_referral',
    stages: ['attending'],
    weight: 3,
    cond: (s) => s.attrs.clinical >= 70,
    text: '外院轉來一台別人不敢開的刀,轉診單上寫:「建議轉貴院,由您處理。」你的技術越好,這種單子越多。',
    choices: [
      {
        label: '接。這就是你練刀的原因。',
        effects: { health: -6, self: 5 },
        stats: { surgeries: 1, livesSaved: 1 },
        log: '你又一次證明了自己——用一台沒有任何加給的刀。',
      },
      {
        label: '婉拒。你也有極限。',
        effects: { self: -5 },
        log: '掛掉電話後,你在辦公室坐了很久。你想起當年那句「總得有人」。',
      },
    ],
  },
  {
    id: 'a_defensive',
    stages: ['attending'],
    once: true,
    cond: (s) => s.stats.lawsuits >= 1,
    text: '被告過之後,你看每一張術前同意書的眼神都不一樣了。門診來了一位高風險、高併發症機率的病人。',
    choices: [
      {
        label: '建議他轉去醫學中心。',
        effects: { self: -10 },
        set: (s) => {
          s.flags.defensive = true;
        },
        log: '病人道謝離開。你知道下一家也會這樣建議他。防禦醫療就是這樣運作的:每個人都沒有錯,只有病人沒地方去。',
      },
      {
        label: '照收。他需要有人開。',
        effects: { self: 5 },
        log: '你收下病人,也收下風險。護理長看了你一眼,什麼都沒說。',
      },
    ],
  },
  {
    id: 'a_vip',
    stages: ['attending'],
    weight: 2,
    text: '院長室來電:一位民代的家屬想「喬」下週的刀。你的排程上,一位排了三個月的阿伯剛好在那個時段。',
    choices: [
      {
        label: '照排序來。',
        effects: { self: 5 },
        log: '你頂住了。之後你的刀房時段被調到最差的時間——沒有人承認這兩件事有關。',
      },
      {
        label: '讓他插。',
        effects: { self: -8 },
        log: '阿伯又被往後延了一週。他沒有抱怨,只說「醫師你們辛苦」。這讓你更難受。',
      },
    ],
  },
  {
    id: 'a_student_ask',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.teaching >= 40,
    text: '教學門診,實習醫學生問你:「老師,你會建議我們走外科嗎?」整間診間安靜了下來。',
    choices: [
      {
        label: '說實話。',
        effects: { teaching: 3, self: 2 },
        log: '你把工時、點值、醫糾都說了,最後說:「但有人得做。」半年後,那個學生選了皮膚科。你不怪他。',
      },
      {
        label: '說「外科很有成就感」。',
        effects: { self: -5 },
        log: '你聽見自己的聲音在講話,像在念別人的稿子。',
      },
    ],
  },
  {
    id: 'a_phd_offer',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.flags.phd === undefined,
    text: '科務會議後,主任把你留下:「要不要考慮念個在職博士?不是必要啦——但細則寫得清楚,以學位送審,三百點歸類計分直接免了,學位論文就能當代表著作。你自己算算,同樣要升等,哪條路快。」',
    choices: [
      {
        label: '報考在職博士班。',
        set: (s) => {
          s.flags.phd = 'studying';
          s.flags.phdProgress = 0;
        },
        log: '你的白袍口袋裡多了一張學生證。四十歲的你,和二十四歲的同學一起搶圖書館的插座。',
      },
      {
        label: '不念。你的老師在開刀房,不在研究所。',
        effects: { self: 3 },
        set: (s) => {
          s.flags.phd = 'declined';
        },
        log: '主任聳聳肩:「也行。就是同一條路,你要走得比別人久。」他說得平靜,像在講一件天氣的事。',
      },
    ],
  },
  {
    id: 'a_phd_peer',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.flags.phd !== 'done' && s.attrs.papers >= 100,
    text: '公佈欄貼出新的升等名單:比你晚三年進來的學弟,以博士學位送審,升上了助理教授。他的年刀量,是你的三分之一;你的三百點歸類計分,還刻在半路上。',
    effects: { self: -3 },
    log: '你看著名單想了很久,最後想通了:公式裡沒有刀量這一項。從來就沒有。',
  },
  {
    id: 'a_teaching_credit',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.teaching >= 2,
    text: '學期末,你在系統上登錄教學時數:門診教學、急診教學、病房迴診、開刀房帶刀——每一小時都要填,一格都不能少。細則說這些都算教學。細則沒說的是,這些都不算錢。',
    effects: { teaching: 2, self: -1 },
    log: '登錄系統當掉了兩次。你在深夜十一點按下送出,螢幕顯示:「教學時數已認列。」',
  },
  {
    id: 'a_promotion_denied',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.attrs.clinical >= 70 && s.attrs.papers < 300,
    text: '年度考核面談,主任攤開你的資料:「臨床表現優異,學術產出不足——歸類計分連送審門檻的一半都不到。」你當年救回的那些人,不算產出。',
    effects: { self: -5 },
    log: '走廊上,一位論文很多的同事拍拍你的肩:「先衝 paper 啦,刀讓年輕的開。」',
  },
  {
    id: 'a_health_check',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.attrs.health < 35,
    text: '健檢報告一片紅字。你看自己報告的樣子,跟看病人的病歷一模一樣:冷靜、客觀——然後束之高閣。',
    choices: [
      {
        label: '認真開始改變。',
        effects: { health: 5, self: 3 },
        log: '你開始晨跑。第一週只跑了一次,但那是一個開始。',
      },
      {
        label: '沒時間。',
        effects: { health: -5 },
        log: '你把報告塞進抽屜,和三年前那份疊在一起。',
      },
    ],
  },
  {
    id: 'a_mass_casualty',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.clinical >= 60,
    text: '國道連環車禍,大量傷患機制啟動。你連開三台,救回兩個。',
    effects: { health: -6, self: 6 },
    stats: { surgeries: 3, livesSaved: 2 },
    log: '凌晨走出醫院,天快亮了。你想不起上一次看日出,是為了日出本身。',
  },
  {
    id: 'a_reunion',
    stages: ['attending'],
    once: true,
    weight: 2,
    text: '醫學系同學會。當年成績在你後面的同學,現在是醫美診所院長,鑰匙圈上掛著新車的牌子。他真心地問你:「還在開大刀喔?辛苦欸。」',
    choices: [
      {
        label: '有點羨慕。',
        effects: { self: -5 },
        log: '回家的捷運上,你算了一下你們的時薪。然後你把手機收起來,決定不要再算了。',
      },
      {
        label: '真心替他高興。',
        effects: { self: 2 },
        log: '他過得好,你替他高興。你們只是選了不同的路——只是你的這條,是制度預設裡最虧的那條。',
      },
      {
        label: '跟他多聊了幾句「行情」。',
        set: (s) => {
          s.flags.aestheticCurious = true;
        },
        log: '他說:「你這雙手來打雷射,大材小用,但收入直接翻倍。」你笑笑,把這句話收進心裡。',
      },
    ],
  },
  {
    id: 'a_aesthetic_offer',
    stages: ['attending'],
    once: true,
    cond: (s) => s.flags.aestheticCurious === true || s.attrs.money < 100,
    text: '醫美集團的獵頭約你喝咖啡,開出的保障月薪是你現在的三倍,「而且不用值班,沒有醫糾。」',
    choices: [
      {
        label: '走。你累了。',
        set: (s) => {
          s.career = 'aesthetic';
        },
        log: '你交回識別證。走出醫院大門時,你沒有回頭——你怕一回頭就走不了。',
      },
      {
        label: '留下。開刀房裡還有明天的刀。',
        effects: { self: 5 },
        log: '你把名片壓在鍵盤下。它會一直在那裡,像一個隨時可以按下的逃生鈕。',
      },
    ],
  },

  // ───────────── 醫美支線 ─────────────
  {
    id: 'ae_no_clients',
    stages: ['aesthetic'],
    weight: 3,
    cond: (s) => s.talents.social < 6,
    text: '這個月的來客數:3。房東的漲租通知貼在門上。你的刀法在這裡沒有健保點值——也沒有客人。',
    effects: { money: -60, self: -3 },
    log: '你終於明白:這一行賣的不是技術,是話術。而你這輩子都在練錯的那一種。',
  },
  {
    id: 'ae_hot',
    stages: ['aesthetic'],
    weight: 3,
    cond: (s) => s.talents.social >= 7,
    text: '你的診所預約排到三個月後。你發現自己很會直播——比當年在晨會報 case 流利多了。',
    effects: { money: 150 },
    log: '下播後,助理遞上下一位客人的資料。你看了一眼手錶:今晚可以準時吃晚餐。',
  },
  {
    id: 'ae_old_patient',
    stages: ['aesthetic'],
    once: true,
    text: '一位你當年從鬼門關拉回來的病人走進診所,是來打雷射的。她認出了你,愣住:「醫師……你怎麼在這裡?」',
    choices: [
      {
        label: '笑著轉移話題。',
        effects: { self: -8 },
        log: '她沒有再問。結帳時她多說了一句:「那時候,謝謝你。」你在診間坐了很久。',
      },
      {
        label: '老實說:「我累了。」',
        effects: { self: -3 },
        log: '她點點頭:「你們也是人。」這句話,你等了十幾年,結果是在這裡聽到的。',
      },
    ],
  },
  {
    id: 'ae_news',
    stages: ['aesthetic'],
    weight: 2,
    text: '新聞:「外科人力荒,急診壅塞,病患苦等 14 小時。」你在候診室的電視上看到老東家的名字。',
    choices: [
      {
        label: '轉台。',
        effects: { self: -4 },
        log: '下一台是美食節目。候診的客人們聊著醫美療程,沒有人抬頭。',
      },
      {
        label: '看完整則報導。',
        effects: { self: -1 },
        log: '記者訪問了你以前的學弟。他的黑眼圈,隔著螢幕都看得到。',
      },
    ],
  },

  // ───────────── 感情/家庭(跨階段)─────────────
  {
    id: 'f_meet',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'single' && s.alloc.family >= 2,
    text: '朋友介紹你認識了一個人。第一次見面,對方問:「聽說你們醫師都很忙?」',
    choices: [
      {
        label: '老實說:「忙到沒有自己的時間。」',
        set: (s) => {
          s.family.stage = 'dating';
        },
        log: '對方笑了:「至少你誠實。」你們開始約會——大多約在醫院附近。',
      },
      {
        label: '說:「還好啦,可以配合。」',
        set: (s) => {
          s.family.stage = 'dating';
        },
        log: '你們開始約會。三個月後對方就會知道,「還好」是什麼意思。',
      },
    ],
  },
  {
    id: 'f_steady',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'dating' && s.alloc.family >= 2,
    text: '交往漸漸穩定。對方學會了看你的班表,學會了在你值班的晚上自己吃飯,學會了不問「你什麼時候下班」。',
    set: (s) => {
      s.family.stage = 'steady';
    },
    effects: { familyBond: 5 },
    log: '愛一個外科醫師,是一門需要天分的學問。對方正在努力學。',
  },
  {
    id: 'f_breakup',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 4,
    cond: (s) =>
      (s.family.stage === 'dating' || s.family.stage === 'steady') && s.alloc.family === 0,
    text: '你已經一個多月沒有回覆超過三個字的訊息。對方留下最後一句話:「你救得了病人,救不了我們。」',
    set: (s) => {
      s.family.stage = 'single';
    },
    effects: { familyBond: -10, self: -5 },
    log: '你想反駁,但值班鈴響了。等你忙完,已讀不回的人變成了你。',
  },
  {
    id: 'f_propose',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'steady' && s.alloc.family >= 3,
    text: '交往多年,你在難得的連休訂了餐廳。戒指在口袋裡放了三個月——三次想拿出來,三次被 on call 打斷。',
    choices: [
      {
        label: '今天,求婚。',
        set: (s) => {
          s.family.stage = 'married';
        },
        effects: { familyBond: 15, self: 5 },
        log: '對方哭著答應,只提了一個條件:「每週至少一起吃一頓晚餐。」你答應了。你們都知道這個承諾有多難。',
      },
      {
        label: '再等等,等升上主治穩定一點。',
        effects: { self: -2 },
        log: '「等穩定一點」——這句話你已經說了三年。對方笑了笑,把菜單遞給你。',
      },
    ],
  },
  {
    id: 'f_child',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.family.kids === 0 && s.alloc.family >= 3,
    text: '晚餐桌上,另一半輕輕地問:「我們……要不要有個孩子?」',
    choices: [
      {
        label: '要。',
        set: (s) => {
          s.family.kids = 1;
        },
        effects: { familyBond: 10 },
        log: '孩子出生那天你在開刀。護理師把手機舉到無影燈旁給你看照片。你隔著口罩笑了,眼睛有點酸。',
      },
      {
        label: '「等生活穩定一點。」',
        effects: { familyBond: -5 },
        log: '你們都笑了——因為彼此都知道,那一天不會自己到來。',
      },
    ],
  },
  {
    id: 'f_kid_stranger',
    stages: ['resident', 'attending'],
    weight: 4,
    cond: (s) => s.family.kids > 0 && s.alloc.family < 3,
    text: '幼稚園的親子日你又缺席了。老師後來轉述,孩子指著全家福說:「這是我爸爸/媽媽,住在醫院。」',
    effects: { familyBond: -15, self: -5 },
    log: '你把這句話轉述給同事聽,大家都笑了。笑完之後,休息室安靜了很久。',
  },
  {
    id: 'f_anniversary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.alloc.family >= 3,
    text: '結婚紀念日,你難得準時下班。餐廳裡你們聊的還是孩子和房貸——但至少,你在。',
    effects: { familyBond: 10, self: 3 },
    log: '「在場」聽起來是很低的標準。對你們家來說,它是奢侈品。',
  },

  // ───────────── 醫糾(special:由 engine 依機率注入)─────────────
  {
    id: 'a_lawsuit',
    special: true,
    stages: ['resident', 'attending'],
    text: '存證信函寄到了醫院。一台急刀的併發症,家屬提告。你記得那一晚——你已經 30 個小時沒睡,而你是當時唯一能上的人。',
    choices: [
      {
        label: '和解。你只想結束這一切。',
        effects: { money: -150, self: -8 },
        stats: { lawsuits: 1 },
        log: '和解金 150 萬。院方公關發了新聞稿,裡面沒有你的名字,也沒有那 30 個小時。',
      },
      {
        label: '上法庭。你沒有做錯。',
        effects: { self: -5, health: -5 },
        stats: { lawsuits: 1 },
        set: (s) => {
          s.flags.onTrial = true;
        },
        log: '訴訟開始。不管結果如何,有一件事已經確定:你看下一張急刀通知單的眼神,再也不一樣了。',
      },
    ],
  },
  {
    id: 'a_verdict_win',
    stages: ['resident', 'attending'],
    once: true,
    forced: (s) => s.flags.onTrial === true && s.talents.social >= 5,
    text: '纏訟多年,判決出爐:無罪。你在法庭上把當晚的處置一條一條講清楚,法官聽懂了。',
    effects: { self: 6 },
    set: (s) => {
      s.flags.onTrial = false;
    },
    log: '走出法院,沒有記者。當年的新聞標題有你的科別,今天的判決沒有版面。',
  },
  {
    id: 'a_verdict_lose',
    stages: ['resident', 'attending'],
    once: true,
    forced: (s) => s.flags.onTrial === true && s.talents.social < 5,
    text: '判決:賠償 200 萬。你在法庭上緊張得詞不達意,對造律師口若懸河。你開的刀沒有輸,你輸在說話。',
    effects: { money: -200, self: -12 },
    set: (s) => {
      s.flags.onTrial = false;
    },
    log: '律師安慰你:「下次答辯要有技巧。」你想說你希望沒有下次,但你知道機率不站在你這邊。',
  },
];
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/events-data.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/events.js tests/events-data.test.js
git commit -m "feat: prologue and event data with integrity tests"
```

---

### Task 7: 結局系統(`src/endings.js`)

**Files:**

- Create: `src/endings.js`
- Test: `tests/endings.test.js`

**Interfaces:**

- Consumes: state 形狀(Task 4)。
- Produces: `decideEnding(state, cause) → { id, title, body, filterLine:string|null, filterKind:'gray'|'peace'|null, settlement:[{label,value}] }`
  - `cause`: `'death' | 'exit-specialty' | 'retire'`

判定順序(由上而下,先中先贏):

1. `cause==='exit-specialty'` → `another_path`「另一條路」(中性,不唱衰任何一方)
2. `cause==='death'` → `no_self_heal`「醫者不能自醫」
3. `career==='aesthetic' && talents.social>=6` → `laser`「你的雷射打得又快又好」
4. `career==='aesthetic'` → `rent`「診所的租金又漲了」
5. `rank==='professor' && attrs.clinical<60` → `no_or`「你已經很久沒進開刀房了」
6. `attrs.clinical>=85 && attrs.familyBond<30` → `legend`「手術室的傳說,家裡的陌生人」
7. `attrs.clinical>=40 && attrs.familyBond>=50 && attrs.health>=40 && attrs.self>=50` → `ordinary`「平凡的幸福」
8. 其他 → `retire`「你退休了」

自我濾鏡:`self<25` → `filterKind:'gray'`、`filterLine:'但直到最後,你始終不知道,自己為什麼活得這麼累。'`;`self>=70` → `'peace'`、`'你知道自己為什麼這樣活。這件事,比任何頭銜都難得。'`;其餘 null。

結算單(所有結局共用):執刀次數、救回的人、被告次數、發表論文(round)、其中真的有人引用的(`floor(papers*0.3)`)、錯過的家庭晚餐、最終存款(`round(money)` 萬)、孩子(`kids>0 ? '${kids} 個' : '無'`)。

- [ ] **Step 1: 寫失敗測試 `tests/endings.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createGame } from '../src/engine.js';
import { decideEnding } from '../src/endings.js';

describe('decideEnding', () => {
  it('exit at specialty choice is a neutral path, not a verdict', () => {
    const s = createGame(1);
    const e = decideEnding(s, 'exit-specialty');
    expect(e.id).toBe('another_path');
    expect(e.body).toMatch(/沒有誰的選擇比較高明/);
  });

  it('death from zero health', () => {
    const s = createGame(1);
    s.attrs.health = 0;
    expect(decideEnding(s, 'death').id).toBe('no_self_heal');
  });

  it('aesthetic splits on social talent', () => {
    const s = createGame(1);
    s.career = 'aesthetic';
    s.talents.social = 8;
    expect(decideEnding(s, 'retire').id).toBe('laser');
    s.talents.social = 3;
    expect(decideEnding(s, 'retire').id).toBe('rent');
  });

  it('professor who no longer operates', () => {
    const s = createGame(1);
    s.rank = 'professor';
    s.attrs.clinical = 30;
    expect(decideEnding(s, 'retire').id).toBe('no_or');
  });

  it('legend in the OR, stranger at home', () => {
    const s = createGame(1);
    s.attrs.clinical = 90;
    s.attrs.familyBond = 10;
    expect(decideEnding(s, 'retire').id).toBe('legend');
  });

  it('the balanced life is merely ordinary — and that is the point', () => {
    const s = createGame(1);
    s.attrs = { ...s.attrs, clinical: 55, familyBond: 70, health: 60, self: 60 };
    expect(decideEnding(s, 'retire').id).toBe('ordinary');
  });

  it('low self paints every ending gray', () => {
    const s = createGame(1);
    s.attrs.clinical = 90;
    s.attrs.familyBond = 10;
    s.attrs.self = 10;
    const e = decideEnding(s, 'retire');
    expect(e.filterKind).toBe('gray');
    expect(e.filterLine).toMatch(/活得這麼累/);
  });

  it('high self earns the reconciliation line', () => {
    const s = createGame(1);
    s.attrs.self = 80;
    expect(decideEnding(s, 'retire').filterKind).toBe('peace');
  });

  it('settlement includes the numbers that never appear on any award', () => {
    const s = createGame(1);
    s.stats.surgeries = 1234;
    s.attrs.papers = 400; // 歸類計分 400 點 ≈ 10 篇
    const labels = decideEnding(s, 'retire').settlement.map((x) => x.label);
    expect(labels).toContain('執刀次數');
    expect(labels).toContain('錯過的家庭晚餐');
    const cited = decideEnding(s, 'retire').settlement.find((x) => x.label.includes('引用'));
    expect(cited.value).toBe('3 篇');
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/endings.test.js`
Expected: FAIL(module 不存在)

- [ ] **Step 3: 實作 `src/endings.js`**

```js
function baseEnding(state, cause) {
  const a = state.attrs;
  if (cause === 'exit-specialty')
    return {
      id: 'another_path',
      title: '另一條路',
      body: '你選擇了另一個專科,過上了另一種生活:有的月份忙,有的月份閒,也有自己這一行的難處。多年後的同學會,外科的同學聊著刀房裡的事,你安靜地聽,像在聽一個平行世界。沒有誰的選擇比較高明——每一條路,都有各自要付的代價。',
    };
  if (cause === 'death')
    return {
      id: 'no_self_heal',
      title: '醫者不能自醫',
      body: `${state.age} 歲,你倒在工作中,再也沒有醒來。訃聞說你「一生奉獻醫療」。追思會上,院方代表致詞三分鐘;你救過的人有些來了,站在最後一排。你教別人保養身體教了一輩子,唯一沒掛你門診的病人,是你自己。`,
    };
  if (state.career === 'aesthetic' && state.talents.social >= 6)
    return {
      id: 'laser',
      title: '你的雷射打得又快又好',
      body: '診所越開越大,你學會了行銷、學會了話術、學會了準時下班。存摺上的數字,終於對得起你當年的聯考分數。只是偶爾在深夜,你的右手還記得打結的觸感——那雙手現在保養得很好,像一件收進櫃子裡的樂器。',
    };
  if (state.career === 'aesthetic')
    return {
      id: 'rent',
      title: '診所的租金又漲了',
      body: '你以為離開健保就是出路。但你不擅長招呼客人,不擅長直播,不擅長把療程包裝成夢想。你的技術在這裡值不了錢——你這才發現,原來在哪裡都一樣:這個世界從來沒有打算為技術本身付錢。',
    };
  if (state.rank === 'professor' && a.clinical < 60)
    return {
      id: 'no_or',
      title: '你已經很久沒進開刀房了',
      body: '教授、部主任、學會理事。你的行程表滿是會議,牆上滿是獎狀。有年輕主治恭敬地問起你當年的刀法,你笑了笑,沒有回答——因為你自己也快想不起來了。你用放下手術刀,換到了讓別人拿起手術刀的位置。值不值得,你沒有問過自己。',
    };
  if (a.clinical >= 85 && a.familyBond < 30)
    return {
      id: 'legend',
      title: '手術室的傳說,家裡的陌生人',
      body: '退休茶會擠滿了人,每個學生都有一個你半夜救場的故事。你是傳說。回到家,你和家人坐在同一張餐桌,客氣得像多年不見的舊識。你能在三小時內完成別人五小時的刀,卻用了三十年,沒能走完從醫院到家裡的那段路。',
    };
  if (a.clinical >= 40 && a.familyBond >= 50 && a.health >= 40 && a.self >= 50)
    return {
      id: 'ordinary',
      title: '平凡的幸福',
      body: '你不是傳說,論文不多,錢也不多。但你的孩子認得你,你的膝蓋還能爬山,你偶爾會收到當年病人的年節簡訊。深夜你偶爾想:如果當年再拼一點……然後你聽見隔壁房間家人的呼吸聲,把這個念頭輕輕關掉。在這個制度裡,「平凡」是你能搶救回來的最好結局——而它竟然需要搶救。',
    };
  return {
    id: 'retire',
    title: '你退休了',
    body: '歡送會的蛋糕上寫著「仁心仁術」。你交還識別證,走出醫院大門,警衛跟你點頭,一如過去三十幾年的每一天。你開過的刀、救回的人、錯過的晚餐——這些數字不會出現在任何獎狀上。它們只出現在下面這張表裡。',
  };
}

export function decideEnding(state, cause) {
  const a = state.attrs;
  const e = baseEnding(state, cause);
  let filterKind = null;
  let filterLine = null;
  if (a.self < 25) {
    filterKind = 'gray';
    filterLine = '但直到最後,你始終不知道,自己為什麼活得這麼累。';
  } else if (a.self >= 70) {
    filterKind = 'peace';
    filterLine = '你知道自己為什麼這樣活。這件事,比任何頭銜都難得。';
  }
  const settlement = [
    { label: '執刀次數', value: state.stats.surgeries },
    { label: '救回的人', value: state.stats.livesSaved },
    { label: '被告次數', value: state.stats.lawsuits },
    { label: '論文歸類計分', value: `${Math.round(a.papers)} 點` },
    { label: '折合論文', value: `約 ${Math.round(a.papers / 40)} 篇` },
    { label: '其中真的有人引用的', value: `${Math.floor((a.papers / 40) * 0.3)} 篇` },
    { label: '錯過的家庭晚餐', value: state.stats.missedDinners },
    { label: '最終存款', value: `${Math.round(a.money)} 萬` },
    { label: '孩子', value: state.family.kids > 0 ? `${state.family.kids} 個` : '無' },
  ];
  return { ...e, filterKind, filterLine, settlement };
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run tests/endings.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/endings.js tests/endings.test.js
git commit -m "feat: ending resolution with self filter and life settlement"
```

---

### Task 8: 回合主流程 `playYear`(`src/engine.js` 第三部分)

**Files:**

- Modify: `src/engine.js`(追加 `pickEvents` 與 `playYear`;新增 import `EVENTS`、`decideEnding`)
- Test: `tests/play-year.test.js`

**Interfaces:**

- Consumes: `EVENTS`(Task 6)、`decideEnding`(Task 7)、Task 4/5 全部函式。
- Produces:
  - `pickEvents(state) → Event[]`(強制事件 + 醫糾機率注入 + 隨機加權抽最多 2 個)
  - `async playYear(state, alloc, chooser) → { logs:[{kind:'year'|'event'|'choice'|'info', text:string}], ending:Object|null }`
  - `chooser: async ({ id, text, choices:[{label}] }, state) → number`(選項索引)

流程:validate → applyGrowth → 逐事件(choices 先過 cond 過濾,await chooser,套用 effects/stats/set;自動事件直接套用;`flags.exitNow` 中斷)→ settleHealth(死亡→ ending)→ settleMoney → settlePromotion(有 log 就推入)→ exitNow → ending;age+1;跨階段推轉場 log;age>65 → retire ending。

- [ ] **Step 1: 寫失敗測試 `tests/play-year.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createGame, playYear, pickEvents } from '../src/engine.js';

const first = async () => 0;
const alloc = (c, t, r, f, p) => ({
  clinical: c,
  teaching: t,
  research: r,
  family: f,
  personal: p,
});

describe('pickEvents', () => {
  it('forces the specialty event at age 26', () => {
    const s = createGame(1);
    s.age = 26;
    s.alloc = alloc(6, 0, 2, 2, 2);
    const ids = pickEvents(s).map((e) => e.id);
    expect(ids).toContain('pgy_specialty');
  });

  it('never picks the same once-event twice', () => {
    const s = createGame(1);
    s.age = 26;
    s.used.push('pgy_specialty');
    s.alloc = alloc(6, 0, 2, 2, 2);
    expect(pickEvents(s).map((e) => e.id)).not.toContain('pgy_specialty');
  });
});

describe('playYear', () => {
  it('advances one year and returns logs', async () => {
    const s = createGame(1);
    const { logs, ending } = await playYear(s, alloc(6, 0, 2, 2, 2), first);
    expect(s.age).toBe(26);
    expect(ending).toBeNull();
    expect(logs[0].text).toMatch(/25 歲/);
  });

  it('rejects an invalid allocation before anything changes', async () => {
    const s = createGame(1);
    await expect(playYear(s, alloc(1, 1, 1, 1, 1), first)).rejects.toThrow();
    expect(s.age).toBe(25);
  });

  it('choosing to leave at the specialty crossroads ends the game', async () => {
    const s = createGame(1);
    s.age = 26;
    const leaveSurgery = async (ev) =>
      ev.id === 'pgy_specialty' ? ev.choices.findIndex((c) => c.label.includes('別科')) : 0;
    const { ending } = await playYear(s, alloc(6, 0, 2, 2, 2), leaveSurgery);
    expect(ending).not.toBeNull();
    expect(ending.id).toBe('another_path');
  });

  it('a studying attending accumulates phd progress through research months', async () => {
    const s = createGame(1);
    s.age = 36;
    s.rank = 'vs';
    s.flags.phd = 'studying';
    s.flags.phdProgress = 0;
    await playYear(s, alloc(4, 0, 6, 1, 1), first);
    expect(s.flags.phdProgress).toBe(6);
  });

  it('death mid-career produces the death ending', async () => {
    const s = createGame(1);
    s.age = 45;
    s.rank = 'vs';
    s.attrs.health = 2;
    s.talents.constitution = 1;
    const { ending } = await playYear(s, alloc(10, 0, 2, 0, 0), first);
    expect(ending).not.toBeNull();
    expect(ending.id).toBe('no_self_heal');
  });

  it('reaching 66 retires the player', async () => {
    const s = createGame(1);
    s.age = 65;
    s.rank = 'vs';
    s.attrs.health = 90;
    const { ending } = await playYear(s, alloc(2, 2, 2, 3, 3), first);
    expect(ending).not.toBeNull();
    expect(['retire', 'ordinary', 'legend', 'no_or', 'laser', 'rent']).toContain(ending.id);
  });

  it('first attending year logs the vs promotion', async () => {
    const s = createGame(1);
    s.age = 32;
    const { logs } = await playYear(s, alloc(6, 2, 2, 1, 1), first);
    expect(logs.some((l) => l.text.includes('主治醫師'))).toBe(true);
    expect(s.rank).toBe('vs');
  });
});
```

- [ ] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/play-year.test.js`
Expected: FAIL(函式未定義)

- [ ] **Step 3: 在 `src/engine.js` 追加實作**

檔案頂部新增 import:

```js
import { EVENTS } from './events.js';
import { decideEnding } from './endings.js';
```

追加:

```js
export function pickEvents(state) {
  const stageKey = getStage(state).key;
  const rng = state.rng;
  const eligible = EVENTS.filter(
    (e) =>
      !e.special &&
      e.stages.includes(stageKey) &&
      !(e.once && state.used.includes(e.id)) &&
      (!e.cond || e.cond(state)),
  );
  const picked = eligible.filter((e) => e.forced && e.forced(state));
  if (rng.chance(malpracticeChance(state))) {
    picked.push(EVENTS.find((e) => e.id === 'a_lawsuit'));
  }
  // 有 forced 屬性的事件只走 forced 通道,永不進隨機池(否則沒被告也可能抽到判決)
  const pool = eligible.filter((e) => !e.forced);
  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const total = pool.reduce((s, e) => s + (e.weight || 1), 0);
    let r = rng.next() * total;
    let idx = pool.findIndex((e) => (r -= e.weight || 1) < 0);
    if (idx === -1) idx = pool.length - 1;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

const STAGE_TRANSITION_LOGS = {
  resident: '你成為外科住院醫師。值班表寄來了:這個月,你有十一天不會看到太陽下山。',
};

export async function playYear(state, alloc, chooser) {
  alloc = validateAllocation(state, alloc);
  state.alloc = alloc;
  const stage = getStage(state);
  const logs = [{ kind: 'year', text: `【${state.age} 歲・${stage.label}】` }];
  applyGrowth(state, alloc);

  for (const e of pickEvents(state)) {
    if (e.once) state.used.push(e.id);
    const text = typeof e.text === 'function' ? e.text(state) : e.text;
    if (e.choices) {
      const choices = e.choices.filter((c) => !c.cond || c.cond(state));
      const idx = await chooser({ id: e.id, text, choices }, state);
      const c = choices[Math.max(0, Math.min(choices.length - 1, idx))];
      if (c.effects) applyEffects(state, c.effects);
      if (c.stats) applyStats(state, c.stats);
      if (c.set) c.set(state);
      logs.push({ kind: 'event', text }, { kind: 'choice', text: c.log });
    } else {
      if (e.effects) applyEffects(state, e.effects);
      if (e.stats) applyStats(state, e.stats);
      if (e.set) e.set(state);
      logs.push({ kind: 'event', text: [text, e.log].filter(Boolean).join('\n') });
    }
    if (state.flags.exitNow) break;
  }

  const dead = settleHealth(state, alloc);
  if (dead) {
    state.ending = decideEnding(state, 'death');
    logs.push({ kind: 'info', text: '你的身體,先於你的意志,停了下來。' });
    return { logs, ending: state.ending };
  }
  settleMoney(state);
  const phdLog = settlePhd(state, alloc);
  if (phdLog) logs.push({ kind: 'info', text: phdLog });
  const grantLog = settleGrant(state, alloc);
  if (grantLog) logs.push({ kind: 'info', text: grantLog });
  const promo = settlePromotion(state);
  if (promo) logs.push({ kind: 'info', text: promo });

  if (state.flags.exitNow) {
    state.career = 'exited';
    state.ending = decideEnding(state, state.flags.exitCause);
    return { logs, ending: state.ending };
  }

  const prevKey = getStage(state).key;
  state.age += 1;
  const nextKey = getStage(state).key;
  if (nextKey !== prevKey && STAGE_TRANSITION_LOGS[nextKey]) {
    logs.push({ kind: 'info', text: STAGE_TRANSITION_LOGS[nextKey] });
  }
  if (state.age > 65) {
    state.ending = decideEnding(state, 'retire');
    return { logs, ending: state.ending };
  }
  return { logs, ending: null };
}
```

- [ ] **Step 4: 執行確認通過**

Run: `npx vitest run`
Expected: PASS(全部測試檔綠)

- [ ] **Step 5: Commit**

```bash
git add src/engine.js tests/play-year.test.js
git commit -m "feat: yearly turn loop with event picking and endings"
```

---

### Task 9: Smoke test — 隨機策略自動玩完 N 場

**Files:**

- Test: `tests/smoke.test.js`

**Interfaces:**

- Consumes: `createGame`、`playYear`、`getStage`、`ALLOC_KEYS`。

- [ ] **Step 1: 寫測試 `tests/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createGame, playYear, getStage, ALLOC_KEYS } from '../src/engine.js';
import { createRng } from '../src/rng.js';

function randomAlloc(state, rng) {
  const min = getStage(state).minClinical;
  const alloc = { clinical: min, teaching: 0, research: 0, family: 0, personal: 0 };
  for (let i = 0; i < 12 - min; i++) alloc[rng.pick(ALLOC_KEYS)] += 1;
  return alloc;
}

describe('smoke: random playthroughs', () => {
  it('200 random lives all reach an ending with attrs in bounds', async () => {
    for (let seed = 1; seed <= 200; seed++) {
      const state = createGame(seed);
      const rng = createRng(seed * 7919);
      const chooser = async (ev) => rng.int(0, ev.choices.length - 1);
      let ending = null;
      let guard = 0;
      while (!ending && guard++ < 60) {
        ({ ending } = await playYear(state, randomAlloc(state, rng), chooser));
        for (const k of ['clinical', 'teaching', 'self', 'health', 'familyBond']) {
          expect(state.attrs[k], `seed ${seed} attr ${k}`).toBeGreaterThanOrEqual(0);
          expect(state.attrs[k], `seed ${seed} attr ${k}`).toBeLessThanOrEqual(100);
        }
        expect(state.attrs.papers, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      }
      expect(ending, `seed ${seed} never ended`).not.toBeNull();
      expect(ending.title, `seed ${seed}`).toBeTruthy();
      expect(ending.settlement.length, `seed ${seed}`).toBeGreaterThan(0);
    }
  }, 30000);

  it('multiple distinct endings are reachable across seeds', async () => {
    const seen = new Set();
    for (let seed = 1; seed <= 120; seed++) {
      const state = createGame(seed);
      const rng = createRng(seed * 104729);
      const chooser = async (ev) => rng.int(0, ev.choices.length - 1);
      let ending = null;
      let guard = 0;
      while (!ending && guard++ < 60) {
        ({ ending } = await playYear(state, randomAlloc(state, rng), chooser));
      }
      seen.add(ending.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  }, 30000);
});
```

- [ ] **Step 2: 執行**

Run: `npx vitest run tests/smoke.test.js`
Expected: PASS。若 FAIL,依訊息修 engine/events 的邊界(這正是 smoke test 的目的);修正屬於對應模組的 bug fix,commit message 用 `fix:`。

- [ ] **Step 3: Commit**

```bash
git add tests/smoke.test.js
git commit -m "test: random playthrough smoke tests"
```

---

### Task 10: UI(`index.html` + `style.css` + `src/ui.js`)

**Files:**

- Create: `index.html`, `style.css`, `src/ui.js`

**Interfaces:**

- Consumes: `createGame`、`playYear`、`getStage`、`ALLOC_KEYS`、`AXIS_LABELS`(engine.js);`TALENT_LABELS`(talents.js);`PROLOGUE`(events.js)。
- Produces: 完整可玩流程:開始畫面 → 天賦擲骰 → 序章(含 18 歲聯考假選擇)→ 每年「規劃 → 進行」→ 結局 + 結算單 + 重開。

- [ ] **Step 1: 建立 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>外科醫師的一生</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main id="app">
      <section id="screen-start" class="screen">
        <h1>外科醫師的一生</h1>
        <p class="tagline">一個關於選擇的遊戲——在一個不太給你選擇的行業裡。</p>
        <button id="btn-start" class="primary">開始人生</button>
      </section>

      <section id="screen-talents" class="screen hidden">
        <h2>你出生了。</h2>
        <p class="hint">天賦已經決定好了,沒有人問過你。</p>
        <ul id="talent-list"></ul>
        <button id="btn-accept-talents" class="primary">人生不能重骰,開始吧</button>
      </section>

      <section id="screen-story" class="screen hidden">
        <div id="status-bar" class="hidden"></div>
        <div id="log"></div>
        <div id="choice-box" class="hidden"></div>
        <div id="plan-box" class="hidden">
          <h3 id="plan-title"></h3>
          <p class="hint">分配你今年的 12 個月。</p>
          <div id="plan-rows"></div>
          <p id="plan-remaining"></p>
          <p id="plan-error" class="error"></p>
          <button id="btn-run-year" class="primary">就這樣過這一年</button>
        </div>
      </section>

      <section id="screen-ending" class="screen hidden">
        <h2 id="ending-title"></h2>
        <p id="ending-body"></p>
        <p id="ending-filter"></p>
        <h3>人生結算單</h3>
        <table id="settlement"></table>
        <button id="btn-restart" class="primary">再活一次</button>
      </section>
    </main>
    <script type="module" src="src/ui.js"></script>
  </body>
</html>
```

- [ ] **Step 2: 建立 `style.css`**

```css
:root {
  --bg: #14161a;
  --panel: #1e2127;
  --text: #d8d5cd;
  --dim: #8a877f;
  --accent: #c9a35f;
  --danger: #b3564f;
  --line: #33373f;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif;
  line-height: 1.8;
}
#app {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.25rem;
}
.screen.hidden,
.hidden {
  display: none;
}
h1 {
  font-size: 2rem;
  letter-spacing: 0.3em;
  margin-top: 20vh;
}
.tagline,
.hint {
  color: var(--dim);
}
button.primary {
  display: block;
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.9rem;
  font-size: 1.05rem;
  background: none;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 6px;
  cursor: pointer;
}
button.primary:disabled {
  color: var(--dim);
  border-color: var(--line);
}
#talent-list {
  list-style: none;
  padding: 0;
}
#talent-list li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
}
#talent-list .bar {
  color: var(--accent);
  letter-spacing: 2px;
}
#status-bar {
  position: sticky;
  top: 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.9rem;
  margin-bottom: 1rem;
}
#status-bar .low {
  color: var(--danger);
}
#log p {
  margin: 0.7rem 0;
  animation: fadein 0.5s;
}
#log p.year {
  color: var(--accent);
  margin-top: 1.6rem;
  letter-spacing: 0.15em;
}
#log p.choice {
  color: var(--dim);
  padding-left: 1rem;
  border-left: 2px solid var(--line);
  white-space: pre-wrap;
}
#log p.event {
  white-space: pre-wrap;
}
#log p.info {
  color: var(--accent);
}
@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
  }
}
#choice-box button,
#choice-box .exam-choice {
  display: block;
  width: 100%;
  margin: 0.5rem 0;
  padding: 0.75rem;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
}
#choice-box button:hover {
  border-color: var(--accent);
}
#plan-box {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}
.plan-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--line);
}
.plan-row .controls {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.plan-row button {
  width: 2.2rem;
  height: 2.2rem;
  font-size: 1.1rem;
  background: none;
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 50%;
  cursor: pointer;
}
.plan-row .months {
  min-width: 1.5rem;
  text-align: center;
}
.error {
  color: var(--danger);
  min-height: 1.2rem;
}
#settlement {
  width: 100%;
  border-collapse: collapse;
}
#settlement td {
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--line);
}
#settlement td:last-child {
  text-align: right;
  color: var(--accent);
}
#ending-filter:empty {
  display: none;
}
#ending-filter.gray {
  color: var(--dim);
  font-style: italic;
}
#ending-filter.peace {
  color: var(--accent);
}
```

- [ ] **Step 3: 建立 `src/ui.js`**

```js
import {
  createGame,
  playYear,
  getStage,
  ALLOC_KEYS,
  AXIS_LABELS,
  validateAllocation,
} from './engine.js';
import { TALENT_LABELS } from './talents.js';
import { PROLOGUE } from './events.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let state = null;
let alloc = null;

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
  $(id).classList.remove('hidden');
}

function addLog(kind, text) {
  const p = document.createElement('p');
  p.className = kind;
  p.textContent = text;
  $('log').appendChild(p);
  p.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function renderStatus() {
  const a = state.attrs;
  const items = [
    [`${state.age} 歲`, false],
    [getStage(state).label, false],
    [`健康 ${Math.round(a.health)}`, a.health < 30],
    [`自我 ${Math.round(a.self)}`, a.self < 25],
    [`家庭 ${Math.round(a.familyBond)}`, a.familyBond < 30],
    [`臨床 ${Math.round(a.clinical)}`, false],
    [`教學 ${Math.round(a.teaching)}`, false],
    [`計分 ${Math.round(a.papers)}`, false],
    [`存款 ${Math.round(a.money)} 萬`, a.money < 0],
  ];
  $('status-bar').innerHTML = items
    .map(([t, low]) => `<span class="${low ? 'low' : ''}">${t}</span>`)
    .join('');
  $('status-bar').classList.remove('hidden');
}

function renderTalents() {
  $('talent-list').innerHTML = Object.entries(state.talents)
    .map(
      ([k, v]) =>
        `<li><span>${TALENT_LABELS[k]}</span><span class="bar">${'●'.repeat(v)}${'○'.repeat(10 - v)}</span></li>`,
    )
    .join('');
}

async function runPrologue() {
  show('screen-story');
  for (const step of PROLOGUE) {
    if (step.exam) {
      addLog('event', step.text);
      await new Promise((resolve) => {
        const box = $('choice-box');
        box.innerHTML = '';
        box.classList.remove('hidden');
        for (const label of step.choices) {
          const b = document.createElement('button');
          b.textContent = label;
          b.onclick = () => {
            box.classList.add('hidden');
            resolve();
          };
          box.appendChild(b);
        }
      });
      addLog('info', step.outcome);
    } else {
      addLog('event', step.text);
    }
    await sleep(900);
  }
}

function askChoice(ev) {
  addLog('event', ev.text);
  return new Promise((resolve) => {
    const box = $('choice-box');
    box.innerHTML = '';
    box.classList.remove('hidden');
    ev.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.onclick = () => {
        box.classList.add('hidden');
        resolve(i);
      };
      box.appendChild(b);
    });
  });
}

function renderPlan() {
  const stage = getStage(state);
  alloc = { clinical: stage.minClinical, teaching: 0, research: 0, family: 0, personal: 0 };
  $('plan-title').textContent = `${state.age} 歲・${stage.label}`;
  const rows = $('plan-rows');
  rows.innerHTML = '';
  for (const k of ALLOC_KEYS) {
    const row = document.createElement('div');
    row.className = 'plan-row';
    const min = k === 'clinical' ? stage.minClinical : 0;
    row.innerHTML = `<span>${AXIS_LABELS[k]}${min ? `(至少 ${min})` : ''}</span>
      <span class="controls">
        <button data-k="${k}" data-d="-1">−</button>
        <span class="months" id="m-${k}">${alloc[k]}</span>
        <button data-k="${k}" data-d="1">＋</button>
      </span>`;
    rows.appendChild(row);
  }
  rows.onclick = (e) => {
    const k = e.target.dataset?.k;
    if (!k) return;
    const d = Number(e.target.dataset.d);
    const min = k === 'clinical' ? stage.minClinical : 0;
    const used = ALLOC_KEYS.reduce((s, key) => s + alloc[key], 0);
    if (d > 0 && used >= 12) return;
    if (d < 0 && alloc[k] <= min) return;
    alloc[k] += d;
    $(`m-${k}`).textContent = alloc[k];
    updateRemaining();
  };
  updateRemaining();
  $('plan-box').classList.remove('hidden');
}

function updateRemaining() {
  const used = ALLOC_KEYS.reduce((s, k) => s + alloc[k], 0);
  $('plan-remaining').textContent = `還剩 ${12 - used} 個月未分配`;
  $('btn-run-year').disabled = used !== 12;
}

function renderEnding(ending) {
  show('screen-ending');
  $('ending-title').textContent = ending.title;
  $('ending-body').textContent = ending.body;
  const f = $('ending-filter');
  f.textContent = ending.filterLine || '';
  f.className = ending.filterKind || '';
  $('settlement').innerHTML = ending.settlement
    .map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`)
    .join('');
}

async function yearLoop() {
  renderStatus();
  renderPlan();
  await new Promise((resolve) => {
    $('btn-run-year').onclick = () => {
      try {
        validateAllocation(state, alloc);
      } catch (err) {
        $('plan-error').textContent = err.message;
        return;
      }
      $('plan-error').textContent = '';
      $('plan-box').classList.add('hidden');
      resolve();
    };
  });
  const { logs, ending } = await playYear(state, alloc, askChoice);
  for (const l of logs) {
    if (l.kind === 'event' && document.querySelector(`#log p:last-child`)?.textContent === l.text)
      continue; // askChoice 已即時印出事件文字,避免重複
    addLog(l.kind, l.text);
    await sleep(650);
  }
  renderStatus();
  if (ending) {
    await sleep(1200);
    renderEnding(ending);
    return;
  }
  yearLoop();
}

$('btn-start').onclick = () => {
  state = createGame(Date.now() >>> 0);
  renderTalents();
  show('screen-talents');
};

$('btn-accept-talents').onclick = async () => {
  await runPrologue();
  addLog('info', '——本篇開始。從現在起,每一年的 12 個月,由你分配。');
  yearLoop();
};

$('btn-restart').onclick = () => {
  window.location.reload();
};
```

實作提醒:`playYear` 的 logs 含事件文字,但 `askChoice` 在等待選擇時已先把事件文字印上畫面——迴圈裡的去重檢查(比對上一行文字)就是為了這件事,保留它。

- [ ] **Step 4: Lint 與全測試**

Run: `npx eslint . && npx vitest run`
Expected: 全綠(ui.js 不在測試範圍,但必須過 lint)

- [ ] **Step 5: 手動驗證(smoke 整條流程)**

Run: `python3 -m http.server 8080 --directory /home/odafeng/surgeon-life &`,瀏覽器開 `http://localhost:8080`。逐項確認:

1. 開始畫面 →「開始人生」→ 天賦畫面,考試能力固定 9 顆點,其他隨機。
2. 序章逐行出現;18 歲聯考出現三個選項,任選一個都得到「你都填了醫學系」。
3. 25 歲出現規劃面板;把臨床減到 5 以下不可能(按鈕擋住);分配未滿 12 時「就這樣過這一年」不可按。
4. 26 歲必出現選科事件;選「別科」直接進結局「你提早看清了一切」。
5. 重開,選外科,連續玩幾年:狀態列數字有變化;事件選項可點;年度 log 逐行浮現。
6. 手機寬度(DevTools 375px)下版面不破。
7. 玩到任一結局:標題、內文、結算單、「再活一次」正常。
8. 瀏覽器 console 無紅字錯誤。

- [ ] **Step 6: Commit**

```bash
git add index.html style.css src/ui.js
git commit -m "feat: playable single-page UI"
```

---

### Task 11: README、部署說明、最終驗證

**Files:**

- Create: `README.md`

- [ ] **Step 1: 撰寫 `README.md`**

```markdown
# 外科醫師的一生

一個輕量的回合制人生選擇器遊戲。主角從高中生開始,走完(或走不完)
一個台灣外科醫師的一生。寫實,苦中帶淚。

## 玩法

- 序章(16-24 歲):你沒有選擇。18 歲的聯考,無論你選什麼理由,都會進醫學系。
- 本篇(25 歲起):每年一回合,把 12 個月分配到臨床/教學/研究/家庭/個人五軸。
- 天賦決定成長斜率;能力不一定換得到錢;沒有真正的完美結局。

## 開發

    npm install
    npm test          # Vitest
    npm run lint      # ESLint
    python3 -m http.server 8080   # 本機遊玩:開 http://localhost:8080

零建置:純 Vanilla JS ES modules。架構決策見 docs/adr/。

## 部署(GitHub Pages)

Repo Settings → Pages → Source 選 `main` branch 根目錄即可,無 build step。
```

- [ ] **Step 2: 最終全面驗證**

Run: `npx prettier --check . && npx eslint . && npx vitest run`
Expected: 三項全綠。任何一項紅就修到綠,再繼續。

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add readme with play and deploy instructions"
```

- [ ] **Step 4: 完成回報**

向使用者回報:功能清單、測試結果摘要、本機遊玩指令、GitHub Pages 部署步驟(需使用者自行建 GitHub repo 並 push——**不可代為 git push**)。

---

## Self-Review 紀錄

- Spec 覆蓋:序章蒙太奇+聯考假選擇(Task 10 runPrologue + events.js PROLOGUE)、五軸 12 月配置(Task 4/10)、天賦斜率(Task 5)、社交雙面刃(Task 5 malpracticeChance、Task 6 醫美/判決事件、Task 7 醫美結局分流)、能力薪水脫鉤(Task 5 settleMoney 測試明確驗證)、教職系統依陽明交大醫學院細則:歸類計分 300/400/500、教學 70 及格線、計畫申請紀錄/主持二年、博士以學位送審免計分門檻+研究 ×1.5(Task 5 settlePhd/settleGrant/settlePromotion/applyGrowth、Task 6 a_phd_offer/a_phd_peer/a_teaching_credit)、健康=壽命(Task 5/8)、自我濾鏡(Task 7)、感情進程鏈(Task 6 f_* 事件)、選科岔路為中性結局 another_path(Task 6/7/8)、結算單(Task 7)、CI/pre-commit/ADR(Task 1)、smoke(Task 9)。
- 型別一致性:`playYear(state, alloc, chooser)`、`chooser({id,text,choices},state)→index`、`decideEnding(state,cause)` 於 Task 7/8/9/10 簽名一致;effects/stats 合法鍵集中定義於 Task 6 測試。
- 已知簡化:醫糾機率注入每年至多一次;`once` 事件在 choices 分岔時不重複出現(含 `f_propose` 未標 once,允許「再等等」後隔年再遇)。
