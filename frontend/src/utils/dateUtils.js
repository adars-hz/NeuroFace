/**
 * Safely parse an ISO date-time string from the backend, treating naive ISO strings as UTC.
 * In SQLite, UTC timestamps are stored without timezone suffix (e.g. "2026-11-12T05:33:07").
 * Without 'Z', the browser's ECMAScript parser erroneously treats them as local time.
 */
export const parseApiDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const raw = String(dateStr).trim();
  // If no timezone indicator (Z or + or - after time part), append Z to treat as UTC
  const hasTz = raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasTz ? raw : `${raw}Z`;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(raw) : d;
};

/**
 * Format an API timestamp into user's local time (e.g. "11:03:07 AM")
 */
export const formatLocalTime = (
  dateStr,
  options = { hour: '2-digit', minute: '2-digit', second: '2-digit' }
) => {
  const d = parseApiDate(dateStr);
  if (!d) return '--:--';
  return d.toLocaleTimeString([], options);
};

/**
 * Format an API timestamp into user's local date + time (e.g. "12 Nov 2026, 11:03 AM")
 */
export const formatLocalDateTime = (
  dateStr,
  options = { dateStyle: 'medium', timeStyle: 'short' }
) => {
  const d = parseApiDate(dateStr);
  if (!d) return '--';
  return d.toLocaleString([], options);
};

/**
 * Format an API date into user's local date (e.g. "12 Nov 2026")
 */
export const formatLocalDate = (dateStr, options = { dateStyle: 'medium' }) => {
  const d = parseApiDate(dateStr);
  if (!d) return '--';
  return d.toLocaleDateString([], options);
};

