/**
 * @fileoverview Presentational room dimension & ventilation editor used within Wizard Step 3.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { BOUNDS, CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

const ROOM_USE_OPTIONS = [
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kids_room', label: 'Kids / Nursery Room' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'study', label: 'Study / Work Room' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Not sure' },
];

const VENTILATION_OPTIONS = [
  { value: 'good', label: 'Good (cross-ventilation)', icon: '🌬️' },
  { value: 'moderate', label: 'Moderate (single-side window)', icon: '🪟' },
  { value: 'poor', label: 'Poor (few/sealed windows)', icon: '🔒' },
];

function RoomNameField({ room, nameErr, updateRoom }) {
  return (
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
          updateRoom({ name: sanitizeInput(e.target.value, BOUNDS.ROOM_NAME_MAX_LEN) })
        }
      />
      {nameErr && (
        <p id={`room-name-err-${room.id}`} className="field-error" role="alert">
          {nameErr}
        </p>
      )}
    </div>
  );
}

function RoomTypeSelect({ room, updateRoom }) {
  return (
    <div>
      <label htmlFor={`room-type-${room.id}`} className="field-label">
        Room use
      </label>
      <select
        id={`room-type-${room.id}`}
        className="text-input"
        value={room.type}
        onChange={(e) => updateRoom({ type: e.target.value })}
      >
        {ROOM_USE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RoomCoreFields({ room, errors, updateRoom }) {
  return (
    <div className="room-inputs-grid">
      <RoomNameField room={room} nameErr={errors[`room_name_${room.id}`]} updateRoom={updateRoom} />
      <RoomTypeSelect room={room} updateRoom={updateRoom} />
      <NumericUnknownField
        id={`room-area-${room.id}`}
        label="Floor area (sq m)"
        value={room.areaSqM}
        defaultVal={CONSERVATIVE_UNKNOWNS.roomAreaSqM}
        min={BOUNDS.MIN_ROOM_AREA_SQM}
        max={BOUNDS.MAX_ROOM_AREA_SQM}
        unitHint="m²"
        error={errors[`room_area_${room.id}`]}
        onChange={(val) => updateRoom({ areaSqM: val })}
      />
      <NumericUnknownField
        id={`room-height-${room.id}`}
        label="Ceiling height (m)"
        value={room.ceilingHeightM}
        defaultVal={CONSERVATIVE_UNKNOWNS.ceilingHeightM}
        min={BOUNDS.MIN_CEILING_HEIGHT_M}
        max={BOUNDS.MAX_CEILING_HEIGHT_M}
        step={BOUNDS.CEILING_STEP_M}
        unitHint="m"
        error={errors[`room_height_${room.id}`]}
        onChange={(val) => updateRoom({ ceilingHeightM: val })}
      />
    </div>
  );
}

function RoomVentAndSensitive({ room, errors, updateRoom }) {
  return (
    <>
      <ChoiceGroup
        id={`room-vent-${room.id}`}
        label={`${room.name || 'Room'} ventilation quality`}
        options={VENTILATION_OPTIONS}
        value={room.ventilation}
        otherValue={room.ventilationOther || ''}
        onChange={(val) => updateRoom({ ventilation: val })}
        onOtherChange={(txt) =>
          updateRoom({ ventilationOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
        }
        conservativeHint="Assumes moderate ventilation."
        error={errors[`room_vent_${room.id}`]}
      />
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(room.hasSensitiveOccupant)}
          onChange={(e) => updateRoom({ hasSensitiveOccupant: e.target.checked })}
        />
        <span>Sensitive family member sleeps or spends most hours in this room</span>
      </label>
    </>
  );
}

/**
 * Render editable fields for a single household room inside Step 3.
 * @param {Object} props - Room object, index, removal flag, validation errors, and store dispatch.
 * @returns {JSX.Element} Room editor panel.
 */
export default function RoomEditor({ room, idx, canRemove, errors, dispatch }) {
  const updateRoom = (payload) => dispatch({ type: 'UPDATE_ROOM_ITEM', id: room.id, payload });

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
      <RoomCoreFields room={room} errors={errors} updateRoom={updateRoom} />
      <RoomVentAndSensitive room={room} errors={errors} updateRoom={updateRoom} />
    </div>
  );
}
