// 結局卡。走到結局的人手上有一個值得貼出去的東西，但先前只能自己截圖再裁。
//
// 直式 1080×1350：LINE、Threads、IG 都是這個比例不會被裁掉頭。畫在 canvas 上
// 再下載，不上傳任何東西——這是一張本機產生的圖，不是一個分享服務。
const W = 1080;
const H = 1350;
const GOLD = '#b8934e';
const PAPER = '#e8e2d4';
const DIM = '#9c9384';
const FONT = "'Noto Serif TC','Songti TC','PingFang TC','Microsoft JhengHei',serif";

/** 結算單上最值得貼出去的那幾行。全列出來太長，而且多數欄位對外人沒有意義。 */
const HEADLINE = ['累計刀量（含跟刀）', '救回的人', '最終職級', '錯過的家庭晚餐'];

const load = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // 圖載不到就用純色，不要因此不給存
    img.src = src;
  });

/** 逐行斷字。canvas 沒有自動換行，中文也沒有空白可以切。 */
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = '';
    }
    line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderShareCard(ending, state) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0e0d0b';
  ctx.fillRect(0, 0, W, H);

  const bg = await load(`assets/scene-${ending.scene || 'corridor'}.webp`);
  if (bg) {
    // 蓋滿並置中裁切，比例不同的話不要壓扁
    const scale = Math.max(W / bg.width, H / bg.height);
    const w = bg.width * scale;
    const h = bg.height * scale;
    ctx.globalAlpha = 0.38;
    ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }
  // 壓暗，字才站得出來
  ctx.fillStyle = 'rgba(14,13,11,0.55)';
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  ctx.fillStyle = DIM;
  ctx.font = `28px ${FONT}`;
  ctx.fillText('外科醫師的一生', W / 2, 84);

  ctx.fillStyle = GOLD;
  ctx.font = `78px ${FONT}`;
  const titleLines = wrap(ctx, ending.title, W - 200);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, 168 + i * 96));

  let y = 168 + titleLines.length * 96 + 34;
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 160, y);
  ctx.lineTo(W / 2 + 160, y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  y += 46;

  // 一句你記得的事。結算單是數字，這一行才是那一局的樣子
  const mem = ending.memories?.[0];
  if (mem) {
    ctx.fillStyle = PAPER;
    ctx.font = `34px ${FONT}`;
    const lines = wrap(ctx, mem.text, W - 220).slice(0, 3);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 52));
    y += lines.length * 52 + 40;
  }

  // 數字列錨在底部，不接著上面流下來——讓開刀房留在中間有空間。
  // 照文字流排的話內容全擠在上面四成，下面八百多像素是空的，構圖上重下輕。
  const rows = HEADLINE.map((label) => ending.settlement.find((r) => r.label === label)).filter(
    Boolean,
  );
  const statsY = H - 232;
  const colW = W / rows.length;
  rows.forEach((r, i) => {
    const x = colW * (i + 0.5);
    ctx.fillStyle = GOLD;
    ctx.font = `44px ${FONT}`;
    ctx.fillText(String(r.value), x, statsY);
    ctx.fillStyle = DIM;
    ctx.font = `23px ${FONT}`;
    ctx.fillText(r.label.replace('（含跟刀）', ''), x, statsY + 60);
  });

  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(120, statsY - 46);
  ctx.lineTo(W - 120, statsY - 46);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = DIM;
  ctx.font = `24px ${FONT}`;
  ctx.fillText(`${state.age} 歲 ・ odafeng.github.io/surgeon-life`, W / 2, H - 62);

  return canvas;
}

/** 存到本機。不上傳、不呼叫任何服務——按下去只會多一個檔案。 */
export async function downloadShareCard(ending, state) {
  const canvas = await renderShareCard(ending, state);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `外科醫師的一生-${ending.title}.png`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
