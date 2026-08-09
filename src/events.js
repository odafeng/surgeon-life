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

export const EVENTS = [
  ...PGY_EVENTS,
  ...RESIDENT_EVENTS,
  ...ATTENDING_SYSTEM_EVENTS,
  ...ATTENDING_CAREER_EVENTS,
  ...AESTHETIC_EVENTS,
  ...FAMILY_EVENTS,
  ...CORE_EVENTS,
];
