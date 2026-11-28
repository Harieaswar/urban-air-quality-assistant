/**
 * Pure Local Calculator & Utility Unit Tests — SmogGuard
 */
import { describe, it, expect } from 'vitest';
import {
  pm25ToAqi,
  aqiToApproxPm25,
  evaluateAqi,
  calibrateHourlyPm25,
  resolveEffectiveAirSeries,
} from '@/calculators/aqi';
import { getHealthAdvisory } from '@/calculators/advisory';
import { calculateAirWindow } from '@/calculators/airWindow';
import { calculatePurifierSizing, buildRoomByRoomPlan } from '@/calculators/purifier';
import { calculateExposure } from '@/calculators/exposure';
import { calculateFootprint } from '@/calculators/footprint';
import {
  calculateActionImpact,
  calculateCumulativeImpact,
  computePayback,
  rankSustainableAlternatives,
} from '@/calculators/impact';
import { buildPrioritizedMeasures, buildHourlyRoutine } from '@/calculators/routine';
import { sanitizeInput, sanitizeForDisplay } from '@/utils/sanitize';
import { formatCO2, formatINR, formatRange, formatHour, formatTimestamp } from '@/utils/format';
import {
  validatePositiveNumber,
  validateRange,
  validateCoordinates,
  validateChoiceWithOther,
} from '@/utils/validate';
import { getAqiCategory } from '@/constants';
import factorsData from '@/data/factors.json';
import actionsData from '@/data/actions.json';

describe('AQI & WHO Guideline Calculator', () => {
  it('converts PM2.5 across all India NAQI and US AQI breakpoints including max clamp', () => {
    expect(pm25ToAqi(15, 'india_naqi')).toBe(25);
    expect(pm25ToAqi(30, 'india_naqi')).toBe(50);
    expect(pm25ToAqi(60, 'india_naqi')).toBe(100);
    expect(pm25ToAqi(90, 'india_naqi')).toBe(200);
    expect(pm25ToAqi(250, 'india_naqi')).toBe(400);
    expect(pm25ToAqi(600, 'india_naqi')).toBe(500);
    expect(pm25ToAqi(35.4, 'us_aqi')).toBe(100);
    expect(pm25ToAqi(600, 'us_aqi')).toBe(500);
    expect(getAqiCategory(999, 'india_naqi').label).toBe('Severe');
  });

  it('inverts AQI to PM2.5, evaluates WHO ratio, and calibrates series cleanly', () => {
    expect(aqiToApproxPm25(50, 'india_naqi')).toBe(30);
    expect(aqiToApproxPm25(300, 'india_naqi')).toBeGreaterThanOrEqual(115);
    expect(aqiToApproxPm25(500, 'us_aqi')).toBeGreaterThanOrEqual(350);

    const ev = evaluateAqi(150, 'india_naqi');
    expect(ev.whoGuideline24h).toBe(15);
    expect(ev.whoRatio).toBe(10);

    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 100 }));
    expect(calibrateHourlyPm25([], 100)).toEqual([]);
    expect(calibrateHourlyPm25(hourly, 'bad')).toEqual(hourly);
    expect(calibrateHourlyPm25(hourly, 200, 12)[12].pm25).toBe(200);

    const resolved = resolveEffectiveAirSeries(
      { hourlyData: hourly, currentPm25: 90 },
      { enabled: true, mode: 'aqi', value: 200 },
      'india_naqi',
      12
    );
    expect(resolved.effectiveHourly).toHaveLength(24);
    expect(resolved.effectivePm25).toBeGreaterThan(50);
  });
});

describe('MoHFW/NCDC Health Advisory Calculator', () => {
  it('tailors advisories for all family profiles and falls back safely', () => {
    const res = getHealthAdvisory(
      260,
      ['children', 'older_adults', 'breathing_heart', 'pregnancy'],
      'india_naqi'
    );
    expect(res.categoryLabel).toBe('Severe');
    expect(res.tailoredNotes).toHaveLength(4);
    expect(res.disclaimer.toLowerCase()).toContain('not medical advice');

    const emptyRes = getHealthAdvisory(8, [], 'us_aqi');
    expect(emptyRes.tailoredNotes).toHaveLength(0);
    expect(emptyRes.categoryLabel).toBe('Good');
  });
});

