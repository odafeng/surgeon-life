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
    s.alloc = alloc(60, 0, 20, 10, 10);
    const ids = pickEvents(s).map((e) => e.id);
    expect(ids).toContain('pgy_specialty');
  });

  it('never picks the same once-event twice', () => {
    const s = createGame(1);
    s.age = 26;
    s.used.push('pgy_specialty');
    s.alloc = alloc(60, 0, 20, 10, 10);
    expect(pickEvents(s).map((e) => e.id)).not.toContain('pgy_specialty');
  });
});

describe('playYear', () => {
  it('advances one year and returns logs', async () => {
    const s = createGame(1);
    const { logs, ending } = await playYear(s, alloc(60, 0, 20, 10, 10), first);
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
    const { ending } = await playYear(s, alloc(60, 0, 20, 10, 10), leaveSurgery);
    expect(ending).not.toBeNull();
    expect(ending.id).toBe('another_path');
  });

  it('a studying attending accumulates phd progress from the research share', async () => {
    const s = createGame(1);
    s.age = 36;
    s.rank = 'vs';
    s.flags.phd = 'studying';
    s.flags.phdProgress = 0;
    await playYear(s, alloc(30, 0, 50, 10, 10), first);
    expect(s.flags.phdProgress).toBeCloseTo(5.28, 2); // 研究 50% → 有效 44% → 5.28 等效月
  });

  it('death mid-career produces the death ending', async () => {
    const s = createGame(1);
    s.age = 45;
    s.rank = 'vs';
    s.attrs.health = 2;
    s.talents.constitution = 1;
    const { ending } = await playYear(s, alloc(80, 0, 20, 0, 0), first);
    expect(ending).not.toBeNull();
    expect(ending.id).toBe('no_self_heal');
  });

  it('reaching 66 retires the player', async () => {
    const s = createGame(1);
    s.age = 65;
    s.rank = 'vs';
    s.attrs.health = 90;
    const { ending } = await playYear(s, alloc(20, 20, 20, 20, 20), first);
    expect(ending).not.toBeNull();
    expect(['retire', 'ordinary', 'legend', 'no_or', 'laser', 'rent']).toContain(ending.id);
  });

  it('first attending year logs the vs promotion', async () => {
    const s = createGame(1);
    s.age = 32;
    const { logs } = await playYear(s, alloc(50, 20, 20, 5, 5), first);
    expect(logs.some((l) => l.text.includes('主治醫師'))).toBe(true);
    expect(s.rank).toBe('vs');
  });
});
