/**
 * @fileoverview Pure room-wise air purifier CADR sizing and clean-room selection calculator.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../data/constants.js';

const GRID_FACTOR_INDIA = 0.82;
const CLEAN_ROOM_WEIGHTS = {
  bedroom: 40,
  kids_room: 40,
  study: 25,
  living_room: 15,
  defaultType: 5,
  poorVent: 20,
  moderateVent: 15,
  goodVent: 10,
  sensitiveBonus: 35,
  compactRoomCapSqM: 25,
  compactBonus: 15,
  largeBonus: 5,
};

/**
 * Calculate HEPA purifier sizing, achieved ACH, monthly bill cost, and annual grid emissions.
 * @param {number|string} roomSizeSqM - Room floor area in square meters (or `'unknown'`).
 * @param {number|string} [ceilingHeightM] - Ceiling height in meters (or `'unknown'`).
 * @param {number} [targetACH] - Target air changes per hour.
 * @returns {Object} Purifier sizing recommendation and assumptions.
 */
export function calculatePurifierSizing(
  roomSizeSqM,
  ceilingHeightM = DEFAULTS.ceilingHeightM,
  targetACH = DEFAULTS.targetACH
) {
  const safeArea =
    roomSizeSqM === 'unknown' || roomSizeSqM == null || Number(roomSizeSqM) <= 0
      ? CONSERVATIVE_UNKNOWNS.roomAreaSqM
      : Number(roomSizeSqM);
  const safeHeight =
    ceilingHeightM === 'unknown' || ceilingHeightM == null || Number(ceilingHeightM) <= 0
      ? DEFAULTS.ceilingHeightM
      : Number(ceilingHeightM);

  const roomVolume = safeArea * safeHeight;
  const recommendedCADR = Math.round(roomVolume * targetACH);
  const cadrRange = {
    min: Math.round(recommendedCADR * DEFAULTS.cadrRangeLowRatio),
    max: Math.round(recommendedCADR * DEFAULTS.cadrRangeHighRatio),
  };

  const dailyKwh = (DEFAULTS.purifierWatts / 1000) * DEFAULTS.purifierHoursPerDay;
  const runningCostPerMonth = Math.round(
    dailyKwh * DEFAULTS.daysPerMonth * DEFAULTS.electricityRatePerKwh
  );
  const annualEmissions = Math.round(dailyKwh * DEFAULTS.daysPerYear * GRID_FACTOR_INDIA);

  return {
    areaSqM: Math.round(safeArea * 10) / 10,
    ceilingHeightM: Math.round(safeHeight * 10) / 10,
    roomVolume: Math.round(roomVolume * 10) / 10,
    recommendedCADR,
    cadrRange,
    achievedACH: targetACH,
    runningCostPerMonth,
    annualEmissions,
    assumptions: [
      `Room volume: ${Math.round(safeArea * 10) / 10} m² × ${Math.round(safeHeight * 10) / 10} m = ${Math.round(roomVolume * 10) / 10} m³`,
      `Target: ${targetACH} air changes/hour (ASHRAE/clinical HEPA PM2.5 clean-room guidance)`,
      `Power draw: ${DEFAULTS.purifierWatts}W for ${DEFAULTS.purifierHoursPerDay} hrs/day at ₹${DEFAULTS.electricityRatePerKwh}/kWh`,
      `Grid factor: ${GRID_FACTOR_INDIA} kgCO₂e/kWh (CEA India v18, 2023)`,
    ],
  };
}

function scoreRoomForCleanRoom(room, sizing) {
  const typeScore = CLEAN_ROOM_WEIGHTS[room.type] ?? CLEAN_ROOM_WEIGHTS.defaultType;
  const sealScore =
    room.ventilation === 'poor'
      ? CLEAN_ROOM_WEIGHTS.poorVent
      : room.ventilation === 'moderate'
        ? CLEAN_ROOM_WEIGHTS.moderateVent
        : CLEAN_ROOM_WEIGHTS.goodVent;
  const sensitiveScore = room.hasSensitiveOccupant ? CLEAN_ROOM_WEIGHTS.sensitiveBonus : 0;
  const areaScore =
    sizing.areaSqM <= CLEAN_ROOM_WEIGHTS.compactRoomCapSqM
      ? CLEAN_ROOM_WEIGHTS.compactBonus
      : CLEAN_ROOM_WEIGHTS.largeBonus;
  return typeScore + sealScore + sensitiveScore + areaScore;
}

/**
 * Evaluate household rooms and designate the optimal "Clean Room".
 * @param {Array<Object>} [rooms=[]] - Configured household rooms.
 * @param {string[]} [sensitiveGroups=[]] - Selected sensitive family profile IDs.
 * @returns {Array<Object>} Rooms enriched with CADR sizing and `isCleanRoom` flag.
 */
export function buildRoomByRoomPlan(rooms = [], sensitiveGroups = []) {
  const safeRooms =
    Array.isArray(rooms) && rooms.length > 0
      ? rooms
      : [
          {
            id: 'room-1',
            name: 'Primary Bedroom',
            type: 'bedroom',
            areaSqM: CONSERVATIVE_UNKNOWNS.roomAreaSqM,
            ceilingHeightM: CONSERVATIVE_UNKNOWNS.ceilingHeightM,
            ventilation: 'moderate',
            hasSensitiveOccupant: sensitiveGroups.length > 0,
          },
        ];

  const evaluated = safeRooms.map((room) => {
    const sizing = calculatePurifierSizing(room.areaSqM, room.ceilingHeightM, DEFAULTS.targetACH);
    return { ...room, sizing, cleanRoomScore: scoreRoomForCleanRoom(room, sizing) };
  });

  const sorted = [...evaluated].sort((a, b) => b.cleanRoomScore - a.cleanRoomScore);
  const cleanRoomId = sorted[0]?.id;

  return evaluated.map((room) => ({
    ...room,
    isCleanRoom: room.id === cleanRoomId,
    cleanRoomReason:
      room.id === cleanRoomId
        ? 'Best choice for your sealed Clean Room: long sleeping/resting duration, practical volume to filter to ≥5 ACH, and priority for sensitive family members.'
        : 'Keep doors closed during smog spikes; prioritize source control (wet mopping, exhaust during cooking) here.',
  }));
}
