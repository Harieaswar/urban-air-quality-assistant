/**
 * @fileoverview Wizard Step 3 — Room-by-room dimensions, kitchen exhaust, and indoor smoke sources.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import RoomEditor from '@/components/wizard/RoomEditor';
import { sanitizeInput } from '@/utils/sanitize';

/**
 * Render Step 3 (Rooms, Kitchen & Indoor Sources) wizard controls.
 * @param {Object} props - Rooms state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 3 fields.
 */
export default function StepRooms({ rooms, errors, dispatch, headingRef }) {
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

      <ChoiceGroup
        id="cookingFuel"
        label="Primary cooking fuel"
        options={[
          { value: 'lpg', label: 'LPG Cylinder', icon: '🔥' },
          { value: 'png', label: 'PNG Piped Gas', icon: '🔥' },
          { value: 'induction', label: 'Induction / Electric', icon: '⚡' },
          { value: 'biomass', label: 'Biomass / Wood / Coal', icon: '🪵' },
        ]}
        value={rooms.cookingFuel}
        otherValue={rooms.cookingFuelOther}
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
        value={rooms.hasChimney}
        otherValue={rooms.hasChimneyOther}
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
        value={rooms.indoorSmokeSources}
        otherValue={rooms.indoorSmokeSourcesOther}
        onChange={(val) => dispatch({ type: 'UPDATE_ROOMS', payload: { indoorSmokeSources: val } })}
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_ROOMS',
            payload: { indoorSmokeSourcesOther: sanitizeInput(txt, 80) },
          })
        }
        conservativeHint="Flags incense avoidance precaution."
        error={errors.indoorSmokeSources}
      />
    </div>
  );
}
