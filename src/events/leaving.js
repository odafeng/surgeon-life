// 離開健保體系那一年，還在的人各給你一幕。
//
// 在此之前：85 個人物弧線事件裡，醫美階段可用的是 0 個，而 101 個醫美事件
// 只有 1 個回頭看（電視上老東家的新聞）。也就是說被債務逼出去的那一天，
// 陳文彬、阿蘭姐、林致遠、許士杰、黃振邦、王慶昌同時從你的人生裡消失，
// 一句話都沒有。家人跟著你走，其他人像不存在過。
//
// 那讀起來不是「你失去了什麼」，是「內容結束了」。這幾幕把它變回前者。
// 全部 forced：道別不該靠抽籤，而且離開只有一次。
import { PEOPLE } from '../characters.js';

// 轉職發生在年底的 settleMoney，那時候當年的事件早就抽完了——
// 所以道別是在「離開的隔年」演，不是同一年。
// 用 leftAt === age 的話一幕都不會出現，我實測 200 局全是 0。
const leftJustNow = (s) => s.career === 'aesthetic' && s.age - (s.flags.leftAt ?? -99) === 1;
const P = (s) => s.people;

export const LEAVING_EVENTS = [
  {
    id: 'lv_nurse_last_case',
    scene: 'or',
    mood: 'weary',
    stages: ['aesthetic'],
    once: true,
    forced: (s) => leftJustNow(s) && !P(s).nurse.retired,
    text: `最後一台刀結束，${PEOPLE.nurse.name}照常收台。她沒有問你為什麼要走——刀房裡的人都知道健保點值是多少，也都知道你欠了多少。`,
    effects: { self: -6 },
    bond: { nurse: 4 },
    memory: `你最後一台刀，${PEOPLE.nurse.name}照常收台。她把你慣用的那支持針器單獨挑出來，放進器械籃最上層。`,
    log: '她把你慣用的那支持針器單獨挑出來，放進器械籃最上層——那支要送去滅菌，明天還會回到這間房，只是不再是你的。她說：「醫師，你的東西我幫你收好了。」你想說謝謝，發現自己講不出來。',
  },
  {
    id: 'lv_peer_message',
    scene: 'home',
    mood: 'weary',
    stages: ['aesthetic'],
    once: true,
    forced: (s) => leftJustNow(s) && P(s).peer.path !== 'broken',
    text: `你把離職單交出去的那個晚上，${PEOPLE.peer.name}傳來一則訊息。`,
    effects: { self: 3 },
    bond: { peer: 6 },
    memory: `你離開的那個晚上，${PEOPLE.peer.name}只傳來兩個字：「我懂。」`,
    log: '只有兩個字：「我懂。」你們認識三十年，這是他講過最短也最完整的一句話。他沒有問你之後要做什麼，因為他自己也算過那筆帳。',
  },
  {
    id: 'lv_junior_handover',
    scene: 'corridor',
    mood: 'weary',
    stages: ['aesthetic'],
    once: true,
    forced: (s) => leftJustNow(s) && P(s).junior.stage > 0 && P(s).junior.path !== 'left',
    text: `${PEOPLE.junior.name}拿著一張刀表來找你：「老師，下週那台胰臟的，要怎麼接？」他問的是刀，眼睛看的不是刀。`,
    choices: [
      {
        label: '把整台從頭講一遍給他聽。',
        effects: { teaching: 5, self: 4, health: -2 },
        bond: { junior: 10 },
        memory: `你離開前，把最後那台胰臟的刀從頭到尾講了一遍給${PEOPLE.junior.name}聽。`,
        log: '你講了兩個小時，從擺位講到止血。他全部記下來。走的時候他說：「老師，我會開好。」這句話你相信。',
      },
      {
        label: '「照你自己的方式開。」',
        effects: { self: -4, teaching: 2 },
        bond: { junior: 4 },
        log: '他愣了一下，說好。三年後你在學會的名單上看到他的名字，題目是那台刀的長期預後。你沒有去。',
      },
    ],
  },
  {
    id: 'lv_chief_paperwork',
    scene: 'office',
    mood: 'wry',
    stages: ['aesthetic'],
    once: true,
    forced: (s) => leftJustNow(s) && P(s).chief.stage > 0 && !P(s).chief.succeeded,
    text: `${PEOPLE.chief.name}簽你的離職單只花了四秒。簽完他說：「你的刀是全科最漂亮的。」然後把單子放進待送的那一疊。`,
    effects: { self: -5 },
    bond: { chief: 2 },
    memory: `${PEOPLE.chief.name}簽你的離職單只花了四秒，簽完說：「你的刀是全科最漂亮的。」`,
    log: '你走到門口才想到——這是他第一次稱讚你，而他選在這個時候講，是因為現在講不必付任何代價。',
  },
  {
    id: 'lv_mentor_silence',
    scene: 'office',
    mood: 'weary',
    stages: ['aesthetic'],
    once: true,
    forced: (s) => leftJustNow(s) && !P(s).mentor.gone && P(s).mentor.stage > 0,
    text: `你去跟${PEOPLE.mentor.name}說。他聽完，看了你很久，什麼都沒有說。`,
    effects: { self: -8 },
    bond: { mentor: -4 },
    memory: `你去跟${PEOPLE.mentor.name}說你要走。他什麼都沒有說，只是把桌上那盒茶葉推給你。`,
    log: '你以為他會罵你，或者至少問一句為什麼。他只是把桌上那盒茶葉推過來：「拿去。」那盒茶葉你放了很多年，沒有喝。',
  },
  {
    id: 'lv_patient_returns',
    scene: 'clinic',
    mood: 'weary',
    stages: ['aesthetic'],
    once: true,
    // 這一幕不是離開那一年，是幾年之後——他不知道你走了，還在掛你的號。
    forced: (s) =>
      s.career === 'aesthetic' &&
      P(s).patient.alive &&
      P(s).patient.stage > 0 &&
      s.flags.leftAt !== undefined &&
      s.age - s.flags.leftAt === 3,
    text: `${PEOPLE.patient.name}的兒子打電話到診所來找你。他說他爸爸這三年每年都去舊醫院掛你的號，掛不到，也不肯改掛別人。`,
    effects: { self: -10 },
    bond: { patient: 6 },
    memory: `${PEOPLE.patient.name}每年都去舊醫院掛你的號，掛了三年。沒有人告訴他你已經不在那裡了。`,
    log: '「他說要等你回來。」你在診所的更衣室裡站了一下，外面等著的是下午三點的雷射。那天你回撥了，但他兒子沒有接。',
  },
];
