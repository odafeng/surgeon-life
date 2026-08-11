// 結局判定。順序即優先序：越特殊的越前面。
// 每個結局都要留下代價，不存在「全拿」的結局——這是整個遊戲的主旨。
import { relationshipSummary, PEOPLE } from './characters.js';
import { resolve } from './text.js';

/** 有沒有孩子，結局文字要講對——結算單就在下面，講錯馬上穿幫。 */
function kin(state) {
  // 結局那一年孩子可能已經三十幾歲了。寫成「講學校的事」會把整段的可信度拉掉。
  const kid = state.family.children?.[0];
  const kidAge = kid ? state.age - kid.bornAt : -1;
  if (state.family.kids > 0)
    return {
      who: '孩子',
      talk:
        kidAge >= 25
          ? '孩子會在飯桌上講你聽不懂的工作的事'
          : kidAge >= 19
            ? '孩子會在飯桌上講你聽不懂的朋友的事'
            : '孩子會在飯桌上講你聽不懂的學校的事',
    };
  return state.family.stage === 'married'
    ? { who: '另一半', talk: `${resolve(state, '{配偶}')}會在飯桌上講你聽不懂的同事的事` }
    : { who: '你認識最久的朋友', talk: '有人會約你吃飯，而你去得成' };
}

function baseEnding(state, cause) {
  const a = state.attrs;
  const professor = state.rank === 'professor' || state.rank === 'associate';

  if (cause === 'exit-specialty')
    return {
      id: 'another_path',
      title: '另一條路',
      scene: 'corridor',
      body: '你選擇了另一個專科，過上了另一種生活：有的月份忙，有的月份閒，也有自己這一行的難處。多年後的同學會，外科的同學聊著刀房裡的事，你安靜地聽，像在聽一個平行世界。沒有誰的選擇比較高明——每一條路，都有各自要付的代價。',
    };

  if (cause === 'death')
    return {
      id: 'no_self_heal',
      title: '醫者不能自醫',
      scene: 'or',
      body: `${state.age} 歲，你倒在工作中，再也沒有醒來。訃聞說你「一生奉獻醫療」。追思會上，院方代表致詞三分鐘；你救過的人有些來了，站在最後一排。你教別人保養身體教了一輩子，唯一沒掛你門診的病人，是你自己。`,
    };

  // ───── 一次性、不可逆、只有一條路能走到的結局排在這裡 ─────
  //
  // 下面那幾個（算術問題、雷射、租金、那張椅子）任何一種低收入或行政職涯都拿得到，
  // 這幾個各只有一條路。撞在一起的時候，讓只有一條路的那個說話。
  //
  // 恩師那兩個原本排在醫美之後，而那兩件事是同一個配置綁在一起的：臨床配低才
  // 開得壞那台刀，臨床配低也一定欠債。實測 300 局裡 62 局死在台上，53 局拿到
  // 「算術問題」，只有 3 局讀到「他死在我的手上」；救回來的 29 局也有 20 局被蓋掉。
  //
  // 你親手開了那台刀，而他沒有下手術台
  if (state.flags?.mentorDiedOnTable)
    return {
      id: 'on_my_table',
      title: '他死在我的手上',
      scene: 'or',
      body: `你這一生救回過幾百個人，沒有一個抵得過那一個。${PEOPLE.mentor.name}死在你的手術台上，而你做了所有他教過你的事。從那之後你還是開刀，開得比以前更謹慎，也更久——你不敢停下來，因為一停下來，你就會回到那第七個小時。有人說你後來變得沉默。他們不知道你是在聽，聽有沒有人講到他的名字。`,
    };

  // 恩師成了你的病人，而你親手開了那台刀
  if (state.flags?.mentorOperated && state.flags?.mentorSurvived)
    return {
      id: 'his_hands',
      title: '他教你的那雙手',
      scene: 'or',
      body: `你這一生開過的所有刀裡，最重的那一台，病人是${PEOPLE.mentor.name}。你用他教你的每一個動作，把他從你們都很熟悉的那個地方拉回來。退休那天你收拾櫃子，翻到他留給你的筆記，最後一頁寫著「這一台，我沒有把握」。你在旁邊補了一行：我也是。然後你把本子放進紙箱，帶回家。`,
    };

  // 孩子沒有人顧，走偏了
  //
  // 一樣只有一條路：導師警告、派出所、搬出去不留地址。實測 120 局有 53 局拿到
  // 這個旗標且活到退休，最初只有 5 局讀得到。
  if (state.flags?.kidEstranged)
    return {
      id: 'other_peoples_children',
      title: '你救得了所有人的孩子',
      scene: 'home',
      body: '你這輩子把幾百個孩子從父母手上接過來，又完好地交回去。有些家屬到現在還會寄卡片。你自己的孩子搬出去的那年沒有留地址，你每個月匯一筆錢過去，他沒有退回來，也沒有說過謝謝。你在別人的家屬面前很會講話，知道什麼時候該停、什麼時候該讓對方哭完。輪到自己的時候，你一句都想不出來。',
    };

  if (state.career === 'aesthetic' && state.flags.forcedAesthetic)
    return {
      id: 'forced_out',
      title: '算術問題',
      scene: 'aesthetic',
      body: '你不是不愛開刀，你是付不出下個月的貸款。離職那天你把手術帽留在櫃子裡沒帶走，想著哪天還會回來拿。診所的工作不難，錢也夠了，只是每次有人問你「以前是做什麼的」，你都會停頓一下，才想好要怎麼講。',
    };

  if (state.career === 'aesthetic' && state.talents.social >= 6)
    return {
      id: 'laser',
      title: '你的雷射打得又快又好',
      scene: 'aesthetic',
      body: '診所越開越大，你學會了行銷、學會了話術、學會了準時下班。存摺上的數字，終於對得起你放榜那年的分數。只是偶爾在深夜，你的右手還記得打結的觸感——那雙手現在保養得很好，像一件收進櫃子裡的樂器。',
    };

  if (state.career === 'aesthetic')
    return {
      id: 'rent',
      title: '診所的租金又漲了',
      scene: 'aesthetic',
      body: '你以為離開健保就是出路。但你不擅長招呼客人，不擅長直播，不擅長把療程包裝成夢想。你的技術在這裡值不了錢——你這才發現，原來在哪裡都一樣：這個世界從來沒有打算為技術本身付錢。',
    };

  // 你接下了黃振邦的位置，然後開始說他當年說過的話
  if (state.people?.chief?.succeeded)
    return {
      id: 'became_him',
      title: '你坐上了那張椅子',
      scene: 'office',
      body: '你當了部主任。你要年輕人交論文、顧績效、別惹事，因為你現在知道不交會怎樣。有一天你在會議上聽見自己的聲音，發現那是黃振邦的語氣。你曾經很討厭那個語氣。你現在懂了，但懂了也沒有比較好受——你成為了那個你二十年前發誓不要成為的人，而且你是為了保護底下的人才成為的。',
    };

  // 有錢，有人陪，只是那個人要的不是你
  if (state.flags?.beingDrained)
    return {
      id: 'someone_beside_you',
      title: '至少最後有人在旁邊',
      scene: 'aesthetic',
      body: '你退休的時候身邊有人。她替你安排行程、記得你的藥、在你住院的時候簽同意書。你的存摺薄了很多，你的會計師欲言又止過三次。你不是不知道。你只是算過一筆帳：一個人待在那間房子裡的每一個晚上，跟這些錢比起來，哪一個比較貴。你算出來的答案，你不打算跟任何人解釋。',
    };

  // 一個人走到最後，而且是自己選的
  if (
    state.family.stage === 'single' &&
    state.family.kids === 0 &&
    a.self >= 60 &&
    a.familyBond <= 62 && // 單身無子女時引擎給的上限，代表這條線真的一直是空的
    (state.people?.spouse?.stage ?? 0) === 0 // 從來沒有人走進來，不是有人離開
  )
    return {
      id: 'alone_on_purpose',
      title: '一個人，但不是被剩下的',
      scene: 'home',
      body: '你沒有結婚，沒有小孩。過年時親戚問過很多次，後來就不問了。你把週末留給自己，把錢花在想去的地方，把最好的時間給了刀房。有人說你可惜，你聽了都笑笑——他們不知道你拒絕過幾次，也不知道每一次你都想清楚了。你的緊急聯絡人欄位填的是同一個朋友的名字，填了三十年。',
    };

  // 你留到最後，而同梯和學弟都走了
  if (
    state.people?.peer?.path !== 'stayed' &&
    state.people?.junior?.path === 'left' &&
    a.clinical >= 65
  )
    return {
      id: 'last_one',
      title: '最後一個還在的人',
      scene: 'corridor',
      body: `${PEOPLE.peer.name}走了，${PEOPLE.junior.name}也走了。你查房的時候會經過他們以前的位置，那裡現在坐著你叫不出名字的人。你還在開刀，刀還是開得很好。只是晨會的時候你環顧一圈，發現整個科裡，記得十年前那些事的人，只剩下你一個。你成為了資歷最深的那個人——這不是成就，這是倖存。`,
    };

  if (state.rank === 'professor' && a.clinical < 60)
    return {
      id: 'no_or',
      title: '你已經很久沒進開刀房了',
      scene: 'office',
      // 頭銜要照玩家實際拿到的講。有人在 65 歲那年明確拒絕了部主任，
      // 結局卻說他當上了——同一年之內把玩家的選擇反寫掉。
      body:
        '聘書上是教授' +
        (state.people?.chief?.succeeded ? '，門上的牌子是部主任' : '') +
        '。你的行程表滿是會議，牆上滿是獎狀。有年輕主治恭敬地問起你當年的刀法，你笑了笑，沒有回答——因為你自己也快想不起來了。你用放下手術刀，換到了讓別人拿起手術刀的位置。值不值得，你沒有問過自己。',
    };

  // 教職與刀都拿到了——代價寫在家人和身體上
  if (professor && a.clinical >= 75 && (a.familyBond < 45 || a.health < 35))
    return {
      id: 'both_but',
      title: '你什麼都做到了',
      scene: 'office',
      // 觸發條件是「家庭或健康」其中一項垮掉，所以代價要照實際垮掉的那一項寫。
      // 原本兩句都寫死，於是家庭 80、健康 20 的玩家被告知家人早就不等他吃飯。
      body:
        '聘書、代表著作、一整櫃研討會的名牌，加上一雙全院都認的手。年輕醫師拿你當範本，演講邀約排到明年。這些是真的。也是真的：' +
        [
          a.health < 35 ? '你的膝蓋上下樓要扶欄杆，健檢報告上的紅字一年比一年多' : null,
          a.familyBond < 45 ? '你的家人早就學會不等你吃飯' : null,
        ]
          .filter(Boolean)
          .join('，') +
        '。' +
        (a.self < 50
          ? '你做到了所有事，只有一件沒做到——沒有一年，你是為自己活的。'
          : '你做到了所有事。代價不是沒有，只是它不寫在任何一張獎狀上。'),
    };

  if (a.clinical >= 85 && a.familyBond < 30)
    return {
      id: 'legend',
      title: '手術室的傳說，家裡的陌生人',
      scene: 'or',
      body: '退休茶會擠滿了人，每個學生都有一個你半夜救場的故事。你是傳說。回到家，你和家人坐在同一張餐桌，客氣得像多年不見的舊識。你能在三小時內完成別人五小時的刀，卻用了三十年，沒能走完從醫院到家裡的那段路。',
    };

  // 刀開得好、家庭也顧到、活著退休——代價是升等這條路你沒有走
  if (a.clinical >= 75 && a.familyBond >= 60 && state.rank !== 'professor')
    return {
      id: 'good_hands',
      title: '一雙沒有頭銜的好手',
      scene: 'home',
      // 這個結局的條件是「沒當上教授」，不是「完全沒升等」。
      // 對一個累積了八百多點、掛著副教授的人說「沒有升等」，會把玩家推出故事。
      body:
        `你開到最後一天，刀還是全院最漂亮的。${kin(state).talk}，你聽得很開心。` +
        (state.rank === 'vs' || state.rank === 'none'
          ? '名牌上一直是「主治醫師」；新來的住院醫師只知道你刀開得好，不知道為什麼你沒去升等。'
          : `名牌上停在「${RANK_LABELS[state.rank]}」，沒有再往上；新來的住院醫師只知道你刀開得好，不知道為什麼你沒當教授。`) +
        '你也很少解釋——那些點數要用夜晚換，而你的夜晚，早就標好了要給誰。',
    };

  if (a.clinical >= 40 && a.familyBond >= 50 && a.health >= 40 && a.self >= 50)
    return {
      id: 'ordinary',
      title: '平凡的幸福',
      scene: 'home',
      body: `你不是傳說，論文不多，錢也不多。但${kin(state).who}認得你，你的膝蓋還能爬山，你偶爾會收到當年病人的年節簡訊。深夜你偶爾想：如果當年再拼一點……然後你聽見隔壁房間的呼吸聲，把這個念頭輕輕關掉。在這個制度裡，「平凡」是你能搶救回來的最好結局——而它竟然需要搶救。`,
    };

  if (a.health < 30)
    return {
      id: 'worn_out',
      title: '你撐到了最後一天',
      scene: 'oncall',
      body: '你等到了退休那天，靠的是意志力和三種慢性病的藥。歡送會上你站著講了五分鐘就得坐下。回家的路上你想：再多兩年也可以吧。然後你的膝蓋替你回答了。你贏了這場比賽，只是衝過終點線的時候，身上已經沒有一個零件是好的。',
    };

  return {
    id: 'retire',
    title: '你退休了',
    scene: 'corridor',
    body: '歡送會的蛋糕上寫著「仁心仁術」。你交還識別證，走出醫院大門，警衛跟你點頭，一如過去三十幾年的每一天。你開過的刀、救回的人、錯過的晚餐——這些數字不會出現在任何獎狀上。它們只出現在下面這張表裡。',
  };
}