describe('Air Window & Purifier Calculators', () => {
  it('handles empty hourly data and finds best/avoid 3h windows', () => {
    const emptyWin = calculateAirWindow([]);
    expect(emptyWin.bestWindowStart).toBe(5);
    expect(emptyWin.hourlyData).toEqual([]);

    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      pm25: hour >= 13 && hour <= 15 ? 40 : hour >= 19 && hour <= 21 ? 320 : 120,
    }));
    const win = calculateAirWindow(hourly);
    expect(win.bestWindowStart).toBe(13);
    expect(win.avoidWindowStart).toBe(19);
    expect(win.worstPm25).toBe(320);
  });

  it('sizes purifier for unknown/numeric rooms and picks clean room across default & multi-room', () => {
    const unknownSizing = calculatePurifierSizing('unknown', 'unknown', 5);
    expect(unknownSizing.recommendedCADR).toBeGreaterThan(100);

    const defaultPlan = buildRoomByRoomPlan([], ['children']);
    expect(defaultPlan).toHaveLength(1);
    expect(defaultPlan[0].isCleanRoom).toBe(true);

    const multi = buildRoomByRoomPlan([
      {
        id: 'r1',
        name: 'Hall',
        type: 'living_room',
        areaSqM: 32,
        ceilingHeightM: 3,
        ventilation: 'good',
        hasSensitiveOccupant: false,
      },
      {
        id: 'r2',
        name: 'Study',
        type: 'study',
        areaSqM: 12,
        ceilingHeightM: 2.8,
        ventilation: 'poor',
        hasSensitiveOccupant: false,
      },
      {
        id: 'r3',
        name: 'Nursery',
        type: 'kids_room',
        areaSqM: 14,
        ceilingHeightM: 2.8,
        ventilation: 'moderate',
        hasSensitiveOccupant: true,
      },
    ]);
    expect(multi.find((r) => r.isCleanRoom).id).toBe('r3');
  });
});

