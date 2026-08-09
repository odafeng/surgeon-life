// 部主任・黃振邦。制度的臉。
//
// 弧線：0 他壓你 → 1 你發現他在擋 → 2 他累了，他年輕時要的和你現在要的一樣 → 3 位置空出來，換你坐。
// 只進不退，用 advance() 推。他不是壞人，也不是好人——他是被同一套東西磨過一輪的人。
import { advance } from '../characters.js';

const C = (s) => s.people.chief;

export const CHIEF_EVENTS = [
  // ───────── 第 0 幕：他要你的 paper、你的績效、你的時間 ─────────
  {
    id: 'c_paper_quota',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage === 0,
    text: '黃振邦把你的年度考核推過來，紅筆圈住一欄：「臨床沒問題。歸類計分零。」他停了一下，「我不管你怎麼弄，明年這一格要有數字。」',
    choices: [
      {
        label: '「我一年開四百台刀。」',
        effects: { self: -3 },
        bond: { chief: -4 },
        log: '「四百台不會出現在任何一張表上。」他把考核表收回去，「我知道這不合理。我也還是要跟你要。」',
      },
      {
        label: '「我生得出來。」',
        effects: { papers: 15, health: -3, self: -2 },
        bond: { chief: 3 },
        log: '你把三年前的病例整理成回顧性研究，寫了兩個月。上線那天他傳來兩個字：「很好。」你盯著那兩個字看了很久，不知道自己在等什麼。',
      },
    ],
  },
  {
    id: 'c_kpi_ranking',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 3,
    cond: (s) => C(s).stage === 0,
    text: '科務會議。黃振邦站在投影片前唸平均住院天數，唸到你的名字停了兩秒：「你的病人躺太久。」你開的是全科最難的刀。',
    effects: { self: -4 },
    bond: { chief: -2 },
    log: '散會他沒有留你。你回頭看那張投影片，欄位有八個，沒有一欄叫做「活著出院」。',
  },
  {
    id: 'c_admin_dump',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage === 0 && s.age >= 35,
    text: '「感染管制委員會缺一個外科代表，你去。」黃振邦把公文推過來，「每個月一次，兩小時，不難。」他沒有看你的刀表。',
    choices: [
      {
        label: '接下來。',
        effects: { teaching: 2, self: -3, health: -2 },
        bond: { chief: 4 },
        log: '第一次開會你遲到二十分鐘，因為刀還沒收完。會議紀錄上你的名字後面寫著「未出席」。你去改，改了四十分鐘。',
      },
      {
        label: '推掉，說刀排不開。',
        effects: { self: 2 },
        bond: { chief: -5 },
        log: '他點點頭：「那我自己去。」隔月你在走廊看到他抱著兩本評鑑資料夾，那天他有三台刀。',
      },
    ],
  },
  {
    id: 'c_no_waves',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage === 0,
    text: '刀房那盞無影燈壞了三個月，報修單被退四次。你打算具名投書院內信箱。黃振邦聽說了，把你叫進去：「你要惹事之前，先來跟我講。」',
    choices: [
      {
        label: '照樣投。',
        effects: { self: 5 },
        bond: { chief: -6 },
        log: '燈兩週後修好了。同一個月，你的刀房時段從星期二調到星期五下午。沒有人說這兩件事有關。',
      },
      {
        label: '算了，先跟他講。',
        effects: { self: -4 },
        bond: { chief: 5 },
        log: '他說他會處理。三週後燈亮了，公文上寫的是「例行汰換」。你連自己有沒有贏都不知道。',
      },
    ],
  },
  {
    id: 'c_overheard',
    scene: 'corridor',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => C(s).stage === 0 && s.age >= 36,
    text: '你去主任室拿簽好的公文，門沒關緊。裡面是副院長的聲音：「一個都不能加。」然後是黃振邦：「那你告訴我，今年的班誰去值。」',
    effects: { self: -2 },
    bond: { chief: 6 },
    memory: '你在門外聽見黃振邦替科裡跟副院長爭人力。那是你第一次知道他站在哪一邊。',
    set: (s) => {
      advance(s, 'chief', 1);
    },
    log: '你退到走廊底端，等裡面安靜了才敲門。他開門時臉色如常，把公文遞給你，說：「下週的刀表我看過了，你排太滿。」',
  },

  // ───────── 第 1 幕：他一直在擋，只是從來沒有講 ─────────
  {
    id: 'c_shield_junior',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage >= 1 && C(s).stage < 3 && s.age >= 40,
    text: '一個學弟的病人術後大出血，家屬告了。院內檢討會，黃振邦在所有人開口之前先說：「這台刀的處置是我核可的。」那天他根本不在醫院。',
    effects: { self: 3 },
    bond: { chief: 8 },
    log: '散會後你跟到電梯口。他看著樓層數字說：「他手上還有三十年。我剩幾年，你自己算。」',
  },
  {
    id: 'c_kpi_blocked',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    weight: 2,
    cond: (s) => C(s).stage >= 1 && C(s).stage < 3,
    text: '院方去年推的那個「單一手術平均耗材成本」指標，今年悄悄不見了。行政助理說主任在會上反對了七次，最後一次的會議紀錄只寫「經討論後暫緩」。',
    effects: { self: 2 },
    bond: { chief: 4 },
    log: '你去謝他。他抬頭看你一眼：「我沒有反對。我只是每一次都要求他們先給我算式。」他們算到第七次就不算了。',
  },
  {
    id: 'c_manpower_form',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => C(s).stage >= 1 && C(s).stage < 3 && s.age >= 42,
    text: '晚上十一點，你回辦公室拿東西，主任室的燈還亮著。黃振邦一個人在填明年的人力需求表，桌上攤著前六年的版本，每一份右上角都蓋著「不予同意」。',
    choices: [
      {
        label: '進去，陪他填完。',
        effects: { health: -3, self: 3 },
        bond: { chief: 9 },
        set: (s) => {
          advance(s, 'chief', 2);
        },
        log: '你們填到一點半。寫理由那一欄的時候他說：「第七次了。理由每年都一樣，可是要寫得不一樣，他們才會看。」',
      },
      {
        label: '站在門口，最後轉身走了。',
        effects: { self: -3 },
        bond: { chief: 1 },
        set: (s) => {
          advance(s, 'chief', 2);
        },
        log: '那份表隔天送出去了。三個月後回文：「本年度員額零成長。」他在晨會唸完這一句，接著唸下一項，語氣沒有變。',
      },
    ],
  },

  // ───────── 第 2 幕：他累了，而他年輕時要的和你現在要的一樣 ─────────
  {
    id: 'c_what_he_wanted',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => C(s).stage >= 2 && C(s).stage < 3 && s.age >= 48,
    text: '主任室的日光燈壞了一半。黃振邦倒了兩杯茶，講起他三十五歲那年寫過的一份計畫書：二十四小時待命的外傷團隊，五個人，一間專屬刀房。他講到第四分鐘你才發現，那份東西跟你去年寫的那份，幾乎一樣。',
    effects: { self: -5 },
    bond: { chief: 7 },
    memory: '黃振邦講起他三十五歲寫的那份計畫書，你發現那和你去年寫的那份幾乎一樣。',
    log: '「那份被退了。」他把茶喝完，「退件理由是人力不足。」他笑了一下，「二十年後，理由還是這個。」',
  },
  {
    id: 'c_scrub_in_again',
    scene: 'or',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage >= 2 && C(s).stage < 3 && s.attrs.clinical >= 55,
    text: '黃振邦問你下週那台胃全切除能不能讓他上。「我不主刀，」他說，「站第二助手就好。」他已經兩年沒進過刀房，行政會議一週有五個。',
    choices: [
      {
        label: '讓他上。',
        effects: { self: 4, clinical: -1 },
        stats: { surgeries: 1 },
        bond: { chief: 10 },
        log: '他的手還在。拉鉤拉得比住院醫師穩，整台刀一句話都沒講。下刀後他在洗手台前站了很久，說了聲謝謝。你不知道要回什麼。',
      },
      {
        label: '婉轉推掉，說病人狀況複雜。',
        effects: { self: -4 },
        bond: { chief: -3 },
        log: '他說：「也對。」隔週的科務會議他照常主持，照常唸那八個欄位。他再也沒有問過第二次。',
      },
    ],
  },
  {
    id: 'c_rejected_letters',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => C(s).stage >= 2 && C(s).stage < 3,
    text: '你替他找一份舊公文，拉開最下層抽屜。裡面是一疊簽呈影本，用長尾夾夾著，最上面那份的日期是十四年前：「建請調整外科人力配置案」。',
    effects: { self: -3 },
    bond: { chief: 5 },
    log: '你數了一下，二十三份。每一份的最後一頁都蓋著同一個章：「另案研議」。你把抽屜關上，那天下午的會你一句話都沒講。',
  },

  // ───────── 第 3 幕：位置空出來了 ─────────
  {
    id: 'c_farewell',
    scene: 'office',
    mood: 'weary',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 4,
    // 中間那一幕沒遇到也不能卡住整條線——他到年紀就是會走。
    cond: (s) => s.age >= 55 && (C(s).stage >= 2 || (C(s).stage === 1 && s.age >= 58)),
    text: '黃振邦的卸任茶會。院長講了六分鐘，講他任內科室營收成長幾成、評鑑拿了幾個優等。黃振邦上台講了兩句：「這一科的人力，我沒有爭到。」停了一下，「對不起。」',
    effects: { self: -4 },
    bond: { chief: 6 },
    set: (s) => {
      advance(s, 'chief', 3);
    },
    log: '台下有人以為他在講笑話，笑了兩聲，很快就沒有了。散場時他把主任室的鑰匙交還行政，順手端走那盆放了十二年的黃金葛。',
  },
  {
    id: 'c_succession',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    // 位置空出來的那一年，這張紙一定會出現在你桌上。你可以不簽，但你躲不掉。
    forced: (s) => C(s).stage >= 3 && !C(s).succeeded && s.age >= 55,
    text: '主任出缺。遴選委員把意向書放在你桌上。你翻到第三頁，職責欄第一項是「達成院方年度績效目標」，第二項才是「督導醫療品質」。',
    choices: [
      {
        label: '接。有些事情要坐在那個位置才做得到。',
        effects: { self: -6, clinical: -4, teaching: 4 },
        bond: { chief: 8 },
        memory: '你接下黃振邦的位置。那張意向書上，績效目標排在醫療品質前面。',
        set: (s) => {
          C(s).succeeded = true;
        },
        log: '你簽了。上任第一週你收到十九封信，十七封是行政的。你打電話給黃振邦，他只說：「最下層抽屜那一疊，你可以繼續寫。」',
      },
      {
        label: '不接。你想留在刀房。',
        effects: { self: 4 },
        bond: { chief: 2 },
        log: '新主任是院方屬意的那位。他上任第一件事，是把晨會從七點半提前到七點，理由是提升效率。你照樣七點到，照樣開你的刀。只是走廊上再也沒有人替你擋掉什麼，而這件事你要過兩年才會發現。',
      },
    ],
  },
  {
    id: 'c_his_words',
    scene: 'office',
    mood: 'wry',
    priority: true,
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => C(s).stage >= 3 && s.age >= 57,
    text: '一個年輕主治在辦公室抱怨升等的歸類計分：「我一年開四百台刀，這些都不算嗎？」你認得這句話。二十年前你在同一個房間講過。',
    choices: [
      {
        label: '「四百台不會出現在任何一張表上。」',
        effects: { teaching: 3, self: -6 },
        bond: { chief: 4 },
        log: '話出口的那一秒，你聽見的不是自己的聲音。你還補了一句：「我知道這不合理。我也還是要跟你要。」連補的那句都一樣。',
      },
      {
        label: '「不算。所以我在幫你想別的辦法。」',
        effects: { teaching: 4, self: 2 },
        bond: { chief: 2 },
        log: '你花了三個月，把他的手術影像整理成一份技術報告投出去。審查意見回來：「非原創性研究。」你把意見印出來，放進最下層抽屜。',
      },
    ],
  },
];
