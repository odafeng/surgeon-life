// 遊戲流程。畫面交給 view.js，配置盤與行動面板各自獨立。
import { createGame, playYear, getStage, conformAllocation } from './engine.js';
import { PROLOGUE } from './events.js';
import { openAllocPanel } from './alloc-panel.js';
import { openActionPanel } from './action-panel.js';
import { settleStreaks } from './actions.js';
import { save, load, hasSave, clearSave, describeSave } from './save.js';
import {
  $,
  sleep,
  setScene,
  setPortrait,
  sceneForEvent,
  renderHud,
  showText,
  askChoice,
  animateTalentRoll,
  renderStatusPanel,
  renderLogPanel,
  renderEnding,
  renderCollectionNote,
  readingTime,
  setPortraitGender,
} from './view.js';

let state = null;
let journal = [];
let autoYears = 0; // 還要快轉幾年

setScene('or'); // 標題畫面就先鋪好開刀房，不要開場是一片黑

const PROLOGUE_SCENE = {
  16: 'home',
  17: 'home',
  18: 'home',
  19: 'home', // 大一還在教室裡，離醫院很遠
  21: 'or', // 解剖室
  22: 'corridor', // 授袍之後，你才第一次走進醫院
  23: 'or',
  24: 'corridor',
};

const fastForwarding = () => autoYears > 0;

function remember(entry) {
  journal.push(entry);
}

function renderFastFlag() {
  $('fast-flag').classList.toggle('hidden', !fastForwarding());
  $('fast-left').textContent = fastForwarding() ? `還有 ${autoYears} 年` : '';
}

function autosave() {
  if (!state || state.ending) return;
  save(state, { journal });
}

async function runPrologue() {
  for (const step of PROLOGUE) {
    setScene(PROLOGUE_SCENE[step.age] || 'corridor');
    if (step.age >= 22) setPortrait(25); // 授袍之後才有白袍
    remember({ kind: 'event', text: step.text });

    if (step.exam) {
      await showText({ src: `${step.age} 歲`, body: step.text }, { wait: false });
      const idx = await askChoice(step.choices.map((label) => ({ label })));
      remember({ kind: 'choice', text: step.choices[idx] });
      remember({ kind: 'info', text: step.outcome });
      await showText({ src: '放榜', body: step.outcome });
    } else {
      await showText({ src: `${step.age} 歲`, body: step.text });
    }
  }
  await showText({
    src: '本篇開始',
    body: '從現在起，每一年的時間怎麼分，由你決定。\n分完之後還有精力可以花，命運再回應你——通常不是你想要的那種回應。',
  });
}

/**
 * 事件播放。
 * 快轉時一般敘述自動推進，停留時間跟字數成正比，中途點一下可以提早跳過。
 * 但「你剛才那個選擇造成了什麼」永遠要等你讀完——遊戲既然停下來問你，
 * 就沒有理由讓答案一閃而過。
 */
async function onLog(entry) {
  if (entry.kind === 'year') {
    remember(entry);
    return;
  }
  remember(entry);
  if (entry.scene) setScene(sceneForEvent(state, entry.scene));
  setPortrait(state.age, entry.mood);
  const mustRead = entry.kind === 'choice' || !fastForwarding();
  if (mustRead) {
    await showText({ src: '', body: entry.text });
  } else {
    await showText({ src: '', body: entry.text }, { wait: false, autoMs: readingTime(entry.text) });
  }
  renderHud(state);
}

async function chooser(ev) {
  if (ev.scene) setScene(sceneForEvent(state, ev.scene));
  setPortrait(state.age, ev.mood);
  await showText({ src: '', body: ev.text }, { wait: false });
  return askChoice(ev.choices); // 需要決定的事件不快轉
}

