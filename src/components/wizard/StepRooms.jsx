/**
 * @fileoverview Wizard Step 3 — Room-by-room dimensions, kitchen exhaust, and indoor smoke sources.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { CONSERVATIVE_UNKNOWNS } from '@/data/constants';
import { sanitizeInput } from '@/utils/sanitize';

function RoomEditor({ room, idx, canRemove, errors, dispatch }) {
  const nameErr = errors[`room_name_${room.id}`];
  return (
    <div className="room-editor-box">
      <div className="room-editor-header">
        <h3>Room {idx + 1}</h3>
        {canRemove && (
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
            aria-invalid={Boolean(nameErr)}
            aria-describedby={nameErr ? `room-name-err-${room.id}` : undefined}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_ROOM_ITEM',
                id: room.id,
                payload: { name: sanitizeInput(e.target.value, 60) },
              })
            }
          />
          {nameErr && (
            <p id={`room-name-err-${room.id}`} className="field-error" role="alert">
              {nameErr}
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
              dispatch({ type: 'UPDATE_ROOM_ITEM', id: room.id, payload: { type: e.target.value } })
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

        <NumericUnknownField
          id={`room-area-${room.id}`}
          label="Floor area (sq m)"
          value={room.areaSqM}
          defaultVal={CONSERVATIVE_UNKNOWNS.roomAreaSqM}
          min={3}
          max={250}
          unitHint="m²"
          error={errors[`room_area_${room.id}`]}
          onChange={(val) =>
            dispatch({ type: 'UPDATE_ROOM_ITEM', id: room.id, payload: { areaSqM: val } })
          }
        />

        <NumericUnknownField
          id={`room-height-${room.id}`}
          label="Ceiling height (m)"
          value={room.ceilingHeightM}
          defaultVal={CONSERVATIVE_UNKNOWNS.ceilingHeightM}
          min={2}
          max={6}
          step={0.1}
          unitHint="m"
          error={errors[`room_height_${room.id}`]}
          onChange={(val) =>
            dispatch({ type: 'UPDATE_ROOM_ITEM', id: room.id, payload: { ceilingHeightM: val } })
          }
        />
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
  );
}

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
