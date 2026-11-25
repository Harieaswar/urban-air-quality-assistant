/**
 * Format utilities — SmogGuard
 */

export function formatCO2(kg) {
  if (kg == null || isNaN(kg)) return '0 kg CO₂e';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} tonnes CO₂e`;
  return `${Math.round(kg)} kg CO₂e`;
}

export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  const num = Math.round(amount);
  const str = Math.abs(num).toString();
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }
  return `${num < 0 ? '-' : ''}₹${result}`;
}

export function formatRange(low, central, high) {
  if (low === central && central === high) return `${Math.round(central)}`;
  return `${Math.round(central)} (${Math.round(low)}–${Math.round(high)})`;
}

export function formatHour(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function formatTimestamp(ts) {
  if (!ts) return 'Unknown time';
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(ts);
  }
}
