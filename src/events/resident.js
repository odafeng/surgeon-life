// 外科住院醫師（27-31 歲）。刀開得越來越多，能決定的事越來越少。
export const RESIDENT_EVENTS = [
  {
    id: 'r_aortic',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.alloc.clinical >= 58,
    text: '凌晨兩點，你已連續工作 28 小時。急診來電：機車對撞，腹部鈍傷，血壓掉到七十，超音波看得到腹腔積血。要剖腹。',
    choices: [
      {
        label: '衝上去。',
        effects: { health: -8, self: 4 },
        stats: { surgeries: 1, livesSaved: 1 },
        log: '脾臟裂了，主治切掉它。四個小時後，病人活著推出開刀房。你在更衣室的長椅上睡著，夢裡的手還在打結。',
      },
      {
        label: '你真的站不起來了。',
        effects: { self: -6, health: 3 },
        log: '學長替你上了。你躺在值班室盯著天花板，一直到天亮。',
      },
    ],
  },
  {
    id: 'r_mm_conf',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '併發症與死亡討論會。投影片打出你的 case，主任的雷射筆停在你的名字上。',
    choices: [
      {
        label: '低頭把每一條檢討都記下來。',
        effects: { clinical: 3, self: -3 },
        log: '會後你把筆記重看了三遍。下一台一樣的刀，你避開了同一個陷阱。',
      },
      {
        label: '心裡想：這是運氣問題。',
        effects: { self: 1 },
        log: '你安慰自己外科本來就有風險。這句話，你說得越來越順口了。',
      },
    ],
  },
  {
    id: 'r_peer_quit',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    weight: 2,
    text: '同梯的住院醫師遞了辭呈，下個月去醫美診所報到。群組裡他傳來新診所的照片：落地窗、掛畫、下午六點的日落。',
    effects: { self: -3 },
    log: '你看著手機，開刀房的無影燈在你頭頂嗡嗡作響。',
  },
  {
    id: 'r_paper_boss',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.alloc.research === 0,
    text: '主任把你叫進辦公室，桌上放著你的年度考核：「你的 paper 呢？沒有論文，你以後拿什麼升等？」',
    choices: [
      {
        label: '從睡眠裡擠時間寫。',
        effects: { papers: 15, health: -5 },
        log: '凌晨三點的醫局，只剩你的螢幕亮著。三個月後，一篇 case series 刊出——歸類計分 15 點。你離三百點，又近了二十分之一。',
      },
      {
        label: '說你想先把刀練好。',
        effects: { self: 3 },
        log: '主任搖頭：「開刀不會讓你升等。」最可怕的是——他說的是實話。',
      },
    ],
  },
  {
    id: 'r_first_solo',
    scene: 'or',
    mood: 'lifted',
    stages: ['resident'],
    once: true,
    cond: (s) => s.attrs.clinical >= 40,
    text: '你的第一台主刀。結束後，你在手術紀錄的 surgeon 欄位，第一次簽下自己的名字。',
    effects: { self: 8 },
    stats: { surgeries: 1 },
    log: '你把手術帽收進口袋。這一天你等了九年。',
  },
  {
    id: 'r_needle',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    weight: 1,
    text: '急刀中你被縫針扎到。沖洗、抽血、通報。感染科查了來源病人的病毒指標，說這次不用吃藥——寫完異常事件報告，你刷手，回去繼續開。',
    effects: { health: -3 },
    log: '職安室會寄信提醒你回診追蹤抽血。第三封寄到的時候，你已經想不起來是哪一次針扎了。',
  },

  // ── 值班與工時 ──
  {
    id: 'r_post_call_or',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '你值完班，早上七點半交完，八點的刀表上還有你的名字。學長說：「站著就好，會醒。」',
    effects: { health: -6, clinical: 1 },
    stats: { surgeries: 1 },
    log: '你站了六個小時，沒有睡著。回家路上你在紅燈前停了三次，其中一次沒有紅燈。',
  },
  {
    id: 'r_duty_swap',
    scene: 'oncall',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '同梯拜託你跟他換班，理由是女朋友生日。你這個月已經換了三次，每次都是別人的生日。',
    choices: [
      {
        label: '換。',
        effects: { health: -3, self: -1 },
        log: '你換了。你自己生日那天也在值班，沒有人跟你換，因為你沒有說。',
      },
      {
        label: '這次不換。',
        effects: { self: -2 },
        log: '他說「沒關係啦」，語氣很輕。接下來兩週，茶水間的話題在你走進去的時候會停一下。',
      },
    ],
  },

  // ── 總醫師 ──
  {
    id: 'r_chief_schedule',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.age >= 30,
    text: '你當上總醫師，第一件事是排下個月的值班表。七個人、三十天、兩個人休假、一個人要準備專科考。',
    choices: [
      {
        label: '把最難排的都排給自己。',
        effects: { health: -6, self: 2 },
        log: '表貼出來，沒有人有意見。那個月你值了十一班，也沒有人問你為什麼。',
      },
      {
        label: '照規則平均分。',
        effects: { self: -3 },
        log: '三個人來找你喬，兩個人在群組裡陰陽怪氣。你才知道，平均是最容易被抱怨的排法。',
      },
    ],
  },
  {
    id: 'r_chief_or_board',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.age >= 30,
    text: '早上七點，你站在刀房白板前調度：兩間房、四台刀，一位主治臨時要加一台急刀，麻醉科說只剩一組人力。',
    effects: { clinical: 2, self: -2, health: -2 },
    log: '你把一台排了兩個月的膽囊往後挪。下午病人的太太在門口問你為什麼，你說有急刀。她說：「我們也等很久了。」她說得對。',
  },
  {
    id: 'r_chief_cover',
    scene: 'corridor',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.age >= 30,
    text: '學弟漏開了一張醫囑，被主治抓到。主治站在護理站問：「這床誰負責的？」',
    choices: [
      {
        label: '「我負責的。」',
        effects: { self: 4, teaching: 2 },
        log: '你被電了十分鐘。學弟後來私訊你四個字：「謝謝學長。」那之後他的醫囑再也沒漏過。',
      },
      {
        label: '照實說。',
        effects: { self: -2, teaching: -1 },
        log: '學弟站在那裡被電，你在旁邊看。你想起兩年前站在那個位置的人是誰，然後轉頭去看病人。',
      },
    ],
  },

  // ── 開刀房學習曲線 ──
  {
    id: 'r_knot',
    scene: 'oncall',
    mood: 'lifted',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.talents.dexterity >= 5,
    text: '值班室的床欄上綁著三十條線。你一邊聽學長講電話，一邊單手打結，打到手指發麻。',
    effects: { clinical: 3, health: -1 },
    log: '打到第二百個的時候，你忽然不用看了。這件事不會有人發給你任何證書。',
  },
  {
    id: 'r_slow',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '一台預計兩小時的刀，你開了三小時四十分。麻醉科的住院醫師換了兩次班，第三位來的那個問：「還要多久？」',
    choices: [
      {
        label: '請主治接手。',
        effects: { self: -4, clinical: 1 },
        log: '主治四十分鐘關完。他沒有罵你，只說：「這台你以後會開得比我快。」你不確定那是安慰還是預言。',
      },
      {
        label: '硬撐到底。',
        effects: { health: -4, clinical: 3, self: 1 },
        stats: { surgeries: 1 },
        log: '你自己關完。走出刀房是晚上九點，刀房護理師的加班單上多了一筆，理由欄簽的是你的名字。',
      },
    ],
  },

  // ── 第一次獨立處理併發症 ──
  {
    id: 'r_first_bleed',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    cond: (s) => s.attrs.clinical >= 30,
    text: '凌晨一點，你白天那台刀的病人血壓掉下來，引流管一小時出了四百毫升。值班的只有你。',
    choices: [
      {
        label: '馬上叫刀，同時打電話給主治。',
        effects: { clinical: 4, self: 3, health: -5 },
        stats: { surgeries: 1, livesSaved: 1 },
        log: '主治二十分鐘後到，你已經刷好手。出血點是一條小動脈，止血花了四分鐘。難的是那二十分鐘。',
      },
      {
        label: '再觀察一小時。',
        effects: { self: -6, health: -3 },
        stats: { surgeries: 1 },
        log: '一小時後你還是叫了刀。病人活下來，輸了四袋血。主治只問一句：「你什麼時候發現的？」你老實回答，他就沒有再說話了。',
      },
    ],
  },
  {
    id: 'r_leak',
    scene: 'clinic',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    text: '你主刀的病人術後第五天發燒，引流液變濁。你盯著螢幕上的白血球數字看了很久，才點開電腦斷層的申請單。',
    effects: { self: -6, clinical: 3, health: -3 },
    log: '吻合處滲漏。你去跟家屬解釋，每一句話都在心裡過三遍才說出口。家屬聽完說：「醫師，你辛苦了。」這句比罵你還難受。',
  },

  // ── M&M ──
  {
    id: 'r_mm_slides',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '下週的 M&M 輪到你報。學長教你：時間軸要清楚，處置要有依據，最後一頁一定要有 learning point。你問他什麼叫好的 learning point。',
    effects: { teaching: 2, self: -1 },
    log: '他想了想：「聽起來像你學到了東西，但不會讓任何人需要負責。」',
  },
  {
    id: 'r_mm_recognize',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    text: 'M&M 上報的是別組的 case。投影片翻到第四頁，你發現那個處置流程，跟你上個月做的一模一樣。',
    effects: { self: -4, clinical: 2 },
    log: '那個 case 的結局不好。你回去把自己那位病人的病歷從頭看到尾，看到凌晨。他很好，什麼事都沒有。你還是看完了。',
  },

  // ── 麻醉科、護理師、刀房 ──
  {
    id: 'r_anes_cancel',
    scene: 'or',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '病人推進來了，麻醉科主治看完術前評估：「這個心臟功能不行，要先照會心臟內科。」你的主治在電話那頭說：「照會什麼，之前也是這樣開。」',
    choices: [
      {
        label: '照麻醉科的意見延刀。',
        effects: { self: 2, clinical: 1 },
        log: '你當中間人講了四通電話。刀延兩週，病人多住三天。心臟內科的回覆是：「可考慮手術。」跟兩週前一樣。',
      },
      {
        label: '照主治的意思開下去。',
        effects: { self: -4 },
        stats: { surgeries: 1 },
        log: '刀順利開完。麻醉科主治在恢復室對你說：「這次沒事。」他把「這次」兩個字咬得很重。',
      },
    ],
  },
  {
    id: 'r_or_nurse',
    scene: 'or',
    mood: 'lifted',
    stages: ['resident'],
    weight: 2,
    text: '你第一次當主刀，伸手要器械，名字說錯了。器械護理師沒有糾正你，直接把正確的那支拍進你手裡。',
    effects: { clinical: 2, self: 1 },
    log: '刀結束你去跟她道謝。她說：「我在這間房十二年了，主刀換過十一個。」這間房裡最資深的人，名字寫在護理紀錄那一頁——沒有人會為了找一台刀的主角去翻那一頁。',
  },
  {
    id: 'r_or_close_time',
    scene: 'or',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '下午四點五十，你的刀還在剝離。刀房組長站在門口：「五點要關房喔，加班要簽單。」',
    choices: [
      {
        label: '簽單，慢慢開完。',
        effects: { health: -3, self: 1 },
        stats: { surgeries: 1 },
        log: '單子上有一欄要填理由，你寫「手術進行中」。組長看了一眼說：「你們的理由每次都一樣。」',
      },
      {
        label: '加快，趕在五點前收。',
        effects: { clinical: -2, self: -4 },
        stats: { surgeries: 1 },
        log: '你關得比平常快了二十分鐘。那晚你翻了三次身，一直在想那個止血是不是真的夠。',
      },
    ],
  },

  // ── 被主治電 ──
  {
    id: 'r_scolded',
    scene: 'or',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '你拉鉤的角度不對，主治的器械敲在你的手背上：「這樣我看得到嗎？」整間刀房安靜下來，只剩抽吸管的聲音。',
    choices: [
      {
        label: '調好角度，什麼都不說。',
        effects: { clinical: 2, self: -3 },
        log: '刀開完，他在洗手台旁邊說：「剛剛太急了。」這是他的道歉方式。你說沒關係，也真的沒關係。',
      },
      {
        label: '事後去問他到底該怎麼拉。',
        effects: { clinical: 4, self: 2 },
        log: '他拿筆在紙巾上畫給你看，畫了十分鐘。他其實很願意教，只是不會在有人看著的時候教。',
      },
    ],
  },
  {
    id: 'r_scolded_wrong',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '晨會上主治問，是誰把那床的抗生素停掉的。是前一班的人停的，紀錄上寫得很清楚。所有人都看著你。',
    choices: [
      {
        label: '把紀錄調出來給大家看。',
        effects: { self: 3, teaching: -1 },
        log: '主治「喔」了一聲，話題就過去了。散會後，前一班那位跟你走同一段走廊，你們一路沒說話。',
      },
      {
        label: '「我確認一下，抱歉。」',
        effects: { self: -4 },
        log: '晨會提早三分鐘結束。你回去把抗生素重新開上。這件事誰都不會再提，包括停掉它的人。',
      },
    ],
  },

  // ── 被家屬投訴 ──
  {
    id: 'r_complaint',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '社工轉來一封投訴信：「值班醫師態度冷漠，問問題只回三個字。」日期是你連續在院第三十小時的那天凌晨。',
    effects: { self: -5 },
    log: '你被要求寫一份說明。說明書上有「事發經過」欄位，沒有「當時你已經醒著多久」欄位。',
  },
  {
    id: 'r_recording',
    scene: 'clinic',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '你在病房解釋病情，家屬把手機放在桌上，紅點亮著。他說：「我怕我記不住。」',
    choices: [
      {
        label: '照常講完，講得更慢更清楚。',
        effects: { self: 2, clinical: 1 },
        log: '你講了二十五分鐘。從那天起你講每一句話都像在寫病歷，這個習慣後來救了你兩次。',
      },
      {
        label: '請他先收起來。',
        effects: { self: -3 },
        log: '他收了，臉色也變了。剩下的解釋你講得很順，但你們都知道，剛剛那一下回不去了。',
      },
    ],
  },

  // ── 健保申報與病歷 ──
  {
    id: 'r_coding',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '刀開完要選申報碼。同一台刀，選 A 碼 18,000 點，選 B 碼 32,000 點。學長說：「你的術式紀錄寫成什麼樣，它就是哪一碼。」',
    choices: [
      {
        label: '照實際做的選。',
        effects: { self: 3 },
        log: '你選了 A。那季點值 0.82，這台五個半小時的刀，醫院實拿一萬四千七。你的薪水跟這個數字沒有關係——今年還沒有。',
      },
      {
        label: '把紀錄寫得完整一點。',
        effects: { self: -3, clinical: 1 },
        log: '你沒有寫假的，只是把每一個真的做過的步驟都補進去。這件事在醫院裡有個很溫和的說法，叫做「完整記載」。',
      },
    ],
  },
  {
    id: 'r_chart_alert',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '病歷室寄來缺失通知：37 份病歷逾期未完成，再不補就停你的醫囑權限。列表最舊的一份，是四十天前那台從凌晨開到早上的刀。',
    effects: { health: -3, self: -3 },
    log: '你用一個週末補完。品管報表上，這 37 份會被記成「未及時完成」；那個週末不會被記成任何東西。',
  },
  {
    id: 'r_denial',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '主治把一疊核刪通知丟給你：「申覆你寫，格式在共用資料夾，寫完拿給我簽。」理由欄印著「未符合適應症」，病人是三個月前那位半夜送來的。',
    effects: { self: -3, health: -2 },
    log: '你把那顆穿孔的盲腸寫成三頁公文。最後一段你寫「若延遲手術恐致敗血症」，然後把「恐」字刪掉，因為它聽起來不夠確定。',
  },

  // ── 論文與掛名 ──
  {
    id: 'r_authorship',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.alloc.research > 0,
    text: '你熬了四個月的回顧性研究要投稿。主治傳來作者順序：他第一、科主任通訊、你第三。他說：「這樣比較好上。」',
    choices: [
      {
        label: '接受。',
        effects: { papers: 18, self: -5 },
        log: '文章刊出來，你在第三作者的位置。那 214 例的資料，是你一筆一筆從病歷裡挖出來的。',
      },
      {
        label: '爭取第一作者。',
        effects: { papers: 22, self: 3, teaching: -2 },
        log: '主治愣了一下，說：「也可以啦。」你如願掛了第一。接下來一年，科裡的新計畫沒有再找過你。',
      },
    ],
  },
  {
    id: 'r_irb',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.alloc.research >= 10,
    text: '你的題目要調三年份的病歷。IRB 送件表 22 頁，你在「本研究之風險」那一欄填「無」，被退件，理由是「風險不得填無」。',
    effects: { papers: 10, health: -2, self: -2 },
    log: '你改成「可能有病歷資料外洩之極低風險」，隔週就過了。整整 22 頁裡，委員只對這一句有意見。',
  },

  // ── 專科醫師考試 ──
  {
    id: 'r_board_case_log',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    once: true,
    cond: (s) => s.age >= 30,
    text: '專科考報名要繳手術病例表：主刀幾例、第一助手幾例，每一例都要病歷號和主治簽名。你翻了三年的刀單，發現有六十幾台當時被登錄成「跟刀」。',
    choices: [
      {
        label: '照登錄的送，缺的就缺。',
        effects: { self: 2, health: -2 },
        log: '你的表比同梯薄了一截，審查還是過了。那六十幾台的日期你抄在一張紙上，貼在值班室櫃子的門內側。',
      },
      {
        label: '一台一台去找主治補簽。',
        effects: { self: -2, health: -3 },
        log: '你花兩週追了七位主治。有一位看了很久說：「這台我沒印象了。不過你既然記得，那就是你開的。」',
      },
    ],
  },
  {
    id: 'r_board_written',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    cond: (s) => s.age >= 30,
    text: '專科醫師筆試前一個月。你把讀書時間塞進班表的縫隙：交完班的早上七點到九點，還有值班室沒被 call 的那幾十分鐘。',
    choices: [
      {
        label: '請假閉關兩週。',
        effects: { health: 2, self: 2 },
        log: '主治准了，條件是回來多值兩班。你考完那週還了四天班，換算下來，這個假是用未來的睡眠買的。',
      },
      {
        label: '照常上班，硬讀。',
        effects: { health: -6, self: -2 },
        log: '你在值班室讀到睡著，醒來時螢光筆在第 214 頁畫出一條長長的線。那一頁是消化道出血。真正考出來的那題，剛好就是它。',
      },
    ],
  },
  {
    id: 'r_board_result',
    scene: 'or',
    mood: 'lifted',
    stages: ['resident'],
    once: true,
    cond: (s) => s.age >= 31,
    text: '專科醫師考放榜。你在刷手台前用手肘把手機頂亮，名單上有你的名字。',
    effects: { self: 6, clinical: 2 },
    log: '你成為外科專科醫師。當天下午學長遞給你一份文件要簽：證書費 3,000 元、學會年費 1,200 元，還有一張繼續教育積分表。',
  },

  // ── 同梯離職與轉科 ──
  {
    id: 'r_switch_dept',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    text: '同梯的女生轉去放射科了。她說最後一根稻草不是工時，是懷孕四個月那天，她在刀房站了七個小時，沒有人問她要不要坐下。',
    effects: { self: -5 },
    log: '你們在醫院對面的火鍋店幫她辦歡送會。她那天準時到，是全場唯一一個。',
  },
  {
    id: 'r_short_staff',
    scene: 'office',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '這一屆的外科住院醫師開了四個名額，報到兩個。你們的值班從六天一班變成四天一班，公文上寫的是「人力調整」。',
    effects: { health: -5, self: -3 },
    log: '科主任在晨會說會再想辦法。他說這句話的語氣，跟去年一模一樣。',
  },

  // ── 輪訓與外訓 ──
  {
    id: 'r_rotation',
    scene: 'corridor',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '你被排去輪訓三個月。那一科的主治第一天就說：「你是外科的嘛，我們這邊沒什麼事，你跟著看看就好。」',
    choices: [
      {
        label: '把時間拿去讀書、寫論文。',
        effects: { papers: 15, self: 2 },
        log: '三個月，一篇 case report，睡飽了十幾次。回外科報到的第一天，你在刀房打結打得比走之前慢。',
      },
      {
        label: '主動要求排班、跟刀。',
        effects: { clinical: 3, self: 2, health: -3 },
        log: '你學到不少。輪訓結束那天他說：「你要不要考慮轉過來？」這是你這三個月聽過最像挖角的一句話，也是唯一一句。',
      },
    ],
  },
  {
    id: 'r_offsite',
    scene: 'corridor',
    mood: 'wry',
    stages: ['resident'],
    once: true,
    cond: (s) => s.age >= 29,
    text: '科裡要送人去外院外訓三個月，學一個新的術式。條件是回來簽三年，還有那三個月的班要事先值完。',
    choices: [
      {
        label: '去。',
        effects: { clinical: 5, health: -5, self: 3 },
        log: '出發前一個月你值了十九班。到了那邊，人家的住院醫師六點下班，你有兩週以為自己在放假。',
      },
      {
        label: '不去。',
        effects: { self: -4 },
        log: '名額給了學弟。半年後他回來開你們科的第一台那個術式，你在旁邊當第一助手。',
      },
    ],
  },

  // ── 急診會診 ──
  {
    id: 'r_er_consult',
    scene: 'corridor',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '急診打來第三通：「外科什麼時候下來？」你手上正在縫另一床的傷口，第五針。',
    effects: { health: -3, clinical: 1 },
    log: '你二十分鐘後到，急診醫師說：「這床等兩小時了。」你想解釋，但他也已經上班十四個小時，於是你們什麼都沒說，一起去看病人。',
  },
  {
    id: 'r_er_pingpong',
    scene: 'corridor',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '一位腹痛的老先生，急診同時會診了內科和外科。內科說像外科的，你去看完覺得像內科的。老先生躺在推床上，聽你們兩科在他頭上討論。',
    choices: [
      {
        label: '先收進來，再慢慢查。',
        effects: { self: 4, health: -2, clinical: 2 },
        log: '你收了。查三天，是十二指腸潰瘍往後壁穿孔，包在後腹腔裡，最後還是外科開的刀。你沒跟內科說什麼，他們也沒有問。',
      },
      {
        label: '堅持這不是外科的。',
        effects: { self: -5 },
        log: '拉扯四小時，最後急診主任出來裁決，收內科。那四小時裡老先生只喝了一口水，因為誰都不敢讓他吃東西。',
      },
    ],
  },

  // ── 加護病房 ──
  {
    id: 'r_icu_bed',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    text: '你的病人術後需要 ICU，全院滿床。護理長說：「有一床下午可能會空出來。」你知道那句話的意思。',
    effects: { self: -5, health: -2 },
    log: '下午兩點，那床空出來了。你推病人進去的時候，隔壁的家屬還在收拾東西。',
  },
  {
    id: 'r_icu_titrate',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    text: '加護病房那位插著管的病人，你每天調呼吸器、調升壓劑、調電解質。第十四天了，數字慢慢好轉，人沒有醒。',
    effects: { clinical: 3, self: -3, health: -2 },
    log: '第十五天他睜開眼睛看著天花板。你在他耳邊說了自己的名字，他眨了兩下。那天你在交班本上寫下四個字：意識轉清。',
  },
  {
    id: 'r_icu_meeting',
    scene: 'clinic',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    text: '家庭會議。你把病情、預後、可能的結果都講完，兒子問：「醫師，如果是你的爸爸，你會怎麼做？」',
    choices: [
      {
        label: '老實回答。',
        effects: { self: 3 },
        log: '你說了。他們簽了不施行心肺復甦。三天後老先生走了，沒有再被壓過胸。兒子在門口對你鞠了一躬，你不知道該不該接。',
      },
      {
        label: '「這個要你們自己決定。」',
        effects: { self: -4 },
        log: '這句話你在課堂上學過，叫做尊重自主。他們討論了兩週，中間急救兩次。第三次的時候才簽。',
      },
    ],
  },

  // ── 器官捐贈 ──
  {
    id: 'r_organ_ask',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    once: true,
    text: '一位年輕的腦傷病人，腦死判定完成。協調師問你要不要一起去跟家屬談器捐：「你照顧他最久，他們比較聽得進去。」',
    choices: [
      {
        label: '一起去。',
        effects: { self: 2, health: -3 },
        log: '媽媽哭了四十分鐘，然後點頭。簽完同意書她問你：「他會不會痛？」你說不會。這是你那天說過最確定的一句話。',
      },
      {
        label: '你做不到。',
        effects: { self: -5 },
        log: '協調師自己去了，家屬拒絕。你站在走廊另一頭，什麼都沒做，卻比開一台刀還累。',
      },
    ],
  },
  {
    id: 'r_harvest',
    scene: 'or',
    stages: ['resident'],
    once: true,
    text: '凌晨三點的器捐摘取手術。你第一次看到刀房裡有這麼多人，卻這麼安靜。開始之前，所有人向捐贈者默哀一分鐘。',
    effects: { self: 4, health: -4, clinical: 2 },
    stats: { surgeries: 1 },
    log: '器官在天亮前送去三家醫院。你留下來把切口一針一針縫好，縫得比任何一台刀都仔細——他不會再痛了，你還是縫得很仔細。',
  },

  // ── 大夜與交班 ──
  {
    id: 'r_handover_miss',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '交班本上寫著「12 床有點喘，已給氧」。你接手的時候在忙急診的傷口，凌晨兩點才走到那床。',
    choices: [
      {
        label: '停下來做完整評估。',
        effects: { clinical: 3, health: -3, self: 2 },
        log: '肺栓塞。你抓到了。抗凝血劑打下去是三點十分，你在紀錄上寫下這個時間，手還在抖。',
      },
      {
        label: '看起來還好，先去處理別的。',
        effects: { self: -6 },
        log: '早上七點交班時他的血氧掉到 88。後面的處置你做得又快又準，一點都沒慌。但你一直記得凌晨兩點，你站在床邊看了三秒就走。',
      },
    ],
  },
  {
    id: 'r_night_alone',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '大夜，整棟外科大樓的住院病人今晚歸你。護理站的電話從十一點響到三點，最長的一通四十秒。',
    effects: { health: -5, clinical: 2 },
    log: '你把待辦事項寫在手背上，寫到第七件的時候沒有位置了。你換另一隻手繼續寫。',
  },

  // ── 薪水與房租 ──
  {
    id: 'r_rent',
    scene: 'home',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '房東傳訊息來：下個月起租金漲兩千，「因為利率升了」。你租的是走路八分鐘到醫院的舊公寓，選它的唯一理由是被 call 的時候跑得快。',
    choices: [
      {
        label: '接受漲租。',
        effects: { money: -3, self: -2 },
        log: '你回了一個「好」。這八分鐘的距離你已經付了三年溢價，還會繼續付。',
      },
      {
        label: '搬去更便宜的地方。',
        effects: { money: 2, health: -3 },
        log: '你搬到二十分鐘外。第一次半夜被 call，你騎車衝回來，等紅燈的時候忽然很想哭，也只是想想。',
      },
    ],
  },
  {
    id: 'r_payslip',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    text: '你點開薪資單的明細：本俸、專業加給、值班費、教學費、伙食費 2,400。加起來的數字除以這個月的在院時數，是 218。',
    effects: { self: -3 },
    log: '你把算式截圖傳給同梯。他回你：「你算錯了，伙食費那 2,400 是免稅的。」',
  },

  // ── 伴侶 ──
  {
    id: 'r_partner_dinner',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.family.stage !== 'single',
    text: '你答應這週一定要一起吃飯，訂位七點。六點半，急診打來。',
    choices: [
      {
        label: '拜託學弟先擋，你趕過去。',
        effects: { familyBond: 6, self: -2 },
        log: '你八點十分到，菜涼了。對方沒有生氣，只說：「你手機拿出來放桌上吧，這樣我比較不會嚇到。」',
      },
      {
        label: '去急診。',
        effects: { familyBond: -8, self: -3 },
        stats: { missedDinners: 1 },
        log: '你傳了「臨時有刀」。對方回一個「好」，沒有再說什麼。這個「好」你們兩個都很熟了。',
      },
    ],
  },
  {
    id: 'r_partner_sleep',
    scene: 'home',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.family.stage !== 'single',
    text: '難得的休假，對方問你想去哪裡。你說你想睡覺。',
    choices: [
      {
        label: '真的睡了一整天。',
        effects: { health: 5, familyBond: -4 },
        log: '你醒來是傍晚六點。桌上有張紙條：「我去我媽那邊，冰箱有粥。」粥還是溫的，代表對方走沒多久。',
      },
      {
        label: '撐著出門。',
        effects: { health: -3, familyBond: 6 },
        log: '你們去了海邊。回程你在副駕睡著，對方一路開回來沒吵你。後來對方說那天自己也很累，但那是那個月看你最久的一次。',
      },
    ],
  },

  // ── 體重與健康 ──
  {
    id: 'r_weight',
    scene: 'office',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    text: '你量體重，比 PGY 那年重了十四公斤。你的三餐是刀房外面的麵包、護理站的餅乾，還有凌晨兩點的泡麵。',
    effects: { health: -4, self: -3 },
    log: '你去庫房換大一號的刷手服。管庫房的阿姨看你一眼：「你們這一屆都這樣。」',
  },
  {
    id: 'r_stone',
    scene: 'corridor',
    mood: 'weary',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.attrs.health < 60,
    text: '你在刀中開始腰痛，痛到冒汗。撐完那台刀，你自己去急診躺了兩小時，超音波照出一顆 0.6 公分的結石。',
    effects: { health: -6, self: -2 },
    log: '急診醫師問你多久沒好好喝水。你想了一下：你在刀房不喝水，是因為不想上廁所；不上廁所，是因為刀不會停。',
  },

  // ── 學弟妹 ──
  {
    id: 'r_junior_first',
    scene: 'corridor',
    mood: 'wry',
    stages: ['resident'],
    weight: 3,
    cond: (s) => s.age >= 29,
    text: '新一屆的住院醫師報到，白袍很新。其中一個問你：「學長，我第一次值班要注意什麼？」',
    choices: [
      {
        label: '把你當年沒人教你的，全部教給他。',
        effects: { teaching: 4, self: 3, health: -2 },
        log: '你講了四十分鐘，還印了一張自己整理的常見狀況處置。他收下的時候說：「原來有這種東西。」你當年也很想要一張。',
      },
      {
        label: '「跟著做就會了。」',
        effects: { self: -3 },
        log: '你聽見自己講出當年那句話。那句話你恨了三年，今天用了兩秒。',
      },
    ],
  },
  {
    id: 'r_junior_ask',
    scene: 'oncall',
    mood: 'wry',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.age >= 30,
    text: '學弟值完班，眼睛紅著問你：「學長，你會後悔選外科嗎？」',
    choices: [
      {
        label: '「不會。」',
        effects: { self: 2, teaching: 2 },
        log: '你說完之後想了想，發現這句話有一半是真的。你決定不告訴他是哪一半。',
      },
      {
        label: '「有時候會。」',
        effects: { self: -2, teaching: 3 },
        log: '他沉默很久，然後說：「謝謝學長，這樣我比較放心。」你不太確定他放心的是什麼。',
      },
    ],
  },

  // ── 對外科的動搖 ──
  {
    id: 'r_doubt_night',
    scene: 'oncall',
    mood: 'weary',
    stages: ['resident'],
    weight: 3,
    text: '凌晨四點，你處理完今晚第三通電話，坐在值班室的黑暗裡。手機螢幕亮著一則廣告：某醫美集團誠徵醫師，保障月薪，週休二日。',
    choices: [
      {
        label: '把廣告存起來。',
        effects: { self: -3 },
        set: (s) => {
          s.flags.aestheticCurious = true;
        },
        log: '你截了圖，存進一個沒有命名的相簿。你沒有點應徵，只是想確認那扇門真的存在。',
      },
      {
        label: '滑掉，去看下一床。',
        effects: { self: 2, health: -2 },
        log: '你走去病房，經過一整排關燈的病室。只有一床亮著，是那位睡不著的阿嬤。你進去陪她講了五分鐘的話。',
      },
    ],
  },
  {
    id: 'r_stay_reason',
    scene: 'or',
    mood: 'lifted',
    stages: ['resident'],
    weight: 2,
    cond: (s) => s.attrs.clinical >= 45,
    text: '一台從下午開到半夜的刀：出血、休克、血壓兩次掉到量不到。收尾的時候主治拍你的背：「今天是你救了他。」',
    effects: { self: 8, health: -6, clinical: 3 },
    stats: { surgeries: 1, livesSaved: 1 },
    log: '你在更衣室坐了十分鐘，突然想不起上一次懷疑這份工作是什麼時候。這種時刻一年大概兩次，你靠它們過完剩下的三百六十三天。',
  },
];
