// DOM 渲染層。只碰畫面，不碰規則。
import { getStage, AXIS_LABELS, ALLOC_KEYS, nextPromotionGate } from './engine.js';
import { TALENT_LABELS } from './talents.js';
import { PEOPLE } from './characters.js';
import { ALL_ENDINGS, markSeen, collectionProgress } from './collection.js';

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STAGE_SCENE = { pgy: 'corridor', resident: 'or', attending: 'or', aesthetic: 'aesthetic' };
const RANK_LABELS = {
  none: '',
  vs: '主治醫師',
  assistant: '助理教授',
  associate: '副教授',
  professor: '教授',
};

let currentScene = null;

export function setScene(name) {
  if (!name || name === currentScene) return;
  currentScene = name;
  $('scene').style.backgroundImage = `url('assets/scene-${name}.webp')`;
}

export function sceneForEvent(state, eventScene) {
  return eventScene || STAGE_SCENE[getStage(state).key] || 'or';
}

export function portraitFor(age) {
  if (age <= 26) return 25;
  if (age <= 34) return 30;
  if (age <= 52) return 42;
  return 60;
}

/** mood: weary(疲憊) / wry(苦笑) / lifted(振奮)，省略則是平靜。 */
export function setPortrait(age, mood) {
  const el = $('portrait');
  const base = portraitFor(age);
  const src = mood ? `assets/portrait-${base}-${mood}.webp` : `assets/portrait-${base}.webp`;
  if (el.getAttribute('src') === src) return;
  el.setAttribute('src', src);
}

/** 主角在名牌上的稱號：用當下最刺的那個事實。 */
function sealTitle(state) {
  if (state.career === 'aesthetic') return '離開健保的人';
  if (state.attrs.money < 0) return `負債 ${Math.abs(Math.round(state.attrs.money))} 萬`;
  if (state.stats.lawsuits > 0) return `被告過 ${state.stats.lawsuits} 次`;
  if (state.rank !== 'none' && RANK_LABELS[state.rank]) return RANK_LABELS[state.rank];
  if (state.attrs.health < 35) return '健檢紅字';
  return '健保點值 0.78';
}

const BARS = [
  ['health', '健康', 30],
  ['self', '自我', 25],
  ['familyBond', '家庭', 30],
];

export function renderHud(state) {
  const a = state.attrs;
  const stage = getStage(state);
  $('hud-year').textContent = state.age;
  $('hud-stage').textContent = stage.label;
  const yearsIn =
    stage.key === 'attending'
      ? `・第 ${state.age - 31} 年`
      : stage.key === 'resident'
        ? `・第 ${state.age - 26} 年`
        : '';
  $('hud-rank').textContent = (RANK_LABELS[state.rank] || stage.label) + yearsIn;

  $('hud-bars').innerHTML = BARS.map(([k, label, lowAt]) => {
    const v = Math.round(a[k]);
    return `<div class="br ${v < lowAt ? 'low' : ''}"><span>${escapeHtml(label)}</span>
      <div class="bar b-${k === 'familyBond' ? 'family' : k}"><i style="width:${v}%"></i><b>${v}</b></div></div>`;
  }).join('');

  if (state.alloc) {
    $('hud-mix').innerHTML =
      `<em>今年配置</em><div class="mixbar">` +
      ALLOC_KEYS.map(
        (k) => `<i style="width:${state.alloc[k]}%;background:var(--c-${k})"></i>`,
      ).join('') +
      `</div>`;
  }

  const money = Math.round(a.money);
  $('money-val').textContent = money;
  $('hud-money').classList.toggle('neg', money < 0);

  $('np-title').textContent = sealTitle(state);
  $('hud').classList.remove('hidden');
  $('hud-right').classList.remove('hidden');
  $('nameplate').classList.remove('hidden');
}

/**
 * 快轉時每段文字自動停留多久。跟字數成正比，因為長句子需要更久才讀得完，
 * 固定 620 毫秒對三行的段落來說只是閃一下。
 */
export function readingTime(text) {
  return Math.min(4200, 900 + String(text).length * 46);
}