/**
 * 從一生的定義性時刻裡挑出要唸回來的。
 * 太多會失焦，所以取前中後——開頭是你怎麼開始的，中間是你變成什麼樣，最後是你留下什麼。
 */
function pickMemories(state, max = 8) {
  const all = state.memories ?? [];
  if (all.length <= max) return all;
  const head = all.slice(0, 2);
  const tail = all.slice(-3);
  const middle = all.slice(2, -3);
  const need = max - head.length - tail.length;
  const step = middle.length / need;
  const mid = Array.from({ length: need }, (_, i) => middle[Math.floor(i * step)]);
  return [...head, ...mid, ...tail];
}

const RANK_LABELS = {
  none: '未升主治',
  vs: '主治醫師',
  assistant: '助理教授',
  associate: '副教授',
  professor: '教授',
};

export function decideEnding(state, cause) {
  const a = state.attrs;
  const e = baseEnding(state, cause);
  let filterKind = null;
  let filterLine = null;
  if (a.self < 25) {
    filterKind = 'gray';
    filterLine = '但直到最後，你始終不知道，自己為什麼活得這麼累。';
  } else if (a.self >= 70) {
    filterKind = 'peace';
    filterLine = '你知道自己為什麼這樣活。這件事，比任何頭銜都難得。';
  }

  const papers = Math.round(a.papers);
  const settlement = [
    { label: '累計刀量（含跟刀）', value: state.stats.surgeries },
    { label: '救回的人', value: state.stats.livesSaved },
    { label: '被告次數', value: state.stats.lawsuits },
    { label: '最終職級', value: RANK_LABELS[state.rank] || '—' },
    { label: '論文歸類計分', value: `${papers} 點` },
    { label: '折合論文', value: `約 ${Math.round(papers / 40)} 篇` },
    { label: '其中真的有人引用的', value: `${Math.floor((papers / 40) * 0.3)} 篇` },
    { label: '錯過的家庭晚餐', value: state.stats.missedDinners },
    { label: '負債的年份', value: state.stats.debtYears ? `${state.stats.debtYears} 年` : '無' },
    { label: '最終存款', value: `${Math.round(a.money)} 萬` },
    { label: '孩子', value: state.family.kids > 0 ? `${state.family.kids} 個` : '無' },
    ...relationshipSummary(state),
  ];
  return { ...e, filterKind, filterLine, settlement, memories: pickMemories(state) };
}
