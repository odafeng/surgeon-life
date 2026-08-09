// 學弟・許士杰。你帶的人。他看你的眼神，像你當年看陳文彬。
//
// 弧線：0 他出現，笨手笨腳 → 1 他進步了，開始問制度的問題 → 2 他問你要不要留 → 3 留下來，或者走了。
// 分歧點在 stage 2：玩家的回答寫進 path，結局的人際欄位會唸回來。
import { advance } from '../characters.js';

const J = (s) => s.people.junior;

export const JUNIOR_EVENTS = [
  // ───────── 第 0 幕：他出現 ─────────
  {
    id: 'j_first_case',
    scene: 'or',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => J(s).stage === 0 && s.age >= 38,
    text: '新來的住院醫師許士杰第一次跟你的刀。他把拉鉤拉反了方向，被念一句之後改成完全不敢施力，視野一樣沒有。',
    effects: { teaching: 2 },
    bond: { junior: 3 },
    log: '下刀後他站在門口跟你鞠躬，說「學長對不起」。你也在那個位置站過，那時候沒有人回你話，你就一直站著。',
  },
  {
    id: 'j_teach_or_not',
    scene: 'oncall',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => J(s).stage === 0 && s.age >= 38,
    text: '許士杰遞手機給你，是他自己在值班室錄的打結影片，問你哪裡不對。檔案時間是凌晨兩點四十分。',
    choices: [
      {
        label: '看完，一格一格指給他看。',
        effects: { teaching: 4, health: -2 },
        bond: { junior: 8 },
        memory: '許士杰凌晨兩點半錄了打結的影片問你哪裡不對，你一格一格看完，指給他看。',
        set: (s) => advance(s, 'junior', 1),
        log: '你們在更衣室蹲了四十分鐘。隔天他的結，右手還是慢，方向對了。那天之後他改口叫你老師。',
      },
      {
        label: '「多打幾次就會了。」',
        effects: { teaching: 1 },
        bond: { junior: -4 },
        set: (s) => advance(s, 'junior', 1),
        log: '他說好，把手機收起來。三個月後他的結打得不錯——你不知道是誰教的，也沒有問。',
      },
    ],
  },

  // ───────── 第 1 幕：他進步了，然後他開始問 ─────────
  {
    id: 'j_improves',
    scene: 'or',
    mood: 'lifted',
    stages: ['attending'],
    weight: 3,
    cond: (s) => J(s).stage === 1,
    text: '許士杰第一次獨立開闌尾。你站在對面，手插在口袋裡，整台只講了一句：「再往頭側一點。」',
    effects: { teaching: 3, self: 2 },
    bond: { junior: 5 },
    log: '收完最後一針他抬頭看你，眼睛亮得有點過分。你認得那個眼神。當年有人也看過你這樣，而那個人什麼都沒說。',
  },
  {
    id: 'j_asks_hours',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    weight: 3,
    cond: (s) => J(s).stage === 1,
    text: '許士杰拿工時登錄的畫面給你看：「老師，我這個月實際是 102 小時，可是系統只讓我填到 80。」',
    choices: [
      {
        label: '「填 80。多的那些，我幫你記著。」',
        effects: { self: -3 },
        bond: { junior: 4 },
        log: '你在自己的筆記本上寫了一個 22。那本筆記本後來寫滿了，沒有人看過，也沒有任何一張表格收得下。',
      },
      {
        label: '「照實填，被退件我去講。」',
        effects: { self: 3, teaching: 2 },
        bond: { junior: 6 },
        log: '系統退了四次。第五次他改成 80，在附註欄寫「系統上限」。承辦人打電話來，請他把附註也刪掉。',
      },
    ],
  },
  {
    id: 'j_asks_promotion',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => J(s).stage === 1,
    text: '他問你升等到底要幾點。你聽見自己說：「三百點，寫十年。不寫的人，說話沒有人聽。」',
    effects: { teaching: 2, self: -3 },
    bond: { junior: 3 },
    log: '講完你停了兩秒。這句話你三十歲的時候聽過，當時你不同意。你剛剛一個字都沒改，就交給了下一個人。',
  },
  {
    id: 'j_night_shift',
    scene: 'oncall',
    mood: 'weary',
    stages: ['attending'],
    weight: 3,
    cond: (s) => J(s).stage === 1,
    text: '半夜三點，你和許士杰在值班室對坐，中間是一個微波過兩次的便當。他問：「老師，你上一次休完整的假是什麼時候？」',
    effects: { health: -1, self: -2 },
    bond: { junior: 4 },
    log: '你認真想了很久，想到的是七年前一個下午，你在停車場的車上睡了兩小時。你把這件事講出來，他笑到一半停住了。',
  },
  {
    id: 'j_takes_blame',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => J(s).stage === 1,
    text: '許士杰的病人術後出血回開刀房。家屬的投訴信寫了三頁。科務會議上主任問：「這台誰主刀的？」',
    choices: [
      {
        label: '「我在旁邊，是我讓他開的。」',
        effects: { self: 4, health: -2 },
        bond: { junior: 10 },
        log: '散會後他在走廊上追上你，話還沒出口就先哽住。你說：「回去看你的病人。」說完你自己愣了一下。',
      },
      {
        label: '據實說是他主刀。',
        effects: { self: -4, teaching: -1 },
        bond: { junior: -8 },
        log: '他站起來把經過講完，講得很完整，聲音很穩。之後他還是跟你的刀，只是不再問你問題。',
      },
    ],
  },
  {
    id: 'j_offer_rumor',
    scene: 'corridor',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => J(s).stage === 1 && s.age >= 48,
    text: '同事私下跟你說，有人在竹北一家醫美診所看到許士杰，穿西裝。當天下午他照常來跟你的刀，什麼都沒提。',
    effects: { self: -3 },
    bond: { junior: 2 },
    set: (s) => advance(s, 'junior', 2),
    log: '那台刀他開得比平常更仔細，收線收得很慢。你在旁邊看了很久，也沒有問。',
  },

  // ───────── 第 2 幕：他問你 ─────────
  {
    id: 'j_the_question',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    once: true,
    weight: 4,
    cond: (s) => J(s).stage === 2,
    text: '值完班的早上，許士杰在醫局門口等你。他手上拿著兩張紙，沒有讓你看清楚。他問：「老師，你會建議我留在外科嗎？」',
    choices: [
      {
        label: '「會。總得有人開刀。」',
        effects: { teaching: 5, self: 4 },
        bond: { junior: 10 },
        memory: '許士杰問你會不會建議他留在外科，你說會，因為總得有人開刀。',
        set: (s) => {
          advance(s, 'junior', 3);
          J(s).path = 'stayed';
        },
        log: '他把那兩張紙折起來塞回口袋，說了聲好。你走出醫局才想起來，很多年前有人對你說過同一句話，語氣一模一樣。',
      },
      {
        label: '「不會。你還來得及。」',
        effects: { self: -6, teaching: -2 },
        bond: { junior: 6 },
        memory: '許士杰問你會不會建議他留在外科，你說不會，你說他還來得及。',
        set: (s) => {
          advance(s, 'junior', 3);
          J(s).path = 'left';
        },
        log: '他愣了三秒，說：「謝謝老師。」那兩張紙，一張是離職申請書，一張是診所的聘書。他當天下午就送出去了。',
      },
    ],
  },

  // ───────── 第 3 幕：他留下來 ─────────
  {
    id: 'j_successor',
    scene: 'or',
    mood: 'lifted',
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => J(s).path === 'stayed' && s.age >= 55,
    text: '你經過三號房，門開著。許士杰站在主刀的位置，正在對一個住院醫師說：「你不決定，病人替你決定。」',
    effects: { teaching: 4, self: 5 },
    bond: { junior: 5 },
    memory: '你在門口聽見許士杰對他的住院醫師說出那句話，那句話你也是聽來的。',
    log: '那是陳文彬的話。你從來沒有跟他提過這個人，他不可能知道。你在門口站了一下就走了。',
  },
  {
    id: 'j_carries_it',
    scene: 'office',
    mood: 'weary',
    stages: ['attending'],
    weight: 3,
    cond: (s) => J(s).path === 'stayed' && s.age >= 56,
    text: '科務會議。爭刀房時段的人換成許士杰。他講到第七分鐘被打斷，理由是「這個議題我們下次再談」。',
    effects: { self: -3 },
    bond: { junior: 4 },
    log: '散會後他在走廊上罵了一句髒話，然後問：「老師，你以前是怎麼撐過去的？」你想不出答案，只說：「下次再談就是不談。你要在會前先講完。」',
  },

  // ───────── 第 3 幕：他走了 ─────────
  {
    id: 'j_card',
    scene: 'office',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 3,
    cond: (s) => J(s).path === 'left' && s.age >= 56,
    text: '過年前，醫局信箱裡有一張卡片。署名許士杰，寄件地址是台中一家診所。上面只有兩行字。',
    effects: { self: 3 },
    bond: { junior: 4 },
    memory: '許士杰走了很多年以後寄卡片來，說他現在打的結還是你教的那個手法。',
    log: '「老師，我現在打的結還是你教的那個手法。」下一行：「上禮拜我第一次陪女兒過生日。」你把卡片夾進筆記本，和那張舊照片放在一起。',
  },
  {
    id: 'j_meets_again',
    scene: 'aesthetic',
    mood: 'wry',
    stages: ['attending'],
    weight: 2,
    cond: (s) => J(s).path === 'left' && s.age >= 57,
    text: '你陪家人去看皮膚科，在診所走廊上遇到許士杰。襯衫，新的名牌，看起來睡得很好。',
    choices: [
      {
        label: '「氣色不錯。」',
        effects: { self: -2 },
        bond: { junior: 3 },
        log: '他笑著說：「老師，我一個月看四百個人，沒有一個會死。」講完他自己安靜了一下，才問你科裡還好嗎。',
      },
      {
        label: '問他還開不開刀。',
        effects: { self: -4 },
        bond: { junior: 2 },
        log: '執照還在，兩年沒進過刀房。「手感掉得比我想的快。」他講這句話的時候在看自己的手。',
      },
    ],
  },

  // ───────── 收束 ─────────
  {
    id: 'j_echo',
    scene: 'or',
    mood: 'wry',
    stages: ['attending'],
    once: true,
    weight: 2,
    cond: (s) => J(s).stage >= 3 && s.age >= 58,
    text: '新的住院醫師第一天跟你的刀，把拉鉤拉反了方向。你聽見自己說「那邊」，然後伸手把他的手移過去。',
    effects: { teaching: 3 },
    log: '他鞠躬說對不起，你說不用。你已經很久沒有算過自己教過幾個人，只記得留下來的有幾個。',
  },
];
