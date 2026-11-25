/**
 * Pure Local Calculator Unit Tests — SmogGuard
 */
import { describe, it, expect } from 'vitest';
import { pm25ToAqi, aqiToApproxPm25, evaluateAqi, calibrateHourlyPm25 } from '@/calculators/aqi';
import { getHealthAdvisory } from '@/calculators/advisory';
import { calculateAirWindow } from '@/calculators/airWindow';
import { calculatePurifierSizing, buildRoomByRoomPlan } from '@/calculators/purifier';
import { calculateExposure } from '@/calculators/exposure';
import { calculateFootprint } from '@/calculators/footprint';
import { calculateActionImpact, calculateCumulativeImpact, computePayback, rankSustainableAlternatives } from '@/calculators/impact';
import { buildPrioritizedMeasures, buildHourlyRoutine } from '@/calculators/routine';
import factorsData from '@/data/factors.json';
import actionsData from '@/data/actions.json';

describe('AQI & WHO Guideline Calculator', () => {
  it('converts PM2.5 to India NAQI and US AQI', () => {
    expect(pm25ToAqi(30, 'india_naqi')).toBe(50);
    expect(pm25ToAqi(60, 'india_naqi')).toBe(100);
    expect(pm25ToAqi(250, 'india_naqi')).toBe(400);
    expect(pm25ToAqi(35.4, 'us_aqi')).toBe(100);
  });

  it('computes WHO 2021 24-hour guideline ratio (15 ug/m3)', () => {
    const res = evaluateAqi(150, 'india_naqi');
    expect(res.whoGuideline24h).toBe(15);
    expect(res.whoRatio).toBe(10);
    expect(res.category.label).toBe('Very Poor');
  });

  it('inverts AQI to approximate PM2.5 and calibrates hourly series', () => {
    const approx = aqiToApproxPm25(300, 'india_naqi');
    expect(approx).toBeGreaterThanOrEqual(115);
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 100 }));
    const calibrated = calibrateHourlyPm25(hourly, 200, 12);
    expect(calibrated[12].pm25).toBe(200);
    expect(calibrated[0].pm25).toBe(200);
  });
});

describe('MoHFW/NCDC Health Advisory Calculator', () => {
  it('tailors advisories for every family member profile with disclaimer', () => {
    const res = getHealthAdvisory(260, ['children', 'older_adults', 'breathing_heart', 'pregnancy'], 'india_naqi');
    expect(res.categoryLabel).toBe('Severe');
    expect(res.tailoredNotes).toHaveLength(4);
    expect(res.disclaimer.toLowerCase()).toContain('not medical advice');
  });
});

describe('Air Window Calculator', () => {
  it('finds best 3h window and avoid 3h peak window', () => {
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      pm25: hour >= 13 && hour <= 15 ? 40 : hour >= 19 && hour <= 21 ? 320 : 120,
    }));
    const win = calculateAirWindow(hourly);
    expect(win.bestWindowStart).toBe(13);
    expect(win.bestWindowEnd).toBe(16);
    expect(win.avoidWindowStart).toBe(19);
    expect(win.avoidWindowEnd).toBe(22);
    expect(win.worstPm25).toBe(320);
  });
});

describe('Purifier & Clean Room Calculator', () => {
  it('calculates CADR range, ACH, and monthly running cost', () => {
    const res = calculatePurifierSizing(20, 3, 5);
    expect(res.roomVolume).toBe(60);
    expect(res.recommendedCADR).toBe(300);
    expect(res.cadrRange.min).toBe(255);
    expect(res.cadrRange.max).toBe(360);
    expect(res.runningCostPerMonth).toBeGreaterThan(0);
  });

  it('selects optimal clean room favoring bedrooms with sensitive occupants', () => {
    const plan = buildRoomByRoomPlan(
      [
        { id: 'r1', name: 'Living Hall', type: 'living_room', areaSqM: 32, ceilingHeightM: 3, ventilation: 'moderate', hasSensitiveOccupant: false },
        { id: 'r2', name: 'Kids Bedroom', type: 'kids_room', areaSqM: 14, ceilingHeightM: 2.8, ventilation: 'moderate', hasSensitiveOccupant: true },
      ],
      ['children']
    );
    const clean = plan.find((r) => r.isCleanRoom);
    expect(clean.id).toBe('r2');
  });
});

describe('Exposure, Footprint, Impact & Routine Calculators', () => {
  it('ranks indoor & outdoor sources and supports unknown defaults', () => {
    const res = calculateExposure(
      { cookingFuel: 'unknown', hasChimney: 'unknown', indoorSmokeSources: ['mosquito_coil'], ventilation: 'poor' },
      { outdoorPm25: 180 }
    );
    expect(res.contributingFactors.length).toBeGreaterThan(1);
    expect(res.contributingFactors[0].scoreContribution).toBeGreaterThanOrEqual(
      res.contributingFactors[1].scoreContribution
    );
    expect(res.disclaimer.toLowerCase()).toContain('not a medical');
  });

  it('computes carbon footprint safely with unknown inputs', () => {
    const fp = calculateFootprint(
      { commuteMode: 'unknown', commuteKm: 'unknown', monthlyKwh: 'unknown', diet: 'unknown', wasteHabits: 'unknown', householdSize: 'unknown' },
      factorsData
    );
    expect(fp.total.central).toBeGreaterThan(0);
    expect(fp.total.low).toBeLessThanOrEqual(fp.total.central);
    expect(fp.total.central).toBeLessThanOrEqual(fp.total.high);
  });

  it('computes payback, cumulative overlap guard, and alternatives ranking', () => {
    expect(computePayback(0, 1000).years).toBe(0);
    expect(computePayback(3000, 1500).years).toBe(2);

    const metro = actionsData.find((a) => a.id === 'switch_to_metro');
    const impact = calculateActionImpact(metro, { commuteMode: 'car_petrol', commuteKm: 15, commuteDays: 5 }, factorsData);
    expect(impact.co2SavedKg.central).toBeGreaterThan(0);
    expect(impact.sources.length).toBeGreaterThan(0);

    const cum = calculateCumulativeImpact(actionsData.slice(0, 4), { commuteMode: 'car_petrol', commuteKm: 15, commuteDays: 5 }, factorsData);
    expect(cum.overlaps.length).toBeGreaterThan(0);

    const byPayback = rankSustainableAlternatives(actionsData, { rentalLimits: false }, factorsData, 'payback');
    expect(byPayback.length).toBeGreaterThan(0);
  });

  it('builds 4 preventive tiers and 7-slot hourly routine', () => {
    const tiers = buildPrioritizedMeasures(actionsData, { rentalLimits: true, cooling: 'ac', hasChimney: 'chimney' });
    expect(tiers.map((t) => t.label)).toEqual([
      'Do now (free)',
      'Today',
      'This week (low cost)',
      'Later (investment)',
    ]);
    const routine = buildHourlyRoutine({ cookingFuel: 'lpg', hasChimney: 'chimney' }, { bestWindowStart: 13, bestWindowEnd: 16, avoidWindowStart: 19, avoidWindowEnd: 22, bestPm25: 55, avoidPm25: 290, averagePm25: 140 });
    expect(routine).toHaveLength(7);
  });
});
