/**
 * @fileoverview Wizard Step 4 — Commute, electricity usage, diet, waste, and outdoor activity timing.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { BOUNDS, CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

const COMMUTE_OPTIONS = [
  { value: 'two_wheeler', label: 'Petrol Two-Wheeler', icon: '🛵' },
  { value: 'car_petrol', label: 'Petrol Car', icon: '🚗' },
  { value: 'car_diesel', label: 'Diesel Car', icon: '🚙' },
  { value: 'bus', label: 'Public Bus', icon: '🚌' },
  { value: 'metro', label: 'Metro / Local Train', icon: '🚇' },
  { value: 'ev_two_wheeler', label: 'EV Two-Wheeler', icon: '🔋' },
  { value: 'bicycle', label: 'Bicycle', icon: '🚲' },
  { value: 'walk', label: 'Walking', icon: '🚶' },
  { value: 'wfh', label: 'Work From Home', icon: '💻' },
];

const DIET_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { value: 'eggetarian', label: 'Eggetarian', icon: '🥚' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
];

const WASTE_OPTIONS = [
  { value: 'no_segregation', label: 'Mixed waste (no segregation)', icon: '🗑️' },
  { value: 'basic_segregation', label: 'Dry/wet segregation', icon: '♻️' },
  { value: 'composting', label: 'Segregation + home composting', icon: '🪴' },
];

const TIMING_OPTIONS = [
  { value: 'morning', label: 'Early Morning', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { value: 'evening', label: 'Evening', icon: '🌆' },
  { value: 'indoor', label: 'Mostly Indoors', icon: '🏠' },
];

function CommuteDistanceFields({ routine, errors, update }) {
  return (
    <div className="two-col-fields">
      <NumericUnknownField
        id="commute-km-input"
        label="One-way commute distance (km)"
        value={routine.commuteKm}
        defaultVal={CONSERVATIVE_UNKNOWNS.commuteKm}
        min={0}
        max={BOUNDS.MAX_COMMUTE_KM}
        unitHint="km"
        error={errors.commuteKm}
        onChange={(val) => update({ commuteKm: val })}
      />
      <NumericUnknownField
        id="commute-days-input"
        label="Commute days per week (0–7)"
        value={routine.commuteDays}
        defaultVal={CONSERVATIVE_UNKNOWNS.commuteDays}
        min={0}
        max={BOUNDS.MAX_COMMUTE_DAYS}
        unitHint="days"
        error={errors.commuteDays}
        onChange={(val) => update({ commuteDays: val })}
      />
    </div>
  );
}

function CommuteSection({ routine, errors, showDistance, update }) {
  return (
    <>
      <ChoiceGroup
        id="commuteMode"
        label="Primary commute mode"
        options={COMMUTE_OPTIONS}
        value={routine.commuteMode}
        otherValue={routine.commuteModeOther}
        onChange={(val) => update({ commuteMode: val })}
        onOtherChange={(txt) =>
          update({ commuteModeOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
        }
        conservativeHint="Assumes petrol two-wheeler."
        error={errors.commuteMode}
      />
      {showDistance && <CommuteDistanceFields routine={routine} errors={errors} update={update} />}
    </>
  );
}

function EnergyAndDietSection({ routine, errors, update }) {
  return (
    <>
      <NumericUnknownField
        id="monthly-kwh-input"
        label="Monthly electricity consumption (units / kWh)"
        value={routine.monthlyKwh}
        defaultVal={CONSERVATIVE_UNKNOWNS.monthlyKwh}
        min={0}
        max={BOUNDS.MAX_MONTHLY_KWH}
        unitHint="kWh"
        error={errors.monthlyKwh}
        onChange={(val) => update({ monthlyKwh: val })}
      />
      <ChoiceGroup
        id="diet"
        label="Household diet pattern"
        options={DIET_OPTIONS}
        value={routine.diet}
        otherValue={routine.dietOther}
        onChange={(val) => update({ diet: val })}
        onOtherChange={(txt) =>
          update({ dietOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
        }
        conservativeHint="Assumes vegetarian baseline."
        error={errors.diet}
      />
    </>
  );
}

function WasteAndTimingSection({ routine, errors, update }) {
  const cleanOther = (txt) => sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN);
  return (
    <>
      <ChoiceGroup
        id="wasteHabits"
        label="Household waste habits"
        options={WASTE_OPTIONS}
        value={routine.wasteHabits}
        otherValue={routine.wasteHabitsOther}
        onChange={(val) => update({ wasteHabits: val })}
        onOtherChange={(txt) => update({ wasteHabitsOther: cleanOther(txt) })}
        conservativeHint="Assumes no segregation (conservative landfill factor)."
        error={errors.wasteHabits}
      />
      <ChoiceGroup
        id="outdoorExerciseTiming"
        label="Usual outdoor exercise / walk timing"
        options={TIMING_OPTIONS}
        value={routine.outdoorExerciseTiming}
        otherValue={routine.outdoorExerciseTimingOther}
        onChange={(val) => update({ outdoorExerciseTiming: val })}
        onOtherChange={(txt) => update({ outdoorExerciseTimingOther: cleanOther(txt) })}
        conservativeHint="Aligns outdoor walks to the cleanest forecast window."
        error={errors.outdoorExerciseTiming}
      />
    </>
  );
}

/**
 * Render Step 4 (Daily Routine, Energy & Commute) wizard controls.
 * @param {Object} props - Routine state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 4 fields.
 */
export default function StepRoutine({ routine, errors, dispatch, headingRef }) {
  const showDistance = !['wfh', 'walk', 'bicycle'].includes(routine.commuteMode);
  const update = (payload) => dispatch({ type: 'UPDATE_ROUTINE', payload });

  return (
    <div className="wizard-step-body">
      <h2 ref={headingRef} tabIndex={-1}>
        4. Daily Routine, Energy & Commute
      </h2>
      <CommuteSection
        routine={routine}
        errors={errors}
        showDistance={showDistance}
        update={update}
      />
      <EnergyAndDietSection routine={routine} errors={errors} update={update} />
      <WasteAndTimingSection routine={routine} errors={errors} update={update} />
    </div>
  );
}