async function yearLoop() {
  for (;;) {
    setPortrait(state.age);
    setScene(sceneForEvent(state, null));
    renderHud(state);
    $('textbox').classList.add('hidden');
    renderFastFlag();

    // 存檔點在「這一年還沒開始做任何決定」的位置。
    // 存在行動階段之後的話，重新載入會回到同一年的配置盤，
    // 但行動的效果已經寫進存檔——同一年就能重刷一次能力。
    autosave();

    if (!fastForwarding()) {
      const { alloc, years } = await openAllocPanel(state);
      state.alloc = alloc;
      // 玩家講的是這個。快轉時要從這裡重新套下限，不能拿上次壓過的結果再壓一次——
      // 那樣每經過一個新的下限就會再削一層，研究軸幾年後就歸零了。
      state.intent = { ...alloc };
      autoYears = years - 1;
      renderHud(state);
      renderFastFlag();

      const actionLogs = await openActionPanel(state);
      for (const l of actionLogs) remember({ kind: 'choice', text: l });
      renderHud(state);
    } else {
      autoYears -= 1;
      // 快轉跳過行動階段，等於這一年什麼都沒做——連續次數也該跟著退。
      settleStreaks(state, []);
      // 換階段時停下來。臨床下限變了，去年的配置未必還合法，
      // 而且升上住院醫師或主治本來就是該重新想一次的時刻。
      state.alloc = conformAllocation(state, state.intent || state.alloc);
      renderFastFlag();
    }

    const stageBefore = getStage(state).key;
    const { ending } = await playYear(state, state.alloc, chooser, onLog);
    renderHud(state);
    if (!ending && getStage(state).key !== stageBefore) {
      autoYears = 0;
      renderFastFlag();
    }

    if (ending) {
      autoYears = 0;
      renderFastFlag();
      clearSave(); // 走到結局就沒有「繼續」可言了
      await sleep(700);
      $('textbox').classList.add('hidden');
      $('cards').classList.add('hidden');
      renderEnding(ending);
      return;
    }
  }
}

// ───────── 事件繫結 ─────────

function refreshContinueButton() {
  const info = hasSave() ? describeSave() : null;
  const btn = $('btn-continue');
  btn.classList.toggle('hidden', !info);
  if (info) btn.textContent = `繼續上次的人生（${info.age} 歲）`;
}
refreshContinueButton();
renderCollectionNote();

$('btn-start').onclick = () => {
  $('screen-start').classList.add('hidden');
  $('screen-gender').classList.remove('hidden');
  setScene('home');
};

for (const b of document.querySelectorAll('.gender')) {
  b.onclick = async () => {
    state = createGame(Date.now() >>> 0, b.dataset.g);
    journal = [];
    autoYears = 0;
    setPortraitGender(state.gender);
    $('screen-gender').classList.add('hidden');
    $('screen-talents').classList.remove('hidden');
    await animateTalentRoll(state);
    $('btn-accept').classList.remove('hidden');
  };
}

$('btn-continue').onclick = async () => {
  const got = load();
  if (!got) {
    refreshContinueButton();
    return;
  }
  state = got.state;
  journal = got.meta.journal || [];
  setPortraitGender(state.gender);
  autoYears = 0;
  $('screen-start').classList.add('hidden');
  await yearLoop();
};

$('btn-accept').onclick = async () => {
  $('screen-talents').classList.add('hidden');
  await runPrologue();
  await yearLoop();
};

$('btn-status').onclick = () => {
  if (!state) return;
  renderStatusPanel(state);
  $('status-panel').classList.remove('hidden');
};

$('btn-log').onclick = () => {
  renderLogPanel(journal);
  $('log-panel').classList.remove('hidden');
};

$('btn-save').onclick = () => {
  if (!state) return;
  const res = save(state, { journal });
  const btn = $('btn-save');
  const span = btn.querySelector('span');
  span.textContent = res.ok ? '✓' : '✗';
  btn.title = res.ok ? '已存檔' : res.reason;
  setTimeout(() => {
    span.textContent = '存';
    btn.title = '存檔';
  }, 1200);
};

$('btn-fast-stop').onclick = () => {
  autoYears = 0;
  renderFastFlag();
};

for (const b of document.querySelectorAll('.close-overlay')) {
  b.onclick = () => b.closest('.overlay').classList.add('hidden');
}

$('btn-restart').onclick = () => {
  clearSave();
  window.location.reload();
};
