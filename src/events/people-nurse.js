// 護理長・阿蘭姐。這間刀房換過四個主任，她一個人記得所有事。
//
// 弧線：0 她救你 → 1 你們並肩 → 2 她要退休 → 3 退休之後，刀房變成另一個地方。
// 她的戲從 PGY 開始，跨過你整段外科生涯——這是全遊戲唯一一條比你資深、也比你先離開的線。
import { advance } from '../characters.js';

const N = (s) => s.people.nurse;

export const NURSE_EVENTS = [
  // ───────── 第 0 幕：她救過你很多次 ─────────
  {
    id: 'n_right_instrument',
    once: true,
    scene: 'or',
    mood: 'wry',
    priority: true,
    stages: ['pgy', 'resident'],
    weight: 3,
    cond: (s) => N(s).stage === 0,
    text: '你伸手要器械，叫不出名字，只比了一個手勢。阿蘭姐把電燒放進你手裡，順手把你抓錯的那支收回去。',
    effects: { clinical: 2 },
    bond: { nurse: 4 },
    log: '主治沒有發現。下刀後她說：「那支叫 Metzenbaum，你這個禮拜比錯三次了。」她記得是三次。',
  },
  {
    id: 'n_supper',
    scene: 'oncall',
    mood: 'lifted',
    priority: true,
    stages: ['pgy', 'resident'],
    once: true,
    weight: 3,
    cond: (s) => N(s).stage === 0,
    text: '你被電到晚上十一點。回值班室，桌上有一碗還溫的貢丸湯，底下壓著一張便條：「吃完再哭。」',
    effects: { self: 6, health: 2 },
    bond: { nurse: 8 },
    memory: '你被電到十一點，值班室桌上有一碗還溫的湯，紙條上寫著：吃完再哭。',
    log: '沒有署名。刀房裡會這樣做的只有一個人。你後來才知道，她那天的班下午四點就結束了。',
  },
  {
    id: 'n_blood_prep',
    scene: 'or',
    mood: 'wry',
    priority: true,
    stages: ['resident'],
    weight: 3,
    cond: (s) => N(s).stage === 0,
    text: '推病人進房前，阿蘭姐停下來問：「醫師，這台備血了嗎？」你翻了病歷，沒有。',
    choices: [
      {
        label: '謝謝她，立刻補開。',
        effects: { clinical: 2, self: 1 },
        bond: { nurse: 5 },
        log: '那台出血八百西西。事後沒有人提這件事——沒有出事的事情，不會出現在任何一份紀錄上。',
      },
      {
        label: '「應該用不到啦。」',
        effects: { self: -3 },
        bond: { nurse: -4 },
        log: '她沒有再說話，自己打了電話去血庫。這通電話你是三年後才知道的。',
      },
    ],
  },
  {
    id: 'n_gauze_count',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['resident'],
    weight: 3,
    cond: (s) => N(s).stage === 0,
    text: '關腹前紗布數不對，少一塊。主治說：「我確定沒有。」阿蘭姐站在原地不動：「數字不對就是不對。」',
    choices: [
      {
        label: '站在她那邊，重新找。',
        effects: { self: 4, health: -2 },
        bond: { nurse: 10 },
        log: '找了二十六分鐘，在鋪單的摺縫裡。主治什麼都沒說就走了。她把紗布放進計數袋，動作很平常。',
      },
      {
        label: '順著主治，關起來。',
        effects: { self: -5 },
        bond: { nurse: -8 },
        log: '那塊紗布後來在推床上找到了。沒有人受傷，也沒有人再提。她從那天起叫你「醫師」，不再叫你的名字。',
      },
    ],
  },
  {
    id: 'n_your_angle',
    scene: 'or',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    once: true,
    // 「第一台刀」只有在真的是第一年才成立。交給抽籤的話，
    // 它可能在你當了三年主治之後才演，那句台詞就變成謊話。
    forced: (s) => N(s).stage === 0 && !N(s).retired,
    text: '你當主治的第一台刀。阿蘭姐把器械台推到一個角度，說：「跟你以前一樣。」',
    effects: { clinical: 2, self: 6 },
    bond: { nurse: 6 },
    set: (s) => advance(s, 'nurse', 1),
    log: '你沒有跟任何人講過你慣用的角度。這間刀房換過四個主任，她記得每一個人的角度。',
  },

  // ───────── 第 1 幕：並肩 ─────────
  {
    id: 'n_blocks_schedule',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: (s) => N(s).stage === 1,
    text: '排程把你的刀塞成一天七台，最後一台排在晚上八點。阿蘭姐直接打電話去改：「{他}八點那台我不開，人要睡覺。」',
    effects: { health: 3, self: 3 },
    bond: { nurse: 6 },
    log: '對方說這是主任的意思。她說：「那請主任八點來刷手。」那台刀後來排到隔週三。',
  },
  {
    id: 'n_tells_you_off',
    once: true,
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: (s) => N(s).stage === 1,
    text: '你在刀台上把一支器械摔回盤子。下刀後阿蘭姐把你叫住：「你剛剛那樣，站你對面的孩子會學。」',
    choices: [
      {
        label: '回去跟他道歉。',
        effects: { self: 3, teaching: 3 },
        bond: { nurse: 8 },
        log: '那個住院醫師嚇了一跳，說沒關係。阿蘭姐在旁邊擦器械台，沒有抬頭，但你知道她在聽。',
      },
      {
        label: '「今天狀況比較多。」',
        effects: { self: -3 },
        bond: { nurse: -5 },
        log: '她說知道，然後繼續收台。她那天也已經站了十一個小時，這件事她沒有拿出來講。',
      },
    ],
  },
  {
    id: 'n_shortage_form',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    weight: 3,
    // 她在 stage 2 就遞了退休申請。退休生效前的那一年不該再演「一個人跑三間房」——
    // 玩家會覺得她死而復生。retired 只在最後一天才為真，所以這裡看 stage。
    cond: (s) => N(s).stage === 1,
    text: '刀房這季又走了兩個。阿蘭姐一個人跑三間房，中間還要接電話，回報「離職原因分析表」的欄位。',
    effects: { self: -3 },
    bond: { nurse: 3 },
    log: '表上八個選項，沒有一個是「人不夠」。她勾了「生涯規劃」，因為那一格是必填。',
  },

  // ───────── 第 2 幕：她要退休了 ─────────
  {
    id: 'n_retire_notice',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => N(s).stage >= 1 && s.age >= 50,
    text: '阿蘭姐把一張紙放在你桌上，是退休申請的影本。「先跟你講一聲，不然你又要從公告上看到。」',
    choices: [
      {
        label: '「再撐兩年，我幫你排輕鬆一點的房。」',
        effects: { self: -2 },
        bond: { nurse: 5 },
        set: (s) => advance(s, 'nurse', 2),
        log: '她笑出來：「我在這裡三十一年，沒有一間房是輕鬆的。」她把紙收回去，隔天照樣送了出去。',
      },
      {
        label: '問她之後想去哪裡。',
        effects: { self: 2 },
        bond: { nurse: 8 },
        set: (s) => advance(s, 'nurse', 2),
        log: '她說想回台南顧她媽媽，九十一歲，已經不太認得人了。「總要有人在。」你二十六歲那年說過差不多的話。',
      },
    ],
  },
  {
    id: 'n_last_day',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => N(s).stage >= 2 && !N(s).retired,
    text: '阿蘭姐最後一天上班。她照常七點十分到，照常把第一台的器械台鋪好，照常在交班本上寫下當天的房號。',
    effects: { self: -6 },
    bond: { nurse: 6 },
    memory: '阿蘭姐退休那天，最後一台的器械台是你搶著收的，她在旁邊糾正了你兩次。',
    set: (s) => {
      N(s).retired = true;
      advance(s, 'nurse', 3);
    },
    log: '最後一台結束，你搶著收台，她站在旁邊看，糾正了你兩次。護理部送了一束花和一個馬克杯，杯身印著醫院今年的新標語。',
  },

  // ───────── 第 3 幕：退休之後 ─────────
  {
    id: 'n_new_hands',
    scene: 'or',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: (s) => N(s).retired,
    text: '新來的流動護理師問你：「醫師，你這台要用哪一種撐開器？」以前沒有人問過你這個問題。',
    effects: { self: -4, health: -1 },
    log: '你報了型號，她找了十二分鐘。你站在無菌區等，想起那句「跟你以前一樣」。交班本改成電子系統了，舊的那幾本沒有匯進去。',
  },
  {
    id: 'n_breakfast_shop',
    scene: 'home',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => N(s).retired && s.age >= 56,
    text: '你在台南一家早餐店遇到阿蘭姐。她穿著一般人的衣服，你差一點沒認出來。',
    effects: { self: 6, health: 1 },
    bond: { nurse: 6 },
    log: '她問的第一句話是三號房的無影燈修好了沒。你說整組換新的了。她「喔」了一聲，接著問你有沒有好好吃飯。',
  },
];
