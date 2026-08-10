// 事件總表。實際內容依人生階段拆在 src/events/ 底下，這裡只負責匯總。
// 資料格式見 src/events/pgy.js 的檔頭。
export { PROLOGUE } from './events/prologue.js';

import { PGY_EVENTS } from './events/pgy.js';
import { RESIDENT_EVENTS } from './events/resident.js';
import { ATTENDING_SYSTEM_EVENTS } from './events/attending-system.js';
import { ATTENDING_CAREER_EVENTS } from './events/attending-career.js';
import { AESTHETIC_EVENTS } from './events/aesthetic.js';
import { FAMILY_EVENTS } from './events/family.js';
import { CORE_EVENTS } from './events/core.js';
import { MENTOR_EVENTS } from './events/people-mentor.js';
import { PEER_EVENTS } from './events/people-peer.js';
import { JUNIOR_EVENTS } from './events/people-junior.js';
import { NURSE_EVENTS } from './events/people-nurse.js';
import { CHIEF_EVENTS } from './events/people-chief.js';
import { PATIENT_EVENTS } from './events/people-patient.js';
import { FAMILY_ARC_EVENTS } from './events/people-family.js';
import { FAMILY_BRANCH_EVENTS } from './events/people-family-branches.js';
import { FEMALE_EVENTS } from './events/female.js';
import { LEAVING_EVENTS } from './events/leaving.js';

export const EVENTS = [
  ...PGY_EVENTS,
  ...RESIDENT_EVENTS,
  ...ATTENDING_SYSTEM_EVENTS,
  ...ATTENDING_CAREER_EVENTS,
  ...AESTHETIC_EVENTS,
  ...FAMILY_EVENTS,
  ...CORE_EVENTS,
  ...MENTOR_EVENTS,
  ...PEER_EVENTS,
  ...JUNIOR_EVENTS,
  ...NURSE_EVENTS,
  ...CHIEF_EVENTS,
  ...PATIENT_EVENTS,
  // 女性線要排在家庭弧線前面：孕期的班表得先於產檢與生產演出來。
  ...FEMALE_EVENTS,
  // 離開健保那一年的道別，排在家庭弧線之前——那幾幕要先演
  ...LEAVING_EVENTS,
  ...FAMILY_ARC_EVENTS,
  ...FAMILY_BRANCH_EVENTS,
];
