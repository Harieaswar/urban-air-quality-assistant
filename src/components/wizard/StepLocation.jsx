/**
 * @fileoverview Wizard Step 1 — Location, home type, cooling, and rental status.
 */

import React from 'react';
import LocationSearch from '@/components/air/LocationSearch';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import { CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

/**
 * Render Step 1 (Location & Home Setup) wizard controls.
 * @param {Object} props - Step state, dispatch, air loader, and validation errors.
 * @returns {JSX.Element} Step 1 fields.
 */
export default function StepLocation({ location, errors, dispatch, loadLocationAir, headingRef }) {
  const rentalValue =
    location.rentalLimits === true
      ? 'rent'
      : location.rentalLimits === false
        ? 'own'
        : location.rentalLimits;

  return (
    <div className="wizard-step-body">
      <h2 ref={headingRef} tabIndex={-1}>
        1. Location & Home Setup
      </h2>
      <LocationSearch
        locationName={location.name}
        lat={location.lat}
        lon={location.lon}
        errorId="step1-location-error"
        hasError={Boolean(errors.location)}
        onSelectLocation={async ({ name, lat, lon }) => {
          dispatch({ type: 'UPDATE_LOCATION', payload: { name, lat, lon } });
          await loadLocationAir({ lat, lon, name });
        }}
      />
      {errors.location && (
        <p id="step1-location-error" className="field-error" role="alert">
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
        value={location.homeType}
        otherValue={location.homeTypeOther}
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
        value={location.cooling}
        otherValue={location.coolingOther}
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
        value={rentalValue}
        otherValue={location.rentalLimitsOther}
        onChange={(val) =>
          dispatch({
            type: 'UPDATE_LOCATION',
            payload: { rentalLimits: val === 'rent' ? true : val === 'own' ? false : val },
          })
        }
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_LOCATION',
            payload: { rentalLimitsOther: sanitizeInput(txt, 80) },
          })
        }
        conservativeHint="Filters recommendations to rental-friendly options."
        error={errors.rentalLimits}
      />
    </div>
  );
}
