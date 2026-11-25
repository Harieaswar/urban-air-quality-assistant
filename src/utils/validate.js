/**
 * Input validation — SmogGuard
 * Plain-language validation messages for numeric fields, coordinates, and choice groups.
 */

export function validatePositiveNumber(value, fieldName, max = Infinity) {
  const num = Number(value);
  if (value === '' || value == null || isNaN(num)) {
    return { valid: false, value: 0, error: `Please enter a valid number for ${fieldName}.` };
  }
  if (num < 0) {
    return { valid: false, value: 0, error: `${fieldName} cannot be negative. Please enter 0 or more.` };
  }
  if (num > max) {
    return { valid: false, value: 0, error: `${fieldName} (${num}) seems unusually high — please enter a value up to ${max}.` };
  }
  return { valid: true, value: num, error: null };
}

export function validateRange(value, min, max, fieldName) {
  const num = Number(value);
  if (value === '' || value == null || isNaN(num)) {
    return { valid: false, value: min, error: `Please enter a number for ${fieldName}.` };
  }
  if (num < min || num > max) {
    return { valid: false, value: min, error: `${fieldName} must be between ${min} and ${max}.` };
  }
  return { valid: true, value: num, error: null };
}

export function validateCoordinates(lat, lon) {
  const latRes = validateRange(lat, -90, 90, 'Latitude');
  if (!latRes.valid) return latRes;
  const lonRes = validateRange(lon, -180, 180, 'Longitude');
  if (!lonRes.valid) return lonRes;
  return { valid: true, lat: latRes.value, lon: lonRes.value, error: null };
}

export function validateChoiceWithOther(value, otherText, fieldLabel) {
  if (value === 'unknown') {
    return { valid: true, error: null };
  }
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return { valid: false, error: `Please choose an option for ${fieldLabel} (or select "Not sure").` };
  }
  const hasOther = value === 'other' || (Array.isArray(value) && value.includes('other'));
  if (hasOther && (!otherText || !String(otherText).trim())) {
    return { valid: false, error: `Please specify your "Other" answer for ${fieldLabel}.` };
  }
  return { valid: true, error: null };
}
