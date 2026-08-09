// 家庭。另一半・郁涵，孩子，還有逐漸老去的父母。
//
// 在此之前「家庭」是一條數值條：兩百局跑下來沒有一個人結得成婚，
// 因為求婚事件要求家庭 25% 又跟三百多個事件搶抽籤。於是分配家庭時間毫無意義。
// 這條線把家庭變成一群有名字、會老、會走的人——你分時間給他們，才看得到差別。
//
// 進程看的是 family.invested（累計有給時間的年數），不是某一年突然投入的數字。
// 感情要的是持續出現。
import { advance } from '../characters.js';

const S = (s) => s.people.spouse;
const kidAge = (s, i = 0) => (s.family.children[i] ? s.age - s.family.children[i].bornAt : -1);

export const FAMILY_ARC_EVENTS = [
  // ───────── 相識 ─────────
  {
    id: 'fa_meet',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    once: true,
    // 這一幕不看你之前有沒有分時間給「家庭」——沒有人的時候，
    // 沒有人會把時間分給一個空的欄位。機會要先來，承諾才有得許。
    weight: 7,
    cond: (s) => s.family.stage === 'single' && !S(s).gone && s.age >= 27,
    text: '朋友介紹你認識了郁涵。第一次見面，她問：「聽說你們醫師都很忙？」你發現自己已經三年沒有跟不是同事的人吃過飯。',
    choices: [
      {
        label: '認真試試看。',
        hint: '家庭 ≥ 15%',
        bond: { spouse: 10 },
        memory: '你對郁涵說了實話：忙到沒有自己的時間。她笑了，說至少你誠實。',
        set: (s) => {
          s.family.stage = 'dating';
          s.family.floor = 15; // 剛好是關係能往前走的最低限度
          advance(s, 'spouse', 1);
        },
        log: '她笑了：「至少你誠實。」你們開始約會——大多約在醫院附近。從這個月起，你的行事曆上多了一格不能動的東西。',
      },
      {
        label: '現在真的沒空。',
        effects: { self: -2 },
        log: '你說等這一年過去。這句話你之後還會說很多次，對很多人。有些人會等，有些不會。',
      },
    ],
  },
  {
    id: 'fa_near_hospital',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['pgy', 'resident', 'attending'],
    once: true,
    weight: 4,
    cond: (s) => s.family.stage === 'dating' && !S(s).gone,
    text: '你們的約會地點半徑不超過醫院八百公尺，因為你隨時可能被 call 回去。這個月第四次，你在她把主餐切開之前站起來。',
    effects: { self: -3 },
    bond: { spouse: 2 },
    log: '她把兩份都打包了。你回到刀房的時候，口袋裡還有那張沒用到的電影票。',
  },
  {
    id: 'fa_learns_schedule',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    once: true,
    weight: 5,
    cond: (s) =>
      S(s).stage >= 1 && s.family.stage === 'dating' && s.family.invested >= 3 && !S(s).gone,
    text: '郁涵把你的班表輸進了她自己的行事曆。她說這樣比較好安排，語氣像在講一件很普通的事。',
    effects: { familyBond: 8, self: 4 },
    bond: { spouse: 10 },
    memory: '郁涵把你的班表輸進她自己的行事曆，說這樣比較好安排。',
    set: (s) => {
      s.family.stage = 'steady';
      advance(s, 'spouse', 2);
    },
    log: '愛一個外科醫師是一門需要天分的學問。她正在學，而且學得比你快。',
  },

  // ───────── 求婚與婚禮 ─────────
  {
    id: 'fa_ring',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 7,
    cond: (s) => s.family.stage === 'steady' && s.family.invested >= 5 && !S(s).gone,
    text: '戒指在你口袋裡放了三個月。三次想拿出來，三次被 on call 打斷。這次你訂了餐廳，而且把手機交給同事代班。',
    choices: [
      {
        label: '今天，求婚。',
        hint: '家庭 ≥ 20%（她會提這個條件）',
        effects: { familyBond: 15, self: 8 },
        bond: { spouse: 15 },
        memory: '你把手機交給同事代班，然後求婚了。她只提一個條件：每週至少一起吃一頓晚餐。',
        set: (s) => {
          s.family.stage = 'married';
          s.family.floor = 20;
          advance(s, 'spouse', 3);
        },
        log: '她哭著答應，只提了一個條件：「每週至少一起吃一頓晚餐。」你答應了。你們都知道這個承諾有多難——從今年起，家庭時間不得低於 20%。',
      },
      {
        label: '再等等，等升上主治穩定一點。',
        effects: { self: -4, familyBond: -5 },
        bond: { spouse: -8 },
        log: '「等穩定一點」——這句話你已經說了三年。她笑了笑，把菜單遞給你。戒指又回到口袋裡。',
      },
    ],
  },
  {
    id: 'fa_wedding',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 5,
    cond: (s) => s.family.stage === 'married' && S(s).stage >= 3 && S(s).stage < 4 && !S(s).gone,
    text: '婚禮當天，你的手機在敬酒到第三桌時響了。是急診，車禍多重外傷，需要人手。',
    choices: [
      {
        label: '請假就是請假。今天不接。',
        effects: { familyBond: 10, self: 3 },
        bond: { spouse: 12 },
        memory: '婚禮當天急診 call 你，你沒有接。那是你人生中少數幾次把電話關掉。',
        set: (s) => advance(s, 'spouse', 4),
        log: '你按掉電話，繼續敬酒。後來聽說是學弟上的，病人活下來了。郁涵一整晚都沒有提這件事。',
      },
      {
        label: '換下禮服，回醫院。',
        effects: { familyBond: -12, self: -6, health: -4 },
        stats: { surgeries: 1, livesSaved: 1 },
        bond: { spouse: -10 },
        memory: '你在自己的婚禮上換下禮服，回醫院開刀。',
        set: (s) => advance(s, 'spouse', 4),
        log: '你趕回去，刀開到凌晨三點，病人活下來了。婚宴的照片裡，新郎那一桌後半場都是空的。',
      },
    ],
  },

  // ───────── 孩子 ─────────
  {
    id: 'fa_pregnancy',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 7,
    cond: (s) =>
      S(s).stage >= 1 &&
      s.family.stage === 'married' &&
      s.family.kids === 0 &&
      s.family.invested >= 7 &&
      !S(s).gone,
    text: '晚餐桌上，郁涵輕輕地問：「我們……要不要有個孩子？」',
    choices: [
      {
        label: '要。',
        hint: '孩子出生後家庭 ≥ 25%，存款每年持續消耗',
        effects: { familyBond: 10, self: 4 },
        bond: { spouse: 8 },
        set: (s) => {
          s.flags.expectingChild = true;
        },
        log: '你們開始準備。你把接下來三個月的刀表拿出來看，第一次覺得那些格子太滿了。',
      },
      {
        label: '「等生活穩定一點。」',
        effects: { familyBond: -6 },
        bond: { spouse: -6 },
        log: '你們都笑了——因為彼此都知道，那一天不會自己到來。',
      },
    ],
  },
  {
    id: 'fa_birth',
    priority: true,
    scene: 'or',
    mood: 'lifted',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    forced: (s) => s.flags.expectingChild && s.family.kids === 0,
    text: '孩子出生那天，你在開刀。護理師站在無菌範圍外，把手機螢幕轉過來，隔著兩公尺給你看了照片。',
    effects: { familyBond: 8, self: 6 },
    bond: { spouse: 5 },
    memory: '孩子出生那天你在開刀。護理師隔著兩公尺，把手機螢幕轉過來給你看。',
    set: (s) => {
      s.family.kids = 1;
      s.family.children.push({ bornAt: s.age });
      // 婚生的孩子有一張紙替他把你的時間鎖住；未婚生的沒有。
      // 這個差別不是道德判斷，是制度的實況，而後果會落在孩子身上。
      s.family.floor = s.flags.unwed ? 10 : 25;
      s.flags.expectingChild = false;
    },
    log: '你隔著口罩笑了，眼睛有點酸。然後你退開兩步，讓學弟接手收尾——手在抖的時候還硬要關腹，那不是敬業，是拿病人賭。',
  },
  {
    id: 'fa_first_steps',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => kidAge(s) >= 1 && kidAge(s) <= 3 && s.alloc.family >= 20,
    text: '你難得準時到家，剛好看見孩子扶著茶几站起來，走了三步。郁涵在旁邊拿著手機，錄到一半才發現你回來了。',
    effects: { familyBond: 12, self: 8 },
    bond: { spouse: 6 },
    memory: '你難得準時到家，剛好看見孩子第一次走路。',
    log: '「你看到了。」她說。你才知道她已經替你錄了很多次，怕你錯過。',
  },
  {
    id: 'fa_kindergarten',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 6,
    cond: (s) => kidAge(s) >= 4 && kidAge(s) <= 6 && s.alloc.family < 20,
    text: '幼稚園的親子日你又缺席了。老師後來轉述，孩子指著全家福說：「這是我爸爸，住在醫院。」',
    effects: { familyBond: -14, self: -6 },
    bond: { spouse: -4 },
    memory: '孩子指著全家福說：這是我爸爸，住在醫院。',
    log: '你把這句話轉述給同事聽，大家都笑了。笑完之後，休息室安靜了很久。',
  },
  {
    id: 'fa_sports_day',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => kidAge(s) >= 7 && kidAge(s) <= 12 && s.alloc.family >= 20,
    text: '小學運動會。你請了假，站在跑道邊。孩子跑最後一棒，經過你面前的時候大喊了一聲「爸」。',
    effects: { familyBond: 14, self: 10 },
    memory: '小學運動會，孩子跑最後一棒，經過你面前時大喊了一聲爸。',
    log: '他們班第四名。回家路上他一直講那一段，你一句都沒有聽膩。',
  },
  {
    id: 'fa_composition',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => kidAge(s) >= 8 && kidAge(s) <= 12,
    text: '孩子的作文貼在聯絡簿裡，題目是〈我的爸爸〉。全文一百二十字，有四十個字在講你「很偉大，救了很多人」。',
    choices: [
      {
        label: '跟他說，爸爸也想多陪你。',
        effects: { familyBond: 8, self: -4 },
        memory: '你跟孩子說爸爸也想多陪你，他說：我知道啊，你要救人。',
        log: '他說：「我知道啊，你要救人。」那句話他講得很順，順到你知道他練習過很多次。',
      },
      {
        label: '把作文收進抽屜，什麼都沒說。',
        effects: { self: -6 },
        log: '那張紙你留了很多年。每次搬家整理到，你都會停下來看一次，然後放回去。',
      },
    ],
  },
  {
    id: 'fa_teenager',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) => kidAge(s) >= 13 && kidAge(s) <= 17,
    text: '孩子上高中之後話變少了。你問他今天怎麼樣，他說「還好」。你想不出下一句要問什麼。',
    choices: [
      {
        label: '每天還是問，問到他願意講。',
        effects: { familyBond: 10, self: 3 },
        bond: { spouse: 4 },
        log: '第三個月的某一天，他自己開口講了一件學校的事，講了二十分鐘。你一句都沒有打斷。',
      },
      {
        label: '算了，青春期都這樣。',
        effects: { familyBond: -8, self: -3 },
        log: '你沒有再問。等你想再問的時候，他已經上大學，一個月回來一次。',
      },
    ],
  },
  {
    id: 'fa_child_choice',
    priority: true,
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 7,
    cond: (s) => kidAge(s) >= 17 && kidAge(s) <= 19,
    text: '孩子拿著志願表來找你：「我在想要不要填醫學系。」他看著你，等你的答案。整個客廳很安靜。',
    choices: [
      {
        label: '「你自己決定。但我會告訴你這一行真正的樣子。」',
        effects: { self: 6, familyBond: 6 },
        memory: '孩子問要不要填醫學系，你把這一行真正的樣子講給他聽，然後讓他自己決定。',
        set: (s) => {
          s.flags.childToldTruth = true;
        },
        log: '你講了兩個小時，工時、點值、醫糾、還有那些沒有人會記得的半夜。他聽完說：「我再想想。」',
      },
      {
        label: '「別走這條路。」',
        effects: { self: -4, familyBond: 4 },
        memory: '你的孩子問要不要當醫生，你說：別走這條路。',
        set: (s) => {
          s.flags.childWarnedOff = true;
        },
        log: '他愣了一下：「可是你不是說這是很有意義的工作嗎？」你說是。你沒有說完的是後半句。',
      },
      {
        label: '「好啊，很好的選擇。」',
        effects: { self: -8, familyBond: 2 },
        memory: '你的孩子說想當醫生，你說很好。你說完就後悔了。',
        log: '你說完就後悔了。那天晚上你躺著想了很久，想的不是他，是二十幾年前那個坐在圍爐桌上不說話的自己。',
      },
    ],
  },
  {
    id: 'fa_second_child',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 5,
    cond: (s) =>
      S(s).stage >= 1 &&
      s.family.kids === 1 &&
      kidAge(s) >= 3 &&
      s.alloc.family >= 22 &&
      !S(s).gone,
    text: '郁涵問：「要不要再生一個？」她說完自己先笑了：「我知道你會說等一下。」',
    choices: [
      {
        label: '這次不說等一下。',
        effects: { familyBond: 12, self: 4 },
        bond: { spouse: 10 },
        set: (s) => {
          s.family.kids = 2;
          s.family.children.push({ bornAt: s.age + 1 });
        },
        log: '第二個孩子出生那天你在門診。你看完最後一個病人，脫了白袍就跑，趕上了。',
      },
      {
        label: '一個就好，我連一個都陪不了。',
        effects: { self: -3, familyBond: 2 },
        bond: { spouse: 2 },
        log: '她點點頭：「這樣也好。」你聽得出來那是真心的，也聽得出來那不是全部。',
      },
    ],
  },

  // ───────── 危機與修補 ─────────
  {
    id: 'fa_crisis',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    // 你把答應過的事收回去之後，這一幕一定會來。它是警告，不是懲罰——
    // 你還有一年可以回答它。
    forced: (s) =>
      S(s).stage >= 1 &&
      s.family.stage !== 'single' &&
      s.family.neglect >= 3 &&
      !s.flags.familyWarned &&
      !S(s).gone,
    text: '郁涵把離婚協議書放在餐桌上，沒有情緒。「我不是要吵架。我只是想確認，這樣下去我們還算不算一家人。」',
    choices: [
      {
        label: '把明年的刀表拿出來，當場刪掉三分之一。',
        hint: '家庭 ≥ 20%（有孩子則 25%）',
        effects: { familyBond: 18, self: 6, money: -60 },
        bond: { spouse: 14 },
        memory: '郁涵把離婚協議書放在桌上，你當場刪掉了明年三分之一的刀。',
        set: (s) => {
          s.family.neglect = 0;
          s.family.floor = Math.max(s.family.floor, s.family.kids > 0 ? 25 : 20);
          s.flags.familyWarned = true;
        },
        log: '你真的刪了。年底的績效掉到全科最後，主任找你談話。那份協議書後來被拿去墊桌腳。',
      },
      {
        label: '「再撐一下，等我升上去。」',
        hint: '承諾降為 10%',
        effects: { familyBond: -12, self: -8 },
        bond: { spouse: -14 },
        set: (s) => {
          s.family.floor = 10; // 你把答應過的事往回收了
          s.flags.familyWarned = true;
        },
        log: '她收起那張紙，說：「好。」你以為那是答應。三年後你才知道，那是她開始不再期待的那一天。從那年起，你們家的晚餐桌少了一個固定位置。',
      },
    ],
  },
  {
    id: 'fa_leaves',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    // 警告來過，你沒有改。這一幕不是機率問題。
    forced: (s) =>
      s.family.stage !== 'single' &&
      s.flags.familyWarned &&
      s.family.neglect >= 5 &&
      !S(s).gone &&
      s.attrs.familyBond < 40,
    text: '你值完班回家，客廳的燈是暗的。衣櫃空了一半，冰箱上有一張紙條：「你救得了病人，救不了我們。」',
    effects: { familyBond: -25, self: -14 },
    memory: '你值完班回家，衣櫃空了一半。紙條上寫著：你救得了病人，救不了我們。',
    set: (s) => {
      s.people.spouse.gone = true;
      s.family.stage = 'single';
      // 孩子跟著她走了。你變成週末才出現的那個人，
      // 沒有人再規定你要回去幾次——這正是問題開始的地方。
      s.family.floor = s.family.kids > 0 ? 10 : 0;
    },
    log: '你想反駁，但值班鈴響了。等你忙完，已讀不回的人變成了你。',
  },
  {
    id: 'fa_anniversary',
    priority: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'married' && s.alloc.family >= 22 && !S(s).gone,
    text: '結婚紀念日，你難得準時下班。餐廳裡你們聊的還是孩子和房貸——但至少，你在。',
    effects: { familyBond: 10, self: 4 },
    bond: { spouse: 6 },
    log: '「在場」聽起來是很低的標準。對你們家來說，它是奢侈品。',
  },
  {
    id: 'fa_her_career',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 4,
    cond: (s) => S(s).stage >= 1 && s.family.stage === 'married' && s.family.kids > 0 && !S(s).gone,
    text: '郁涵的公司要外派她三年，是她等了很久的位子。她沒有問你的意見，只是說：「我推掉了。孩子總要有人顧。」',
    choices: [
      {
        label: '「你去。孩子我來想辦法。」',
        effects: { self: 8, health: -6, familyBond: 8 },
        bond: { spouse: 16 },
        memory: '郁涵有一個等很久的外派機會，你說：你去，孩子我來想辦法。',
        log: '你把刀表改成早班為主。接送、聯絡簿、發燒的夜晚，從這個月起都是你的。送她上飛機那天，你們兩個誰都沒有說後悔。',
      },
      {
        label: '什麼都沒說。',
        effects: { self: -8, familyBond: -4 },
        bond: { spouse: -8 },
        memory: '郁涵推掉了外派，你什麼都沒說。',
        log: '她把那封信收進抽屜。很多年以後你整理東西翻到，才發現她連回覆信都寫好了，只是沒有寄。',
      },
    ],
  },
  {
    id: 'fa_the_note',
    priority: true,
    scene: 'oncall',
    mood: 'lifted',
    stages: ['resident', 'attending'],
    once: true,
    weight: 4,
    cond: (s) =>
      S(s).stage >= 1 && s.family.stage === 'married' && !S(s).gone && s.attrs.familyBond >= 45,
    text: '你連值三天，回值班室發現桌上有一個便當。郁涵送來的，你不在，她就放著走了。',
    effects: { self: 10, health: 2, familyBond: 5 },
    bond: { spouse: 8 },
    memory: '你連值三天，值班室桌上有一個便當，底下壓著一張紙條：不用回，吃就好。',
    log: '便當底下壓著一張紙條：「不用回，吃就好。」你坐在那裡吃完，然後又值了一天。',
  },

  {
    // 承諾會跟你的野心正面對撞。這一幕是唯一的出口——
    // 你可以把答應過的事收回去，但那句話說出口就收不回來了。
    id: 'fa_ask_relief',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    weight: 6,
    cond: (s) =>
      S(s).stage >= 1 &&
      !S(s).gone &&
      (s.family.floor || 0) >= 20 &&
      (s.attrs.health < 48 || s.alloc.personal < 12),
    text: '你算了一下下半年的行程：升等送審、兩個計畫、加開的刀。怎麼排都排不出時間。郁涵在客廳等你講話，她已經知道你要說什麼了。',
    choices: [
      {
        label: '「這一年真的不行，讓我拚完。」',
        hint: '承諾降為 10%',
        effects: { self: -6, familyBond: -8 },
        bond: { spouse: -10 },
        memory: '你跟郁涵說，這一年真的不行，讓你拚完。她說好。',
        set: (s) => {
          s.family.floor = 10;
        },
        log: '她說：「好。」沒有吵，也沒有問是哪一年。那之後她開始自己安排週末，不再問你有沒有空。',
      },
      {
        label: '不說。把研究砍掉，把時間留著。',
        effects: { self: 6, familyBond: 6, papers: -25 },
        bond: { spouse: 10 },
        memory: '你把送審的計畫撤掉了，沒有跟任何人說原因。',
        log: '你撤掉了那兩個計畫。主任問你為什麼，你說時間喬不過來。他沒有再問，但那一年的考核你拿了乙。',
      },
    ],
  },

  // ───────── 父母 ─────────
  {
    id: 'fa_parent_forgets',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => s.age >= 44,
    text: '過年回家，你發現爸爸講了同一件事三次。他自己也發現了，停下來笑一笑：「老了啦。」',
    effects: { self: -5 },
    set: (s) => {
      s.flags.parentAging = true;
    },
    log: '你在心裡把該做的檢查排了一遍，回台北之後，那些檢查一項都沒有安排。你太忙了。',
  },
  {
    id: 'fa_parent_ill',
    priority: true,
    scene: 'clinic',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 5,
    cond: (s) => s.flags.parentAging && s.age >= 48,
    text: '媽媽打電話來，說爸爸在浴室跌倒。你查了報告，不只是跌倒——影像上有一片不該有的東西。',
    choices: [
      {
        label: '自己開。',
        effects: { self: 4, health: -8 },
        stats: { surgeries: 1 },
        memory: '你父親的刀，你自己開的。',
        set: (s) => {
          s.flags.parentIllness = true;
          s.flags.parentOperatedSelf = true;
        },
        log: '你在同意書的醫師欄簽下自己的名字，家屬欄也是。麻醉科主任問你確定嗎，你說確定。手很穩，穩到你自己覺得陌生。',
      },
      {
        label: '交給信得過的同事。',
        effects: { self: -3 },
        set: (s) => {
          s.flags.parentIllness = true;
        },
        log: '你站在家屬等候區，第一次知道那三個小時有多長。你以前總覺得家屬問太多，那天你問了七次。',
      },
    ],
  },
  {
    id: 'fa_long_care',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    // 病了之後要不要顧、怎麼顧，是接下來一定要面對的事，不是抽到才發生
    forced: (s) => s.flags.parentIllness && !s.flags.parentCare && s.age >= 50,
    text: '爸爸出院了，但生活無法自理。姊姊說她可以顧，但她也有工作。看護一個月要四萬。',
    choices: [
      {
        label: '請看護，錢我出。',
        effects: { self: 2, familyBond: -2 },
        set: (s) => {
          s.flags.parentCare = true;
        },
        log: '你每個月匯錢，每兩週回去一次。你是全家最會處理醫療問題的人，也是最少在場的人。',
      },
      {
        label: '把班調少，自己顧一段時間。',
        effects: { self: 8, health: -6, familyBond: 6 },
        set: (s) => {
          s.flags.parentCare = true;
          s.flags.caredForParent = true;
        },
        log: '你排了三個月的減班。那三個月你替他洗澡、翻身、把藥磨成粉。他有一次醒著的時候說：「歹勢。」你說沒事。',
      },
    ],
  },
  {
    id: 'fa_parent_dies',
    priority: true,
    scene: 'or',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.parentCare && s.age >= 54,
    text: '爸爸走的時候，你在開刀。訊息是刀結束後才看到的，那時候已經過了兩個小時。',
    effects: { self: -12, health: -3, familyBond: -3 },
    memory: '父親走的時候你在開刀，訊息是兩個小時後才看到的。',
    set: (s) => {
      s.flags.parentGone = true;
      s.flags.parentCare = false;
    },
    log: '告別式上，親戚說：「還好你是醫生。」你點頭。你沒有說的是，你當醫生救了很多人的爸爸，就是沒能在自己爸爸旁邊。',
  },
  {
    id: 'fa_mother_alone',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 6,
    cond: (s) => s.flags.parentGone && s.age >= 57,
    text: '媽媽一個人住。你打電話回去，她每次都說「攏好，你忙你的」。你知道那不是真的，但你每次都信了。',
    choices: [
      {
        label: '固定每個月回去一趟。',
        effects: { self: 6, familyBond: 6, health: -2 },
        memory: '你開始固定每個月回去看媽媽一次，她每次都說攏好，你忙你的。',
        log: '她開始在你回去的前一天煮一大鍋。你說吃不完，她說：「帶回去。」冰箱裡永遠有她的東西。',
      },
      {
        label: '等這一波忙完再說。',
        effects: { self: -6 },
        log: '這一波忙完還有下一波。你後來算過，那幾年你回去的次數，加起來不到二十次。',
      },
    ],
  },
];
