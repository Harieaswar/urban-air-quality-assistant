import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import GlassCard from '@/components/ui/GlassCard';
import LocationSearch from '@/components/air/LocationSearch';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import {
  validateChoiceWithOther,
  validateRange,
  validatePositiveNumber,
} from '@/utils/validate';
import { sanitizeInput } from '@/utils/sanitize';
import { CONSERVATIVE_UNKNOWNS } from '@/data/constants';

const STEPS = [
  { id: 1, label: '1. Location' },
  { id: 2, label: '2. Family' },
  { id: 3, label: '3. Rooms' },
  { id: 4, label: '4. Routine' },
];

/**
 * Guided 4-Step Wizard — SmogGuard
 * 1. Location -> 2. Family -> 3. Rooms -> 4. Routine
 * - Every choice group includes "Other" (with validated input) and "Not sure" ('unknown').
 * - Single source of truth in AppContext; no question appears twice.
 * - Plain-language validation prevents getting stuck.
 * - Back, Edit step tabs, and Restart with confirmation preserve or cleanly reset answers.
 */
export default function WizardPage() {
  const navigate = useNavigate();
  const { state, dispatch, loadLocationAir } = useAppStore();
  const step = state.wizardStep || 1;
  const [errors, setErrors] = useState({});
  const [confirmRestart, setConfirmRestart] = useState(false);

  const validateCurrentStep = () => {
    const errs = {};

    if (step === 1) {
      if (!state.location.name || state.location.lat == null || state.location.lon == null) {
        errs.location = 'Please select a place from the search box or enter coordinates manually.';
      }
      const ht = validateChoiceWithOther(state.location.homeType, state.location.homeTypeOther, 'Home type');
      if (!ht.valid) errs.homeType = ht.error;
      const cl = validateChoiceWithOther(state.location.cooling, state.location.coolingOther, 'Cooling / heating');
      if (!cl.valid) errs.cooling = cl.error;
      const rl = validateChoiceWithOther(
        state.location.rentalLimits === true ? 'rent' : state.location.rentalLimits === false ? 'own' : state.location.rentalLimits,
        state.location.rentalLimitsOther,
        'Rental status'
      );
      if (!rl.valid) errs.rentalLimits = rl.error;
    }

    if (step === 2) {
      if (state.family.householdSize !== 'unknown') {
        const hs = validateRange(state.family.householdSize, 1, 25, 'Household size');
        if (!hs.valid) errs.householdSize = hs.error;
      }
      const sg = validateChoiceWithOther(
        state.family.sensitiveGroups,
        state.family.sensitiveGroupsOther,
        'Family members needing extra protection'
      );
      if (!sg.valid) errs.sensitiveGroups = sg.error;
      const gl = validateChoiceWithOther(state.family.goals, state.family.goalsOther, 'Household goals');
      if (!gl.valid) errs.goals = gl.error;
      const bg = validateChoiceWithOther(state.family.budget, state.family.budgetOther, 'Budget');
      if (!bg.valid) errs.budget = bg.error;
      const ef = validateChoiceWithOther(state.family.effort, state.family.effortOther, 'Effort level');
      if (!ef.valid) errs.effort = ef.error;
    }

    if (step === 3) {
      state.rooms.list.forEach((room, idx) => {
        if (!room.name || !room.name.trim()) {
          errs[`room_name_${room.id}`] = `Please name Room ${idx + 1}.`;
        }
        if (room.areaSqM !== 'unknown') {
          const areaVal = validateRange(room.areaSqM, 3, 250, `${room.name || `Room ${idx + 1}`} area (m²)`);
          if (!areaVal.valid) errs[`room_area_${room.id}`] = areaVal.error;
        }
        if (room.ceilingHeightM !== 'unknown') {
          const htVal = validateRange(room.ceilingHeightM, 2, 6, `${room.name || `Room ${idx + 1}`} ceiling height (m)`);
          if (!htVal.valid) errs[`room_height_${room.id}`] = htVal.error;
        }
        const vent = validateChoiceWithOther(room.ventilation, room.ventilationOther, `${room.name || `Room ${idx + 1}`} ventilation`);
        if (!vent.valid) errs[`room_vent_${room.id}`] = vent.error;
      });
      const cf = validateChoiceWithOther(state.rooms.cookingFuel, state.rooms.cookingFuelOther, 'Cooking fuel');
      if (!cf.valid) errs.cookingFuel = cf.error;
      const ch = validateChoiceWithOther(state.rooms.hasChimney, state.rooms.hasChimneyOther, 'Kitchen exhaust');
      if (!ch.valid) errs.hasChimney = ch.error;
      const sm = validateChoiceWithOther(
        state.rooms.indoorSmokeSources,
        state.rooms.indoorSmokeSourcesOther,
        'Indoor smoke sources'
      );
      if (!sm.valid) errs.indoorSmokeSources = sm.error;
    }

    if (step === 4) {
      const cm = validateChoiceWithOther(state.routine.commuteMode, state.routine.commuteModeOther, 'Commute mode');
      if (!cm.valid) errs.commuteMode = cm.error;
      if (!['wfh', 'walk', 'bicycle'].includes(state.routine.commuteMode)) {
        if (state.routine.commuteKm !== 'unknown') {
          const km = validatePositiveNumber(state.routine.commuteKm, 'One-way commute distance (km)', 250);
          if (!km.valid) errs.commuteKm = km.error;
        }
        if (state.routine.commuteDays !== 'unknown') {
          const days = validateRange(state.routine.commuteDays, 0, 7, 'Commute days per week');
          if (!days.valid) errs.commuteDays = days.error;
        }
      }
      if (state.routine.monthlyKwh !== 'unknown') {
        const kwh = validatePositiveNumber(state.routine.monthlyKwh, 'Monthly electricity (kWh)', 5000);
        if (!kwh.valid) errs.monthlyKwh = kwh.error;
      }
      const dt = validateChoiceWithOther(state.routine.diet, state.routine.dietOther, 'Diet pattern');
      if (!dt.valid) errs.diet = dt.error;
      const ws = validateChoiceWithOther(state.routine.wasteHabits, state.routine.wasteHabitsOther, 'Waste habits');
      if (!ws.valid) errs.wasteHabits = ws.error;
      const ex = validateChoiceWithOther(
        state.routine.outdoorExerciseTiming,
        state.routine.outdoorExerciseTimingOther,
        'Outdoor activity timing'
      );
      if (!ex.valid) errs.outdoorExerciseTiming = ex.error;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < 4) {
      dispatch({ type: 'SET_STEP', step: step + 1 });
      setErrors({});
    } else {
      dispatch({ type: 'COMPLETE_WIZARD' });
      navigate('/report');
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) {
      dispatch({ type: 'SET_STEP', step: step - 1 });
    } else {
      navigate('/');
    }
  };

  const errorList = Object.values(errors);

  return (
    <div className="page-container wizard-page">
      <div className="wizard-header">
        <div>
          <h1 className="page-title">Household Smog & Emissions Setup</h1>
          <p className="wizard-subtitle">
            Guided choices — every field includes &ldquo;Other&rdquo; and &ldquo;Not sure&rdquo; so you never get stuck.
          </p>
        </div>

        <div className="wizard-top-actions">
          {!confirmRestart ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirmRestart(true)}
            >
              🔄 Restart Wizard
            </button>
          ) : (
            <div className="confirm-inline" role="alertdialog" aria-label="Confirm restart">
              <span>Reset all wizard answers?</span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  dispatch({ type: 'RESTART' });
                  setConfirmRestart(false);
                  setErrors({});
                }}
              >
                Yes, Restart
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmRestart(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4-Step Stepper */}
      <nav className="wizard-stepper" aria-label="Wizard steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stepper-btn ${step === s.id ? 'active' : step > s.id ? 'completed' : ''}`}
            aria-current={step === s.id ? 'step' : undefined}
            onClick={() => {
              setErrors({});
              dispatch({ type: 'SET_STEP', step: s.id });
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {errorList.length > 0 && (
        <div className="validation-summary" role="alert" aria-live="assertive">
          <strong>Please review before continuing:</strong>
          <ul>
            {errorList.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <GlassCard className="wizard-card">
        {/* STEP 1: LOCATION */}
        {step === 1 && (
          <div className="wizard-step-body">
            <h2>1. Location & Home Setup</h2>
            <LocationSearch
              locationName={state.location.name}
              lat={state.location.lat}
              lon={state.location.lon}
              onSelectLocation={async ({ name, lat, lon }) => {
                dispatch({ type: 'UPDATE_LOCATION', payload: { name, lat, lon } });
                await loadLocationAir({ lat, lon, name });
              }}
            />
            {errors.location && (
              <p className="field-error" role="alert">
                {errors.location}
              </p>
            )}

            <ChoiceGroup
              id="homeType"
              label="Home type"
              options={[
                { value: 'apartment', label: 'Apartment / Flat', icon: '🏢' },
                { value: 'house', label: 'Independent House', icon: '🏠' },
                { value: 'hostel', label: 'Hostel / PG', icon: '🛏️' },
              ]}
              value={state.location.homeType}
              otherValue={state.location.homeTypeOther}
              onChange={(val) => dispatch({ type: 'UPDATE_LOCATION', payload: { homeType: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_LOCATION', payload: { homeTypeOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint={`Treated as ${CONSERVATIVE_UNKNOWNS.homeType}.`}
              error={errors.homeType}
            />

            <ChoiceGroup
              id="cooling"
              label="Primary cooling / heating"
              options={[
                { value: 'ac', label: 'Air Conditioner (AC)', icon: '❄️' },
                { value: 'fan', label: 'Ceiling / Pedestal Fan', icon: '🌀' },
                { value: 'cooler', label: 'Desert / Evaporative Cooler', icon: '💧' },
                { value: 'none', label: 'None / Natural airflow', icon: '🌬️' },
              ]}
              value={state.location.cooling}
              otherValue={state.location.coolingOther}
              onChange={(val) => dispatch({ type: 'UPDATE_LOCATION', payload: { cooling: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_LOCATION', payload: { coolingOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Assumes AC recirculation check applies."
              error={errors.cooling}
            />

            <ChoiceGroup
              id="rentalLimits"
              label="Home ownership / rental restrictions"
              options={[
                { value: 'rent', label: 'Renting (keep changes portable)', icon: '🔑' },
                { value: 'own', label: 'Own home (permanent upgrades okay)', icon: '🏡' },
              ]}
              value={
                state.location.rentalLimits === true
                  ? 'rent'
                  : state.location.rentalLimits === false
                    ? 'own'
                    : state.location.rentalLimits
              }
              otherValue={state.location.rentalLimitsOther}
              onChange={(val) =>
                dispatch({
                  type: 'UPDATE_LOCATION',
                  payload: {
                    rentalLimits: val === 'rent' ? true : val === 'own' ? false : val,
                  },
                })
              }
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_LOCATION', payload: { rentalLimitsOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Filters recommendations to rental-friendly options."
              error={errors.rentalLimits}
            />
          </div>
        )}

        {/* STEP 2: FAMILY */}
        {step === 2 && (
          <div className="wizard-step-body">
            <h2>2. Family & Priorities</h2>

            <div className="numeric-field-group">
              <label htmlFor="household-size-input" className="field-label">
                Household size (people living here)
              </label>
              <div className="numeric-with-unknown">
                <input
                  id="household-size-input"
                  type="number"
                  min={1}
                  max={25}
                  className="text-input"
                  disabled={state.family.householdSize === 'unknown'}
                  value={state.family.householdSize === 'unknown' ? '' : state.family.householdSize}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_FAMILY',
                      payload: { householdSize: e.target.value === '' ? '' : Number(e.target.value) },
                    })
                  }
                />
                <button
                  type="button"
                  className={`choice-chip ${state.family.householdSize === 'unknown' ? 'selected' : ''}`}
                  aria-pressed={state.family.householdSize === 'unknown'}
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_FAMILY',
                      payload: {
                        householdSize:
                          state.family.householdSize === 'unknown'
                            ? CONSERVATIVE_UNKNOWNS.householdSize
                            : 'unknown',
                      },
                    })
                  }
                >
                  ❔ Not sure (default {CONSERVATIVE_UNKNOWNS.householdSize})
                </button>
              </div>
              {errors.householdSize && (
                <p className="field-error" role="alert">
                  {errors.householdSize}
                </p>
              )}
            </div>

            <ChoiceGroup
              id="sensitiveGroups"
              label="Family members needing tailored protection"
              multi
              options={[
                { value: 'children', label: 'Children & infants', icon: '👶' },
                { value: 'older_adults', label: 'Older adults (65+)', icon: '👴' },
                { value: 'breathing_heart', label: 'Breathing or heart conditions', icon: '🫁' },
                { value: 'pregnancy', label: 'Pregnancy', icon: '🤰' },
                { value: 'none', label: 'No sensitive group members', icon: '✓' },
              ]}
              value={state.family.sensitiveGroups}
              otherValue={state.family.sensitiveGroupsOther}
              onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { sensitiveGroups: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_FAMILY', payload: { sensitiveGroupsOther: sanitizeInput(txt, 100) } })
              }
              conservativeHint="Applies protective child/sensitive-group thresholds."
              error={errors.sensitiveGroups}
            />

            <ChoiceGroup
              id="goals"
              label="Primary goals"
              multi
              options={[
                { value: 'cleaner_air', label: 'Cleaner indoor air', icon: '🫁' },
                { value: 'cut_emissions', label: 'Cut CO₂e emissions', icon: '🌍' },
                { value: 'save_money', label: 'Save money on bills', icon: '💰' },
              ]}
              value={state.family.goals}
              otherValue={state.family.goalsOther}
              onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { goals: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_FAMILY', payload: { goalsOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Prioritizes cleaner air and emissions reductions."
              error={errors.goals}
            />

            <ChoiceGroup
              id="budget"
              label="Budget comfort for upgrades"
              options={[
                { value: 'low', label: 'Free / under ₹500', icon: '₹' },
                { value: 'medium', label: 'Up to ₹5,000', icon: '₹₹' },
                { value: 'high', label: 'Open to ₹5,000+ investments', icon: '₹₹₹' },
              ]}
              value={state.family.budget}
              otherValue={state.family.budgetOther}
              onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { budget: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_FAMILY', payload: { budgetOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Shows free, today, and low-cost actions first."
              error={errors.budget}
            />

            <ChoiceGroup
              id="effort"
              label="Effort level your household can sustain"
              options={[
                { value: 'low', label: 'Low effort (quick habits)', icon: '⚡' },
                { value: 'medium', label: 'Moderate effort', icon: '⚡⚡' },
                { value: 'high', label: 'High effort (all actions)', icon: '⚡⚡⚡' },
              ]}
              value={state.family.effort}
              otherValue={state.family.effortOther}
              onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { effort: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_FAMILY', payload: { effortOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Includes low & medium effort options."
              error={errors.effort}
            />
          </div>
        )}

        {/* STEP 3: ROOMS */}
        {step === 3 && (
          <div className="wizard-step-body">
            <h2>3. Rooms, Kitchen & Indoor Sources</h2>

            <div className="rooms-list">
              {state.rooms.list.map((room, idx) => (
                <div key={room.id} className="room-editor-box">
                  <div className="room-editor-header">
                    <h3>Room {idx + 1}</h3>
                    {state.rooms.list.length > 1 && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => dispatch({ type: 'REMOVE_ROOM', id: room.id })}
                      >
                        Remove Room
                      </button>
                    )}
                  </div>

                  <div className="room-inputs-grid">
                    <div>
                      <label htmlFor={`room-name-${room.id}`} className="field-label">
                        Room name
                      </label>
                      <input
                        id={`room-name-${room.id}`}
                        type="text"
                        className="text-input"
                        value={room.name}
                        onChange={(e) =>
                          dispatch({
                            type: 'UPDATE_ROOM_ITEM',
                            id: room.id,
                            payload: { name: sanitizeInput(e.target.value, 60) },
                          })
                        }
                      />
                      {errors[`room_name_${room.id}`] && (
                        <p className="field-error" role="alert">
                          {errors[`room_name_${room.id}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`room-type-${room.id}`} className="field-label">
                        Room use
                      </label>
                      <select
                        id={`room-type-${room.id}`}
                        className="text-input"
                        value={room.type}
                        onChange={(e) =>
                          dispatch({
                            type: 'UPDATE_ROOM_ITEM',
                            id: room.id,
                            payload: { type: e.target.value },
                          })
                        }
                      >
                        <option value="bedroom">Bedroom</option>
                        <option value="kids_room">Kids / Nursery Room</option>
                        <option value="living_room">Living Room</option>
                        <option value="study">Study / Work Room</option>
                        <option value="other">Other</option>
                        <option value="unknown">Not sure</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`room-area-${room.id}`} className="field-label">
                        Floor area (sq m)
                      </label>
                      <div className="numeric-with-unknown">
                        <input
                          id={`room-area-${room.id}`}
                          type="number"
                          min={3}
                          max={250}
                          className="text-input"
                          disabled={room.areaSqM === 'unknown'}
                          value={room.areaSqM === 'unknown' ? '' : room.areaSqM}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROOM_ITEM',
                              id: room.id,
                              payload: { areaSqM: e.target.value === '' ? '' : Number(e.target.value) },
                            })
                          }
                        />
                        <button
                          type="button"
                          className={`choice-chip ${room.areaSqM === 'unknown' ? 'selected' : ''}`}
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_ROOM_ITEM',
                              id: room.id,
                              payload: {
                                areaSqM: room.areaSqM === 'unknown' ? CONSERVATIVE_UNKNOWNS.roomAreaSqM : 'unknown',
                              },
                            })
                          }
                        >
                          Not sure
                        </button>
                      </div>
                      {errors[`room_area_${room.id}`] && (
                        <p className="field-error" role="alert">
                          {errors[`room_area_${room.id}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`room-height-${room.id}`} className="field-label">
                        Ceiling height (m)
                      </label>
                      <div className="numeric-with-unknown">
                        <input
                          id={`room-height-${room.id}`}
                          type="number"
                          step="0.1"
                          min={2}
                          max={6}
                          className="text-input"
                          disabled={room.ceilingHeightM === 'unknown'}
                          value={room.ceilingHeightM === 'unknown' ? '' : room.ceilingHeightM}
                          onChange={(e) =>
                            dispatch({
                              type: 'UPDATE_ROOM_ITEM',
                              id: room.id,
                              payload: {
                                ceilingHeightM: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            })
                          }
                        />
                        <button
                          type="button"
                          className={`choice-chip ${room.ceilingHeightM === 'unknown' ? 'selected' : ''}`}
                          onClick={() =>
                            dispatch({
                              type: 'UPDATE_ROOM_ITEM',
                              id: room.id,
                              payload: {
                                ceilingHeightM:
                                  room.ceilingHeightM === 'unknown' ? CONSERVATIVE_UNKNOWNS.ceilingHeightM : 'unknown',
                              },
                            })
                          }
                        >
                          Not sure
                        </button>
                      </div>
                      {errors[`room_height_${room.id}`] && (
                        <p className="field-error" role="alert">
                          {errors[`room_height_${room.id}`]}
                        </p>
                      )}
                    </div>
                  </div>

                  <ChoiceGroup
                    id={`room-vent-${room.id}`}
                    label={`${room.name || 'Room'} ventilation quality`}
                    options={[
                      { value: 'good', label: 'Good (cross-ventilation)', icon: '🌬️' },
                      { value: 'moderate', label: 'Moderate (single-side window)', icon: '🪟' },
                      { value: 'poor', label: 'Poor (few/sealed windows)', icon: '🔒' },
                    ]}
                    value={room.ventilation}
                    otherValue={room.ventilationOther || ''}
                    onChange={(val) =>
                      dispatch({ type: 'UPDATE_ROOM_ITEM', id: room.id, payload: { ventilation: val } })
                    }
                    onOtherChange={(txt) =>
                      dispatch({
                        type: 'UPDATE_ROOM_ITEM',
                        id: room.id,
                        payload: { ventilationOther: sanitizeInput(txt, 80) },
                      })
                    }
                    conservativeHint="Assumes moderate ventilation."
                    error={errors[`room_vent_${room.id}`]}
                  />

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(room.hasSensitiveOccupant)}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_ROOM_ITEM',
                          id: room.id,
                          payload: { hasSensitiveOccupant: e.target.checked },
                        })
                      }
                    />
                    <span>Sensitive family member sleeps or spends most hours in this room</span>
                  </label>
                </div>
              ))}

              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => dispatch({ type: 'ADD_ROOM' })}
              >
                + Add Another Room
              </button>
            </div>

            <ChoiceGroup
              id="cookingFuel"
              label="Primary cooking fuel"
              options={[
                { value: 'lpg', label: 'LPG Cylinder', icon: '🔥' },
                { value: 'png', label: 'PNG Piped Gas', icon: '🔥' },
                { value: 'induction', label: 'Induction / Electric', icon: '⚡' },
                { value: 'biomass', label: 'Biomass / Wood / Coal', icon: '🪵' },
              ]}
              value={state.rooms.cookingFuel}
              otherValue={state.rooms.cookingFuelOther}
              onChange={(val) => dispatch({ type: 'UPDATE_ROOMS', payload: { cookingFuel: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_ROOMS', payload: { cookingFuelOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Assumes LPG cylinder cooking."
              error={errors.cookingFuel}
            />

            <ChoiceGroup
              id="hasChimney"
              label="Kitchen chimney or exhaust fan"
              options={[
                { value: 'chimney', label: 'Ducted Chimney / Hood', icon: '🌬️' },
                { value: 'exhaust_fan', label: 'Window Exhaust Fan', icon: '🌀' },
                { value: 'none', label: 'None', icon: '✖️' },
              ]}
              value={state.rooms.hasChimney}
              otherValue={state.rooms.hasChimneyOther}
              onChange={(val) => dispatch({ type: 'UPDATE_ROOMS', payload: { hasChimney: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_ROOMS', payload: { hasChimneyOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Assumes no active mechanical kitchen exhaust."
              error={errors.hasChimney}
            />

            <ChoiceGroup
              id="indoorSmokeSources"
              label="Indoor smoke or combustion sources"
              multi
              options={[
                { value: 'incense', label: 'Incense / Agarbatti / Dhoop', icon: '🪔' },
                { value: 'mosquito_coil', label: 'Mosquito Coils', icon: '🌀' },
                { value: 'tobacco', label: 'Indoor Tobacco Smoke', icon: '🚬' },
                { value: 'none', label: 'None of these', icon: '✓' },
              ]}
              value={state.rooms.indoorSmokeSources}
              otherValue={state.rooms.indoorSmokeSourcesOther}
              onChange={(val) => dispatch({ type: 'UPDATE_ROOMS', payload: { indoorSmokeSources: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_ROOMS', payload: { indoorSmokeSourcesOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Flags incense avoidance precaution."
              error={errors.indoorSmokeSources}
            />
          </div>
        )}

        {/* STEP 4: ROUTINE */}
        {step === 4 && (
          <div className="wizard-step-body">
            <h2>4. Daily Routine, Energy & Commute</h2>

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
              value={state.routine.commuteMode}
              otherValue={state.routine.commuteModeOther}
              onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { commuteMode: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_ROUTINE', payload: { commuteModeOther: sanitizeInput(txt, 80) } })
              }
              conservativeHint="Assumes petrol two-wheeler."
              error={errors.commuteMode}
            />

            {!['wfh', 'walk', 'bicycle'].includes(state.routine.commuteMode) && (
              <div className="two-col-fields">
                <div className="numeric-field-group">
                  <label htmlFor="commute-km-input" className="field-label">
                    One-way commute distance (km)
                  </label>
                  <div className="numeric-with-unknown">
                    <input
                      id="commute-km-input"
                      type="number"
                      min={0}
                      max={250}
                      className="text-input"
                      disabled={state.routine.commuteKm === 'unknown'}
                      value={state.routine.commuteKm === 'unknown' ? '' : state.routine.commuteKm}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_ROUTINE',
                          payload: { commuteKm: e.target.value === '' ? '' : Number(e.target.value) },
                        })
                      }
                    />
                    <button
                      type="button"
                      className={`choice-chip ${state.routine.commuteKm === 'unknown' ? 'selected' : ''}`}
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_ROUTINE',
                          payload: {
                            commuteKm:
                              state.routine.commuteKm === 'unknown' ? CONSERVATIVE_UNKNOWNS.commuteKm : 'unknown',
                          },
                        })
                      }
                    >
                      Not sure
                    </button>
                  </div>
                  {errors.commuteKm && (
                    <p className="field-error" role="alert">
                      {errors.commuteKm}
                    </p>
                  )}
                </div>

                <div className="numeric-field-group">
                  <label htmlFor="commute-days-input" className="field-label">
                    Commute days per week (0–7)
                  </label>
                  <div className="numeric-with-unknown">
                    <input
                      id="commute-days-input"
                      type="number"
                      min={0}
                      max={7}
                      className="text-input"
                      disabled={state.routine.commuteDays === 'unknown'}
                      value={state.routine.commuteDays === 'unknown' ? '' : state.routine.commuteDays}
                      onChange={(e) =>
                        dispatch({
                          type: 'UPDATE_ROUTINE',
                          payload: { commuteDays: e.target.value === '' ? '' : Number(e.target.value) },
                        })
                      }
                    />
                    <button
                      type="button"
                      className={`choice-chip ${state.routine.commuteDays === 'unknown' ? 'selected' : ''}`}
                      onClick={() =>
                        dispatch({
                          type: 'UPDATE_ROUTINE',
                          payload: {
                            commuteDays:
                              state.routine.commuteDays === 'unknown' ? CONSERVATIVE_UNKNOWNS.commuteDays : 'unknown',
                          },
                        })
                      }
                    >
                      Not sure
                    </button>
                  </div>
                  {errors.commuteDays && (
                    <p className="field-error" role="alert">
                      {errors.commuteDays}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="numeric-field-group">
              <label htmlFor="monthly-kwh-input" className="field-label">
                Monthly electricity consumption (units / kWh)
              </label>
              <div className="numeric-with-unknown">
                <input
                  id="monthly-kwh-input"
                  type="number"
                  min={0}
                  max={5000}
                  className="text-input"
                  disabled={state.routine.monthlyKwh === 'unknown'}
                  value={state.routine.monthlyKwh === 'unknown' ? '' : state.routine.monthlyKwh}
                  onChange={(e) =>
                    dispatch({
                      type: 'UPDATE_ROUTINE',
                      payload: { monthlyKwh: e.target.value === '' ? '' : Number(e.target.value) },
                    })
                  }
                />
                <button
                  type="button"
                  className={`choice-chip ${state.routine.monthlyKwh === 'unknown' ? 'selected' : ''}`}
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_ROUTINE',
                      payload: {
                        monthlyKwh:
                          state.routine.monthlyKwh === 'unknown' ? CONSERVATIVE_UNKNOWNS.monthlyKwh : 'unknown',
                      },
                    })
                  }
                >
                  ❔ Not sure (default {CONSERVATIVE_UNKNOWNS.monthlyKwh} kWh)
                </button>
              </div>
              {errors.monthlyKwh && (
                <p className="field-error" role="alert">
                  {errors.monthlyKwh}
                </p>
              )}
            </div>

            <ChoiceGroup
              id="diet"
              label="Household diet pattern"
              options={[
                { value: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
                { value: 'eggetarian', label: 'Eggetarian', icon: '🥚' },
                { value: 'non_vegetarian', label: 'Non-Vegetarian', icon: '🍗' },
                { value: 'vegan', label: 'Vegan', icon: '🌱' },
              ]}
              value={state.routine.diet}
              otherValue={state.routine.dietOther}
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
              value={state.routine.wasteHabits}
              otherValue={state.routine.wasteHabitsOther}
              onChange={(val) => dispatch({ type: 'UPDATE_ROUTINE', payload: { wasteHabits: val } })}
              onOtherChange={(txt) =>
                dispatch({ type: 'UPDATE_ROUTINE', payload: { wasteHabitsOther: sanitizeInput(txt, 80) } })
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
              value={state.routine.outdoorExerciseTiming}
              otherValue={state.routine.outdoorExerciseTimingOther}
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
        )}

        <div className="wizard-nav-footer">
          <button type="button" className="btn btn--secondary" onClick={handleBack}>
            ← {step === 1 ? 'Back to Home' : 'Back'}
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNext}>
            {step < 4 ? 'Next Step →' : 'Generate Smog & Air Quality Report →'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
