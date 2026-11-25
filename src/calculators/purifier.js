/**
 * Purifier Sizing & Room-by-Room Clean Room Calculator — SmogGuard
 * Computes CADR range, achieved ACH, monthly running cost, and annual emissions,
 * and identifies the optimal "clean room" across household rooms.
 */

import { DEFAULTS, CONSERVATIVE_UNKNOWNS } from '../data/constants.js';

/**
 * Calculate purifier sizing for a single room.
 * @param {number|string} roomSizeSqM
 * @param {number|string} ceilingHeightM
 * @param {number} targetACH
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

  const roomVolume = safeArea * safeHeight; // m³
  const recommendedCADR = Math.round(roomVolume * targetACH); // m³/hr
  const cadrRange = {
    min: Math.round(recommendedCADR * 0.85),
    max: Math.round(recommendedCADR * 1.2),
  };

  const dailyKwh = (DEFAULTS.purifierWatts / 1000) * DEFAULTS.purifierHoursPerDay;
  const monthlyKwh = dailyKwh * 30;
  const runningCostPerMonth = Math.round(monthlyKwh * DEFAULTS.electricityRatePerKwh);
  const annualKwh = dailyKwh * 365;
  const annualEmissions = Math.round(annualKwh * 0.82);

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
      `Grid factor: 0.82 kgCO₂e/kWh (CEA India v18, 2023)`,
    ],
  };
}

/**
 * Evaluate all configured rooms and recommend which one to designate as the "Clean Room".
 * Prioritizes bedrooms/nurseries (long overnight hours + sealable doors) and sensitive occupants.
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
    const typeScore =
      room.type === 'bedroom' || room.type === 'kids_room'
        ? 40
        : room.type === 'study'
          ? 25
          : room.type === 'living_room'
            ? 15
            : 5;
    const sealScore =
      room.ventilation === 'poor' ? 20 : room.ventilation === 'moderate' ? 15 : 10;
    const sensitiveScore = room.hasSensitiveOccupant ? 35 : 0;
    const areaEfficiencyScore = sizing.areaSqM <= 25 ? 15 : 5;
    const cleanRoomScore = typeScore + sealScore + sensitiveScore + areaEfficiencyScore;

    return {
      ...room,
      sizing,
      cleanRoomScore,
    };
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
