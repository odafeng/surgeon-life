// 結局圖鑑。跨場次記在 localStorage，是唯一會累積的東西——
// 這個遊戲不讓你變強，只讓你多知道幾種活法。
const KEY = 'surgeon-life:seen-endings:v1';

/** 全部結局。順序是敘事上的重量，不是解鎖順序。 */
export const ALL_ENDINGS = [
  { id: 'another_path', title: '另一條路', hint: '在 26 歲那年選了別科。' },
  { id: 'ordinary', title: '平凡的幸福', hint: '五樣都顧到一點，一樣都沒有滿。' },
  { id: 'good_hands', title: '一雙沒有頭銜的好手', hint: '刀開得好、家也顧到，但沒有升等。' },
  { id: 'legend', title: '手術室的傳說，家裡的陌生人', hint: '技術頂尖，家庭歸零。' },
  { id: 'no_or', title: '你已經很久沒進開刀房了', hint: '升到教授，卻放下了刀。' },
  { id: 'both_but', title: '你什麼都做到了', hint: '教職與刀都拿到，代價寫在別的地方。' },
  { id: 'became_him', title: '你坐上了那張椅子', hint: '接下部主任的位置。' },
  { id: 'his_hands', title: '他教你的那雙手', hint: '親手替恩師開刀，而且救回來了。' },
  { id: 'on_my_table', title: '他死在我的手上', hint: '親手替恩師開刀，沒有救回來。' },
  { id: 'last_one', title: '最後一個還在的人', hint: '身邊的人都走了，你還在。' },
  { id: 'worn_out', title: '你撐到了最後一天', hint: '活到退休，但身上沒有一個零件是好的。' },
  { id: 'no_self_heal', title: '醫者不能自醫', hint: '倒在工作中。' },
  { id: 'laser', title: '你的雷射打得又快又好', hint: '轉醫美，而且很會做生意。' },
  { id: 'rent', title: '診所的租金又漲了', hint: '轉醫美，但不會做生意。' },
  { id: 'forced_out', title: '算術問題', hint: '被債務逼出健保體系。' },
  { id: 'retire', title: '你退休了', hint: '平安走完，沒有特別的故事。' },
];

export function seenEndings() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markSeen(id) {
  try {
    const set = seenEndings();
    set.add(id);
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* 不能寫就算了，圖鑑不是遊戲的必要條件 */
  }
}

export function collectionProgress() {
  const seen = seenEndings();
  return { seen: seen.size, total: ALL_ENDINGS.length, ids: seen };
}