describe('Exposure, Footprint, Impact & Routine Calculators', () => {
  it('evaluates exposure across all indoor smoke sources, exhaust, and poor-vent apartments', () => {
    const res = calculateExposure(
      {
        homeType: 'apartment',
        cookingFuel: 'biomass',
        hasChimney: 'none',
        indoorSmokeSources: ['mosquito_coil', 'tobacco', 'incense'],
        ventilation: 'poor',
        sensitiveGroups: ['children'],
      },
      { outdoorPm25: 180 }
    );
    expect(res.level).toBe('High');
    expect(res.contributingFactors.some((f) => f.id === 'low_dilution')).toBe(true);

    const clean = calculateExposure(
      {
        cookingFuel: 'induction',
        hasChimney: 'chimney',
        ventilation: 'good',
        indoorSmokeSources: [],
      },
      { outdoorPm25: 15 }
    );
    expect(clean.level).toBe('Low');
  });

  it('computes carbon footprint for every commute, cooking fuel, diet, and waste variant', () => {
    const pngCar = calculateFootprint(
      {
        commuteMode: 'car_diesel',
        commuteKm: 10,
        commuteDays: 5,
        monthlyKwh: 150,
        cookingFuel: 'png',
        diet: 'non_vegetarian',
        wasteHabits: 'basic_segregation',
        householdSize: 2,
      },
      factorsData
    );
    expect(pngCar.cooking.central).toBeGreaterThan(0);
    expect(pngCar.transport.central).toBeGreaterThan(0);

    const biomassWfh = calculateFootprint(
      {
        commuteMode: 'wfh',
        monthlyKwh: 100,
        cookingFuel: 'biomass',
        diet: 'vegan',
        wasteHabits: 'composting',
        householdSize: 1,
      },
      factorsData
    );
    expect(biomassWfh.transport.central).toBe(0);
    expect(biomassWfh.cooking.central).toBeGreaterThan(1500);

    const inductionFootprint = calculateFootprint(
      { cookingFuel: 'induction', commuteMode: 'walk' },
      factorsData
    );
    expect(inductionFootprint.cooking.central).toBe(0);
    expect(calculateFootprint({}, []).total.central).toBe(0);
  });

  it('exercises all action impact formulas, payback variants, overlap guard, and ranking modes', () => {
    expect(computePayback(0, 1000).years).toBe(0);
    expect(computePayback(5000, 0).years).toBeNull();
    expect(computePayback(3000, 6000).label).toContain('month');
    expect(computePayback(6000, 2000).label).toContain('year');

    const profile = {
      commuteMode: 'car_petrol',
      commuteKm: 12,
      commuteDays: 5,
      monthlyKwh: 300,
      cookingFuel: 'lpg',
      diet: 'non_vegetarian',
      wasteHabits: 'no_segregation',
      householdSize: 3,
      rentalLimits: false,
    };
    for (const action of actionsData) {
      const imp = calculateActionImpact(action, profile, factorsData);
      expect(imp.co2SavedKg.low).toBeGreaterThanOrEqual(0);
    }

    const cum = calculateCumulativeImpact(actionsData, profile, factorsData);
    expect(cum.overlaps.length).toBeGreaterThan(0);
    expect(cum.totalCO2Saved.central).toBeGreaterThan(0);

    expect(
      rankSustainableAlternatives(actionsData, profile, factorsData, 'payback').length
    ).toBeGreaterThan(0);
    expect(
      rankSustainableAlternatives(actionsData, profile, factorsData, 'effort').length
    ).toBeGreaterThan(0);
    expect(
      rankSustainableAlternatives(actionsData, profile, factorsData, 'exposure').length
    ).toBeGreaterThan(0);
    expect(
      rankSustainableAlternatives(actionsData, profile, factorsData, 'emissions').length
    ).toBeGreaterThan(0);
  });

  it('filters actions cleanly and builds 7-slot routine for clean vs severe days', () => {
    const tiers = buildPrioritizedMeasures(actionsData, {
      rentalLimits: false,
      cooling: 'fan',
      commuteMode: 'wfh',
      hasChimney: 'none',
      commuteKm: 15,
    });
    expect(tiers).toHaveLength(4);
    expect(
      buildHourlyRoutine(
        { cooling: 'fan', cookingFuel: 'induction', hasChimney: 'none', sensitiveGroups: ['none'] },
        {
          bestWindowStart: 14,
          bestWindowEnd: 17,
          avoidWindowStart: 20,
          avoidWindowEnd: 23,
          bestPm25: 40,
          avoidPm25: 80,
          averagePm25: 55,
        }
      )
    ).toHaveLength(7);
  });

  it('covers sanitize, format, and validate utilities', () => {
    expect(sanitizeInput('<b>Hi</b> &amp; bye')).toBe('Hi  bye');
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeForDisplay('<script>"\'&')).toBe('&lt;script&gt;&quot;&#39;&amp;');
    expect(sanitizeForDisplay(123)).toBe('');

    expect(formatCO2(1500)).toBe('1.5 tonnes CO₂e');
    expect(formatCO2(null)).toBe('0 kg CO₂e');
    expect(formatINR(125000)).toBe('₹1,25,000');
    expect(formatINR(-500)).toBe('-₹500');
    expect(formatRange(10, 10, 10)).toBe('10');
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(15)).toBe('3 PM');
    expect(formatTimestamp(null)).toBe('Unknown time');
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');

    expect(validatePositiveNumber(-1, 'kWh').valid).toBe(false);
    expect(validatePositiveNumber(9999, 'kWh', 5000).valid).toBe(false);
    expect(validatePositiveNumber('', 'kWh').valid).toBe(false);
    expect(validateCoordinates(95, 77).valid).toBe(false);
    expect(validateCoordinates(28.6, 200).valid).toBe(false);
    expect(validateCoordinates(28.6, 77.2).valid).toBe(true);
    expect(validateChoiceWithOther('unknown', '', 'Test').valid).toBe(true);
    expect(validateChoiceWithOther('', '', 'Test').valid).toBe(false);
    expect(validateChoiceWithOther('other', '  ', 'Test').valid).toBe(false);
  });
});
