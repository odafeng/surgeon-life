// 最早寫的一批事件：主治階段的制度諷刺、醫美支線、感情家庭進程，
// 以及醫糾三部曲（提告與兩種判決，由 engine 依機率注入）。
export const CORE_EVENTS = [
  // ───────────── 主治（32+）─────────────
  {
    id: 'a_point_value',
    mood: 'wry',
    scene: 'office',
    stages: ['attending'],
    weight: 3,
    text: '健保公告本季點值 0.78。你算了一下：昨天那台八小時的胃癌根除術，實拿的錢買不起一支新手機。',
    effects: { money: -20, self: -3 },
    log: '隔壁維修站換手機螢幕要價三千，不砍價、不核刪、當場付清。',
  },
  {
    id: 'a_audit',
    mood: 'wry',
    scene: 'office',
    stages: ['attending'],
    weight: 2,
    text: '健保署核刪了你三個月前的手術申報，理由：「非必要之醫療行為。」病人現在還活著，大概就是最好的反駁——但反駁要寫成三頁申覆。',
    choices: [
      {
        label: '熬夜寫申覆。',
        effects: { health: -3, money: 10 },
        log: '申覆成功，拿回七成。你用救人的那雙手，寫了一整晚的公文。',
      },
      {
        label: '算了，自己吸收。',
        effects: { money: -15, self: -2 },
        log: '你把公文夾闔上。這種「算了」，每一次都在教健保署下一次刪得更兇。',
      },
    ],
  },
  {
    id: 'a_referral',
    mood: 'wry',
    scene: 'or',
    stages: ['attending'],
    weight: 3,
    cond: (s) => s.attrs.clinical >= 70,
    text: '外院轉來一台別人不敢開的刀，轉診單上寫：「建議轉貴院，由您處理。」你的技術越好，這種單子越多。',
    choices: [
      {
        label: '接。這就是你練刀的原因。',
        effects: { health: -6, self: 5 },
        stats: { surgeries: 1, livesSaved: 1 },
        log: '你又一次證明了自己——用一台沒有任何加給的刀。',
      },
      {
        label: '婉拒。你也有極限。',
        effects: { self: -5 },
        log: '掛掉電話後，你在辦公室坐了很久。你想起當年那句「總得有人」。',
      },
    ],
  },
  {
    id: 'a_defensive',
    mood: 'wry',
    scene: 'clinic',
    stages: ['attending'],
    once: true,
    cond: (s) => s.stats.lawsuits >= 1,
    text: '被告過之後，你看每一張術前同意書的眼神都不一樣了。門診來了一位高風險、高併發症機率的病人。',
    choices: [
      {
        label: '建議他轉去醫學中心。',
        effects: { self: -10 },
        set: (s) => {
          s.flags.defensive = true;
        },
        log: '病人道謝離開。你知道下一家也會這樣建議他。防禦醫療就是這樣運作的：每個人都沒有錯，只有病人沒地方去。',
      },
      {
        label: '照收。他需要有人開。',
        effects: { self: 5 },
        log: '你收下病人，也收下風險。護理長看了你一眼，什麼都沒說。',
      },
    ],
  },
  {
    id: 'a_vip',
    mood: 'wry',
    scene: 'office',
    stages: ['attending'],
    weight: 2,
    text: '院長室來電：一位民代的家屬想「喬」下週的刀。你的排程上，一位排了三個月的阿伯剛好在那個時段。',
    choices: [
      {
        label: '照排序來。',
        effects: { self: 5 },
        log: '你頂住了。之後你的刀房時段被調到最差的時間——沒有人承認這兩件事有關。',
      },
      {
        label: '讓他插。',
        effects: { self: -8 },
        log: '阿伯又被往後延了一週。他沒有抱怨，只說「醫師你們辛苦」。這讓你更難受。',
      },
    ],
  },
  {
    id: 'a_student_ask',
    mood: 'wry',
    scene: 'clinic',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.teaching >= 40,
    text: '教學門診，實習醫學生問你：「老師，你會建議我們走外科嗎？」整間診間安靜了下來。',
    choices: [
      {
        label: '說實話。',
        effects: { teaching: 3, self: 2 },
        log: '你把工時、點值、醫糾都說了，最後說：「但有人得做。」半年後，那個學生選了皮膚科。你不怪他。',
      },
      {
        label: '說「外科很有成就感」。',
        effects: { self: -5 },
        log: '你聽見自己的聲音在講話，像在念別人的稿子。',
      },
    ],
  },
  {
    id: 'a_phd_offer',
    scene: 'office',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.flags.phd === undefined,
    text: '科務會議後，主任把你留下：「要不要考慮念個在職博士？不是必要啦——但細則寫得清楚，以學位送審，三百點歸類計分直接免了，學位論文就能當代表著作。你自己算算，同樣要升等，哪條路快。」',
    choices: [
      {
        label: '報考在職博士班。',
        set: (s) => {
          s.flags.phd = 'studying';
          s.flags.phdProgress = 0;
        },
        log: '你的白袍口袋裡多了一張學生證。四十歲的你，和二十四歲的同學一起搶圖書館的插座。',
      },
      {
        label: '不念。你的老師在開刀房，不在研究所。',
        effects: { self: 3 },
        set: (s) => {
          s.flags.phd = 'declined';
        },
        log: '主任聳聳肩：「也行。就是同一條路，你要走得比別人久。」他說得平靜，像在講一件天氣的事。',
      },
    ],
  },
  {
    id: 'a_phd_peer',
    mood: 'wry',
    scene: 'corridor',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.flags.phd !== 'done' && s.attrs.papers >= 100,
    text: '公佈欄貼出新的升等名單：比你晚三年進來的學弟，以博士學位送審，升上了助理教授。他的年刀量，是你的三分之一；你的三百點歸類計分，還刻在半路上。',
    effects: { self: -3 },
    log: '你看著名單想了很久，最後想通了：公式裡沒有刀量這一項。從來就沒有。',
  },
  {
    id: 'a_teaching_credit',
    mood: 'wry',
    scene: 'office',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.teaching >= 15,
    text: '學期末，你在系統上登錄教學時數：門診教學、急診教學、病房迴診、開刀房帶刀——每一小時都要填，一格都不能少。細則說這些都算教學。細則沒說的是，這些都不算錢。',
    effects: { teaching: 2, self: -1 },
    log: '登錄系統當掉了兩次。你在深夜十一點按下送出，螢幕顯示：「教學時數已認列。」',
  },
  {
    id: 'a_promotion_denied',
    mood: 'wry',
    scene: 'office',
    stages: ['attending'],
    once: true,
    cond: (s) => s.rank === 'vs' && s.attrs.clinical >= 70 && s.attrs.papers < 300,
    text: '年度考核面談，主任攤開你的資料：「臨床表現優異，學術產出不足——歸類計分連送審門檻的一半都不到。」你當年救回的那些人，不算產出。',
    effects: { self: -5 },
    log: '走廊上，一位論文很多的同事拍拍你的肩：「先衝 paper 啦，刀讓年輕的開。」',
  },
  {
    id: 'a_health_check',
    mood: 'weary',
    scene: 'clinic',
    stages: ['attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.attrs.health < 35,
    text: '健檢報告一片紅字。你看自己報告的樣子，跟看病人的病歷一模一樣：冷靜、客觀——然後束之高閣。',
    choices: [
      {
        label: '認真開始改變。',
        effects: { health: 5, self: 3 },
        log: '你開始晨跑。第一週只跑了一次，但那是一個開始。',
      },
      {
        label: '沒時間。',
        effects: { health: -5 },
        log: '你把報告塞進抽屜，和三年前那份疊在一起。',
      },
    ],
  },
  {
    id: 'a_mass_casualty',
    mood: 'weary',
    scene: 'or',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.clinical >= 60,
    text: '國道連環車禍，大量傷患機制啟動。你連開三台，救回兩個。',
    effects: { health: -6, self: 6 },
    stats: { surgeries: 3, livesSaved: 2 },
    log: '凌晨走出醫院，天快亮了。你想不起上一次看日出，是為了日出本身。',
  },
  {
    id: 'a_reunion',
    mood: 'wry',
    scene: 'home',
    stages: ['attending'],
    once: true,
    weight: 2,
    text: '醫學系同學會。當年成績在你後面的同學，現在是醫美診所院長，鑰匙圈上掛著新車的牌子。他真心地問你：「還在開大刀喔？辛苦欸。」',
    choices: [
      {
        label: '有點羨慕。',
        effects: { self: -5 },
        log: '回家的捷運上，你算了一下你們的時薪。然後你把手機收起來，決定不要再算了。',
      },
      {
        label: '真心替他高興。',
        effects: { self: 2 },
        log: '他過得好，你替他高興。你們只是選了不同的路——只是你的這條，是制度預設裡最虧的那條。',
      },
      {
        label: '跟他多聊了幾句「行情」。',
        set: (s) => {
          s.flags.aestheticCurious = true;
        },
        log: '他說：「你這雙手來打雷射，大材小用，但收入直接翻倍。」你笑笑，把這句話收進心裡。',
      },
    ],
  },
  {
    id: 'a_aesthetic_offer',
    scene: 'aesthetic',
    stages: ['attending'],
    once: true,
    // 主治第一年就被挖角不合理。要嘛你自己動過念頭，要嘛你真的欠錢。
    cond: (s) => s.age >= 36 && (s.flags.aestheticCurious === true || s.attrs.money < 0),
    text: '醫美集團的獵頭約你喝咖啡，開出的保障月薪是你現在的三倍，「而且不用值班，沒有醫糾。」',
    choices: [
      {
        label: '走。你累了。',
        set: (s) => {
          s.career = 'aesthetic';
          s.flags.leftAt = s.age; // 自己選擇離開的那一年，道別那幾幕靠這個
        },
        log: '你交回識別證。走出醫院大門時，你沒有回頭——你怕一回頭就走不了。',
      },
      {
        label: '留下。開刀房裡還有明天的刀。',
        effects: { self: 5 },
        log: '你把名片壓在鍵盤下。它會一直在那裡，像一個隨時可以按下的逃生鈕。',
      },
    ],
  },

  // ───────────── 醫美支線 ─────────────
  {
    id: 'ae_no_clients',
    mood: 'weary',
    scene: 'aesthetic',
    stages: ['aesthetic'],
    weight: 3,
    cond: (s) => s.talents.social < 6,
    text: '這個月的來客數：3。房東的漲租通知貼在門上。你的刀法在這裡沒有健保點值——也沒有客人。',
    effects: { money: -60, self: -3 },
    log: '你終於明白：這一行賣的不是技術，是話術。而你這輩子都在練錯的那一種。',
  },
  {
    id: 'ae_hot',
    mood: 'lifted',
    scene: 'aesthetic',
    stages: ['aesthetic'],
    weight: 3,
    cond: (s) => s.talents.social >= 7,
    text: '你的診所預約排到三個月後。你發現自己很會直播——比當年在晨會報 case 流利多了。',
    effects: { money: 150 },
    log: '下播後，助理遞上下一位客人的資料。你看了一眼手錶：今晚可以準時吃晚餐。',
  },
  {
    id: 'ae_old_patient',
    mood: 'wry',
    scene: 'aesthetic',
    stages: ['aesthetic'],
    once: true,
    text: '一位你當年從鬼門關拉回來的病人走進診所，是來打雷射的。她認出了你，愣住：「醫師……你怎麼在這裡？」',
    choices: [
      {
        label: '笑著轉移話題。',
        effects: { self: -8 },
        log: '她沒有再問。結帳時她多說了一句：「那時候，謝謝你。」你在診間坐了很久。',
      },
      {
        label: '老實說：「我累了。」',
        effects: { self: -3 },
        log: '她點點頭：「你們也是人。」這句話，你等了十幾年，結果是在這裡聽到的。',
      },
    ],
  },
  {
    id: 'ae_news',
    mood: 'wry',
    scene: 'aesthetic',
    stages: ['aesthetic'],
    weight: 2,
    text: '新聞：「外科人力荒，急診壅塞，病患苦等 14 小時。」你在候診室的電視上看到老東家的名字。',
    choices: [
      {
        label: '轉台。',
        effects: { self: -4 },
        log: '下一台是美食節目。候診的客人們聊著醫美療程，沒有人抬頭。',
      },
      {
        label: '看完整則報導。',
        effects: { self: -1 },
        log: '記者訪問了你以前的學弟。他的黑眼圈，隔著螢幕都看得到。',
      },
    ],
  },
  {
    id: 'f_kid_stranger',
    mood: 'weary',
    scene: 'home',
    stages: ['resident', 'attending'],
    weight: 4,
    cond: (s) => s.family.kids > 0 && s.alloc.family < 25,
    text: '幼稚園的親子日你又缺席了。老師後來轉述，孩子指著全家福說：「這是我{爸爸}，住在醫院。」',
    effects: { familyBond: -15, self: -5 },
    log: '你把這句話轉述給同事聽，大家都笑了。笑完之後，休息室安靜了很久。',
  },
  {
    id: 'f_anniversary',
    mood: 'lifted',
    scene: 'home',
    stages: ['resident', 'attending', 'aesthetic'],
    weight: 2,
    cond: (s) => s.family.stage === 'married' && s.alloc.family >= 25,
    text: '結婚紀念日，你難得準時下班。餐廳裡你們聊的還是孩子和房貸——但至少，你在。',
    effects: { familyBond: 10, self: 3 },
    log: '「在場」聽起來是很低的標準。對你們家來說，它是奢侈品。',
  },

  // ───────────── 醫糾（special：由 engine 依機率注入）─────────────
  {
    id: 'a_lawsuit',
    mood: 'weary',
    scene: 'court',
    special: true,
    stages: ['resident', 'attending'],
    text: '存證信函寄到了醫院。一台急刀的併發症，家屬提告。你記得那一晚——你已經 30 個小時沒睡，而你是當時唯一能上的人。',
    choices: [
      {
        label: '和解。你只想結束這一切。',
        effects: { money: -150, self: -8 },
        stats: { lawsuits: 1 },
        log: '和解金 150 萬。院方公關發了新聞稿，裡面沒有你的名字，也沒有那 30 個小時。',
      },
      {
        label: '上法庭。你沒有做錯。',
        effects: { self: -5, health: -5 },
        stats: { lawsuits: 1 },
        set: (s) => {
          s.flags.onTrial = true;
        },
        log: '訴訟開始。不管結果如何，有一件事已經確定：你看下一張急刀通知單的眼神，再也不一樣了。',
      },
    ],
  },
  {
    id: 'a_verdict_win',
    mood: 'lifted',
    scene: 'court',
    stages: ['resident', 'attending'],
    forced: (s) => s.flags.onTrial === true && s.talents.social >= 5,
    text: '纏訟多年，判決出爐：無罪。你在法庭上把當晚的處置一條一條講清楚，法官聽懂了。',
    effects: { self: 6 },
    set: (s) => {
      s.flags.onTrial = false;
    },
    log: '走出法院，沒有記者。當年的新聞標題有你的科別，今天的判決沒有版面。',
  },
  {
    id: 'a_verdict_lose',
    mood: 'weary',
    scene: 'court',
    stages: ['resident', 'attending'],
    forced: (s) => s.flags.onTrial === true && s.talents.social < 5,
    text: '判決：賠償 200 萬。你在法庭上緊張得詞不達意，對造律師口若懸河。你開的刀沒有輸，你輸在說話。',
    effects: { money: -200, self: -12 },
    set: (s) => {
      s.flags.onTrial = false;
    },
    log: '律師安慰你：「下次答辯要有技巧。」你想說你希望沒有下次，但你知道機率不站在你這邊。',
  },
];
