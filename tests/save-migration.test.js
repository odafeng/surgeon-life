import { describe, it, expect } from 'vitest';
import { createGame, backfillUsed } from '../src/engine.js';
import { EVENTS } from '../src/events.js';

// 把一個事件標成 once 只影響之後的抽籤。已經存在的存檔裡，state.used 從來沒有
// 記過它的 id，所以修好之後那個存檔仍然會重播——試玩者在 32、43 歲看過那封
// 三小時退稿信，載入修正版之後 51 歲又演了第三次。年誌留著正文，可以反過來回填。
const eventText = (id) => {
  const e = EVENTS.find((x) => x.id === id);
  return typeof e.text === 'string' ? e.text : e.text(createGame(1));
};

describe('舊存檔的一次性事件', () => {
  it('年誌裡有正文、used 缺 id 的存檔會被補回去', () => {
    const s = createGame(1);
    const journal = [
      { kind: 'year', text: '【32 歲・主治醫師】' },
      { kind: 'event', text: `${eventText('ac_desk_reject')}\n你把檔名改成 v2。` },
      { kind: 'event', text: '不相干的一段。' },
    ];
    expect(s.used).not.toContain('ac_desk_reject');
    const added = backfillUsed(s, journal);
    expect(added).toContain('ac_desk_reject');
    expect(s.used).toContain('ac_desk_reject');
  });

  it('沒演過的事件不會被誤補', () => {
    const s = createGame(1);
    backfillUsed(s, [{ kind: 'event', text: '完全不相干的一段文字。' }]);
    expect(s.used).toEqual([]);
  });

  it('已經記過的不會重複加入', () => {
    const s = createGame(1);
    s.used.push('ac_desk_reject');
    const journal = [{ kind: 'event', text: eventText('ac_desk_reject') }];
    expect(backfillUsed(s, journal)).toEqual([]);
    expect(s.used.filter((x) => x === 'ac_desk_reject')).toHaveLength(1);
  });

  it('空年誌或沒有年誌都不會爆', () => {
    const s = createGame(1);
    expect(() => backfillUsed(s, [])).not.toThrow();
    expect(() => backfillUsed(s)).not.toThrow();
    expect(s.used).toEqual([]);
  });

  it('這一輪新標 once 的那幾幕都補得回去', () => {
    for (const id of ['as_consult_silence', 'as_transfer_calls', 'as_pandemic_ward']) {
      const s = createGame(1);
      backfillUsed(s, [{ kind: 'event', text: eventText(id) }]);
      expect(s.used, id).toContain(id);
    }
  });
});
