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
