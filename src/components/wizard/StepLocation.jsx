/**
 * @fileoverview Wizard Step 1 — Location, home type, cooling, and rental status.
 */

import React from 'react';
import LocationSearch from '@/components/air/LocationSearch';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import { BOUNDS, CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

const HOME_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment / Flat', icon: '🏢' },
  { value: 'house', label: 'Independent House', icon: '🏠' },
  { value: 'hostel', label: 'Hostel / PG', icon: '🛏️' },
];

const COOLING_OPTIONS = [
  { value: 'ac', label: 'Air Conditioner (AC)', icon: '❄️' },
  { value: 'fan', label: 'Ceiling / Pedestal Fan', icon: '🌀' },
  { value: 'cooler', label: 'Desert / Evaporative Cooler', icon: '💧' },
  { value: 'none', label: 'None / Natural airflow', icon: '🌬️' },
];

const RENTAL_OPTIONS = [
  { value: 'rent', label: 'Renting (keep changes portable)', icon: '🔑' },
  { value: 'own', label: 'Own home (permanent upgrades okay)', icon: '🏡' },
];

const RENTAL_DISPLAY_MAP = new Map([
  [true, 'rent'],
  [false, 'own'],
]);
const RENTAL_STORE_MAP = new Map([
  ['rent', true],
  ['own', false],
]);

function HomeAndCoolingChoices({ location, errors, update }) {
  const cleanOther = (txt) => sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN);
  return (
    <>
      <ChoiceGroup
        id="homeType"
        label="Home type"
        options={HOME_TYPE_OPTIONS}
        value={location.homeType}
        otherValue={location.homeTypeOther}
        onChange={(val) => update({ homeType: val })}
        onOtherChange={(txt) => update({ homeTypeOther: cleanOther(txt) })}
        conservativeHint={`Treated as ${CONSERVATIVE_UNKNOWNS.homeType}.`}
        error={errors.homeType}
      />
      <ChoiceGroup
        id="cooling"
        label="Primary cooling / heating"
        options={COOLING_OPTIONS}
        value={location.cooling}
        otherValue={location.coolingOther}
        onChange={(val) => update({ cooling: val })}
        onOtherChange={(txt) => update({ coolingOther: cleanOther(txt) })}
        conservativeHint="Assumes AC recirculation check applies."
        error={errors.cooling}
      />
    </>
  );
}

function RentalStatusChoice({ location, rentalValue, errors, update }) {
  return (
    <ChoiceGroup
      id="rentalLimits"
      label="Home ownership / rental restrictions"
      options={RENTAL_OPTIONS}
      value={rentalValue}
      otherValue={location.rentalLimitsOther}
      onChange={(val) =>
        update({ rentalLimits: RENTAL_STORE_MAP.has(val) ? RENTAL_STORE_MAP.get(val) : val })
      }
      onOtherChange={(txt) =>
        update({ rentalLimitsOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
      }
      conservativeHint="Filters recommendations to rental-friendly options."
      error={errors.rentalLimits}
    />
  );
}

/**
 * Render Step 1 (Location & Home Setup) wizard controls.
 * @param {Object} props - Step state, dispatch, air loader, and validation errors.
 * @returns {JSX.Element} Step 1 fields.
 */
export default function StepLocation({ location, errors, dispatch, loadLocationAir, headingRef }) {
  const update = (payload) => dispatch({ type: 'UPDATE_LOCATION', payload });
  const rentalValue = RENTAL_DISPLAY_MAP.has(location.rentalLimits)
    ? RENTAL_DISPLAY_MAP.get(location.rentalLimits)
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
          update({ name, lat, lon });
          await loadLocationAir({ lat, lon, name });
        }}
      />
      {errors.location && (
        <p id="step1-location-error" className="field-error" role="alert">
          {errors.location}
        </p>
      )}
      <HomeAndCoolingChoices location={location} errors={errors} update={update} />
      <RentalStatusChoice
        location={location}
        rentalValue={rentalValue}
        errors={errors}
        update={update}
      />
    </div>
  );
}
