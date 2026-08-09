// 恩師・陳文彬。教你打結的人。
//
// 弧線：0 教你 → 1 他開始老 → 2 退休 → 3 成為你的病人 → 4 走了。
// 只進不退，用 advance() 推。每一幕都盡量不解釋，讓細節自己說話。
import { advance, adjustBond } from '../characters.js';

const M = (s) => s.people.mentor;

export const MENTOR_EVENTS = [
  // ───────── 第 0 幕：他教你 ─────────
  {
    id: 'm_knot',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['resident'],
    once: true,
    weight: 4,
    cond: (s) => M(s).stage === 0,
    text: '陳文彬把持針器放在你手上，說：「打二十個結給我看。」你打到第七個，他說重來。打到第十四個，他說重來。',
    choices: [
      {
        label: '打到他不再說重來。',
        effects: { clinical: 4, health: -2 },
        bond: { mentor: 8 },
        memory: '陳文彬要你打二十個結，你打了兩百個，直到他不再說重來。',
        set: (s) => advance(s, 'mentor', 1),
        log: '第兩百零三個，他沒有說話，轉身走了。學姊說：「他沒罵，就是過了。」',
      },
      {
        label: '問他為什麼要這樣。',
        effects: { self: 2, clinical: 1 },
        bond: { mentor: -3 },
        set: (s) => advance(s, 'mentor', 1),
        log: '「因為病人的血不會等你想。」他只說了這一句，就走了。你後來想通，但那要再過六年。',
      },
    ],
  },
  {
    id: 'm_scold',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['resident'],
    weight: 3,
    cond: (s) => M(s).stage >= 1 && M(s).stage < 2,
    text: '你在刀台上猶豫了三秒。陳文彬把器械拍在盤子上：「你不決定，病人替你決定。」',
    effects: { clinical: 3, self: -3 },
    bond: { mentor: 2 },
    log: '那台刀他罵了你九次。下刀後他在更衣室說：「今天那個轉折你處理得對。」他只說一次，而且很小聲。',
  },
  {
    id: 'm_first_solo',
    scene: 'or',
    mood: 'lifted',
    priority: true,
    stages: ['resident'],
    once: true,
    cond: (s) => M(s).stage >= 1 && s.attrs.clinical >= 45,
    text: '陳文彬把主刀的位置讓給你，自己站到對面。「我在這裡。你開。」整台刀他只講了兩句話。',
    effects: { self: 10, clinical: 3 },
    stats: { surgeries: 1 },
    bond: { mentor: 10 },
    memory: '你第一次主刀，陳文彬站在對面，整台刀只講了兩句話。',
    log: '收完最後一針，他說：「洗手去吧。」你在洗手台前站了很久，水一直流。',
  },
  {
    id: 'm_advice_paper',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['resident', 'attending'],
    once: true,
    cond: (s) => M(s).stage >= 1 && s.attrs.papers < 60,
    text: '你抱怨升等要三百點。陳文彬正在寫他的第四十七篇論文，頭也沒抬：「我不喜歡寫。我寫了三十年。」',
    choices: [
      {
        label: '「那你為什麼還寫？」',
        effects: { self: -2 },
        bond: { mentor: 4 },
        memory: '你問陳文彬為什麼還在寫論文，他說：不寫的人，說話沒有人聽。',
        log: '他終於抬頭：「因為不寫的人，說話沒有人聽。你要爭刀房時段、要爭人力，得先有人願意聽你講話。」',
      },
      {
        label: '「我寧願多開幾台刀。」',
        effects: { clinical: 2, self: 3 },
        bond: { mentor: -2 },
        log: '他點點頭：「我年輕時也這樣講。」然後繼續寫。那個「也」字，你聽了很久。',
      },
    ],
  },

  // ───────── 第 1 幕：他開始老 ─────────
  {
    id: 'm_hand_tremor',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => M(s).stage >= 1 && s.age >= 38,
    text: '你跟陳文彬的刀。分離血管時，你看見他的手抖了一下——很輕，一秒就穩住了。全場沒有人說話。',
    choices: [
      {
        label: '什麼都沒說，把鉤子拉得更穩。',
        effects: { self: -4 },
        bond: { mentor: 6 },
        memory: '你第一次看見陳文彬的手在抖。你什麼都沒說，只是把鉤子拉得更穩。',
        set: (s) => advance(s, 'mentor', 2),
        log: '下刀後他看了你一眼，什麼都沒問。你知道他知道你看見了。',
      },
      {
        label: '下刀後私下提醒他。',
        effects: { self: 2 },
        bond: { mentor: -6 },
        set: (s) => advance(s, 'mentor', 2),
        log: '「我知道。」他把手插進口袋，「再兩年。」那之後他排刀的時候，開始避開需要精細分離的。',
      },
    ],
  },
  {
    id: 'm_give_case',
    scene: 'or',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: (s) => M(s).stage >= 2 && !M(s).gone && s.attrs.clinical >= 60,
    text: '一台複雜的胰十二指腸切除送到科裡。陳文彬把病歷推給你：「這個你來。」他以前不會這樣說。',
    effects: { clinical: 3, self: 2 },
    stats: { surgeries: 1, livesSaved: 1 },
    bond: { mentor: 4 },
    log: '他全程站在旁邊，沒有碰器械。結束時他說：「比我快四十分鐘。」你聽不出那是稱讚還是別的。',
  },
  {
    id: 'm_old_photo',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    cond: (s) => M(s).stage >= 2,
    text: '整理醫局舊櫃子，你翻到一張泛黃的照片：二十幾年前的陳文彬站在刀台旁，比你現在還年輕，眼神你很熟悉。',
    effects: { self: 3 },
    bond: { mentor: 3 },
    memory: '你翻到二十年前的陳文彬，照片裡的眼神，和你現在一樣。',
    log: '照片背面有他的字：「今天這台，我一個人開完了。」你把照片放回去，又拿出來，最後夾進自己的筆記本。',
  },

  // ───────── 第 2 幕：退休 ─────────
  {
    id: 'm_retire',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 5,
    cond: (s) => M(s).stage >= 2 && s.age >= 46,
    text: '陳文彬的惜別會。院長致詞八分鐘，講他發表過幾篇論文、拿過幾個計畫、當過幾屆理事。匾額上刻著四個頭銜。',
    choices: [
      {
        label: '上台補一句：他開過一萬一千台刀。',
        effects: { self: 8, teaching: 2 },
        bond: { mentor: 12 },
        memory: '陳文彬的惜別會上，沒有人提他開過幾台刀，所以你上台講了。',
        set: (s) => advance(s, 'mentor', 3),
        log: '台下安靜了兩秒，然後有人開始鼓掌。陳文彬低頭喝茶，沒有看你。散場時他只說：「回去看你的病人。」',
      },
      {
        label: '坐在台下，跟著鼓掌。',
        effects: { self: -5 },
        set: (s) => advance(s, 'mentor', 3),
        log: '你鼓了掌。回程的電梯裡你一直在想那八分鐘，裡面沒有一句話提到他的手。',
      },
    ],
  },
  {
    id: 'm_last_clinic',
    scene: 'clinic',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    cond: (s) => M(s).stage >= 3 && !M(s).gone,
    text: '陳文彬最後一次門診。他把追蹤了十幾年的病人一個一個轉給你，每一份病歷後面都夾著手寫的紙條。',
    effects: { self: 5, clinical: 2 },
    bond: { mentor: 6 },
    memory: '陳文彬把追蹤十幾年的病人轉給你，每一份病歷後面都夾著手寫的紙條。',
    log: '「這個人怕痛，講話要慢。」「這個人的女兒會問很多，讓她問完。」二十三張紙條。健保沒有這一項。',
  },

  // ───────── 第 3 幕：他成為你的病人 ─────────
  {
    id: 'm_becomes_patient',
    scene: 'clinic',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 6,
    cond: (s) => M(s).stage >= 3 && !M(s).gone && s.age >= 52,
    text: '門診叫號叫到陳文彬。他自己走進來，坐下，把影像光碟推過來：「你看一下。」是胰臟，位置很差。',
    choices: [
      {
        label: '「我來開。」',
        effects: { self: 6, health: -8 },
        bond: { mentor: 10 },
        memory: '你的恩師成為你的病人，而你說：我來開。',
        set: (s) => {
          advance(s, 'mentor', 4);
          s.flags.mentorOperated = true;
        },
        log: '他笑了，是你認識他三十年來第一次看到他這樣笑：「你敢開我？」你說：「你教的。」',
      },
      {
        label: '「我幫你找最適合的人。」',
        effects: { self: -4 },
        bond: { mentor: 2 },
        set: (s) => {
          advance(s, 'mentor', 4);
          s.flags.mentorReferred = true;
          s.flags.mentorResolved = true;
          if (s.rng.chance(0.55)) s.flags.mentorSurvived = true;
          s.flags.mentorAftermath = true;
        },
        log: '他沉默了一下，說：「也好。」你替他找了北部最好的團隊。你知道這是專業的判斷，但你整晚沒睡。',
      },
    ],
  },
  {
    // 說了「我來開」，這一幕就一定要演，而且沒有選項——
    // 你已經答應了，剩下的只是把它開完。結果取決於你這一生把手練到什麼程度，
    // 這是全遊戲最誠實的一次驗收。
    id: 'm_the_operation',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.mentorOperated && !s.flags.mentorResolved && !M(s).gone,
    text: '你站在主刀的位置，台上躺著教你打結的人。麻醉前他說了一句：「你的手比我當年穩。」',
    stats: { surgeries: 1 },
    effects: { health: -6 },
    memory: '你替陳文彬開刀，用的是他教你的每一個動作。',
    set: (s) => {
      s.flags.mentorResolved = true;
      const good = s.attrs.clinical >= 72 || s.rng.chance(s.attrs.clinical / 100);
      if (good) {
        s.flags.mentorSurvived = true;
        s.attrs.self = Math.min(100, s.attrs.self + 12);
        s.attrs.clinical = Math.min(100, s.attrs.clinical + 3);
        s.stats.livesSaved += 1;
        adjustBond(s, 'mentor', 12);
      } else {
        s.people.mentor.gone = true;
        s.flags.mentorDiedOnTable = true;
        s.attrs.self = Math.max(0, s.attrs.self - 16);
        s.attrs.health = Math.max(0, s.attrs.health - 6);
        s.memories.push({
          age: s.age,
          text: '陳文彬死在你的手上。你做了所有他教過你的事，那些事不夠。',
        });
      }
    },
    log: '你刷手，上台，把手放上去。九個小時。',
  },
  {
    id: 'm_op_success',
    scene: 'or',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.mentorSurvived && !s.flags.mentorAftermath,
    text: '腫瘤拿乾淨了。他在恢復室醒來的第一句話是：「幾點了。」',
    set: (s) => {
      s.flags.mentorAftermath = true;
    },
    log: '你說快十一點。他說：「你也去睡。」你在更衣室坐到天亮，一直發抖，但那不是因為累。',
  },
  {
    id: 'm_op_failure',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    forced: (s) => s.flags.mentorDiedOnTable && !s.flags.mentorAftermath,
    text: '第七個小時，血壓開始掉。你做了所有能做的，包括他教過你、以及他沒教過你的。',
    set: (s) => {
      s.flags.mentorAftermath = true;
    },
    log: '下刀後你去跟他太太說明。她聽完，說：「他昨天還說，還好是你開。」你站在那裡，一句話都接不上。',
  },
  {
    id: 'm_death',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 6,
    cond: (s) =>
      M(s).stage >= 4 &&
      !M(s).gone &&
      !s.flags.mentorSurvived &&
      s.flags.mentorResolved &&
      s.age >= 55,
    text: '半夜的電話。陳文彬走了，在睡夢中，很安靜。他的太太說，他前一天還在看你發表的那篇論文。',
    effects: { self: -10, health: -4 },
    bond: { mentor: 0 },
    memory: '陳文彬走的前一天，還在看你寫的那篇論文。',
    set: (s) => {
      s.people.mentor.gone = true;
    },
    log: '告別式上，你替他扶棺。他的學生來了三十幾個，一半以上已經不在外科了。',
  },
  {
    id: 'm_late_years',
    scene: 'home',
    mood: 'lifted',
    priority: true,
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.flags.mentorSurvived && !M(s).gone && s.age >= 56,
    text: '你去看陳文彬。他瘦了很多，正在陽台上澆花。他問你最近開了什麼刀，你講了四十分鐘，他一句都沒打斷。',
    effects: { self: 8 },
    bond: { mentor: 5 },
    log: '走的時候他叫住你：「那個轉折，你現在會怎麼過？」你講完，他點點頭：「比我好。」',
  },
  {
    id: 'm_his_notes',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    cond: (s) => M(s).gone,
    text: '陳文彬的太太送來一箱東西，說是他留給你的。裡面是四十年的手術筆記，最後一本停在他退休那個月。',
    effects: { clinical: 5, self: 6 },
    memory: '陳文彬留給你四十年的手術筆記，最後一頁寫著：這一台，我沒有把握。',
    log: '最後一頁寫著一台刀的步驟，旁邊有一行小字：「這一台，我沒有把握。」日期是他退休前三天。',
  },
  {
    id: 'm_you_become',
    scene: 'or',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    cond: (s) => M(s).stage >= 3 && s.attrs.teaching >= 55,
    text: '你把持針器放在一個住院醫師手上，聽見自己說：「打二十個結給我看。」',
    effects: { teaching: 6, self: 4 },
    memory: '你聽見自己對住院醫師說：打二十個結給我看。',
    log: '他打到第七個，你說重來。說出口的瞬間，你想起三十年前有人也是這樣對你說的。',
  },
];
