// 遊戲流程。畫面交給 view.js,配置盤交給 alloc-panel.js。
import { createGame, playYear } from './engine.js';
import { PROLOGUE } from './events.js';
import { openAllocPanel } from './alloc-panel.js';
import {
  $,
  sleep,
  setScene,
  setPortrait,
  sceneForEvent,
  renderHud,
  showText,
  askChoice,
  renderTalents,
  renderStatusPanel,
  renderLogPanel,
  renderEnding,
} from './view.js';

let state = null;
const journal = [];

setScene('or'); // 標題畫面就先鋪好開刀房,不要開場是一片黑

const PROLOGUE_SCENE = {
  16: 'home',
  17: 'home',
  18: 'home',
  19: 'corridor',
  21: 'office',
  23: 'or',
  24: 'corridor',
};

function remember(entry) {
  journal.push(entry);
}

async function runPrologue() {
  for (const step of PROLOGUE) {
    setScene(PROLOGUE_SCENE[step.age] || 'corridor');
    if (step.age >= 23) setPortrait(25);
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
    body: '從現在起,每一年的時間怎麼分,由你決定。\n分完之後,命運會回應你——通常不是你想要的那種回應。',
  });
}

/** 事件播放:切場景、顯示文字、需要決定時發牌。 */
async function onLog(entry) {
  if (entry.kind === 'year') {
    remember(entry);
    return; // 年份標題只進年誌,不佔畫面
  }
  remember(entry);
  if (entry.scene) setScene(sceneForEvent(state, entry.scene));
  await showText({ src: '', body: entry.text });
  renderHud(state);
}

async function chooser(ev) {
  if (ev.scene) setScene(sceneForEvent(state, ev.scene));
  await showText({ src: '', body: ev.text }, { wait: false });
  return askChoice(ev.choices);
}

async function yearLoop() {
  while (true) {
    setPortrait(state.age);
    setScene(sceneForEvent(state, null));
    renderHud(state);
    $('textbox').classList.add('hidden');

    const alloc = await openAllocPanel(state);
    renderHud(state);

    const { ending } = await playYear(state, alloc, chooser, onLog);
    renderHud(state);

    if (ending) {
      await sleep(700);
      $('textbox').classList.add('hidden');
      $('cards').classList.add('hidden');
      renderEnding(ending);
      return;
    }
  }
}

// ───────── 事件繫結 ─────────

$('btn-start').onclick = () => {
  state = createGame(Date.now() >>> 0);
  renderTalents(state);
  $('screen-start').classList.add('hidden');
  $('screen-talents').classList.remove('hidden');
  setScene('home');
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

for (const b of document.querySelectorAll('.close-overlay')) {
  b.onclick = () => b.closest('.overlay').classList.add('hidden');
}

$('btn-restart').onclick = () => window.location.reload();
