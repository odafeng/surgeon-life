import { createRng } from './rng.js';
import { rollTalents } from './talents.js';
import { EVENTS } from './events.js';
import { decideEnding } from './endings.js';
import { initPeople, adjustBond } from './characters.js';
import { resolve, val } from './text.js';

export { resolve, val };

export const ALLOC_KEYS = ['clinical', 'teaching', 'research', 'family', 'personal'];

export const AXIS_LABELS = {
  clinical: '臨床',
  teaching: '教學',
  research: '研究',
  family: '家庭',
  personal: '個人',
};

// 配置以百分比計，總和 100。minClinicalPct 是制度給的下限，拖不動。
const STAGES = {
  pgy: {
    key: 'pgy',
    label: 'PGY',
    salary: 75,
    minClinicalPct: 50,
    clinicalMult: 0.8,
    teachingMult: 0.4,
    surgical: false,
    surgeriesPerMonth: 2,
  },
  resident: {
    key: 'resident',
    label: '外科住院醫師',
    salary: 95,
    minClinicalPct: 60,
    clinicalMult: 1.0,
    teachingMult: 1.0,
    surgical: true,
    surgeriesPerMonth: 8,
  },
  attending: {
    key: 'attending',
    label: '主治醫師',
    salary: 150,
    minClinicalPct: 20,
    clinicalMult: 0.7,
    teachingMult: 1.0,
    surgical: true,
    surgeriesPerMonth: 10,
  },
  aesthetic: {
    key: 'aesthetic',
    label: '醫美診所',
    salary: 0, // 由社交能力決定，見 settleMoney
    minClinicalPct: 0,
    clinicalMult: 0,
    teachingMult: 0,
    surgical: false,
    surgeriesPerMonth: 0,
  },
};

// 每軸的邊際遞減轉折點：超過 knee 之後，多投入只剩 tail 倍的效果。
// 個人軸的 knee 最低——「休息」有效但無法無限堆疊，這是消滅支配策略的關鍵。
const DIMINISHING = {
  clinical: { knee: 45, tail: 0.4 },
  teaching: { knee: 20, tail: 0.35 },
  research: { knee: 40, tail: 0.4 },
  family: { knee: 25, tail: 0.3 },
  personal: { knee: 18, tail: 0.25 },
};

/**
 * 開一局新的人生。
 * gender 不是外觀選項——女性外科醫師的訓練期會撞上生育窗口，
 * 那條軌跡有自己的事件、自己的代價，見 events/female.js。
 */
export function createGame(seed, gender = 'm') {
  const rng = createRng(seed);
  return {
    age: 25,
    gender,
    career: 'surgery',
    rank: 'none',
    talents: rollTalents(rng),
    attrs: { clinical: 5, teaching: 0, papers: 0, self: 50, health: 88, familyBond: 50, money: 60 },
    family: {
      stage: 'single',
      kids: 0, // 人數。孩子的細節在 children，這裡保留數字讓既有事件與支出公式照用
      children: [], // [{ bornAt }]，用來算孩子現在幾歲
      floor: 0, // 家庭時間的下限。承諾一旦許下，時間就被鎖住了
      invested: 0, // 累計「有給家庭時間」的年數。感情要的是持續出現，不是某一年突然投入
      neglect: 0, // 連續幾年沒給
    },
    grants: { applied: false, yearsPI: 0 },
    flags: {},
    people: initPeople(),
    memories: [], // 定義性時刻，結局會把它們唸回給你聽
    used: [],
    recent: [], // 最近抽過的事件，見 pickEvents 的冷卻機制
    stats: { surgeries: 0, livesSaved: 0, lawsuits: 0, missedDinners: 0, debtYears: 0 },
    alloc: null,
    ending: null,
    rng,
  };
}

/**
 * 舊存檔補記已經演過的一次性事件。
 *
 * 把一個事件標成 once 只會影響之後的抽籤——已經存在的存檔裡，
 * state.used 從來沒有記過它的 id，所以它會繼續重播。試玩者的存檔在 32 歲與
 * 43 歲看過那封三小時退稿信，載入修好的版本之後 51 歲又演了第三次。
 *
 * 年誌留著每一幕的正文，所以可以反過來回填。比對用完整正文而不是片段——
 * 今天已經有四次是我用太短的字串量到根本沒發生的事。
 */
