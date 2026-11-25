/**
 * Routine & Preventive Measures Builder — SmogGuard
 * Pure functions to prioritize preventive measures into 4 tiers
 * ("Do now (free)", "Today", "This week (low cost)", "Later (investment)")
 * and build an hour-by-hour routine adapted to the 24h air window.
 */

import { PRIORITY_TIERS, CONSERVATIVE_UNKNOWNS } from '../data/constants.js';
import { formatHour } from '../utils/format.js';

function resolve(val, fallback) {
  return val == null || val === '' || val === 'unknown' ? fallback : val;
}

/**
 * Filter actions that fit the user's household profile and constraints.
 */
export function filterApplicableActions(actions, profile = {}) {
  const isRenting = profile.rentalLimits === true || profile.rentalLimits === 'unknown';
  const cooling = resolve(profile.cooling, CONSERVATIVE_UNKNOWNS.cooling);
  const commuteMode = resolve(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode);
  const commuteKm = Number(resolve(profile.commuteKm, CONSERVATIVE_UNKNOWNS.commuteKm)) || 10;
  const hasChimney = resolve(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney);

  return actions.filter((action) => {
    if (isRenting && !action.rentalFriendly) return false;

    for (const c of action.constraints || []) {
      if (c === 'has_ac' && cooling !== 'ac') return false;
      if (c === 'has_car_commute' && !['car', 'car_petrol', 'car_diesel'].includes(commuteMode)) return false;
      if (c === 'has_exhaust_fan_or_chimney' && hasChimney === 'none') return false;
      if (c === 'owns_home' && isRenting) return false;
      if (c === 'trip_distance_under_5km' && commuteKm > 5) return false;
      if (c === 'wfh_possible' && commuteMode === 'wfh') return false;
    }

    return true;
  });
}

/**
 * Group applicable preventive measures into the 4 required priority tiers.
 */
export function buildPrioritizedMeasures(actions, profile = {}) {
  const applicable = filterApplicableActions(actions, profile);

  const grouped = {
    do_now: [],
    today: [],
    this_week: [],
    later: [],
  };

  for (const action of applicable) {
    const tier = grouped[action.priorityTier] ? action.priorityTier : 'today';
    grouped[tier].push(action);
  }

  return Object.entries(PRIORITY_TIERS)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([tierId, meta]) => ({
      tierId,
      label: meta.label,
      icon: meta.icon,
      badge: meta.badge,
      items: grouped[tierId] || [],
    }));
}

/**
 * Build an hour-by-hour routine for today adapted to the 24h PM2.5 forecast,
 * cooking setup, commute, and family sensitivity.
 */
export function buildHourlyRoutine(profile = {}, airWindow = {}, cleanRoom = null) {
  const bestStart = airWindow.bestWindowStart ?? 13;
  const bestEnd = airWindow.bestWindowEnd ?? 16;
  const avoidStart = airWindow.avoidWindowStart ?? 19;
  const avoidEnd = airWindow.avoidWindowEnd ?? 22;
  const avgPm25 = airWindow.averagePm25 ?? 60;

  const commuteMode = resolve(profile.commuteMode, CONSERVATIVE_UNKNOWNS.commuteMode);
  const cookingFuel = resolve(profile.cookingFuel, CONSERVATIVE_UNKNOWNS.cookingFuel);
  const hasChimney = resolve(profile.hasChimney, CONSERVATIVE_UNKNOWNS.hasChimney);
  const cooling = resolve(profile.cooling, CONSERVATIVE_UNKNOWNS.cooling);
  const sensitive = Array.isArray(profile.sensitiveGroups) && profile.sensitiveGroups.length > 0 && !profile.sensitiveGroups.includes('none');
  const roomName = cleanRoom?.name || 'Primary Bedroom';

  const highSmogDay = avgPm25 > 90;

  return [
    {
      timeRange: '06:00 – 08:00',
      slot: 'Early Morning',
      icon: '🌅',
      action: highSmogDay || sensitive
        ? 'Keep bedroom windows shut during cold morning smog; do indoor stretching instead of roadside jogging.'
        : 'Check morning PM2.5; light outdoor walk is okay if PM2.5 is below 60 µg/m³.',
      reason: 'Morning temperature inversions often trap overnight combustion & traffic particles near ground level.',
    },
    {
      timeRange: '08:00 – 10:00',
      slot: 'Morning Cooking & Commute',
      icon: '🍳',
      action: `${hasChimney !== 'none' ? 'Run chimney/exhaust fan 2 min before & 10 min after' : 'Cover pots with lids & crack kitchen exhaust/window briefly'} while cooking (${String(cookingFuel).toUpperCase()}); ${commuteMode === 'wfh' ? 'enjoy zero-emission WFH setup' : `prefer fitted N95 mask on ${commuteMode} commute`}.`,
      reason: 'Prevents breakfast/lunch cooking aerosols from spreading and reduces rush-hour inhalation dose.',
    },
    {
      timeRange: '10:00 – 12:00',
      slot: 'Midday Cleaning',
      icon: '🧹',
      action: 'Wet mop floors and wipe surfaces with a damp microfiber cloth (skip dry brooming).',
      reason: 'Removes settled dust without kicking PM2.5/PM10 back into indoor breathing zones.',
    },
    {
      timeRange: `${formatHour(bestStart)} – ${formatHour(bestEnd)}`,
      slot: 'Best Air Window',
      icon: '🌬️',
      action: (airWindow.bestPm25 ?? 50) <= 120
        ? `Open opposite windows for 15–20 minutes of cross-ventilation (lowest forecast PM2.5 ~${airWindow.bestPm25} µg/m³).`
        : `Even the cleanest window is high (~${airWindow.bestPm25} µg/m³) — limit window opening to 5–10 minutes or rely on clean-room filtration.`,
      reason: 'Afternoon solar mixing typically disperses ground-level smog to the day’s lowest concentration.',
    },
    {
      timeRange: '17:00 – 19:00',
      slot: 'Evening Preparation',
      icon: '🪟',
      action: 'Close exterior windows and balcony doors before evening traffic buildup; avoid burning agarbatti/coils.',
      reason: 'Pre-sealing indoor air before evening peaks prevents indoor PM2.5 from climbing overnight.',
    },
    {
      timeRange: `${formatHour(avoidStart)} – ${formatHour(avoidEnd)}`,
      slot: 'Peak Smog / Avoid Hours',
      icon: '🚨',
      action: `Avoid outdoor exercise (peak forecast ~${airWindow.avoidPm25 ?? airWindow.worstPm25} µg/m³). ${cooling === 'ac' ? 'Run AC in recirculation at 26°C if cooling is needed.' : 'Keep doors sealed and use pressure-cooker/covered lids for dinner.'}`,
      reason: 'Evening traffic + cooling boundary layer creates peak 24-hour particulate exposure.',
    },
    {
      timeRange: '22:00 – 06:00',
      slot: 'Overnight Clean Room',
      icon: '😴',
      action: `Gather sensitive family members to sleep in "${roomName}" with door closed${cleanRoom ? ` (target HEPA CADR ${cleanRoom.sizing.cadrRange.min}–${cleanRoom.sizing.cadrRange.max} m³/h)` : ''} and switch off standby plugs.`,
      reason: 'Secures 7–8 continuous hours of lower-PM2.5 recovery air while minimizing overnight phantom power.',
    },
  ];
}
