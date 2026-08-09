// 病人・王慶昌。你早年從鬼門關拉回來的人。
//
// 弧線：0 那台刀 → 1 他每年回來，帶自己種的東西 → 2 這一次你可能救不回來 → 3 收束。
// 只進不退，用 advance() 推。他記得的細節比你多，因為那是他的一生，而你那天只是在值班。
import { advance } from '../characters.js';

const W = (s) => s.people.patient;
// 認識他幾年了。整條線的年資、他的年齡、以及「他每年都回來」的節奏都靠這個——
// 沒有它的話，stage 1 的四幕會在連續四年演完，而台詞裡他老了十八歲。
const years = (s) => (W(s).metAt ? s.age - W(s).metAt : 0);
/** 這一幕至少要等認識滿 n 年。 */
const after = (n) => (s) => W(s).stage === 1 && W(s).alive && years(s) >= n;

export const PATIENT_EVENTS = [
  // ───────── 第 0 幕：那台刀 ─────────
  {
    id: 'w_the_night',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['resident', 'attending'],
    once: true,
    weight: 4,
    cond: (s) => W(s).stage === 0 && s.attrs.clinical >= 40,
    text: '凌晨兩點，急診推上來一個計程車司機，肚子硬得像一塊板子，血壓量不到。立位 X 光的橫膈下有一條游離氣體。護理師唸出名字：王慶昌，五十二歲。',
    choices: [
      {
        label: '不等了，直接推刀房。',
        effects: { clinical: 4, health: -4, self: 6 },
        stats: { surgeries: 1, livesSaved: 1 },
        bond: { patient: 12 },
        memory: '凌晨兩點，你沒有等，直接把王慶昌推進刀房。他活下來了。',
        set: (s) => {
          s.people.patient.metAt = s.age; // 之後的年資與他的年齡都從這一年算
          advance(s, 'patient', 1);
        },
        log: '五個小時。十二指腸前壁一個一公分的洞，腹腔裡沖了八公升才乾淨。天亮的時候他的血壓回來了。你在更衣室脫手術衣，手抖到解不開背後那條帶子。',
      },
      {
        label: '照流程走，先做電腦斷層。',
        effects: { clinical: 2, self: -3 },
        stats: { surgeries: 1, livesSaved: 1 },
        bond: { patient: 6 },
        set: (s) => {
          s.people.patient.metAt = s.age; // 之後的年資與他的年齡都從這一年算
          advance(s, 'patient', 1);
        },
        log: '斷層做完是三點四十。那台刀開了七個小時，他活下來，多躺了十九天。那四十分鐘你到現在還在想。',
      },
    ],
  },
  {
    id: 'w_your_name',
    scene: 'clinic',
    mood: 'lifted',
    priority: true,
    stages: ['resident', 'attending'],
    once: true,
    weight: 3,
    cond: (s) => W(s).stage === 1 && W(s).alive && years(s) <= 1, // 出院那天的事
    text: '王慶昌出院那天在護理站等了一個下午，就為了問一件事：「那天晚上開刀的醫師，叫什麼名字？」值班的人指了指走廊盡頭。',
    effects: { self: 6 },
    bond: { patient: 6 },
    log: '他把你的名字寫在一張計程車收據背面，折好，放進胸前口袋。他說：「我以後每年都會來。」你當時以為那是客氣話。',
  },

  // ───────── 第 1 幕：他每年回來 ─────────
  {
    id: 'w_annual_guava',
    scene: 'clinic',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: after(2),
    text: '門診叫到王慶昌。他提著一袋自己種的芭樂進來，先把袋子放到你桌上才坐下：「醫師，今年這批比較甜。」他的追蹤影像沒有變化。',
    effects: { self: 5 },
    bond: { patient: 4 },
    log: '看診三分鐘，講芭樂講了七分鐘。門口的燈號跳了兩次，護理師探頭看了一眼，沒有說話。',
  },
  {
    id: 'w_he_tells_everyone',
    once: true,
    scene: 'corridor',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 2,
    cond: after(4),
    text: '你在批價櫃檯前面聽見王慶昌跟旁邊的陌生人說：「這間醫院那個某某醫師，我的命是他救的。」他講得很大聲，那個陌生人一直點頭。',
    effects: { self: 4 },
    bond: { patient: 3 },
    log: '他的版本裡，那台刀開了十個小時，你三天沒睡。你沒有更正。有些數字放在他那邊比較好。',
  },
  {
    id: 'w_brings_neighbour',
    scene: 'clinic',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: after(6),
    text: '王慶昌帶了一個鄰居來，站在診間門口不好意思地笑：「他肚子痛很久了，掛不到號。你幫他看一下就好。」候診區還有二十七個人。',
    choices: [
      {
        label: '加號，看完。',
        effects: { health: -2, self: 2, familyBond: -1 },
        bond: { patient: 5 },
        log: '那天門診看到八點十分。鄰居是膽結石，你替他排了刀。王慶昌之後又帶了六個人來，每一個都說「你幫他看一下就好」。',
      },
      {
        label: '請他去掛號，跟他解釋為什麼。',
        effects: { self: -2 },
        bond: { patient: -3 },
        log: '他連說三次歹勢，把鄰居帶走。下次回診他還是帶芭樂，只是沒有再帶人來。你不確定那算不算你贏了。',
      },
    ],
  },
  {
    id: 'w_receipt',
    scene: 'clinic',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => after(14)(s) && s.age >= 44,
    text: '王慶昌今年不是自己開車來的，是兒子載他來。他從皮夾裡抽出那張泛黃的計程車收據，上面你的名字被摸得快看不見了。',
    effects: { self: 6 },
    bond: { patient: 5 },
    memory: (s) => `王慶昌皮夾裡那張計程車收據，寫著你的名字，他留了 ${years(s)} 年。`,
    set: (s) => {
      advance(s, 'patient', 2);
    },
    log: (s) =>
      `「我跟我兒子講，這張不能丟。」他把收據折好放回去，「醫師，我 ${52 + years(s)} 了。」你翻他的病歷，才發現你認識他已經 ${years(s)} 年。`,
  },

  // ───────── 第 2 幕：這一次你可能救不回來 ─────────
  {
    id: 'w_recurrence',
    scene: 'clinic',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => W(s).stage >= 2 && W(s).alive,
    text: '例行追蹤的斷層，你多看了兩秒，把片子拉近。胰臟頭部，兩公分，邊界不清楚。王慶昌坐在對面，正在講今年的芭樂收成。',
    effects: { self: -6 },
    bond: { patient: 4 },
    set: (s) => {
      s.flags.wangRelapse = true;
    },
    log: '你等他講完才開口。他聽完只問了一句：「醫師，還是你開嗎？」',
  },
  {
    id: 'w_the_decision',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    // 你在門診看見那個影子，接下來的事就不是抽籤決定的了。
    forced: (s) => s.flags.wangRelapse && !s.flags.wangDecided && W(s).alive,
    text: (s) =>
      `術前討論。王慶昌 ${52 + years(s)} 歲，心臟功能不好，腫瘤貼著腸繫膜上動脈。麻醉科在紀錄上寫「風險極高，建議審慎評估」。他兒子在會客室等你的答案，王慶昌自己已經把同意書簽好了。`,
    choices: [
      {
        label: '開。他當年就是這樣被拉回來的。',
        effects: { self: -4, health: -6, clinical: 2 },
        stats: { surgeries: 1 },
        bond: { patient: 8 },
        set: (s) => {
          s.flags.wangDecided = true;
        },
        log: '十一個小時，腫瘤拿下來了。第九天他在加護病房敗血症。你每天早上七點去看他，連續二十六天，一天都沒有斷。',
      },
      {
        label: '不開。讓他這段時間好過一點。',
        effects: { self: -6 },
        bond: { patient: 5 },
        set: (s) => {
          s.flags.wangDecided = true;
        },
        log: '你解釋了四十分鐘。他聽完點頭：「醫師你說不開，那就不開。」他信你，跟第一次那個晚上一樣——只是這一次你要的是他別上刀台。',
      },
    ],
  },
  {
    id: 'w_last_visit',
    scene: 'clinic',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.wangDecided && !s.flags.wangFarewell && W(s).alive,
    text: '王慶昌最後一次自己走進診間。他瘦了十四公斤，襯衫領口空出一圈。他沒有問病情，只說：「醫師，那塊地我租給人了。芭樂樹留三棵，我兒子會顧。」',
    effects: { self: -5 },
    bond: { patient: 6 },
    set: (s) => {
      s.flags.wangFarewell = true;
    },
    log: '他起身的時候扶了一下桌角。走到門口他回頭說：「這些年，我都是賺到的。」你送他到電梯口，那是你這輩子走過最長的一段走廊。',
  },

  // ───────── 第 3 幕：收束 ─────────
  {
    id: 'w_the_end',
    scene: 'corridor',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.wangFarewell && W(s).alive,
    text: '禮拜三下午，他兒子打電話到門診找你。王慶昌走了，在家裡，很安靜。他撐了十一個月，比誰算的都久。',
    effects: { self: -8, health: -2 },
    bond: { patient: 3 },
    memory: '王慶昌走的那天，他兒子說：我爸最後幾天一直在講你的名字。',
    set: (s) => {
      W(s).alive = false;
      advance(s, 'patient', 3);
    },
    log: '「我爸最後幾天一直在講你的名字。」告別式上他兒子塞給你一個紙袋，裡面六顆芭樂：「今年最後一批，我爸交代要留給你。」',
  },
  {
    id: 'w_the_box',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => !W(s).alive,
    text: '王慶昌的兒子帶了一個舊餅乾盒來醫院。裡面是十九張門診繳費收據、一張手術同意書影本，還有一本記事簿，每一年的同一天都寫著同一句話。',
    effects: { self: -4 },
    bond: { patient: 2 },
    log: '那句是「今仔日我又多活一年」，從第一年寫到第十九年，字跡一年比一年抖。他兒子說：「我爸把開刀那天當生日在過。」',
  },
  {
    id: 'w_grandson',
    scene: 'or',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => !W(s).alive && s.age >= 56,
    text: '見習醫學生跟刀。點名唸到一個姓王的名字，你抬頭多看了他一眼。下刀後他自己走過來：「醫師，我阿公是王慶昌。」',
    effects: { teaching: 5, self: 8 },
    bond: { patient: 4 },
    log: '「他每年都講那天晚上，講到我會背。」他把口罩拉下來，「所以我來念醫學系。」你點點頭，沒有告訴他外科這幾年招不滿人。',
  },
];
