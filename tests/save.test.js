import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from '../src/save.js';
import { createGame, playYear, getStage, conformAllocation, ALLOC_KEYS } from '../src/engine.js';

const first = async () => 0;

function planFor(state) {
  const min = getStage(state).minClinicalPct;
  const a = { clinical: min, teaching: 0, research: 0, family: 0, personal: 0 };
  let left = 100 - min;
  const order = ['personal', 'family', 'research', 'teaching', 'clinical'];
  for (const k of order) {
    const take = Math.min(left, 20);
    a[k] += take;
    left -= take;
    if (left <= 0) break;
  }
  a.clinical += left;
  // 臨床下限與家庭承諾下限都要顧到
  const out = conformAllocation(state, a);
  const sum = ALLOC_KEYS.reduce((acc, k) => acc + out[k], 0);
  out.personal += 100 - sum;
  return out;
}

async function playN(state, n) {
  for (let i = 0; i < n; i++) {
    const { ending } = await playYear(state, planFor(state), first);
    if (ending) return;
  }
}

describe('存檔與讀檔', () => {
  it('序列化之後不含函式，可以 JSON 化', () => {
    const s = createGame(7);
    const payload = serialize(s);
    expect(payload.state.rng).toBeUndefined();
    expect(typeof payload.rngState).toBe('number');
    expect(() => JSON.stringify(payload)).not.toThrow();
  });

  it('讀檔後的屬性與存檔當下完全一致', async () => {
    const s = createGame(11);
    await playN(s, 6);
    const restored = deserialize(JSON.parse(JSON.stringify(serialize(s))));
    expect(restored.age).toBe(s.age);
    expect(restored.attrs).toEqual(s.attrs);
    expect(restored.stats).toEqual(s.stats);
    expect(restored.talents).toEqual(s.talents);
    expect(restored.used).toEqual(s.used);
    expect(restored.recent).toEqual(s.recent);
  });

  it('讀檔後的亂數序列與沒存檔繼續玩時一模一樣', async () => {
    const original = createGame(23);
    await playN(original, 5);

    // 分岔：一邊直接玩下去，一邊先存讀檔再玩下去
    const viaSave = deserialize(JSON.parse(JSON.stringify(serialize(original))));
    await playN(original, 8);
    await playN(viaSave, 8);

    expect(viaSave.age).toBe(original.age);
    expect(viaSave.attrs).toEqual(original.attrs);
    expect(viaSave.stats).toEqual(original.stats);
    expect(viaSave.used).toEqual(original.used);
    expect(viaSave.rng.getState()).toBe(original.rng.getState());
  });

  it('連續存讀多次不會累積誤差', async () => {
    let s = createGame(31);
    for (let i = 0; i < 10; i++) {
      await playN(s, 2);
      s = deserialize(JSON.parse(JSON.stringify(serialize(s))));
    }
    const straight = createGame(31);
    await playN(straight, 20);
    expect(s.attrs).toEqual(straight.attrs);
    expect(s.age).toBe(straight.age);
  });

  it('額外欄位（例如年誌）會一起存下來', () => {
    const s = createGame(3);
    const payload = serialize(s, { journal: [{ kind: 'year', text: '【25 歲】' }] });
    expect(payload.journal).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(payload)).journal[0].text).toBe('【25 歲】');
  });
});
