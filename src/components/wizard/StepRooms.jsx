/**
 * @fileoverview Wizard Step 3 — Room-by-room dimensions, kitchen exhaust, and indoor smoke sources.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import RoomEditor from '@/components/wizard/RoomEditor';
import { BOUNDS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

const COOKING_FUEL_OPTIONS = [
  { value: 'lpg', label: 'LPG Cylinder', icon: '🔥' },
  { value: 'png', label: 'PNG Piped Gas', icon: '🔥' },
  { value: 'induction', label: 'Induction / Electric', icon: '⚡' },
  { value: 'biomass', label: 'Biomass / Wood / Coal', icon: '🪵' },
];

const CHIMNEY_OPTIONS = [
  { value: 'chimney', label: 'Ducted Chimney / Hood', icon: '🌬️' },
  { value: 'exhaust_fan', label: 'Window Exhaust Fan', icon: '🌀' },
  { value: 'none', label: 'None', icon: '✖️' },
];

const SMOKE_SOURCE_OPTIONS = [
  { value: 'incense', label: 'Incense / Agarbatti / Dhoop', icon: '🪔' },
  { value: 'mosquito_coil', label: 'Mosquito Coils', icon: '🌀' },
  { value: 'tobacco', label: 'Indoor Tobacco Smoke', icon: '🚬' },
  { value: 'none', label: 'None of these', icon: '✓' },
];

function KitchenChoices({ rooms, errors, updateRooms }) {
  const cleanOther = (txt) => sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN);
  return (
    <>
      <ChoiceGroup
        id="cookingFuel"
        label="Primary cooking fuel"
        options={COOKING_FUEL_OPTIONS}
        value={rooms.cookingFuel}
        otherValue={rooms.cookingFuelOther}
        onChange={(val) => updateRooms({ cookingFuel: val })}
        onOtherChange={(txt) => updateRooms({ cookingFuelOther: cleanOther(txt) })}
        conservativeHint="Assumes LPG cylinder cooking."
        error={errors.cookingFuel}
      />
      <ChoiceGroup
        id="hasChimney"
        label="Kitchen chimney or exhaust fan"
        options={CHIMNEY_OPTIONS}
        value={rooms.hasChimney}
        otherValue={rooms.hasChimneyOther}
        onChange={(val) => updateRooms({ hasChimney: val })}
        onOtherChange={(txt) => updateRooms({ hasChimneyOther: cleanOther(txt) })}
        conservativeHint="Assumes no active mechanical kitchen exhaust."
        error={errors.hasChimney}
      />
    </>
  );
}

function SmokeSourcesChoice({ rooms, errors, updateRooms }) {
  return (
    <ChoiceGroup
      id="indoorSmokeSources"
      label="Indoor smoke or combustion sources"
      multi
      options={SMOKE_SOURCE_OPTIONS}
      value={rooms.indoorSmokeSources}
      otherValue={rooms.indoorSmokeSourcesOther}
      onChange={(val) => updateRooms({ indoorSmokeSources: val })}
      onOtherChange={(txt) =>
        updateRooms({ indoorSmokeSourcesOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
      }
      conservativeHint="Flags incense avoidance precaution."
      error={errors.indoorSmokeSources}
    />
  );
}

/**
 * Render Step 3 (Rooms, Kitchen & Indoor Sources) wizard controls.
 * @param {Object} props - Rooms state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 3 fields.
 */
export default function StepRooms({ rooms, errors, dispatch, headingRef }) {
  const updateRooms = (payload) => dispatch({ type: 'UPDATE_ROOMS', payload });
  return (
    <div className="wizard-step-body">
      <h2 ref={headingRef} tabIndex={-1}>
        3. Rooms, Kitchen & Indoor Sources
      </h2>
      <div className="rooms-list">
        {rooms.list.map((room, idx) => (
          <RoomEditor
            key={room.id}
            room={room}
            idx={idx}
            canRemove={rooms.list.length > 1}
            errors={errors}
            dispatch={dispatch}
          />
        ))}
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => dispatch({ type: 'ADD_ROOM' })}
        >
          + Add Another Room
        </button>
      </div>
      <KitchenChoices rooms={rooms} errors={errors} updateRooms={updateRooms} />
      <SmokeSourcesChoice rooms={rooms} errors={errors} updateRooms={updateRooms} />
    </div>
  );
}
