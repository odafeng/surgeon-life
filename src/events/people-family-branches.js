// 家庭的分支：不交往、不結婚、未婚生子，以及沒有被顧到的孩子。
//
// 交往不是一次過的關卡。你可以一直不交，機會會用不同的形式回來——
// 二十九歲是朋友介紹，四十歲是病人的家屬，五十六歲是有人看見你的存款。
// 每一次都可以說不，而說不是一個完整的、可以走到底的人生。
//
// 結婚與生小孩不互斥。你可以不結婚也有孩子，只是那樣的孩子，
// 沒有一張紙替你把時間鎖起來。
import { advance } from '../characters.js';

const S = (s) => s.people.spouse;
const single = (s) => s.family.stage === 'single' && !S(s).gone;
const kidAge = (s, i = 0) => (s.family.children[i] ? s.age - s.family.children[i].bornAt : -1);

export const FAMILY_BRANCH_EVENTS = [
  // ───────── 機會會再來 ─────────
  {
    id: 'fb_reunion_meet',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => single(s) && s.age >= 33,
    text: '大學同學會。有個當年坐你隔壁的人問你還記不記得大體解剖那學期，你們兩個是唯一撐到最後才走的。散場後{她}問你要不要吃宵夜。',
    choices: [
      {
        label: '去。',
        hint: '家庭 ≥ 15%',
        bond: { spouse: 8 },
        memory: '同學會散場後你去吃了那頓宵夜，然後有了一個人。',
        set: (s) => {
          s.family.stage = 'dating';
          s.family.floor = 15;
          advance(s, 'spouse', 1);
        },
        log: '你們吃到兩點。{她}說{她}知道外科是什麼樣子，因為{她}爸爸也是。你第一次覺得不用解釋。',
      },
      {
        label: '推說明天有刀。',
        effects: { self: -2 },
        log: '你確實有刀。回家的路上你想，如果沒有那台刀會怎樣，然後想起明天後天都有。',
      },
    ],
  },
  {
    id: 'fb_late_meet',
    priority: true,
    scene: 'clinic',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => single(s) && s.age >= 42,
    // 「女兒」是寫死的名詞，代稱掃描抓不到它——女性主角在同一幕遇到女兒、
    // 接受之後配偶卻是宗翰。這個遊戲目前只寫異性伴侶，那就照實分岔，
    // 而不是在這一幕偷偷支援同性伴侶（那是另一個範圍大得多的決定）。
    text: (s) =>
      s.gender === 'f'
        ? '一位長期追蹤的病人出院時，他兒子留了電話給你。「不是為了我爸的事。」他說完自己也笑了，「是為了你上次在走廊上打瞌睡的樣子。」'
        : '一位長期追蹤的病人出院時，他女兒留了電話給你。「不是為了我爸的事。」她說完自己也笑了，「是為了你上次在走廊上打瞌睡的樣子。」',
    choices: [
      {
        label: '打那通電話。',
        hint: '家庭 ≥ 15%',
        bond: { spouse: 8 },
        memory: (s) =>
          s.gender === 'f'
            ? '四十幾歲那年，一個病人的兒子留了電話給你，你打了。'
            : '四十幾歲那年，一個病人的女兒留了電話給你，你打了。',
        set: (s) => {
          s.family.stage = 'dating';
          s.family.floor = 15;
          advance(s, 'spouse', 1);
        },
        log: '你想了三個禮拜才打。{她}接起來的第一句是：「我還以為你不會打了。」',
      },
      {
        label: '把紙條收進白袍口袋，然後洗了。',
        effects: { self: -3 },
        log: '那件白袍送洗回來，口袋裡有一團紙屑。你把它拿出來丟掉，動作很快，沒有多看。',
      },
    ],
  },
  {
    // 使用者指定的殘酷分支：晚年有錢的單身醫師，會遇到看見錢的人。
    id: 'fb_gold_digger',
    priority: true,
    scene: 'aesthetic',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => single(s) && s.age >= 56 && s.attrs.money >= 1800,
    text: '五十幾歲了，有人開始靠近你。{她}比你小十八歲，很會聊天，知道你哪一天有刀、哪一天有空。{她}說{她}只是覺得你「很孤單」。',
    choices: [
      {
        label: '你很久沒有人這樣陪了。',
        effects: { self: 10, familyBond: 8 },
        bond: { spouse: 6 },
        memory: '五十幾歲那年有人陪著你，你沒有去細想為什麼。',
        set: (s) => {
          s.family.stage = 'dating';
          advance(s, 'spouse', 1);
          s.flags.lateRomance = true;
        },
        log: '你們一起吃飯、看展、出國。你很久沒有這樣笑過了。你的同事說你最近氣色很好。',
      },
      {
        label: '你在{她}問到你有幾間房的時候，就懂了。',
        effects: { self: -6 },
        log: '你客氣地結束了那頓飯。回家路上你想，也許是你多心了。這個念頭讓你更難過。',
      },
    ],
  },
  {
    id: 'fb_drain_starts',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    once: true,
    forced: (s) => s.flags.lateRomance && !s.flags.beingDrained && !S(s).gone,
    text: '她的家人陸續出了事：弟弟的公司、媽媽的手術、一筆說好三個月就還的錢。每一件都合情合理，每一件都要錢。',
    effects: { money: -260, self: -4 },
    set: (s) => {
      s.flags.beingDrained = true;
    },
    log: '你付了。你告訴自己這是感情裡本來就會有的事。從這一年起，你的存摺開始每年少掉一大塊。',
  },
  {
    id: 'fb_drain_realise',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    forced: (s) => s.flags.beingDrained && s.age >= 60,
    text: '你的會計師打電話來，語氣很小心：「醫師，您這三年匯出去的錢……我還是跟您確認一下比較好。」',
    choices: [
      {
        label: '結束這段關係。',
        effects: { self: -10, familyBond: -12 },
        memory: '會計師打電話來之後，你才承認自己一直都知道。',
        set: (s) => {
          s.flags.beingDrained = false;
          s.people.spouse.gone = true;
          s.family.stage = 'single';
          s.family.floor = 0;
        },
        log: '你把話講清楚，{她}沒有吵，收拾東西就走了。走之前{她}說：「你也不是完全沒得到東西啊。」你想反駁，但你想不出來。',
      },
      {
        label: '「我知道。我自己的錢，我自己決定。」',
        effects: { self: 4, familyBond: 4 },
        memory: '你知道那是怎麼回事，你還是選擇繼續。',
        log: '你請會計師不要再提。你不是被騙的，你是知情的——這件事讓它變成另一種東西，你自己也說不上是什麼。',
      },
    ],
  },

  // ───────── 一個人也可以 ─────────
  {
    id: 'fb_single_peace',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 4,
    cond: (s) => single(s) && s.age >= 48 && s.attrs.self >= 60,
    text: '週末，你一個人在家煮了一鍋東西，聽了半張黑膠，看完了一本放很久的書。沒有人問你什麼時候回來，也沒有人在等。',
    effects: { self: 8, familyBond: 4 },
    memory: '有一個週末你一個人過得很好，而且你確定那不是安慰自己。',
    log: '晚上你想起同事說「一個人不寂寞嗎」。你想了想，覺得寂寞跟後悔是兩件事，而你只有前面那個。',
  },
  {
    id: 'fb_emergency_contact',
    priority: true,
    scene: 'clinic',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 4,
    cond: (s) => single(s) && s.age >= 50 && s.attrs.self < 55,
    text: '你自己做健檢，表格上有一欄「緊急聯絡人」。你拿著筆停了很久，最後填了科辦的分機。',
    effects: { self: -8 },
    memory: '健檢表的緊急聯絡人那一欄，你填了科辦的分機。',
    log: '護理師看了一眼，沒有說什麼。她應該看過很多次了，在這間醫院。',
  },

  // ───────── 不結婚，但有孩子 ─────────
  {
    id: 'fb_unwed_pregnancy',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) =>
      S(s).stage >= 1 &&
      !S(s).gone &&
      s.family.stage !== 'married' &&
      s.family.stage !== 'single' &&
      s.family.kids === 0 &&
      s.family.invested >= 4,
    // 懷孕的是誰，決定了這一幕誰在講話。女性主角是自己說出口的那個人。
    text: (s) =>
      s.gender === 'f'
        ? '你在值班室驗的。兩條線。你回家跟{配偶}說的時候，先講的是「我沒有要逼你結婚」——你自己也不知道為什麼要先講這句。'
        : '{她}說：「我懷孕了。」然後補了一句：「我沒有要逼你結婚。」你們兩個都愣在那裡，誰都沒有先講下一句。',
    choices: [
      {
        label: '「那我們結婚吧。」',
        hint: '家庭 ≥ 20%，孩子出生後 25%',
        effects: { familyBond: 12, self: 5 },
        bond: { spouse: 12 },
        set: (s) => {
          s.family.stage = 'married';
          s.family.marriedAt = s.age; // 婚禮那一幕要靠這個，不然會拖到已婚十年後才辦
          s.family.floor = 20;
          advance(s, 'spouse', 3);
          s.flags.expectingChild = true;
        },
        log: (s) =>
          s.gender === 'f'
            ? '{配偶}說你不用因為這樣就結婚。你說不是因為這樣。你們兩個都知道有一半是，有一半不是。'
            : '{她}說你不用因為這樣就結婚。你說不是因為這樣。你們兩個都知道有一半是，有一半不是。',
      },
      {
        label: (s) =>
          s.gender === 'f' ? '「孩子我自己生，婚我們再想。」' : '「孩子我會負責，婚我們再想。」',
        hint: '家庭 ≥ 10%',
        effects: { self: -2 },
        bond: { spouse: -4 },
        memory: (s) =>
          s.gender === 'f'
            ? '你懷孕了，你說孩子你自己生，婚再想。你們一直沒有再想。'
            : '{她}懷孕了，你說孩子你會負責，婚再想。你們一直沒有再想。',
        set: (s) => {
          s.flags.expectingChild = true;
          s.flags.unwed = true;
          s.family.floor = 10; // 沒有一張紙替你把時間鎖起來，也就沒有人擋著你不去
        },
        log: '{她}點點頭，說好。這件事你們後來沒有再談過。沒有紙，就沒有人規定你每週要回去幾次。',
      },
    ],
  },
  {
    id: 'fb_unwed_pressure',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 4,
    cond: (s) => s.flags.unwed && s.family.kids > 0,
    text: '過年，親戚問起孩子的事，語氣裡有東西。媽媽在旁邊替你打圓場：「他們忙嘛。」你聽得出來她自己也不知道要怎麼說。',
    choices: [
      {
        label: '把該辦的辦一辦。',
        effects: { familyBond: 10, self: 4 },
        bond: { spouse: 10 },
        set: (s) => {
          s.family.stage = 'married';
          s.family.marriedAt = s.age;
          s.family.floor = Math.max(s.family.floor, 25);
          s.flags.unwed = false;
          // 下面那句 log 明寫「沒有婚禮」，{她}也說了這樣就好。marriedAt 排的是婚禮那一幕，
          // 於是 500 局裡有 296 局隔年去敬酒，把剛講完的話抵掉。這條路走的就是不辦。
          s.flags.noWedding = true;
        },
        log: '沒有婚禮，只有戶政事務所和兩份影本。{她}說這樣就好。孩子那天穿了新衣服，不知道發生了什麼事。',
      },
      {
        label: '「我們這樣就很好。」',
        effects: { self: 2, familyBond: -4 },
        log: '你說得很自然。親戚沒有再問。回台北的車上，{她}看著窗外，一路沒有講話。',
      },
    ],
  },

  // ───────── 沒有被顧到的孩子 ─────────
  {
    id: 'fb_kid_warning',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) =>
      s.family.kids > 0 &&
      kidAge(s) >= 12 &&
      kidAge(s) <= 16 &&
      s.family.neglect >= 2 &&
      !s.flags.kidTrouble,
    text: '導師打電話來，說孩子這學期缺曠很多，交的作業是別人的。「{爸爸}方便來一趟嗎？」你翻了行事曆，最近的空檔在三週後。',
    choices: [
      {
        // 停一次門診不會讓存款少二十萬。真正欠下的是替你代診的那個人。
        label: '把明天的門診請人代，今天就去。',
        effects: { familyBond: 8, self: 4 },
        memory: '導師打電話來的那天，你把門診請人代，當天就去了學校。',
        set: (s) => {
          s.family.neglect = 0;
          s.family.floor = Math.max(s.family.floor, 20);
        },
        log: '你在導師辦公室坐了一小時。回家的車上孩子什麼都沒說，但他上車了，沒有走路回去。替你代診的是同科的學妹，她說沒關係——你把這件事記著。',
      },
      {
        label: '「三週後可以嗎？我這邊真的走不開。」',
        effects: { self: -5, familyBond: -8 },
        set: (s) => {
          s.flags.kidTrouble = 1;
        },
        log: '導師說好。三週後你到的時候，孩子已經兩個禮拜沒去學校了。',
      },
    ],
  },
  {
    id: 'fb_kid_police',
    priority: true,
    scene: 'corridor',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    forced: (s) => s.flags.kidTrouble === 1 && s.family.neglect >= 2 && kidAge(s) <= 19,
    text: '半夜兩點，派出所打電話來。你在刀房外面接的，還穿著手術衣。對方說孩子跟人起衝突，對方掛了彩。',
    choices: [
      {
        label: '把刀交給學弟，現在就過去。',
        // 賠償是真的（結果文明寫「賠了錢，簽了字」），但八十萬是憑空的數字。
        effects: { self: 6, familyBond: 10, health: -4, money: -25 },
        memory: '派出所半夜打來的那次，你把刀交給學弟，穿著手術衣就過去了。',
        set: (s) => {
          s.flags.kidTrouble = 0;
          s.family.neglect = 0;
          s.family.floor = Math.max(s.family.floor, 25);
          s.flags.kidSaved = true;
        },
        log: '你在派出所待到天亮，賠了錢，簽了字。回家路上他坐在後座，開口說了三年來第一句完整的話：「你為什麼要來。」',
      },
      {
        label: '刀開到一半，你請{她}先過去。',
        // 同一件事，賠償一樣要付——只是付錢的人不是你。
        effects: { self: -10, familyBond: -14, money: -25 },
        memory: '派出所半夜打來的時候，你正在開刀，你請{她}先過去。',
        set: (s) => {
          s.flags.kidTrouble = 2;
        },
        log: '那台刀你開得很好，病人沒事。你到派出所的時候，事情都處理完了，錢是{她}墊的，字也是{她}簽的，他們已經回家了。',
      },
    ],
  },
  {
    id: 'fb_kid_lost',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    forced: (s) => s.flags.kidTrouble === 2 && kidAge(s) >= 18,
    text: '孩子搬出去了，沒有留地址。你透過別人才知道他在做什麼——不是好事，但也還沒到最壞的地步。',
    effects: { self: -14, familyBond: -18 },
    memory: '孩子搬出去那年沒有留地址，你是透過別人才知道他在做什麼。',
    set: (s) => {
      s.flags.kidEstranged = true;
    },
    log: '你每個月匯一筆錢到他的戶頭，他沒有退回來，也沒有說過謝謝。這是你們現在唯一還連著的東西。',
  },
  {
    id: 'fb_kid_saved_later',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 4,
    cond: (s) => s.flags.kidSaved && kidAge(s) >= 22,
    text: '孩子退伍之後找了工作，在你完全不懂的行業。過年他自己回來了，還帶了東西。',
    effects: { self: 10, familyBond: 12 },
    memory: '那年過年孩子自己回來了，還帶了東西。',
    log: '吃飯的時候他講工作上的事，你一句都聽不懂，但你聽完了。他走之前說：「那天你穿手術衣來，很丟臉。」然後笑了。',
  },
];
