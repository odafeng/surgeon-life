// 外科女醫師。
//
// 這條線只在 gender === 'f' 時開。它不是把男性事件換代名詞——
// 訓練最重的那五年（27-31）剛好也是生育窗口，兩邊都不等人，
// 而制度是照著「不會懷孕的人」設計的。這條線演的就是那個夾縫。
//
// 凍卵是這條線的核心決策：它不解決衝突，只把期限往後推，而且要付錢。
const F = (s) => s.gender === 'f';

export const FEMALE_EVENTS = [
  // ───────── 訓練期 ─────────
  {
    id: 'fw_recruit_ask',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    once: true,
    weight: 5,
    cond: (s) => F(s) && s.age >= 28,
    text: '排下年度人力的時候，主任把你留下來：「你今年……有沒有什麼打算？」他沒有說是什麼打算，但你們兩個都知道他在問什麼。',
    choices: [
      {
        label: '「目前沒有。」',
        effects: { self: -5 },
        log: '你聽見自己用了「目前」。他點點頭，把你排進了明年的重點刀組。走出辦公室你才發現，你剛剛替自己簽了一份沒有寫下來的約。',
      },
      {
        label: '「這個問題你不會問我同梯。」',
        effects: { self: 6, teaching: -3 },
        bond: { chief: -8 },
        memory: '主任問你今年有沒有什麼打算。你說，這個問題你不會問我同梯。',
        log: '他愣了兩秒，說：「我是關心你。」你說你知道。那份人力表後來沒有再拿給你看過。',
      },
    ],
  },
  {
    id: 'fw_egg_freeze',
    priority: true,
    scene: 'clinic',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    weight: 7,
    cond: (s) => F(s) && s.age >= 30 && s.age <= 38 && s.family.kids === 0,
    text: '生殖醫學科的同學在群組貼了一張圖：卵子數量對年齡的曲線。你把它滑掉，晚上又滑回來看了一次。三十歲之後那條線愈來愈陡，而你明年還要輪訓。',
    choices: [
      {
        label: '去凍卵。',
        hint: '取卵要請假、打針兩週，之後每年還有保管費',
        effects: { money: -15, health: -4, self: 5 },
        memory: '你去凍了卵。打針那兩週你照常上刀，沒有跟任何人講。',
        set: (s) => {
          s.flags.eggsFrozen = s.age;
        },
        log: '打針那兩週你照常上刀，肚子上有瘀青，刷手服遮得住。取卵那天你請了一天假，理由寫「事假」。你買到的不是孩子，是一段可以再想一想的時間——而它每年要收保管費。',
      },
      {
        label: '再看看。這幾年不是時候。',
        effects: { self: -3 },
        log: '你把那張圖存進相簿，然後開始準備明年的專科考。那張圖你後來又打開過幾次，每次都在很晚的時候。',
      },
    ],
  },
  {
    id: 'fw_egg_storage_fee',
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    weight: 3,
    cond: (s) => F(s) && s.flags.eggsFrozen && s.family.kids === 0,
    text: '生殖中心寄來年度保管費的通知。信封裡還有一張表，問你要不要更新緊急聯絡人。',
    effects: { money: -2, self: -2 },
    log: '你繳了。緊急聯絡人那一欄，你寫的還是三年前那個名字，沒有改。',
  },
  {
    id: 'fw_on_call_pregnant',
    priority: true,
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    // 跟產檢、生產同一年。宣告順序決定播放順序，所以 female.js 在 events.js 裡排在家庭弧線前面。
    forced: (s) => F(s) && Boolean(s.flags.expectingChild),
    text: '你懷孕的消息傳開之後，這個月的班表還是排了八個大夜。人力組說：「大家都是這樣排的，妳先看看有沒有問題。」',
    choices: [
      {
        label: '照排。不想被當成麻煩。',
        effects: { health: -12, self: -6 },
        memory: '懷孕二十八週那個月，你照排了八個大夜。',
        log: '第六個大夜那天你在值班室蹲下來綁鞋帶，蹲下去之後花了一點時間才站起來。沒有人看到，所以那件事沒有發生過。',
      },
      {
        label: '拿診斷書去談。',
        effects: { health: 4, self: 3, teaching: -4 },
        bond: { chief: -6 },
        memory: '你拿了診斷書去談孕期的班。那個月你少了四個大夜，也少了一些東西。',
        log: '少了四個大夜，多了四個人替你值。他們沒有說什麼——真正難受的是這件事。你開始算自己欠了誰幾個晚上。',
      },
    ],
  },
  {
    id: 'fw_maternity_return',
    priority: true,
    scene: 'or',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    weight: 7,
    cond: (s) => F(s) && s.family.kids > 0 && s.age - (s.family.children[0]?.bornAt ?? 99) <= 2,
    text: '產假結束回來上班。刀表上你的名字排在最後一個，跟的是不需要主刀的診斷性內視鏡。主任說：「先讓妳適應一下。」',
    choices: [
      {
        label: '「我適應完了，明天給我一台。」',
        effects: { clinical: 3, self: 6, health: -4 },
        memory: '產假回來刀表排到最後，你說你適應完了，明天給我一台。',
        log: '他給了。那台你開得比產前慢了十四分鐘，你自己記著這個數字，記了很久。三個月後你追回來了。',
      },
      {
        label: '先照他說的來。',
        effects: { clinical: -4, self: -5 },
        log: '「適應一下」變成半年。半年之後你發現，重點刀組的名單在你不在的時候重排過了，而重排是不會回頭的。',
      },
    ],
  },
  {
    id: 'fw_pump_room',
    scene: 'corridor',
    mood: 'weary',
    stages: ['attending'],
    weight: 6,
    cond: (s) => F(s) && s.family.kids > 0 && s.age - (s.family.children[0]?.bornAt ?? 99) <= 2,
    text: '哺乳室在地下一樓，從刀房走過去來回十五分鐘。你的下一台是十點半。',
    effects: { health: -3, self: -3, familyBond: 3 },
    log: '你算過最短路線：貨梯、後走廊、避開會被叫住的地方。三個月後你把時間壓到十一分鐘。這是你這半年最熟練的一項技術。',
  },
  {
    id: 'fw_who_is_the_surgeon',
    once: true,
    scene: 'clinic',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    weight: 4,
    cond: (s) => F(s) && s.age >= 34,
    text: '術前解釋做完，家屬看著你身後的男性住院醫師問：「那……主刀醫師什麼時候會來跟我們說明？」',
    choices: [
      {
        label: '「我就是。剛剛講的那些，是我要開的刀。」',
        effects: { self: 4 },
        log: '家屬說不好意思。你說沒關係——這句「沒關係」你一年要講很多次，講到它變成一個不用想的反射。',
      },
      {
        label: '讓學弟回答，你去看下一床。',
        effects: { self: -5, teaching: 2 },
        log: '學弟說「這位就是主刀醫師」的時候，聲音比你自己說的時候大。你已經走到門口了，還是聽見了。',
      },
    ],
  },
  {
    id: 'fw_scrub_size',
    scene: 'or',
    mood: 'wry',
    stages: ['pgy', 'resident'],
    once: true,
    weight: 3,
    cond: F,
    text: '刀房的無菌手術衣最小號還是太大，袖子要摺兩折。鉛衣只有一種尺寸，穿起來壓在肩膀上，三小時之後那條線會紅一整天。',
    effects: { health: -2, self: -2 },
    log: '你去問過能不能訂小號。承辦說要三個人以上連署才叫「需求」。刀房裡符合條件的女醫師，那一年是兩個。',
  },
  {
    id: 'fw_call_her_nurse',
    scene: 'corridor',
    mood: 'wry',
    stages: ['pgy', 'resident'],
    weight: 3,
    cond: F,
    text: '查房的時候病人對著你旁邊的男學弟叫「醫師」，然後轉頭跟你說：「小姐，可以幫我倒杯水嗎？」',
    choices: [
      {
        label: '倒了水，然後開始講病情。',
        effects: { self: -3, familyBond: 0 },
        log: '你講到一半他才反應過來，一直說歹勢。你說沒關係。你已經很會處理這個場面了，這件事本身有點難過。',
      },
      {
        label: '「我是照顧你的醫師。水等一下請護理師幫忙。」',
        effects: { self: 3 },
        bond: { nurse: -2 },
        log: '你說得平靜，但那天下午你想起這件事還是有點煩。學弟後來跟你說：「老師，妳剛剛那樣講很好。」你沒有回他。',
      },
    ],
  },
  {
    id: 'fw_no_kids_asked',
    scene: 'office',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    weight: 3,
    cond: (s) => F(s) && s.age >= 40 && s.family.kids === 0,
    text: '尾牙同桌的長輩問：「妳這樣一直開刀，家裡不會唸嗎？」隔壁桌的男主治剛好也四十幾歲，也沒有小孩，沒有人問他。',
    effects: { self: -4 },
    log: '你笑著說還好。回家路上你想的是，這個問題你已經被問了十幾年，而它從來不是在關心你。',
  },
  {
    id: 'fw_eggs_used',
    priority: true,
    scene: 'clinic',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 6,
    cond: (s) =>
      F(s) &&
      s.flags.eggsFrozen &&
      s.family.stage !== 'single' &&
      s.age >= 38 &&
      s.family.kids === 0,
    text: '你三十幾歲那年凍的卵，還在。生殖中心問你要不要開始療程——他們用的詞是「解凍」，聽起來像在講別的東西。',
    choices: [
      {
        label: '開始。',
        hint: '療程要錢，也不保證成功',
        effects: { money: -55, health: -5, self: 4 },
        memory: '你用了三十幾歲那年凍的卵。當年那個決定，替現在的你留了一條路。',
        set: (s) => {
          if (s.rng.chance(0.55)) s.flags.expectingChild = true;
          else s.flags.eggsFailed = true;
        },
        log: '打針、抽血、看報告——這次你是病人，而且你看得懂每一個數字，這讓事情變得更難，不是更簡單。',
      },
      {
        label: '不用了。',
        effects: { self: 2 },
        memory: '你決定不用那些卵了。你說那不是遺憾，是你自己選的。',
        log: '你打電話去終止保管。掛掉之後你坐了一下，然後去看下一床。有些決定不需要儀式。',
      },
    ],
  },
  {
    id: 'fw_eggs_failed',
    priority: true,
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    forced: (s) => Boolean(s.flags.eggsFailed),
    text: '第三次療程的報告出來。生殖科醫師是你的學妹，她把電腦螢幕轉過來，講得很慢，因為她知道你聽得懂。',
    effects: { self: -12, health: -3, familyBond: -4 },
    memory: '療程沒有成功。替你看報告的是你的學妹，她講得很慢，因為她知道你聽得懂。',
    set: (s) => {
      s.flags.eggsFailed = false;
    },
    log: '你說謝謝，然後回去開下午的刀。那台刀很順。你在無影燈底下想，這雙手救過很多人的孩子。',
  },
];
