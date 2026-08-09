// 感情與家庭。跨階段，依 family.stage 與 family.kids 推進。
// 有 choices 的事件，狀態推進一律寫在 choice 的 set 裡——engine 不會執行事件層的 set。
// 孩子現在幾歲。所有跟孩子有關的事件都必須以這個為準——
// 用主角的年齡當條件的話，32 歲生的孩子會在主角 45 歲那年「上國中」，
// 然後在 49 歲那年第一次扶著沙發站起來。
import { spouseAway } from '../characters.js';
import { getStage } from '../engine.js';

const kidAge = (s) => (s.family.children?.[0] ? s.age - s.family.children[0].bornAt : -1);
const kidBetween = (lo, hi) => (s) => {
  const a = kidAge(s);
  return a >= lo && a <= hi;
};

export const FAMILY_EVENTS = [
  {
    id: 'f_blind_date',
    scene: 'home',
    mood: 'wry',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'single' && s.age >= 28,
    text: '姑姑安排了相親。對方是老師，很好的人。吃到一半你的手機響了三次，第三次你接了，講了四分鐘的病情。',
    choices: [
      {
        label: '道歉，把手機轉靜音。',
        effects: { self: 2 },
        log: '對方說沒關係，還說「你們很辛苦」。你們交換了聯絡方式，傳了兩個月的訊息，然後就慢慢沒有了。',
      },
      {
        label: '老實說今天可能得先走。',
        effects: { self: -3 },
        log: '你回醫院處理了一件半小時就結束的事。姑姑隔天打來：「人家說你人很好，但她想找可以一起吃飯的。」',
      },
    ],
  },
  {
    id: 'f_date_oncall',
    scene: 'home',
    mood: 'weary',
    stages: ['pgy', 'resident', 'attending'],
    weight: 3,
    cond: (s) => s.family.stage === 'dating',
    text: '電影開演二十分鐘，手機在口袋裡震動。你走到廳外接完，回座時{配偶}把爆米花往你這邊推了推，沒有問是什麼事。',
    effects: { familyBond: -5, self: -3 },
    log: '那部電影你們後來沒有看完。上串流那天，{配偶}傳訊息說：「我自己看完了，還不錯。」',
  },
  {
    id: 'f_shift_calendar',
    once: true,
    scene: 'home',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'steady' || s.family.stage === 'married',
    text: '你發現{配偶}的手機行事曆裡有一份你的班表，標成灰色。那份表連你自己都沒有輸入過。',
    effects: { familyBond: 8, self: 4 },
    log: '你問什麼時候弄的。{配偶}說：「這樣我就知道哪幾天不用等你吃飯。」你當下很感動，過了三天才想通這句話真正的意思：有多少頓飯，是一個人吃的。',
  },
  {
    id: 'f_meet_parents',
    scene: 'home',
    mood: 'wry',
    stages: ['resident', 'attending', 'aesthetic'],
    once: true,
    weight: 2,
    cond: (s) => s.family.stage === 'steady',
    // 主治第六年才第一次去伴侶家的人，沒有「訓練還有幾年」可以解釋。
    text: (s) =>
      getStage(s).key === 'attending' || getStage(s).key === 'aesthetic'
        ? '第一次到{配偶}家吃飯。伯父問：「醫師好啊，現在應該穩定了吧？」你正要解釋主治只是換一種忙法，桌子底下被踢了一下。'
        : '第一次到{配偶}家吃飯。伯父問：「醫師好啊，以後是不是就穩定了？」你正要解釋外科的訓練還有幾年，桌子底下被踢了一下。',
    choices: [
      {
        label: '順著說會越來越穩定。',
        effects: { familyBond: 5, self: -3 },
        log: '一頓飯氣氛很好。回程的車上，{配偶}說：「謝謝你今天沒有講實話。」',
      },
      {
        label: '老實講完訓練年限和值班。',
        effects: { familyBond: -3, self: 3 },
        log: '伯父安靜了幾秒，說：「那也是一份工作嘛。」之後每次見面，他都會問你最近有沒有比較輕鬆。',
      },
    ],
  },
  {
    id: 'f_wedding_delay',
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    weight: 3,
    cond: (s) => s.family.stage === 'married' && s.age <= 42,
    // 延期的第一個理由要對得上你當時的職級。三十二歲就升主治的人沒有總醫師的班表。
    text: (s) =>
      getStage(s).key === 'attending' || getStage(s).key === 'aesthetic'
        ? '婚宴訂了三次，延了三次：第一次是你接下的那台大刀，第二次是評鑑，第三次是你的老師開刀住院。飯店的訂金已經轉了兩次期。'
        : '婚宴訂了三次，延了三次：第一次是總醫師的班表，第二次是評鑑，第三次是你的老師開刀住院。飯店的訂金已經轉了兩次期。',
    choices: [
      {
        label: '這次無論如何都辦。',
        effects: { familyBond: 12, self: 4, money: -35 },
        log: '你請了三天假。主任簽字時說：「你們外科的婚假比病假難請。」宴席上你講了三分鐘，其中一分半在道歉。',
      },
      {
        label: '再延一次。',
        effects: { familyBond: -12, self: -5 },
        log: '{配偶}說好，語氣很平靜。掛掉電話你才發現，這一次沒有人問下一次是什麼時候。',
      },
    ],
  },
  {
    id: 'f_honeymoon_late',
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.age >= 35,
    text: '蜜月從婚後第一年延到第三年，再延到「等升等以後」。旅行社的專員換了兩個，最後那位直接說：「醫師，這個檔期我先幫你保留，你確定了再說。」',
    effects: { familyBond: -6, self: -4 },
    log: '那個檔期後來過期了。你們最後去了三天兩夜的宜蘭，回程在雪隧裡塞了兩個小時——那是你們那幾年最長的一次獨處。',
  },
  {
    id: 'f_kid_first',
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: kidBetween(1, 2),
    text: '{配偶}傳來十七秒的影片：孩子第一次自己站起來，扶著沙發，晃了兩下。訊息時間是下午三點十二分，你在開刀。',
    effects: { familyBond: -5, self: -4 },
    log: '你晚上十一點看到，回了一個「哇」。這段影片你後來重看過很多次，每一次都是在值班室。',
  },
  {
    id: 'f_kid_fever',
    scene: 'or',
    mood: 'weary',
    stages: ['resident', 'attending'],
    weight: 3,
    cond: (s) => kidBetween(1, 10)(s) && !spouseAway(s),
    text: '孩子燒到三十九度八，{配偶}在急診等叫號。你人在開刀房，隔著門聽助理轉述訊息：「{她}說沒關係，你忙。」',
    choices: [
      {
        label: '刀一結束就衝去急診。',
        effects: { familyBond: 8, self: -3, health: -3 },
        log: '你穿著刷手服跑進急診，同事嚇了一跳。孩子已經退燒睡著，{配偶}在旁邊的椅子上也睡著了，手機還握在手裡。',
      },
      {
        label: '打電話請熟識的兒科同事去看。',
        effects: { familyBond: -3, self: -5 },
        log: '同事很快處理好，還傳訊息說：「小事，別擔心。」你回了謝謝。你救得了別人的孩子，這件事今天沒有派上用場。',
      },
    ],
  },
  {
    id: 'f_kid_why',
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => kidBetween(4, 11)(s) && s.alloc.family < 30,
    text: '睡前，孩子突然問：「你為什麼都不在？」不是抱怨的語氣，是真的在問，像在問天為什麼會黑。',
    choices: [
      {
        label: '老實說：因為有人生病，需要我。',
        effects: { familyBond: 5, self: -3 },
        log: '孩子想了一下，說：「那我生病你會在嗎？」你說會。你在心裡默默希望這句話不會被拿出來檢驗。',
      },
      {
        label: '說對不起。',
        effects: { familyBond: 8, self: -6 },
        log: '孩子拍拍你的手說沒關係。四歲的小孩學會安慰大人，這件事你不知道該高興還是難過。',
      },
    ],
  },
  {
    id: 'f_kid_drawing',
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending'],
    weight: 2,
    cond: kidBetween(6, 11),
    text: '學校的畫畫作業題目是「我的家人」。孩子畫了你，只畫了一雙手，沒有畫臉。老師問為什麼，孩子說：「因為我只記得手。」',
    effects: { familyBond: -10, self: -6 },
    log: '那張圖被貼在教室後面的公佈欄上。家長日那天你沒去，是{配偶}拍給你看的。',
  },
  {
    id: 'f_kid_sports_day',
    scene: 'home',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => kidBetween(6, 12)(s) && s.alloc.family < 25,
    text: '運動會的親子競賽需要一位家長。孩子在報名表上勾了「不參加」，理由欄自己寫：「爸爸媽媽要上班。」',
    effects: { familyBond: -12, self: -5 },
    log: '導師把表格拍給你看，還說不好意思打擾。她沒有責備的意思，這讓你更難受。',
  },
  {
    id: 'f_kid_teen',
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: kidBetween(12, 15),
    text: '孩子上國中之後，回家就進房間關門。你想找話題，問了一句「最近功課還好嗎」，得到三個字：「還可以。」',
    choices: [
      {
        label: '每天堅持一起吃早餐。',
        effects: { familyBond: 8, self: 2, health: -2 },
        log: '你把早上的時間空出來。前兩個月幾乎都是沉默。第三個月的某一天，孩子主動講了學校的事，講了四分鐘，你一句話都不敢插。',
      },
      {
        label: '算了，青春期都這樣。',
        effects: { familyBond: -8 },
        log: '你也累了。這個「算了」你在醫院說過很多次，只是這一次不會有人拿到會議上檢討。',
      },
    ],
  },
  {
    id: 'f_kid_doctor',
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 2,
    cond: kidBetween(17, 18),
    text: '孩子在填志願，抬頭問你：「你會希望我當醫生嗎？」桌上攤著的落點分析，醫學系在射程內。',
    choices: [
      {
        label: '說會。這條路值得。',
        effects: { familyBond: 5, self: 3 },
        log: '孩子點點頭。你講完自己愣了一下——剛剛那段話，跟三十年前你爸媽跟你說的，幾乎一字不差。',
      },
      {
        label: '說不要。',
        effects: { familyBond: 3, self: -4 },
        log: '孩子很意外：「可是你不是很喜歡開刀嗎？」你說喜歡。然後你發現自己接不下去了。',
      },
      {
        label: '說你自己決定。',
        effects: { self: 2 },
        log: '你講了工時、健檢報告，還有那些錯過的生日，最後補一句：「你自己決定。」孩子說：「那我知道了。」你不知道他知道了什麼。',
      },
    ],
  },
  {
    id: 'f_kid_leaves',
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 2,
    cond: (s) => kidAge(s) >= 19,
    text: '孩子搬出去住。房間空下來那天，你在門口站了一會兒，才發現這是你第一次好好看這個房間。',
    effects: { familyBond: -5, self: -5 },
    log: '牆上還貼著小學的獎狀。你看了上面的日期，那幾年你在拚升等。',
  },
  {
    id: 'f_spouse_line',
    scene: 'home',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) =>
      (s.family.stage === 'married' || s.family.stage === 'steady') &&
      s.attrs.self < 40 &&
      !spouseAway(s),
    text: '你連續兩週沒睡好，坐在客廳發呆。{配偶}沒問你怎麼了，只是把一杯溫水放在你面前：「你今天有救到人嗎？沒有也沒關係。」',
    effects: { familyBond: 6, self: 8 },
    log: '你點點頭。那個晚上你睡了七個小時，是那半年來最長的一次。',
  },
  {
    id: 'f_spouse_note',
    once: true,
    scene: 'oncall',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending'],
    weight: 2,
    cond: (s) => s.family.stage !== 'single' && !spouseAway(s),
    text: '你打開值班室的便當，底下壓著一張便利貼：「今天有三個荷包蛋，兩個是給你同事的。」',
    effects: { familyBond: 5, self: 6 },
    log: '你把那張便利貼夾在識別證後面。半年後它跟白袍一起進了洗衣機，爛掉了，你難過了一整天。',
  },
  {
    id: 'f_spouse_sick',
    scene: 'clinic',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.age >= 45 && !spouseAway(s),
    text: '{配偶}的健檢報告出來，有一顆需要進一步檢查的結節。你看報告的手，突然沒有平常那麼穩。',
    choices: [
      {
        label: '親自安排最信任的同事來看。',
        effects: { familyBond: 10, self: -3, health: -2 },
        log: '你打了六通電話，把流程壓到三天。切片是良性的。那三天你一台刀都沒開，主任問你怎麼了，你說「家裡的事」。',
      },
      {
        label: '照正常流程掛號排隊。',
        effects: { familyBond: -5, self: -4 },
        log: '排了六週。這六週你每天都在想，但一句都沒有跟{配偶}講。結果是良性的。{配偶}後來說：「我以為你會幫我插隊。」',
      },
    ],
  },
  {
    id: 'f_spouse_visit',
    scene: 'corridor',
    mood: 'weary',
    stages: ['resident', 'attending'],
    once: true,
    weight: 2,
    cond: (s) => (s.family.stage === 'married' || s.family.stage === 'steady') && !spouseAway(s),
    text: '{配偶}第一次來你上班的地方送東西，在走廊上站了二十分鐘等你。那二十分鐘裡，你經過了兩次，都沒有看到。',
    effects: { familyBond: -5, self: -4 },
    log: '回家後{配偶}只說了一句：「原來你們走路都那麼快。」',
  },
  {
    id: 'f_inlaws_newyear',
    once: true,
    scene: 'home',
    mood: 'wry',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'married' && !spouseAway(s),
    text: '過年，你值大年初一。{配偶}一個人回去，整晚被問了三次同一個問題：「另一半怎麼沒來？」',
    choices: [
      {
        label: '值完班連夜開車過去。',
        effects: { familyBond: 10, self: 3, health: -4 },
        log: '你半夜十一點到，長輩都睡了。桌上留著一盤菜，蓋著保鮮膜。{配偶}說：「他們有幫你留。」',
      },
      {
        label: '傳訊息說今年真的不行。',
        effects: { familyBond: -10, self: -4 },
        log: '{配偶}回了一個「好」。隔年過年，長輩沒有再問你會不會來。',
      },
    ],
  },
  {
    id: 'f_inlaw_brag',
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married',
    text: '家族聚餐，長輩逢人就介紹：「我們家這個是外科醫師，很厲害的。」介紹完，隔壁桌的親戚就過來問膝蓋。',
    choices: [
      {
        label: '認真一個一個看。',
        effects: { familyBond: 4, health: -2 },
        log: '你看了七個人的問題，從膝蓋到失眠到孫子的疹子。菜全涼了，長輩很有面子。',
      },
      {
        label: '請他們去掛號。',
        effects: { familyBond: -4 },
        log: '長輩事後跟你說：「就看一下而已，你這樣人家會覺得你架子大。」你想解釋責任歸屬，最後只說了聲對不起。',
      },
    ],
  },
  {
    id: 'f_parent_aging',
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    weight: 3,
    // 人走了之後就不會再有「爸媽走路變慢」這種發現。父母的病程由 people-family.js 那條弧線負責。
    cond: (s) => s.age >= 45 && !s.flags.parentIllness && !s.flags.parentGone,
    text: '你發現爸媽走路變慢了。家裡的浴室多了扶手，是他們自己請人裝的，沒有跟你說。',
    effects: { familyBond: -3, self: -4 },
    log: '你問為什麼不講，媽媽說：「你那麼忙。」這四個字是你這輩子聽最多次的一句話，而且每一次都是別人在體諒你。',
  },
  {
    id: 'f_health_red',
    scene: 'clinic',
    mood: 'wry',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.age >= 42,
    text: '員工健檢：空腹血糖 118、血壓 148/92、中度脂肪肝。報告下面有一行建議：「請至新陳代謝科門診就醫。」那個門診的醫師你全部都認識。',
    choices: [
      {
        label: '真的去掛號。',
        effects: { health: 4, self: 3, money: -2 },
        log: '同事看到你的名字出現在診次上，笑了一下：「終於。」他開了藥，也開了運動處方。運動處方你貼在冰箱上，貼了兩年。',
      },
      {
        label: '自己開藥吃。',
        effects: { health: -3, self: -3 },
        log: '你用自己的名字開了降血壓藥。這在醫院很常見，常見到沒有人覺得奇怪。',
      },
    ],
  },
  {
    id: 'f_separate_room',
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.alloc.family < 20,
    text: '因為你的班表太亂，你們開始分房睡，理由很合理：這樣兩個人都能睡好。第一個月是為了睡眠，第八個月就不是了。',
    effects: { familyBond: -8, self: -4 },
    log: '你們還是會一起吃早餐，聊天氣、聊孩子、聊誰去繳費。這個家運作得很好，像一間管理良好的機構。',
  },
  {
    id: 'f_reconcile',
    scene: 'home',
    mood: 'lifted',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) =>
      s.family.stage === 'married' &&
      s.alloc.family >= 30 &&
      s.attrs.familyBond < 55 &&
      !spouseAway(s),
    text: '你休了年假，兩個人去了一趟沒有行程的旅行。第二天早上，{配偶}說：「你知道嗎，我好久沒看過你不看手機了。」',
    effects: { familyBond: 14, self: 6, health: 2 },
    log: '你把手機拿出來，關機，塞進背包最底層。這個動作你做過很多次，這是第一次真的做到。',
  },
  {
    id: 'f_single_free',
    scene: 'home',
    mood: 'lifted',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'single' && s.alloc.personal >= 20,
    text: '週末你一個人去爬了一座山，沒有跟任何人報備，也沒有人問你幾點回來。',
    effects: { self: 8, health: 2 },
    log: '山頂訊號很差，你在那裡待了四十分鐘，手機一次都沒有響。你想了一下這算不算自由，然後決定不要再想。',
  },
  {
    id: 'f_single_contact',
    scene: 'office',
    mood: 'weary',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 3,
    cond: (s) => s.family.stage === 'single' && s.age >= 38,
    text: '院方要更新員工資料。緊急聯絡人那一欄，你盯著游標閃了很久。',
    choices: [
      {
        label: '填爸媽。',
        effects: { self: -4 },
        log: '你填了媽媽的手機。填完你算了一下她今年幾歲，然後把這件事推出腦子。',
      },
      {
        label: '填同科的同事。',
        effects: { self: -5 },
        log: '你傳訊息問他可不可以。他回：「好啊，我也是填你。」你們兩個都笑了，然後誰都沒有再說話。',
      },
    ],
  },
  {
    id: 'f_single_sick',
    scene: 'home',
    mood: 'weary',
    stages: ['pgy', 'resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'single' && s.attrs.health < 55,
    text: '你發燒到三十九度，一個人躺在套房裡。冰箱有兩瓶運動飲料，都過期了。你想著誰可以載你去看病，想到一半睡著了。',
    effects: { self: -6, health: -4 },
    log: '隔天你自己開車去上班，順路在醫院拿了藥。掛號的時候護理師說：「醫師你臉色好差。」你說沒事。',
  },
  {
    id: 'f_dating_app',
    scene: 'home',
    mood: 'wry',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'single' && s.age >= 36,
    text: '朋友幫你註冊了交友軟體。職業欄填「醫師」之後，配對數翻了三倍；聊到「我大概兩三天才會回訊息」之後，數字掉回原點。',
    choices: [
      {
        label: '把職業改成「服務業」。',
        effects: { self: -3 },
        log: '這次聊得比較久。第三次見面對方問你到底做什麼的，你說了。對方沉默三秒，說：「那你們是不是都很忙？」',
      },
      {
        label: '關掉軟體。',
        effects: { self: 2 },
        log: '你把 app 刪了。刪之前你看了一下自己的照片，那是三年前拍的，那時候你頭髮還比較多。',
      },
    ],
  },
  {
    id: 'f_missed_dinners',
    scene: 'home',
    mood: 'weary',
    stages: ['attending', 'aesthetic'],
    once: true,
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.stats.missedDinners >= 600 && !spouseAway(s),
    text: '{配偶}整理抽屜時翻出一本舊記事本，前面幾年每一頁都寫著「今天等到幾點」。後面就沒有寫了。',
    effects: { familyBond: -6, self: -8 },
    log: '你問為什麼後來不寫了。{配偶}說：「因為後來就不等了。」',
  },
];
