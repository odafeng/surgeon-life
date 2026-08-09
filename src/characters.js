// 人物。
//
// 在此之前，事件裡的「主任」出現過 26 次、「學長」20 次，但每一次都是不同的陌生人。
// 一個人的一生不是這樣的：真正留下來的，是同一批人在不同年份出現的樣子。
//
// 每個人有 bond（你們的關係）與 stage（弧線走到哪），事件用 cond 讀 stage 決定該演哪一幕。
// stage 只進不退，由事件的 set 推進，所以每個人的故事一輩子只會走一次。

export const PEOPLE = {
  mentor: {
    key: 'mentor',
    name: '陳文彬',
    title: '恩師',
    intro: '教你打結的人。他的刀又快又乾淨，他罵人也是。',
  },
  peer: {
    key: 'peer',
    name: '林致遠',
    title: '同梯',
    intro: '同一年進外科的人。你們一起被電，一起在值班室吃過期的麵包。',
  },
  chief: {
    key: 'chief',
    name: '黃振邦',
    title: '部主任',
    intro: '制度的臉。他要你交論文、要你顧績效、要你別惹事。',
  },
  junior: {
    key: 'junior',
    name: '許士杰',
    title: '學弟',
    intro: '你帶的人。他看你的眼神，像你當年看陳文彬。',
  },
  nurse: {
    key: 'nurse',
    name: '阿蘭姐',
    title: '護理長',
    intro: '這間刀房換過四個主任，她一個人記得所有事。',
  },
  patient: {
    key: 'patient',
    name: '王慶昌',
    title: '病人',
    intro: '你早年從鬼門關拉回來的人。他記得你，比你記得他久。',
  },
  spouse: {
    key: 'spouse',
    name: '{配偶}',
    title: '另一半',
    intro: '學會看你的班表，學會在你值班的晚上自己吃飯，學會不問你什麼時候下班。',
  },
};

export function initPeople() {
  return {
    mentor: { bond: 55, stage: 0, gone: false },
    peer: { bond: 50, stage: 0, path: null }, // path：stayed｜left｜broken
    chief: { bond: 35, stage: 0, succeeded: false },
    junior: { bond: 0, stage: 0, path: null }, // path：stayed｜left
    nurse: { bond: 55, stage: 0, retired: false },
    patient: { bond: 0, stage: 0, alive: true },
    spouse: { bond: 0, stage: 0, gone: false },
  };
}

export function bondOf(state, key) {
  return state.people?.[key]?.bond ?? 0;
}

export function adjustBond(state, key, delta) {
  const p = state.people?.[key];
  if (!p) return;
  p.bond = Math.max(0, Math.min(100, p.bond + delta));
}

/** 弧線只進不退，而且不能跳關。 */
export function advance(state, key, to) {
  const p = state.people?.[key];
  if (p && to > p.stage) p.stage = to;
}

export function nameOf(key) {
  return PEOPLE[key]?.name ?? '';
}

/** 結局結算單上的人際欄位。 */
export function relationshipSummary(state) {
  const p = state.people;
  if (!p) return [];
  const out = [];
  if (p.mentor.gone) out.push({ label: '恩師', value: `${PEOPLE.mentor.name}・已故` });
  else if (p.mentor.stage >= 2) out.push({ label: '恩師', value: `${PEOPLE.mentor.name}・退休` });
  if (p.peer.path === 'left') out.push({ label: '同梯', value: `${PEOPLE.peer.name}・離開外科` });
  else if (p.peer.path === 'broken')
    out.push({ label: '同梯', value: `${PEOPLE.peer.name}・撐不住了` });
  else if (p.peer.path === 'stayed')
    out.push({ label: '同梯', value: `${PEOPLE.peer.name}・還在開刀` });
  if (p.junior.path === 'stayed')
    out.push({ label: '你帶的人', value: `${PEOPLE.junior.name}・留在外科` });
  else if (p.junior.path === 'left')
    out.push({ label: '你帶的人', value: `${PEOPLE.junior.name}・走了` });
  if (p.spouse?.gone) out.push({ label: '另一半', value: `${PEOPLE.spouse.name}・離開了` });
  else if (p.spouse?.stage >= 3)
    out.push({ label: '另一半', value: `${PEOPLE.spouse.name}・還在同一張餐桌` });
  if (p.chief.succeeded) out.push({ label: '部主任', value: '你自己' });
  return out;
}
