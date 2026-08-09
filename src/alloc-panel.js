// 年度配置盤：一條可拖曳分隔線的堆疊條，比例制，附後果預告。
import {
  ALLOC_KEYS,
  AXIS_LABELS,
  getStage,
  forecast,
  validateAllocation,
  conformAllocation,
} from './engine.js';
import { $ } from './view.js';

const STAGE_DEFAULT = {
  pgy: { clinical: 55, teaching: 5, research: 10, family: 15, personal: 15 },
  resident: { clinical: 65, teaching: 5, research: 10, family: 5, personal: 15 },
  attending: { clinical: 40, teaching: 10, research: 20, family: 15, personal: 15 },
  aesthetic: { clinical: 20, teaching: 0, research: 0, family: 40, personal: 40 },
};

/**
 * 沿用去年的配置比較好用；第一年或換階段時給該階段的預設值。
 *
 * 下限怎麼套一律交給 conformAllocation。這裡原本自己寫了一份一模一樣的邏輯，
 * 而且同樣把 research 排在捐贈者第一順位——所以 PGY 升 R1 那年，
 * 臨床多出來的 10% 全部從研究扣，personal 和 family 一動不動。
 * 兩份實作只要有一份沒改到，玩家就會在畫面上看到沒改到的那一份。
 */
function startingAlloc(state) {
  const stage = getStage(state);
  // 開盤要回到玩家「說過」的配置，而不是上一年被下限壓過的結果。
  const want = state.intent || state.alloc;
  const base = want ? { ...want } : { ...STAGE_DEFAULT[stage.key] };
  const out = conformAllocation(state, base);
  const sum = ALLOC_KEYS.reduce((s, k) => s + out[k], 0);
  out.personal += 100 - sum; // 收尾補到 100
  if (out.personal < 0) {
    out.clinical += out.personal;
    out.personal = 0;
  }
  return out;
}

/** 承諾的來源，用來解釋家庭下限為什麼在那裡。 */
function promiseReason(state) {
  if (state.family.kids > 0) return '孩子不會因為你在值班就不用陪';
  if (state.family.stage === 'married') return '你答應過每週至少一起吃一頓晚餐';
  if (state.family.stage !== 'single') return '你答應過認真試試看';
  return '';
}

