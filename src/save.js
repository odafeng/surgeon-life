// 存檔。state 裡唯一不能直接 JSON 化的是 rng（它是 closure），
// 所以序列化時把亂數狀態抽出來存，讀檔時再灌回去——
// 這樣讀檔之後抽到的事件，和沒存檔一路玩下去完全一致。
import { createRng } from './rng.js';

const KEY = 'surgeon-life:save:v1';
const VERSION = 1;

export function serialize(state, extra = {}) {
  const { rng, ...rest } = state;
  return {
    version: VERSION,
    savedAt: new Date().toISOString(),
    rngState: rng.getState(),
    state: rest,
    ...extra,
  };
}

export function deserialize(payload) {
  const state = { ...payload.state };
  state.rng = createRng(0);
  state.rng.setState(payload.rngState);
  return state;
}

export function hasSave() {
  try {
    return Boolean(window.localStorage.getItem(KEY));
  } catch {
    return false;
  }
}

/** 存檔失敗要讓呼叫端知道（無痕模式、配額滿），不能默默吞掉。 */
export function save(state, extra) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(serialize(state, extra)));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === 'QuotaExceededError' ? '儲存空間已滿' : '瀏覽器不允許存檔',
    };
  }
}

export function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload.version !== VERSION) return null; // 版本不合就當作沒有，不要讀進壞掉的狀態
    return { state: deserialize(payload), meta: payload };
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 沒有 localStorage 就當作已經清掉了 */
  }
}

/** 存檔摘要，給標題畫面的「繼續」按鈕顯示。 */
export function describeSave() {
  const got = load();
  if (!got) return null;
  const s = got.state;
  return {
    age: s.age,
    stage: s.career === 'aesthetic' ? '醫美診所' : s.rank && s.rank !== 'none' ? s.rank : null,
    savedAt: got.meta.savedAt,
    journalLength: got.meta.journal?.length ?? 0,
  };
}
