export const TALENT_LABELS = {
  exam: '考試能力',
  dexterity: '手感',
  research: '研究天賦',
  charisma: '表達魅力',
  social: '社交能力',
  constitution: '體質',
};

// 考試能力固定 9：你就是那個很會考試的孩子，不然進不了醫學系。
export function rollTalents(rng) {
  return {
    exam: 9,
    dexterity: rng.int(1, 10),
    research: rng.int(1, 10),
    charisma: rng.int(1, 10),
    social: rng.int(1, 10),
    constitution: rng.int(1, 10),
  };
}
