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
