/**
 * @fileoverview Hour-by-hour slot builders for SmogGuard low-emission daily routines.
 */

import { ROUTINE_DEFAULTS } from '../constants/index.js';
import { formatHour } from '../utils/format.js';

/**
 * Build morning and midday routine slots (06:00–12:00).
 * @param {Object} ctx - Normalized routine context.
 * @returns {Array<Object>} Three morning/midday routine slots.
 */
export function buildMorningSlots(ctx) {
  const cookingPrep =
    ctx.hasChimney !== 'none'
      ? 'Run chimney/exhaust fan 2 min before & 10 min after'
      : 'Cover pots with lids & crack kitchen exhaust/window briefly';
  const commuteTip =
    ctx.commuteMode === 'wfh'
      ? 'enjoy zero-emission WFH setup'
      : `prefer fitted N95 mask on ${ctx.commuteMode} commute`;

  return [
    {
      timeRange: '06:00 – 08:00',
      slot: 'Early Morning',
      icon: '🌅',
      action:
        ctx.highSmogDay || ctx.sensitive
          ? 'Keep bedroom windows shut during cold morning smog; do indoor stretching instead of roadside jogging.'
          : 'Check morning PM2.5; light outdoor walk is okay if PM2.5 is below 60 µg/m³.',
      reason:
        'Morning temperature inversions often trap overnight combustion & traffic particles near ground level.',
    },
    {
      timeRange: '08:00 – 10:00',
      slot: 'Morning Cooking & Commute',
      icon: '🍳',
      action: `${cookingPrep} while cooking (${String(ctx.cookingFuel).toUpperCase()}); ${commuteTip}.`,
      reason:
        'Prevents breakfast/lunch cooking aerosols from spreading and reduces rush-hour inhalation dose.',
    },
    {
      timeRange: '10:00 – 12:00',
      slot: 'Midday Cleaning',
      icon: '🧹',
      action: 'Wet mop floors and wipe surfaces with a damp microfiber cloth (skip dry brooming).',
      reason: 'Removes settled dust without kicking PM2.5/PM10 back into indoor breathing zones.',
    },
  ];
}

/**
 * Build the afternoon best-ventilation window slot.
 * @param {Object} ctx - Normalized routine context.
 * @returns {Object} Afternoon window routine slot.
 */
export function buildAfternoonSlot(ctx) {
  const bestOk =
    (ctx.bestPm25 ?? ROUTINE_DEFAULTS.BEST_PM25_FALLBACK) <= ROUTINE_DEFAULTS.VENTILATE_MAX_PM25;
  return {
    timeRange: `${formatHour(ctx.bestStart)} – ${formatHour(ctx.bestEnd)}`,
    slot: 'Best Air Window',
    icon: '🌬️',
    action: bestOk
      ? `Open opposite windows for 15–20 minutes of cross-ventilation (lowest forecast PM2.5 ~${ctx.bestPm25} µg/m³).`
      : `Even the cleanest window is high (~${ctx.bestPm25} µg/m³) — limit window opening to 5–10 minutes or rely on clean-room filtration.`,
    reason:
      'Afternoon solar mixing typically disperses ground-level smog to the day’s lowest concentration.',
  };
}

/**
 * Build evening preparation, peak smog avoid window, and overnight clean-room slots.
 * @param {Object} ctx - Normalized routine context.
 * @returns {Array<Object>} Three evening/night routine slots.
 */
export function buildPeakAndNightSlots(ctx) {
  const coolingTip =
    ctx.cooling === 'ac'
      ? 'Run AC in recirculation at 26°C if cooling is needed.'
      : 'Keep doors sealed and use pressure-cooker/covered lids for dinner.';
  const cadrText = ctx.cleanRoom
    ? ` (target HEPA CADR ${ctx.cleanRoom.sizing.cadrRange.min}–${ctx.cleanRoom.sizing.cadrRange.max} m³/h)`
    : '';
  return [
    {
      timeRange: '17:00 – 19:00',
      slot: 'Evening Preparation',
      icon: '🪟',
      action:
        'Close exterior windows and balcony doors before evening traffic buildup; avoid burning agarbatti/coils.',
      reason:
        'Pre-sealing indoor air before evening peaks prevents indoor PM2.5 from climbing overnight.',
    },
    {
      timeRange: `${formatHour(ctx.avoidStart)} – ${formatHour(ctx.avoidEnd)}`,
      slot: 'Peak Smog / Avoid Hours',
      icon: '🚨',
      action: `Avoid outdoor exercise (peak forecast ~${ctx.avoidPm25} µg/m³). ${coolingTip}`,
      reason: 'Evening traffic + cooling boundary layer creates peak 24-hour particulate exposure.',
    },
    {
      timeRange: '22:00 – 06:00',
      slot: 'Overnight Clean Room',
      icon: '😴',
      action: `Gather sensitive family members to sleep in "${ctx.roomName}" with door closed${cadrText} and switch off standby plugs.`,
      reason:
        'Secures 7–8 continuous hours of lower-PM2.5 recovery air while minimizing overnight phantom power.',
    },
  ];
}
