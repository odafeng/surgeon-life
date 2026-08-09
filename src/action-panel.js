// 行動面板。分完時間之後的第二層決策：這一年你還想做點什麼。
import { energyFor, availableActions, runAction, ACTIONS } from './actions.js';
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

  function draw() {
    $('act-energy').innerHTML = pips();
    const usable = availableActions(state, left, done);
    const shown = ACTIONS.filter((a) => !done.includes(a.id) && (!a.cond || a.cond(state)));
    $('act-list').innerHTML = shown
      .map((a) => {
        const afford = usable.includes(a);
        return (
          `<button class="act ${afford ? '' : 'poor'}" data-id="${a.id}" ${afford ? '' : 'disabled'}>` +
          `<span class="act-cost">${a.cost}</span>` +
          `<span class="act-name">${a.label}</span>` +
          `<span class="act-desc">${a.desc}</span>` +
          `</button>`
        );
      })
      .join('');
    $('act-done').innerHTML = logs.map((l) => `<p>${l}</p>`).join('');
    $('btn-act-end').textContent =
      left > 0 ? `剩下的精力就這樣放著（還有 ${left} 點）` : '精力用完了，過這一年';
  }

  draw();
  $('act').classList.remove('hidden');

  return new Promise((resolve) => {
    const onClick = (e) => {
      const btn = e.target.closest('.act');
      if (!btn || btn.disabled) return;
      const action = ACTIONS.find((a) => a.id === btn.dataset.id);
      if (!action || action.cost > left) return;
      left -= action.cost;
      done.push(action.id);
      logs.push(`${action.label}——${runAction(state, action)}`);
      draw();
    };
    const end = () => {
      $('act-list').removeEventListener('click', onClick);
      $('btn-act-end').removeEventListener('click', end);
      $('act').classList.add('hidden');
      resolve(logs);
    };
    $('act-list').addEventListener('click', onClick);
    $('btn-act-end').addEventListener('click', end);
  });
}
