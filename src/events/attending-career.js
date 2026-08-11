// 主治醫師（32-65 歲）。升等、教學、人際與晚年——刀開得再好，公式裡也沒有那一格。
export const ATTENDING_CAREER_EVENTS = [
  {
    id: 'ac_desk_reject',
    once: true, // 七個月、三小時、改名 v2 是一個具體時刻，重播會讀成失憶
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    text: '你寫了七個月的論文，投出去三小時後收到回信：不送外審。理由欄只有一行：「與本刊讀者群關聯性不足。」',
    effects: { self: -4 },
    log: '三小時。連時差都不夠用。你把檔名改成 v2，開始查下一本期刊的投稿須知。',
  },
  {
    id: 'ac_reject_chain',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    text: '同一份稿子，你已經投到第六本。每退一次就往下降一區，每降一區，升等表上能填的點數就少一截。',
    effects: { papers: 15, self: -3, health: -2 },
    log: '第六本收了。刊出那天你重讀摘要，發現你最想講的那個發現，早在第三本的回覆意見裡被你自己刪掉了。',
  },
  {
    id: 'ac_accept_mail',
    scene: 'or',
    mood: 'lifted',
    stages: ['attending'],
    weight: 2,
    // 論文接受本來就會發生很多次，所以這一幕該重複——但逐字重播就變成同一封信。
    // 第二次以後由正文自己承認那是另一篇，跟 as_point_settle 同一個做法。
    // playYear 的順序是：先算 text，套用效果，跑 set，最後才算 log。
    // 所以 text 讀到的是「這次之前」的次數，log 讀到的是「含這次」的次數，
    // 用布林旗標的話第一次就會顯示第二次的結果文——這裡用計數。
    text: (s) =>
      s.flags.acceptedPapers
        ? '又一封。刀開到一半，流動護理師說你的手機在更衣室震個不停。收完傷口你才去看：另一篇，另一個主編，同樣的第一個字。'
        : '刀開到一半，流動護理師說你的手機在更衣室震個不停。收完傷口你才去看：主編來信，第一個字是 Congratulations。',
    effects: { papers: 25, self: 6 },
    set: (s) => {
      s.flags.acceptedPapers = (s.flags.acceptedPapers || 0) + 1;
    },
    log: (s) =>
      s.flags.acceptedPapers > 1
        ? '你回了信，然後去看下一台的病人。第一次你還記得那天穿哪件刷手服，這一次你連是哪一本都要想一下。'
        : '你回了信，然後去看下一台的病人。整間開刀房沒有人知道剛剛發生了什麼——這種事在這裡不算事。',
  },
  {
    id: 'ac_reviewer2',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    text: '審稿意見回來了。一號審稿人寫了兩行，建議接受。二號審稿人寫了四頁，最後要求你補做一個至少要再收三年個案的分析。',
    effects: { self: -3, health: -2 },
    log: '你逐條回覆，把「做不到」寫成八百字的委婉句。第二輪二號只回一句：作者已充分回應。',
  },
  {
    id: 'ac_be_reviewer',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.papers >= 120,
    text: '期刊邀你審一篇稿。題目和你手上正在跑的那篇，重疊得有點多。',
    choices: [
      {
        // 這一幕本來只有「照審」和「拖延搶先」，等於把唯一專業正確的做法從選單上拿掉了。
        // 利益衝突要揭露，該迴避就迴避——那才是這個題目真正的第一選項。
        label: '回信婉拒，並告訴編輯重疊在哪裡。',
        // 審稿不是教學服務，婉拒不該扣教學分數。
        //
        // 也不要替它硬補代價。依 ICMJE 與 COPE，reviewer 向編輯揭露利益衝突並迴避
        // 就是正常合規流程，編輯不會因此記你一筆。第一版寫「少了一次在期刊露臉」
        // 跟同幕「署名是匿名」自相矛盾；第二版改成「下次他想到誰就是想不到你」，
        // 等於把矛盾換成一個沒有依據的職涯報復。照規矩做完的事，就是沒有後續。
        effects: { self: 6 },
        memory: '期刊請你審一篇跟你手上題目重疊的稿，你婉拒了，並告訴編輯重疊在哪裡。',
        log: '編輯回了一句「謝謝你講清楚」，然後換了人審。你把那封邀請歸檔，回去做自己那篇。這件事沒有後續——照規矩來的事情，通常都沒有。',
      },
      {
        label: '照規矩審，該給的意見給。',
        effects: { self: 4, health: -1 },
        log: '你花了兩個週末寫了三頁建議。稿酬是零，署名是匿名。半年後那篇刊出，致謝欄感謝了「兩位匿名審稿人」。',
      },
      {
        label: '寫信要求延長審查期限。',
        effects: { self: -7 },
        log: '你多爭取到六週。你自己那篇在第五週投了出去。這件事不會有人知道，只是你以後每次看到那本期刊都會想起來。',
      },
    ],
  },
  {
    id: 'ac_if_zone',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.papers >= 80,
    text: '新一年的期刊分區公告出來。你去年拚到刊出的那本，從第一區掉到第二區。你的論文沒變，計分規則沒變，變的是分母。',
    // 正文說少了 18 點，那 18 點以前沒有真的扣。玩家被告知分數掉了，HUD 上的數字
    // 一動也不動，而這一幕沒有 once，每年都能再宣稱一次。
    effects: { self: -4, papers: -18 },
    log: '你重算一次歸類計分，少了 18 點。你想申訴，但這件事沒有任何一個單位是負責人。',
  },
  {
    id: 'ac_predatory_mail',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    text: '信箱裡本週第九封邀稿信：「Dear Distinguished Professor，我們拜讀了您 2019 年的傑出研究……」他們列出的那篇，作者不是你。',
    effects: { self: -1 },
    log: '你按了退訂。三天後同一個編輯部換了刊名再寄一次，這回稱你為 Esteemed Doctor。',
  },
  {
    id: 'ac_predatory_deadline',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.rank === 'vs' && s.attrs.papers >= 150 && s.attrs.papers < 300,
    text: '送件剩四個月，你差六十點。信箱裡躺著一封邀稿信：兩週審查，保證刊登，版面費九百美金。',
    choices: [
      {
        label: '刪掉。',
        effects: { self: 5 },
        log: '你把信刪了，今年沒有送件。這個決定沒有人看見，也不會有人替你記上一筆。',
      },
      {
        label: '投。點數就是點數。',
        effects: { papers: 20, self: -8, money: -3 },
        log: '兩週後刊出，排版把你的圖壓成一團灰。點數審核那關過了——因為承辦人也只是照著清單打勾。',
      },
    ],
  },
  {
    id: 'ac_gift_author',
    once: true,
    scene: 'corridor',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    text: '論文定稿了。主任在走廊上叫住你：「這題目當初是我在晨會提的，掛個共同作者吧。」他沒有進過你的收案資料庫。',
    choices: [
      {
        label: '加上去。',
        effects: { papers: 20, self: -6 },
        log: '你在作者欄多打了一個名字。這位主任今年掛了十九篇，其中十七篇他沒有讀完。',
      },
      {
        label: '委婉拒絕。',
        effects: { papers: 20, self: 5 },
        log: '他笑著說沒關係。三個月後科內研究經費分配表出來，你的名字排在最後一個。',
      },
    ],
  },
  {
    id: 'ac_author_order',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.teaching >= 20,
    text: '收案是住院醫師做的，統計是你跑的，題目是你想的。投稿前一晚他小聲問：「老師，第一作者……可以掛我嗎？我想留在醫學中心，履歷上要有東西。」',
    choices: [
      {
        label: '給他。',
        effects: { papers: 15, teaching: 3, self: 4 },
        log: '你掛通訊作者。隔年他留下來了，主治缺是三個人搶一個。你的升等表上，這篇的點數要乘上一個小於一的係數。',
      },
      {
        label: '你也需要這一篇。',
        effects: { papers: 25, self: -5 },
        log: '他說「好」，說得很快。之後他還是替你收案，只是不再問你下一篇要做什麼。',
      },
    ],
  },
  {
    id: 'ac_ghost_favor',
    scene: 'home',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '大學同學打電話來，說有一篇快投了，想掛你的名字：「你是主治，掛你比較好過。反正對你也沒壞處。」你連稿子都沒看過。',
    choices: [
      {
        label: '請他先把稿子寄來。',
        effects: { self: 3 },
        log: '稿子寄來了，方法那段你看了三遍還是看不懂。你回信說看不懂所以不掛。他沒有再回。',
      },
      {
        label: '掛吧，同學一場。',
        effects: { papers: 15, self: -6 },
        log: '刊出了，你到現在還是不知道那篇在寫什麼。兩年後那本期刊被移出索引資料庫，你的名字還在上面。',
      },
    ],
  },
  {
    id: 'ac_grant_write',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    weight: 3,
    cond: (s) => s.alloc.research >= 15,
    text: '部級計畫收件倒數十天。計畫書三十頁，附表十四張，其中一張要你填三年後的「預期效益量化指標」。',
    choices: [
      {
        label: '硬寫完。',
        effects: { health: -4, self: -2 },
        log: '你連續七個晚上寫到兩點。預期效益那格你填了「提升國人存活率」，因為系統不接受空白。',
      },
      {
        label: '今年放棄，明年再說。',
        effects: { self: -4 },
        log: '「明年再說」的代價，是副教授那一格永遠填不了。你關掉檔案，草稿還留在桌面上，檔名是「新增資料夾」。',
      },
    ],
  },
  {
    id: 'ac_grant_rejected',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.grants.applied === true,
    text: '計畫審查結果公告：未獲補助。三位委員的評語加起來不到兩百字，一句是「創新性略顯不足」，另一句是「研究團隊過於龐大」——你的團隊只有兩個人。',
    effects: { self: -5 },
    log: '你把評語存成檔案，檔名是年份。這個資料夾裡已經有四個了。',
  },
  {
    id: 'ac_grant_close',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.grants.yearsPI >= 1,
    text: '計畫結案。核銷規定是：試劑要三家比價，出國報告要附登機證存根，而你去年替病人墊的那筆耗材，不在可核銷項目裡。',
    effects: { health: -2, self: -3, money: -3 },
    log: '會計退了你四次。第五次過的那天，你在核銷單上簽名的字，比手術同意書上還潦草。',
  },
  {
    id: 'ac_grad_student',
    scene: 'office',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.research >= 20,
    text: '你收了第一個碩士生。他把初稿寄來，前言引了十二篇文獻，其中九篇他只讀了摘要。',
    choices: [
      {
        label: '一句一句改給他看。',
        effects: { teaching: 4, health: -3, self: 2 },
        log: '你改到凌晨三點，附了修訂稿寄回去。他隔天回：「老師謝謝，我照你的貼上去了。」',
      },
      {
        label: '退回去，叫他自己重寫。',
        effects: { teaching: 2, self: -2 },
        log: '他重寫了四次。第五次交來的東西裡，你第一次看見他自己的句子。',
      },
    ],
  },
  {
    id: 'ac_pvalue',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.research >= 15,
    text: '統計跑完，主要結果 p = 0.06。你很清楚，只要把兩位嚴重共病的個案挪去次分析，數字就會變成 0.04。',
    choices: [
      {
        label: '照原始資料寫。',
        effects: { papers: 15, self: 6 },
        log: '你在討論那段老實寫了未達統計顯著。這篇退了兩次才刊出，落在你這幾年分數最低的期刊。',
      },
      {
        label: '挪一下。臨床上本來就有效。',
        effects: { papers: 30, self: -10 },
        log: '刊出了，還被引用十一次。這件事沒有人查得到，所以它只存在你一個人的記憶裡。',
      },
    ],
  },
  {
    id: 'ac_lost_chart',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.research >= 15,
    text: '收案表上有十一筆的追蹤資料是空的——病人沒有回診，電話也不通。距離結案報告剩三週。',
    choices: [
      {
        label: '照實寫失聯，樣本數縮水。',
        effects: { papers: 15, self: 4 },
        log: '審查意見寫：「失訪率偏高，影響結論強度。」你想回他，那十一個人現在在哪裡也沒有人知道，但那一格只能填數字。',
      },
      {
        label: '用最後一次的數值往後填。',
        effects: { papers: 25, self: -8 },
        log: '報告準時送出。你在方法那段寫了「以末次觀察值推估」——這句話是真的，這也是它最可怕的地方。',
      },
    ],
  },
  {
    id: 'ac_english_reject',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '退稿理由：「英文表達需經母語人士編修。」你把稿子送去編修，回來的版本改了七個逗號，收費一萬二。',
    effects: { money: -1, self: -4 },
    log: '重投之後過了。同一份數據，同一個結論，差別是七個逗號和一張收據。',
  },
  {
    id: 'ac_generalizability',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '審稿意見：「單一亞洲族群之單中心資料，外推性有限。」你翻了那本期刊上一期，三篇是單一北歐國家的單中心資料，沒有人被要求討論外推性。',
    effects: { self: -4 },
    log: '你在回覆信裡補了一段「本研究族群之限制」。這段話後來被別人引用了，用來說明亞洲資料的限制。',
  },
  {
    id: 'ac_external_review',
    scene: 'office',
    stages: ['attending'],
    once: true,
    cond: (s) => s.attrs.papers >= 240 && s.rank !== 'professor',
    text: '升等送外審。你要從十年的著作裡挑五篇代表作，附一份自述，說明你「對本學門的貢獻」。',
    effects: { self: -2, health: -1 },
    log: '你寫了三頁，刪到剩一頁半。那些你半夜爬起來趕回醫院救回的人，一個都不能寫進去——那不算著作。',
  },
  {
    id: 'ac_review_verdict',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    cond: (s) => s.attrs.papers >= 280 && s.rank !== 'professor',
    text: '外審回來三份：兩份甲等，一份丙等。丙等那份寫「著作主題分散，缺乏一貫性」。那些主題，是十年來科裡缺什麼刀你就開什麼刀留下來的。',
    effects: { self: -6 },
    log: '院級審議把你的案子延到下一次。承辦人在電話裡很客氣：「老師，這很常見，補件就好。」',
  },
  {
    id: 'ac_teaching_68',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.teaching < 70 && s.attrs.papers >= 180,
    text: '送件前一週，人事室來電：教學服務分數 68 分，門檻 70。「老師，您要不要再找幾場演講補一下？月底前的都算。」',
    choices: [
      {
        label: '去補三場演講。',
        effects: { teaching: 5, health: -3 },
        log: '你在三個週末講了三場，聽眾加起來十九個人。分數變成 73，送件過了。那三場的內容你到現在還記得，因為你是真的有備課。',
      },
      {
        label: '不補了，明年再說。',
        effects: { self: -5 },
        log: '你掛了電話。這一年你帶四個住院醫師、代了十一次晨會、值了三十六班——系統認列 68 分。',
      },
    ],
  },
  {
    id: 'ac_conference_poster',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '年會海報區。你的海報貼在最後一排，旁邊就是茶點桌。三個小時裡有兩個人停下來，一個是來拿咖啡的，另一個是你的學生。',
    effects: { self: -3, health: -1 },
    log: '隔壁廳的微整形新技術講座站滿了人，走廊排到電梯口。你把海報捲回筒子裡，那支筒子你用了九年。',
  },
  {
    id: 'ac_pharma_lecture',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '藥廠業務約你演講。題目他們擬好了，投影片也做好了，「老師只要講就好」。演講費三萬。',
    choices: [
      {
        // 藥廠的產品說明會不是升等審查認的教學服務，不管投影片是誰做的。
        label: '接，但投影片自己重做。',
        effects: { money: 3, health: -2, self: 2 },
        log: '你刪掉了第七頁——那頁只列了自家藥的好處。業務笑著說沒關係。下一季他們沒有再找你。',
      },
      {
        label: '照他們的講。',
        effects: { money: 3, self: -7 },
        log: '你講得很流暢。台下有個年輕醫師抄得很認真，抄的是那張你連資料來源都沒查過的圖。',
      },
      {
        label: '婉拒。',
        effects: { self: 3 },
        log: '你說最近排刀排得滿。掛掉電話你算了一下，那三萬是你一整個月的值班費。',
      },
    ],
  },
  {
    id: 'ac_supplement_ad',
    scene: 'home',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.attrs.money < 100 || s.talents.social >= 6,
    // 不同廠商本來就會一直來找，所以這一幕該重複——但逐字重播就變成同一支影片。
    // 跟接受信同一個做法：由正文承認這是又一間。
    // 注意 playYear 的順序是 text → 效果 → set → log，所以 text 讀「這次之前」的次數、
    // log 讀「含這次」的次數，用布林旗標的話第一次就會顯示第二次的說法。
    text: (s) =>
      s.flags.supplementOffers
        ? '又一間保健食品廠商來信，要借你的頭銜和白袍。稿子跟上次那家幾乎一樣，連「我自己也在吃」都沒有換。十五萬。'
        : '保健食品廠商來信，要借你的頭銜和白袍拍一支影片，念一段稿：「身為外科醫師，我自己也在吃。」十五萬。',
    choices: [
      {
        label: '拒絕。',
        effects: { self: 5 },
        set: (s) => {
          s.flags.supplementOffers = (s.flags.supplementOffers || 0) + 1;
        },
        log: (s) =>
          s.flags.supplementOffers > 1
            ? '你又回了一次同樣的信。這家隔週也找到了別人——那類影片你現在滑到會直接跳過，因為認得出那個句型。'
            : '你回信說這個成分沒有足夠證據。對方隔週找到另一位主治，那支影片現在還在播。',
      },
      {
        // 這個遊戲沒有房貸這個狀態。選項不該替玩家造一個他不一定有的負擔——
        // 眼前那十五萬本來就夠有說服力了。
        label: '接。十五萬就是十五萬。',
        effects: { money: 15, self: -10 },
        set: (s) => {
          s.flags.supplementOffers = (s.flags.supplementOffers || 0) + 1;
        },
        log: (s) =>
          s.flags.supplementOffers > 1
            ? '這次只 NG 了兩次。你發現自己已經知道要怎麼念那一句，才是真正難受的地方。'
            : '拍了兩小時，NG 六次，都卡在「我自己也在吃」那一句。上架之後，門診有病人拿手機問你這個是不是真的有效。',
      },
    ],
  },
  {
    id: 'ac_eval_score',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.teaching >= 10,
    text: '教學評鑑出來，你 4.3 分，科內平均 4.6。教學部寄來一封信，主旨是「教學品質提升輔導」，附件是一份三十題的自評表。',
    effects: { self: -3, teaching: 1 },
    log: '分數最高的那位同事，帶教方式是讓學生自己看影片，然後準時放人。',
  },
  {
    id: 'ac_eval_anon',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.alloc.teaching >= 10,
    text: '匿名評語你看了三遍。二十四則裡有二十三則寫「認真」「願意教」，第二十四則寫：「查房太久，害我們吃不到午餐。」',
    effects: { self: -4 },
    log: '你只記得第二十四則。這件事你沒跟任何人講，包括那天陪你查房到一點半的住院醫師。',
  },
  {
    id: 'ac_hand_the_knife',
    scene: 'or',
    stages: ['attending'],
    weight: 3,
    cond: (s) => s.attrs.clinical >= 60,
    text: '一台不難的膽囊。住院醫師刷好手站在主刀位，眼睛看著你。你知道他上一次拿刀是三個禮拜前。',
    choices: [
      {
        label: '讓他開，你站旁邊。',
        effects: { teaching: 5, health: -2, self: 3 },
        stats: { surgeries: 1 },
        log: '他開了兩倍的時間，你的手一直停在他的視野邊緣。麻醉科探頭問還要多久，你說快了。',
      },
      {
        label: '你自己來，今天刀多。',
        effects: { clinical: 2, self: -3 },
        stats: { surgeries: 1 },
        log: '四十分鐘結束，準時接下一台。他幫你拉鉤，全程沒說話。那個位置你自己也站過很多年。',
      },
    ],
  },
  {
    id: 'ac_resident_grievance',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 2,
    text: '住院醫師向教學部反映你「言詞嚴厲」。那天他在術中把血管夾夾錯了位置，你當場提高了音量。',
    choices: [
      {
        label: '去找他談。',
        effects: { teaching: 3, self: 2, health: -1 },
        log: '你們在茶水間站著講了二十分鐘。他說他知道你為什麼吼，但他就是會怕。你說你也怕，只是你怕的是別的東西。',
      },
      {
        label: '寫一份書面回覆，就這樣。',
        effects: { self: -4, teaching: -2 },
        log: '教學部結案。之後那間刀房你沒有再罵過任何人，也沒有再糾正過任何人。',
      },
    ],
  },
  {
    id: 'ac_resident_hours',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '住院醫師的工時系統跳紅字，這個月超時了。科裡的解法是把他排掉三個班，而那三個班還是要有人上。',
    choices: [
      {
        label: '你自己補。',
        effects: { health: -5, self: 2, teaching: 2 },
        stats: { missedDinners: 2 },
        log: '主治沒有工時上限，因為主治不用登錄工時。制度保護了他，方法是把那些小時搬到一個沒有欄位的地方。',
      },
      {
        label: '排給另一個住院醫師。',
        effects: { self: -5 },
        log: '那個人這個月的紅字，下個月再處理。系統上這一格轉綠了，護理站白板上的名字沒有變。',
      },
    ],
  },
  {
    id: 'ac_clerk_question',
    scene: 'clinic',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    text: '實習醫學生跟診到最後，收東西的時候問你：「老師，如果是你自己的小孩要念醫學系，你會讓他念嗎？」',
    choices: [
      {
        label: '會啊，這行還是值得。',
        effects: { self: -3 },
        log: '你講完自己愣了一下。上個月你姪女問過同一句，那時候你搖了頭。',
      },
      {
        label: '你答不出來。',
        effects: { self: -5, teaching: 2 },
        log: '你沉默了大概五秒。學生說「我懂了」就走了。你到現在都不確定，他懂的是哪一種答案。',
      },
    ],
  },
  {
    id: 'ac_match_zero',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 2,
    text: '住院醫師招募結果公告：一般外科，缺額五名，報名零人。公告貼在公佈欄上，旁邊是醫美診所的徵才傳單，薪資那欄寫得很清楚。',
    effects: { self: -6 },
    log: '科務會議決定明年要「加強招募宣傳」。做法是拍一支影片，由科內同仁自願出演，不支薪。',
  },
  {
    id: 'ac_called_teacher',
    scene: 'corridor',
    stages: ['attending'],
    once: true,
    cond: (s) => s.age >= 38,
    text: '走廊上有人喊「老師」，你沒有回頭，因為你以為在叫你後面那位。第二聲你才發現是在叫你。',
    effects: { self: 4, teaching: 2 },
    log: '你想起自己第一次喊別人老師的那天。你也開始講一些當年你不太想聽的話，而且講得很順。',
  },
  {
    id: 'ac_resident_leaves',
    scene: 'oncall',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => s.attrs.teaching >= 30,
    text: '你帶了三年的住院醫師遞辭呈。他說要去診所，「不是因為錢」，停了一下，「錢也是一部分」。',
    effects: { self: -8, teaching: -3 },
    log: '他把你送他的那本手術圖譜還回來，說放在診所會浪費。你說留著。隔天那本書還是出現在你桌上。',
  },
  {
    id: 'ac_student_years_later',
    scene: 'clinic',
    mood: 'lifted',
    stages: ['attending'],
    once: true,
    cond: (s) => s.age >= 45 && s.attrs.teaching >= 30,
    text: '門診收尾時，一位陌生醫師敲門進來，說他十年前在你這裡見習過三個月。他現在在南部的區域醫院開刀。',
    effects: { self: 8, teaching: 2 },
    log: '他複述了一句你當年在刀房門口跟他說的話。你聽了很久，確定那不是你會講的句子——但他記了十年，而且照著做了。',
  },
  {
    id: 'ac_peer_professor',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.rank !== 'professor' && s.age >= 45,
    text: '同期進來的那位升上教授了。慶祝茶會辦在會議室，你去了，端著紙杯站在後面。他致詞說「感謝團隊」，台下有六個人是他的共同作者。',
    effects: { self: -5 },
    log: '回辦公室的路上你經過刀房排程表。這個月你的刀量是全科第一。這件事不會有茶會。',
  },
  {
    id: 'ac_chief_race',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    cond: (s) => s.age >= 44,
    text: '主任任期到了。有人來探你的口風：「你的資歷夠，但你要先去跟院長那邊講一聲。」他說的「講一聲」，你聽得懂。',
    choices: [
      {
        label: '去講一聲。',
        effects: { self: -6, clinical: -2 },
        log: '你在院長室待了四十分鐘，聊的都不是醫療。走出來的時候你在想，這四十分鐘夠開完一台疝氣。',
      },
      {
        label: '不去。有本事就照資歷排。',
        effects: { self: 4 },
        log: '新主任是另一位。他上任第一件事，是把你的門診從星期二調到星期五下午。',
      },
    ],
  },
  {
    id: 'ac_kpi_slide',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    // 這個遊戲沒有追蹤刀的難度，也沒有任何選擇讓你成為專開難刀的人。
    // 「你開的刀最難」是憑空替玩家寫的履歷。
    // 制度上的對比留著——那才是這一幕真正的內容：排名只數得到件數。
    text: '科務會議，投影片打出全科績效排名：手術件數、平均住院天數、每床收入。你的名字在中間。三欄數字裡，沒有一欄看得出一台刀開了幾個小時。',
    effects: { self: -4 },
    log: '排第一的同事開的都是短刀，一天排得下八台。會議上有人稱讚他效率高，沒有人反駁，包括你。',
  },
  {
    id: 'ac_headhunt',
    scene: 'office',
    stages: ['attending'],
    once: true,
    cond: (s) => s.attrs.clinical >= 70 && s.age >= 42,
    text: '南部一家區域醫院來挖角：外科部主任，薪水加四成，「刀房時段隨你排」。條件是你要把團隊帶過去。',
    choices: [
      {
        label: '去。',
        effects: { money: 30, self: -3, health: -2 },
        log: '你談了三個月，最後只有兩個人願意跟。新醫院的第一台刀，助手是剛畢業的住院醫師，器械護理師對你的習慣一無所知。',
      },
      {
        label: '留下。',
        effects: { self: 2 },
        log: '你推掉了。院方知道之後回你一句「感謝你對醫院的向心力」，然後把你的刀房時段砍掉一節。',
      },
    ],
  },
  {
    id: 'ac_fifty_stamina',
    scene: 'or',
    mood: 'weary',
    stages: ['attending'],
    weight: 3,
    cond: (s) => s.age >= 50,
    text: '一台六小時的刀。站到第四小時，你的腰開始發麻，你把重心從左腳換到右腳，再換回來。年輕的時候你可以連開三台。',
    effects: { health: -5, self: -3 },
    stats: { surgeries: 1 },
    log: '收完傷口，你在更衣室坐了十分鐘才站得起來。你的技術是這輩子最好的時候，你的身體不是。',
  },
  {
    id: 'ac_handover_ask',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => s.age >= 56,
    text: '主任找你談明年的排程：「大刀交給年輕人練，你多帶一點門診，順便顧身體。」他說得很體貼，你聽得出那是兩件事。',
    choices: [
      {
        label: '接受，開始交棒。',
        effects: { teaching: 5, clinical: -3, self: -4 },
        log: '你把三台複雜的刀交出去，自己站到助手的位置。第二台的時候你伸手去接器械，接到一半又收了回來。',
      },
      {
        label: '再開兩年。',
        effects: { self: 3, health: -4 },
        log: '你的刀量沒有掉。年底排程表上，你的名字後面多了一行備註：建議評估體能狀況。沒有人告訴你那行是誰加的。',
      },
    ],
  },
  {
    id: 'ac_white_coat_speech',
    scene: 'office',
    stages: ['attending'],
    once: true,
    cond: (s) => s.age >= 55,
    text: '醫學院請你去白袍典禮致詞。台下坐著三百個十九歲的孩子，家長舉著手機在後面錄影。講稿你自己寫的，寫了四次。',
    choices: [
      {
        label: '照講稿講。',
        effects: { teaching: 4, self: 2 },
        log: '你講了醫者仁心，講了病人的託付。掌聲很整齊。走下台的時候，你看見第一排有個學生在滑手機，螢幕上是醫美診所的徵才頁。',
      },
      {
        label: '把講稿放下，講實話。',
        effects: { teaching: 3, self: 6 },
        log: '你講了工時、點值、醫療糾紛，也講了那個你從鬼門關另一頭喊回來的人。散場後有兩個學生跑來要聯絡方式。主辦單位事後很委婉地說，明年可能請別的老師。',
      },
    ],
  },
  {
    id: 'ac_last_case',
    scene: 'or',
    stages: ['attending'],
    once: true,
    cond: (s) => s.age >= 62,
    text: '你排上了退休前的最後一台刀。是一台疝氣，四十分鐘就能結束——他們特地挑了一台不會出事的。',
    effects: { self: 6, health: -2 },
    stats: { surgeries: 1 },
    log: '縫完最後一針，你照習慣說了「謝謝大家」。護理師拍了照。你在洗手台前把手洗乾淨，才想起後面已經沒有下一台了。',
  },
];