export function openAllocPanel(state) {
  const stage = getStage(state);
  const min = stage.minClinicalPct;
  const floor = state.family.floor || 0;
  const alloc = startingAlloc(state);
  const bar = $('plan-bar');

  $('plan-title').textContent = `${state.age} 歲　這一年怎麼過`;
  $('plan-sub').textContent = `${stage.label}　／　拖曳分隔線調整比重`;
  const lockLines = [];
  if (min) lockLines.push(`臨床的斜線區是 ${stage.label}的下限 ${min}%——這是制度規定的。`);
  else lockLines.push('你已經離開健保體系，沒有人規定你的臨床時間怎麼分。');
  if (floor)
    lockLines.push(`家庭的斜線區是 ${floor}%——${promiseReason(state)}。這是你自己答應的。`);
  $('plan-lock').textContent = lockLines.join('\n');

  function bounds() {
    const b = [0];
    for (const k of ALLOC_KEYS) b.push(b[b.length - 1] + alloc[k]);
    return b;
  }

  function draw() {
    const b = bounds();
    bar.innerHTML = '';
    ALLOC_KEYS.forEach((k) => {
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.dataset.k = k;
      seg.style.width = `${alloc[k]}%`;
      if (alloc[k] >= 12) seg.textContent = `${AXIS_LABELS[k]} ${alloc[k]}%`;
      else if (alloc[k] >= 6) seg.textContent = AXIS_LABELS[k];
      const lockPct = k === 'clinical' ? min : k === 'family' ? floor : 0;
      if (lockPct > 0) {
        const lock = document.createElement('span');
        lock.className = 'lockzone';
        lock.style.width = `${alloc[k] ? Math.min(100, (lockPct / alloc[k]) * 100) : 0}%`;
        seg.appendChild(lock);
      }
      bar.appendChild(seg);
    });
    for (let i = 1; i <= 4; i++) {
      const grip = document.createElement('div');
      grip.className = 'grip';
      grip.style.left = `${b[i]}%`;
      grip.dataset.i = String(i);
      bar.appendChild(grip);
    }

    $('plan-legend').innerHTML = ALLOC_KEYS.map(
      (k) =>
        `<span class="lg"><u style="background:var(--c-${k})"></u>${AXIS_LABELS[k]} <b>${alloc[k]}%</b>` +
        (k === 'clinical' && min ? ` <i>(下限 ${min}%)</i>` : '') +
        `</span>`,
    ).join('');

    const f = forecast(state, alloc);
    $('plan-chips').innerHTML = f.chips
      .map(
        (c) =>
          `<span class="chip ${c.good ? 'good' : ''}">${c.label} <b>${c.value}</b>` +
          (c.detail ? `<s>${c.detail}</s>` : '') +
          `</span>`,
      )
      .join('');
    $('plan-warn').innerHTML = f.warnings.map((w) => `<p>⚠ ${w}</p>`).join('');

    let valid = true;
    try {
      validateAllocation(state, alloc);
    } catch {
      valid = false;
    }
    $('btn-run').disabled = !valid;
  }

  let dragging = null;
  const pctFromEvent = (e) => {
    const r = bar.getBoundingClientRect();
    return Math.round(((e.clientX - r.left) / r.width) * 100);
  };

  function onDown(e) {
    const grip = e.target.closest('.grip');
    if (!grip) return;
    dragging = Number(grip.dataset.i);
    grip.classList.add('dragging');
    bar.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  /**
   * 推擠式拖曳：往右拖會把右邊所有分隔線一起推走，不是只吃相鄰那一段。
   * 只吃相鄰段的話，想把臨床從 40% 拉到 80% 得拖四次分隔線，很難用。
   */
  function onMove(e) {
    if (dragging === null) return;
    const i = dragging;
    const b = bounds(); // [0, b1, b2, b3, b4, 100]
    const pos = Math.max(min, Math.min(100, pctFromEvent(e)));
    b[i] = pos;
    for (let j = i + 1; j <= 4; j++) b[j] = Math.max(b[j], pos);
    for (let j = i - 1; j >= 1; j--) b[j] = Math.min(b[j], pos);
    for (let j = 1; j <= 4; j++) b[j] = Math.max(b[j], min); // 臨床下限
    // 家庭承諾下限：family 佔 b[3] 到 b[4]，兩邊都不能把它擠掉
    if (floor > 0 && b[4] - b[3] < floor) {
      if (i <= 3) b[3] = Math.max(min, b[4] - floor);
      else b[4] = Math.min(100, b[3] + floor);
      if (b[4] - b[3] < floor) b[3] = Math.max(min, b[4] - floor);
    }
    ALLOC_KEYS.forEach((k, idx) => {
      alloc[k] = b[idx + 1] - b[idx];
    });
    draw();
  }

  function onUp(e) {
    if (dragging === null) return;
    dragging = null;
    bar.querySelectorAll('.grip').forEach((g) => g.classList.remove('dragging'));
    if (bar.hasPointerCapture?.(e.pointerId)) bar.releasePointerCapture(e.pointerId);
  }

  bar.addEventListener('pointerdown', onDown);
  bar.addEventListener('pointermove', onMove);
  bar.addEventListener('pointerup', onUp);
  bar.addEventListener('pointercancel', onUp);

  draw();
  $('plan').classList.remove('hidden');

  return new Promise((resolve) => {
    const finish = (years) => {
      let final;
      try {
        final = validateAllocation(state, alloc);
      } catch {
        return; // 按鈕本來就是 disabled，這裡只是保險
      }
      $('btn-run').removeEventListener('click', runOne);
      $('plan-fast').removeEventListener('click', runMany);
      bar.removeEventListener('pointerdown', onDown);
      bar.removeEventListener('pointermove', onMove);
      bar.removeEventListener('pointerup', onUp);
      bar.removeEventListener('pointercancel', onUp);
      $('plan').classList.add('hidden');
      resolve({ alloc: final, years });
    };
    const runOne = () => finish(1);
    const runMany = (e) => {
      const years = Number(e.target.dataset?.years);
      // 快轉會跳過中間幾年的配置與行動，所以配置本身不合法時不給快轉
      if (years && !$('btn-run').disabled) finish(years);
    };
    $('btn-run').addEventListener('click', runOne);
    $('plan-fast').addEventListener('click', runMany);
  });
}