/**
 * 顯示一段文字。
 *   wait: true    等玩家點擊（或按空白／Enter）
 *   autoMs: N     最多停 N 毫秒，中途點擊可以提早跳過
 *   兩者皆無      畫上去就回，交給呼叫端決定何時換下一段
 */
export function showText({ src = '', body }, { wait = true, autoMs = 0 } = {}) {
  $('tb-src').textContent = src;
  $('tb-body').textContent = body;
  $('textbox').classList.remove('hidden');
  if (!wait && !autoMs) return Promise.resolve();
  $('tb-more').classList.toggle('hidden', !wait);
  return new Promise((resolve) => {
    let timer = null;
    const go = () => {
      if (timer) clearTimeout(timer);
      $('textbox').removeEventListener('click', go);
      document.removeEventListener('keydown', key);
      resolve();
    };
    const key = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    };
    $('textbox').addEventListener('click', go);
    document.addEventListener('keydown', key);
    if (autoMs) timer = setTimeout(go, autoMs);
  });
}

/** 直排選項卡。回傳被選中的索引。 */
export function askChoice(choices) {
  const box = $('cards');
  box.innerHTML = '';
  box.classList.remove('hidden');
  $('tb-more').classList.add('hidden');
  return new Promise((resolve) => {
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'card';
      b.type = 'button';
      if (c.hint) {
        const cost = document.createElement('span');
        cost.className = 'cost';
        cost.textContent = c.hint;
        b.appendChild(cost);
      }
      const vt = document.createElement('span');
      vt.className = 'vt';
      vt.textContent = c.label;
      b.appendChild(vt);
      b.onclick = () => {
        box.classList.add('hidden');
        box.innerHTML = '';
        resolve(i);
      };
      box.appendChild(b);
    });
  });
}

/**
 * 擲骰動畫。天賦是真的擲出來的，所以要讓玩家看見數字在滾。
 * 先全部一起滾，再一項一項定格——最後定格的是體質，因為它決定你能活多久。
 */
export async function animateTalentRoll(state) {
  const order = ['exam', 'dexterity', 'research', 'charisma', 'social', 'constitution'];
  const el = $('talent-list');
  el.innerHTML = order
    .map(
      (k) =>
        `<li data-k="${escapeHtml(k)}" class="rolling"><span>${escapeHtml(TALENT_LABELS[k])}</span>` +
        `<span><span class="pips">${'○'.repeat(10)}</span><b class="num">?</b></span></li>`,
    )
    .join('');

  const rows = new Map(order.map((k) => [k, el.querySelector(`li[data-k="${k}"]`)]));
  const paint = (row, v) => {
    row.querySelector('.pips').textContent = '●'.repeat(v) + '○'.repeat(10 - v);
    row.querySelector('.num').textContent = String(v);
  };

  // 全部一起滾
  const spinning = new Set(order);
  const spin = setInterval(() => {
    for (const k of spinning) paint(rows.get(k), 1 + Math.floor(Math.random() * 10));
  }, 65);
  await sleep(850);

  // 一項一項定格
  for (const k of order) {
    spinning.delete(k);
    const row = rows.get(k);
    paint(row, state.talents[k]);
    row.classList.remove('rolling');
    row.classList.add('landed');
    await sleep(280);
  }
  clearInterval(spin);
  await sleep(200);
}

export function renderTalents(state) {
  $('talent-list').innerHTML = Object.entries(state.talents)
    .map(
      ([k, v]) =>
        `<li><span>${escapeHtml(TALENT_LABELS[k])}</span><span class="pips">${'●'.repeat(v)}${'○'.repeat(10 - v)}</span></li>`,
    )
    .join('');
}

