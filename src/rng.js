// mulberry32：可播種、夠均勻、一行狀態。
// 狀態只有一個 32 位元整數，所以存檔能完整重現亂數序列——
// 讀檔之後抽到的事件，會和沒存檔一路玩下去時一模一樣。
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
    getState: () => s,
    setState: (v) => {
      s = v >>> 0;
    },
  };
}
