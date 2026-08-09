import {
  createGame,
  playYear,
  getStage,
  ALLOC_KEYS,
  AXIS_LABELS,
  validateAllocation,
} from './engine.js';
import { TALENT_LABELS } from './talents.js';
import { PROLOGUE } from './events.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let state = null;
let alloc = null;

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
  $(id).classList.remove('hidden');
}

function addLog(kind, text) {
  const p = document.createElement('p');
  p.className = kind;
  p.textContent = text;
  $('log').appendChild(p);
  p.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function renderStatus() {
  const a = state.attrs;
  const items = [
    [`${state.age} 歲`, false],
    [getStage(state).label, false],
    [`健康 ${Math.round(a.health)}`, a.health < 30],
    [`自我 ${Math.round(a.self)}`, a.self < 25],
    [`家庭 ${Math.round(a.familyBond)}`, a.familyBond < 30],
    [`臨床 ${Math.round(a.clinical)}`, false],
    [`教學 ${Math.round(a.teaching)}`, false],
    [`計分 ${Math.round(a.papers)}`, false],
    [`存款 ${Math.round(a.money)} 萬`, a.money < 0],
  ];
  $('status-bar').innerHTML = items
    .map(([t, low]) => `<span class="${low ? 'low' : ''}">${t}</span>`)
    .join('');
  $('status-bar').classList.remove('hidden');
}

function renderTalents() {
  $('talent-list').innerHTML = Object.entries(state.talents)
    .map(
      ([k, v]) =>
        `<li><span>${TALENT_LABELS[k]}</span><span class="bar">${'●'.repeat(v)}${'○'.repeat(10 - v)}</span></li>`,
    )
    .join('');
}

async function runPrologue() {
  show('screen-story');
  for (const step of PROLOGUE) {
    if (step.exam) {
      addLog('event', step.text);
      await new Promise((resolve) => {
        const box = $('choice-box');
        box.innerHTML = '';
        box.classList.remove('hidden');
        for (const label of step.choices) {
          const b = document.createElement('button');
          b.textContent = label;
          b.onclick = () => {
            box.classList.add('hidden');
            resolve();
          };
          box.appendChild(b);
        }
      });
      addLog('info', step.outcome);
    } else {
      addLog('event', step.text);
    }
    await sleep(900);
  }
}

function askChoice(ev) {
  return new Promise((resolve) => {
    const box = $('choice-box');
    box.innerHTML = '';
    box.classList.remove('hidden');
    ev.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.onclick = () => {
        box.classList.add('hidden');
        resolve(i);
      };
      box.appendChild(b);
    });
  });
}

function renderPlan() {
  const stage = getStage(state);
  alloc = { clinical: stage.minClinical, teaching: 0, research: 0, family: 0, personal: 0 };
  $('plan-title').textContent = `${state.age} 歲・${stage.label}`;
  const rows = $('plan-rows');
  rows.innerHTML = '';
  for (const k of ALLOC_KEYS) {
    const row = document.createElement('div');
    row.className = 'plan-row';
    const min = k === 'clinical' ? stage.minClinical : 0;
    row.innerHTML = `<span>${AXIS_LABELS[k]}${min ? `(至少 ${min})` : ''}</span>
      <span class="controls">
        <button data-k="${k}" data-d="-1">−</button>
        <span class="months" id="m-${k}">${alloc[k]}</span>
        <button data-k="${k}" data-d="1">＋</button>
      </span>`;
    rows.appendChild(row);
  }
  rows.onclick = (e) => {
    const k = e.target.dataset?.k;
    if (!k) return;
    const d = Number(e.target.dataset.d);
    const min = k === 'clinical' ? stage.minClinical : 0;
    const used = ALLOC_KEYS.reduce((s, key) => s + alloc[key], 0);
    if (d > 0 && used >= 12) return;
    if (d < 0 && alloc[k] <= min) return;
    alloc[k] += d;
    $(`m-${k}`).textContent = alloc[k];
    updateRemaining();
  };
  updateRemaining();
  $('plan-box').classList.remove('hidden');
}

function updateRemaining() {
  const used = ALLOC_KEYS.reduce((s, k) => s + alloc[k], 0);
  $('plan-remaining').textContent = `還剩 ${12 - used} 個月未分配`;
  $('btn-run-year').disabled = used !== 12;
}

function renderEnding(ending) {
  show('screen-ending');
  $('ending-title').textContent = ending.title;
  $('ending-body').textContent = ending.body;
  const f = $('ending-filter');
  f.textContent = ending.filterLine || '';
  f.className = ending.filterKind || '';
  $('settlement').innerHTML = ending.settlement
    .map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`)
    .join('');
}

async function yearLoop() {
  renderStatus();
  renderPlan();
  await new Promise((resolve) => {
    $('btn-run-year').onclick = () => {
      try {
        validateAllocation(state, alloc);
      } catch (err) {
        $('plan-error').textContent = err.message;
        return;
      }
      $('plan-error').textContent = '';
      $('plan-box').classList.add('hidden');
      resolve();
    };
  });
  const { ending } = await playYear(state, alloc, askChoice, async (l) => {
    addLog(l.kind, l.text);
    await sleep(l.kind === 'year' ? 300 : 650);
  });
  renderStatus();
  if (ending) {
    await sleep(1200);
    renderEnding(ending);
    return;
  }
  yearLoop();
}

$('btn-start').onclick = () => {
  state = createGame(Date.now() >>> 0);
  renderTalents();
  show('screen-talents');
};

$('btn-accept-talents').onclick = async () => {
  await runPrologue();
  addLog('info', '——本篇開始。從現在起,每一年的 12 個月,由你分配。');
  yearLoop();
};

$('btn-restart').onclick = () => {
  window.location.reload();
};