export function renderStatusPanel(state) {
  const a = state.attrs;
  $('sp-talents').innerHTML = Object.entries(state.talents)
    .map(
      ([k, v]) =>
        `<li><span>${escapeHtml(TALENT_LABELS[k])}</span><span class="pips">${'●'.repeat(v)}${'○'.repeat(10 - v)}</span></li>`,
    )
    .join('');
  const rows = [
    ['臨床技能', Math.round(a.clinical)],
    ['教學聲望', Math.round(a.teaching)],
    ['歸類計分', `${Math.round(a.papers)} 點`],
    ['健康', Math.round(a.health)],
    ['自我', Math.round(a.self)],
    ['家庭', Math.round(a.familyBond)],
    ['存款', `${Math.round(a.money)} 萬`],
    ['執刀次數', state.stats.surgeries],
    ['被告次數', state.stats.lawsuits],
  ];
  $('sp-attrs').innerHTML = rows
    .map(([k, v]) => `<li><span>${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></li>`)
    .join('');

  // 人際。只顯示已經登場的人——還沒遇到的不該提前劇透。
  const bondWord = (v) =>
    v >= 80 ? '極深' : v >= 60 ? '深' : v >= 40 ? '普通' : v >= 20 ? '疏遠' : '幾乎斷了';
  const met = Object.values(PEOPLE).filter((p) => {
    const st = state.people?.[p.key];
    return st && (st.stage > 0 || st.bond > 0);
  });
  $('sp-people').innerHTML = met.length
    ? met
        .map((p) => {
          const st = state.people[p.key];
          const note = st.gone
            ? '已故'
            : st.retired
              ? '已退休'
              : st.path === 'left'
                ? '離開外科'
                : st.path === 'broken'
                  ? '撐不住了'
                  : st.path === 'stayed'
                    ? '還在'
                    : bondWord(st.bond);
          return (
            `<li><span>${escapeHtml(p.title)}・${escapeHtml(p.name)}</span>` +
            `<span>${escapeHtml(note)}</span></li>`
          );
        })
        .join('')
    : '<li><span>還沒有誰在你的人生裡留下來</span><span></span></li>';

  const gate = nextPromotionGate(state);
  $('sp-gate').textContent = gate
    ? `下一關：${gate.label}。需要歸類計分 ${gate.papers} 點(目前 ${Math.round(a.papers)})、教學服務 70 分(目前 ${Math.round(a.teaching)})${
        gate.label === '副教授'
          ? '、部級計畫申請紀錄'
          : gate.label === '教授'
            ? '、計畫主持滿 2 年'
            : ''
      }。`
    : '升等這條路上，你沒有下一關了。';
}

export function renderLogPanel(entries) {
  $('log-body').innerHTML = entries
    .map((l) => `<p class="${l.kind}">${escapeHtml(l.text)}</p>`)
    .join('');
  $('log-body').scrollTop = $('log-body').scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

export function renderEnding(ending) {
  setScene(ending.scene || 'corridor');
  $('ending-title').textContent = ending.title;
  $('ending-body').textContent = ending.body;
  const f = $('ending-filter');
  f.textContent = ending.filterLine || '';
  f.className = ending.filterKind || '';
  const mem = $('ending-memories');
  if (ending.memories?.length) {
    mem.innerHTML =
      `<h4>你記得的事</h4>` +
      ending.memories
        .map((m) => `<p class="mem"><b>${escapeHtml(m.age)} 歲</b>${escapeHtml(m.text)}</p>`)
        .join('');
  } else {
    mem.innerHTML = '';
  }

  $('settlement').innerHTML = ending.settlement
    .map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.value)}</td></tr>`)
    .join('');
  markSeen(ending.id);
  const { seen, total, ids } = collectionProgress();
  $('codex-title').textContent = `結局圖鑑　${seen} ／ ${total}`;
  $('codex').innerHTML = ALL_ENDINGS.map((e) => {
    const got = ids.has(e.id);
    const now = e.id === ending.id;
    return (
      `<p class="cdx ${got ? '' : 'locked'} ${now ? 'now' : ''}">` +
      `<b>${got ? escapeHtml(e.title) : '？？？'}</b>` +
      `<s>${got ? escapeHtml(e.hint) : '尚未走到'}</s></p>`
    );
  }).join('');

  $('screen-ending').classList.remove('hidden');
}

export function renderCollectionNote() {
  const { seen, total } = collectionProgress();
  $('collection-note').textContent =
    seen > 0 ? `你已經走過 ${seen} 種結局，還有 ${total - seen} 種沒有見過。` : '';
}

export { AXIS_LABELS };
