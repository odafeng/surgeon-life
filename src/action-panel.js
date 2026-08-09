// 行動面板。分完時間之後的第二層決策：這一年你還想做點什麼。
import {
  energyFor,
  availableActions,
  runAction,
  descOf,
  repeatFactor,
  settleStreaks,
  ACTIONS,
  ACTION_GROUPS,
} from './actions.js';
import { $ } from './view.js';

/**
 * 開啟行動面板，玩家花完精力（或提早結束）後 resolve。
 * 回傳這一年做過的事情，給年誌用。
 */
export function openActionPanel(state) {
  const total = energyFor(state);
  let left = total;
  const done = [];
  const logs = [];

  $('act-title').textContent = `${state.age} 歲　這一年你還想做什麼`;

  // 「新」只在第一次出現的那一年標記。看過就不再標——
  // 玩到第十五年還每項都亮「新」，等於沒有標。
  state.seenActions = state.seenActions || [];
  const openNow = () => ACTIONS.filter((a) => !done.includes(a.id) && (!a.cond || a.cond(state)));
  const fresh = new Set(
    openNow()
      .map((a) => a.id)
      .filter((id) => !state.seenActions.includes(id)),
  );
  state.seenActions.push(...fresh);

  function pips() {
    return (
      `<em>精力</em>` +
      Array.from(
        { length: total },
        (_, i) => `<s class="pip ${i < left ? 'on' : 'spent'}"></s>`,
      ).join('') +
      `<b>${left} / ${total}</b>`
    );
  }

  /** 去年做過、今年還做得到、而且精力剛好夠的那一組。 */
  function repeatable() {
    const last = state.lastActions || [];
    const picks = last
      .map((id) => ACTIONS.find((a) => a.id === id))
      .filter((a) => a && !done.includes(a.id) && (!a.cond || a.cond(state)));
    const cost = picks.reduce((sum, a) => sum + a.cost, 0);
    return cost > 0 && cost <= left ? picks : null;
  }

  function draw() {
    $('act-energy').innerHTML = pips();
    const usable = availableActions(state, left, done);
    const shown = openNow();

    $('act-list').innerHTML = ACTION_GROUPS.map((g) => {
      const items = g.ids.map((id) => shown.find((a) => a.id === id)).filter(Boolean);
      if (items.length === 0) return '';
      return (
        `<h4 class="act-group">${g.title}</h4>` +
        items
          .map((a) => {
            const afford = usable.includes(a);
            // 衰退要看得見。玩家可以決定繼續做，但不能是不知情地變弱。
            const k = repeatFactor(state, a);
            const streak = (state.actionStreak || {})[a.id] || 0;
            return (
              `<button class="act ${afford ? '' : 'poor'}" data-id="${a.id}" ${afford ? '' : 'disabled'}>` +
              `<span class="act-cost">${a.cost}</span>` +
              (fresh.has(a.id) ? `<i class="act-new">新</i>` : '') +
              (k < 1
                ? `<i class="act-worn">連做 ${streak} 年・剩 ${Math.round(k * 100)}%</i>`
                : '') +
              `<span class="act-name">${a.label}</span>` +
              `<span class="act-desc">${descOf(a, state)}</span>` +
              `</button>`
            );
          })
          .join('')
      );
    }).join('');

    const again = repeatable();
    const btn = $('btn-act-repeat');
    btn.classList.toggle('hidden', !again);
    if (again) {
      // 會按這顆的人最不會去看卡片右上角，所以衰退要寫在按鈕上。
      const worst = Math.min(...again.map((a) => repeatFactor(state, a)));
      const note = worst < 1 ? `，最低剩 ${Math.round(worst * 100)}%` : '';
      btn.textContent = `跟去年一樣（${again.map((a) => a.label).join('、')}${note}）`;
    }

    $('act-done').innerHTML = logs.map((l) => `<p>${l}</p>`).join('');
    $('btn-act-end').textContent =
      left > 0 ? `剩下的精力就這樣放著（還有 ${left} 點）` : '精力用完了，過這一年';
  }

  function perform(action) {
    left -= action.cost;
    done.push(action.id);
    logs.push(`${action.label}——${runAction(state, action)}`);
  }

  draw();
  $('act').classList.remove('hidden');
  // 捲軸會留在去年捲到的位置，於是標題和「跟去年一樣」都在視窗上方看不見——
  // 最需要那顆快捷鍵的後期玩家反而找不到它。
  const sheet = $('act').querySelector('.scroll');
  if (sheet) sheet.scrollTop = 0;

  return new Promise((resolve) => {
    const onClick = (e) => {
      const btn = e.target.closest('.act');
      if (!btn || btn.disabled) return;
      const action = ACTIONS.find((a) => a.id === btn.dataset.id);
      if (!action || action.cost > left) return;
      perform(action);
      draw();
    };
    const onRepeat = () => {
      const again = repeatable();
      if (!again) return;
      again.forEach(perform);
      draw();
    };
    const end = () => {
      $('act-list').removeEventListener('click', onClick);
      $('btn-act-repeat').removeEventListener('click', onRepeat);
      $('btn-act-end').removeEventListener('click', end);
      $('act').classList.add('hidden');
      state.lastActions = [...done];
      settleStreaks(state, done);
      resolve(logs);
    };
    $('act-list').addEventListener('click', onClick);
    $('btn-act-repeat').addEventListener('click', onRepeat);
    $('btn-act-end').addEventListener('click', end);
  });
}
