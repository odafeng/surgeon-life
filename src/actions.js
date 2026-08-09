// 回合內指令。分完時間之後，你還有幾點精力可以花在具體的事情上。
// 精力綁在「個人」這一軸：不留時間給自己的人，一年裡什麼都擠不出來做。
import { effective, getStage, clamp } from './engine.js';
import { adjustBond, PEOPLE } from './characters.js';

/**
 * 今年的精力點數。
 * 個人時間是主要來源，健康與體質是修正——
 * 所以「個人 0%」的玩家不只會慢慢死，他連改變現況的餘裕都沒有。
 */
export function energyFor(state) {
  const personal = state.alloc ? effective('personal', state.alloc.personal) : 0;
  const fromPersonal = (personal / 100) * 13;
  const fromHealth = (state.attrs.health - 45) / 22;
  const fromBody = state.talents.constitution / 4;
  return Math.max(1, Math.min(12, Math.round(2 + fromPersonal + fromHealth + fromBody)));
}

const surgical = (s) => getStage(s).surgical;
const attending = (s) => getStage(s).key === 'attending' && s.career === 'surgery';
/** 有主治級的自主權——能報備支援、能決定自己的刀表。 */
const senior = (s) => ['attending', 'aesthetic'].includes(getStage(s).key);

/** 說明文可以隨職級改寫：同一件事，PGY 做和主治做不是同一回事。 */
export function descOf(action, state) {
  return typeof action.desc === 'function' ? action.desc(state) : action.desc;
}

