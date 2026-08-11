import { readdirSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { resolve } from '../src/text.js';

// 已經有一條測試守「用到的代稱，resolve 都認得」。這條守反向的那一半：
// 該走代稱的地方，有沒有被寫成字面。
//
// 試玩者在醫美那 39 幕裡撞到三處「學長/學姊」——作者把兩種寫法都放進正文，
// 讓玩家自己挑。那讀起來是「這個遊戲沒有決定你是誰」，而它其實決定了，
// text.js 也早就會處理，只是那三句沒有交給它。
//
// 只抓斜線並排這一種寫法：它一定是錯的。單獨出現的「學長」可能是在講真的學長
// （序章那句「學長說：撐過去」講的就是別人），那種不能一律禁。
const OUTPUTS = ['宗翰', '郁涵', '他', '她', '媽媽', '爸爸', '媽', '爸', '學姊', '學長'];
const PAIR = new RegExp(`(${OUTPUTS.join('|')})[/／](${OUTPUTS.join('|')})`);

const files = readdirSync('src/events').filter((f) => f.endsWith('.js'));

describe('性別代稱', () => {
  it('沒有把兩種寫法並排寫進正文', () => {
    const bad = [];
    for (const f of files) {
      readFileSync(`src/events/${f}`, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (line.trimStart().startsWith('//')) return;
          const m = line.match(PAIR);
          if (m) bad.push(`${f}:${i + 1} ${m[0]}`);
        });
    }
    expect(bad, '這幾處要改用代稱，例如 {學長}；text.js 會照主角性別換掉').toEqual([]);
  });

  it('代稱兩種性別都換得掉', () => {
    // 換不掉的話畫面上會出現大括號。這裡順便釘住三個常用的
    for (const g of ['m', 'f']) {
      const out = resolve({ gender: g }, '{學長}｜{配偶}｜{他}');
      expect(out, `${g} 的代稱沒有被換掉`).not.toMatch(/[{}]/);
    }
    expect(resolve({ gender: 'f' }, '{學長}')).toBe('學姊');
    expect(resolve({ gender: 'm' }, '{學長}')).toBe('學長');
  });
});
