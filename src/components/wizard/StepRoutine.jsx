/**
 * @fileoverview Wizard Step 4 — Commute, electricity usage, diet, waste, and outdoor activity timing.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

/**
 * Render Step 4 (Daily Routine, Energy & Commute) wizard controls.
 * @param {Object} props - Routine state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 4 fields.
 */
export default function StepRoutine({ routine, errors, dispatch, headingRef }) {
  const showDistance = !['wfh', 'walk', 'bicycle'].includes(routine.commuteMode);

  return (
    <div className="wizard-step-body">
      <h2 ref={headingRef} tabIndex={-1}>
        4. Daily Routine, Energy & Commute
      </h2>

      <ChoiceGroup
        id="commuteMode"
        label="Primary commute mode"
        options={[
          { value: 'two_wheeler', label: 'Petrol Two-Wheeler', icon: '🛵' },
          { value: 'car_petrol', label: 'Petrol Car', icon: '🚗' },
          { value: 'car_diesel', label: 'Diesel Car', icon: '🚙' },
          { value: 'bus', label: 'Public Bus', icon: '🚌' },
          { value: 'metro', label: 'Metro / Local Train', icon: '🚇' },
          { value: 'ev_two_wheeler', label: 'EV Two-Wheeler', icon: '🔋' },
          { value: 'bicycle', label: 'Bicycle', icon: '🚲' },
          { value: 'walk', label: 'Walking', icon: '🚶' },
          { value: 'wfh', label: 'Work From Home', icon: '💻' },
        ]}
        value={routine.commuteMode}
        otherValue={routine.commuteModeOther}
        onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { commuteMode: val } })}
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_ROUTINE',
            payload: { commuteModeOther: sanitizeInput(txt, 80) },
          })
        }
        conservativeHint="Assumes petrol two-wheeler."
        error={errors.commuteMode}
      />

      {showDistance && (
        <div className="two-col-fields">
          <NumericUnknownField
            id="commute-km-input"
            label="One-way commute distance (km)"
            value={routine.commuteKm}
            defaultVal={CONSERVATIVE_UNKNOWNS.commuteKm}
            min={0}
            max={250}
            unitHint="km"
            error={errors.commuteKm}
            onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { commuteKm: val } })}
          />
          <NumericUnknownField
            id="commute-days-input"
            label="Commute days per week (0–7)"
            value={routine.commuteDays}
            defaultVal={CONSERVATIVE_UNKNOWNS.commuteDays}
            min={0}
            max={7}
            unitHint="days"
            error={errors.commuteDays}
            onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { commuteDays: val } })}
          />
        </div>
      )}

      <NumericUnknownField
        id="monthly-kwh-input"
        label="Monthly electricity consumption (units / kWh)"
        value={routine.monthlyKwh}
        defaultVal={CONSERVATIVE_UNKNOWNS.monthlyKwh}
        min={0}
        max={5000}
        unitHint="kWh"
        error={errors.monthlyKwh}
        onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { monthlyKwh: val } })}
      />

      <ChoiceGroup
        id="diet"
        label="Household diet pattern"
        options={[
          { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
          { value: 'eggetarian', label: 'Eggetarian', icon: '🥚' },
          { value: 'non_vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
          { value: 'vegan', label: 'Vegan', icon: '🌱' },
        ]}
        value={routine.diet}
        otherValue={routine.dietOther}
        onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { diet: val } })}
        onOtherChange={(txt) =>
          dispatch({ type: 'UPDATE_ROUTINE', payload: { dietOther: sanitizeInput(txt, 80) } })
        }
        conservativeHint="Assumes vegetarian baseline."
        error={errors.diet}
      />

      <ChoiceGroup
        id="wasteHabits"
        label="Household waste habits"
        options={[
          { value: 'no_segregation', label: 'Mixed waste (no segregation)', icon: '🗑️' },
          { value: 'basic_segregation', label: 'Dry/wet segregation', icon: '♻️' },
          { value: 'composting', label: 'Segregation + home composting', icon: '🪴' },
        ]}
        value={routine.wasteHabits}
        otherValue={routine.wasteHabitsOther}
        onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { wasteHabits: val } })}
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_ROUTINE',
            payload: { wasteHabitsOther: sanitizeInput(txt, 80) },
          })
        }
        conservativeHint="Assumes no segregation (conservative landfill factor)."
        error={errors.wasteHabits}
      />

      <ChoiceGroup
        id="outdoorExerciseTiming"
        label="Usual outdoor exercise / walk timing"
        options={[
          { value: 'morning', label: 'Early Morning', icon: '🌅' },
          { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
          { value: 'evening', label: 'Evening', icon: '🌆' },
          { value: 'indoor', label: 'Mostly Indoors', icon: '🏠' },
        ]}
        value={routine.outdoorExerciseTiming}
        otherValue={routine.outdoorExerciseTimingOther}
        onChange={(val) =>
          dispatch({ type: 'UPDATE_ROUTINE', payload: { outdoorExerciseTiming: val } })
        }
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_ROUTINE',
            payload: { outdoorExerciseTimingOther: sanitizeInput(txt, 80) },
          })
        }
        conservativeHint="Aligns outdoor walks to the cleanest forecast window."
        error={errors.outdoorExerciseTiming}
      />
    </div>
  );
}
