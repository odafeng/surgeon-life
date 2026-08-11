import { describe, it, expect } from 'vitest';
import { createGame, backfillUsed, backfillMilestones } from '../src/engine.js';
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

// 惜別會、退休申請、他過世那幾幕，現在都會把發生的年份記下來，後續那一幕靠它
// 接在隔年。但在那之前存的檔沒有那個欄位——站上有人正玩到一半。
// 實測把 120 個中年存檔降級成舊格式，不會爆，但有 7 個從此少一幕：
// 已經辦過惜別會、已經收到退休申請的人，永遠等不到後續。
describe('舊存檔補記里程碑的年份', () => {
  const midGame = (mutate) => {
    const s = createGame(1);
    s.age = 56;
    mutate(s);
    return s;
  };

  it('辦過惜別會但沒有年份的，補成去年，今年就演得到', () => {
    const s = midGame((x) => (x.people.mentor.stage = 3));
    expect(backfillMilestones(s)).toContain('mentorRetiredAt');
    expect(s.flags.mentorRetiredAt).toBe(55);
    expect(s.age - s.flags.mentorRetiredAt, '要剛好落在後續那一幕的窗口裡').toBe(1);
  });

  it('已經演過後續的不會再補', () => {
    const s = midGame((x) => {
      x.people.mentor.stage = 3;
      x.used.push('m_last_clinic');
    });
    expect(backfillMilestones(s)).not.toContain('mentorRetiredAt');
  });

  it('退休申請與過世那兩個也補', () => {
    const s = midGame((x) => {
      x.people.nurse.stage = 2;
      x.people.patient.alive = false;
    });
    const filled = backfillMilestones(s);
    expect(filled).toContain('nurseNoticeAt');
    expect(filled).toContain('patient.diedAt');
    expect(s.people.patient.diedAt).toBe(55);
  });

  it('還沒走到那一步的不要亂補', () => {
    // 恩師還沒退休、護理長還沒遞申請、王慶昌還活著——補下去就會憑空演出後續
    const s = midGame(() => {});
    expect(backfillMilestones(s)).toEqual([]);
    expect(s.flags.mentorRetiredAt).toBeUndefined();
  });

  it('已經有年份的不會被蓋掉', () => {
    const s = midGame((x) => {
      x.people.mentor.stage = 3;
      x.flags.mentorRetiredAt = 51;
    });
    expect(backfillMilestones(s)).toEqual([]);
    expect(s.flags.mentorRetiredAt, '玩家真正辦惜別會的那一年不能被改掉').toBe(51);
  });
});
