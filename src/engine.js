import { createRng } from './rng.js';
import { rollTalents } from './talents.js';
import { EVENTS } from './events.js';
import { decideEnding } from './endings.js';

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

export async function playYear(state, alloc, chooser, onLog) {
  alloc = validateAllocation(state, alloc);
  state.alloc = alloc;
  const stage = getStage(state);
  const logs = [];
  const emit = async (entry) => {
    logs.push(entry);
    if (onLog) await onLog(entry);
  };
  await emit({ kind: 'year', text: `【${state.age} 歲・${stage.label}】` });
  applyGrowth(state, alloc);

  for (const e of pickEvents(state)) {
    if (e.once) state.used.push(e.id);
    const text = typeof e.text === 'function' ? e.text(state) : e.text;
    if (e.choices) {
      await emit({ kind: 'event', text });
      const choices = e.choices.filter((c) => !c.cond || c.cond(state));
      const idx = await chooser({ id: e.id, text, choices }, state);
      const c = choices[Math.max(0, Math.min(choices.length - 1, idx))];
      if (c.effects) applyEffects(state, c.effects);
      if (c.stats) applyStats(state, c.stats);
      if (c.set) c.set(state);
      await emit({ kind: 'choice', text: c.log });
    } else {
      if (e.effects) applyEffects(state, e.effects);
      if (e.stats) applyStats(state, e.stats);
      if (e.set) e.set(state);
      await emit({ kind: 'event', text: [text, e.log].filter(Boolean).join('\n') });
    }
    if (state.flags.exitNow) break;
  }

  const dead = settleHealth(state, alloc);
  if (dead) {
    state.ending = decideEnding(state, 'death');
    await emit({ kind: 'info', text: '你的身體,先於你的意志,停了下來。' });
    return { logs, ending: state.ending };
  }
  settleMoney(state);
  const phdLog = settlePhd(state, alloc);
  if (phdLog) await emit({ kind: 'info', text: phdLog });
  const grantLog = settleGrant(state, alloc);
  if (grantLog) await emit({ kind: 'info', text: grantLog });
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
  if (nextKey !== prevKey && STAGE_TRANSITION_LOGS[nextKey]) {
    await emit({ kind: 'info', text: STAGE_TRANSITION_LOGS[nextKey] });
  }
  if (state.age > 65) {
    state.ending = decideEnding(state, 'retire');
    return { logs, ending: state.ending };
  }
  return { logs, ending: null };
}
