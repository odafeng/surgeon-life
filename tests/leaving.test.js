import { describe, it, expect } from 'vitest';
import { createGame, playYear, conformAllocation } from '../src/engine.js';
import { EVENTS } from '../src/events.js';

// 85 個人物弧線事件裡，醫美階段可用的是 0 個；101 個醫美事件只有 1 個回頭看。
// 被債務逼出健保的那一天，六個人同時從人生裡消失，一句話都沒有。
// 這幾幕把「內容結束了」變回「你弄丟了什麼」。
const MARKS = {
  lv_nurse_last_case: '照常收台',
  lv_peer_message: '只有兩個字',
  lv_junior_handover: '要怎麼接',
  lv_chief_paperwork: '只花了四秒',
  lv_mentor_silence: '什麼都沒有說',
  lv_patient_returns: '每年都去舊醫院掛你的號',
};

describe('離開健保的那一年', () => {
  it('每個標記字串只屬於一個事件', () => {
    const s = createGame(1);
    for (const [id, mark] of Object.entries(MARKS)) {
      const owners = EVENTS.filter((e) => {
        const parts = [
          typeof e.text === 'function' ? e.text(s) : e.text,
          e.log,
          ...(e.choices || []).flatMap((c) => [c.log, c.memory]),
        ];
        return parts.some((x) => typeof x === 'string' && x.includes(mark));
      }).map((e) => e.id);
      expect(owners, `${id} 的標記「${mark}」`).toEqual([id]);
    }
  });

  it('道別在離開的隔年演，不是同一年', () => {
    // 轉職發生在年底的 settleMoney，那時候當年的事件早就抽完了。
    // 用 leftAt === age 的話一幕都不會出現——我實測 200 局全是 0。
    const s = createGame(1);
    s.career = 'aesthetic';
    s.flags.leftAt = 44;
    s.people.nurse.stage = 1;
    const nurse = EVENTS.find((e) => e.id === 'lv_nurse_last_case');
    s.age = 44;
    expect(nurse.forced(s), '離開的當年還沒輪到').toBe(false);
    s.age = 45;
    expect(nurse.forced(s), '隔年才演').toBe(true);
    s.age = 46;
    expect(nurse.forced(s), '再隔一年就過去了').toBe(false);
  });

  it('人還在才有那一幕——走掉的人不會回來道別', () => {
    const base = () => {
      const s = createGame(1);
      s.career = 'aesthetic';
      s.flags.leftAt = 44;
      s.age = 45;
      s.people.mentor.stage = 2;
      s.people.junior.stage = 2;
      return s;
    };
    const mentor = EVENTS.find((e) => e.id === 'lv_mentor_silence');
    const junior = EVENTS.find((e) => e.id === 'lv_junior_handover');

    expect(mentor.forced(base())).toBe(true);
    const gone = base();
    gone.people.mentor.gone = true;
    expect(mentor.forced(gone), '已故的老師不會跟你道別').toBe(false);

    expect(junior.forced(base())).toBe(true);
    const left = base();
    left.people.junior.path = 'left';
    expect(junior.forced(left), '已經離開外科的學弟不會來交接').toBe(false);
  });

  it('真的走一遍，離開之後仍然看得到那幾個人', async () => {
    let switched = 0;
    let sawAny = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const s = createGame(seed, seed % 2 ? 'f' : 'm');
      const intent = { clinical: 62, teaching: 5, research: 5, family: 18, personal: 10 };
      let seen = 0;
      while (!s.ending && s.age <= 65) {
        const alloc = conformAllocation(s, intent);
        const { ending } = await playYear(
          s,
          alloc,
          async () => 0,
          async (l) => {
            for (const m of Object.values(MARKS)) if (l.text.includes(m)) seen += 1;
          },
        );
        if (ending) break;
      }
      if (s.career === 'aesthetic') {
        switched += 1;
        if (seen > 0) sawAny += 1;
      }
    }
    expect(switched, '這個配置要有人被債務逼出去，測試才有意義').toBeGreaterThan(5);
    expect(sawAny, '轉出去的人不該一個道別都收不到').toBe(switched);
  });
});
