/**
 * @fileoverview Pure room-wise air purifier CADR sizing and clean-room selection calculator.
 */

import {
  BOUNDS,
  DEFAULTS,
  CONSERVATIVE_UNKNOWNS,
  GRID_FACTOR_KG_PER_KWH,
} from '../constants/index.js';
import { roundToTenths } from '../utils/resolve.js';

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

const VENTILATION_SCORE_MAP = {
  poor: CLEAN_ROOM_WEIGHTS.poorVent,
  moderate: CLEAN_ROOM_WEIGHTS.moderateVent,
  good: CLEAN_ROOM_WEIGHTS.goodVent,
};

function resolvePositiveDimension(value, fallback) {
  if (value === 'unknown' || value === null || value === undefined || Number(value) <= 0) {
    return fallback;
  }
  return Number(value);
}

function buildPurifierAssumptions(areaSqM, ceilingHeightM, roomVolume, targetACH) {
  return [
    `Room volume: ${areaSqM} m² × ${ceilingHeightM} m = ${roomVolume} m³`,
    `Target: ${targetACH} air changes/hour (ASHRAE/clinical HEPA PM2.5 clean-room guidance)`,
    `Power draw: ${DEFAULTS.purifierWatts}W for ${DEFAULTS.purifierHoursPerDay} hrs/day at ₹${DEFAULTS.electricityRatePerKwh}/kWh`,
    `Grid factor: ${GRID_FACTOR_KG_PER_KWH} kgCO₂e/kWh (CEA India v18, 2023)`,
  ];
}

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
  const safeArea = roundToTenths(
    resolvePositiveDimension(roomSizeSqM, CONSERVATIVE_UNKNOWNS.roomAreaSqM)
  );
  const safeHeight = roundToTenths(
    resolvePositiveDimension(ceilingHeightM, DEFAULTS.ceilingHeightM)
  );
  const roomVolume = roundToTenths(safeArea * safeHeight);
  const recommendedCADR = Math.round(roomVolume * targetACH);
  const dailyKwh = (DEFAULTS.purifierWatts / BOUNDS.WATTS_PER_KW) * DEFAULTS.purifierHoursPerDay;

  return {
    areaSqM: safeArea,
    ceilingHeightM: safeHeight,
    roomVolume,
    recommendedCADR,
    cadrRange: {
      min: Math.round(recommendedCADR * DEFAULTS.cadrRangeLowRatio),
      max: Math.round(recommendedCADR * DEFAULTS.cadrRangeHighRatio),
    },
    achievedACH: targetACH,
    runningCostPerMonth: Math.round(
      dailyKwh * DEFAULTS.daysPerMonth * DEFAULTS.electricityRatePerKwh
    ),
    annualEmissions: Math.round(dailyKwh * DEFAULTS.daysPerYear * GRID_FACTOR_KG_PER_KWH),
    assumptions: buildPurifierAssumptions(safeArea, safeHeight, roomVolume, targetACH),
  };
}

function scoreRoomForCleanRoom(room, sizing) {
  const typeScore = CLEAN_ROOM_WEIGHTS[room.type] ?? CLEAN_ROOM_WEIGHTS.defaultType;
  const sealScore = VENTILATION_SCORE_MAP[room.ventilation] ?? CLEAN_ROOM_WEIGHTS.goodVent;
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
