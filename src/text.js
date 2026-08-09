// 文字層。事件與結局共用的兩個小工具，不依賴任何遊戲規則——
// 放在這裡是因為 engine → endings → characters 已經是一條 import 鏈，
// 這兩個函式三邊都要用，只能住在鏈的外面。

/** 事件的文字欄位都可以是狀態的函式：同一幕，不同的人生說法不一樣。 */
export function val(v, state) {
  return typeof v === 'function' ? v(state) : v;
}

/**
 * 文字裡的代稱。
 *
 * 另一半的名字與人稱會隨主角性別改變，主角在孩子口中的稱謂也是。
 * 與其把整條家庭弧線複製成兩份，事件裡寫 {配偶}、{她}、{爸爸}、{學長}，
 * 播放時才換掉——一個地方改，兩條路線都對。
 *
 * 玩家看得到的每一個文字欄位都必須經過這裡。漏掉一個，畫面上就會出現大括號。
 */
export function resolve(state, str) {
  if (typeof str !== 'string' || !str.includes('{')) return str;
  const female = state?.gender === 'f';
  return str
    .replace(/\{配偶\}/g, female ? '宗翰' : '郁涵')
    .replace(/\{她\}/g, female ? '他' : '她') // 指另一半
    .replace(/\{他\}/g, female ? '她' : '他') // 指主角
    .replace(/\{爸爸\}/g, female ? '媽媽' : '爸爸') // 孩子怎麼稱呼主角
    .replace(/\{爸\}/g, female ? '媽' : '爸')
    .replace(/\{學長\}/g, female ? '學姊' : '學長'); // 學弟妹怎麼叫主角
}