export function backfillUsed(state, journal = []) {
  const said = journal.map((e) => e && e.text).filter((x) => typeof x === 'string');
  const added = [];
  for (const e of EVENTS) {
    if (!e.once || state.used.includes(e.id)) continue;
    const text = resolve(state, val(e.text, state));
    if (typeof text !== 'string' || text.length < 12) continue;
    if (said.some((line) => line.includes(text))) {
      state.used.push(e.id);
      added.push(e.id);
    }
  }
  return added;
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

/** 邊際遞減後的有效百分比。 */
export function effective(key, pct) {
  const { knee, tail } = DIMINISHING[key];
  return Math.min(pct, knee) + Math.max(0, pct - knee) * tail;
}

/** 有效百分比換算成「等效月數」，讓既有的敘事數字（刀量、博士進度）維持原本的量級。 */
function months(key, pct) {
  return (effective(key, pct) / 100) * 12;
}

/**
 * 健康上限隨年齡下降。
 * 這條線是「個人拉滿」不再無敵的第二道保險：休息能讓你貼著上限走，但上限自己會掉。
 */
export function healthCap(age) {
  return clamp(100 - Math.max(0, age - 32) * 1.0);
}

export function validateAllocation(state, alloc) {
  const stage = getStage(state);
  const out = {};
  for (const k of ALLOC_KEYS) {
    const v = alloc[k];
    if (!Number.isInteger(v) || v < 0)
      throw new Error(`「${AXIS_LABELS[k]}」必須是 0 以上的整數百分比`);
    out[k] = v;
  }
  const sum = ALLOC_KEYS.reduce((s, k) => s + out[k], 0);
  if (sum !== 100) throw new Error(`五項加起來必須是 100%，你分配了 ${sum}%`);
  if (out.clinical < stage.minClinicalPct)
    throw new Error(`${stage.label}的臨床不得低於 ${stage.minClinicalPct}%——這不是你能選的`);
  // 制度給你臨床下限，承諾給你家庭下限。兩個都不是你當下能反悔的。
  const floor = state.family.floor || 0;
  if (out.family < floor) throw new Error(`你答應過的事，家庭不得低於 ${floor}%`);
  return out;
}

/**
 * 把配置校正成當前階段合法的樣子。
 * 換階段時臨床下限會變（住院醫師 60%，主治只要 20%），
 * 沿用去年的配置可能瞬間變成違法——快轉時特別容易踩到。
 */
export function conformAllocation(state, alloc) {
  const min = getStage(state).minClinicalPct;
  const floor = state.family.floor || 0;
  const out = { ...alloc };
  // 按比例跟每一軸拿，不要照順序把第一個捐贈者抽乾。
  // 原本 research 排第一順位，所以「臨床下限提高」或「家庭承諾生效」時
  // 它會被抽到 0 而 teaching、personal 一動不動——研究軸再也回不來，
  // 整條學術線就此對玩家消失。
  const raise = (key, target, donors) => {
    if (out[key] >= target) return;
    const pool = donors.reduce((sum, k) => sum + out[k], 0);
    if (pool <= 0) return;
    const need = Math.min(target - out[key], pool);
    out[key] += need;

    // 先照比例取整數，餘數用最大餘數法補——直接照順序補會把偏誤放回去。
    const want = donors.map((k) => ({ k, exact: (out[k] / pool) * need }));
    const take = new Map(want.map((w) => [w.k, Math.min(out[w.k], Math.floor(w.exact))]));
    let left = need - [...take.values()].reduce((a, b) => a + b, 0);
    for (const w of [...want].sort((a, b) => (b.exact % 1) - (a.exact % 1) || b.exact - a.exact)) {
      if (left <= 0) break;
      if (take.get(w.k) < out[w.k]) {
        take.set(w.k, take.get(w.k) + 1);
        left -= 1;
      }
    }
    for (const [k, v] of take) out[k] -= v;
  };

  raise('clinical', min, ['research', 'teaching', 'personal', 'family']);
  raise('family', floor, ['research', 'teaching', 'personal']);
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

export function applyBond(state, bond) {
  for (const [k, v] of Object.entries(bond)) adjustBond(state, k, v);
}

/**
 * 記下一個定義性時刻。結局的「你記得的事」會把它們原樣唸回來——
 * 那不是統計數字，是你自己做過的決定。
 */
export function remember(state, text) {
  if (text) state.memories.push({ age: state.age, text: resolve(state, text) });
}

/**
 * 讓 family.kids（人數）與 family.children（出生紀錄）保持一致。
 * 任何事件都可能加減人數，但孩子的成長劇情要靠出生年份算年紀——
 * 少了紀錄，那些劇情就永遠不會發生。
 */
export function normaliseFamily(state) {
  const f = state.family;
  if (!f.children) f.children = [];
  while (f.children.length < f.kids) f.children.push({ bornAt: state.age });
  if (f.children.length > f.kids) f.children.length = f.kids;
}

export function applyGrowth(state, alloc) {
  const stage = getStage(state);
  const t = state.talents;
  const a = state.attrs;

  // 臨床：荒廢會退步。主治的下限只有 20%，所以「靠下限混」會讓刀越開越差。
  // 鏽蝕與現有技能成正比——頂尖的手最難維持，這也是為什麼名醫不能離開刀房太久。
  const clinicalGain = months('clinical', alloc.clinical) * (0.4 + t.dexterity * 0.16);
  const rust = alloc.clinical < 25 ? Math.min(8, (25 - alloc.clinical) * 0.018 * a.clinical) : 0;
  a.clinical = clamp(a.clinical + clinicalGain * stage.clinicalMult - rust);
  if (state.career === 'aesthetic') a.clinical = clamp(a.clinical - 3);

  a.teaching = clamp(
    a.teaching +
      months('teaching', alloc.teaching) * (0.5 + t.charisma * 0.15) * stage.teachingMult,
  );
  a.papers +=
    months('research', alloc.research) *
    (2 + t.research * 1.2) *
    (state.flags.phd === 'done' ? 1.5 : 1);

  // 感情不會停在原地。你不投入，它就往回走，而且越久走得越快——
  // 沒有這一條的話，一輩子只給 8% 的人也能維持一段不痛不癢的關係。
  const drift =
    state.family.stage !== 'single' && alloc.family < Math.max(15, state.family.floor || 0)
      ? 5 + state.family.neglect * 2
      : 0;
  a.familyBond = clamp(
    a.familyBond +
      months('family', alloc.family) * 3 -
      drift -
      (state.family.kids > 0 && alloc.family < 25 ? 12 : 0) -
      (alloc.family === 0 ? 8 : 0),
  );
  // 單身又沒有小孩時，家庭時間給的是原生家庭，那條線有上限——
  // 沒有自己的家的人，不該有滿格的家庭。
  if (state.family.stage === 'single' && state.family.kids === 0)
    a.familyBond = Math.min(a.familyBond, 62);
  a.self = clamp(
    a.self + months('personal', alloc.personal) * 2.5 - (alloc.personal === 0 ? 3 : 0),
  );

  // 感情進程看的是「你有沒有一直在」，不是某一年的數字。
  // 門檻是 15% 或你答應過的下限，取大的——做到自己答應的事就算有在經營。
  const need = Math.max(15, state.family.floor || 0);
  const hasSomeone = state.family.stage !== 'single' || state.family.kids > 0;
  if (alloc.family >= need) {
    state.family.invested += 1;
    state.family.neglect = 0;
  } else if (hasSomeone) {
    // 還沒有人的時候不算疏忽——你沒有辜負任何人
    state.family.neglect += 1;
  }

  // 只有在有人等你的時候才算「錯過」。單身到底、沒有孩子的人，
  // 結算單上不該出現「錯過的家庭晚餐 4902」——他沒有讓任何人等過。
  // neglect 早就用 hasSomeone 判斷了，這一行卻在判斷外面自己加了四十年。
  if (hasSomeone) {
    state.stats.missedDinners += Math.round(((100 - alloc.family) / 100) * 12 * 10);
  }
  if (stage.surgical) {
    const ops = Math.round(months('clinical', alloc.clinical) * stage.surgeriesPerMonth);
    state.stats.surgeries += ops;
    state.stats.livesSaved += Math.round(ops * 0.1);
  }
}

/** 今年健康的淨變化（不套用，供預告與結算共用）。 */
export function healthDelta(state, alloc) {
  const ageBase = 1.2 + (state.age >= 40 ? 1.6 : 0) + (state.age >= 55 ? 2.0 : 0);
  const factor = 1.5 - state.talents.constitution * 0.08;
  const load = alloc.clinical + alloc.research;
  const overwork = (Math.max(0, load - 55) / 100) * 14;
  // 係數要夠大，才抵得過事件的零星扣血；但個人軸的 knee 很低（18%），
  // 所以拉滿也只換到約 15 點回血，買不到不死之身。
  const recovery = (effective('personal', alloc.personal) / 100) * 40;
  return recovery - (ageBase + overwork) * factor;
}

/**
 * 事件每年平均扣掉的健康。
 * 這不是設計出來的數字，是量出來的：40 條完整職涯、1256 個年份，
 * 把實際變化減去結算公式的預期，平均 −3.4。少了這一項，預告會過度樂觀，
 * 個人 8% 的玩家會在沒有任何警告的情況下死在五十歲。
 */
const EVENT_HEALTH_DRAG = 3.4;

/**
 * 照這個配置一路走下去，哪一年會倒。沒有就回 null。
 *
 * 用的是同一套 healthDelta 與 healthCap，所以它不會跟結算說謊。
 * 事件傷害用上面那個平均值代入——那是平均，運氣差的人會更早。
 */
/**
 * 晚年每年的健康淨變化（已扣掉事件的平均傷害）。
 *
 * projectCollapse 只回答「會不會倒」，但它是一條平均線。
 * 個人 15% 的人每年淨掉 1.7 點，從 88 掉三十二年還剩 34——預告說活得到退休，
 * 實測卻有 27/40 倒在工作中，因為事件的變異會把貼著地板走的人推下去。
 * 淨值為負代表你每年都在退，撐不撐得到只剩運氣。這個數字要講給玩家聽。
 */
export function annualSlack(state, alloc) {
  return healthDelta({ age: 65, talents: state.talents }, alloc) - EVENT_HEALTH_DRAG;
}

export function projectCollapse(state, alloc) {
  let health = state.attrs.health;
  const probe = { age: state.age, talents: state.talents };
  for (let age = state.age; age <= 65; age++) {
    probe.age = age;
    const delta = healthDelta(probe, alloc) - EVENT_HEALTH_DRAG;
    health = Math.max(0, Math.min(healthCap(age), health + delta));
    if (health <= 0) return age;
  }
  return null;
}

export function settleHealth(state, alloc) {
  const cap = healthCap(state.age);
  state.attrs.health = Math.max(0, Math.min(cap, state.attrs.health + healthDelta(state, alloc)));
  return state.attrs.health <= 0;
}

const RANK_BONUS = { none: 0, vs: 0, assistant: 10, associate: 20, professor: 30 };

/**
 * 今年的健保點值。每年浮動，你無法控制，而你的收入綁在上面。
 * 一年只擲一次，存進 state，讓預告和結算看到同一個數字。
 */
export function rollPointValue(state) {
  state.pointValue = Number((0.72 + state.rng.next() * 0.23).toFixed(2));
  return state.pointValue;
}

/**
 * 年收入。主治的績效與「臨床投入量 × 點值」掛鉤——
 * 勞動量換得到錢，技術換不到：刀開得漂不漂亮，不在這條公式裡。
 */
export function yearlyIncome(state, alloc = state.alloc) {
  const stage = getStage(state);
  const pv = state.pointValue ?? 0.82;
  if (stage.key === 'aesthetic') {
    const busy = alloc ? effective('clinical', alloc.clinical) / 100 : 0.4;
    return Math.round(70 + state.talents.social * 42 + busy * 180);
  }
  const base = stage.salary + RANK_BONUS[state.rank];
  const load = alloc ? effective('clinical', alloc.clinical) / 100 : 0.4;
  const perf = stage.key === 'attending' ? load * 300 * pv : load * 40 * pv;
  return Math.round(base + perf);
}

/**
 * 年支出。房貸、孩子、逐漸老去的父母——一年比一年重，
 * 而且和你開幾台刀無關。
 */
/**
 * 一個孩子每年吃掉多少。這條線一路往上走：保母、安親、補習、學費、出國。
 * 你賺得比別人多，但你的錢也不是你的。
 */
export function childCost(state) {
  return (state.family.children || []).reduce((sum, c) => {
    const age = state.age - c.bornAt;
    if (age < 0) return sum;
    if (age <= 6) return sum + 26; // 保母與幼兒園
    if (age <= 12) return sum + 34; // 安親班與才藝
    if (age <= 18) return sum + 48; // 補習與升學
    if (age <= 24) return sum + 64; // 大學與研究所
    return sum + 10; // 成年之後偶爾還是要貼
  }, 0);
}

export function yearlyExpenses(state) {
  return Math.round(
    92 +
      childCost(state) +
      (state.family.stage === 'married' ? 34 : 0) +
      Math.max(0, state.age - 30) * 3.4 +
      (state.flags.parentCare ? 96 : 0) + // 父母長照，由事件觸發後每年扣
      (state.flags.beingDrained ? 165 : 0), // 有人在你身上花錢，而你選擇不去細想
  );
}

/**
 * 結算存款。負債會滾 8% 利息並累計負債年數——存款終於是個會咬人的限制，
 * 而不是狀態列上一個變紅的數字。
 */
export function settleMoney(state) {
  state.attrs.money += yearlyIncome(state, state.alloc) - yearlyExpenses(state);
  if (state.attrs.money < 0) {
    state.attrs.money = Math.round(state.attrs.money * 1.08);
    state.stats.debtYears += 1;
  }
  return state.attrs.money;
}

export function settlePhd(state, alloc) {
  if (state.flags.phd !== 'studying') return null;
  state.attrs.health = Math.max(0, state.attrs.health - 2); // 白天開刀，晚上上課
  state.flags.phdProgress += months('research', alloc.research);
  if (state.flags.phdProgress < 15) return null;
  state.flags.phd = 'done';
  return '你通過口試，拿到博士學位。口試委員最後一個問題是：「畢業後，你打算什麼時候做研究？」你看著自己下週的刀表，笑而不答。';
}

// 計畫的申請與結果由 actions.js 的 act_grant 負責，這裡沒有第二條路。
//
// 原本 playYear 每年會無條件再跑一次 settleGrant：只要研究 ≥ 25% 就自動送件、
// 自己擲一次、自己加 yearsPI。於是同一年裡玩家先在行動面板看到「通過了，累計 2 年」，
// 進事件之後又看到「未通過，創新性不足」——兩套系統各說各話，年資還會重複累計。
// 而且不按那顆按鈕、光把研究拉到 25% 就會自動送件，讓那個行動失去意義。

export function settlePromotion(state) {
  if (state.career !== 'surgery' || getStage(state).key !== 'attending') return null;
  const a = state.attrs;
  const phd = state.flags.phd === 'done';
  if (state.rank === 'none') {
    state.rank = 'vs';
    return '你升上主治醫師。恭喜——從今天起，你的薪水和健保點值綁在一起了。';
  }
  if (a.teaching < 70) return null; // 教學服務審查 70 分及格，未達不得送件
  if (state.rank === 'vs' && (a.papers >= 300 || phd)) {
    state.rank = 'assistant';
    return phd
      ? '你以博士學位送審，升等通過：助理教授。學位論文充當代表著作，歸類計分的門檻與你無關——細則寫得明白：「以學位送審者，不在此限。」'
      : '外審五人回來四份「優良」，升等通過：助理教授。三百點歸類計分，是你十年的夜晚。月薪增加一萬元——你的手術技能，不在任何一張評分表上。';
  }
  if (state.rank === 'assistant' && a.papers >= 400 && state.grants.applied) {
    state.rank = 'associate';
    return '升等通過：副教授。院長在頒聘書時說「繼續努力」，你想不起他上次進開刀房是哪一年。';
  }
  if (state.rank === 'associate' && a.papers >= 500 && state.grants.yearsPI >= 2) {
    state.rank = 'professor';
    return '升等通過：教授。五百點計分、兩年計畫主持、外審五人全數通過——這是這個體系能給你的最高肯定，與你救過多少人無關。';
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

/** 升等路上的下一個門檻，用於配置盤的進度提示。 */
/**
 * 下一關升等，以及每一條還缺什麼。
 *
 * 之前這裡只回報歸類計分，但教授還要「計畫主持滿 2 年」、副教授還要「部級計畫申請紀錄」。
 * 試玩者累積到 848 點仍是副教授，看著配置盤上的「848 / 500」完全不知道自己卡在哪——
 * 他不是選錯，是看不到規則。需求集中在這裡產生，配置盤與狀態頁都從這份清單渲染。
 */
export function nextPromotionGate(state) {
  if (state.career !== 'surgery' || getStage(state).key !== 'attending') return null;
  const a = state.attrs;
  const need = (label, met, detail) => ({ label, met, detail });
  const teaching = need('教學服務 70 分', a.teaching >= 70, `目前 ${Math.round(a.teaching)}`);
  const score = (n) => need(`歸類計分 ${n} 點`, a.papers >= n, `目前 ${Math.round(a.papers)}`);

  if (state.rank === 'vs') {
    const byPhd = state.flags.phd === 'done';
    const s = score(300);
    return {
      label: '助理教授',
      papers: 300,
      needs: [byPhd ? need('歸類計分 300 點', true, '以博士學位送審，不受此限') : s, teaching],
    };
  }
  if (state.rank === 'assistant')
    return {
      label: '副教授',
      papers: 400,
      needs: [
        score(400),
        teaching,
        need('部級計畫申請紀錄', state.grants.applied, state.grants.applied ? '已有' : '還沒送過'),
      ],
    };
  if (state.rank === 'associate')
    return {
      label: '教授',
      papers: 500,
      needs: [
        score(500),
        teaching,
        need('計畫主持滿 2 年', state.grants.yearsPI >= 2, `目前 ${state.grants.yearsPI} 年`),
      ],
    };
  return null;
}

/**
 * 配置的後果預告。玩家必須能在按下確認之前預見代價，
 * 否則配置就不是決策，只是猜謎。
 */
export function forecast(state, alloc) {
  const chips = [];
  const warnings = [];
  const a = state.attrs;

  const dh = healthDelta(state, alloc);
  const cap = healthCap(state.age + 1);
  const nextHealth = Math.max(0, Math.min(cap, a.health + dh));
  // 顯示的是「實際會變成多少」，不是公式算出來的原始增益。
  // 健康上限隨年齡下降，所以三十幾歲之後常常出現「休息回了 4.2 點、
  // 但上限也降了」——原本 chip 寫 +4.2 而後面接 100 → 98，兩個數字都對，
  // 放在一起卻在說謊。上限咬住的時候要講出來，玩家才知道那不是 bug。
  const netHealth = nextHealth - a.health;
  const cappedByAge = dh > 0 && nextHealth < a.health + dh - 0.05;
  chips.push({
    label: '健康',
    value: `${netHealth >= 0 ? '+' : '−'}${Math.abs(netHealth).toFixed(1)}`,
    detail: cappedByAge
      ? `${Math.round(a.health)} → ${Math.round(nextHealth)}（上限 ${Math.round(cap)}）`
      : `${Math.round(a.health)} → ${Math.round(nextHealth)}`,
    good: netHealth >= 0,
  });

  const mp = malpracticeChance(state);
  if (mp > 0) chips.push({ label: '醫糾機率', value: `${Math.round(mp * 100)}%`, good: mp < 0.12 });

  const gate = nextPromotionGate(state);
  if (gate) {
    const gain =
      months('research', alloc.research) *
      (2 + state.talents.research * 1.2) *
      (state.flags.phd === 'done' ? 1.5 : 1);
    chips.push({
      label: '歸類計分',
      value: `+${Math.round(gain)}`,
      detail: `${Math.round(a.papers)} / ${gate.papers}`,
      good: true,
    });
    // 缺什麼就講什麼。只顯示計分進度的話，計分早就破表的人會卡在原地十年還不知道為什麼。
    const missing = gate.needs.filter((n) => !n.met);
    if (missing.length)
      warnings.push(
        `升等到${gate.label}還缺：${missing.map((n) => `${n.label}（${n.detail}）`).join('、')}。`,
      );
  }

  const net = yearlyIncome(state, alloc) - yearlyExpenses(state);
  chips.push({
    label: '年結餘',
    value: `${net >= 0 ? '+' : ''}${Math.round(net)} 萬`,
    detail: `收 ${yearlyIncome(state, alloc)} ／ 支 ${yearlyExpenses(state)}`,
    good: net >= 0,
  });
  if (state.pointValue && getStage(state).key !== 'aesthetic')
    chips.push({
      label: '健保點值',
      value: state.pointValue.toFixed(2),
      good: state.pointValue >= 0.85,
    });

  if (nextHealth <= 0) warnings.push('照這個配置，你活不過今年。');
  else if (dh < 0 && nextHealth < 30)
    warnings.push(
      `健康只剩 ${Math.round(nextHealth)}，再撐約 ${Math.max(1, Math.ceil(nextHealth / -dh))} 年就會倒下。`,
    );
  // 舊的警告只在個人 ≤ 5% 才出現，但實測個人 8% 一樣是全滅，中位數死在 50 歲——
  // 警告來得太晚。門檻不寫死（它隨體質與年齡浮動），改成把同一套結算往前推到底。
  else {
    const fallAt = projectCollapse(state, alloc);
    if (fallAt !== null)
      warnings.push(`照這個配置一路走下去，你會在 ${fallAt} 歲倒下，走不到退休。`);
    else {
      // 沒有算出倒下，不代表安全。平均線撐得過，變異不一定。
      const slack = annualSlack(state, alloc);
      if (slack < 0)
        warnings.push(
          `這個配置撐得到退休，但晚年每年淨掉 ${Math.abs(slack).toFixed(1)} 點健康——沒有餘裕，運氣差一點就撐不到。`,
        );
    }
  }
  if (alloc.personal <= 5 && dh < 0) warnings.push('個人幾乎歸零：沒有任何回血來源。');
  if (state.family.kids > 0 && alloc.family < 25) warnings.push('家庭低於 25%：孩子那邊會出事。');
  if (a.money < 0)
    warnings.push(`存款是負的，今年利息會再吃掉 ${Math.round(-a.money * 0.08)} 萬。`);
  if (alloc.clinical < 25 && getStage(state).surgical)
    warnings.push('臨床低於 25%：刀會生疏，技能開始退步。');

  return { chips, warnings };
}

/**
 * 剛看過的事件不再抽。沒有這條的話，池子小的階段（例如醫美）會連年跳出同一則新聞，
 * 玩家看到的不是「人生」，是壞掉的跑馬燈。
 */
export const RECENT_WINDOW = 16;

export function pickEvents(state) {
  const stageKey = getStage(state).key;
  const rng = state.rng;
  const base = EVENTS.filter(
    (e) =>
      !e.special &&
      e.stages.includes(stageKey) &&
      !(e.once && state.used.includes(e.id)) &&
      (!e.cond || e.cond(state)),
  );
  const picked = base.filter((e) => e.forced && e.forced(state));
  if (rng.chance(malpracticeChance(state))) {
    picked.push(EVENTS.find((e) => e.id === 'a_lawsuit'));
  }

  // 有 forced 屬性的事件只走 forced 通道，永不進隨機池（否則沒被告也可能抽到判決）
  const recent = state.recent || [];
  const fresh = base.filter((e) => !e.forced && !recent.includes(e.id));
  // 冷卻期把池子清空時就放寬，寧可重複也不能沒有事件
  const all = fresh.length > 0 ? fresh : base.filter((e) => !e.forced);

  // 人物弧線是故事的骨幹，不能跟三百個一般事件搶同一個抽獎機——
  // 只靠運氣的話，一輩子都遇不到那台你替恩師開的刀。
  // 每年先保證推進一幕人物戲，剩下的名額才給一般事件。
  const spine = all.filter((e) => e.priority);
  const pool = all.filter((e) => !e.priority);
  if (spine.length > 0) {
    const total = spine.reduce((s2, e) => s2 + (e.weight || 1), 0);
    let r = rng.next() * total;
    let idx = spine.findIndex((e) => (r -= e.weight || 1) < 0);
    if (idx === -1) idx = spine.length - 1;
    picked.push(spine[idx]);
  }

  for (let i = 0; i < 2 && pool.length > 0; i++) {
    const total = pool.reduce((s, e) => s + (e.weight || 1), 0);
    let r = rng.next() * total;
    let idx = pool.findIndex((e) => (r -= e.weight || 1) < 0);
    if (idx === -1) idx = pool.length - 1;
    picked.push(pool.splice(idx, 1)[0]);
  }

  state.recent = [...recent, ...picked.map((e) => e.id)].slice(-RECENT_WINDOW);
  return picked;
}

const STAGE_TRANSITION_LOGS = {
  resident: '你成為外科住院醫師。值班表寄來了：這個月，你有十一天不會看到太陽下山。',
  // 升等的規則要在第一年就講清楚。看不到門檻的人不是做了選擇，是十年後才發現有這回事。
  attending:
    '你升上主治醫師。恭喜——從今天起，你的薪水和健保點值綁在一起了。人事室另外給你一張表：升等看歸類計分與教學服務分數，第一關是助理教授，300 點。',
};

const BANKRUPT_LIMIT = -400;

export async function playYear(state, alloc, chooser, onLog) {
  alloc = validateAllocation(state, alloc);
  state.alloc = alloc;
  const stage = getStage(state);
  const logs = [];
  const emit = async (entry) => {
    logs.push(entry);
    if (onLog) await onLog(entry);
  };
  rollPointValue(state);
  await emit({ kind: 'year', text: `【${state.age} 歲・${stage.label}】` });
  applyGrowth(state, alloc);

  for (const e of pickEvents(state)) {
    // 條件是抽籤那一刻算的，但事件是一幕一幕演的——前一幕可能讓後一幕失去前提。
    // （孩子都出生了，才問「要不要有個孩子」。）演之前再驗一次，不成立就跳過。
    if (e.cond && !e.cond(state)) continue;
    if (e.forced && !e.forced(state)) continue;
    if (e.once) state.used.push(e.id);
    const text = resolve(state, val(e.text, state));
    if (e.choices) {
      await emit({ kind: 'event', text, scene: e.scene, mood: e.mood });
      // 玩家看得到的每一個文字欄位都要過同一道處理：先解析函式，再換代稱。
      // 少過一個就會在卡片上看到 {她} 這種東西。
      const choices = e.choices
        .filter((c) => !c.cond || c.cond(state))
        .map((c) => ({
          ...c,
          label: resolve(state, val(c.label, state)),
          hint: resolve(state, val(c.hint, state)),
        }));
      const idx = await chooser({ id: e.id, text, choices, scene: e.scene, mood: e.mood }, state);
      const c = choices[Math.max(0, Math.min(choices.length - 1, idx))];
      if (c.effects) applyEffects(state, c.effects);
      if (c.stats) applyStats(state, c.stats);
      if (c.bond) applyBond(state, c.bond);
      if (c.memory) remember(state, val(c.memory, state));
      if (c.set) c.set(state);
      await emit({ kind: 'choice', text: resolve(state, val(c.log, state)) });
    } else {
      if (e.effects) applyEffects(state, e.effects);
      if (e.stats) applyStats(state, e.stats);
      if (e.bond) applyBond(state, e.bond);
      if (e.memory) remember(state, val(e.memory, state));
      if (e.set) e.set(state);
      await emit({
        kind: 'event',
        text: [text, resolve(state, val(e.log, state))].filter(Boolean).join('\n'),
        scene: e.scene,
        mood: e.mood,
      });
    }
    if (state.flags.exitNow) break;
  }

  normaliseFamily(state);

  const dead = settleHealth(state, alloc);
  if (dead) {
    state.ending = decideEnding(state, 'death');
    await emit({ kind: 'info', text: '你的身體，先於你的意志，停了下來。' });
    return { logs, ending: state.ending };
  }

  const money = settleMoney(state);
  if (money < BANKRUPT_LIMIT && state.career === 'surgery') {
    state.career = 'aesthetic';
    state.flags.forcedAesthetic = true;
    state.flags.leftAt = state.age; // 道別那幾幕靠這個，見 events/leaving.js
    await emit({
      kind: 'info',
      text: '銀行的催繳電話打到護理站。你在停車場坐了半小時，然後撥了那個一直壓在鍵盤下的號碼——醫美診所那邊說，明天就能上工。這不是選擇，是算術。',
    });
  }

  const phdLog = settlePhd(state, alloc);
  if (phdLog) await emit({ kind: 'info', text: phdLog });
  const promo = settlePromotion(state);
  if (promo) await emit({ kind: 'info', text: promo });

  if (state.flags.exitNow) {
    state.career = 'exited';
    state.ending = decideEnding(state, state.flags.exitCause);
    return { logs, ending: state.ending };
  }

  const prevKey = getStage(state).key;
  state.age += 1;
  const nextKey = getStage(state).key;
  // 主治身分在跨進那一年的當下就成立，不是等年底結算才成立——
  // 否則「你當主治的第一台刀」會演在「你升上主治醫師」前面。
  if (nextKey === 'attending' && prevKey !== 'attending' && state.career === 'surgery') {
    if (state.rank === 'none') state.rank = 'vs';
  }
  if (nextKey !== prevKey && STAGE_TRANSITION_LOGS[nextKey]) {
    await emit({ kind: 'info', text: STAGE_TRANSITION_LOGS[nextKey] });
  }
  if (state.age > 65) {
    state.ending = decideEnding(state, 'retire');
    return { logs, ending: state.ending };
  }
  return { logs, ending: null };
}