export const ACTIONS = [
  // ── 精進 ──
  {
    id: 'act_drill',
    label: '練刀',
    desc: '大體工作坊、模擬器、一個人在刀房打結。',
    cost: 2,
    cond: surgical,
    apply: (s) => {
      const gain = 2 + s.talents.dexterity * 0.35;
      s.attrs.clinical = clamp(s.attrs.clinical + gain);
      s.attrs.health = clamp(s.attrs.health - 1);
      return `你多練了一個週末。手感這種東西，停一個月要花三個月補回來。（臨床 +${gain.toFixed(1)}）`;
    },
  },
  {
    id: 'act_assist',
    label: '跟大刀',
    desc: '跟一台不是你的刀，站在旁邊看資深的怎麼處理。',
    cost: 2,
    cond: surgical,
    apply: (s) => {
      s.attrs.clinical = clamp(s.attrs.clinical + 2.5);
      s.attrs.self = clamp(s.attrs.self + 2);
      return '你站了七個小時，什麼都沒做，但看懂了那個轉折怎麼過。（臨床 +2.5　自我 +2）';
    },
  },
  {
    id: 'act_journal',
    label: '讀期刊',
    desc: '把積了半年的文獻補一補。',
    cost: 1,
    apply: (s) => {
      s.attrs.clinical = clamp(s.attrs.clinical + 1);
      s.attrs.papers += 6;
      return '你在通勤時讀完三篇。有一篇的結論和你的做法相反，你想了很久。（臨床 +1　計分 +6）';
    },
  },
  {
    id: 'act_newtech',
    label: '學新術式',
    desc: '自費出國看一週。回來還要跟刀、送資格審查，才輪得到你自己上。',
    cost: 4,
    cond: (s) => surgical(s) && s.attrs.clinical >= 45,
    apply: (s) => {
      s.attrs.clinical = clamp(s.attrs.clinical + 7);
      s.attrs.health = clamp(s.attrs.health - 3);
      s.attrs.money -= 45;
      return '你自費四十五萬去看了一週，回來又跟了十台、補齊了認證。醫院很高興，補助的部分是零。（臨床 +7　存款 −45 萬）';
    },
  },

  // ── 學術 ──
  {
    id: 'act_write',
    label: '寫論文',
    // 能不能「關掉刀表」是職級問題。住院醫師只能撿時間，主治才排得動自己的表。
    desc: (s) =>
      senior(s)
        ? '關掉一週的刀表，把那篇卡了兩年的稿子寫完。'
        : '值班室的空檔、下刀後的深夜，一段一段把它擠出來。',
    cost: 3,
    apply: (s) => {
      const gain = 14 + s.talents.research * 3;
      s.attrs.papers += gain;
      s.attrs.health = clamp(s.attrs.health - 2);
      return `連續三個週末的醫局，只剩你的螢幕亮著。（計分 +${Math.round(gain)}　健康 −2）`;
    },
  },
  {
    id: 'act_submit',
    label: '投稿好期刊',
    desc: '賭一把。中了計分翻倍，沒中就是三個月白工。',
    cost: 2,
    cond: (s) => s.attrs.papers >= 40,
    apply: (s) => {
      const p = 0.25 + s.talents.research * 0.045 + (s.flags.phd === 'done' ? 0.1 : 0);
      if (s.rng.chance(p)) {
        const gain = 50 + s.talents.research * 6;
        s.attrs.papers += gain;
        s.attrs.self = clamp(s.attrs.self + 4);
        return `接受了。編輯信只有兩行，你看了五遍。（計分 +${Math.round(gain)}　自我 +4）`;
      }
      s.attrs.self = clamp(s.attrs.self - 4);
      return '退稿。審查意見第一句是「本研究缺乏新穎性」，第二句開始講格式。（自我 −4）';
    },
  },
  {
    id: 'act_grant',
    label: '寫計畫書',
    desc: '部級研究計畫。申請紀錄本身就是副教授送審的門票。',
    cost: 3,
    cond: attending,
    apply: (s) => {
      s.grants.applied = true;
      s.attrs.health = clamp(s.attrs.health - 2);
      const p = Math.min(
        0.55,
        0.15 + s.talents.research * 0.035 + (s.flags.phd === 'done' ? 0.1 : 0),
      );
      if (s.rng.chance(p)) {
        s.grants.yearsPI += 1;
        return `通過了，今年以主持人身分執行，累計 ${s.grants.yearsPI} 年。（健康 −2）`;
      }
      return '沒過。你寫了兩週，審查意見一行：「創新性不足。」（健康 −2）';
    },
  },

  // ── 教學與人際 ──
  {
    id: 'act_teach',
    label: '認真帶學生',
    desc: '不是點名，是真的教。',
    cost: 2,
    apply: (s) => {
      const gain = 5 + s.talents.charisma * 0.8;
      s.attrs.teaching = clamp(s.attrs.teaching + gain);
      s.attrs.self = clamp(s.attrs.self + 2);
      return `有個學生下刀後追出來問問題，你們在樓梯間站著講了半小時。（教學 +${gain.toFixed(1)}　自我 +2）`;
    },
  },
  {
    id: 'act_portfolio',
    label: '補教學檔案',
    desc: '把做過的教學登錄成可以計分的格式。',
    cost: 1,
    apply: (s) => {
      s.attrs.teaching = clamp(s.attrs.teaching + 4);
      s.attrs.self = clamp(s.attrs.self - 2);
      return '晨會報告、床邊教學、實習醫學生的評核表——你一筆一筆補進系統。教學是真的，表格也是真的，兩者關係不大。（教學 +4　自我 −2）';
    },
  },
  {
    id: 'act_conference',
    label: '跑學會',
    desc: '年會、口頭報告、走廊上的握手。',
    cost: 2,
    apply: (s) => {
      s.attrs.teaching = clamp(s.attrs.teaching + 3);
      s.attrs.money -= 18;
      s.flags.network = (s.flags.network || 0) + 1;
      return '你報了十二分鐘，台下六個人。但茶敘時有人記住了你的名字。（教學 +3　存款 −18 萬）';
    },
  },
  {
    id: 'act_drink',
    label: '陪主任應酬',
    desc: '你不喜歡，但升等外審是人在審的。',
    cost: 2,
    cond: attending,
    apply: (s) => {
      s.flags.network = (s.flags.network || 0) + 2;
      s.attrs.self = clamp(s.attrs.self - 4);
      s.attrs.health = clamp(s.attrs.health - 2);
      return '你陪笑到十一點半，聽了三次同一個笑話。回家路上你在便利商店坐了十分鐘才上樓。（自我 −4　健康 −2　人脈 +2）';
    },
  },

  // ── 家庭 ──
  {
    id: 'act_dinner',
    label: '每週一起吃飯',
    desc: '不是承諾，是真的排進行事曆。',
    cost: 2,
    cond: (s) => s.family.stage !== 'single',
    apply: (s) => {
      s.attrs.familyBond = clamp(s.attrs.familyBond + 9);
      s.attrs.self = clamp(s.attrs.self + 2);
      return '一年五十二次，你做到了三十一次。對方說這樣已經很好了。（家庭 +9　自我 +2）';
    },
  },
  {
    id: 'act_trip',
    label: '安排一趟旅行',
    desc: '請假、訂票、把手機關掉三天。',
    cost: 3,
    cond: (s) => s.family.stage !== 'single',
    apply: (s) => {
      s.attrs.familyBond = clamp(s.attrs.familyBond + 16);
      s.attrs.self = clamp(s.attrs.self + 5);
      s.attrs.money -= 32;
      return '第二天你才想起來沒帶識別證。那三天你睡得很好。（家庭 +16　自我 +5　存款 −32 萬）';
    },
  },
  {
    id: 'act_school',
    label: '出席孩子的活動',
    desc: '運動會、班親會、畢業典禮，挑一個。',
    cost: 2,
    cond: (s) => s.family.kids > 0,
    apply: (s) => {
      s.attrs.familyBond = clamp(s.attrs.familyBond + 12);
      s.attrs.self = clamp(s.attrs.self + 3);
      return '你坐在最後一排。孩子在台上找了你三次，第三次找到了。（家庭 +12　自我 +3）';
    },
  },

  // ── 自我與健康 ──
  {
    id: 'act_gym',
    label: '規律運動',
    desc: '一週三次，持續一年。',
    cost: 2,
    apply: (s) => {
      s.attrs.health = clamp(s.attrs.health + 9);
      s.attrs.self = clamp(s.attrs.self + 3);
      return '第一個月只去了四次，後來變成習慣。你的膝蓋謝謝你。（健康 +9　自我 +3）';
    },
  },
  {
    id: 'act_sleep',
    label: '把覺補回來',
    desc: '不排刀、不接電話、睡到自然醒。',
    cost: 1,
    apply: (s) => {
      s.attrs.health = clamp(s.attrs.health + 5);
      return '你睡了十四個小時，醒來一度不知道是早上還是傍晚。（健康 +5）';
    },
  },
  {
    id: 'act_therapy',
    label: '去看身心科',
    desc: '掛號的時候你用了別家醫院。',
    cost: 2,
    cond: (s) => s.attrs.self < 55,
    apply: (s) => {
      s.attrs.self = clamp(s.attrs.self + 12);
      s.attrs.health = clamp(s.attrs.health + 2);
      s.attrs.money -= 12;
      return '醫師問你上一次覺得自己做得不錯是什麼時候。你想了很久，沒有答案。但你下個月又去了。（自我 +12　健康 +2）';
    },
  },

  // ── 人 ──
  // 關係不會自己長出來。你不去，就是不去。
  {
    id: 'act_visit_mentor',
    label: '去看陳文彬',
    desc: '帶一盒他愛吃的，聽他講以前的刀。',
    cost: 1,
    cond: (s) => s.people?.mentor && !s.people.mentor.gone && s.people.mentor.stage >= 2,
    apply: (s) => {
      adjustBond(s, 'mentor', 8);
      s.attrs.self = clamp(s.attrs.self + 4);
      return `你陪${PEOPLE.mentor.name}坐了一個下午。他講的那台刀你聽過三次了，你還是聽完。（自我 +4）`;
    },
  },
  {
    id: 'act_drink_peer',
    label: '找林致遠喝一杯',
    desc: '不聊升等，不聊點值，就喝酒。',
    cost: 1,
    cond: (s) => s.people?.peer && s.people.peer.stage >= 1,
    apply: (s) => {
      adjustBond(s, 'peer', 8);
      s.attrs.self = clamp(s.attrs.self + 5);
      s.attrs.health = clamp(s.attrs.health - 1);
      return `你們喝到兩點，講的都是還在當住院醫師時候的事。他說：「還好那時候有你。」你說：「彼此。」（自我 +5）`;
    },
  },
  {
    id: 'act_mentor_junior',
    label: '帶許士杰開一台',
    desc: '把主刀讓給他，你站對面。',
    cost: 2,
    cond: (s) => s.people?.junior && s.people.junior.stage >= 1 && getStage(s).surgical,
    apply: (s) => {
      adjustBond(s, 'junior', 10);
      s.attrs.teaching = clamp(s.attrs.teaching + 6);
      s.attrs.self = clamp(s.attrs.self + 3);
      return `${PEOPLE.junior.name}的手在抖，你說：「我在這裡。」那句話你也聽過。（教學 +6　自我 +3）`;
    },
  },
  {
    id: 'act_or_team',
    label: '請刀房喝飲料',
    desc: '不是慶功，就是想請。',
    cost: 1,
    cond: (s) => s.people?.nurse && !s.people.nurse.retired && getStage(s).surgical,
    apply: (s) => {
      adjustBond(s, 'nurse', 8);
      s.attrs.self = clamp(s.attrs.self + 3);
      s.attrs.money -= 4;
      return `${PEOPLE.nurse.name}說你浪費錢，然後把單子收進口袋。她記得你慣用哪一支持針器——那跟飲料沒有關係，是她十二年的職業習慣。（自我 +3）`;
    },
  },

  // ── 財務 ──
  {
    id: 'act_talk',
    label: '接演講與業配',
    desc: '藥廠的會、器材商的課、名字掛在投影片最後一頁。',
    cost: 2,
    cond: attending,
    apply: (s) => {
      const gain = 40 + s.talents.charisma * 8;
      s.attrs.money += gain;
      s.attrs.self = clamp(s.attrs.self - 3);
      return `你講了六場，每場都是同一份投影片。（存款 +${gain} 萬　自我 −3）`;
    },
  },
  {
    id: 'act_moonlight',
    label: '報備支援',
    desc: '向院方報備，去別家醫院的假日刀，或診所的夜診。',
    cost: 3,
    // 住院醫師是受訓身分，兼職受限也還沒有獨立執業的資格。主治才有這一格。
    cond: senior,
    apply: (s) => {
      const gain = 95 + s.talents.social * 10;
      s.attrs.money += gain;
      s.attrs.health = clamp(s.attrs.health - 6);
      s.attrs.familyBond = clamp(s.attrs.familyBond - 6);
      return `你把僅剩的週末賣掉了。（存款 +${gain} 萬　健康 −6　家庭 −6）`;
    },
  },
];

/**
 * 面板分組。順序就是顯示順序。
 * 每個行動剛好屬於一組——有測試把關，新增行動時漏掉會紅燈。
 */
export const ACTION_GROUPS = [
  { title: '精進', ids: ['act_drill', 'act_assist', 'act_journal', 'act_newtech'] },
  { title: '學術', ids: ['act_write', 'act_submit', 'act_grant'] },
  { title: '教學與人際', ids: ['act_teach', 'act_portfolio', 'act_conference', 'act_drink'] },
  { title: '家庭', ids: ['act_dinner', 'act_trip', 'act_school'] },
  { title: '自己', ids: ['act_gym', 'act_sleep', 'act_therapy'] },
  {
    title: '那些人',
    ids: ['act_visit_mentor', 'act_drink_peer', 'act_mentor_junior', 'act_or_team'],
  },
  { title: '錢', ids: ['act_talk', 'act_moonlight'] },
];

/** 這一年還能選的行動。已經做過的、精力不夠的、條件不符的都排除。 */
export function availableActions(state, energyLeft, done) {
  return ACTIONS.filter(
    (a) => !done.includes(a.id) && a.cost <= energyLeft && (!a.cond || a.cond(state)),
  );
}

export function runAction(state, action) {
  return action.apply(state);
}
